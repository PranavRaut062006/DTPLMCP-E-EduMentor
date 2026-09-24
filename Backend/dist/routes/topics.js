"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const uuid_1 = require("uuid");
const db_1 = require("../db");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authMiddleware);
router.get('/', async (req, res) => {
    const { unitId } = req.query;
    const db = (0, db_1.getDB)();
    const topics = await db.collection('topics')
        .find(unitId ? { unit_id: String(unitId) } : {})
        .sort({ position: 1 }).toArray();
    res.json(topics);
});
router.post('/', async (req, res) => {
    const { unit_id, title, subtopics, position } = req.body;
    if (!unit_id || !title)
        return res.status(400).json({ error: 'Missing required fields' });
    const db = (0, db_1.getDB)();
    const newTopic = {
        id: (0, uuid_1.v4)(),
        unit_id,
        title,
        subtopics: subtopics || [],
        position: position || 0,
        status: 'NOT_GENERATED',
        created_at: new Date().toISOString()
    };
    await db.collection('topics').insertOne(newTopic);
    res.status(201).json(newTopic);
});
router.patch('/:id/status', async (req, res) => {
    const db = (0, db_1.getDB)();
    const result = await db.collection('topics').findOneAndUpdate({ id: req.params.id }, { $set: { status: req.body.status } }, { returnDocument: 'after' });
    if (!result)
        return res.status(404).json({ error: 'Topic not found' });
    res.json(result);
});
exports.default = router;
