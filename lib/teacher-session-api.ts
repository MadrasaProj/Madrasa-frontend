import { apiFetch } from "@/lib/fetch";

const API_ORIGIN = import.meta.env.VITE_API_ORIGIN ?? "http://localhost:3000";
const V2_BASE    = `${API_ORIGIN}/api/v2`;

export interface TeacherSession {
  id: string;
  teacherId: string;
  clientId: string;
  checkInTime: string;
  checkOutTime: string | null;
  status: "CHECKED_IN" | "CHECKED_OUT";
  location: { lat: number; lng: number; address?: string } | null;
  date: string;
}

export interface TeacherSessionHistory {
  data: TeacherSession[];
  total: number;
  page: number;
  limit: number;
}

export const checkIn = (clientId: string, token: string, location?: { latitude: number; longitude: number; address?: string }) =>
  apiFetch<TeacherSession>(`${V2_BASE}/${clientId}/teacher-session/checkin`, token, {
    method: "POST",
    body: JSON.stringify(location ?? {}),
  });

export const checkOut = (clientId: string, token: string) =>
  apiFetch<TeacherSession>(`${V2_BASE}/${clientId}/teacher-session/checkout`, token, {
    method: "POST",
  });

export const getTodaySession = (clientId: string, token: string) =>
  apiFetch<TeacherSession | null>(`${V2_BASE}/${clientId}/teacher-session/today`, token);

export const getSessionHistory = (clientId: string, token: string, params?: { teacherId?: string; page?: number; limit?: number }) => {
  const q = new URLSearchParams();
  if (params?.teacherId) q.set("teacherId", params.teacherId);
  if (params?.page) q.set("page", String(params.page));
  if (params?.limit) q.set("limit", String(params.limit));
  const qs = q.toString();
  return apiFetch<TeacherSessionHistory>(`${V2_BASE}/${clientId}/teacher-session/history${qs ? `?${qs}` : ""}`, token);
};
