import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type UserRole = "admin" | "teacher" | "parent" | "committee";
export type AuthActorType =
  | "SUPER_ADMIN"
  | "CLIENT_ADMIN"
  | "TEACHER"
  | "PARENT";

interface User {
  id: string;
  name: string;
  role: UserRole;
  actorType: AuthActorType;
  tenantSlug?: string;
  clientId?: string;
  defaultAcademicYearId?: string | null;
  parentPhone?: string;
  accessibleStudentIds?: string[];
}

interface AuthStore {
  user: User | null;
  accessToken: string | null;
  isLoggedIn: boolean;
  hasHydrated: boolean;
  login: (session: { user: User; accessToken: string }) => void;
  logout: () => void;
  markHydrated: () => void;
}

export type AuthSessionPayload = {
  access_token: string;
  user: {
    sub: string;
    name: string;
    role: AuthActorType | string;
    actorType?: AuthActorType | string;
    client?: {
      slug?: string;
      subdomain?: string;
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
};

export function normalizeUserSession(payload: AuthSessionPayload) {
  const rawActorType = payload.user.actorType ?? payload.user.role;
  const actorType: AuthActorType =
    rawActorType === "SUPER_ADMIN" ||
    rawActorType === "CLIENT_ADMIN" ||
    rawActorType === "TEACHER" ||
    rawActorType === "PARENT"
      ? rawActorType
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
    },
  };
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isLoggedIn: false,
      hasHydrated: false,
      login: ({ user, accessToken }) =>
        set({
          user,
          accessToken,
          isLoggedIn: true,
        }),
      logout: () => set({ user: null, accessToken: null, isLoggedIn: false }),
      markHydrated: () => set({ hasHydrated: true }),
    }),
    {
      name: "madrasa-auth-session",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        isLoggedIn: state.isLoggedIn,
      }),
      onRehydrateStorage: () => (state) => {
        state?.markHydrated();
      },
    },
  ),
);

// Demo credentials
export const demoCredentials = [
  {
    role: "admin" as UserRole,
    email: "admin@madrasa.com",
    password: "admin123",
    name: "Admin – Darul Huda",
    id: "ADMIN001",
  },
  {
    role: "teacher" as UserRole,
    email: "kareem@madrasa.com",
    password: "teacher123",
    name: "Usthad Abdul Kareem",
    id: "T001",
  },
  {
    role: "parent" as UserRole,
    email: "abdullah@email.com",
    password: "parent123",
    name: "Abdullah Rahman",
    id: "P001",
  },
  {
    role: "committee" as UserRole,
    email: "committee@madrasa.com",
    password: "committee123",
    name: "Hajiyar Abdul Latheef",
    id: "CMT001",
  },
];
