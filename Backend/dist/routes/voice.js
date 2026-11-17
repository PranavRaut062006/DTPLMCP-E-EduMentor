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
const uploadDir = path_1.default.join(__dirname, '../../../uploads/voices');
if (!fs_1.default.existsSync(uploadDir)) {
    fs_1.default.mkdirSync(uploadDir, { recursive: true });
}
const upload = (0, multer_1.default)({ dest: uploadDir });
const PREVIEW_DIR = path_1.default.join(__dirname, '../../../public/videos/previews');
if (!fs_1.default.existsSync(PREVIEW_DIR)) {
    fs_1.default.mkdirSync(PREVIEW_DIR, { recursive: true });
}
/**
 * POST /api/voice/upload
 * Handles faculty voice sample file upload (.mp3 or .wav only) & Instant Voice Cloning via ElevenLabs.
 * Requires explicit consent confirmation.
 */
router.post('/upload', auth_1.authMiddleware, upload.single('voiceSample'), async (req, res) => {
    try {
        const user_id = req.user.id;
        const db = (0, db_1.getDB)();
        const user = await db.collection('users').findOne({ id: user_id });
        if (!user || user.role !== 'faculty') {
            return res.status(403).json({ error: 'Only faculty can manage voice profiles.' });
        }
        if (!req.file) {
            return res.status(400).json({ error: 'No audio file was uploaded.' });
        }
        // Validate audio file extension (.mp3 or .wav)
        const ext = path_1.default.extname(req.file.originalname || '').toLowerCase();
        if (ext !== '.mp3' && ext !== '.wav') {
            if (fs_1.default.existsSync(req.file.path))
                fs_1.default.unlinkSync(req.file.path);
            return res.status(400).json({
                error: 'Invalid file format. Please upload an audio file in .mp3 or .wav format only.'
            });
        }
        // Explicit consent check
        const consent = req.body.consent === 'true' || req.body.consent === true;
        if (!consent) {
            if (fs_1.default.existsSync(req.file.path))
                fs_1.default.unlinkSync(req.file.path);
            return res.status(400).json({
                error: 'Consent confirmation is required: you must confirm that you own the recording or have explicit permission to clone this voice.'
            });
        }
        if (!process.env.ELEVENLABS_API_KEY) {
            if (fs_1.default.existsSync(req.file.path))
                fs_1.default.unlinkSync(req.file.path);
            return res.status(500).json({ error: 'ELEVENLABS_API_KEY is not configured on the server.' });
        }
        // Save a persistent copy of the user's voice sample
        const persistentSamplePath = path_1.default.join(uploadDir, `faculty_${user_id}${ext}`);
        fs_1.default.copyFileSync(req.file.path, persistentSamplePath);
        const client = new elevenlabs_1.ElevenLabsClient({
            apiKey: process.env.ELEVENLABS_API_KEY,
        });
        const voiceFileStream = fs_1.default.createReadStream(req.file.path);
        let voiceId = '';
        try {
            console.log(`[Voice] Submitting voice sample for faculty "${user.name}" to ElevenLabs IVC...`);
            const response = await client.voices.add({
                name: `Faculty - ${user.name}`,
                description: `Custom faculty voice clone for TeachAI faculty member ${user.name}`,
                files: [voiceFileStream],
            });
            voiceId = response.voice_id;
            console.log(`[Voice] Successfully cloned voice! New Voice ID: ${voiceId}`);
        }
        catch (elevenErr) {
            console.warn('ElevenLabs voice cloning error:', elevenErr?.body || elevenErr?.message || elevenErr);
            const errStr = JSON.stringify(elevenErr?.body || '') + (elevenErr?.message || '');
            const isMissingPermissions = elevenErr?.statusCode === 401 ||
                errStr.includes('missing_permissions') ||
                errStr.includes('voices_write');
            const isPaidPlanRequired = elevenErr?.statusCode === 400 &&
                (errStr.includes('payment_required') || errStr.includes('paid_plan_required'));
            if (fs_1.default.existsSync(req.file.path))
                fs_1.default.unlinkSync(req.file.path);
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
        if (fs_1.default.existsSync(req.file.path)) {
            fs_1.default.unlinkSync(req.file.path);
        }
        // Store custom voice ID in User model
        await db.collection('users').updateOne({ id: user_id }, {
            $set: {
                custom_voice_id: voiceId,
                voice_id: voiceId,
                voice_provider: 'elevenlabs',
                voice_configured: true,
                voice_sample_name: req.file.originalname,
            }
        });
        res.json({
            success: true,
            voice_id: voiceId,
            voice_configured: true,
            sample_name: req.file.originalname,
            message: 'Faculty voice cloned and configured successfully from audio file.'
        });
    }
    catch (error) {
        console.error('Error in /api/voice/upload:', error);
        if (req.file && fs_1.default.existsSync(req.file.path)) {
            fs_1.default.unlinkSync(req.file.path);
        }
        res.status(500).json({ error: error.message || 'Failed to process voice sample for voice cloning.' });
    }
});
/**
 * GET /api/voice/status
 * Returns current voice configuration for the authenticated faculty.
 */
router.get('/status', auth_1.authMiddleware, async (req, res) => {
    try {
        const user_id = req.user.id;
        const db = (0, db_1.getDB)();
        const user = await db.collection('users').findOne({ id: user_id });
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
    }
    catch (error) {
        console.error('Error fetching voice status:', error);
        res.status(500).json({ error: 'Failed to fetch voice status.' });
    }
});
/**
 * POST /api/voice/preview
 * Synthesizes a short preview audio sample with the faculty member's cloned voice.
 */
router.post('/preview', auth_1.authMiddleware, async (req, res) => {
    try {
        const user_id = req.user.id;
        const db = (0, db_1.getDB)();
        const user = await db.collection('users').findOne({ id: user_id });
        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }
        if (!user.custom_voice_id) {
            return res.status(400).json({ error: 'No custom cloned voice has been configured yet. Please upload a voice sample first.' });
        }
        const voiceId = user.custom_voice_id;
        const previewText = `Hello, this is a sample preview of your cloned faculty voice for TeachAI lecture narration.`;
        if (!process.env.ELEVENLABS_API_KEY) {
            return res.status(500).json({ error: 'ELEVENLABS_API_KEY not configured.' });
        }
        const client = new elevenlabs_1.ElevenLabsClient({ apiKey: process.env.ELEVENLABS_API_KEY });
        const previewFileName = `preview_${user_id}.mp3`;
        const previewFilePath = path_1.default.join(PREVIEW_DIR, previewFileName);
        const audioStream = await client.textToSpeech.convert(voiceId, {
            output_format: 'mp3_44100_128',
            text: previewText,
            model_id: 'eleven_monolingual_v1',
        });
        const writeStream = fs_1.default.createWriteStream(previewFilePath);
        audioStream.pipe(writeStream);
        await new Promise((resolve, reject) => {
            writeStream.on('finish', resolve);
            writeStream.on('error', reject);
        });
        res.json({
            success: true,
            preview_url: `/videos/previews/${previewFileName}?t=${Date.now()}`,
        });
    }
    catch (error) {
        console.error('Error generating voice preview:', error);
        res.status(500).json({ error: error.message || 'Failed to generate voice preview.' });
    }
});
/**
 * POST /api/voice/reset
 * Resets the custom voice profile back to default.
 */
router.post('/reset', auth_1.authMiddleware, async (req, res) => {
    try {
        const user_id = req.user.id;
        const db = (0, db_1.getDB)();
        await db.collection('users').updateOne({ id: user_id }, {
            $set: {
                custom_voice_id: undefined,
                voice_id: undefined,
                voice_configured: false,
                voice_sample_name: undefined,
            }
        });
        res.json({
            success: true,
            message: 'Voice profile reset to default academic voice.'
        });
    }
    catch (error) {
        console.error('Error resetting voice:', error);
        res.status(500).json({ error: 'Failed to reset voice profile.' });
    }
});
exports.default = router;
