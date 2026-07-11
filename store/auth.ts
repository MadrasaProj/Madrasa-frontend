import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { StudentInfo } from "@/lib/auth-api";
import { getProfile, getParentStudents } from "@/lib/auth-api";

export type UserRole = "admin" | "teacher" | "parent" | "committee";
export type AuthActorType =
  | "SUPER_ADMIN"
  | "CLIENT_ADMIN"
  | "TEACHER"
  | "PARENT"
  | "COMMITTEE"
  | "TEAM_LEADER"
  | "SALES_EXECUTIVE"
  | "SALES_MANAGER"
  | "IMPLEMENTATION_SPECIALIST"
  | "SUPPORT_EXECUTIVE"
  | "CUSTOMER_SUCCESS_MANAGER"
  | "MARKETING_MANAGER"
  | "TECHNICAL_MANAGER"
  | "FINANCE_EXECUTIVE";

export type AttendanceMode = "CLASS_BASED" | "PERIOD_BASED";

export type { StudentInfo };

interface User {
  id: string;
  name: string;
  role: UserRole;
  actorType: AuthActorType;
  tenantSlug?: string;
  clientId?: string;
  defaultAcademicYearId?: string | null;
  parentPhone?: string;
  email?: string;
  phone?: string;
  photo?: string | null;
  photoUrl?: string | null;
  address?: string;
  msrId?: string;
  accessibleStudentIds?: string[];
  accessibleStudents?: StudentInfo[];
  attendanceMode?: AttendanceMode;
  madrasaName?: string;
  madrasaLogo?: string | null;
}

interface AuthStore {
  user: User | null;
  accessToken: string | null;
  isLoggedIn: boolean;
  hasHydrated: boolean;
  activeClientId: string | null;
  activeTenantSlug: string | null;
  activeStudentId: string | null;
  login: (session: { user: User; accessToken: string }) => void;
  logout: () => void;
  markHydrated: () => void;
  switchToClient: (clientId: string | null, slug?: string | null) => void;
  setActiveStudent: (studentId: string) => void;
  setAttendanceMode: (mode: AttendanceMode) => void;
  updateUser: (fields: Partial<User>) => void;
  setAccessibleStudents: (students: StudentInfo[]) => void;
  bootstrap: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshParentStudents: () => Promise<void>;
}

export type AuthSessionPayload = {
  access_token: string;
  students?: StudentInfo[];
  user: {
    sub: string;
    name: string;
    role: AuthActorType | string;
    actorType?: AuthActorType | string;
    client?: {
      name?: string;
      logo?: string | null;
      slug?: string;
      subdomain?: string;
      attendanceMode?: AttendanceMode;
    };
    clientId?: string;
    defaultAcademicYearId?: string | null;
    parentPhone?: string;
    accessibleStudentIds?: string[];
    photo?: string | null;
    photoUrl?: string | null;
  };
};

const routeRoleByActor: Record<AuthActorType, UserRole> = {
  SUPER_ADMIN: "admin",
  CLIENT_ADMIN: "admin",
  TEACHER: "teacher",
  PARENT: "parent",
  COMMITTEE: "committee",
  TEAM_LEADER: "teacher",
  SALES_EXECUTIVE: "admin",
  SALES_MANAGER: "admin",
  MARKETING_MANAGER: "admin",
  TECHNICAL_MANAGER: "admin",
  IMPLEMENTATION_SPECIALIST: "admin",
  SUPPORT_EXECUTIVE: "admin",
  CUSTOMER_SUCCESS_MANAGER: "admin",
  FINANCE_EXECUTIVE: "admin",
};

const validActorTypes: AuthActorType[] = [
  "SUPER_ADMIN",
  "CLIENT_ADMIN",
  "TEACHER",
  "PARENT",
  "COMMITTEE",
  "TEAM_LEADER",
  "SALES_EXECUTIVE",
  "SALES_MANAGER",
  "MARKETING_MANAGER",
  "TECHNICAL_MANAGER",
  "IMPLEMENTATION_SPECIALIST",
  "SUPPORT_EXECUTIVE",
  "CUSTOMER_SUCCESS_MANAGER",
  "FINANCE_EXECUTIVE",
];

type JwtPayload = AuthSessionPayload["user"];

function decodeJwt(token: string): JwtPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const json =
      typeof atob === "function"
        ? atob(b64)
        : Buffer.from(b64, "base64").toString("binary");
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}

type ProfilePhoto = { photo: string | null; photoUrl: string | null };

function buildUser(
  payload: JwtPayload,
  photo: ProfilePhoto,
  students: StudentInfo[] = [],
): User {
  const rawActorType = payload.actorType ?? payload.role;
  const actorType: AuthActorType = validActorTypes.includes(
    rawActorType as AuthActorType,
  )
    ? (rawActorType as AuthActorType)
    : "CLIENT_ADMIN";

  return {
    id: payload.sub,
    name: payload.name,
    role: routeRoleByActor[actorType],
    actorType,
    tenantSlug: payload.client?.slug ?? payload.client?.subdomain,
    clientId: payload.clientId,
    defaultAcademicYearId: payload.defaultAcademicYearId ?? null,
    parentPhone: payload.parentPhone,
    photo: photo.photo,
    photoUrl: photo.photoUrl,
    accessibleStudentIds: students.length
      ? students.map((s) => s.id)
      : (payload.accessibleStudentIds ?? []),
    accessibleStudents: students,
    attendanceMode:
      (payload.client?.attendanceMode as AttendanceMode) ?? "CLASS_BASED",
    madrasaName: payload.client?.name,
    madrasaLogo: payload.client?.logo ?? null,
  };
}

export function normalizeUserSession(payload: AuthSessionPayload) {
  const user = buildUser(
    payload.user,
    {
      photo: payload.user.photo ?? null,
      photoUrl: payload.user.photoUrl ?? null,
    },
    payload.students ?? [],
  );
  return { accessToken: payload.access_token, user };
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isLoggedIn: false,
      hasHydrated: false,
      activeClientId: null,
      activeTenantSlug: null,
      activeStudentId: null,

      login: ({ user, accessToken }) =>
        set({
          user,
          accessToken,
          isLoggedIn: true,
          activeClientId:
            user.actorType === "SUPER_ADMIN" ? null : (user.clientId ?? null),
          activeTenantSlug:
            user.actorType === "SUPER_ADMIN"
              ? null
              : (user.tenantSlug ?? null),
          activeStudentId:
            user.actorType === "PARENT" && user.accessibleStudentIds?.length
              ? user.accessibleStudentIds[0]
              : null,
        }),

      logout: () =>
        set({
          user: null,
          accessToken: null,
          isLoggedIn: false,
          activeClientId: null,
          activeTenantSlug: null,
          activeStudentId: null,
        }),

      markHydrated: () => set({ hasHydrated: true }),

      switchToClient: (clientId, slug) =>
        set((state) => ({
          activeClientId: clientId,
          activeTenantSlug: slug !== undefined ? slug : state.activeTenantSlug,
          activeStudentId: null,
        })),

      setActiveStudent: (studentId) => set({ activeStudentId: studentId }),

      setAttendanceMode: (mode) =>
        set((state) => ({
          user: state.user ? { ...state.user, attendanceMode: mode } : null,
        })),

      updateUser: (fields) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...fields } : null,
        })),

      bootstrap: async () => {
        const { accessToken } = get();
        if (!accessToken) return;
        const token = accessToken;

        const payload = decodeJwt(token);
        if (!payload) {
          get().logout();
          return;
        }

        let profile: ProfilePhoto;
        try {
          const res = await getProfile(token);
          profile = { photo: res.photo, photoUrl: res.photoUrl };
        } catch {
          get().logout();
          return;
        }

        const rawActorType = payload.actorType ?? payload.role;
        const actorType: AuthActorType = validActorTypes.includes(
          rawActorType as AuthActorType,
        )
          ? (rawActorType as AuthActorType)
          : "CLIENT_ADMIN";

        let students: StudentInfo[] = [];
        if (actorType === "PARENT") {
          try {
            const res = await getParentStudents(token);
            students = res.data;
          } catch {
            // Tolerate failure — `accessibleStudentIds` from JWT still works
          }
        }

        if (get().accessToken !== token) return;

        const user = buildUser(payload, profile, students);
        set({
          user,
          isLoggedIn: true,
          activeClientId:
            user.actorType === "SUPER_ADMIN" ? null : (user.clientId ?? null),
          activeTenantSlug:
            user.actorType === "SUPER_ADMIN"
              ? null
              : (user.tenantSlug ?? null),
          activeStudentId:
            user.actorType === "PARENT" && students.length
              ? students[0].id
              : null,
        });
      },

      refreshProfile: async () => {
        const { accessToken, user } = get();
        if (!accessToken || !user) return;
        try {
          const profile = await getProfile(accessToken);
          set((state) => ({
            user: state.user
              ? {
                  ...state.user,
                  name: profile.name,
                  photo: profile.photo,
                  photoUrl: profile.photoUrl,
                }
              : state.user,
          }));
        } catch {
          // Silently fail — non-critical
        }
      },

      setAccessibleStudents: (students) =>
        set((state) => ({
          user: state.user ? { ...state.user, accessibleStudents: students } : null,
        })),

      refreshParentStudents: async () => {
        const { accessToken, user } = get();
        if (!accessToken || !user || user.actorType !== "PARENT") return;
        try {
          const { data } = await getParentStudents(accessToken);
          set((state) => ({
            user: state.user
              ? {
                  ...state.user,
                  accessibleStudents: data,
                  accessibleStudentIds: data.map((s) => s.id),
                }
              : null,
          }));
        } catch {
          // Silently fail
        }
      },
    }),
    {
      name: "madrasa-auth-session",
      version: 4,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        accessToken: state.accessToken,
      }),
      migrate: (persisted: unknown, fromVersion: number) => {
        if (fromVersion < 4) {
          const prev = persisted as any;
          return { accessToken: prev?.accessToken ?? null };
        }
        return persisted as any;
      },
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        if (state.accessToken) {
          state.bootstrap().finally(() => state.markHydrated());
        } else {
          state.markHydrated();
        }
      },
    },
  ),
);
