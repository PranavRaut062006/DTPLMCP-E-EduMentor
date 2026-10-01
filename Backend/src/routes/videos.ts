import express from 'express';
import { getDB, Content } from '../db';
import { authMiddleware as authenticateToken } from '../middleware/auth';
import { generateVideoForTopic } from '../services/videoWorker';

const router = express.Router();

// POST /api/videos/generate/:topicId
router.post('/generate/:topicId', authenticateToken, async (req: any, res: any) => {
  try {
    const topicId = req.params.topicId;
    const db = getDB();

    const content = await db.collection<Content>('content').findOne({ topic_id: topicId });
    if (!content) {
      return res.status(404).json({ error: 'Content not found for this topic.' });
    }

    if (content.video_status === 'PROCESSING' || content.video_status === 'QUEUED') {
      return res.status(400).json({ error: 'Video generation is already in progress.' });
    }

    // Set status to QUEUED
    await db.collection<Content>('content').updateOne(
      { topic_id: topicId },
      { $set: { video_status: 'QUEUED' } }
    );

    // Fire & Forget worker
    generateVideoForTopic(topicId, req.user.id).catch(err => {
      console.error('Video generation failed in background:', err);
    });

    res.json({ success: true, message: 'Video generation queued successfully.' });
  } catch (error: any) {
    console.error('Error queuing video generation:', error);
    res.status(500).json({ error: 'Failed to queue video generation.' });
  }
});

// GET /api/videos/status/:topicId
router.get('/status/:topicId', authenticateToken, async (req: any, res: any) => {
  try {
    const topicId = req.params.topicId;
    const db = getDB();

    const content = await db.collection<Content>('content').findOne({ topic_id: topicId });
    if (!content) {
      return res.status(404).json({ error: 'Content not found.' });
    }

    res.json({
      status: content.video_status || 'NOT_STARTED',
      video_url: content.video_url || null
    });
  } catch (error: any) {
    console.error('Error checking video status:', error);
    res.status(500).json({ error: 'Failed to check video status.' });
  }
});

export default router;
