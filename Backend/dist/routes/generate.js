"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const generative_ai_1 = require("@google/generative-ai");
const googleTTS = __importStar(require("google-tts-api"));
const fluent_ffmpeg_1 = __importDefault(require("fluent-ffmpeg"));
const ffmpeg_1 = __importDefault(require("@ffmpeg-installer/ffmpeg"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const uuid_1 = require("uuid");
const auth_1 = require("../middleware/auth");
const db_1 = require("../db");
fluent_ffmpeg_1.default.setFfmpegPath(ffmpeg_1.default.path);
const router = (0, express_1.Router)();
router.use(auth_1.authMiddleware);
router.post('/topic/:topicId', async (req, res) => {
    try {
        const { topicId } = req.params;
        const { durationHours, references } = req.body;
        const db = (0, db_1.readDB)();
        const topicIndex = db.topics.findIndex(t => t.id === topicId);
        if (topicIndex === -1)
            return res.status(404).json({ error: 'Topic not found' });
        const topic = db.topics[topicIndex];
        let generatedData;
        if (process.env.GEMINI_API_KEY) {
            const genAI = new generative_ai_1.GoogleGenerativeAI(process.env.GEMINI_API_KEY);
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
            const prompt = `
        Create a teaching plan and lecture script for the topic: "${topic.title}".
        Subtopics: ${topic.subtopics.join(', ')}.
        Duration: ${durationHours} hours.
        References: ${references}.
        
        Format the output as ONLY JSON (without markdown block ticks) with the following structure:
        {
          "plan": "Detailed teaching plan...",
          "slides": [
            { "title": "Slide Title", "bullets": ["Point 1", "Point 2"], "script": "What the faculty will say..." }
          ]
        }
      `;
            const result = await model.generateContent(prompt);
            const responseText = result.response.text();
            try {
                generatedData = JSON.parse(responseText.replace(/```json|```/g, '').trim());
            }
            catch (err) {
                console.error("Failed to parse Gemini output", responseText);
                throw new Error("Failed to parse AI output");
            }
        }
        else {
            // Mock data if no API key
            generatedData = {
                plan: `Teaching plan for ${topic.title} (${durationHours} hours). Make sure to cover the basics and do some exercises.`,
                slides: [
                    {
                        title: `Introduction to ${topic.title}`,
                        bullets: ["Key concept 1", "Key concept 2"],
                        script: `Welcome to the lecture on ${topic.title}. Today we will cover the foundational aspects.`
                    },
                    {
                        title: `Details on Subtopics`,
                        bullets: topic.subtopics.slice(0, 3),
                        script: `Let's dive into ${topic.subtopics[0] || 'the first part'}. This is very important.`
                    }
                ]
            };
        }
        let contentIndex = db.content.findIndex(c => c.topic_id === topicId);
        if (contentIndex === -1) {
            db.content.push({
                id: (0, uuid_1.v4)(),
                topic_id: topicId,
                lecture_content: generatedData.plan,
                ppt_content: generatedData.slides,
                status: 'DRAFT',
                created_by: req.user.id,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            });
        }
        else {
            db.content[contentIndex].lecture_content = generatedData.plan;
            db.content[contentIndex].ppt_content = generatedData.slides;
            db.content[contentIndex].updated_at = new Date().toISOString();
        }
        db.topics[topicIndex].status = 'DRAFT';
        (0, db_1.writeDB)(db);
        res.json({ message: 'Content generated successfully', data: generatedData });
    }
    catch (error) {
        console.error('Generation Error:', error);
        res.status(500).json({ error: error.message });
    }
});
// Mock video generation endpoint that demonstrates TTS and FFmpeg logic
router.post('/video/:topicId', async (req, res) => {
    try {
        const { topicId } = req.params;
        const db = (0, db_1.readDB)();
        const content = db.content.find(c => c.topic_id === topicId);
        if (!content || !content.ppt_content) {
            return res.status(404).json({ error: 'Content or slides not found' });
        }
        // In a real app we'd process in the background. We return success quickly.
        res.json({ message: 'Video generation started in background' });
        // BACKGROUND PROCESS:
        (async () => {
            try {
                const slides = content.ppt_content;
                const outputDir = path_1.default.join(__dirname, '..', '..', 'data', 'videos', topicId);
                if (!fs_1.default.existsSync(outputDir)) {
                    fs_1.default.mkdirSync(outputDir, { recursive: true });
                }
                // We will generate a simple text file for ffmpeg and an audio for each slide
                // For demonstration, we'll just log the TTS fetching
                for (let i = 0; i < slides.length; i++) {
                    const slide = slides[i];
                    console.log(`[Video Gen] Generating TTS for slide ${i + 1}...`);
                    // Get TTS Audio URL
                    const audioUrl = googleTTS.getAudioUrl(slide.script.substring(0, 200), {
                        lang: 'en',
                        slow: false,
                        host: 'https://translate.google.com',
                    });
                    console.log(`[Video Gen] TTS URL for slide ${i + 1}: ${audioUrl}`);
                    // In a full implementation, we would:
                    // 1. Download the audio file
                    // 2. Generate an image for the slide (e.g. using canvas or html-to-image)
                    // 3. Use ffmpeg to combine the image + audio into a small video segment
                    // 4. Concat all segments into a final video
                }
                console.log(`[Video Gen] Video processing mock completed for topic ${topicId}`);
            }
            catch (err) {
                console.error(`[Video Gen Error]`, err);
            }
        })();
    }
    catch (error) {
        console.error('Video Generation Error:', error);
        res.status(500).json({ error: error.message });
    }
});
exports.default = router;
