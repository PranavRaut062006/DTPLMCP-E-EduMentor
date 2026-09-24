import { endpoints, NotConnectedError, request, requestMultipart } from "./api";
import type {
  Classroom,
  DashboardStats,
  GenerationRequest,
  Material,
  NotificationItem,
  Role,
  StudentStats,
  SyllabusUnit,
  User,
} from "./types";

/**
 * Service layer. Each function calls the real endpoint when a backend is
 * configured. Without a backend, reads resolve to empty results so the UI shows
 * professional empty states, and writes surface `NotConnectedError` so the UI can
 * tell the user the API is not wired up yet. No mock/demo data is produced here.
 */

async function readList<T>(endpoint: string): Promise<T[]> {
  try {
    return await request<T[]>(endpoint);
  } catch (error) {
    if (error instanceof NotConnectedError) return [];
    throw error;
  }
}

async function readMaybe<T>(endpoint: string): Promise<T | null> {
  try {
    return await request<T>(endpoint);
  } catch (error) {
    if (error instanceof NotConnectedError) return null;
    throw error;
  }
}

export const authService = {
  login: (input: { email: string; password: string; remember: boolean }) =>
    request<{ token: string; user: User }>(endpoints.auth.login, {
      method: "POST",
      body: input,
    }),
  register: (input: {
    fullName: string;
    email: string;
    password: string;
    role: Role;
  }) =>
    request<{ token: string; user: User }>(endpoints.auth.register, {
      method: "POST",
      body: input,
    }),
  session: () => readMaybe<User>(endpoints.auth.session),
  logout: () => request<void>(endpoints.auth.logout, { method: "POST" }),
  forgotPassword: (email: string) =>
    request<void>(endpoints.auth.forgotPassword, { method: "POST", body: { email } }),
};

export const classroomService = {
  list: () => readList<Classroom>(endpoints.classrooms.list),
  detail: (id: string) => readMaybe<Classroom>(endpoints.classrooms.detail(id)),
  create: (input: Partial<Classroom>) =>
    request<Classroom>(endpoints.classrooms.create, { method: "POST", body: input }),
  delete: (id: string) =>
    request<void>(endpoints.classrooms.detail(id), { method: "DELETE" }),
  join: (classCode: string) =>
    request<Classroom>(endpoints.classrooms.join, { method: "POST", body: { classCode } }),
  students: (id: string) => readList<User>(endpoints.classrooms.students(id)),
};

export const syllabusService = {
  get: (classroomId: string) =>
    readMaybe<SyllabusUnit[]>(endpoints.syllabus.detail(classroomId)).then((r) => r ?? []),
  save: (classroomId: string, units: SyllabusUnit[]) =>
    request<SyllabusUnit[]>(endpoints.syllabus.detail(classroomId), {
      method: "PUT",
      body: { units },
    }),
  upload: (classroomId: string, fileName: string) =>
    request<SyllabusUnit[]>(endpoints.syllabus.upload(classroomId), {
      method: "POST",
      body: { fileName },
    }),
  /** Upload an actual PDF File object; returns extracted syllabus units + PPT generation count. */
  uploadPdf: (classroomId: string, file: File) => {
    const form = new FormData();
    form.append("syllabus", file);
    return requestMultipart<{ units: SyllabusUnit[]; generatedCount: number; totalTopics: number }>(
      endpoints.syllabus.upload(classroomId),
      form,
    );
  },
};

export const generationService = {
  start: (input: GenerationRequest) =>
    request<{ success: boolean; generatedCount: number; materials: any[] }>(endpoints.generation.create, { method: "POST", body: input }),
  status: (id: string) => readMaybe<{ progress: number; stage: string }>(endpoints.generation.status(id)),
};

export const materialService = {
  list: (params?: { classroomId?: string }) =>
    readList<Material>(
      params?.classroomId
        ? `${endpoints.materials.list}?classroomId=${params.classroomId}`
        : endpoints.materials.list,
    ),
  detail: (id: string) => readMaybe<Material>(endpoints.materials.detail(id)),
  publish: (id: string) => request<Material>(endpoints.materials.publish(id), { method: "POST" }),
};

export const voiceService = {
  profile: () => readMaybe<{ status: "none" | "processing" | "ready" }>(endpoints.voice.profile),
  uploadSample: (fileName: string) =>
    request<void>(endpoints.voice.sample, { method: "POST", body: { fileName } }),
  remove: () => request<void>(endpoints.voice.profile, { method: "DELETE" }),
};

export const statsService = {
  faculty: () => readMaybe<DashboardStats>(endpoints.stats.faculty),
  student: () => readMaybe<StudentStats>(endpoints.stats.student),
};

export const notificationService = {
  list: () => readList<NotificationItem>(endpoints.notifications.list),
};

export { NotConnectedError } from "./api";
export type * from "./types";
