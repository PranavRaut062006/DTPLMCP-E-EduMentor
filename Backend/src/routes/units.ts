import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { readDB, writeDB, Unit } from '../db';
import { authMiddleware } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

router.get('/', (req: any, res) => {
  const { subjectId } = req.query;
  const db = readDB();
  let units = db.units;
  if (subjectId) {
    units = units.filter(u => u.subject_id === subjectId);
  }
  res.json(units);
});

router.post('/', (req: any, res) => {
  const { subject_id, unit_number, title } = req.body;
  if (!subject_id || !title) return res.status(400).json({ error: 'Missing required fields' });

  const db = readDB();
  const newUnit: Unit = {
    id: uuidv4(),
    subject_id,
    unit_number: unit_number || 1,
    title,
    created_at: new Date().toISOString()
  };

  db.units.push(newUnit);
  writeDB(db);
  res.status(201).json(newUnit);
});

export default router;
