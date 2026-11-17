import { getDB, Content, User, Topic } from '../db';
import puppeteer from 'puppeteer';
import { ElevenLabsClient } from 'elevenlabs';
import ffmpeg from 'fluent-ffmpeg';
import { synthesizeFreeTTS } from './freeTTS';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import ffprobeInstaller from '@ffprobe-installer/ffprobe';
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

ffmpeg.setFfmpegPath(ffmpegInstaller.path);
ffmpeg.setFfprobePath(ffprobeInstaller.path);

const TEMP_DIR = path.join(__dirname, '../../../temp_video');
const OUTPUT_DIR = path.join(__dirname, '../../../public/videos');

if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// Helper to probe media duration in seconds
export const getMediaDuration = (filePath: string): Promise<number> => {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) return reject(err);
      const duration = metadata?.format?.duration || 0;
      resolve(Number(duration));
    });
  });
};

// Count words in text
const countWords = (text: string): number => {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
};

/**
 * Expand narration scripts using Gemini to match the target lecture duration.
 * Speaking rate: ~135 WPM (~2.25 words per second).
 */
const expandSlideScriptsForDuration = async (
  topicTitle: string,
  slides: any[],
  targetDurationMinutes: number
): Promise<string[]> => {
  if (!process.env.GEMINI_API_KEY) {
    return slides.map(s => s.script || s.title || 'Moving to the next slide.');
  }

  const targetTotalSeconds = targetDurationMinutes * 60;
  const targetTotalWords = Math.round(targetTotalSeconds * 2.25);
  const targetWordsPerSlide = Math.max(30, Math.round(targetTotalWords / Math.max(1, slides.length)));

  console.log(`[VideoWorker] Expanding narration: target ${targetDurationMinutes} min (${targetTotalSeconds}s), total ~${targetTotalWords} words (~${targetWordsPerSlide} words/slide across ${slides.length} slides)`);

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const CANDIDATE_MODELS = ['gemini-3.8-flash', 'gemini-3.5-flash', 'gemini-flash-lite-latest'];

  const slidesOverview = slides.map((s, idx) => {
    const bullets = (s.bullets || []).join('; ');
    return `Slide ${idx + 1}: Title: "${s.title || ''}" | Key Points: ${bullets || 'Overview'}`;
  }).join('\n');

  const prompt = `You are an expert university professor delivering a structured ${targetDurationMinutes}-minute lecture on the topic: "${topicTitle}".

SLIDES OUTLINE:
${slidesOverview}

TARGET DURATION & SPEAKING RATE REQUIREMENTS:
- Total allocated lecture duration: ${targetDurationMinutes} minutes (${targetTotalSeconds} seconds).
- Expected conversational academic speaking rate: ~135 words per minute.
- TOTAL REQUIRED WORD COUNT ACROSS ALL SLIDES: Approximately ${targetTotalWords} words (averaging ~${targetWordsPerSlide} words per slide).

PEDAGOGICAL INSTRUCTIONS:
1. Write a complete, immersive, faculty-spoken narration script for EVERY slide (from Slide 1 to Slide ${slides.length}).
2. Thoroughly explain concepts, provide concrete industrial or real-world examples, unpack technical terms, explain diagrams/flows, and provide smooth academic transitions.
3. Distribute the narration evenly so the sum of all words closely reaches ${targetTotalWords} words.
4. DO NOT use artificial repetition, empty filler, or meta-commentary like "In this slide". Speak directly and naturally to the students.
5. Return ONLY a valid JSON array containing exactly ${slides.length} strings, where each element is the spoken narration for that slide:
["Narration for slide 1...", "Narration for slide 2...", ...]`;

  for (const modelName of CANDIDATE_MODELS) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      let text = result.response.text().trim();
      text = text.replace(/```json/gi, '').replace(/```/g, '').trim();
      const firstBracket = text.indexOf('[');
      const lastBracket = text.lastIndexOf(']');
      if (firstBracket !== -1 && lastBracket !== -1) {
        text = text.substring(firstBracket, lastBracket + 1);
      }
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed) && parsed.length === slides.length) {
        console.log(`[VideoWorker] Successfully generated duration-aware script with model "${modelName}". Total generated words: ${parsed.reduce((acc, s) => acc + countWords(s), 0)}`);
        return parsed;
      }
    } catch (err: any) {
      console.warn(`[VideoWorker] Model "${modelName}" failed to expand script:`, err.message);
    }
  }

  return slides.map(s => s.script || s.title || 'Moving to the next slide.');
};

/**
 * Generate audio for a slide script using ElevenLabs with fallback to Google TTS.
 */
const synthesizeSlideAudio = async (
  elevenlabs: ElevenLabsClient,
  voiceId: string,
  script: string,
  outputPath: string
): Promise<void> => {
  try {
    const audioStream = await elevenlabs.textToSpeech.convert(voiceId, {
      output_format: 'mp3_44100_128',
      text: script,
      model_id: 'eleven_monolingual_v1',
    });

    const writeStream = fs.createWriteStream(outputPath);
    audioStream.pipe(writeStream);

    await new Promise((resolve, reject) => {
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });
  } catch (elevenErr: any) {
    console.warn(`[VideoWorker] ElevenLabs TTS failed (Status ${elevenErr?.statusCode || 'ERR'}). Falling back to Google TTS:`, elevenErr?.message || elevenErr);

    // Fallback to Free Google TTS
    const googleTTS = require('google-tts-api');
    const https = require('https');

    // Split into chunks if script exceeds 190 characters
    const chunks = [];
    const sentences = script.match(/[^.!?]+[.!?]+|\S+/g) || [script];
    let currentChunk = '';

    for (const sent of sentences) {
      if ((currentChunk + ' ' + sent).trim().length <= 190) {
        currentChunk = (currentChunk + ' ' + sent).trim();
      } else {
        if (currentChunk) chunks.push(currentChunk);
        currentChunk = sent.substring(0, 190);
      }
    }
    if (currentChunk) chunks.push(currentChunk);

    if (chunks.length === 1) {
      const url = googleTTS.getAudioUrl(chunks[0], {
        lang: 'en',
        slow: false,
        host: 'https://translate.google.com',
      });
      const file = fs.createWriteStream(outputPath);
      await new Promise((resolve, reject) => {
        https.get(url, (res: any) => {
          res.pipe(file);
          file.on('finish', () => { file.close(); resolve(true); });
        }).on('error', (err: any) => {
          if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
          reject(err);
        });
      });
    } else {
      // Multiple chunks: download and concatenate
      const tempChunkFiles: string[] = [];
      const dir = path.dirname(outputPath);
      for (let cIdx = 0; cIdx < chunks.length; cIdx++) {
        const cPath = path.join(dir, `chunk_${Date.now()}_${cIdx}.mp3`);
        const url = googleTTS.getAudioUrl(chunks[cIdx], {
          lang: 'en',
          slow: false,
          host: 'https://translate.google.com',
        });
        const file = fs.createWriteStream(cPath);
        await new Promise((resolve, reject) => {
          https.get(url, (res: any) => {
            res.pipe(file);
            file.on('finish', () => { file.close(); resolve(true); });
          }).on('error', reject);
        });
        tempChunkFiles.push(cPath);
      }

      // Concat chunks
      const chunkListPath = path.join(dir, `chunks_${Date.now()}.txt`);
      fs.writeFileSync(chunkListPath, tempChunkFiles.map(f => `file '${f.replace(/\\/g, '/')}'`).join('\n'));
      await new Promise<void>((resolve, reject) => {
        ffmpeg()
          .input(chunkListPath)
          .inputOptions(['-f concat', '-safe 0'])
          .outputOptions('-c copy')
          .save(outputPath)
          .on('end', () => resolve())
          .on('error', reject);
      });

      // Clean temp chunks
      for (const f of tempChunkFiles) { if (fs.existsSync(f)) fs.unlinkSync(f); }
      if (fs.existsSync(chunkListPath)) fs.unlinkSync(chunkListPath);
    }
  }
};

/**
 * Main worker for generating the synchronized lecture video.
 */
export const generateVideoForTopic = async (topicId: string, userId: string) => {
  const db = getDB();

  try {
    // 1. Mark as processing
    await db.collection<Content>('content').updateOne(
      { topic_id: topicId },
      { $set: { video_status: 'PROCESSING' } }
    );

    const content = await db.collection<Content>('content').findOne({ topic_id: topicId });
    if (!content || !content.ppt_content || !Array.isArray(content.ppt_content) || content.ppt_content.length === 0) {
      throw new Error('Content or slides not found for this topic');
    }

    const topic = await db.collection<Topic>('topics').findOne({ id: topicId });
    const topicTitle = topic?.title || 'Academic Topic';

    // Retrieve authenticated faculty member's custom voice ID
    const user = await db.collection<User>('users').findOne({ id: userId });
    const voiceIdToUse = user?.custom_voice_id || user?.voice_id || '21m00Tcm4TlvDq8ikWAM'; // Rachel (Default)
    console.log(`[VideoWorker] Using voice ID "${voiceIdToUse}" for faculty "${user?.name || userId}"`);

    // Target duration in minutes (constrained to 2–20 minutes)
    const rawMinutes = content.duration_minutes || 5;
    const targetMinutes = Math.max(2, Math.min(20, Math.round(rawMinutes)));
    const targetSeconds = targetMinutes * 60;
    const toleranceSeconds = Math.max(2, targetSeconds * 0.02); // ±2% or ±2s

    console.log(`[VideoWorker] Processing video for topic: "${topicTitle}". Target: ${targetMinutes}m (${targetSeconds}s ±${toleranceSeconds.toFixed(1)}s)`);

    const slides = content.ppt_content as any[];
    const elevenlabs = new ElevenLabsClient({ apiKey: process.env.ELEVENLABS_API_KEY });

    // Step A: Duration-aware narration script check & expansion
    const currentWordCount = slides.reduce((acc, s) => acc + countWords(s.script || ''), 0);
    const targetWords = Math.round(targetSeconds * 2.25);

    let slideScripts: string[];
    // If existing scripts are less than 75% of target words, expand them
    if (currentWordCount < targetWords * 0.75) {
      console.log(`[VideoWorker] Existing script word count (${currentWordCount}) is below target (~${targetWords} words). Expanding scripts with Gemini...`);
      slideScripts = await expandSlideScriptsForDuration(topicTitle, slides, targetMinutes);
    } else {
      slideScripts = slides.map(s => s.script || s.title || 'Moving to the next slide.');
    }

    // Launch browser for slide rendering
    let browser: any;
    try {
      browser = await puppeteer.launch({ headless: true });
    } catch (e: any) {
      console.warn('[VideoWorker] Local Chromium not found. Falling back to system Chrome.', e.message);
      browser = await puppeteer.launch({ headless: true, channel: 'chrome' });
    }

    const sessionId = uuidv4();
    const sessionDir = path.join(TEMP_DIR, sessionId);
    fs.mkdirSync(sessionDir, { recursive: true });

    const slideAudioPaths: string[] = [];
    const slideImagePaths: string[] = [];
    const slideDurations: number[] = [];

    // Step B: Render slides and synthesize narration audio
    for (let i = 0; i < slides.length; i++) {
      const slide = slides[i];
      const slideImagePath = path.join(sessionDir, `slide_${i}.png`);
      const slideAudioPath = path.join(sessionDir, `slide_${i}.mp3`);
      const script = slideScripts[i] || slide.title || 'Moving to next slide.';

      // B1. Render Slide Image
      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 720 });

      const bulletsHtml = (slide.bullets || [])
        .map((b: string) => `<li style="margin-bottom: 14px;">${b.replace(/\*\*/g, '')}</li>`)
        .join('');

      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              * { box-sizing: border-box; }
              body {
                margin: 0;
                padding: 60px 80px;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                background: linear-gradient(135deg, #0b0f19 0%, #151c2e 100%);
                color: #FFFFFF;
                height: 720px;
                width: 1280px;
                position: relative;
                overflow: hidden;
              }
              .accent-bar {
                height: 8px;
                width: 100%;
                background: linear-gradient(90deg, #6366F1 0%, #A855F7 100%);
                position: absolute;
                top: 0;
                left: 0;
              }
              .topic-badge {
                font-size: 16px;
                font-weight: 600;
                color: #818CF8;
                text-transform: uppercase;
                letter-spacing: 1px;
                margin-bottom: 12px;
              }
              h1 {
                font-size: 44px;
                font-weight: 700;
                line-height: 1.2;
                margin: 0 0 36px 0;
                border-bottom: 2px solid #2d3748;
                padding-bottom: 20px;
                color: #F8FAFC;
              }
              ul {
                font-size: 26px;
                line-height: 1.6;
                color: #CBD5E1;
                padding-left: 36px;
                margin: 0;
              }
              .footer {
                position: absolute;
                bottom: 36px;
                left: 80px;
                right: 80px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                color: #64748B;
                font-size: 18px;
                border-top: 1px solid #1E293B;
                padding-top: 14px;
              }
            </style>
          </head>
          <body>
            <div class="accent-bar"></div>
            <div class="topic-badge">${topicTitle.replace(/</g, '&lt;')}</div>
            <h1>${(slide.title || 'Slide ' + (i + 1)).replace(/\*\*/g, '').replace(/</g, '&lt;')}</h1>
            <ul>
              ${bulletsHtml}
            </ul>
            <div class="footer">
              <span>TeachAI Academic Lecture</span>
              <span>Slide ${i + 1} of ${slides.length}</span>
            </div>
          </body>
        </html>
      `;

      await page.setContent(html);
      await page.screenshot({ path: slideImagePath });
      await page.close();

      // B2. Synthesize audio — free priority chain: XTTS (cloned) → Google TTS
      const speakerSamplePath = user?.voice_sample_path as string | undefined;
      if (process.env.ELEVENLABS_API_KEY) {
        // ElevenLabs path (if API key is configured)
        await synthesizeSlideAudio(elevenlabs, voiceIdToUse, script, slideAudioPath);
      } else {
        // Fully free path: XTTS server or Google TTS
        await synthesizeFreeTTS(script, slideAudioPath, speakerSamplePath);
      }

      // B3. Measure audio duration with ffprobe
      const duration = await getMediaDuration(slideAudioPath);
      slideDurations.push(duration);
      slideAudioPaths.push(slideAudioPath);
      slideImagePaths.push(slideImagePath);

      console.log(`[VideoWorker] Slide ${i + 1}/${slides.length}: audio duration = ${duration.toFixed(2)}s`);
    }

    await browser.close();

    // Step C: Audio Duration Calibration & Validation
    let totalAudioSeconds = slideDurations.reduce((a, b) => a + b, 0);
    console.log(`[VideoWorker] Initial total audio: ${totalAudioSeconds.toFixed(2)}s (Target: ${targetSeconds}s, tolerance: ±${toleranceSeconds.toFixed(1)}s)`);

    // Calculate tempo adjustment factor if calibration is needed to strictly match target duration
    // FFmpeg atempo supports 0.5 to 2.0; we keep it within safe natural range [0.85, 1.15]
    let tempoFactor = 1.0;
    if (Math.abs(totalAudioSeconds - targetSeconds) > toleranceSeconds && totalAudioSeconds > 10) {
      // tempo = current / target. E.g. current 270s, target 300s => tempo = 270 / 300 = 0.90 (slows down speech slightly)
      tempoFactor = Math.max(0.85, Math.min(1.15, totalAudioSeconds / targetSeconds));
      console.log(`[VideoWorker] Calibrating audio tempo factor: ${tempoFactor.toFixed(4)} to achieve target duration`);
    }

    // Step D: Combine Slide Image + Calibrated Audio into slide videos
    const slideVideos: string[] = [];
    for (let i = 0; i < slides.length; i++) {
      const slideVideoPath = path.join(sessionDir, `slide_${i}.mp4`);
      const imgPath = slideImagePaths[i];
      let audPath = slideAudioPaths[i];

      // If tempo adjustment is applied
      if (Math.abs(tempoFactor - 1.0) > 0.01) {
        const calibratedAudioPath = path.join(sessionDir, `slide_${i}_calibrated.mp3`);
        await new Promise<void>((resolve, reject) => {
          ffmpeg()
            .input(audPath)
            .audioFilters(`atempo=${tempoFactor.toFixed(4)}`)
            .save(calibratedAudioPath)
            .on('end', () => resolve())
            .on('error', reject);
        });
        audPath = calibratedAudioPath;
      }

      await new Promise<void>((resolve, reject) => {
        ffmpeg()
          .input(imgPath)
          .loop()
          .input(audPath)
          .videoCodec('libx264')
          .audioCodec('aac')
          .outputOptions([
            '-shortest',
            '-pix_fmt yuv420p',
            '-tune stillimage',
            '-r 25'
          ])
          .save(slideVideoPath)
          .on('end', () => resolve())
          .on('error', (err) => reject(err));
      });

      slideVideos.push(slideVideoPath);
    }

    // Step E: Concatenate all slide videos into final MP4
    const finalVideoName = `${topicId}_${Date.now()}.mp4`;
    const finalVideoPath = path.join(OUTPUT_DIR, finalVideoName);

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

    // Step F: Use FFprobe to validate final video duration
    const finalDuration = await getMediaDuration(finalVideoPath);
    console.log(`[VideoWorker] Final MP4 generated: ${finalVideoName} | Measured duration: ${finalDuration.toFixed(2)}s (${(finalDuration / 60).toFixed(2)} min). Target: ${targetSeconds}s`);

    // Cleanup temporary files
    try {
      fs.rmSync(sessionDir, { recursive: true, force: true });
    } catch {}

    // Step G: Update DB with COMPLETED status and validated duration
    await db.collection<Content>('content').updateOne(
      { topic_id: topicId },
      {
        $set: {
          video_status: 'COMPLETED',
          video_url: `/videos/${finalVideoName}`,
          video_duration_seconds: Math.round(finalDuration),
          updated_at: new Date().toISOString(),
        }
      }
    );

    console.log(`[VideoWorker] Successfully completed video generation for topic "${topicTitle}"`);

  } catch (error: any) {
    console.error(`[VideoWorker] Error for topic ${topicId}:`, error);
    await db.collection<Content>('content').updateOne(
      { topic_id: topicId },
      { $set: { video_status: 'FAILED', updated_at: new Date().toISOString() } }
    );
  }
};
