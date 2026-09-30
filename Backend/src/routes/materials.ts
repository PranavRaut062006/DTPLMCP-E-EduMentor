import { Router } from 'express';
import { getDB, Subject, Unit, Topic, Content } from '../db';
import { authMiddleware } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

/**
 * GET /api/materials
 * Lists all generated materials for faculty (or filtered by ?classroomId=)
 */
router.get('/', async (req: any, res) => {
  try {
    const db = getDB();
    const facultyId = req.user.id;
    const { classroomId } = req.query;

    let subjectFilter: any = { faculty_id: facultyId };
    if (classroomId) subjectFilter = { id: classroomId, faculty_id: facultyId };

    const subjects = await db.collection<Subject>('subjects').find(subjectFilter).toArray();
    const subjectIds = subjects.map((s) => s.id);

    const units = await db.collection<Unit>('units').find({ subject_id: { $in: subjectIds } }).toArray();
    const unitIds = units.map((u) => u.id);

    const topics = await db.collection<Topic>('topics').find({ unit_id: { $in: unitIds } }).toArray();
    const topicMap = new Map(topics.map((t) => [t.id, t]));

    const contents = await db.collection<Content>('content').find({
      $or: [
        { topic_id: { $in: topics.map((t) => t.id) } },
        { created_by: facultyId },
      ],
    }).sort({ updated_at: -1 }).toArray();

    const materials = contents.map((c) => {
      const topic = topicMap.get(c.topic_id);
      const unit = units.find((u) => u.id === topic?.unit_id);
      const hasPPT = Array.isArray(c.ppt_content) && c.ppt_content.length > 0;
      const kind = hasPPT ? 'ppt' : c.lecture_content ? 'teaching-plan' : 'notes';

      return {
        id: c.topic_id,
        classroomId: unit?.subject_id || c.subject_id || '',
        title: topic?.title || 'Teaching Material',
        kind,
        status: c.status === 'PUBLISHED' ? 'published' : 'draft',
        durationMinutes: 45,
        updatedAt: c.updated_at || c.created_at,
      };
    });

    res.json(materials);
  } catch (error: any) {
    console.error('[Materials List] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/materials/:id
 */
router.get('/:id', async (req: any, res) => {
  try {
    const db = getDB();
    const content = await db.collection<Content>('content').findOne({
      $or: [{ id: req.params.id }, { topic_id: req.params.id }],
    });
    if (!content) return res.status(404).json({ error: 'Material not found' });

    const topic = await db.collection<Topic>('topics').findOne({ id: content.topic_id });
    const unit = await db.collection<Unit>('units').findOne({ id: topic?.unit_id });

    res.json({
      id: content.topic_id,
      classroomId: unit?.subject_id || content.subject_id || '',
      title: topic?.title || 'Teaching Material',
      kind: Array.isArray(content.ppt_content) && content.ppt_content.length > 0 ? 'ppt' : 'teaching-plan',
      status: content.status === 'PUBLISHED' ? 'published' : 'draft',
      durationMinutes: 45,
      updatedAt: content.updated_at || content.created_at,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
