"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateVideoForTopic = void 0;
const db_1 = require("../db");
const puppeteer_1 = __importDefault(require("puppeteer"));
const elevenlabs_1 = require("elevenlabs");
const fluent_ffmpeg_1 = __importDefault(require("fluent-ffmpeg"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const uuid_1 = require("uuid");
const TEMP_DIR = path_1.default.join(__dirname, '../../../temp_video');
const OUTPUT_DIR = path_1.default.join(__dirname, '../../../public/videos');
if (!fs_1.default.existsSync(TEMP_DIR))
    fs_1.default.mkdirSync(TEMP_DIR, { recursive: true });
if (!fs_1.default.existsSync(OUTPUT_DIR))
    fs_1.default.mkdirSync(OUTPUT_DIR, { recursive: true });
const generateVideoForTopic = async (topicId, userId) => {
    const db = (0, db_1.getDB)();
    try {
        // 1. Mark as processing
        await db.collection('content').updateOne({ topic_id: topicId }, { $set: { video_status: 'PROCESSING' } });
        const content = await db.collection('content').findOne({ topic_id: topicId });
        if (!content || !content.ppt_content) {
            throw new Error('Content or slides not found');
        }
        const user = await db.collection('users').findOne({ id: userId });
        const voiceIdToUse = user?.voice_id || '21m00Tcm4TlvDq8ikWAM'; // Rachel (Default)
        const slides = content.ppt_content;
        const elevenlabs = new elevenlabs_1.ElevenLabsClient({ apiKey: process.env.ELEVENLABS_API_KEY });
        let browser;
        try {
            browser = await puppeteer_1.default.launch({ headless: true });
        }
        catch (e) {
            console.warn('[VideoWorker] Local Chromium not found. Falling back to system Chrome.', e.message);
            // Fallback to system Chrome if the downloaded one isn't found
            browser = await puppeteer_1.default.launch({ headless: true, channel: 'chrome' });
        }
        const slideVideos = [];
        const sessionId = (0, uuid_1.v4)();
        const sessionDir = path_1.default.join(TEMP_DIR, sessionId);
        fs_1.default.mkdirSync(sessionDir, { recursive: true });
        for (let i = 0; i < slides.length; i++) {
            const slide = slides[i];
            const slideImagePath = path_1.default.join(sessionDir, `slide_${i}.png`);
            const slideAudioPath = path_1.default.join(sessionDir, `slide_${i}.mp3`);
            const slideVideoPath = path_1.default.join(sessionDir, `slide_${i}.mp4`);
            // A. Generate Image using Puppeteer
            const page = await browser.newPage();
            await page.setViewport({ width: 1280, height: 720 });
            const bulletsHtml = (slide.bullets || []).map((b) => `<li>${b.replace(/\*\*/g, '')}</li>`).join('');
            const html = `
        <html>
          <body style="margin:0; padding:60px; font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color:#0F1117; color:#FFFFFF;">
            <div style="height:10px; width:100%; background-color:#6366F1; position:absolute; top:0; left:0;"></div>
            <h1 style="font-size: 54px; margin-bottom: 40px; border-bottom: 2px solid #334155; padding-bottom: 20px;">
              ${slide.title ? slide.title.replace(/\*\*/g, '') : 'Slide ' + (i + 1)}
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
                const writeStream = fs_1.default.createWriteStream(slideAudioPath);
                audioStream.pipe(writeStream);
                await new Promise((resolve, reject) => {
                    writeStream.on('finish', resolve);
                    writeStream.on('error', reject);
                });
            }
            catch (elevenErr) {
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
                const file = fs_1.default.createWriteStream(slideAudioPath);
                await new Promise((resolve, reject) => {
                    https.get(url, (response) => {
                        response.pipe(file);
                        file.on('finish', () => {
                            file.close();
                            resolve(true);
                        });
                    }).on('error', (err) => {
                        fs_1.default.unlinkSync(slideAudioPath);
                        reject(err);
                    });
                });
            }
            // C. Combine Image + Audio using FFmpeg
            await new Promise((resolve, reject) => {
                (0, fluent_ffmpeg_1.default)()
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
        const finalVideoPath = path_1.default.join(OUTPUT_DIR, finalVideoName);
        // Create a text file with list of inputs for ffmpeg concat demuxer
        const listPath = path_1.default.join(sessionDir, 'inputs.txt');
        const listContent = slideVideos.map(v => `file '${v.replace(/\\/g, '/')}'`).join('\n');
        fs_1.default.writeFileSync(listPath, listContent);
        await new Promise((resolve, reject) => {
            (0, fluent_ffmpeg_1.default)()
                .input(listPath)
                .inputOptions(['-f concat', '-safe 0'])
                .outputOptions('-c copy')
                .save(finalVideoPath)
                .on('end', () => resolve())
                .on('error', (err) => reject(err));
        });
        // Cleanup temp dir
        fs_1.default.rmSync(sessionDir, { recursive: true, force: true });
        // 2. Update DB with success
        await db.collection('content').updateOne({ topic_id: topicId }, { $set: {
                video_status: 'COMPLETED',
                video_url: `/videos/${finalVideoName}`
            }
        });
    }
    catch (error) {
        console.error(`[VideoWorker] Error for topic ${topicId}:`, error);
        await db.collection('content').updateOne({ topic_id: topicId }, { $set: { video_status: 'FAILED' } });
    }
};
exports.generateVideoForTopic = generateVideoForTopic;
