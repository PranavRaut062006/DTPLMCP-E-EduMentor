import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

import authRoutes from './routes/auth';
import subjectRoutes from './routes/subjects';
import unitRoutes from './routes/units';
import { connectDB } from './db';
import topicRoutes from './routes/topics';
import contentRoutes from './routes/content';
import generateRoutes from './routes/generate';
import classroomRoutes from './routes/classrooms';

// Always load Backend/.env, even when the server is started from another folder.
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/classrooms', classroomRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/units', unitRoutes);
app.use('/api/topics', topicRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/generate', generateRoutes);
app.use('/api/generation', generateRoutes); // alias used by the frontend

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

const start = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
  });
};

start();
