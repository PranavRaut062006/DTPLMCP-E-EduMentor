"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const uuid_1 = require("uuid");
const multer_1 = __importDefault(require("multer"));
const pdf_parse_1 = require("pdf-parse");
const generative_ai_1 = require("@google/generative-ai");
const db_1 = require("../db");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authMiddleware);
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage() });
// ─── Helpers ───────────────────────────────────────────────────────────────
/** Map a Subject row to the Classroom shape the frontend expects. */
async function subjectToClassroom(s, db) {
    const units = await db.collection('units').find({ subject_id: s.id }).toArray();
    const unitIds = units.map(u => u.id);
    const topics = await db.collection('topics').find({ unit_id: { $in: unitIds } }).toArray();
    const topicIds = topics.map(t => t.id);
    const faculty = await db.collection('users').findOne({ id: s.faculty_id });
    const materialCount = await db.collection('content').countDocuments({ topic_id: { $in: topicIds } });
    return {
        id: s.id,
        name: s.name,
        subject: s.code,
        description: s.department || '',
        academicYear: s.semester || '',
        department: s.department || '',
        classCode: s.code,
        studentCount: 0,
        materialCount,
        facultyName: faculty?.name || '',
        updatedAt: s.created_at,
    };
}
/** Map DB units+topics for a subject into the SyllabusUnit[] the frontend expects. */
async function buildSyllabusUnits(subjectId, db) {
    const units = await db.collection('units').find({ subject_id: subjectId }).sort({ unit_number: 1 }).toArray();
    return Promise.all(units.map(async (u) => {
        const topics = await db.collection('topics').find({ unit_id: u.id }).sort({ position: 1 }).toArray();
        return {
            id: u.id,
            title: u.title,
            topics: topics.map(t => ({ id: t.id, title: t.title })),
        };
    }));
}
/** Generate PPT slides for a single topic using Gemini. Returns slide array or null. */
async function generateSlidesForTopic(topic, durationHours) {
    if (!process.env.GEMINI_API_KEY)
        return null;
    const genAI = new generative_ai_1.GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const prompt = `
    Create a teaching plan and lecture script for the topic: "${topic.title}".
    Subtopics: ${topic.subtopics.join(', ')}.
    Note: The duration of the entire unit is ${durationHours} hours, so allocate an appropriate fraction of time for this specific topic.
    References: (none — use general knowledge).
    
    Format the output as ONLY JSON (without markdown block ticks) with the following structure:
    {
      "plan": "Detailed teaching plan formatted in Markdown...",
      "slides": [
        { 
          "title": "Slide Title", 
          "bullets": ["Point 1", "Point 2"], 
          "script": "What the faculty will say...",
          "layout": "standard",
          "visualPrompt": ""
        }
      ]
    }
    
    Important Guidelines:
    1. Mix up the slide layouts to keep the presentation visually engaging.
    2. Use 'process_flow' layout for sequences, cycles, comparisons, or step-by-step concepts.
    3. Use 'image_right' layout for conceptual slides to include an AI generated image.
    4. Use 'standard' layout for basic text points.
    5. The layout field must be one of: "standard" | "image_right" | "process_flow"
    6. visualPrompt is required only when layout is "image_right", otherwise keep it empty string "".
  `;
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const parsed = JSON.parse(responseText.replace(/```json|```/g, '').trim());
    return parsed;
}
// ─── Routes ────────────────────────────────────────────────────────────────
/** GET /api/classrooms — list classrooms for the current faculty */
router.get('/', async (req, res) => {
    const db = (0, db_1.getDB)();
    const filter = req.user.role === 'student' ? {} : { faculty_id: req.user.id };
    const subjects = await db.collection('subjects').find(filter).toArray();
    const mapped = await Promise.all(subjects.map(s => subjectToClassroom(s, db)));
    res.json(mapped);
});
/** POST /api/classrooms — create a new classroom */
router.post('/', async (req, res) => {
    const { name, subject, description, academicYear, department } = req.body;
    if (!name || !subject)
        return res.status(400).json({ error: 'name and subject are required' });
    const db = (0, db_1.getDB)();
    // Generate a short class code
    const classCode = subject.toUpperCase().replace(/\s+/g, '').slice(0, 6) +
        Math.random().toString(36).slice(2, 5).toUpperCase();
    const newSubject = {
        id: (0, uuid_1.v4)(),
        faculty_id: req.user.id,
        name,
        code: classCode,
        department: department || '',
        semester: academicYear || '',
        created_at: new Date().toISOString(),
    };
    await db.collection('subjects').insertOne(newSubject);
    const mapped = await subjectToClassroom(newSubject, db);
    res.status(201).json(mapped);
});
/** GET /api/classrooms/:id — classroom detail */
router.get('/:id', async (req, res) => {
    const db = (0, db_1.getDB)();
    const subject = await db.collection('subjects').findOne({ id: req.params.id });
    if (!subject)
        return res.status(404).json({ error: 'Classroom not found' });
    const mapped = await subjectToClassroom(subject, db);
    res.json(mapped);
});
/** DELETE /api/classrooms/:id — delete a classroom */
router.delete('/:id', async (req, res) => {
    const db = (0, db_1.getDB)();
    const subject = await db.collection('subjects').findOne({ id: req.params.id });
    if (!subject)
        return res.status(404).json({ error: 'Classroom not found' });
    // Verify ownership
    if (subject.faculty_id !== req.user.id) {
        return res.status(403).json({ error: 'Forbidden' });
    }
    // Find all units for this subject to delete associated topics
    const units = await db.collection('units').find({ subject_id: req.params.id }).toArray();
    const unitIds = units.map(u => u.id);
    const topics = unitIds.length > 0
        ? await db.collection('topics').find({ unit_id: { $in: unitIds } }).toArray()
        : [];
    const topicIds = topics.map(t => t.id);
    // Clean up
    if (unitIds.length > 0) {
        await db.collection('topics').deleteMany({ unit_id: { $in: unitIds } });
    }
    await db.collection('units').deleteMany({ subject_id: req.params.id });
    await db.collection('content').deleteMany(topicIds.length > 0 ? { topic_id: { $in: topicIds } } : { subject_id: req.params.id });
    await db.collection('subjects').deleteOne({ id: req.params.id });
    res.json({ success: true });
});
/** GET /api/classrooms/:id/syllabus — return structured units + topics */
router.get('/:id/syllabus', async (req, res) => {
    const db = (0, db_1.getDB)();
    const subject = await db.collection('subjects').findOne({ id: req.params.id });
    if (!subject)
        return res.status(404).json({ error: 'Classroom not found' });
    const syllabus = await buildSyllabusUnits(req.params.id, db);
    res.json(syllabus);
});
/** PUT /api/classrooms/:id/syllabus — save manually-edited units+topics */
router.put('/:id/syllabus', async (req, res) => {
    const { units } = req.body;
    const db = (0, db_1.getDB)();
    const subject = await db.collection('subjects').findOne({ id: req.params.id });
    if (!subject)
        return res.status(404).json({ error: 'Classroom not found' });
    // Remove old units and topics for this subject
    const oldUnits = await db.collection('units').find({ subject_id: req.params.id }).toArray();
    const oldUnitIds = oldUnits.map(u => u.id);
    if (oldUnitIds.length > 0) {
        await db.collection('topics').deleteMany({ unit_id: { $in: oldUnitIds } });
    }
    await db.collection('units').deleteMany({ subject_id: req.params.id });
    // Insert new ones
    for (let unitIdx = 0; unitIdx < units.length; unitIdx++) {
        const u = units[unitIdx];
        const newUnit = {
            id: u.id || (0, uuid_1.v4)(),
            subject_id: req.params.id,
            unit_number: unitIdx + 1,
            title: u.title,
            created_at: new Date().toISOString(),
        };
        await db.collection('units').insertOne(newUnit);
        if (u.topics && u.topics.length > 0) {
            const newTopics = u.topics.map((t, topicIdx) => ({
                id: t.id || (0, uuid_1.v4)(),
                unit_id: newUnit.id,
                title: t.title,
                subtopics: [],
                position: topicIdx + 1,
                status: 'NOT_GENERATED',
                created_at: new Date().toISOString(),
            }));
            await db.collection('topics').insertMany(newTopics);
        }
    }
    const syllabus = await buildSyllabusUnits(req.params.id, db);
    res.json(syllabus);
});
/**
 * POST /api/classrooms/:id/syllabus/upload
 *
 * Accepts a PDF file (field name: "syllabus").
 * 1. Parses PDF text with pdf-parse.
 * 2. Sends text to Gemini to extract units + topics.
 * 3. Saves extracted structure to the DB.
 * 4. Auto-generates PPT slides for every extracted topic (background, non-blocking per topic).
 * 5. Returns { units: SyllabusUnit[], generatedCount: number }
 */
router.post('/:id/syllabus/upload', upload.single('syllabus'), async (req, res) => {
    try {
        const subjectId = req.params.id;
        const db = (0, db_1.getDB)();
        const subject = await db.collection('subjects').findOne({ id: subjectId });
        if (!subject)
            return res.status(404).json({ error: 'Classroom not found' });
        if (subject.faculty_id !== req.user.id)
            return res.status(403).json({ error: 'Access denied' });
        if (!req.file)
            return res.status(400).json({ error: 'No file uploaded' });
        // ── 1. Parse PDF ──────────────────────────────────────────────────────
        console.log(`[Syllabus Upload] Parsing PDF for subject "${subject.name}"...`);
        const parser = new pdf_parse_1.PDFParse({ data: req.file.buffer });
        const pdfData = await parser.getText();
        const text = pdfData.text;
        console.log(`[Syllabus Upload] PDF parsed. Characters: ${text.length}`);
        // ── 2. Extract structure with Gemini ──────────────────────────────────
        if (!process.env.GEMINI_API_KEY) {
            return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
        }
        const genAI = new generative_ai_1.GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
        const extractPrompt = `
      You are an expert academic curriculum parser.
      Read the following syllabus text for a subject named "${subject.name}" (${subject.code}).
      Extract the structured units and topics from this syllabus.

      Format your output as ONLY a JSON array (no markdown, no explanation), where each element is:
      {
        "unit_number": <integer>,
        "title": <string>,
        "topics": [
          {
            "title": <string>,
            "subtopics": [<string>, ...]
          }
        ]
      }

      Syllabus Text:
      ${text.substring(0, 28000)}
    `;
        console.log('[Syllabus Upload] Sending to Gemini for structure extraction...');
        const extractResult = await model.generateContent(extractPrompt);
        const extractText = extractResult.response.text();
        let unitsData;
        try {
            unitsData = JSON.parse(extractText.replace(/```json|```/g, '').trim());
        }
        catch (e) {
            console.error('[Syllabus Upload] Failed to parse Gemini structure output:', extractText);
            return res.status(500).json({ error: 'Failed to parse AI structure output' });
        }
        console.log(`[Syllabus Upload] Extracted ${unitsData.length} units.`);
        // ── 3. Save structure to DB ───────────────────────────────────────────
        // Append instead of overwriting existing units+topics
        const existingUnits = await db.collection('units').find({ subject_id: subjectId }).toArray();
        const maxUnitNum = existingUnits.reduce((max, u) => Math.max(max, u.unit_number), 0);
        const savedTopics = [];
        for (const u of unitsData) {
            const newUnit = {
                id: (0, uuid_1.v4)(),
                subject_id: subjectId,
                unit_number: maxUnitNum + u.unit_number,
                title: u.title,
                created_at: new Date().toISOString(),
            };
            await db.collection('units').insertOne(newUnit);
            let pos = 1;
            for (const t of u.topics || []) {
                const newTopic = {
                    id: (0, uuid_1.v4)(),
                    unit_id: newUnit.id,
                    title: t.title,
                    subtopics: t.subtopics || [],
                    position: pos++,
                    status: 'NOT_GENERATED',
                    created_at: new Date().toISOString(),
                };
                await db.collection('topics').insertOne(newTopic);
                savedTopics.push(newTopic);
            }
        }
        // ── 4. Respond immediately with the extracted structure ───────────────
        const syllabusUnits = await buildSyllabusUnits(subjectId, db);
        res.json({ units: syllabusUnits, generatedCount: 0, totalTopics: savedTopics.length });
        // ── 5. Auto-generate PPT slides in the background (non-blocking) ──────
        console.log(`[Syllabus Upload] Starting background PPT generation for ${savedTopics.length} topics...`);
        (async () => {
            let generatedCount = 0;
            const durationHours = 4; // default; faculty can adjust later
            for (const topic of savedTopics) {
                try {
                    console.log(`[PPT Gen] Generating slides for: "${topic.title}"...`);
                    const generated = await generateSlidesForTopic(topic, durationHours);
                    if (!generated)
                        continue;
                    const freshDb = (0, db_1.getDB)();
                    await freshDb.collection('topics').updateOne({ id: topic.id }, { $set: { status: 'DRAFT' } });
                    const existingContent = await freshDb.collection('content').findOne({ topic_id: topic.id });
                    if (!existingContent) {
                        await freshDb.collection('content').insertOne({
                            id: (0, uuid_1.v4)(),
                            topic_id: topic.id,
                            lecture_content: generated.plan,
                            ppt_content: generated.slides,
                            status: 'DRAFT',
                            created_by: req.user.id,
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString(),
                        });
                    }
                    else {
                        await freshDb.collection('content').updateOne({ topic_id: topic.id }, { $set: { lecture_content: generated.plan, ppt_content: generated.slides, updated_at: new Date().toISOString() } });
                    }
                    generatedCount++;
                    console.log(`[PPT Gen] ✓ Done "${topic.title}" (${generatedCount}/${savedTopics.length})`);
                }
                catch (err) {
                    console.error(`[PPT Gen] ✗ Failed for "${topic.title}":`, err);
                }
            }
            console.log(`[PPT Gen] All done. Generated ${generatedCount}/${savedTopics.length} topic PPTs.`);
        })();
    }
    catch (error) {
        console.error('[Syllabus Upload] Error:', error);
        res.status(500).json({ error: error.message });
    }
});
/** GET /api/classrooms/:id/students — stub */
router.get('/:id/students', (req, res) => {
    res.json([]);
});
/** POST /api/classrooms/join — stub for students joining by class code */
router.post('/join', async (req, res) => {
    const { classCode } = req.body;
    const db = (0, db_1.getDB)();
    const subject = await db.collection('subjects').findOne({ code: classCode });
    if (!subject)
        return res.status(404).json({ error: 'Class not found with that code' });
    res.json(await subjectToClassroom(subject, db));
});
exports.default = router;
