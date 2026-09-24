import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDB, Topic } from '../db';
import { authMiddleware } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

router.get('/', async (req: any, res) => {
  const { unitId } = req.query;
  const db = getDB();
  const topics = await db.collection<Topic>('topics')
    .find(unitId ? { unit_id: String(unitId) } : {})
    .sort({ position: 1 }).toArray();
  res.json(topics);
});

router.post('/', async (req: any, res) => {
  const { unit_id, title, subtopics, position } = req.body;
  if (!unit_id || !title) return res.status(400).json({ error: 'Missing required fields' });

  const db = getDB();
  const newTopic: Topic = {
    id: uuidv4(),
    unit_id,
    title,
    subtopics: subtopics || [],
    position: position || 0,
    status: 'NOT_GENERATED',
    created_at: new Date().toISOString()
  };

  await db.collection<Topic>('topics').insertOne(newTopic);
  res.status(201).json(newTopic);
});

router.patch('/:id/status', async (req: any, res) => {
  const db = getDB();
  const result = await db.collection<Topic>('topics').findOneAndUpdate(
    { id: req.params.id },
    { $set: { status: req.body.status } },
    { returnDocument: 'after' },
  );
  if (!result) return res.status(404).json({ error: 'Topic not found' });
  res.json(result);
});

export default router;
