import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { ElevenLabsClient } from 'elevenlabs';
import { authMiddleware as authenticateToken } from '../middleware/auth';
import { getDB, User } from '../db';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const router = express.Router();
const upload = multer({ dest: 'uploads/voices/' });

router.post('/upload', authenticateToken, upload.single('voiceSample'), async (req: any, res: any) => {
  try {
    const user_id = req.user.id;
    const db = getDB();

    const user = await db.collection<User>('users').findOne({ id: user_id });
    if (!user || user.role !== 'faculty') {
      return res.status(403).json({ error: 'Only faculty can upload voice samples.' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No voice sample uploaded.' });
    }

    if (!process.env.ELEVENLABS_API_KEY) {
      return res.status(500).json({ error: 'ElevenLabs API key is not configured on the server.' });
    }

    const client = new ElevenLabsClient({
      apiKey: process.env.ELEVENLABS_API_KEY,
    });

    // Create voice in ElevenLabs
    const voiceFileStream = fs.createReadStream(req.file.path);
    
    let voiceId = '';
    try {
      // Using simple add voice API
      const response = await client.voices.add({
        name: `Faculty Voice - ${user.name}`,
        description: 'Custom faculty voice clone',
        files: [voiceFileStream as any],
      });
      voiceId = response.voice_id;
    } catch (elevenErr: any) {
      if (elevenErr?.statusCode === 400 && elevenErr?.body?.detail?.type === 'payment_required') {
        console.warn('ElevenLabs free tier does not support voice cloning. Falling back to default voice.');
        voiceId = '21m00Tcm4TlvDq8ikWAM'; // Rachel - Default Voice
      } else {
        throw elevenErr;
      }
    }

    // Clean up local file
    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    // Update user in DB
    await db.collection<User>('users').updateOne(
      { id: user_id },
      { $set: { voice_id: voiceId } }
    );

    res.json({ 
      success: true, 
      voice_id: voiceId, 
      message: voiceId === '21m00Tcm4TlvDq8ikWAM' ? 'Free tier detected. Default AI voice assigned.' : 'Voice uploaded successfully.'
    });

  } catch (error: any) {
    console.error('Error uploading voice:', error);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: 'Failed to process voice sample', details: error.message });
  }
});

router.get('/status', authenticateToken, async (req: any, res: any) => {
  try {
    const user_id = req.user.id;
    const db = getDB();

    const user = await db.collection<User>('users').findOne({ id: user_id });
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    res.json({ 
      has_voice: !!user.voice_id,
      voice_id: user.voice_id || null 
    });
  } catch (error: any) {
    console.error('Error fetching voice status:', error);
    res.status(500).json({ error: 'Failed to fetch voice status' });
  }
});

export default router;
