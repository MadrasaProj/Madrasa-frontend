import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { GraduationCap, Users, ArrowRight, LogOut, Shield, Building2 } from "lucide-react";
import { useAuthStore, getStoredSessionsSync, storageKeyForRole, type UserRole } from "@/store/auth";
import { roleHomePath } from "@/lib/tenant-routing";
import PwaInstallButton from "@/components/PwaInstallButton";

type LandingRole = "parent" | "teacher";

import {
  clearTenantSlug,
  getTenantSlugAsync,
  getTenantSlugSync,
  saveTenantSlug,
} from "@/lib/slug-storage";

const roleMeta: Record<UserRole, { label: string; icon: typeof Shield; color: string }> = {
  admin: { label: "Admin", icon: Shield, color: "bg-slate-600" },
  teacher: { label: "Teacher", icon: GraduationCap, color: "bg-emerald-600" },
  parent: { label: "Parent", icon: Users, color: "bg-blue-600" },
  committee: { label: "Committee", icon: Building2, color: "bg-amber-600" },
};

function SessionsList() {
  const navigate = useNavigate();
  const { hasHydrated, logout, sessions } = useAuthStore();
  const [refreshKey, setRefreshKey] = useState(0);

  const stored = hasHydrated ? getStoredSessionsSync() : [];

  const items = stored.map(({ role, payload }) => {
    const fullUser = (sessions as Record<string, unknown>)[role] as { name?: string; tenantSlug?: string; actorType?: string; photoUrl?: string | null } | undefined;
    const name = fullUser?.name ?? payload?.name ?? role;
    const slug = fullUser?.tenantSlug ?? (payload?.client as { slug?: string; subdomain?: string } | undefined)?.slug ?? (payload?.client as { subdomain?: string } | undefined)?.subdomain ?? "";
    const actor = fullUser?.actorType ?? (payload?.actorType as string) ?? (payload?.role as string) ?? "";
    return { role, name, slug, actor, tokenPayload: payload };
  });

  if (!hasHydrated) {
    return (
      <div className="mb-6 bg-white rounded-2xl border border-gray-100 p-4 text-center text-sm text-gray-400">
        Loading sessions...
      </div>
    );
  }

  if (items.length === 0) return null;

  const handleGo = (role: UserRole, slug: string, actor: string) => {
    const r = role as UserRole;
    const isSuperAdmin = actor === "SUPER_ADMIN";
    const tenantSlug = slug || undefined;
    navigate(roleHomePath({ role: r, actorType: actor as never, tenantSlug: isSuperAdmin ? undefined : tenantSlug }));
  };

  const handleLogout = (role: UserRole) => {
    logout(role);
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="mb-6 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <h2 className="text-sm font-bold text-gray-900">Signed in</h2>
        <span className="text-xs text-gray-400">{items.length} session{items.length !== 1 ? "s" : ""}</span>
      </div>
      <div className="divide-y divide-gray-50">
        {items.map(({ role, name, slug, actor }) => {
          const meta = roleMeta[role] ?? roleMeta.admin;
          const Icon = meta.icon;
          return (
            <div key={role} className="flex items-center gap-3 px-4 py-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 ${meta.color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-900 truncate">{name}</p>
                <p className="text-xs text-gray-500 truncate capitalize">{meta.label} {slug ? `· ${slug}` : actor === "SUPER_ADMIN" ? "· Platform" : ""}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => handleGo(role, slug, actor as string)}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors"
                >
                  Open
                </button>
                <button
                  onClick={() => handleLogout(role)}
                  title={`Sign out ${role}`}
                  className="p-1.5 rounded-lg bg-gray-50 border border-gray-200 text-gray-500 hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <div className="px-4 py-2 bg-gray-50/60 flex items-center justify-between">
        <button
          onClick={() => {
            for (const { role } of items) {
              localStorage.removeItem(storageKeyForRole(role));
            }
            window.location.reload();
          }}
          className="text-xs font-medium text-gray-500 hover:text-red-600"
        >
          Sign out all
        </button>
        <span className="text-[11px] text-gray-400">Sessions are stored per role</span>
      </div>
    </div>
  );
}

export default function TwaLandingPage() {
  const navigate = useNavigate();
  const { hasHydrated, sessions } = useAuthStore();

  const [role, setRole] = useState<LandingRole | null>(null);
  const [slug, setSlug] = useState("");

  useEffect(() => {
    if (!hasHydrated) return;

    // 1. If exactly one session exists, auto-open it directly!
    const stored = getStoredSessionsSync();
    if (stored.length === 1) {
      const single = stored[0];
      const fullUser = (sessions as Record<string, unknown>)[single.role] as
        | { tenantSlug?: string; actorType?: string }
        | undefined;
      const targetSlug =
        fullUser?.tenantSlug ??
        single.payload?.client?.slug ??
        single.payload?.client?.subdomain ??
        "";
      const targetActor =
        fullUser?.actorType ??
        single.payload?.actorType ??
        single.payload?.role ??
        "";
      const isSuperAdmin = targetActor === "SUPER_ADMIN";
      navigate(
        roleHomePath({
          role: single.role,
          actorType: targetActor as never,
          tenantSlug: isSuperAdmin ? undefined : targetSlug || undefined,
        }),
        { replace: true }
      );
      return;
    }

    // 2. Synchronous check for remembered slug + role (localStorage + Cookie)
    const syncPrefs = getTenantSlugSync();
    if (syncPrefs.slug) {
      setSlug(syncPrefs.slug);
      if (syncPrefs.role === "parent" || syncPrefs.role === "teacher") {
        setRole(syncPrefs.role);
      }
    }

    // 3. Asynchronous fallback check (IndexedDB) in case localStorage was evicted
    void getTenantSlugAsync().then((asyncPrefs) => {
      if (asyncPrefs.slug) {
        setSlug((prev) => prev || asyncPrefs.slug);
        if (asyncPrefs.role === "parent" || asyncPrefs.role === "teacher") {
          const matchedRole: LandingRole = asyncPrefs.role;
          setRole((prev) => prev ?? matchedRole);
        }
      }
    });

    // 4. If in standalone PWA mode and slug + role are remembered with no sessions, auto-redirect directly to role page/login!
    const isStandalone =
      typeof window !== "undefined" &&
      (window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true);

    if (isStandalone && syncPrefs.slug && (syncPrefs.role === "parent" || syncPrefs.role === "teacher")) {
      navigate(`/m/${syncPrefs.slug}/${syncPrefs.role}`, { replace: true });
    }
  }, [hasHydrated, sessions, navigate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!role || !slug.trim()) return;
    const normalizedSlug = slug.trim().toLowerCase();
    saveTenantSlug(normalizedSlug, role);
    navigate(`/m/${normalizedSlug}/${role}`);
  };

  const handleClearSlug = () => {
    clearTenantSlug();
    setSlug("");
    setRole(null);
  };

  return (
    <div className="min-h-[100dvh] bg-[#faf9f6] flex flex-col items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <img
            src="/icons/icon.svg"
            alt="Smart Madrasa"
            className="inline-block w-16 h-16 mb-4 shadow-lg rounded-2xl"
          />
          <h1 className="text-2xl font-bold text-gray-900">Madrasa Portal</h1>
          <p className="text-gray-500 text-sm mt-1">
            Select your role to continue
          </p>
        </div>

        {/* ── Signed-in sessions (multi-role) ── */}
        <SessionsList />

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setRole("parent")}
              className={`flex flex-col items-center gap-2 p-5 rounded-2xl border-2 transition-all ${
                role === "parent"
                  ? "border-emerald-500 bg-emerald-50 shadow-sm"
                  : "border-gray-200 bg-white hover:border-gray-300"
              }`}
            >
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  role === "parent"
                    ? "bg-emerald-600 text-white"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                <Users className="w-6 h-6" />
              </div>
              <span
                className={`text-sm font-semibold ${
                  role === "parent" ? "text-emerald-800" : "text-gray-700"
                }`}
              >
                Parent
              </span>
            </button>

            <button
              type="button"
              onClick={() => setRole("teacher")}
              className={`flex flex-col items-center gap-2 p-5 rounded-2xl border-2 transition-all ${
                role === "teacher"
                  ? "border-emerald-500 bg-emerald-50 shadow-sm"
                  : "border-gray-200 bg-white hover:border-gray-300"
              }`}
            >
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  role === "teacher"
                    ? "bg-emerald-600 text-white"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                <GraduationCap className="w-6 h-6" />
              </div>
              <span
                className={`text-sm font-semibold ${
                  role === "teacher" ? "text-emerald-800" : "text-gray-700"
                }`}
              >
                Teacher
              </span>
            </button>
          </div>

          {role && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              transition={{ duration: 0.2 }}
            >
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Madrasa Slug
              </label>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="e.g. noorul-islam"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-gray-900 text-sm"
                autoFocus
                required
              />
              <div className="flex items-center justify-between mt-1.5">
                <p className="text-xs text-gray-400">
                  Enter your madrasa's slug to proceed to login
                </p>
                {slug && (
                  <button
                    type="button"
                    onClick={handleClearSlug}
                    className="text-xs text-emerald-600 hover:text-emerald-700 font-medium hover:underline"
                  >
                    Change
                  </button>
                )}
              </div>
            </motion.div>
          )}

          {role && (
            <motion.button
              type="submit"
              disabled={!slug.trim()}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="w-full bg-emerald-600 text-white font-semibold py-3.5 rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
            >
              Continue to Login
              <ArrowRight className="w-4 h-4" />
            </motion.button>
          )}
        </form>

        <div className="mt-4">
          <PwaInstallButton />
        </div>
      </motion.div>
    </div>
  );
}
