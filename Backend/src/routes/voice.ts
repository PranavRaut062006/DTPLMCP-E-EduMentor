import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { ElevenLabsClient } from 'elevenlabs';
import { authMiddleware as authenticateToken } from '../middleware/auth';
import { getDB, User } from '../db';
import dotenv from 'dotenv';
import { synthesizeFreeTTS } from '../services/freeTTS';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const router = express.Router();
const uploadDir = path.join(__dirname, '../../../uploads/voices');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
const upload = multer({ dest: uploadDir });

const PREVIEW_DIR = path.join(__dirname, '../../../public/videos/previews');
if (!fs.existsSync(PREVIEW_DIR)) {
  fs.mkdirSync(PREVIEW_DIR, { recursive: true });
}

/**
 * POST /api/voice/upload
 * Handles faculty voice sample file upload (.mp3 or .wav only) & Instant Voice Cloning via ElevenLabs.
 * Requires explicit consent confirmation.
 */
router.post('/upload', authenticateToken, upload.single('voiceSample'), async (req: any, res: any) => {
  try {
    const user_id = req.user.id;
    const db = getDB();

    const user = await db.collection<User>('users').findOne({ id: user_id });
    if (!user || user.role !== 'faculty') {
      return res.status(403).json({ error: 'Only faculty can manage voice profiles.' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No audio file was uploaded.' });
    }

    // Validate audio file extension (.mp3 or .wav)
    const ext = path.extname(req.file.originalname || '').toLowerCase();
    if (ext !== '.mp3' && ext !== '.wav') {
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(400).json({
        error: 'Invalid file format. Please upload an audio file in .mp3 or .wav format only.'
      });
    }

    // Explicit consent check
    const consent = req.body.consent === 'true' || req.body.consent === true;
    if (!consent) {
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(400).json({
        error: 'Consent confirmation is required: you must confirm that you own the recording or have explicit permission to clone this voice.'
      });
    }

    // Save a persistent copy of the user's voice sample (used by XTTS for free cloning)
    const persistentSamplePath = path.join(uploadDir, `faculty_${user_id}${ext}`);
    fs.copyFileSync(req.file.path, persistentSamplePath);

    // ── If NO ElevenLabs key, use local free voice cloning (XTTS) ──────────────
    if (!process.env.ELEVENLABS_API_KEY) {
      await db.collection<User>('users').updateOne(
        { id: user_id },
        {
          $set: {
            custom_voice_id: `local_${user_id}`,
            voice_id: `local_${user_id}`,
            voice_provider: 'xtts_local',
            voice_configured: true,
            voice_sample_path: persistentSamplePath,
            voice_sample_name: req.file.originalname,
          }
        }
      );
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.json({
        success: true,
        voice_id: `local_${user_id}`,
        voice_configured: true,
        voice_provider: 'xtts_local',
        sample_name: req.file.originalname,
        message: 'Voice sample saved locally. Free voice cloning will be used for video generation.'
      });
    }

    // ── ElevenLabs path (paid) ───────────────────────────────────────────────

    const client = new ElevenLabsClient({
      apiKey: process.env.ELEVENLABS_API_KEY,
    });

    const voiceFileStream = fs.createReadStream(req.file.path);
    let voiceId = '';

    try {
      console.log(`[Voice] Submitting voice sample for faculty "${user.name}" to ElevenLabs IVC...`);
      const response = await client.voices.add({
        name: `Faculty - ${user.name}`,
        description: `Custom faculty voice clone for TeachAI faculty member ${user.name}`,
        files: [voiceFileStream as any],
      });
      voiceId = response.voice_id;
      console.log(`[Voice] Successfully cloned voice! New Voice ID: ${voiceId}`);
    } catch (elevenErr: any) {
      console.warn('ElevenLabs voice cloning error:', elevenErr?.body || elevenErr?.message || elevenErr);
      const errStr = JSON.stringify(elevenErr?.body || '') + (elevenErr?.message || '');

      const isMissingPermissions =
        elevenErr?.statusCode === 401 ||
        errStr.includes('missing_permissions') ||
        errStr.includes('voices_write');

      const isPaidPlanRequired =
        elevenErr?.statusCode === 400 &&
        (errStr.includes('payment_required') || errStr.includes('paid_plan_required'));

      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);

      if (isMissingPermissions) {
        return res.status(401).json({
          error: "Your ElevenLabs API key is missing the 'voices_write' permission. In your ElevenLabs account (https://elevenlabs.io/app/settings/api-keys), please create a new key with 'Full Access' (or check voices_write, voices_read, and text_to_speech) and update ELEVENLABS_API_KEY in Backend/.env."
        });
      }

      if (isPaidPlanRequired) {
        return res.status(402).json({
          error: 'Your ElevenLabs account does not include Instant Voice Cloning. An ElevenLabs Starter or Creator plan is required by ElevenLabs for custom voice cloning.'
        });
      }

      throw elevenErr;
    }

    // Clean up temp upload file
    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    // Store custom voice ID in User model
    await db.collection<User>('users').updateOne(
      { id: user_id },
      {
        $set: {
          custom_voice_id: voiceId,
          voice_id: voiceId,
          voice_provider: 'elevenlabs',
          voice_configured: true,
          voice_sample_name: req.file.originalname,
        }
      }
    );

    res.json({
      success: true,
      voice_id: voiceId,
      voice_configured: true,
      sample_name: req.file.originalname,
      message: 'Faculty voice cloned and configured successfully from audio file.'
    });

  } catch (error: any) {
    console.error('Error in /api/voice/upload:', error);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: error.message || 'Failed to process voice sample for voice cloning.' });
  }
});

/**
 * GET /api/voice/status
 * Returns current voice configuration for the authenticated faculty.
 */
router.get('/status', authenticateToken, async (req: any, res: any) => {
  try {
    const user_id = req.user.id;
    const db = getDB();

    const user = await db.collection<User>('users').findOne({ id: user_id });
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const hasClonedVoice = Boolean(user.voice_configured && user.custom_voice_id);

    res.json({
      has_voice: hasClonedVoice,
      voice_id: hasClonedVoice ? user.custom_voice_id : null,
      voice_configured: hasClonedVoice,
      voice_provider: user.voice_provider || 'elevenlabs',
      sample_name: hasClonedVoice ? user.voice_sample_name : null,
    });
  } catch (error: any) {
    console.error('Error fetching voice status:', error);
    res.status(500).json({ error: 'Failed to fetch voice status.' });
  }
});

/**
 * POST /api/voice/preview
 * Synthesizes a short preview audio sample with the faculty member's cloned voice.
 */
router.post('/preview', authenticateToken, async (req: any, res: any) => {
  try {
    const user_id = req.user.id;
    const db = getDB();

    const user = await db.collection<User>('users').findOne({ id: user_id });
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (!user.custom_voice_id) {
      return res.status(400).json({ error: 'No custom cloned voice has been configured yet. Please upload a voice sample first.' });
    }

    const voiceId = user.custom_voice_id;
    const previewText = `Hello, this is a sample preview of your cloned faculty voice for TeachAI lecture narration.`;

    // ── Free XTTS preview path ───────────────────────────────────────────────
    if (!process.env.ELEVENLABS_API_KEY) {
      const previewFileName = `preview_${user_id}.mp3`;
      const previewFilePath = path.join(PREVIEW_DIR, previewFileName);
      const speakerPath     = user.voice_sample_path as string | undefined;
      await synthesizeFreeTTS(previewText, previewFilePath, speakerPath);
      return res.json({
        success: true,
        preview_url: `/videos/previews/${previewFileName}?t=${Date.now()}`,
        provider: speakerPath ? 'xtts_cloned' : 'google_tts',
      });
    }
    // ── ElevenLabs paid preview ──────────────────────────────────────────────
    if (!process.env.ELEVENLABS_API_KEY) {
      return res.status(500).json({ error: 'ELEVENLABS_API_KEY not configured.' });
    }

    const client = new ElevenLabsClient({ apiKey: process.env.ELEVENLABS_API_KEY });
    const previewFileName = `preview_${user_id}.mp3`;
    const previewFilePath = path.join(PREVIEW_DIR, previewFileName);

    const audioStream = await client.textToSpeech.convert(voiceId, {
      output_format: 'mp3_44100_128',
      text: previewText,
      model_id: 'eleven_monolingual_v1',
    });

    const writeStream = fs.createWriteStream(previewFilePath);
    audioStream.pipe(writeStream);
    await new Promise((resolve, reject) => {
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });

    res.json({
      success: true,
      preview_url: `/videos/previews/${previewFileName}?t=${Date.now()}`,
    });
  } catch (error: any) {
    console.error('Error generating voice preview:', error);
    res.status(500).json({ error: error.message || 'Failed to generate voice preview.' });
  }
});

/**
 * POST /api/voice/reset
 * Resets the custom voice profile back to default.
 */
router.post('/reset', authenticateToken, async (req: any, res: any) => {
  try {
    const user_id = req.user.id;
    const db = getDB();

    await db.collection<User>('users').updateOne(
      { id: user_id },
      {
        $set: {
          custom_voice_id: undefined,
          voice_id: undefined,
          voice_configured: false,
          voice_sample_name: undefined,
        }
      }
    );

    res.json({
      success: true,
      message: 'Voice profile reset to default academic voice.'
    });
  } catch (error: any) {
    console.error('Error resetting voice:', error);
    res.status(500).json({ error: 'Failed to reset voice profile.' });
  }
});

export default router;
