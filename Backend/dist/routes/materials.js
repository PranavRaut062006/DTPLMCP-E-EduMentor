"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authMiddleware);
/**
 * GET /api/materials
 * Lists all generated materials for faculty (or filtered by ?classroomId=)
 */
router.get('/', async (req, res) => {
    try {
        const db = (0, db_1.getDB)();
        const facultyId = req.user.id;
        const { classroomId } = req.query;
        let subjectFilter = { faculty_id: facultyId };
        if (classroomId)
            subjectFilter = { id: classroomId, faculty_id: facultyId };
        const subjects = await db.collection('subjects').find(subjectFilter).toArray();
        const subjectIds = subjects.map((s) => s.id);
        const units = await db.collection('units').find({ subject_id: { $in: subjectIds } }).toArray();
        const unitIds = units.map((u) => u.id);
        const topics = await db.collection('topics').find({ unit_id: { $in: unitIds } }).toArray();
        const topicMap = new Map(topics.map((t) => [t.id, t]));
        const contents = await db.collection('content').find({
            $or: [
                { topic_id: { $in: topics.map((t) => t.id) } },
                { created_by: facultyId },
            ],
        }).sort({ updated_at: -1 }).toArray();
        const materials = contents.map((c) => {
            const topic = topicMap.get(c.topic_id);
            const unit = units.find((u) => u.id === topic?.unit_id);
            const hasPPT = Array.isArray(c.ppt_content) && c.ppt_content.length > 0;
            const kind = hasPPT ? 'ppt' : c.lecture_content ? 'teaching-plan' : 'notes';
            return {
                id: c.topic_id,
                classroomId: unit?.subject_id || c.subject_id || '',
                title: topic?.title || 'Teaching Material',
                kind,
                status: c.status === 'PUBLISHED' ? 'published' : 'draft',
                durationMinutes: 45,
                updatedAt: c.updated_at || c.created_at,
            };
        });
        res.json(materials);
    }
    catch (error) {
        console.error('[Materials List] Error:', error);
        res.status(500).json({ error: error.message });
    }
});
/**
 * GET /api/materials/:id
 */
router.get('/:id', async (req, res) => {
    try {
        const db = (0, db_1.getDB)();
        const content = await db.collection('content').findOne({
            $or: [{ id: req.params.id }, { topic_id: req.params.id }],
        });
        if (!content)
            return res.status(404).json({ error: 'Material not found' });
        const topic = await db.collection('topics').findOne({ id: content.topic_id });
        const unit = await db.collection('units').findOne({ id: topic?.unit_id });
        res.json({
            id: content.topic_id,
            classroomId: unit?.subject_id || content.subject_id || '',
            title: topic?.title || 'Teaching Material',
            kind: Array.isArray(content.ppt_content) && content.ppt_content.length > 0 ? 'ppt' : 'teaching-plan',
            status: content.status === 'PUBLISHED' ? 'published' : 'draft',
            durationMinutes: 45,
            updatedAt: content.updated_at || content.created_at,
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.default = router;
