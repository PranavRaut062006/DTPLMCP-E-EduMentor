"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const db_1 = require("../db");
const auth_1 = require("../middleware/auth");
const videoWorker_1 = require("../services/videoWorker");
const router = express_1.default.Router();
// POST /api/videos/generate/:topicId
router.post('/generate/:topicId', auth_1.authMiddleware, async (req, res) => {
    try {
        const topicId = req.params.topicId;
        const db = (0, db_1.getDB)();
        const content = await db.collection('content').findOne({ topic_id: topicId });
        if (!content) {
            return res.status(404).json({ error: 'Content not found for this topic.' });
        }
        if (content.video_status === 'PROCESSING' || content.video_status === 'QUEUED') {
            return res.status(400).json({ error: 'Video generation is already in progress.' });
        }
        // Set status to QUEUED
        await db.collection('content').updateOne({ topic_id: topicId }, { $set: { video_status: 'QUEUED' } });
        // Fire & Forget worker
        (0, videoWorker_1.generateVideoForTopic)(topicId, req.user.id).catch(err => {
            console.error('Video generation failed in background:', err);
        });
        res.json({ success: true, message: 'Video generation queued successfully.' });
    }
    catch (error) {
        console.error('Error queuing video generation:', error);
        res.status(500).json({ error: 'Failed to queue video generation.' });
    }
});
// GET /api/videos/status/:topicId
router.get('/status/:topicId', auth_1.authMiddleware, async (req, res) => {
    try {
        const topicId = req.params.topicId;
        const db = (0, db_1.getDB)();
        const content = await db.collection('content').findOne({ topic_id: topicId });
        if (!content) {
            return res.status(404).json({ error: 'Content not found.' });
        }
        res.json({
            status: content.video_status || 'NOT_STARTED',
            video_url: content.video_url || null
        });
    }
    catch (error) {
        console.error('Error checking video status:', error);
        res.status(500).json({ error: 'Failed to check video status.' });
    }
});
exports.default = router;
