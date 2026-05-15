const API_ORIGIN =
  import.meta.env.VITE_API_ORIGIN ?? "http://localhost:3000";
const API_BASE_PATH = import.meta.env.VITE_API_BASE_PATH ?? "/api/v2";

const DEFAULT_API_BASE = `${API_ORIGIN}${API_BASE_PATH}`;
const DEFAULT_TIMEOUT_MS = 15_000;

export type LoginMode =
  | "SUPER_ADMIN"
  | "CLIENT_ADMIN"
  | "TEACHER"
  | "PARENT"
  | "COMMITTEE";

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

export async function postJson<T>(
  path: string,
  body: unknown,
  signal?: AbortSignal,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  signal?.addEventListener("abort", () => controller.abort());

  try {
    const response = await fetch(`${DEFAULT_API_BASE}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
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
        statusCode: payload?.statusCode ?? response.status,
      });
    }

    return payload as T;
  } catch (err) {
    if ((err as Error).name === "AbortError") {
      throw new AuthApiError(
        "Request timed out. Please check your connection.",
        {
          statusCode: 408,
        },
      );
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export type StudentInfo = {
  id: string;
  name: string;
  adno: string;
  gender: "MALE" | "FEMALE";
  className: string | null;
  classId: string | null;
};

export type AuthSessionPayload = {
  access_token: string;
  students?: StudentInfo[]; // parent login only
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
      attendanceMode?: string;
    };
    };
};

export async function loginSuperAdmin(
  identifier: string,
  password: string,
  signal?: AbortSignal,
) {
  return postJson<AuthSessionPayload>(
    "/auth/super-admin/login",
    {
      identifier,
      password,
    },
    signal,
  );
}

export async function loginMadrasa(
  identifier: string,
  madrasaSlug: string,
  password: string,
  signal?: AbortSignal,
) {
  return postJson<AuthSessionPayload>(
    "/auth/madrasa/login",
    {
      identifier,
      madrasaSlug,
      password,
    },
    signal,
  );
}

export async function loginTeacher(
  identifier: string,
  password: string,
  madrasaSlug?: string,
  signal?: AbortSignal,
) {
  return postJson<AuthSessionPayload>(
    "/auth/teacher/login",
    {
      identifier,
      password,
      ...(madrasaSlug ? { madrasaSlug } : {}),
    },
    signal,
  );
}

export async function requestParentOtp(
  madrasaSlug: string,
  parentPhone: string,
  signal?: AbortSignal,
) {
  return postJson<{
    challengeId: string;
    expiresInSeconds: number;
    devOtpCode?: string;
  }>(
    "/auth/parent/request-otp",
    {
      madrasaSlug,
      parentPhone,
    },
    signal,
  );
}

export async function loginParent(
  madrasaSlug: string,
  parentPhone: string,
  options: { password?: string; otpCode?: string; challengeId?: string },
  signal?: AbortSignal,
) {
  return postJson<AuthSessionPayload>(
    "/auth/parent/login",
    {
      madrasaSlug,
      parentPhone,
      ...options,
    },
    signal,
  );
}

export async function loginCommittee(
  madrasaSlug: string,
  identifier: string,
  password: string,
  signal?: AbortSignal,
) {
  return postJson<AuthSessionPayload>(
    "/auth/committee/login",
    {
      madrasaSlug,
      identifier,
      password,
    },
    signal,
  );
}
