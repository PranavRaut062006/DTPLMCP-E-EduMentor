"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const elevenlabs_1 = require("elevenlabs");
const auth_1 = require("../middleware/auth");
const db_1 = require("../db");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../../.env') });
const router = express_1.default.Router();
const upload = (0, multer_1.default)({ dest: 'uploads/voices/' });
router.post('/upload', auth_1.authMiddleware, upload.single('voiceSample'), async (req, res) => {
    try {
        const user_id = req.user.id;
        const db = (0, db_1.getDB)();
        const user = await db.collection('users').findOne({ id: user_id });
        if (!user || user.role !== 'faculty') {
            return res.status(403).json({ error: 'Only faculty can upload voice samples.' });
        }
        if (!req.file) {
            return res.status(400).json({ error: 'No voice sample uploaded.' });
        }
        if (!process.env.ELEVENLABS_API_KEY) {
            return res.status(500).json({ error: 'ElevenLabs API key is not configured on the server.' });
        }
        const client = new elevenlabs_1.ElevenLabsClient({
            apiKey: process.env.ELEVENLABS_API_KEY,
        });
        // Create voice in ElevenLabs
        const voiceFileStream = fs_1.default.createReadStream(req.file.path);
        let voiceId = '';
        try {
            // Using simple add voice API
            const response = await client.voices.add({
                name: `Faculty Voice - ${user.name}`,
                description: 'Custom faculty voice clone',
                files: [voiceFileStream],
            });
            voiceId = response.voice_id;
        }
        catch (elevenErr) {
            if (elevenErr?.statusCode === 400 && elevenErr?.body?.detail?.type === 'payment_required') {
                console.warn('ElevenLabs free tier does not support voice cloning. Falling back to default voice.');
                voiceId = '21m00Tcm4TlvDq8ikWAM'; // Rachel - Default Voice
            }
            else {
                throw elevenErr;
            }
        }
        // Clean up local file
        if (fs_1.default.existsSync(req.file.path)) {
            fs_1.default.unlinkSync(req.file.path);
        }
        // Update user in DB
        await db.collection('users').updateOne({ id: user_id }, { $set: { voice_id: voiceId } });
        res.json({
            success: true,
            voice_id: voiceId,
            message: voiceId === '21m00Tcm4TlvDq8ikWAM' ? 'Free tier detected. Default AI voice assigned.' : 'Voice uploaded successfully.'
        });
    }
    catch (error) {
        console.error('Error uploading voice:', error);
        if (req.file && fs_1.default.existsSync(req.file.path)) {
            fs_1.default.unlinkSync(req.file.path);
        }
        res.status(500).json({ error: 'Failed to process voice sample', details: error.message });
    }
});
router.get('/status', auth_1.authMiddleware, async (req, res) => {
    try {
        const user_id = req.user.id;
        const db = (0, db_1.getDB)();
        const user = await db.collection('users').findOne({ id: user_id });
        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }
        res.json({
            has_voice: !!user.voice_id,
            voice_id: user.voice_id || null
        });
    }
    catch (error) {
        console.error('Error fetching voice status:', error);
        res.status(500).json({ error: 'Failed to fetch voice status' });
    }
});
exports.default = router;
