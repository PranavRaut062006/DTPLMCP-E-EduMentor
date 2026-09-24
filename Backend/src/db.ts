import { MongoClient, Db } from 'mongodb';

let client: MongoClient | null = null;
let dbInstance: Db | null = null;

export const connectDB = async (): Promise<void> => {
  // Read this at startup, after dotenv.config() has loaded Backend/.env.
  const mongodbUri = process.env.MONGODB_URI;
  if (!mongodbUri) {
    console.error('MONGODB_URI is not defined in .env! (Please paste it there)');
    process.exit(1);
  }
  try {
    client = new MongoClient(mongodbUri);
    await client.connect();
    dbInstance = client.db(process.env.MONGODB_DB || undefined);
    await Promise.all([
      dbInstance.collection<User>('users').createIndex({ id: 1 }, { unique: true }),
      dbInstance.collection<User>('users').createIndex({ email: 1 }, { unique: true }),
      dbInstance.collection<Subject>('subjects').createIndex({ id: 1 }, { unique: true }),
      dbInstance.collection<Unit>('units').createIndex({ id: 1 }, { unique: true }),
      dbInstance.collection<Unit>('units').createIndex({ subject_id: 1, unit_number: 1 }),
      dbInstance.collection<Topic>('topics').createIndex({ id: 1 }, { unique: true }),
      dbInstance.collection<Topic>('topics').createIndex({ unit_id: 1, position: 1 }),
      dbInstance.collection<Content>('content').createIndex({ id: 1 }, { unique: true }),
      dbInstance.collection<Content>('content').createIndex({ topic_id: 1 }, { unique: true }),
    ]);
    console.log('Connected to MongoDB successfully');
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    process.exit(1);
  }
};

export const getDB = (): Db => {
  if (!dbInstance) {
    throw new Error('Database not connected. Call connectDB first.');
  }
  return dbInstance;
};

// Keep interfaces for type safety in other files
export interface User {
  id: string; // we'll use string 'id' for compatibility instead of ObjectId '_id'
  name: string;
  email: string;
  password?: string;
  role: 'faculty' | 'student';
}

export interface Subject {
  id: string;
  faculty_id: string;
  name: string;
  code: string;
  department: string;
  semester: string;
  created_at: string;
}

export interface Unit {
  id: string;
  subject_id: string;
  unit_number: number;
  title: string;
  created_at: string;
}

export interface Topic {
  id: string;
  unit_id: string;
  title: string;
  subtopics: string[];
  position: number;
  status: 'NOT_GENERATED' | 'DRAFT' | 'APPROVED' | 'PUBLISHED';
  created_at: string;
}

export interface Content {
  id: string;
  subject_id?: string;
  topic_id: string;
  lecture_content: any; // e.g. lecture scripts, markdown
  ppt_content: any;     // structured ppt data
  status: 'DRAFT' | 'PUBLISHED';
  created_by: string;
  created_at: string;
  updated_at: string;
}
