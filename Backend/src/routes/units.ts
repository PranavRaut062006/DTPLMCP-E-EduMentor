import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDB, Unit } from '../db';
import { authMiddleware } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

router.get('/', async (req: any, res) => {
  const { subjectId } = req.query;
  const db = getDB();
  const units = await db.collection<Unit>('units')
    .find(subjectId ? { subject_id: String(subjectId) } : {})
    .sort({ unit_number: 1 }).toArray();
  res.json(units);
});

router.post('/', async (req: any, res) => {
  const { subject_id, unit_number, title } = req.body;
  if (!subject_id || !title) return res.status(400).json({ error: 'Missing required fields' });

  const db = getDB();
  const newUnit: Unit = {
    id: uuidv4(),
    subject_id,
    unit_number: unit_number || 1,
    title,
    created_at: new Date().toISOString()
  };

  await db.collection<Unit>('units').insertOne(newUnit);
  res.status(201).json(newUnit);
});

export default router;
