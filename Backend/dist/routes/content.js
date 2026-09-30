"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const uuid_1 = require("uuid");
const pptxgenjs_1 = __importDefault(require("pptxgenjs"));
const db_1 = require("../db");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authMiddleware);
// GET /api/content/:topicId — get content for a topic
router.get('/:topicId', async (req, res) => {
    const db = (0, db_1.getDB)();
    const content = await db.collection('content').findOne({ topic_id: req.params.topicId });
    if (!content)
        return res.status(404).json({ error: 'Content not found' });
    res.json(content);
});
// POST /api/content/:topicId — create/update content manually
router.post('/:topicId', async (req, res) => {
    const { lecture_content, ppt_content, notes_content, status } = req.body;
    const db = (0, db_1.getDB)();
    const existing = await db.collection('content').findOne({ topic_id: req.params.topicId });
    if (!existing) {
        const newContent = {
            id: (0, uuid_1.v4)(),
            topic_id: req.params.topicId,
            lecture_content,
            ppt_content,
            status: status || 'DRAFT',
            created_by: req.user.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        await db.collection('content').insertOne(newContent);
        return res.json(newContent);
    }
    const updated = await db.collection('content').findOneAndUpdate({ topic_id: req.params.topicId }, { $set: {
            lecture_content: lecture_content ?? existing.lecture_content,
            ppt_content: ppt_content ?? existing.ppt_content,
            notes_content: notes_content ?? existing.notes_content,
            status: status ?? existing.status,
            updated_at: new Date().toISOString(),
        } }, { returnDocument: 'after' });
    res.json(updated);
});
// POST /api/content/:topicId/publish — publish content (students can see it)
router.post('/:topicId/publish', async (req, res) => {
    const db = (0, db_1.getDB)();
    const content = await db.collection('content').findOne({ topic_id: req.params.topicId });
    if (!content)
        return res.status(404).json({ error: 'Content not found' });
    await db.collection('content').updateOne({ topic_id: req.params.topicId }, { $set: { status: 'PUBLISHED', updated_at: new Date().toISOString() } });
    await db.collection('topics').updateOne({ id: req.params.topicId }, { $set: { status: 'PUBLISHED' } });
    res.json({ success: true, message: 'Content published successfully' });
});
// DELETE /api/content/:topicId — discard (delete) all generated content for a topic
router.delete('/:topicId', async (req, res) => {
    const db = (0, db_1.getDB)();
    await db.collection('content').deleteOne({ topic_id: req.params.topicId });
    await db.collection('topics').updateOne({ id: req.params.topicId }, { $set: { status: 'NOT_GENERATED' } });
    res.json({ success: true });
});
// PATCH /api/content/:topicId/discard/:section — discard only one section (teaching_plan, notes, slides)
router.patch('/:topicId/discard/:section', async (req, res) => {
    const { section } = req.params;
    const db = (0, db_1.getDB)();
    const content = await db.collection('content').findOne({ topic_id: req.params.topicId });
    if (!content)
        return res.status(404).json({ error: 'Content not found' });
    const updateFields = { updated_at: new Date().toISOString() };
    if (section === 'teaching-plan')
        updateFields.lecture_content = null;
    else if (section === 'notes')
        updateFields.notes_content = null;
    else if (section === 'ppt')
        updateFields.ppt_content = [];
    else
        return res.status(400).json({ error: 'Invalid section. Use teaching-plan, notes, or ppt' });
    await db.collection('content').updateOne({ topic_id: req.params.topicId }, { $set: updateFields });
    res.json({ success: true });
});
// DELETE /api/content/:topicId/slide/:index — discard a single slide
router.delete('/:topicId/slide/:index', async (req, res) => {
    const slideIndex = parseInt(req.params.index, 10);
    const db = (0, db_1.getDB)();
    const content = await db.collection('content').findOne({ topic_id: req.params.topicId });
    if (!content)
        return res.status(404).json({ error: 'Content not found' });
    const slides = content.ppt_content || [];
    if (slideIndex < 0 || slideIndex >= slides.length) {
        return res.status(400).json({ error: 'Invalid slide index' });
    }
    slides.splice(slideIndex, 1);
    await db.collection('content').updateOne({ topic_id: req.params.topicId }, { $set: { ppt_content: slides, updated_at: new Date().toISOString() } });
    res.json({ success: true, slides });
});
// Helper to parse markdown bold/italic in strings to pptxgenjs text runs
function parseFormattedRuns(text, baseOptions = {}) {
    if (!text)
        return [{ text: '', options: baseOptions }];
    const runs = [];
    const regex = /(\*\*([^*]+)\*\*)|(\*([^*]+)\*)|([^*]+)/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
        if (match[2]) {
            runs.push({
                text: match[2],
                options: {
                    ...baseOptions,
                    bold: true,
                    color: baseOptions.boldColor || 'FFFFFF',
                },
            });
        }
        else if (match[4]) {
            runs.push({
                text: match[4],
                options: {
                    ...baseOptions,
                    italic: true,
                    color: baseOptions.color || 'CBD5E1',
                },
            });
        }
        else if (match[5]) {
            runs.push({
                text: match[5],
                options: {
                    ...baseOptions,
                    bold: false,
                    color: baseOptions.color || 'CBD5E1',
                },
            });
        }
    }
    return runs.length > 0 ? runs : [{ text, options: baseOptions }];
}
// Deduplication & Slide Validation Engine
function deduplicateAndValidateSlides(rawSlides) {
    if (!Array.isArray(rawSlides))
        return [];
    const seenTitles = new Set();
    const validatedSlides = [];
    for (let i = 0; i < rawSlides.length; i++) {
        const slide = rawSlides[i];
        if (!slide || typeof slide !== 'object')
            continue;
        const rawTitle = (slide.title || `Slide ${i + 1}`).trim();
        const normTitle = rawTitle.toLowerCase().replace(/[^a-z0-9]/g, '');
        // Skip duplicate slide titles
        if (seenTitles.has(normTitle) && normTitle.length > 3) {
            continue;
        }
        seenTitles.add(normTitle);
        // Deduplicate and clean bullet points
        const rawBullets = Array.isArray(slide.bullets) ? slide.bullets : [];
        const seenBullets = new Set();
        const cleanBullets = [];
        for (const b of rawBullets) {
            if (!b || typeof b !== 'string')
                continue;
            const cleanB = b.trim();
            const normB = cleanB.toLowerCase().replace(/[*_#`\-•]/g, '').trim();
            if (!normB || seenBullets.has(normB))
                continue;
            seenBullets.add(normB);
            cleanBullets.push(cleanB);
        }
        const cleanSlide = {
            ...slide,
            title: rawTitle,
            bullets: cleanBullets,
            layout: slide.layout || 'standard',
        };
        // If a standard slide has > 5 long bullets, split it to avoid cramped text
        if (cleanSlide.layout === 'standard' && cleanBullets.length > 5) {
            const part1 = cleanBullets.slice(0, Math.ceil(cleanBullets.length / 2));
            const part2 = cleanBullets.slice(Math.ceil(cleanBullets.length / 2));
            validatedSlides.push({
                ...cleanSlide,
                title: `${rawTitle} (Part 1)`,
                bullets: part1,
            });
            validatedSlides.push({
                ...cleanSlide,
                title: `${rawTitle} (Part 2)`,
                bullets: part2,
            });
        }
        else {
            validatedSlides.push(cleanSlide);
        }
    }
    return validatedSlides;
}
// GET /api/content/:topicId/download/ppt — generate and download .pptx file
router.get('/:topicId/download/ppt', async (req, res) => {
    try {
        const db = (0, db_1.getDB)();
        const content = await db.collection('content').findOne({ topic_id: req.params.topicId });
        if (!content || !content.ppt_content || content.ppt_content.length === 0) {
            return res.status(404).json({ error: 'No slides found for this topic' });
        }
        const topic = await db.collection('topics').findOne({ id: req.params.topicId });
        const topicTitle = topic?.title || 'Presentation';
        const rawSlides = content.ppt_content;
        // Apply deduplication and validation
        const slides = deduplicateAndValidateSlides(rawSlides);
        if (slides.length === 0) {
            return res.status(400).json({ error: 'No valid slide content after deduplication' });
        }
        const pptx = new pptxgenjs_1.default();
        pptx.layout = 'LAYOUT_16x9'; // 10 x 5.625 inches
        pptx.title = topicTitle;
        // Theme Colors
        const DARK_BG = '0F1117';
        const CARD_BG = '1A1D27';
        const ACCENT = '6366F1'; // indigo
        const ACCENT_TEAL = '14B8A6'; // teal
        const ACCENT_EMERALD = '10B981'; // emerald
        const ACCENT_AMBER = 'F59E0B'; // amber
        const TEXT_WHITE = 'FFFFFF';
        const TEXT_LIGHT = 'CBD5E1';
        const SLIDE_NUM_COLOR = '64748B';
        // 1. Title Slide
        const titleSlide = pptx.addSlide();
        titleSlide.background = { color: DARK_BG };
        titleSlide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 10, h: 0.08, fill: { color: ACCENT } });
        titleSlide.addShape(pptx.ShapeType.rect, { x: 0, y: 5.54, w: 10, h: 0.08, fill: { color: ACCENT } });
        titleSlide.addText(topicTitle, {
            x: 0.6, y: 1.4, w: 8.8, h: 1.8,
            fontSize: 34, bold: true, color: TEXT_WHITE,
            fontFace: 'Calibri', align: 'center', valign: 'middle',
        });
        titleSlide.addText('TeachAI Academic Lecture Series', {
            x: 0.6, y: 3.3, w: 8.8, h: 0.4,
            fontSize: 16, color: TEXT_LIGHT, fontFace: 'Calibri', align: 'center',
        });
        titleSlide.addText(`${slides.length} Comprehensive Slides · Faculty Ready`, {
            x: 0.6, y: 3.8, w: 8.8, h: 0.4,
            fontSize: 13, color: ACCENT, fontFace: 'Calibri', align: 'center',
        });
        // 2. Content Slides
        slides.forEach((slide, idx) => {
            const s = pptx.addSlide();
            s.background = { color: DARK_BG };
            // Top accent bar
            s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 10, h: 0.08, fill: { color: ACCENT } });
            // Slide number
            s.addText(`${idx + 1} / ${slides.length}`, {
                x: 8.5, y: 5.2, w: 1.2, h: 0.3,
                fontSize: 10, color: SLIDE_NUM_COLOR, align: 'right', fontFace: 'Calibri',
            });
            // Presenter notes — stored in PowerPoint speaker notes only (0 on slide surface)
            if (slide.script) {
                s.addNotes(slide.script);
            }
            const layout = slide.layout || 'standard';
            const cleanTitle = (slide.title || '').replace(/\*\*/g, '');
            if (layout === 'process_flow' || (slide.diagram && slide.diagram.type === 'flowchart')) {
                // ── 1. Flowchart / Process Flow Layout ──
                s.addText(cleanTitle || 'Process Flow & Lifecycle', {
                    x: 0.6, y: 0.4, w: 8.8, h: 0.65,
                    fontSize: 24, bold: true, color: TEXT_WHITE, fontFace: 'Calibri',
                });
                let nodes = [];
                if (slide.diagram && Array.isArray(slide.diagram.nodes) && slide.diagram.nodes.length > 0) {
                    nodes = slide.diagram.nodes;
                }
                else if (Array.isArray(slide.bullets) && slide.bullets.length > 0) {
                    nodes = slide.bullets.map((b, i) => {
                        const parts = b.replace(/\*\*/g, '').split(/:\s*|-/);
                        return {
                            step: `0${i + 1}`,
                            label: parts[0]?.trim() || `Step ${i + 1}`,
                            description: parts[1]?.trim() || parts[0]?.trim() || '',
                        };
                    });
                }
                else {
                    nodes = [
                        { step: '01', label: 'Phase 1: Ingestion', description: 'Requirements discovery & initial state' },
                        { step: '02', label: 'Phase 2: Architecture', description: 'System design & component layout' },
                        { step: '03', label: 'Phase 3: Execution', description: 'Implementation & continuous testing' },
                        { step: '04', label: 'Phase 4: Release', description: 'Deployment & telemetry evaluation' },
                    ];
                }
                const count = Math.min(nodes.length, 5);
                const activeNodes = nodes.slice(0, count);
                const totalW = 8.8;
                const startX = 0.6;
                const cardW = Math.min(2.0, (totalW / count) - 0.25);
                const gap = count > 1 ? (totalW - (count * cardW)) / (count - 1) : 0;
                const cardY = 1.35;
                const cardH = 3.4;
                activeNodes.forEach((n, i) => {
                    const x = startX + i * (cardW + gap);
                    s.addShape(pptx.ShapeType.roundRect, {
                        x, y: cardY, w: cardW, h: cardH,
                        fill: { color: CARD_BG },
                        line: { color: i === 0 || i === count - 1 ? ACCENT : '334155', width: 1.5 },
                    });
                    // Step Badge pill
                    s.addShape(pptx.ShapeType.roundRect, {
                        x: x + 0.12, y: cardY + 0.18, w: 0.45, h: 0.35,
                        fill: { color: ACCENT },
                    });
                    s.addText(n.step || `0${i + 1}`, {
                        x: x + 0.12, y: cardY + 0.18, w: 0.45, h: 0.35,
                        fontSize: 10, bold: true, color: TEXT_WHITE, align: 'center', valign: 'middle', fontFace: 'Calibri',
                    });
                    // Step Title
                    s.addText(n.label || `Stage ${i + 1}`, {
                        x: x + 0.08, y: cardY + 0.65, w: cardW - 0.16, h: 0.45,
                        fontSize: 13, bold: true, color: TEXT_WHITE, align: 'center', fontFace: 'Calibri', valign: 'middle',
                    });
                    // Divider
                    s.addShape(pptx.ShapeType.rect, {
                        x: x + 0.15, y: cardY + 1.2, w: cardW - 0.3, h: 0.02,
                        fill: { color: '334155' },
                    });
                    // Description
                    s.addText(n.description || '', {
                        x: x + 0.1, y: cardY + 1.3, w: cardW - 0.2, h: 1.9,
                        fontSize: 10.5, color: TEXT_LIGHT, align: 'center', fontFace: 'Calibri', valign: 'top',
                    });
                    // Connector arrow between nodes
                    if (i < count - 1) {
                        s.addText('➔', {
                            x: x + cardW, y: cardY + 1.35, w: gap, h: 0.4,
                            fontSize: 14, color: ACCENT, align: 'center', valign: 'middle',
                        });
                    }
                });
            }
            else if (layout === 'comparison' || (slide.diagram && slide.diagram.type === 'comparison')) {
                // ── 2. Comparison Layout (Dual Contrasting Panels) ──
                s.addText(cleanTitle || 'Comparative Paradigm Analysis', {
                    x: 0.6, y: 0.4, w: 8.8, h: 0.65,
                    fontSize: 24, bold: true, color: TEXT_WHITE, fontFace: 'Calibri',
                });
                const leftTitle = slide.diagram?.leftTitle || 'Approach A';
                const rightTitle = slide.diagram?.rightTitle || 'Approach B';
                const leftItems = slide.diagram?.leftItems || (slide.bullets ? slide.bullets.slice(0, Math.ceil(slide.bullets.length / 2)) : []);
                const rightItems = slide.diagram?.rightItems || (slide.bullets ? slide.bullets.slice(Math.ceil(slide.bullets.length / 2)) : []);
                // Left Panel
                s.addShape(pptx.ShapeType.roundRect, {
                    x: 0.6, y: 1.3, w: 4.2, h: 3.7,
                    fill: { color: CARD_BG },
                    line: { color: ACCENT, width: 1.5 },
                });
                s.addText(leftTitle, {
                    x: 0.8, y: 1.45, w: 3.8, h: 0.4,
                    fontSize: 16, bold: true, color: TEXT_WHITE, fontFace: 'Calibri',
                });
                s.addShape(pptx.ShapeType.rect, { x: 0.8, y: 1.95, w: 3.8, h: 0.02, fill: { color: '334155' } });
                const leftRuns = [];
                leftItems.forEach((item) => {
                    const runs = parseFormattedRuns(item, { fontSize: 12.5, color: TEXT_LIGHT, fontFace: 'Calibri' });
                    runs[0].options = { ...runs[0].options, bullet: true };
                    runs[runs.length - 1].options = { ...runs[runs.length - 1].options, breakLine: true };
                    leftRuns.push(...runs);
                });
                s.addText(leftRuns, { x: 0.8, y: 2.1, w: 3.8, h: 2.7, valign: 'top' });
                // Right Panel
                s.addShape(pptx.ShapeType.roundRect, {
                    x: 5.2, y: 1.3, w: 4.2, h: 3.7,
                    fill: { color: CARD_BG },
                    line: { color: ACCENT_TEAL, width: 1.5 },
                });
                s.addText(rightTitle, {
                    x: 5.4, y: 1.45, w: 3.8, h: 0.4,
                    fontSize: 16, bold: true, color: TEXT_WHITE, fontFace: 'Calibri',
                });
                s.addShape(pptx.ShapeType.rect, { x: 5.4, y: 1.95, w: 3.8, h: 0.02, fill: { color: '334155' } });
                const rightRuns = [];
                rightItems.forEach((item) => {
                    const runs = parseFormattedRuns(item, { fontSize: 12.5, color: TEXT_LIGHT, fontFace: 'Calibri' });
                    runs[0].options = { ...runs[0].options, bullet: true };
                    runs[runs.length - 1].options = { ...runs[runs.length - 1].options, breakLine: true };
                    rightRuns.push(...runs);
                });
                s.addText(rightRuns, { x: 5.4, y: 2.1, w: 3.8, h: 2.7, valign: 'top' });
            }
            else if (layout === 'cards_grid' || (slide.diagram && slide.diagram.type === 'grid')) {
                // ── 3. Cards Grid / Multi-Feature Architecture Layout ──
                s.addText(cleanTitle || 'Key Architectural Pillars & Components', {
                    x: 0.6, y: 0.4, w: 8.8, h: 0.65,
                    fontSize: 24, bold: true, color: TEXT_WHITE, fontFace: 'Calibri',
                });
                const cards = slide.diagram?.cards || [
                    { title: 'Core Layer', items: ['Architectural foundation', 'Security validation'] },
                    { title: 'Processing Layer', items: ['Business logic execution', 'Data transformation'] },
                    { title: 'Interface Layer', items: ['API endpoints', 'Client synchronization'] },
                    { title: 'Telemetry Layer', items: ['Audit trails', 'Performance telemetry'] },
                ];
                const colors = [ACCENT, ACCENT_TEAL, ACCENT_EMERALD, ACCENT_AMBER];
                cards.slice(0, 4).forEach((c, i) => {
                    const gx = 0.6 + (i % 2) * 4.6;
                    const gy = 1.3 + Math.floor(i / 2) * 1.85;
                    s.addShape(pptx.ShapeType.roundRect, {
                        x: gx, y: gy, w: 4.2, h: 1.65,
                        fill: { color: CARD_BG },
                        line: { color: colors[i % colors.length], width: 1.5 },
                    });
                    s.addText(c.title || `Pillar ${i + 1}`, {
                        x: gx + 0.2, y: gy + 0.15, w: 3.8, h: 0.3,
                        fontSize: 13.5, bold: true, color: TEXT_WHITE, fontFace: 'Calibri',
                    });
                    const cruns = [];
                    (c.items || []).forEach((it) => {
                        const r = parseFormattedRuns(it, { fontSize: 11, color: TEXT_LIGHT, fontFace: 'Calibri' });
                        r[0].options = { ...r[0].options, bullet: true };
                        r[r.length - 1].options = { ...r[r.length - 1].options, breakLine: true };
                        cruns.push(...r);
                    });
                    s.addText(cruns, { x: gx + 0.2, y: gy + 0.5, w: 3.8, h: 1.05, valign: 'top' });
                });
            }
            else if (layout === 'case_study' || (slide.diagram && slide.diagram.type === 'case_study')) {
                // ── 4. Case Study / Problem-Solution Layout ──
                s.addText(cleanTitle || 'Real-World Case Study in Practice', {
                    x: 0.6, y: 0.4, w: 8.8, h: 0.65,
                    fontSize: 24, bold: true, color: TEXT_WHITE, fontFace: 'Calibri',
                });
                const d = slide.diagram || {};
                // Left Context Panel
                s.addShape(pptx.ShapeType.roundRect, {
                    x: 0.6, y: 1.3, w: 4.2, h: 3.7,
                    fill: { color: CARD_BG },
                    line: { color: ACCENT_AMBER, width: 1.5 },
                });
                s.addText(`🏢 ${d.challengeTitle || 'Industry Challenge & Context'}`, {
                    x: 0.8, y: 1.5, w: 3.8, h: 0.35,
                    fontSize: 15, bold: true, color: ACCENT_AMBER, fontFace: 'Calibri',
                });
                s.addText(d.challengeDesc || 'A real-world organization faced severe performance latency and synchronization challenges.', {
                    x: 0.8, y: 1.95, w: 3.8, h: 1.2,
                    fontSize: 12.5, color: TEXT_LIGHT, fontFace: 'Calibri', valign: 'top',
                });
                s.addText('Key Bottlenecks Identified:', {
                    x: 0.8, y: 3.2, w: 3.8, h: 0.3,
                    fontSize: 12, bold: true, color: TEXT_WHITE, fontFace: 'Calibri',
                });
                s.addText('• High concurrency failure rates\n• Legacy monolithic synchronization\n• Inconsistent customer experience', {
                    x: 0.8, y: 3.5, w: 3.8, h: 1.3,
                    fontSize: 11.5, color: TEXT_LIGHT, fontFace: 'Calibri', valign: 'top',
                });
                // Right Solution Panel
                s.addShape(pptx.ShapeType.roundRect, {
                    x: 5.2, y: 1.3, w: 4.2, h: 3.7,
                    fill: { color: CARD_BG },
                    line: { color: ACCENT_EMERALD, width: 1.5 },
                });
                s.addText(`💡 ${d.solutionTitle || 'Architectural Solution & Impact'}`, {
                    x: 5.4, y: 1.5, w: 3.8, h: 0.35,
                    fontSize: 15, bold: true, color: ACCENT_EMERALD, fontFace: 'Calibri',
                });
                s.addText(d.solutionDesc || 'Re-architected core workflows into decoupled asynchronous microservices with resilient caching.', {
                    x: 5.4, y: 1.95, w: 3.8, h: 1.2,
                    fontSize: 12.5, color: TEXT_LIGHT, fontFace: 'Calibri', valign: 'top',
                });
                s.addText('Measurable Outcomes:', {
                    x: 5.4, y: 3.2, w: 3.8, h: 0.3,
                    fontSize: 12, bold: true, color: TEXT_WHITE, fontFace: 'Calibri',
                });
                const outcomes = d.outcomes || ['40%+ reduction in end-to-end latency', '99.99% availability under peak load', 'Seamless cross-node consistency'];
                const oRuns = [];
                outcomes.forEach((o) => {
                    oRuns.push({ text: `• ${o}\n`, options: { fontSize: 11.5, color: TEXT_LIGHT } });
                });
                s.addText(oRuns, { x: 5.4, y: 3.5, w: 3.8, h: 1.3, valign: 'top' });
            }
            else if (layout === 'discussion' || (slide.diagram && slide.diagram.type === 'discussion')) {
                // ── 5. Interactive Classroom Discussion Slide ──
                s.addText(cleanTitle || 'Classroom Discussion & Critical Thinking', {
                    x: 0.6, y: 0.4, w: 8.8, h: 0.65,
                    fontSize: 24, bold: true, color: TEXT_WHITE, fontFace: 'Calibri',
                });
                const d = slide.diagram || {};
                // Question Box
                s.addShape(pptx.ShapeType.roundRect, {
                    x: 0.6, y: 1.3, w: 8.8, h: 1.4,
                    fill: { color: CARD_BG },
                    line: { color: ACCENT_AMBER, width: 2 },
                });
                s.addText('🤔 Question for the Class:', {
                    x: 0.9, y: 1.45, w: 8.2, h: 0.3,
                    fontSize: 13, bold: true, color: ACCENT_AMBER, fontFace: 'Calibri',
                });
                s.addText(d.question || 'Under what specific system constraints would you choose a simpler traditional architecture over a distributed model?', {
                    x: 0.9, y: 1.8, w: 8.2, h: 0.8,
                    fontSize: 15, bold: true, color: TEXT_WHITE, fontFace: 'Calibri', valign: 'top',
                });
                // Discussion Angles Card
                s.addShape(pptx.ShapeType.roundRect, {
                    x: 0.6, y: 2.9, w: 8.8, h: 2.1,
                    fill: { color: CARD_BG },
                    line: { color: '334155', width: 1 },
                });
                s.addText('💡 Key Discussion Angles to Explore:', {
                    x: 0.9, y: 3.05, w: 8.2, h: 0.3,
                    fontSize: 13, bold: true, color: ACCENT_TEAL, fontFace: 'Calibri',
                });
                const points = d.discussionPoints || slide.bullets || [
                    '**Resource & Complexity Budget:** Balancing development velocity against operational overhead.',
                    '**Throughput & Scale Boundaries:** Knowing when architectural overhead outweighs performance benefits.',
                    '**Security & Compliance Constraints:** Strict data boundaries and physical isolation requirements.'
                ];
                const qRuns = [];
                points.forEach((p) => {
                    const r = parseFormattedRuns(p, { fontSize: 12.5, color: TEXT_LIGHT, fontFace: 'Calibri' });
                    r[0].options = { ...r[0].options, bullet: true };
                    r[r.length - 1].options = { ...r[r.length - 1].options, breakLine: true };
                    qRuns.push(...r);
                });
                s.addText(qRuns, { x: 0.9, y: 3.4, w: 8.2, h: 1.5, valign: 'top' });
            }
            else if (layout === 'summary' || (slide.diagram && slide.diagram.type === 'summary')) {
                // ── 6. Summary & Core Takeaways Layout ──
                s.addText(cleanTitle || 'Summary & Core Takeaways', {
                    x: 0.6, y: 0.4, w: 8.8, h: 0.65,
                    fontSize: 24, bold: true, color: TEXT_WHITE, fontFace: 'Calibri',
                });
                const takeaways = slide.diagram?.takeaways || [
                    { title: 'Foundation First', desc: 'A thorough grasp of core concepts is essential before tackling complex architecture.' },
                    { title: 'Resilience by Design', desc: 'Anticipate failure states and build automated isolation and recovery barriers.' },
                    { title: 'Evidence-Based Metrics', desc: 'Evaluate trade-offs through measurable telemetry, latency, and reliability.' },
                    { title: 'Iterative Refinement', desc: 'Continuously optimize implementations based on real-world operational feedback.' },
                ];
                takeaways.slice(0, 4).forEach((t, i) => {
                    const ty = 1.3 + i * 0.92;
                    s.addShape(pptx.ShapeType.roundRect, {
                        x: 0.6, y: ty, w: 8.8, h: 0.8,
                        fill: { color: CARD_BG },
                        line: { color: ACCENT_EMERALD, width: 1 },
                    });
                    s.addText('✓', {
                        x: 0.8, y: ty + 0.15, w: 0.4, h: 0.5,
                        fontSize: 18, bold: true, color: ACCENT_EMERALD, align: 'center', valign: 'middle',
                    });
                    s.addText(t.title || `Takeaway ${i + 1}`, {
                        x: 1.3, y: ty + 0.12, w: 2.8, h: 0.55,
                        fontSize: 13, bold: true, color: TEXT_WHITE, valign: 'middle', fontFace: 'Calibri',
                    });
                    s.addText(t.desc || '', {
                        x: 4.2, y: ty + 0.12, w: 5.0, h: 0.55,
                        fontSize: 11.5, color: TEXT_LIGHT, valign: 'middle', fontFace: 'Calibri',
                    });
                });
            }
            else {
                // ── 7. Standard Academic Content Slide ──
                s.addText(cleanTitle, {
                    x: 0.6, y: 0.4, w: 8.8, h: 0.65,
                    fontSize: 24, bold: true, color: TEXT_WHITE, fontFace: 'Calibri',
                });
                // Left accent bar
                s.addShape(pptx.ShapeType.rect, { x: 0.6, y: 1.25, w: 0.04, h: 3.6, fill: { color: ACCENT } });
                const bulletRuns = [];
                (slide.bullets || []).forEach((b) => {
                    const runs = parseFormattedRuns(b, { fontSize: 13.5, color: TEXT_LIGHT, fontFace: 'Calibri' });
                    runs[0].options = { ...runs[0].options, bullet: true };
                    runs[runs.length - 1].options = { ...runs[runs.length - 1].options, breakLine: true };
                    bulletRuns.push(...runs);
                });
                s.addText(bulletRuns, {
                    x: 0.85, y: 1.25, w: 8.5, h: 3.6,
                    fontSize: 13.5, color: TEXT_LIGHT, fontFace: 'Calibri', valign: 'top',
                });
            }
        });
        // 3. Thank You Slide
        const lastSlide = pptx.addSlide();
        lastSlide.background = { color: DARK_BG };
        lastSlide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 10, h: 0.08, fill: { color: ACCENT } });
        lastSlide.addShape(pptx.ShapeType.rect, { x: 0, y: 5.54, w: 10, h: 0.08, fill: { color: ACCENT } });
        lastSlide.addText('Thank You!', {
            x: 0.6, y: 1.8, w: 8.8, h: 1.2,
            fontSize: 42, bold: true, color: TEXT_WHITE, align: 'center', fontFace: 'Calibri',
        });
        lastSlide.addText('Generated by TeachAI · Academic Lecture Series', {
            x: 0.6, y: 3.2, w: 8.8, h: 0.5,
            fontSize: 16, color: ACCENT, align: 'center', fontFace: 'Calibri',
        });
        const safeTitle = topicTitle.replace(/[^a-z0-9]/gi, '_').substring(0, 40);
        const filename = `${safeTitle}_presentation.pptx`;
        const buffer = await pptx.write({ outputType: 'nodebuffer' });
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Length', buffer.length.toString());
        res.end(buffer);
    }
    catch (error) {
        console.error('[PPT Download] Error:', error);
        res.status(500).json({ error: error.message });
    }
});
// GET /api/content/classroom/:classroomId — get all PUBLISHED content for a classroom (for students)
router.get('/classroom/:classroomId', async (req, res) => {
    const db = (0, db_1.getDB)();
    // Get all topics for subjects in this classroom
    const topics = await db.collection('topics').find({}).toArray();
    // We need to find topics linked to this classroom via units -> subjects
    const subject = await db.collection('subjects').findOne({ id: req.params.classroomId });
    if (!subject)
        return res.status(404).json({ error: 'Classroom not found' });
    const { ObjectId } = require('mongodb');
    const units = await db.collection('units').find({ subject_id: req.params.classroomId }).toArray();
    const unitIds = units.map((u) => u.id);
    const classroomTopics = topics.filter((t) => unitIds.includes(t.unit_id));
    const topicIds = classroomTopics.map((t) => t.id);
    const statusFilter = req.user.role === 'student' ? 'PUBLISHED' : undefined;
    const contentFilter = { topic_id: { $in: topicIds } };
    if (statusFilter)
        contentFilter.status = statusFilter;
    const contents = await db.collection('content').find(contentFilter).toArray();
    // Join with topic info
    const result = contents.map((c) => {
        const topic = classroomTopics.find((t) => t.id === c.topic_id);
        return {
            ...c,
            topicTitle: topic?.title || '',
            topicStatus: topic?.status || '',
        };
    });
    res.json(result);
});
exports.default = router;
