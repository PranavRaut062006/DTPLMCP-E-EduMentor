import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { readDB, writeDB, Topic } from '../db';
import { authMiddleware } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

router.get('/', (req: any, res) => {
  const { unitId } = req.query;
  const db = readDB();
  let topics = db.topics;
  if (unitId) {
    topics = topics.filter(t => t.unit_id === unitId);
  }
  res.json(topics);
});

router.post('/', (req: any, res) => {
  const { unit_id, title, subtopics, position } = req.body;
  if (!unit_id || !title) return res.status(400).json({ error: 'Missing required fields' });

  const db = readDB();
  const newTopic: Topic = {
    id: uuidv4(),
    unit_id,
    title,
    subtopics: subtopics || [],
    position: position || 0,
    status: 'NOT_GENERATED',
    created_at: new Date().toISOString()
  };

  db.topics.push(newTopic);
  writeDB(db);
  res.status(201).json(newTopic);
});

router.patch('/:id/status', (req: any, res) => {
  const db = readDB();
  const index = db.topics.findIndex(t => t.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Topic not found' });

  db.topics[index].status = req.body.status;
  writeDB(db);
  res.json(db.topics[index]);
});

export default router;
