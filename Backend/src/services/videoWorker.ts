import { getDB, Content, User } from '../db';
import puppeteer from 'puppeteer';
import { ElevenLabsClient } from 'elevenlabs';
import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const TEMP_DIR = path.join(__dirname, '../../../temp_video');
const OUTPUT_DIR = path.join(__dirname, '../../../public/videos');

if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

export const generateVideoForTopic = async (topicId: string, userId: string) => {
  const db = getDB();
  
  try {
    // 1. Mark as processing
    await db.collection<Content>('content').updateOne(
      { topic_id: topicId },
      { $set: { video_status: 'PROCESSING' } }
    );

    const content = await db.collection<Content>('content').findOne({ topic_id: topicId });
    if (!content || !content.ppt_content) {
      throw new Error('Content or slides not found');
    }

    const user = await db.collection<User>('users').findOne({ id: userId });
    const voiceIdToUse = user?.voice_id || '21m00Tcm4TlvDq8ikWAM'; // Rachel (Default)

    const slides = content.ppt_content as any[];
    const elevenlabs = new ElevenLabsClient({ apiKey: process.env.ELEVENLABS_API_KEY });
    let browser;
    try {
      browser = await puppeteer.launch({ headless: true });
    } catch (e: any) {
      console.warn('[VideoWorker] Local Chromium not found. Falling back to system Chrome.', e.message);
      // Fallback to system Chrome if the downloaded one isn't found
      browser = await puppeteer.launch({ headless: true, channel: 'chrome' });
    }
    
    const slideVideos: string[] = [];
    const sessionId = uuidv4();
    const sessionDir = path.join(TEMP_DIR, sessionId);
    fs.mkdirSync(sessionDir, { recursive: true });

    for (let i = 0; i < slides.length; i++) {
      const slide = slides[i];
      const slideImagePath = path.join(sessionDir, `slide_${i}.png`);
      const slideAudioPath = path.join(sessionDir, `slide_${i}.mp3`);
      const slideVideoPath = path.join(sessionDir, `slide_${i}.mp4`);

      // A. Generate Image using Puppeteer
      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 720 });
      
      const bulletsHtml = (slide.bullets || []).map((b: string) => `<li>${b.replace(/\*\*/g, '')}</li>`).join('');
      const html = `
        <html>
          <body style="margin:0; padding:60px; font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color:#0F1117; color:#FFFFFF;">
            <div style="height:10px; width:100%; background-color:#6366F1; position:absolute; top:0; left:0;"></div>
            <h1 style="font-size: 54px; margin-bottom: 40px; border-bottom: 2px solid #334155; padding-bottom: 20px;">
              ${slide.title ? slide.title.replace(/\*\*/g, '') : 'Slide ' + (i+1)}
            </h1>
            <ul style="font-size: 32px; line-height: 1.6; color: #CBD5E1; padding-left: 40px;">
              ${bulletsHtml}
            </ul>
            <div style="position:absolute; bottom:40px; right:60px; color:#64748B; font-size:24px;">
              ${i + 1} / ${slides.length}
            </div>
          </body>
        </html>
      `;
      await page.setContent(html);
      await page.screenshot({ path: slideImagePath });
      await page.close();

      // B. Generate Audio using ElevenLabs (with fallback to Google TTS)
      const script = slide.script || slide.title || 'Moving to the next slide.';
      
      try {
        const audioStream = await elevenlabs.textToSpeech.convert(voiceIdToUse, {
          output_format: "mp3_44100_128",
          text: script,
          model_id: "eleven_monolingual_v1"
        });

        const writeStream = fs.createWriteStream(slideAudioPath);
        audioStream.pipe(writeStream);

        await new Promise((resolve, reject) => {
          writeStream.on('finish', resolve);
          writeStream.on('error', reject);
        });
      } catch (elevenErr: any) {
        console.warn(`[VideoWorker] ElevenLabs TTS failed (Status ${elevenErr.statusCode}). Falling back to Google TTS.`);
        
        // Fallback to Free Google TTS
        const googleTTS = require('google-tts-api');
        
        // google-tts-api only supports up to 200 characters per request
        // For simplicity in this fallback, we truncate the script if it's too long
        const safeScript = script.substring(0, 199);
        const url = googleTTS.getAudioUrl(safeScript, {
          lang: 'en',
          slow: false,
          host: 'https://translate.google.com',
        });
        
        // Download the audio file
        const https = require('https');
        const file = fs.createWriteStream(slideAudioPath);
        await new Promise((resolve, reject) => {
          https.get(url, (response: any) => {
            response.pipe(file);
            file.on('finish', () => {
              file.close();
              resolve(true);
            });
          }).on('error', (err: any) => {
            fs.unlinkSync(slideAudioPath);
            reject(err);
          });
        });
      }

      // C. Combine Image + Audio using FFmpeg
      await new Promise<void>((resolve, reject) => {
        ffmpeg()
          .input(slideImagePath)
          .loop()
          .input(slideAudioPath)
          .videoCodec('libx264')
          .audioCodec('aac')
          .outputOptions([
            '-shortest',
            '-pix_fmt yuv420p',
            '-tune stillimage'
          ])
          .save(slideVideoPath)
          .on('end', () => resolve())
          .on('error', (err) => reject(err));
      });

      slideVideos.push(slideVideoPath);
    }
    
    await browser.close();

    // D. Concatenate all slide videos
    const finalVideoName = `${topicId}_${Date.now()}.mp4`;
    const finalVideoPath = path.join(OUTPUT_DIR, finalVideoName);
    
    // Create a text file with list of inputs for ffmpeg concat demuxer
    const listPath = path.join(sessionDir, 'inputs.txt');
    const listContent = slideVideos.map(v => `file '${v.replace(/\\/g, '/')}'`).join('\n');
    fs.writeFileSync(listPath, listContent);

    await new Promise<void>((resolve, reject) => {
      ffmpeg()
        .input(listPath)
        .inputOptions(['-f concat', '-safe 0'])
        .outputOptions('-c copy')
        .save(finalVideoPath)
        .on('end', () => resolve())
        .on('error', (err) => reject(err));
    });

    // Cleanup temp dir
    fs.rmSync(sessionDir, { recursive: true, force: true });

    // 2. Update DB with success
    await db.collection<Content>('content').updateOne(
      { topic_id: topicId },
      { $set: { 
          video_status: 'COMPLETED',
          video_url: `/videos/${finalVideoName}`
        } 
      }
    );

  } catch (error: any) {
    console.error(`[VideoWorker] Error for topic ${topicId}:`, error);
    await db.collection<Content>('content').updateOne(
      { topic_id: topicId },
      { $set: { video_status: 'FAILED' } }
    );
  }
};
