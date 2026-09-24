import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { getDB, User } from '../db';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

/** Map DB User → shape the frontend expects ({ fullName } instead of { name }). */
function toFrontendUser(user: User) {
  const { password: _, name, ...rest } = user;
  return { ...rest, fullName: name };
}

router.post('/register', async (req, res) => {
  const { name, fullName, email, password, role } = req.body;
  const displayName = name || fullName;
  
  if (!displayName || !email || !password || !role) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const db = getDB();
  const existingUser = await db.collection<User>('users').findOne({ email });
  if (existingUser) {
    return res.status(400).json({ error: 'User already exists' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser: User = {
    id: uuidv4(),
    name: displayName,
    email,
    password: hashedPassword,
    role
  };

  await db.collection<User>('users').insertOne(newUser);

  const token = jwt.sign({ id: newUser.id, role: newUser.role }, JWT_SECRET, { expiresIn: '7d' });
  res.status(201).json({ user: toFrontendUser(newUser), token });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const db = getDB();
  
  const user = await db.collection<User>('users').findOne({ email });
  if (!user || !user.password) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ user: toFrontendUser(user), token });
});

router.get('/me', async (req: any, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token provided' });

  const token = authHeader.split(' ')[1];
  try {
    const decoded: any = jwt.verify(token, JWT_SECRET);
    const db = getDB();
    const user = await db.collection<User>('users').findOne({ id: decoded.id });
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    res.json({ user: toFrontendUser(user) });
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

/** GET /api/auth/session — alias for /me, used by the frontend. */
router.get('/session', async (req: any, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token provided' });

  const token = authHeader.split(' ')[1];
  try {
    const decoded: any = jwt.verify(token, JWT_SECRET);
    const db = getDB();
    const user = await db.collection<User>('users').findOne({ id: decoded.id });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(toFrontendUser(user));
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

export default router;
