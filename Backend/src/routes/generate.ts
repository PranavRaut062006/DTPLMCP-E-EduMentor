import { Router } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as googleTTS from 'google-tts-api';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { authMiddleware } from '../middleware/auth';
import { getDB, Content, Topic } from '../db';

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

const router = Router();
router.use(authMiddleware);

// ── Main generation endpoint called by the frontend ──────────────────────────
// POST /api/generation
// Body: { classroomId, topicIds, durationMinutes, references, outputs }
// outputs: Array of 'teaching-plan' | 'ppt' | 'notes' | 'video'
router.post('/', async (req: any, res) => {
  try {
    const { classroomId, topicIds, durationMinutes = 45, references = [], outputs = ['teaching-plan', 'ppt', 'notes'] } = req.body;

    if (!topicIds || topicIds.length === 0) {
      return res.status(400).json({ error: 'No topics selected' });
    }
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'GEMINI_API_KEY not configured on server' });
    }

    const db = getDB();
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const referencesText = references.length > 0
      ? references.map((r: any) => `${r.kind}: ${r.label}`).join(', ')
      : 'none — use general academic knowledge';

    const generatedMaterials: any[] = [];

    for (const topicId of topicIds) {
      const topic = await db.collection<Topic>('topics').findOne({ id: topicId });
      if (!topic) continue;

      console.log(`[Generate] Processing topic: "${topic.title}"...`);

      const wantPPT = outputs.includes('ppt');
      const wantNotes = outputs.includes('notes');
      const wantPlan = outputs.includes('teaching-plan');

      const planField = wantPlan ? `"teaching_plan": "A detailed, well-structured teaching plan in Markdown format covering objectives, outline, activities, and assessment. Minimum 300 words.",` : '';
      const notesField = wantNotes ? `"notes": "Comprehensive student notes in Markdown format with headings, subheadings, definitions, examples, and key points. Minimum 500 words.",` : '';
      const slidesField = wantPPT
        ? `"slides": [{ "title": "Slide Title", "bullets": ["Point 1", "Point 2"], "script": "Faculty narration script", "layout": "standard", "visualPrompt": "" }]`
        : '"slides": []';

      const prompt = `You are an expert academic content creator. Create detailed teaching material for the topic: "${topic.title}".
Subtopics: ${topic.subtopics.length > 0 ? topic.subtopics.join(', ') : 'General overview'}.
Session duration: ${durationMinutes} minutes.
References: ${referencesText}.

Return ONLY a valid JSON object (no markdown fences, no explanation) with this EXACT structure:
{
  ${planField}
  ${notesField}
  ${slidesField}
}

RULES:
- For slides, generate 8-12 slides. Mix layouts: "standard" for text bullets, "image_right" for concepts needing illustration, "process_flow" for step-by-step sequences.
- "visualPrompt" should describe what image to show — only required for "image_right" layout, leave empty string for others.
- All markdown content should use proper headings (##, ###), bullet lists, bold for key terms.
- Do NOT include any text outside the JSON object.`;

      const result = await model.generateContent(prompt);
      const rawText = result.response.text().replace(/```json|```/g, '').trim();
      let generatedData: any;

      try {
        generatedData = JSON.parse(rawText);
      } catch (e) {
        console.error(`[Generate] Failed to parse AI output for topic "${topic.title}":`, rawText.substring(0, 200));
        continue;
      }

      const contentDoc: Content = {
        id: uuidv4(),
        topic_id: topicId,
        subject_id: classroomId,
        lecture_content: generatedData.teaching_plan || generatedData.notes || '',
        ppt_content: generatedData.slides || [],
        status: 'DRAFT',
        created_by: req.user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const existing = await db.collection<Content>('content').findOne({ topic_id: topicId });
      if (existing) {
        await db.collection<Content>('content').updateOne(
          { topic_id: topicId },
          { $set: {
            lecture_content: contentDoc.lecture_content,
            ppt_content: contentDoc.ppt_content,
            notes_content: generatedData.notes || null,
            updated_at: contentDoc.updated_at,
          }},
        );
        contentDoc.id = existing.id;
      } else {
        await db.collection<Content>('content').insertOne({
          ...contentDoc,
          notes_content: generatedData.notes || null,
        } as any);
      }

      await db.collection<Topic>('topics').updateOne({ id: topicId }, { $set: { status: 'DRAFT' } });

      generatedMaterials.push({
        topicId,
        topicTitle: topic.title,
        contentId: contentDoc.id,
        teaching_plan: generatedData.teaching_plan || null,
        notes: generatedData.notes || null,
        slides: generatedData.slides || [],
        status: 'DRAFT',
      });

      console.log(`[Generate] Done: "${topic.title}"`);
    }

    res.json({
      success: true,
      generatedCount: generatedMaterials.length,
      materials: generatedMaterials,
    });

  } catch (error: any) {
    console.error('[Generate] Error:', error);
    res.status(500).json({ error: error.message || 'Generation failed' });
  }
});

// ── Per-topic generation (legacy/internal route) ──────────────────────────────
router.post('/topic/:topicId', async (req: any, res) => {
  try {
    const { topicId } = req.params;
    const { durationHours, references } = req.body;
    
    const db = getDB();
    const topic = await db.collection<Topic>('topics').findOne({ id: topicId });
    if (!topic) return res.status(404).json({ error: 'Topic not found' });
    
    let generatedData;

    if (process.env.GEMINI_API_KEY) {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const prompt = `Create a teaching plan and lecture script for the topic: "${topic.title}". Subtopics: ${topic.subtopics.join(', ')}. Duration: ${durationHours} hours. References: ${references}. Return ONLY JSON: { "plan": "...", "slides": [{ "title": "", "bullets": [], "script": "", "layout": "standard", "visualPrompt": "" }] }`;
      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      try {
        generatedData = JSON.parse(responseText.replace(/```json|```/g, '').trim());
      } catch (err) {
        throw new Error("Failed to parse AI output");
      }
    } else {
      generatedData = { plan: `Teaching plan for ${topic.title}.`, slides: [{ title: `Introduction to ${topic.title}`, bullets: ["Key concept 1"], script: `Welcome to ${topic.title}.`, layout: 'standard', visualPrompt: '' }] };
    }

    const existingContent = await db.collection<Content>('content').findOne({ topic_id: topicId });
    if (!existingContent) {
      await db.collection<Content>('content').insertOne({ id: uuidv4(), topic_id: topicId, lecture_content: generatedData.plan, ppt_content: generatedData.slides, status: 'DRAFT', created_by: req.user.id, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
    } else {
      await db.collection<Content>('content').updateOne({ topic_id: topicId }, { $set: { lecture_content: generatedData.plan, ppt_content: generatedData.slides, updated_at: new Date().toISOString() } });
    }
    await db.collection<Topic>('topics').updateOne({ id: topicId }, { $set: { status: 'DRAFT' } });
    res.json({ message: 'Content generated successfully', data: generatedData });
  } catch (error: any) {
    console.error('Generation Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Mock video generation endpoint
router.post('/video/:topicId', async (req: any, res) => {
  try {
    const { topicId } = req.params;
    const db = getDB();
    const content = await db.collection<Content>('content').findOne({ topic_id: topicId });
    if (!content || !content.ppt_content) {
      return res.status(404).json({ error: 'Content or slides not found' });
    }
    res.json({ message: '(Coming Soon) Video generation started.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
