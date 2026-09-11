import { create } from "zustand";
import type { StudentInfo } from "@/lib/auth-api";
import { getProfile, getParentStudents } from "@/lib/auth-api";
import { saveTenantSlug } from "@/lib/slug-storage";

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
  // multi-session support
  sessions: Partial<Record<UserRole, User>>;
  login: (session: { user: User; accessToken: string }) => void;
  logout: (role?: UserRole) => void;
  logoutAll: () => void;
  markHydrated: () => void;
  switchToClient: (clientId: string | null, slug?: string | null) => void;
  setActiveStudent: (studentId: string) => void;
  setAttendanceMode: (mode: AttendanceMode) => void;
  updateUser: (fields: Partial<User>) => void;
  setAccessibleStudents: (students: StudentInfo[]) => void;
  bootstrap: () => Promise<void>;
  bootstrapRole: (role: UserRole, token: string) => Promise<User | null>;
  syncActiveForPath: (pathname: string) => Promise<void>;
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

// ── Storage helpers ──────────────────────────────────────────────────────────
export const STORAGE_PREFIX = "madrasa-auth-session";
export const LEGACY_KEY = "madrasa-auth-session";
export const ALL_ROLES: UserRole[] = ["admin", "teacher", "parent", "committee"];

export function storageKeyForRole(role: UserRole): string {
  return `${STORAGE_PREFIX}-${role}`;
}

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

function extractToken(raw: string | null): string | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.state?.accessToken) return parsed.state.accessToken as string;
    if (parsed?.accessToken) return parsed.accessToken as string;
    if (typeof parsed === "string") return parsed;
    return null;
  } catch {
    // raw is plain token
    return raw;
  }
}

function persistTokenForRole(role: UserRole, token: string) {
  if (typeof window === "undefined" || !window.localStorage) return;
  localStorage.setItem(
    storageKeyForRole(role),
    JSON.stringify({ state: { accessToken: token }, version: 4 }),
  );
}

function removeTokenForRole(role: UserRole) {
  if (typeof window === "undefined" || !window.localStorage) return;
  localStorage.removeItem(storageKeyForRole(role));
}

function getAllStoredTokens(): Record<UserRole, string> {
  const out: Record<string, string> = {};
  if (typeof window === "undefined" || !window.localStorage) return out as Record<UserRole, string>;
  for (const role of ALL_ROLES) {
    const raw = localStorage.getItem(storageKeyForRole(role));
    const token = extractToken(raw);
    if (token) out[role] = token;
  }
  return out as Record<UserRole, string>;
}

export function migrateLegacySync(): boolean {
  if (typeof window === "undefined" || !window.localStorage) return false;
  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    if (!raw) return false;
    // Ensure this is legacy single key, not already migrated (we check if any per-role key exists with same token? simply try extract)
    // If raw is JSON that itself came from a per-role key read incorrectly, it would still be legacy
    const token = extractToken(raw);
    if (!token) {
      localStorage.removeItem(LEGACY_KEY);
      return false;
    }
    const payload = decodeJwt(token);
    if (!payload) {
      localStorage.removeItem(LEGACY_KEY);
      return false;
    }
    const rawActorType = (payload.actorType ?? payload.role) as AuthActorType;
    const actorType: AuthActorType = validActorTypes.includes(rawActorType)
      ? rawActorType
      : "CLIENT_ADMIN";
    const role = routeRoleByActor[actorType];
    const targetKey = storageKeyForRole(role);
    if (!localStorage.getItem(targetKey)) {
      persistTokenForRole(role, token);
    }
    localStorage.removeItem(LEGACY_KEY);
    return true;
  } catch {
    return false;
  }
}

export function getStoredSessionsSync(): Array<{ role: UserRole; token: string; payload: JwtPayload | null }> {
  const tokens = getAllStoredTokens();
  return (Object.entries(tokens) as Array<[UserRole, string]>).map(([role, token]) => ({
    role,
    token,
    payload: decodeJwt(token),
  }));
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

function getRoleFromPathSync(pathname: string): UserRole | null {
  // duplicate of tenant-routing logic to avoid circular import
  const m = pathname.match(/^\/m\/[^/]+\/(admin|teacher|parent|committee)(?:\/|$)/i);
  if (m) return m[1].toLowerCase() as UserRole;
  const m2 = pathname.match(/^\/(admin|teacher|parent|committee)(?:\/|$)/i);
  if (m2) return m2[1].toLowerCase() as UserRole;
  return null;
}

export const useAuthStore = create<AuthStore>()((set, get) => ({
  user: null,
  accessToken: null,
  isLoggedIn: false,
  hasHydrated: false,
  activeClientId: null,
  activeTenantSlug: null,
  activeStudentId: null,
  sessions: {},

  login: ({ user, accessToken }) => {
    persistTokenForRole(user.role, accessToken);
    if (user.tenantSlug) {
      saveTenantSlug(user.tenantSlug, user.role);
    }
    set({
      user,
      accessToken,
      isLoggedIn: true,
      sessions: { ...get().sessions, [user.role]: user },
      activeClientId:
        user.actorType === "SUPER_ADMIN" ? null : (user.clientId ?? null),
      activeTenantSlug:
        user.actorType === "SUPER_ADMIN" ? null : (user.tenantSlug ?? null),
      activeStudentId:
        user.actorType === "PARENT" && user.accessibleStudentIds?.length
          ? user.accessibleStudentIds[0]
          : null,
    });
  },

  logout: (role) => {
    const currentRole = role ?? get().user?.role ?? null;
    if (currentRole) {
      removeTokenForRole(currentRole as UserRole);
      const nextSessions = { ...get().sessions };
      delete (nextSessions as Record<string, unknown>)[currentRole];
      // If active user is that role, clear active
      const isActive = get().user?.role === currentRole;
      if (isActive) {
        set({
          user: null,
          accessToken: null,
          isLoggedIn: false,
          activeClientId: null,
          activeTenantSlug: null,
          activeStudentId: null,
          sessions: nextSessions,
        });
      } else {
        set({ sessions: nextSessions });
      }
      // also check if legacy key exists (should already be migrated)
      if (typeof window !== "undefined") {
        // if no active user but other sessions remain, optionally switch to another role
        const remaining = Object.keys(nextSessions) as UserRole[];
        if (!get().user && remaining.length > 0) {
          // keep hasHydrated true, but don't auto-switch; let path determine
        }
      }
    } else {
      // fallback: clear all
      get().logoutAll();
    }
  },

  logoutAll: () => {
    for (const r of ALL_ROLES) removeTokenForRole(r);
    if (typeof window !== "undefined") localStorage.removeItem(LEGACY_KEY);
    set({
      user: null,
      accessToken: null,
      isLoggedIn: false,
      activeClientId: null,
      activeTenantSlug: null,
      activeStudentId: null,
      sessions: {},
    });
  },

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
      sessions: state.user
        ? { ...state.sessions, [state.user.role]: { ...state.user, attendanceMode: mode } }
        : state.sessions,
    })),

  updateUser: (fields) =>
    set((state) => {
      if (!state.user) return state;
      const updated = { ...state.user, ...fields };
      return {
        user: updated,
        sessions: { ...state.sessions, [updated.role]: updated },
      };
    }),

  setAccessibleStudents: (students) =>
    set((state) => ({
      user: state.user ? { ...state.user, accessibleStudents: students } : null,
      sessions: state.user
        ? { ...state.sessions, [state.user.role]: { ...state.user, accessibleStudents: students } }
        : state.sessions,
    })),

  bootstrapRole: async (role, token) => {
    const payload = decodeJwt(token);
    if (!payload) {
      removeTokenForRole(role);
      return null;
    }
    let profile: ProfilePhoto;
    try {
      const res = await getProfile(token);
      profile = { photo: res.photo, photoUrl: res.photoUrl };
    } catch (err: unknown) {
      const isAuthError =
        (err as { statusCode?: number })?.statusCode === 401 ||
        (err as { code?: string })?.code === "AUTH_INVALID_CREDENTIALS";
      if (isAuthError) {
        removeTokenForRole(role);
        return null;
      }
      // Tolerate network/offline/server errors - fallback to JWT payload
      profile = {
        photo: (payload as any).photo ?? null,
        photoUrl: (payload as any).photoUrl ?? null,
      };
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
        // tolerate
      }
    }
    const user = buildUser(payload, profile, students);
    if (user.tenantSlug) {
      saveTenantSlug(user.tenantSlug, user.role);
    }
    // Ensure role consistency: if JWT role mismatches storageKey role, migrate
    if (user.role !== role) {
      // Keep token under correct role key as well
      persistTokenForRole(user.role, token);
      if (role !== user.role) removeTokenForRole(role);
    }
    return user;
  },

  syncActiveForPath: async (pathname) => {
    const requiredRole = getRoleFromPathSync(pathname);
    if (!requiredRole) return;
    const raw = typeof window !== "undefined" ? localStorage.getItem(storageKeyForRole(requiredRole)) : null;
    const token = extractToken(raw);
    if (!token) {
      // No session for this role - clear active if it was stale for this path
      // Only clear if current user role equals requiredRole but token missing (logged out)
      if (get().user?.role === requiredRole) {
        set({
          user: null,
          accessToken: null,
          isLoggedIn: false,
          activeClientId: null,
          activeTenantSlug: null,
          activeStudentId: null,
        });
      }
      return;
    }
    // If active already matches and token same, skip
    if (get().user?.role === requiredRole && get().accessToken === token) return;
    const user = await get().bootstrapRole(requiredRole, token);
    if (!user) {
      set({
        user: null,
        accessToken: null,
        isLoggedIn: false,
        activeClientId: null,
        activeTenantSlug: null,
        activeStudentId: null,
      });
      return;
    }
    set({
      user,
      accessToken: token,
      isLoggedIn: true,
      sessions: { ...get().sessions, [user.role]: user },
      activeClientId: user.actorType === "SUPER_ADMIN" ? null : (user.clientId ?? null),
      activeTenantSlug: user.actorType === "SUPER_ADMIN" ? null : (user.tenantSlug ?? null),
      activeStudentId:
        user.actorType === "PARENT" && user.accessibleStudentIds?.length
          ? user.accessibleStudentIds[0]
          : get().activeStudentId ?? (user.accessibleStudentIds?.[0] ?? null),
    });
  },

  bootstrap: async () => {
    // migrate legacy first
    migrateLegacySync();

    const tokens = getAllStoredTokens();
    const roles = Object.keys(tokens) as UserRole[];
    if (roles.length === 0) {
      set({ hasHydrated: true });
      return;
    }

    // Bootstrap all roles to populate sessions map
    const sessions: Partial<Record<UserRole, User>> = {};
    let hasActiveSet = false;

    // Determine required role from current path
    let requiredRole: UserRole | null = null;
    try {
      if (typeof window !== "undefined") requiredRole = getRoleFromPathSync(window.location.pathname);
    } catch {
      // ignore
    }

    // If path requires a specific role and we have token for it, bootstrap it first as active
    const orderedRoles: UserRole[] = [];
    if (requiredRole && tokens[requiredRole]) {
      orderedRoles.push(requiredRole);
      for (const r of roles) if (r !== requiredRole) orderedRoles.push(r);
    } else {
      orderedRoles.push(...roles);
    }

    for (const role of orderedRoles) {
      const token = tokens[role];
      const payload = decodeJwt(token);
      if (!payload) {
        removeTokenForRole(role);
        continue;
      }
      let profile: ProfilePhoto;
      try {
        const res = await getProfile(token);
        profile = { photo: res.photo, photoUrl: res.photoUrl };
      } catch (err: unknown) {
        const isAuthError =
          (err as { statusCode?: number })?.statusCode === 401 ||
          (err as { code?: string })?.code === "AUTH_INVALID_CREDENTIALS";
        if (isAuthError) {
          removeTokenForRole(role);
          continue;
        }
        // Tolerate network/offline/server errors - fallback to JWT payload
        profile = {
          photo: (payload as any).photo ?? null,
          photoUrl: (payload as any).photoUrl ?? null,
        };
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
          // tolerate
        }
      }
      // Check race: token may have been removed
      if (getAllStoredTokens()[role] !== token) continue;
      const user = buildUser(payload, profile, students);
      if (user.tenantSlug) {
        saveTenantSlug(user.tenantSlug, user.role);
      }
      // Correct role mapping if mismatch
      if (user.role !== role) {
        persistTokenForRole(user.role, token);
        if (user.role !== role) removeTokenForRole(role);
        sessions[user.role] = user;
      } else {
        sessions[role] = user;
      }

      if (!hasActiveSet) {
        // First bootstrapped user becomes active if no requiredRole, else requiredRole user
        const isRequired = requiredRole ? user.role === requiredRole : true;
        if (isRequired || !requiredRole) {
          const activeUser = user;
          set({
            user: activeUser,
            accessToken: token,
            isLoggedIn: true,
            activeClientId: activeUser.actorType === "SUPER_ADMIN" ? null : (activeUser.clientId ?? null),
            activeTenantSlug: activeUser.actorType === "SUPER_ADMIN" ? null : (activeUser.tenantSlug ?? null),
            activeStudentId:
              activeUser.actorType === "PARENT" && activeUser.accessibleStudentIds?.length
                ? activeUser.accessibleStudentIds[0]
                : null,
          });
          hasActiveSet = true;
          if (requiredRole) {
            // once active required role is set, remaining sessions just populate map
          }
        }
      }
    }

    set({ sessions: { ...get().sessions, ...sessions } as Partial<Record<UserRole, User>> });

    // If required role had no valid session, ensure active is cleared (show login)
    if (requiredRole && !sessions[requiredRole]) {
      // If current active user is not requiredRole, clear to show login for required path
      if (get().user?.role !== requiredRole) {
        // Check if we set an active from another role – clear it so DashboardLayout shows LoginComp for required role
        const tokensAfter = getAllStoredTokens();
        if (!tokensAfter[requiredRole]) {
          set({
            user: null,
            accessToken: null,
            isLoggedIn: false,
            activeClientId: null,
            activeTenantSlug: null,
            activeStudentId: null,
          });
        }
      }
    }

    // If no valid sessions at all, clear active
    if (Object.keys(sessions).length === 0) {
      set({
        user: null,
        accessToken: null,
        isLoggedIn: false,
        activeClientId: null,
        activeTenantSlug: null,
        activeStudentId: null,
        sessions: {},
      });
    }

    set({ hasHydrated: true });
  },

  refreshProfile: async () => {
    const { accessToken, user } = get();
    if (!accessToken || !user) return;
    try {
      const profile = await getProfile(accessToken);
      set((state) => {
        if (!state.user) return state;
        const updated = {
          ...state.user,
          name: profile.name,
          photo: profile.photo,
          photoUrl: profile.photoUrl,
        };
        return {
          user: updated,
          sessions: { ...state.sessions, [updated.role]: updated },
        };
      });
    } catch {
      // Silently fail
    }
  },

  refreshParentStudents: async () => {
    const { accessToken, user } = get();
    if (!accessToken || !user || user.actorType !== "PARENT") return;
    try {
      const { data } = await getParentStudents(accessToken);
      set((state) => {
        if (!state.user) return state;
        const updated = {
          ...state.user,
          accessibleStudents: data,
          accessibleStudentIds: data.map((s) => s.id),
        };
        return {
          user: updated,
          sessions: { ...state.sessions, [updated.role]: updated },
        };
      });
    } catch {
      // Silently fail
    }
  },
}));

// Auto-bootstrap on import (client side) – replicates previous onRehydrateStorage behaviour
if (typeof window !== "undefined") {
  // migrate legacy synchronously before bootstrap
  migrateLegacySync();
  const state = useAuthStore.getState();
  // defer to next tick to allow React to mount
  setTimeout(() => {
    state.bootstrap().catch(() => state.markHydrated());
  }, 0);
  // Hydrate hasHydrated after short delay if bootstrap already handled
}

