"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const uuid_1 = require("uuid");
const db_1 = require("../db");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authMiddleware);
router.get('/', async (req, res) => {
    const { subjectId } = req.query;
    const db = (0, db_1.getDB)();
    const units = await db.collection('units')
        .find(subjectId ? { subject_id: String(subjectId) } : {})
        .sort({ unit_number: 1 }).toArray();
    res.json(units);
});
router.post('/', async (req, res) => {
    const { subject_id, unit_number, title } = req.body;
    if (!subject_id || !title)
        return res.status(400).json({ error: 'Missing required fields' });
    const db = (0, db_1.getDB)();
    const newUnit = {
        id: (0, uuid_1.v4)(),
        subject_id,
        unit_number: unit_number || 1,
        title,
        created_at: new Date().toISOString()
    };
    await db.collection('units').insertOne(newUnit);
    res.status(201).json(newUnit);
});
exports.default = router;
