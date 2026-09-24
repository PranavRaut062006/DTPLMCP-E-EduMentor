/**
 * Single place where the future backend gets wired in.
 *
 * Every service module below goes through `request()`. Point API_BASE_URL at the
 * real API (VITE_API_BASE_URL) and remove the `NotConnectedError` short-circuit
 * to go live — no component changes required.
 */

export const API_BASE_URL: string | undefined = import.meta.env["VITE_API_BASE_URL"];

export class NotConnectedError extends Error {
  constructor(public endpoint: string) {
    super("Backend is not connected yet.");
    this.name = "NotConnectedError";
  }
}

export interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  signal?: AbortSignal;
}

let authToken: string | null = null;
export function setAuthToken(token: string | null) {
  authToken = token;
}

export async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  if (!API_BASE_URL) {
    // No backend configured: callers decide between empty state and error state.
    throw new NotConnectedError(endpoint);
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: options.method ?? "GET",
      headers: {
        "Content-Type": "application/json",
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
      body: options.body ? JSON.stringify(options.body) : null,
      signal: options.signal ?? null,
    });
  } catch {
    throw new Error("Cannot reach the backend. Add MONGODB_URI to Backend/.env, then run npm run dev in Backend.");
  }

  if (!res.ok) {
    const payload = await res.json().catch(() => null) as { error?: string } | null;
    throw new Error(payload?.error ?? `Request failed (${res.status}) for ${endpoint}`);
  }
  return (await res.json()) as T;
}

/**
 * Upload a file via multipart/form-data. Do NOT set Content-Type manually —
 * the browser must set it (with the correct boundary) automatically.
 */
export async function requestMultipart<T>(endpoint: string, formData: FormData): Promise<T> {
  if (!API_BASE_URL) throw new NotConnectedError(endpoint);

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: "POST",
      headers: {
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
      body: formData,
    });
  } catch {
    throw new Error("Cannot reach the backend. Add MONGODB_URI to Backend/.env, then run npm run dev in Backend.");
  }

  if (!res.ok) {
    const payload = await res.json().catch(() => null) as { error?: string } | null;
    throw new Error(payload?.error ?? `Upload failed (${res.status}) for ${endpoint}`);
  }
  return (await res.json()) as T;
}

/** Endpoint map — keeps route strings out of components. */
export const endpoints = {
  auth: {
    login: "/auth/login",
    register: "/auth/register",
    session: "/auth/session",
    logout: "/auth/logout",
    forgotPassword: "/auth/forgot-password",
  },
  classrooms: {
    list: "/classrooms",
    create: "/classrooms",
    detail: (id: string) => `/classrooms/${id}`,
    join: "/classrooms/join",
    students: (id: string) => `/classrooms/${id}/students`,
  },
  syllabus: {
    detail: (classroomId: string) => `/classrooms/${classroomId}/syllabus`,
    upload: (classroomId: string) => `/classrooms/${classroomId}/syllabus/upload`,
  },
  references: { upload: "/references/upload", list: "/references" },
  generation: { create: "/generation", status: (id: string) => `/generation/${id}` },
  materials: {
    list: "/materials",
    detail: (id: string) => `/materials/${id}`,
    publish: (id: string) => `/materials/${id}/publish`,
  },
  voice: { profile: "/voice/profile", sample: "/voice/profile/sample" },
  stats: { faculty: "/stats/faculty", student: "/stats/student" },
  notifications: { list: "/notifications" },
} as const;
