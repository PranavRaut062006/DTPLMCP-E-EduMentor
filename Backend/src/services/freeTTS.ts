/**
 * freeTTS.ts
 * -------------------------------------------------
 * Drop-in free voice synthesis helper for EduMentor.
 *
 * Priority chain (auto-detected at runtime):
 *   1. Local XTTS-v2 Python server  → Real voice cloning, 100% free
 *   2. Google TTS (translate)        → Generic voice, free, no setup
 *
 * Usage: replace synthesizeSlideAudio() calls in videoWorker.ts
 * -------------------------------------------------
 */

import fs from 'fs';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import ffprobeInstaller from '@ffprobe-installer/ffprobe';

if (ffmpegInstaller && ffmpegInstaller.path) {
  ffmpeg.setFfmpegPath(ffmpegInstaller.path);
}
if (ffprobeInstaller && ffprobeInstaller.path) {
  ffmpeg.setFfprobePath(ffprobeInstaller.path);
}

const XTTS_SERVER = process.env.XTTS_SERVER_URL || 'http://localhost:8020';
const XTTS_TIMEOUT_MS = 60_000; // 60 s — model inference can be slow on CPU

// ── Helper: check if the local XTTS server is running ─────────────────────────
async function isXTTSAvailable(): Promise<boolean> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 2500);
    const res = await fetch(`${XTTS_SERVER}/health`, { signal: ctrl.signal });
    clearTimeout(timer);
    const json = await res.json() as any;
    const ok = json.status === 'ok';
    if (ok) {
      console.log(`[FreeTTS] ✅ XTTS server available at ${XTTS_SERVER} (cloning=${json.voice_cloning})`);
    }
    return ok;
  } catch {
    console.log(`[FreeTTS] ℹ️  XTTS server not responding — using Google TTS fallback.`);
    return false;
  }
}

// ── 1. XTTS voice cloning ─────────────────────────────────────────────────────
async function synthesizeWithXTTS(
  text: string,
  outputPath: string,
  speakerWavPath?: string   // path to the faculty's voice sample (.wav/.mp3)
): Promise<void> {
  const form = new FormData();
  form.append('text', text);
  form.append('language', 'en');

  if (speakerWavPath && fs.existsSync(speakerWavPath)) {
    const blob = new Blob([fs.readFileSync(speakerWavPath)]);
    const ext  = path.extname(speakerWavPath).replace('.', '') || 'wav';
    form.append('speaker_wav', blob, `speaker.${ext}`);
  }

  const ctrl  = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), XTTS_TIMEOUT_MS);

  const res  = await fetch(`${XTTS_SERVER}/synthesize`, {
    method: 'POST',
    body:   form as any,
    signal: ctrl.signal,
  });
  clearTimeout(timer);

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`XTTS server error ${res.status}: ${err}`);
  }

  const data = await res.json() as any;
  if (!data.audio_base64) throw new Error('XTTS returned no audio data');

  // XTTS returns WAV — write it and convert to MP3 for consistency
  const wavPath = outputPath.replace(/\.mp3$/i, '.wav');
  fs.writeFileSync(wavPath, Buffer.from(data.audio_base64, 'base64'));

  if (outputPath.endsWith('.mp3')) {
    try {
      await new Promise<void>((resolve, reject) => {
        ffmpeg(wavPath)
          .audioCodec('libmp3lame')
          .save(outputPath)
          .on('end', () => {
            if (fs.existsSync(wavPath)) fs.unlinkSync(wavPath);
            resolve();
          })
          .on('error', reject);
      });
    } catch (ffmpegErr: any) {
      console.warn(`[FreeTTS] ffmpeg conversion warning: ${ffmpegErr.message}. Preserving cloned audio.`);
      if (fs.existsSync(wavPath) && !fs.existsSync(outputPath)) {
        fs.copyFileSync(wavPath, outputPath);
      }
    }
  }
}

// ── 2. Google TTS fallback (free, no cloning) ─────────────────────────────────
async function synthesizeWithGoogleTTS(
  text: string,
  outputPath: string
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const googleTTS = require('google-tts-api');
  const https     = require('https');

  // Split into ≤190-char chunks (Google TTS limit)
  const sentences = text.match(/[^.!?]+[.!?]+|\S+/g) || [text];
  const chunks: string[] = [];
  let cur = '';
  for (const sent of sentences) {
    if ((cur + ' ' + sent).trim().length <= 190) {
      cur = (cur + ' ' + sent).trim();
    } else {
      if (cur) chunks.push(cur);
      cur = sent.substring(0, 190);
    }
  }
  if (cur) chunks.push(cur);

  const downloadChunk = (chunk: string, dest: string) =>
    new Promise<void>((resolve, reject) => {
      const url  = googleTTS.getAudioUrl(chunk, { lang: 'en', slow: false, host: 'https://translate.google.com' });
      const file = fs.createWriteStream(dest);
      https.get(url, (res: any) => {
        res.pipe(file);
        file.on('finish', () => { file.close(); resolve(); });
      }).on('error', (err: any) => {
        if (fs.existsSync(dest)) fs.unlinkSync(dest);
        reject(err);
      });
    });

  if (chunks.length === 1) {
    await downloadChunk(chunks[0], outputPath);
    return;
  }

  // Multiple chunks → download & concat
  const dir        = path.dirname(outputPath);
  const chunkFiles = await Promise.all(
    chunks.map(async (chunk, i) => {
      const p = path.join(dir, `gtts_${Date.now()}_${i}.mp3`);
      await downloadChunk(chunk, p);
      return p;
    })
  );

  const listPath = path.join(dir, `gtts_list_${Date.now()}.txt`);
  fs.writeFileSync(listPath, chunkFiles.map(f => `file '${f.replace(/\\/g, '/')}'`).join('\n'));

  await new Promise<void>((resolve, reject) => {
    ffmpeg()
      .input(listPath)
      .inputOptions(['-f concat', '-safe 0'])
      .outputOptions('-c copy')
      .save(outputPath)
      .on('end', () => resolve())
      .on('error', reject);
  });

  for (const f of chunkFiles) if (fs.existsSync(f)) fs.unlinkSync(f);
  if (fs.existsSync(listPath)) fs.unlinkSync(listPath);
}

// ── Public API — call this in videoWorker.ts ───────────────────────────────────
/**
 * Synthesize speech for a slide script.
 * Automatically picks the best free engine available.
 *
 * @param text          - The narration script
 * @param outputPath    - Where to save the MP3
 * @param speakerWavPath - (Optional) Path to faculty voice sample for cloning
 */
export async function synthesizeFreeTTS(
  text: string,
  outputPath: string,
  speakerWavPath?: string
): Promise<void> {
  const xttsUp = await isXTTSAvailable();

  if (xttsUp) {
    try {
      await synthesizeWithXTTS(text, outputPath, speakerWavPath);
      const engine = speakerWavPath ? 'XTTS (voice cloned)' : 'XTTS (default voice)';
      console.log(`[FreeTTS] ✅ ${engine}`);
      return;
    } catch (err: any) {
      console.warn(`[FreeTTS] XTTS failed: ${err.message} — falling back to Google TTS`);
    }
  }

  // Google TTS fallback
  await synthesizeWithGoogleTTS(text, outputPath);
  console.log('[FreeTTS] ✅ Google TTS (free fallback)');
}
