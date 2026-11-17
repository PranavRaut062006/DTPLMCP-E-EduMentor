"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.synthesizeFreeTTS = synthesizeFreeTTS;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const fluent_ffmpeg_1 = __importDefault(require("fluent-ffmpeg"));
const ffmpeg_1 = __importDefault(require("@ffmpeg-installer/ffmpeg"));
const ffprobe_1 = __importDefault(require("@ffprobe-installer/ffprobe"));
if (ffmpeg_1.default && ffmpeg_1.default.path) {
    fluent_ffmpeg_1.default.setFfmpegPath(ffmpeg_1.default.path);
}
if (ffprobe_1.default && ffprobe_1.default.path) {
    fluent_ffmpeg_1.default.setFfprobePath(ffprobe_1.default.path);
}
const XTTS_SERVER = process.env.XTTS_SERVER_URL || 'http://localhost:8020';
const XTTS_TIMEOUT_MS = 60_000; // 60 s — model inference can be slow on CPU
// ── Helper: check if the local XTTS server is running ─────────────────────────
async function isXTTSAvailable() {
    try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 2500);
        const res = await fetch(`${XTTS_SERVER}/health`, { signal: ctrl.signal });
        clearTimeout(timer);
        const json = await res.json();
        const ok = json.status === 'ok';
        if (ok) {
            console.log(`[FreeTTS] ✅ XTTS server available at ${XTTS_SERVER} (cloning=${json.voice_cloning})`);
        }
        return ok;
    }
    catch {
        console.log(`[FreeTTS] ℹ️  XTTS server not responding — using Google TTS fallback.`);
        return false;
    }
}
// ── 1. XTTS voice cloning ─────────────────────────────────────────────────────
async function synthesizeWithXTTS(text, outputPath, speakerWavPath // path to the faculty's voice sample (.wav/.mp3)
) {
    const form = new FormData();
    form.append('text', text);
    form.append('language', 'en');
    if (speakerWavPath && fs_1.default.existsSync(speakerWavPath)) {
        const blob = new Blob([fs_1.default.readFileSync(speakerWavPath)]);
        const ext = path_1.default.extname(speakerWavPath).replace('.', '') || 'wav';
        form.append('speaker_wav', blob, `speaker.${ext}`);
    }
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), XTTS_TIMEOUT_MS);
    const res = await fetch(`${XTTS_SERVER}/synthesize`, {
        method: 'POST',
        body: form,
        signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) {
        const err = await res.text();
        throw new Error(`XTTS server error ${res.status}: ${err}`);
    }
    const data = await res.json();
    if (!data.audio_base64)
        throw new Error('XTTS returned no audio data');
    // XTTS returns WAV — write it and convert to MP3 for consistency
    const wavPath = outputPath.replace(/\.mp3$/i, '.wav');
    fs_1.default.writeFileSync(wavPath, Buffer.from(data.audio_base64, 'base64'));
    if (outputPath.endsWith('.mp3')) {
        try {
            await new Promise((resolve, reject) => {
                (0, fluent_ffmpeg_1.default)(wavPath)
                    .audioCodec('libmp3lame')
                    .save(outputPath)
                    .on('end', () => {
                    if (fs_1.default.existsSync(wavPath))
                        fs_1.default.unlinkSync(wavPath);
                    resolve();
                })
                    .on('error', reject);
            });
        }
        catch (ffmpegErr) {
            console.warn(`[FreeTTS] ffmpeg conversion warning: ${ffmpegErr.message}. Preserving cloned audio.`);
            if (fs_1.default.existsSync(wavPath) && !fs_1.default.existsSync(outputPath)) {
                fs_1.default.copyFileSync(wavPath, outputPath);
            }
        }
    }
}
// ── 2. Google TTS fallback (free, no cloning) ─────────────────────────────────
async function synthesizeWithGoogleTTS(text, outputPath) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const googleTTS = require('google-tts-api');
    const https = require('https');
    // Split into ≤190-char chunks (Google TTS limit)
    const sentences = text.match(/[^.!?]+[.!?]+|\S+/g) || [text];
    const chunks = [];
    let cur = '';
    for (const sent of sentences) {
        if ((cur + ' ' + sent).trim().length <= 190) {
            cur = (cur + ' ' + sent).trim();
        }
        else {
            if (cur)
                chunks.push(cur);
            cur = sent.substring(0, 190);
        }
    }
    if (cur)
        chunks.push(cur);
    const downloadChunk = (chunk, dest) => new Promise((resolve, reject) => {
        const url = googleTTS.getAudioUrl(chunk, { lang: 'en', slow: false, host: 'https://translate.google.com' });
        const file = fs_1.default.createWriteStream(dest);
        https.get(url, (res) => {
            res.pipe(file);
            file.on('finish', () => { file.close(); resolve(); });
        }).on('error', (err) => {
            if (fs_1.default.existsSync(dest))
                fs_1.default.unlinkSync(dest);
            reject(err);
        });
    });
    if (chunks.length === 1) {
        await downloadChunk(chunks[0], outputPath);
        return;
    }
    // Multiple chunks → download & concat
    const dir = path_1.default.dirname(outputPath);
    const chunkFiles = await Promise.all(chunks.map(async (chunk, i) => {
        const p = path_1.default.join(dir, `gtts_${Date.now()}_${i}.mp3`);
        await downloadChunk(chunk, p);
        return p;
    }));
    const listPath = path_1.default.join(dir, `gtts_list_${Date.now()}.txt`);
    fs_1.default.writeFileSync(listPath, chunkFiles.map(f => `file '${f.replace(/\\/g, '/')}'`).join('\n'));
    await new Promise((resolve, reject) => {
        (0, fluent_ffmpeg_1.default)()
            .input(listPath)
            .inputOptions(['-f concat', '-safe 0'])
            .outputOptions('-c copy')
            .save(outputPath)
            .on('end', () => resolve())
            .on('error', reject);
    });
    for (const f of chunkFiles)
        if (fs_1.default.existsSync(f))
            fs_1.default.unlinkSync(f);
    if (fs_1.default.existsSync(listPath))
        fs_1.default.unlinkSync(listPath);
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
async function synthesizeFreeTTS(text, outputPath, speakerWavPath) {
    const xttsUp = await isXTTSAvailable();
    if (xttsUp) {
        try {
            await synthesizeWithXTTS(text, outputPath, speakerWavPath);
            const engine = speakerWavPath ? 'XTTS (voice cloned)' : 'XTTS (default voice)';
            console.log(`[FreeTTS] ✅ ${engine}`);
            return;
        }
        catch (err) {
            console.warn(`[FreeTTS] XTTS failed: ${err.message} — falling back to Google TTS`);
        }
    }
    // Google TTS fallback
    await synthesizeWithGoogleTTS(text, outputPath);
    console.log('[FreeTTS] ✅ Google TTS (free fallback)');
}
