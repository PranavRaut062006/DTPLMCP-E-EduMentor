import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { readDB, writeDB, Content } from '../db';
import { authMiddleware } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

router.get('/:topicId', (req: any, res) => {
  const db = readDB();
  const content = db.content.find(c => c.topic_id === req.params.topicId);
  if (!content) return res.status(404).json({ error: 'Content not found' });
  res.json(content);
});

router.post('/:topicId', (req: any, res) => {
  const { lecture_content, ppt_content, status } = req.body;
  const db = readDB();
  
  let contentIndex = db.content.findIndex(c => c.topic_id === req.params.topicId);
  
  if (contentIndex !== -1) {
    db.content[contentIndex] = {
      ...db.content[contentIndex],
      lecture_content: lecture_content || db.content[contentIndex].lecture_content,
      ppt_content: ppt_content || db.content[contentIndex].ppt_content,
      status: status || db.content[contentIndex].status,
      updated_at: new Date().toISOString()
    };
  } else {
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
    db.content.push(newContent);
    contentIndex = db.content.length - 1;
  }
  
  writeDB(db);
  res.json(db.content[contentIndex]);
});

export default router;
