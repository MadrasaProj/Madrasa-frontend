import { Sidebar, BottomNav } from "@/components/Navigation";
import { ParentStudentSwitcher } from "@/components/ParentStudentSwitcher";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { Bell, ShieldAlert, X, Menu } from "lucide-react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useCallback, useEffect, useState } from "react";
import { useAuthStore } from "@/store/auth";
import { useLanguageStore } from "@/store/language";
import { t } from "@/lib/i18n";
import { resolveLoginRedirectPath } from "@/lib/tenant-routing";
import { getClientConfig } from "@/lib/config-api";

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
      <div className="min-h-screen bg-[#faf9f6] flex items-center justify-center text-sm text-gray-500">
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
    <>
    <div className="min-h-[100svh] overflow-auto bg-[#faf9f6]">
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
           
            <div className="w-7 h-7 bg-emerald-600 rounded-full flex items-center justify-center text-white font-bold text-xs">
              {user.name?.charAt(0) ?? "U"}
            </div>
            <span className="text-sm font-medium text-gray-700">{user.name}</span>
          </div>
          <div className="flex items-center gap-2">
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
    </div>
      <BottomNav onOpenMenu={() => setIsMobileSidebarOpen(true)} />
    
    
    </>
  );
}
