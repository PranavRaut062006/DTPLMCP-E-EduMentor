"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const uuid_1 = require("uuid");
const db_1 = require("../db");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authMiddleware);
router.get('/:topicId', (req, res) => {
    const db = (0, db_1.readDB)();
    const content = db.content.find(c => c.topic_id === req.params.topicId);
    if (!content)
        return res.status(404).json({ error: 'Content not found' });
    res.json(content);
});
router.post('/:topicId', (req, res) => {
    const { lecture_content, ppt_content, status } = req.body;
    const db = (0, db_1.readDB)();
    let contentIndex = db.content.findIndex(c => c.topic_id === req.params.topicId);
    if (contentIndex !== -1) {
        db.content[contentIndex] = {
            ...db.content[contentIndex],
            lecture_content: lecture_content || db.content[contentIndex].lecture_content,
            ppt_content: ppt_content || db.content[contentIndex].ppt_content,
            status: status || db.content[contentIndex].status,
            updated_at: new Date().toISOString()
        };
    }
    else {
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
        db.content.push(newContent);
        contentIndex = db.content.length - 1;
    }
    (0, db_1.writeDB)(db);
    res.json(db.content[contentIndex]);
});
exports.default = router;
