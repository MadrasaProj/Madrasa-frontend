const API_ORIGIN =
  process.env.NEXT_PUBLIC_API_ORIGIN ?? "http://localhost:8000";
const API_BASE_PATH = process.env.NEXT_PUBLIC_API_BASE_PATH ?? "/api/v2";

const DEFAULT_API_BASE = `${API_ORIGIN}${API_BASE_PATH}`;

export type LoginMode = "SUPER_ADMIN" | "CLIENT_ADMIN" | "TEACHER" | "PARENT";

export class AuthApiError extends Error {
  code?: string;
  statusCode?: number;

  constructor(
    message: string,
    options?: { code?: string; statusCode?: number },
  ) {
    super(message);
    this.name = "AuthApiError";
    this.code = options?.code;
    this.statusCode = options?.statusCode;
  }
}

export async function postJson<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${DEFAULT_API_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      typeof payload?.message === "string"
        ? payload.message
        : Array.isArray(payload?.message)
          ? payload.message.join(", ")
          : payload?.error || "Request failed";
    throw new AuthApiError(message, {
      code: payload?.errorCode,
      statusCode: payload?.statusCode,
    });
  }

  return payload as T;
}

export type AuthSessionPayload = {
  access_token: string;
  user: {
    sub: string;
    name: string;
    role: string;
    actorType?: string;
    clientId?: string;
    defaultAcademicYearId?: string | null;
    parentPhone?: string;
    accessibleStudentIds?: string[];
    client?: {
      id?: string;
      slug?: string;
      subdomain?: string;
    };
  };
};

export async function loginSuperAdmin(identifier: string, password: string) {
  return postJson<AuthSessionPayload>("/auth/super-admin/login", {
    identifier,
    password,
  });
}

export async function loginMadrasa(
  identifier: string,
  madrasaSlug: string,
  password: string,
) {
  return postJson<AuthSessionPayload>("/auth/madrasa/login", {
    identifier,
    madrasaSlug,
    password,
  });
}

export async function loginTeacher(
  identifier: string,
  password: string,
  madrasaSlug?: string,
) {
  return postJson<AuthSessionPayload>("/auth/teacher/login", {
    identifier,
    password,
    ...(madrasaSlug ? { madrasaSlug } : {}),
  });
}

export async function requestParentOtp(
  madrasaSlug: string,
  parentPhone: string,
) {
  return postJson<{
    challengeId: string;
    expiresInSeconds: number;
    devOtpCode?: string;
  }>("/auth/parent/request-otp", {
    madrasaSlug,
    parentPhone,
  });
}

export async function loginParent(
  madrasaSlug: string,
  parentPhone: string,
  options: { password?: string; otpCode?: string; challengeId?: string },
) {
  return postJson<AuthSessionPayload>("/auth/parent/login", {
    madrasaSlug,
    parentPhone,
    ...options,
  });
}
