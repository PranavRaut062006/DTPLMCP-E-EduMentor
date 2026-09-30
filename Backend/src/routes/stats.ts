import { Router } from 'express';
import { getDB, Subject, Unit, Topic, Content, User } from '../db';
import { authMiddleware } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

/**
 * GET /api/stats/faculty
 * Returns live dashboard metrics for faculty:
 * - classrooms: number of classrooms created
 * - publishedMaterials: number of published topics/materials
 * - students: number of enrolled students across all classrooms
 * - generatedContent: total number of topics with generated content
 */
router.get('/faculty', async (req: any, res) => {
  try {
    const db = getDB();
    const facultyId = req.user.id;

    // 1. Classrooms count: all classrooms/subjects belonging to this faculty
    const subjects = await db.collection<Subject>('subjects').find({ faculty_id: facultyId }).toArray();
    const subjectIds = subjects.map((s) => s.id);
    const classroomsCount = subjects.length;

    // 2. Units & Topics of these subjects
    const units = await db.collection<Unit>('units').find({ subject_id: { $in: subjectIds } }).toArray();
    const unitIds = units.map((u) => u.id);
    const topics = await db.collection<Topic>('topics').find({ unit_id: { $in: unitIds } }).toArray();
    const topicIds = topics.map((t) => t.id);

    // 3. Content docs
    const contents = await db.collection<Content>('content').find({
      $or: [
        { topic_id: { $in: topicIds } },
        { created_by: facultyId },
      ],
    }).toArray();

    // 4. Published materials count
    const publishedMaterials = contents.filter((c) => c.status === 'PUBLISHED').length;

    // 5. Total generated content count
    const generatedContent = contents.length;

    // 6. Students reached (count of unique students enrolled in this faculty's classrooms)
    const enrollments = await db.collection('enrollments').find({
      classroom_id: { $in: subjectIds },
    }).toArray();
    const uniqueStudentIds = new Set(enrollments.map((e: any) => e.user_id));
    const studentsCount = uniqueStudentIds.size;

    res.json({
      classrooms: classroomsCount,
      publishedMaterials,
      students: studentsCount,
      generatedContent,
    });
  } catch (error: any) {
    console.error('[Stats Faculty] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/stats/student
 * Returns live metrics for student dashboard
 */
router.get('/student', async (req: any, res) => {
  try {
    const db = getDB();
    const studentId = req.user.id;

    // Enrolled classrooms
    const enrollments = await db.collection('enrollments').find({ user_id: studentId }).toArray();
    const enrolledClassroomIds = enrollments.map((e: any) => e.classroom_id);
    const enrolledClasses = enrolledClassroomIds.length;

    // Units & Topics for enrolled classrooms
    const units = await db.collection<Unit>('units').find({ subject_id: { $in: enrolledClassroomIds } }).toArray();
    const unitIds = units.map((u) => u.id);
    const topics = await db.collection<Topic>('topics').find({ unit_id: { $in: unitIds } }).toArray();
    const totalTopics = topics.length;

    // Published content in enrolled classrooms
    const topicIds = topics.map((t) => t.id);
    const contents = await db.collection<Content>('content').find({
      topic_id: { $in: topicIds },
      status: 'PUBLISHED',
    }).toArray();
    const availableMaterials = contents.length;

    res.json({
      enrolledClasses,
      availableMaterials,
      completedTopics: 0,
      totalTopics,
    });
  } catch (error: any) {
    console.error('[Stats Student] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
