import { AuthApiError } from "@/lib/auth-api";

async function registerFcmToken(
  clientId: string,
  token: string,
  accessToken: string,
  role: "parent" | "teacher",
  platform = "web",
): Promise<void> {
  const API_ORIGIN = import.meta.env.VITE_API_ORIGIN ?? "http://localhost:3000";
  const API_BASE_PATH = import.meta.env.VITE_API_BASE_PATH ?? "/api/v2";
  const url = `${API_ORIGIN}${API_BASE_PATH}/${clientId}/notifications/${role}/fcm-token`;

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

export function registerParentFcmToken(
  clientId: string,
  token: string,
  accessToken: string,
  platform = "web",
): Promise<void> {
  return registerFcmToken(clientId, token, accessToken, "parent", platform);
}

export function registerTeacherFcmToken(
  clientId: string,
  token: string,
  accessToken: string,
  platform = "web",
): Promise<void> {
  return registerFcmToken(clientId, token, accessToken, "teacher", platform);
}

async function unregisterFcmTokenRole(
  clientId: string,
  token: string,
  accessToken: string,
  role: "parent" | "teacher",
): Promise<void> {
  const API_ORIGIN = import.meta.env.VITE_API_ORIGIN ?? "http://localhost:3000";
  const API_BASE_PATH = import.meta.env.VITE_API_BASE_PATH ?? "/api/v2";
  const url = `${API_ORIGIN}${API_BASE_PATH}/${clientId}/notifications/${role}/fcm-token`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);

  try {
    await fetch(url, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ token }),
      signal: controller.signal,
    }).catch(() => undefined);
  } finally {
    clearTimeout(timer);
  }
}

export function unregisterParentFcmToken(
  clientId: string,
  token: string,
  accessToken: string,
): Promise<void> {
  return unregisterFcmTokenRole(clientId, token, accessToken, "parent");
}

export function unregisterTeacherFcmToken(
  clientId: string,
  token: string,
  accessToken: string,
): Promise<void> {
  return unregisterFcmTokenRole(clientId, token, accessToken, "teacher");
}

/**
 * Device-level unregister that does not require an active JWT.
 * Ensures the token is deleted from backend even if the user session has expired or technically logged out.
 */
export async function unregisterDeviceFcmToken(
  clientId: string,
  token: string,
): Promise<void> {
  const API_ORIGIN = import.meta.env.VITE_API_ORIGIN ?? "http://localhost:3000";
  const API_BASE_PATH = import.meta.env.VITE_API_BASE_PATH ?? "/api/v2";
  const url = `${API_ORIGIN}${API_BASE_PATH}/${clientId}/notifications/fcm-token/unregister`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);

  try {
    await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token }),
      signal: controller.signal,
    }).catch(() => undefined);
  } finally {
    clearTimeout(timer);
  }
}
