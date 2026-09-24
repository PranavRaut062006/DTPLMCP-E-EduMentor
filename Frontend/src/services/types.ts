/**
 * Shared domain types for the TeachAI frontend.
 * These mirror the payloads the future backend is expected to return.
 */

export type Role = "faculty" | "student";

export interface User {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  avatarUrl?: string | null;
  department?: string | null;
}

export interface Classroom {
  id: string;
  name: string;
  subject: string;
  description?: string;
  academicYear?: string;
  department?: string;
  classCode: string;
  studentCount: number;
  materialCount: number;
  facultyName?: string;
  updatedAt: string;
}

export interface SyllabusTopic {
  id: string;
  title: string;
}

export interface SyllabusUnit {
  id: string;
  title: string;
  topics: SyllabusTopic[];
}

export type ReferenceKind = "file" | "book" | "website" | "youtube";

export interface ReferenceItem {
  id: string;
  kind: ReferenceKind;
  label: string;
  detail?: string;
}

export type ContentKind =
  | "teaching-plan"
  | "ppt"
  | "notes"
  | "pdf"
  | "script"
  | "video";

export interface GenerationRequest {
  classroomId: string;
  topicIds: string[];
  durationMinutes: number;
  references: ReferenceItem[];
  outputs: ContentKind[];
}

export interface Material {
  id: string;
  classroomId: string;
  title: string;
  kind: ContentKind;
  status: "draft" | "published";
  durationMinutes?: number;
  updatedAt: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  body?: string;
  createdAt: string;
  read: boolean;
}

export interface DashboardStats {
  classrooms: number;
  publishedMaterials: number;
  students: number;
  generatedContent: number;
}

export interface StudentStats {
  enrolledClasses: number;
  availableMaterials: number;
  completedTopics: number;
  totalTopics: number;
}
