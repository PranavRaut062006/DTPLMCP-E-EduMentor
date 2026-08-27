export type ContentStatus =
  | "NOT_GENERATED"
  | "DRAFT"
  | "UNDER_REVIEW"
  | "APPROVED"
  | "PUBLISHED";

export type AppRole = "faculty" | "student";

export type LectureContent = {
  title: string;
  learningObjectives: string[];
  introduction: string;
  conceptExplanation: string;
  importantPoints: string[];
  examples: string[];
  applications: string[];
  summary: string;
  importantQuestions: string[];
  syllabusGaps: string;
};

export type Slide = { title: string; points: string[]; notes: string };
export type PptContent = { slides: Slide[] };

export type Subject = {
  id: string;
  faculty_id: string;
  name: string;
  code: string;
  department: string;
  semester: string;
  created_at: string;
};

export type Unit = {
  id: string;
  subject_id: string;
  unit_number: number;
  title: string;
};

export type Topic = {
  id: string;
  unit_id: string;
  title: string;
  subtopics: string[];
  position: number;
  status: ContentStatus;
};

export type ContentRow = {
  id: string;
  topic_id: string;
  lecture_content: LectureContent | null;
  ppt_content: PptContent | null;
  status: ContentStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export const STATUS_LABEL: Record<ContentStatus, string> = {
  NOT_GENERATED: "Not Generated",
  DRAFT: "Draft",
  UNDER_REVIEW: "Under Review",
  APPROVED: "Approved",
  PUBLISHED: "Published",
};
