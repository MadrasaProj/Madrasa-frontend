import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { StudentInfo } from "@/lib/auth-api";

export type UserRole = "admin" | "teacher" | "parent" | "committee";
export type AuthActorType =
  | "SUPER_ADMIN"
  | "CLIENT_ADMIN"
  | "TEACHER"
  | "PARENT"
  | "COMMITTEE"
  | "TEAM_LEADER";

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
  profilePic?: string | null;
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
  };
};

const routeRoleByActor: Record<AuthActorType, UserRole> = {
  SUPER_ADMIN: "admin",
  CLIENT_ADMIN: "admin",
  TEACHER: "teacher",
  PARENT: "parent",
  COMMITTEE: "committee",
  TEAM_LEADER: "teacher",
};

const validActorTypes: AuthActorType[] = [
  "SUPER_ADMIN",
  "CLIENT_ADMIN",
  "TEACHER",
  "PARENT",
  "COMMITTEE",
  "TEAM_LEADER",
];

export function normalizeUserSession(payload: AuthSessionPayload) {
  const rawActorType = payload.user.actorType ?? payload.user.role;
  const actorType: AuthActorType = validActorTypes.includes(
    rawActorType as AuthActorType
  )
    ? (rawActorType as AuthActorType)
    : "CLIENT_ADMIN";

  return {
    accessToken: payload.access_token,
    user: {
      id: payload.user.sub,
      name: payload.user.name,
      role: routeRoleByActor[actorType],
      actorType,
      tenantSlug: payload.user.client?.slug ?? payload.user.client?.subdomain,
      clientId: payload.user.clientId,
      defaultAcademicYearId: payload.user.defaultAcademicYearId ?? null,
      parentPhone: payload.user.parentPhone,
      accessibleStudentIds: payload.user.accessibleStudentIds ?? [],
      accessibleStudents: payload.students ?? [],
      attendanceMode: (payload.user.client?.attendanceMode as AttendanceMode) ?? "CLASS_BASED",
      madrasaName: payload.user.client?.name,
      madrasaLogo: payload.user.client?.logo ?? null,
    } satisfies User,
  };
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
          activeClientId: user.actorType === "SUPER_ADMIN" ? null : (user.clientId ?? null),
          activeTenantSlug: user.actorType === "SUPER_ADMIN" ? null : (user.tenantSlug ?? null),
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
    }),
    {
      name: "madrasa-auth-session",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        isLoggedIn: state.isLoggedIn,
        activeClientId: state.activeClientId,
        activeTenantSlug: state.activeTenantSlug,
        activeStudentId: state.activeStudentId,
      }),
      onRehydrateStorage: () => (state) => {
        state?.markHydrated();
      },
    },
  ),
);
