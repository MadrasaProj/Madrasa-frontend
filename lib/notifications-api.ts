const API_ORIGIN = import.meta.env.VITE_API_ORIGIN ?? "http://localhost:3000";
const API_BASE   = `${API_ORIGIN}${import.meta.env.VITE_API_BASE_PATH ?? "/api/v2"}`;
const TIMEOUT    = 15_000;

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

export const getNotifications = (
  clientId: string, token: string,
  params?: { skip?: number; take?: number },
) => {
  const q = new URLSearchParams();
  if (params?.skip) q.set("skip", String(params.skip));
  if (params?.take) q.set("take", String(params.take));
  const qs = q.toString();
  return apiFetch<NotificationsResponse>(`/${clientId}/notifications${qs ? `?${qs}` : ""}`, token);
};

export const getSentNotifications = (
  clientId: string, token: string,
  params?: { skip?: number; take?: number },
) => {
  const q = new URLSearchParams();
  if (params?.skip) q.set("skip", String(params.skip));
  if (params?.take) q.set("take", String(params.take));
  const qs = q.toString();
  return apiFetch<NotificationsResponse>(`/${clientId}/notifications/sent${qs ? `?${qs}` : ""}`, token);
};

export const getUnreadCount = (clientId: string, token: string) =>
  apiFetch<{ count: number }>(`/${clientId}/notifications/unread-count`, token);

export const createNotification = (
  clientId: string, token: string,
  data: { title: string; body: string; type: NotificationType; targetRoles: string[]; targetClassIds?: string[] },
) =>
  apiFetch<NotificationRecord>(`/${clientId}/notifications`, token, {
    method: "POST",
    body: JSON.stringify(data),
  });

export const markNotificationRead = (clientId: string, token: string, id: string) =>
  apiFetch<{ message: string }>(`/${clientId}/notifications/${id}/read`, token, { method: "POST" });

export const deleteNotification = (clientId: string, token: string, id: string) =>
  apiFetch<{ message: string }>(`/${clientId}/notifications/${id}`, token, { method: "DELETE" });
