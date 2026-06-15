import { Sidebar, BottomNav } from "@/components/Navigation";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { Bell, ShieldAlert, X, ChevronDown, Menu } from "lucide-react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useCallback, useEffect, useState } from "react";
import { useAuthStore } from "@/store/auth";
import { useLanguageStore } from "@/store/language";
import { t } from "@/lib/i18n";
import { resolveLoginRedirectPath } from "@/lib/tenant-routing";
import { getClientConfig } from "@/lib/config-api";

// ── Parent Student Switcher ────────────────────────────────────────────────────

function ParentStudentSwitcher() {
  const { user, activeStudentId, setActiveStudent } = useAuthStore();
  const [open, setOpen] = useState(false);

  if (!user || user.actorType !== "PARENT") return null;

  const students = user.accessibleStudents ?? [];
  const ids = user.accessibleStudentIds ?? [];
  if (ids.length === 0) return null;

  const effectiveId = activeStudentId ?? ids[0];
  const activeStudent = students.find((s) => s.id === effectiveId);
  const activeName = activeStudent?.name ?? `Student ${ids.indexOf(effectiveId) + 1}`;

  if (ids.length === 1) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold max-w-[140px]">
        <span className="truncate">{activeName}</span>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold max-w-[140px]"
      >
        <span className="truncate">{activeName}</span>
        <ChevronDown className="w-3.5 h-3.5 shrink-0" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-white border border-gray-100 rounded-xl shadow-lg z-50 py-1 min-w-[180px]">
          {ids.map((id) => {
            const info = students.find((s) => s.id === id);
            const name = info?.name ?? `Student`;
            const sub = info?.className ?? info?.adno ?? "";
            return (
              <button
                key={id}
                onClick={() => { setActiveStudent(id); setOpen(false); }}
                className={`w-full text-left px-4 py-2.5 transition-colors ${
                  effectiveId === id
                    ? "bg-emerald-50 text-emerald-700"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                <p className="text-sm font-semibold leading-tight">{name}</p>
                {sub && <p className="text-xs text-gray-400 leading-tight mt-0.5">{sub}</p>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Super Admin Viewing Banner ─────────────────────────────────────────────────

function SuperAdminViewingBanner() {
  const { user, activeClientId, activeTenantSlug, switchToClient } = useAuthStore();
  const navigate = useNavigate();

  if (user?.actorType !== "SUPER_ADMIN" || !activeClientId) return null;

  const handleExit = () => {
    switchToClient(null, null);
    navigate("/admin", { replace: true });
  };

  return (
    <div className="bg-amber-500 text-white px-4 py-2 flex items-center justify-between gap-3 text-sm font-medium">
      <div className="flex items-center gap-2">
        <ShieldAlert className="w-4 h-4 shrink-0" />
        <span>Super Admin — viewing <strong>{activeTenantSlug ?? activeClientId}</strong></span>
      </div>
      <button
        onClick={handleExit}
        className="flex items-center gap-1 px-3 py-1 rounded-lg bg-white/20 hover:bg-white/30 transition-colors text-xs font-semibold shrink-0"
      >
        <X className="w-3.5 h-3.5" />
        Exit
      </button>
    </div>
  );
}

// ── Dashboard Layout ───────────────────────────────────────────────────────────

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user, activeClientId, activeTenantSlug, hasHydrated, accessToken, setAttendanceMode, logout } = useAuthStore();
  const { lang } = useLanguageStore();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const loginRedirectPath = useCallback(() =>
    resolveLoginRedirectPath({
      pathname: window.location.pathname,
      hostname: window.location.hostname,
      user,
      activeTenantSlug,
    }), [activeTenantSlug, user]);

  // Global 401 handler — any API that dispatches "auth:unauthorized" triggers logout
  useEffect(() => {
    const handler = () => {
      const redirectTo = loginRedirectPath();
      logout();
      navigate(redirectTo, { replace: true });
    };
    window.addEventListener("auth:unauthorized", handler);
    return () => window.removeEventListener("auth:unauthorized", handler);
  }, [loginRedirectPath, logout, navigate]);

  // Sync attendanceMode when super admin switches to a madrasa
  useEffect(() => {
    if (user?.actorType !== "SUPER_ADMIN" || !activeClientId || !accessToken) return;
    getClientConfig(activeClientId, accessToken)
      .then((cfg) => { if (cfg.attendanceMode) setAttendanceMode(cfg.attendanceMode); })
      .catch(() => {});
  }, [activeClientId]); // eslint-disable-line

  useEffect(() => {
    if (!hasHydrated) return;

    if (!user) {
      navigate(loginRedirectPath(), { replace: true });
      return;
    }

    const isSuperAdmin = user.actorType === "SUPER_ADMIN";

    if (isSuperAdmin) {
      // Valid: /admin (platform), /m/{slug}/admin/* (viewing madrasa)
      if (pathname === "/admin" || pathname.startsWith("/admin/")) return;
      if (pathname.match(/^\/m\/[^/]+\/admin/)) return;
      navigate("/admin", { replace: true });
      return;
    }

    // Tenant users: valid at /{role}/* or /m/{slug}/{role}/*
    const slug = user.tenantSlug;
    const roleBase = `/${user.role}`;
    const slugBase = slug ? `/m/${slug}/${user.role}` : null;

    if (pathname.startsWith(roleBase)) return;
    if (slugBase && pathname.startsWith(slugBase)) return;

    navigate(slugBase ?? roleBase, { replace: true });
  }, [hasHydrated, loginRedirectPath, pathname, navigate, user]);

  if (!hasHydrated) {
    return (
      <div className="min-h-[100dvh] bg-[#faf9f6] flex items-center justify-center text-sm text-gray-500">
        Loading...
      </div>
    );
  }

  if (!user) return null;

  const isSuperAdmin = user.actorType === "SUPER_ADMIN";
  const isViewingMadrasa = isSuperAdmin && !!activeClientId;

  const roleLabel = (role: string) => {
    if (isSuperAdmin && !isViewingMadrasa) return "Super Admin";
    if (role === "committee") return lang === "ml" ? "കമ്മിറ്റി" : "Committee";
    return t("common", role as "admin" | "teacher" | "parent", lang);
  };

  const notifPath = user.role === "committee"
    ? "/committee/announcements"
    : `/${user.role}/notifications`;

  return (
    <div className="min-h-[100dvh] bg-[#faf9f6]">
      <Sidebar isOpen={isMobileSidebarOpen} onClose={() => setIsMobileSidebarOpen(false)} />
      <div className="lg:ml-64">
        <SuperAdminViewingBanner />

        {/* ── Mobile top bar ─────────────────────────────────── */}
        <header
          className="lg:hidden sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-gray-100 px-4 py-0 flex items-center justify-between"
          style={{ minHeight: 56 }}
        >
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="p-1.5 text-gray-500 hover:bg-gray-100 active:bg-gray-200 rounded-xl active:scale-95 transition-all"
              aria-label="Open menu"
            >
              <Menu className="w-5.5 h-5.5" />
            </button>
            <div className="w-9 h-9 bg-emerald-600 rounded-xl flex items-center justify-center shrink-0">
              <span className="text-white font-extrabold text-xs tracking-wide">SM</span>
            </div>
            <div className="leading-tight">
              <p className="font-bold text-gray-900 text-sm leading-none">
                {t("common", "appName", lang)}
              </p>
              <p className="text-[10px] text-emerald-600 font-semibold capitalize mt-0.5">
                {roleLabel(user.role)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ParentStudentSwitcher />
            <LanguageSwitcher />
            {(!isSuperAdmin || isViewingMadrasa) && (
              <Link
                to={notifPath}
                className="relative w-9 h-9 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center active:scale-95 transition-transform"
              >
                <Bell className="w-4.5 h-4.5 text-gray-600" />
                {user.role !== "committee" && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white" />
                )}
              </Link>
            )}
            <div className="w-9 h-9 bg-emerald-600 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0">
              {user.name?.charAt(0) ?? "U"}
            </div>
          </div>
        </header>

        {/* ── Desktop top bar ────────────────────────────────── */}
        <header className="hidden lg:flex sticky top-0 z-30 bg-[#faf9f6]/90 backdrop-blur-md border-b border-gray-100 px-8 py-4 items-center justify-between">
          <div className="text-sm text-gray-500">
            {new Date().toLocaleDateString(lang === "ml" ? "ml-IN" : "en-IN", {
              weekday: "long", year: "numeric", month: "long", day: "numeric",
            })}
          </div>
          <div className="flex items-center gap-3">
            <ParentStudentSwitcher />
            <LanguageSwitcher />
            {(!isSuperAdmin || isViewingMadrasa) && (
              <Link
                to={notifPath}
                className="p-2 rounded-xl bg-white border border-gray-200 relative hover:bg-gray-50"
              >
                <Bell className="w-5 h-5 text-gray-600" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
              </Link>
            )}
            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2">
              <div className="w-7 h-7 bg-emerald-600 rounded-full flex items-center justify-center text-white font-bold text-xs">
                {user.name?.charAt(0) ?? "U"}
              </div>
              <span className="text-sm font-medium text-gray-700">{user.name}</span>
            </div>
          </div>
        </header>

        <main className="p-4 lg:p-8 pb-28 lg:pb-8">{children}</main>
      </div>
      <BottomNav onOpenMenu={() => setIsMobileSidebarOpen(true)} />
    </div>
  );
}
