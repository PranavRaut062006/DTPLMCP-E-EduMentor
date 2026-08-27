import fs from 'fs';
import path from 'path';

const DB_PATH = path.join(__dirname, '../data/db.json');

export interface User {
  id: string;
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
  topic_id: string;
  lecture_content: any; // e.g. lecture scripts, markdown
  ppt_content: any;     // structured ppt data
  status: 'DRAFT' | 'PUBLISHED';
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Database {
  users: User[];
  subjects: Subject[];
  units: Unit[];
  topics: Topic[];
  content: Content[];
}

const defaultDb: Database = {
  users: [],
  subjects: [],
  units: [],
  topics: [],
  content: []
};

export const readDB = (): Database => {
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify(defaultDb, null, 2), 'utf-8');
    return defaultDb;
  }
  try {
    const data = fs.readFileSync(DB_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading db.json:', err);
    return defaultDb;
  }
};

export const writeDB = (db: Database): void => {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
};
