import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDB, Content } from '../db';
import { authMiddleware } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

router.get('/:topicId', async (req: any, res) => {
  const db = getDB();
  const content = await db.collection<Content>('content').findOne({ topic_id: req.params.topicId });
  if (!content) return res.status(404).json({ error: 'Content not found' });
  res.json(content);
});

router.post('/:topicId', async (req: any, res) => {
  const { lecture_content, ppt_content, status } = req.body;
  const db = getDB();
  const existing = await db.collection<Content>('content').findOne({ topic_id: req.params.topicId });
  if (!existing) {
    const newContent: Content = {
      id: uuidv4(),
      topic_id: req.params.topicId,
      lecture_content,
      ppt_content,
      status: status || 'DRAFT',
      created_by: req.user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    await db.collection<Content>('content').insertOne(newContent);
    return res.json(newContent);
  }
  const updated = await db.collection<Content>('content').findOneAndUpdate(
    { topic_id: req.params.topicId },
    { $set: {
      lecture_content: lecture_content || existing.lecture_content,
      ppt_content: ppt_content || existing.ppt_content,
      status: status || existing.status,
      updated_at: new Date().toISOString(),
    } },
    { returnDocument: 'after' },
  );
  res.json(updated);
});

export default router;
