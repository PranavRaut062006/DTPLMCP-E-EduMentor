"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const uuid_1 = require("uuid");
const db_1 = require("../db");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authMiddleware);
router.get('/', (req, res) => {
    const { unitId } = req.query;
    const db = (0, db_1.readDB)();
    let topics = db.topics;
    if (unitId) {
        topics = topics.filter(t => t.unit_id === unitId);
    }
    res.json(topics);
});
router.post('/', (req, res) => {
    const { unit_id, title, subtopics, position } = req.body;
    if (!unit_id || !title)
        return res.status(400).json({ error: 'Missing required fields' });
    const db = (0, db_1.readDB)();
    const newTopic = {
        id: (0, uuid_1.v4)(),
        unit_id,
        title,
        subtopics: subtopics || [],
        position: position || 0,
        status: 'NOT_GENERATED',
        created_at: new Date().toISOString()
    };
    db.topics.push(newTopic);
    (0, db_1.writeDB)(db);
    res.status(201).json(newTopic);
});
router.patch('/:id/status', (req, res) => {
    const db = (0, db_1.readDB)();
    const index = db.topics.findIndex(t => t.id === req.params.id);
    if (index === -1)
        return res.status(404).json({ error: 'Topic not found' });
    db.topics[index].status = req.body.status;
    (0, db_1.writeDB)(db);
    res.json(db.topics[index]);
});
exports.default = router;
