"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const uuid_1 = require("uuid");
const db_1 = require("../db");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authMiddleware);
router.get('/:topicId', async (req, res) => {
    const db = (0, db_1.getDB)();
    const content = await db.collection('content').findOne({ topic_id: req.params.topicId });
    if (!content)
        return res.status(404).json({ error: 'Content not found' });
    res.json(content);
});
router.post('/:topicId', async (req, res) => {
    const { lecture_content, ppt_content, status } = req.body;
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
            lecture_content: lecture_content || existing.lecture_content,
            ppt_content: ppt_content || existing.ppt_content,
            status: status || existing.status,
            updated_at: new Date().toISOString(),
        } }, { returnDocument: 'after' });
    res.json(updated);
});
exports.default = router;
