import { apiFetch } from "@/lib/fetch";

const API_ORIGIN = import.meta.env.VITE_API_ORIGIN ?? "http://localhost:3000";
const API_BASE   = `${API_ORIGIN}${import.meta.env.VITE_API_BASE_PATH ?? "/api/v2"}`;

export type NotificationType =
  | "ANNOUNCEMENT" | "ATTENDANCE_ALERT" | "FEE_REMINDER"
  | "HOMEWORK_REMINDER" | "EXAM_NOTICE" | "GENERAL";

export interface NotificationRecord {
  id: string;
  title: string;
  body: string;
  type: NotificationType;
  targetRoles: string[];
  targetClassIds: string[];
  createdAt: string;
  isRead: boolean;
  readAt: string | null;
  creator?: { id: string; name: string };
  _count?: { reads: number };
}

export interface NotificationsResponse {
  total: number;
  notifications: NotificationRecord[];
}

export const getNotifications = (
  clientId: string, token: string,
  params?: { skip?: number; take?: number },
) => {
  const q = new URLSearchParams();
  if (params?.skip) q.set("skip", String(params.skip));
  if (params?.take) q.set("take", String(params.take));
  const qs = q.toString();
  return apiFetch<NotificationsResponse>(`${API_BASE}/${clientId}/notifications${qs ? `?${qs}` : ""}`, token);
};

export const getSentNotifications = (
  clientId: string, token: string,
  params?: { skip?: number; take?: number },
) => {
  const q = new URLSearchParams();
  if (params?.skip) q.set("skip", String(params.skip));
  if (params?.take) q.set("take", String(params.take));
  const qs = q.toString();
  return apiFetch<NotificationsResponse>(`${API_BASE}/${clientId}/notifications/sent${qs ? `?${qs}` : ""}`, token);
};

export const getUnreadCount = (clientId: string, token: string) =>
  apiFetch<{ count: number }>(`${API_BASE}/${clientId}/notifications/unread-count`, token);

export interface DiaryEventNotification {
  id: string;
  title: string;
  body: string;
  type: NotificationType;
  eventDate: string;
  targetClassIds: string[];
  createdAt: string;
}

export const createNotification = (
  clientId: string, token: string,
  data: {
    title: string;
    body: string;
    type: NotificationType;
    targetRoles: string[];
    targetClassIds?: string[];
    eventDate?: string;
  },
) =>
  apiFetch<NotificationRecord>(`${API_BASE}/${clientId}/notifications`, token, {
    method: "POST",
    body: JSON.stringify(data),
  });

export const getDiaryEvents = (
  clientId: string,
  token: string,
  params: { from: string; to: string; classId?: string },
) => {
  const q = new URLSearchParams({ from: params.from, to: params.to });
  if (params.classId) q.set("classId", params.classId);
  return apiFetch<DiaryEventNotification[]>(
    `${API_BASE}/${clientId}/notifications/diary-events?${q}`,
    token,
  );
};

export const markNotificationRead = (clientId: string, token: string, id: string) =>
  apiFetch<{ message: string }>(`${API_BASE}/${clientId}/notifications/${id}/read`, token, { method: "POST" });

export const deleteNotification = (clientId: string, token: string, id: string) =>
  apiFetch<{ message: string }>(`${API_BASE}/${clientId}/notifications/${id}`, token, { method: "DELETE" });
