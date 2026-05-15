const API_ORIGIN =
  import.meta.env.VITE_API_ORIGIN ?? "http://localhost:3000";
const API_BASE = `${API_ORIGIN}${import.meta.env.VITE_API_BASE_PATH ?? "/api/v2"}`;
const TIMEOUT  = 15_000;

export type HomeworkStatus = "NOT_SUBMITTED" | "SUBMITTED" | "CHECKED";

export interface HomeworkAssignment {
  id: string;
  title: string;
  description: string | null;
  dueDate: string;
  status: "ACTIVE" | "INACTIVE";
  createdAt: string;
  classId: string;
  subjectId: string | null;
  teacherId: string;
  academicYearId: string | null;
  class: { id: string; name: string } | null;
  subject: { id: string; name: string } | null;
  _count?: { submissions: number };
}

export interface HomeworkSubmission {
  id: string;
  status: HomeworkStatus;
  submittedAt: string | null;
  teacherNote: string | null;
  homeworkId?: string;
  student?: { id: string; name: string; adno: string };
}

export interface StudentHomeworkItem extends HomeworkAssignment {
  submission: {
    status: HomeworkStatus;
    submittedAt: string | null;
    teacherNote: string | null;
  };
}

export interface StudentHomeworkResponse {
  student: { id: string; name: string; adno: string; classId: string | null };
  homework: StudentHomeworkItem[];
}

export interface SubmissionsResponse {
  homework: { id: string; title: string; dueDate: string; class: { name: string } | null };
  submissions: HomeworkSubmission[];
}

async function apiFetch<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT);
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(init?.headers ?? {}),
      },
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg =
        typeof payload?.message === "string" ? payload.message :
        Array.isArray(payload?.message) ? payload.message.join(", ") :
        payload?.error ?? "Request failed";
      throw new Error(msg);
    }
    return payload as T;
  } catch (err) {
    if ((err as Error).name === "AbortError") throw new Error("Request timed out");
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export const listHomework = (
  clientId: string, token: string,
  params?: { classId?: string; studentId?: string; from?: string; to?: string; academicYearId?: string },
) => {
  const q = new URLSearchParams();
  if (params) Object.entries(params).forEach(([k, v]) => { if (v) q.set(k, v); });
  const qs = q.toString();
  return apiFetch<HomeworkAssignment[]>(`/${clientId}/homework${qs ? `?${qs}` : ""}`, token);
};

export const createHomework = (
  clientId: string, token: string,
  data: { classId: string; subjectId?: string; title: string; description?: string; dueDate: string; academicYearId?: string },
) =>
  apiFetch<HomeworkAssignment>(`/${clientId}/homework`, token, { method: "POST", body: JSON.stringify(data) });

export const updateHomework = (
  clientId: string, token: string, id: string,
  data: { title?: string; description?: string; dueDate?: string; subjectId?: string },
) =>
  apiFetch<HomeworkAssignment>(`/${clientId}/homework/${id}`, token, { method: "PATCH", body: JSON.stringify(data) });

export const deleteHomework = (clientId: string, token: string, id: string) =>
  apiFetch<{ message: string }>(`/${clientId}/homework/${id}`, token, { method: "DELETE" });

export const getSubmissions = (clientId: string, token: string, homeworkId: string) =>
  apiFetch<SubmissionsResponse>(`/${clientId}/homework/${homeworkId}/submissions`, token);

export const bulkUpdateSubmissions = (
  clientId: string, token: string, homeworkId: string,
  submissions: { studentId: string; status: HomeworkStatus; teacherNote?: string }[],
) =>
  apiFetch<{ updated: number }>(
    `/${clientId}/homework/${homeworkId}/submissions`, token,
    { method: "PATCH", body: JSON.stringify({ submissions }) },
  );

export const getStudentHomework = (clientId: string, token: string, studentId: string) =>
  apiFetch<StudentHomeworkResponse>(`/${clientId}/homework/student/${studentId}`, token);
