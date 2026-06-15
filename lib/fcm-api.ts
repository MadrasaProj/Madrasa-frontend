import { AuthApiError, postJson } from "@/lib/auth-api";

export async function registerParentFcmToken(
  clientId: string,
  token: string,
  accessToken: string,
  platform = "web",
): Promise<void> {
  const API_ORIGIN = import.meta.env.VITE_API_ORIGIN ?? "http://localhost:3000";
  const API_BASE_PATH = import.meta.env.VITE_API_BASE_PATH ?? "/api/v2";
  const url = `${API_ORIGIN}${API_BASE_PATH}/${clientId}/notifications/parent/fcm-token`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);

  try {
    const response = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ token, platform }),
      signal: controller.signal,
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message =
        typeof payload?.message === "string"
          ? payload.message
          : "Failed to register FCM token";
      throw new AuthApiError(message, {
        code: payload?.errorCode,
        statusCode: payload?.statusCode ?? response.status,
      });
    }
  } finally {
    clearTimeout(timer);
  }
}
