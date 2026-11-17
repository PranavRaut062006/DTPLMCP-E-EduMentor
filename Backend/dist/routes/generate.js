"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const generative_ai_1 = require("@google/generative-ai");
const fluent_ffmpeg_1 = __importDefault(require("fluent-ffmpeg"));
const ffmpeg_1 = __importDefault(require("@ffmpeg-installer/ffmpeg"));
const uuid_1 = require("uuid");
const auth_1 = require("../middleware/auth");
const db_1 = require("../db");
fluent_ffmpeg_1.default.setFfmpegPath(ffmpeg_1.default.path);
const router = (0, express_1.Router)();
router.use(auth_1.authMiddleware);
// ── Main generation endpoint called by the frontend ──────────────────────────
// POST /api/generation
// Body: { classroomId, topicIds, durationMinutes, references, outputs }
// outputs: Array of 'teaching-plan' | 'ppt' | 'notes' | 'video'
router.post('/', async (req, res) => {
    try {
        const { classroomId, topicIds, references = [], outputs = ['teaching-plan', 'ppt', 'notes'] } = req.body;
        const rawDuration = Number(req.body.durationMinutes) || 5;
        const durationMinutes = Math.max(2, Math.min(20, Math.round(rawDuration)));
        if (!topicIds || topicIds.length === 0) {
            return res.status(400).json({ error: 'No topics selected' });
        }
        if (!process.env.GEMINI_API_KEY) {
            return res.status(500).json({ error: 'GEMINI_API_KEY not configured on server' });
        }
        const db = (0, db_1.getDB)();
        const genAI = new generative_ai_1.GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const CANDIDATE_MODELS = ['gemini-3.1-flash-lite', 'gemini-3.5-flash-lite', 'gemini-flash-lite-latest', 'gemini-3.8-flash'];
        const referencesText = references.length > 0
            ? references.map((r) => `${r.kind}: ${r.label}`).join(', ')
            : 'none — use general academic knowledge';
        const generatedMaterials = [];
        for (const topicId of topicIds) {
            const topic = await db.collection('topics').findOne({ id: topicId });
            if (!topic)
                continue;
            console.log(`[Generate] Processing topic: "${topic.title}"...`);
            const wantPPT = outputs.includes('ppt');
            const wantNotes = outputs.includes('notes');
            const wantPlan = outputs.includes('teaching-plan');
            // Calculate target slide count dynamically based on requested teaching duration (2 to 20 minutes)
            const subtopicsCount = topic.subtopics ? topic.subtopics.length : 0;
            let targetSlides;
            let minSlides;
            let maxSlides;
            if (durationMinutes <= 3) {
                targetSlides = Math.max(3, Math.min(5, 3 + subtopicsCount));
                minSlides = 3;
                maxSlides = 5;
            }
            else if (durationMinutes <= 6) {
                targetSlides = Math.max(5, Math.min(8, 4 + subtopicsCount));
                minSlides = 4;
                maxSlides = 8;
            }
            else if (durationMinutes <= 10) {
                targetSlides = Math.max(8, Math.min(12, 6 + subtopicsCount));
                minSlides = 7;
                maxSlides = 12;
            }
            else if (durationMinutes <= 15) {
                targetSlides = Math.max(11, Math.min(16, 9 + subtopicsCount));
                minSlides = 10;
                maxSlides = 16;
            }
            else {
                targetSlides = Math.max(14, Math.min(20, 12 + subtopicsCount));
                minSlides = 13;
                maxSlides = 20;
            }
            const planField = wantPlan ? `"teaching_plan": "A detailed, well-structured academic teaching plan in Markdown format covering learning objectives, timeline breakdown, pedagogy, classroom activities, assessment criteria, and discussion questions. Minimum 400 words.",` : '';
            const notesField = wantNotes ? `"notes": "Comprehensive university-level student study notes in Markdown format with clear headings, subheadings, rigorous definitions, real-world examples, mathematical or conceptual formulations, and key review takeaways. Minimum 600 words.",` : '';
            const slidesField = wantPPT
                ? `"slides": [
    {
      "title": "Learning Objectives & Course Context",
      "layout": "standard",
      "bullets": ["**Core Objective:** Comprehend the foundational mechanisms of this topic", "**Industrial Relevance:** Analyze how modern enterprises leverage these principles", "**Key Outcomes:** Evaluate architecture trade-offs and implementation strategies"],
      "script": "Welcome students. Today we explore this subject with a focus on both theoretical foundations and production applications."
    },
    {
      "title": "Formal Concepts & Core Terminology",
      "layout": "standard",
      "bullets": ["**Primary Concept:** Formal definition and underlying scientific/technical principles", "**Operational Scope:** How this functions within the broader system hierarchy", "**Key Distinction:** How this fundamentally differs from legacy or adjacent paradigms"],
      "script": "Let us establish precise definitions before examining deeper architecture."
    },
    {
      "title": "End-to-End Execution Flowchart",
      "layout": "process_flow",
      "bullets": [],
      "diagram": {
        "type": "flowchart",
        "nodes": [
          { "step": "01", "label": "Initialization", "description": "Requirement ingestion & state discovery" },
          { "step": "02", "label": "Processing", "description": "Core transformation & business logic" },
          { "step": "03", "label": "Validation", "description": "Verification, testing & boundary checks" },
          { "step": "04", "label": "Deployment", "description": "Production release & telemetry tracking" }
        ]
      },
      "script": "Notice how each phase transitions sequentially with clear validation checkpoints."
    },
    {
      "title": "Architectural Paradigms: Comparative Analysis",
      "layout": "comparison",
      "bullets": [],
      "diagram": {
        "type": "comparison",
        "leftTitle": "Traditional / Baseline Paradigm",
        "leftItems": ["**Architecture:** Monolithic or tightly-coupled components", "**Risk & Cost:** Lower upfront complexity, higher long-term maintenance", "**Bottleneck:** Limited horizontal elasticity under peak load"],
        "rightTitle": "Modern / Advanced Paradigm",
        "rightItems": ["**Architecture:** Distributed, modular, decoupled services", "**Risk & Cost:** Higher design investment, superior scalability", "**Benefit:** High fault tolerance and rapid iteration cycles"]
      },
      "script": "Understanding the trade-offs between these two approaches is essential for practical engineering decisions."
    },
    {
      "title": "Key Strategic Pillars & Component Grid",
      "layout": "cards_grid",
      "bullets": [],
      "diagram": {
        "type": "grid",
        "cards": [
          { "title": "Pillar 1: Reliability", "items": ["Fault isolation barriers", "Automated self-healing", "Zero-downtime rollover"] },
          { "title": "Pillar 2: Performance", "items": ["Low-latency pipelines", "Predictive caching", "Optimized throughput"] },
          { "title": "Pillar 3: Security", "items": ["End-to-end encryption", "Zero-trust verification", "Granular access control"] },
          { "title": "Pillar 4: Governance", "items": ["Auditable event logs", "Compliance monitoring", "Automated reporting"] }
        ]
      },
      "script": "These four pillars together form the operational foundation of our system architecture."
    },
    {
      "title": "Real-World Case Study: Production Application",
      "layout": "case_study",
      "bullets": [],
      "diagram": {
        "type": "case_study",
        "challengeTitle": "Industry Problem & Context",
        "challengeDesc": "A global enterprise experienced severe latency bottlenecks and data synchronization errors during high-volume transactions.",
        "solutionTitle": "Implemented Architecture & Strategy",
        "solutionDesc": "Re-engineered the core pipeline using event-driven asynchronous processing combined with localized in-memory caches.",
        "outcomes": ["45% reduction in median transaction response time", "99.99% system availability during peak traffic events", "Eliminated data corruption across distributed nodes"]
      },
      "script": "Let us examine this real-world case study to see how theoretical principles solve concrete operational challenges."
    },
    {
      "title": "Classroom Discussion & Critical Thinking",
      "layout": "discussion",
      "bullets": [],
      "diagram": {
        "type": "discussion",
        "question": "Under what specific constraints would an organization deliberately choose the simpler traditional approach over the advanced distributed model?",
        "discussionPoints": [
          "**Capital & Team Capacity:** Team size, specialized skills, and upfront development budgets.",
          "**Throughput Thresholds:** When transaction volumes do not justify distributed operational overhead.",
          "**Regulatory Constraints:** Strict data residency or compliance requiring single-tenant physical isolation."
        ]
      },
      "script": "Take a moment to discuss this with your peers. Consider the engineering trade-offs beyond pure performance metrics."
    },
    {
      "title": "Summary & Key Takeaways",
      "layout": "summary",
      "bullets": [],
      "diagram": {
        "type": "summary",
        "takeaways": [
          { "title": "Foundation Matters", "desc": "Solid grasp of core principles is required before designing complex systems." },
          { "title": "Architect for Resilience", "desc": "Anticipate component failures and build automated isolation mechanisms." },
          { "title": "Measure What Counts", "desc": "Evaluate solutions through empirical metrics, cost efficiency, and maintainability." },
          { "title": "Continuous Iteration", "desc": "Refine architecture iteratively based on real-world telemetry and user feedback." }
        ]
      },
      "script": "To summarize our session today, remember these core takeaways as you apply these concepts in your coursework and projects."
    }
  ]`
                : '"slides": []';
            const prompt = `You are a distinguished university professor and master curriculum designer.
Create comprehensive, rigorous, and classroom-ready teaching material for the topic: "${topic.title}".

COURSE CONTEXT & METRICS:
- Topic Title: "${topic.title}"
- Subtopics to thoroughly cover: ${topic.subtopics.length > 0 ? topic.subtopics.join(', ') : 'Comprehensive academic overview'}.
- Allocated Lecture Duration: ${durationMinutes} minutes (The presentation depth and number of slides MUST reflect this ${durationMinutes}-minute teaching duration).
- Reference Materials / Context: ${referencesText}.

TARGET SLIDE COUNT:
- Generate approximately ${targetSlides} slides (between ${minSlides} and ${maxSlides} slides) to properly pace a ${durationMinutes}-minute university lecture.

REQUIRED SLIDE ARCHITECTURE & PEDAGOGICAL FLOW:
1. Introduction & Learning Objectives (Why this topic matters, industrial relevance)
2. Foundational Concepts & Terminology (Clear formal definitions with bold lead-ins e.g. "**Concept Name:** Explanation")
3. Core Architectural Mechanisms / Principles (3-5 slides covering subtopics with substantial depth)
4. Step-by-Step Flowchart / Lifecycle / Process Pipeline (Structured sequential nodes)
5. Comparative Analysis / Contrasting Paradigms (e.g. Approach A vs Approach B, Trade-offs)
6. Strategic Pillars / Architecture Breakdown (Multi-feature cards grid)
7. Real-World Case Study / Concrete Engineering Example (Context, Problem, Solution, Outcome)
8. Interactive Classroom Discussion Prompt / Critical Thinking Question (Question for students + key discussion angles)
9. Summary & Actionable Key Takeaways

SLIDE FORMAT & LAYOUT TYPES TO USE (Mix these creatively across the presentation):
1. "standard": 3 to 5 substantive bullet points with bold keywords and clear explanations (use this for 40-50% of slides).
2. "process_flow": Sequential flowchart with 3 to 5 nodes [{ "step": "01", "label": "Stage Name", "description": "Specific action & output" }].
3. "comparison": Two contrasting cards with leftTitle/leftItems and rightTitle/rightItems.
4. "cards_grid": 3 or 4 strategic category cards with title and items.
5. "case_study": Concrete industry scenario with challenge, solution, and outcomes.
6. "discussion": Class engagement slide with question and discussionPoints.
7. "summary": Core takeaway conclusions with title and desc.

CRITICAL ANTI-DUPLICATION & QUALITY RULES:
- ZERO DUPLICATION: Do NOT repeat identical bullet points, definitions, or statements across different slides. Each slide must provide new, distinct educational value.
- SUBSTANTIVE CONTENT: Avoid extremely short 1-2 line slides. Ensure each slide has sufficient depth for faculty to teach effectively.
- NO PROMPT DESCRIPTIONS: Do NOT write text prompts like "draw an image". Use the structured JSON fields for diagrams and cards.
- PRESENTER SCRIPT: Provide a natural, insightful 2-4 sentence narration script for faculty in the "script" field for every slide.

Return ONLY a valid JSON object with this EXACT structure (no markdown fences, no text before or after):
{
  ${planField}
  ${notesField}
  ${slidesField}
}`;
            let generatedData = null;
            for (const modelName of CANDIDATE_MODELS) {
                if (generatedData)
                    break;
                try {
                    console.log(`[Generate] Requesting content with model "${modelName}" for topic "${topic.title}"...`);
                    const model = genAI.getGenerativeModel({ model: modelName });
                    const result = await model.generateContent(prompt);
                    let rawText = result.response.text();
                    // Clean up markdown code blocks if the model includes them
                    rawText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
                    const firstBrace = rawText.indexOf('{');
                    const lastBrace = rawText.lastIndexOf('}');
                    if (firstBrace !== -1 && lastBrace !== -1) {
                        rawText = rawText.substring(firstBrace, lastBrace + 1);
                    }
                    generatedData = JSON.parse(rawText);
                    console.log(`[Generate] Successfully generated content with model "${modelName}" for topic "${topic.title}"`);
                    break;
                }
                catch (e) {
                    console.warn(`[Generate] Model "${modelName}" failed for topic "${topic.title}":`, e.message || e);
                }
            }
            if (!generatedData) {
                console.error(`[Generate] All candidate models failed to generate content for topic "${topic.title}".`);
                continue;
            }
            const contentDoc = {
                id: (0, uuid_1.v4)(),
                topic_id: topicId,
                subject_id: classroomId,
                lecture_content: generatedData.teaching_plan || generatedData.notes || '',
                ppt_content: generatedData.slides || [],
                status: 'DRAFT',
                duration_minutes: durationMinutes,
                created_by: req.user.id,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            };
            const existing = await db.collection('content').findOne({ topic_id: topicId });
            if (existing) {
                await db.collection('content').updateOne({ topic_id: topicId }, { $set: {
                        lecture_content: contentDoc.lecture_content,
                        ppt_content: contentDoc.ppt_content,
                        notes_content: generatedData.notes || null,
                        duration_minutes: durationMinutes,
                        updated_at: contentDoc.updated_at,
                    } });
                contentDoc.id = existing.id;
            }
            else {
                await db.collection('content').insertOne({
                    ...contentDoc,
                    notes_content: generatedData.notes || null,
                });
            }
            await db.collection('topics').updateOne({ id: topicId }, { $set: { status: 'DRAFT' } });
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
    }
    catch (error) {
        console.error('[Generate] Error:', error);
        res.status(500).json({ error: error.message || 'Generation failed' });
    }
});
// ── Per-topic generation (legacy/internal route) ──────────────────────────────
router.post('/topic/:topicId', async (req, res) => {
    try {
        const { topicId } = req.params;
        const { durationHours, references } = req.body;
        const db = (0, db_1.getDB)();
        const topic = await db.collection('topics').findOne({ id: topicId });
        if (!topic)
            return res.status(404).json({ error: 'Topic not found' });
        let generatedData;
        if (process.env.GEMINI_API_KEY) {
            const genAI = new generative_ai_1.GoogleGenerativeAI(process.env.GEMINI_API_KEY);
            const model = genAI.getGenerativeModel({ model: "gemini-3.8-flash" });
            const prompt = `Create a teaching plan and lecture script for the topic: "${topic.title}". Subtopics: ${topic.subtopics.join(', ')}. Duration: ${durationHours} hours. References: ${references}. Return ONLY JSON: { "plan": "...", "slides": [{ "title": "", "bullets": [], "script": "", "layout": "standard", "visualPrompt": "" }] }`;
            const result = await model.generateContent(prompt);
            const responseText = result.response.text();
            try {
                generatedData = JSON.parse(responseText.replace(/```json|```/g, '').trim());
            }
            catch (err) {
                throw new Error("Failed to parse AI output");
            }
        }
        else {
            generatedData = { plan: `Teaching plan for ${topic.title}.`, slides: [{ title: `Introduction to ${topic.title}`, bullets: ["Key concept 1"], script: `Welcome to ${topic.title}.`, layout: 'standard', visualPrompt: '' }] };
        }
        const existingContent = await db.collection('content').findOne({ topic_id: topicId });
        if (!existingContent) {
            await db.collection('content').insertOne({ id: (0, uuid_1.v4)(), topic_id: topicId, lecture_content: generatedData.plan, ppt_content: generatedData.slides, status: 'DRAFT', created_by: req.user.id, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
        }
        else {
            await db.collection('content').updateOne({ topic_id: topicId }, { $set: { lecture_content: generatedData.plan, ppt_content: generatedData.slides, updated_at: new Date().toISOString() } });
        }
        await db.collection('topics').updateOne({ id: topicId }, { $set: { status: 'DRAFT' } });
        res.json({ message: 'Content generated successfully', data: generatedData });
    }
    catch (error) {
        console.error('Generation Error:', error);
        res.status(500).json({ error: error.message });
    }
});
// Mock video generation endpoint
router.post('/video/:topicId', async (req, res) => {
    try {
        const { topicId } = req.params;
        const db = (0, db_1.getDB)();
        const content = await db.collection('content').findOne({ topic_id: topicId });
        if (!content || !content.ppt_content) {
            return res.status(404).json({ error: 'Content or slides not found' });
        }
        res.json({ message: '(Coming Soon) Video generation started.' });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.default = router;
