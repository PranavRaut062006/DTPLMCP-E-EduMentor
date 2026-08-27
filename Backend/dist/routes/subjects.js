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
router.get('/', (req, res) => {
    const db = (0, db_1.readDB)();
    const subjects = db.subjects.filter(s => s.faculty_id === req.user.id);
    res.json(subjects);
});
router.post('/', (req, res) => {
    const { name, code, department, semester } = req.body;
    if (!name || !code)
        return res.status(400).json({ error: 'Name and code are required' });
    const db = (0, db_1.readDB)();
    const newSubject = {
        id: (0, uuid_1.v4)(),
        faculty_id: req.user.id,
        name,
        code,
        department: department || '',
        semester: semester || '',
        created_at: new Date().toISOString()
    };
    db.subjects.push(newSubject);
    (0, db_1.writeDB)(db);
    res.status(201).json(newSubject);
});
router.get('/:id', (req, res) => {
    const db = (0, db_1.readDB)();
    const subject = db.subjects.find(s => s.id === req.params.id);
    if (!subject)
        return res.status(404).json({ error: 'Subject not found' });
    if (req.user.role === 'faculty' && subject.faculty_id !== req.user.id) {
        return res.status(403).json({ error: 'Access denied' });
    }
    res.json(subject);
});
router.post('/:id/syllabus', upload.single('syllabus'), async (req, res) => {
    try {
        const subjectId = req.params.id;
        const db = (0, db_1.readDB)();
        const subject = db.subjects.find(s => s.id === subjectId);
        if (!subject)
            return res.status(404).json({ error: 'Subject not found' });
        if (subject.faculty_id !== req.user.id)
            return res.status(403).json({ error: 'Access denied' });
        if (!req.file)
            return res.status(400).json({ error: 'No file uploaded' });
        // 1. Parse PDF
        const parser = new pdf_parse_1.PDFParse({ data: req.file.buffer });
        const pdfData = await parser.getText();
        const text = pdfData.text;
        // 2. Use Gemini to extract units and topics
        if (!process.env.GEMINI_API_KEY) {
            return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
        }
        const genAI = new generative_ai_1.GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
        const prompt = `
      You are an expert academic curriculum parser. 
      Read the following syllabus text for a subject named "${subject.name}" (${subject.code}).
      Extract the structured units and topics from this syllabus.

      Format your output exactly as a JSON array of objects representing units. No markdown blocks, just raw JSON.
      Each unit object should have:
      - "unit_number": (integer)
      - "title": (string) The title of the unit
      - "topics": (array of objects) where each topic has:
        - "title": (string) Main topic name
        - "subtopics": (array of strings) List of subtopics covered under this topic

      Syllabus Text:
      ${text.substring(0, 30000)} // Limit text to avoid token limits if too large
    `;
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        let unitsData;
        try {
            unitsData = JSON.parse(responseText.replace(/```json|```/g, '').trim());
        }
        catch (e) {
            console.error("Failed to parse Gemini output for syllabus:", responseText);
            return res.status(500).json({ error: 'Failed to parse AI structure output' });
        }
        // 3. Save to database
        let positionCounter = 1;
        for (const u of unitsData) {
            const newUnit = {
                id: (0, uuid_1.v4)(),
                subject_id: subjectId,
                unit_number: u.unit_number || positionCounter,
                title: u.title,
                created_at: new Date().toISOString()
            };
            db.units.push(newUnit);
            let topicPosition = 1;
            if (u.topics && Array.isArray(u.topics)) {
                for (const t of u.topics) {
                    const newTopic = {
                        id: (0, uuid_1.v4)(),
                        unit_id: newUnit.id,
                        title: t.title,
                        subtopics: t.subtopics || [],
                        position: topicPosition++,
                        status: 'NOT_GENERATED',
                        created_at: new Date().toISOString()
                    };
                    db.topics.push(newTopic);
                }
            }
            positionCounter++;
        }
        (0, db_1.writeDB)(db);
        res.json({ message: 'Syllabus parsed and structure created successfully', units: unitsData.length });
    }
    catch (error) {
        console.error('Syllabus upload error:', error);
        res.status(500).json({ error: error.message });
    }
});
exports.default = router;
