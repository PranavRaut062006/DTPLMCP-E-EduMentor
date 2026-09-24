"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const uuid_1 = require("uuid");
const db_1 = require("../db");
const router = (0, express_1.Router)();
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';
/** Map DB User → shape the frontend expects ({ fullName } instead of { name }). */
function toFrontendUser(user) {
    const { password: _, name, ...rest } = user;
    return { ...rest, fullName: name };
}
router.post('/register', async (req, res) => {
    const { name, fullName, email, password, role } = req.body;
    const displayName = name || fullName;
    if (!displayName || !email || !password || !role) {
        return res.status(400).json({ error: 'All fields are required' });
    }
    const db = (0, db_1.getDB)();
    const existingUser = await db.collection('users').findOne({ email });
    if (existingUser) {
        return res.status(400).json({ error: 'User already exists' });
    }
    const hashedPassword = await bcryptjs_1.default.hash(password, 10);
    const newUser = {
        id: (0, uuid_1.v4)(),
        name: displayName,
        email,
        password: hashedPassword,
        role
    };
    await db.collection('users').insertOne(newUser);
    const token = jsonwebtoken_1.default.sign({ id: newUser.id, role: newUser.role }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ user: toFrontendUser(newUser), token });
});
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const db = (0, db_1.getDB)();
    const user = await db.collection('users').findOne({ email });
    if (!user || !user.password) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }
    const isMatch = await bcryptjs_1.default.compare(password, user.password);
    if (!isMatch) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jsonwebtoken_1.default.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ user: toFrontendUser(user), token });
});
router.get('/me', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader)
        return res.status(401).json({ error: 'No token provided' });
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        const db = (0, db_1.getDB)();
        const user = await db.collection('users').findOne({ id: decoded.id });
        if (!user)
            return res.status(404).json({ error: 'User not found' });
        res.json({ user: toFrontendUser(user) });
    }
    catch (err) {
        res.status(401).json({ error: 'Invalid token' });
    }
});
/** GET /api/auth/session — alias for /me, used by the frontend. */
router.get('/session', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader)
        return res.status(401).json({ error: 'No token provided' });
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        const db = (0, db_1.getDB)();
        const user = await db.collection('users').findOne({ id: decoded.id });
        if (!user)
            return res.status(404).json({ error: 'User not found' });
        res.json(toFrontendUser(user));
    }
    catch (err) {
        res.status(401).json({ error: 'Invalid token' });
    }
});
exports.default = router;
