import { Sidebar, BottomNav } from "@/components/Navigation";
import { ParentStudentSwitcher } from "@/components/ParentStudentSwitcher";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import {
  Bell, ShieldAlert, X, Menu, ChevronDown, UserCircle, LogOut,
  HelpCircle, Check,
} from "lucide-react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore } from "@/store/auth";
import { useLanguageStore } from "@/store/language";
import { t } from "@/lib/i18n";
import { resolveLoginRedirectPath, tenantLoginPath } from "@/lib/tenant-routing";
import { getClientConfig } from "@/lib/config-api";
import { cn } from "@/lib/utils";

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

// ── User Menu (replaces the plain "bg-white border…" pill) ────────────────────

type UserMenuUser = NonNullable<ReturnType<typeof useAuthStore.getState>["user"]>;

type UserMenuProps = {
  user: UserMenuUser;
  roleLabel: string;
  isSuperAdmin: boolean;
  isViewingMadrasa: boolean;
  notifPath: string;
  compact?: boolean;
};

function UserMenu({ user, roleLabel, isSuperAdmin, isViewingMadrasa, notifPath, compact }: UserMenuProps) {
  const navigate = useNavigate();
  const { activeTenantSlug, logout } = useAuthStore();
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const slugPrefix = activeTenantSlug ? `/m/${activeTenantSlug}` : "";
  const profilePath = `/${user.role}/profile`;

  const handleLogout = () => {
    setOpen(false);
    logout();
    navigate(
      isSuperAdmin && !isViewingMadrasa
        ? "/super-admin/login"
        : tenantLoginPath(activeTenantSlug, user.role === "committee" ? "committee" : user.role as "admin" | "teacher" | "parent"),
      { replace: true },
    );
  };

  const initial = user.name?.charAt(0).toUpperCase() ?? "U";
  const photo = user.photoUrl || user.photo;
  const subtitle = user.email || user.phone || (isSuperAdmin ? "Platform Administrator" : "Madrasa Member");

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "group flex items-center gap-2.5 pl-1.5 pr-2.5 py-1.5 rounded-xl bg-white border border-gray-200",
          "hover:border-gray-300 hover:shadow-sm active:scale-[0.98] transition-all",
          open && "border-gray-300 shadow-sm",
        )}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {photo ? (
          <img
            src={photo}
            alt=""
            className="w-8 h-8 rounded-lg object-cover ring-2 ring-white"
            crossOrigin="anonymous"
          />
        ) : (
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 flex items-center justify-center text-white font-bold text-sm shadow-sm shadow-emerald-600/20">
            {initial}
          </div>
        )}
        {!compact && (
          <div className="hidden xl:block text-left leading-tight">
            <p className="text-sm font-semibold text-gray-900 truncate max-w-[140px]">{user.name}</p>
            <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mt-0.5">
              {roleLabel}
            </p>
          </div>
        )}
        <ChevronDown
          className={cn(
            "w-3.5 h-3.5 text-gray-400 transition-transform duration-200 shrink-0",
            open && "rotate-180 text-gray-600",
          )}
        />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.98 }}
              transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
              className={cn(
                "absolute right-0 top-full mt-2 w-72 bg-white border border-gray-100 rounded-2xl",
                "shadow-xl shadow-gray-900/10 z-50 overflow-hidden origin-top-right",
              )}
              role="menu"
            >
              <div className="px-4 py-4 border-b border-gray-100 bg-gradient-to-br from-emerald-50/70 via-white to-teal-50/40">
                <div className="flex items-center gap-3">
                  {photo ? (
                    <img
                      src={photo}
                      alt=""
                      className="w-11 h-11 rounded-xl object-cover ring-2 ring-white shadow-sm"
                      crossOrigin="anonymous"
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 flex items-center justify-center text-white font-bold text-base shadow-sm shadow-emerald-600/20">
                      {initial}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-gray-900 truncate">{user.name}</p>
                    <p className="text-xs text-gray-500 truncate mt-0.5">{subtitle}</p>
                    <span className="inline-flex items-center gap-1 mt-2 text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full px-2 py-0.5">
                      <Check className="w-2.5 h-2.5" />
                      {roleLabel}
                    </span>
                  </div>
                </div>
              </div>

              <div className="py-1.5">
                <Link
                  to={`${slugPrefix}${profilePath}`}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors"
                  role="menuitem"
                >
                  <span className="w-7 h-7 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0 group-hover:bg-emerald-50">
                    <UserCircle className="w-4 h-4 text-gray-500" />
                  </span>
                  <span className="font-medium">My Profile</span>
                </Link>

                {(!isSuperAdmin || isViewingMadrasa) && (
                  <Link
                    to={`${slugPrefix}${notifPath}`}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors"
                    role="menuitem"
                  >
                    <span className="w-7 h-7 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0">
                      <Bell className="w-4 h-4 text-gray-500" />
                    </span>
                    <span className="font-medium flex-1">Notifications</span>
                    <span className="w-2 h-2 bg-red-500 rounded-full" />
                  </Link>
                )}

                <button
                  onClick={() => {
                    setOpen(false);
                    if (typeof window !== "undefined") {
                      window.open("mailto:support@madrasa.app", "_blank");
                    }
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors"
                  role="menuitem"
                >
                  <span className="w-7 h-7 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0">
                    <HelpCircle className="w-4 h-4 text-gray-500" />
                  </span>
                  <span className="font-medium">Help & Support</span>
                </button>
              </div>

              <div className="border-t border-gray-100 py-1.5 bg-gray-50/40">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 active:bg-red-100 transition-colors"
                  role="menuitem"
                >
                  <span className="w-7 h-7 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
                    <LogOut className="w-4 h-4 text-red-600" />
                  </span>
                  <span className="font-semibold">Sign Out</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Dashboard Layout ───────────────────────────────────────────────────────────

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user, activeClientId, activeTenantSlug, hasHydrated, accessToken, setAttendanceMode, logout, refreshProfile } = useAuthStore();
  const { lang } = useLanguageStore();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const hasRefreshed = useRef(false);

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

  // Fetch fresh profile (with a new signed URL) once on app load
  useEffect(() => {
    if (!hasHydrated || !user || hasRefreshed.current) return;
    hasRefreshed.current = true;
    refreshProfile();
  }, [hasHydrated, user, refreshProfile]);

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
  }, [hasHydrated, loginRedirectPath, pathname, navigate, user]); // eslint-disable-line

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
            <UserMenu
              user={user}
              roleLabel={roleLabel(user.role)}
              isSuperAdmin={isSuperAdmin}
              isViewingMadrasa={isViewingMadrasa}
              notifPath={notifPath}
              compact
            />
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
            <UserMenu
              user={user}
              roleLabel={roleLabel(user.role)}
              isSuperAdmin={isSuperAdmin}
              isViewingMadrasa={isViewingMadrasa}
              notifPath={notifPath}
            />
          </div>
        </header>

        <main className="p-4 lg:p-8 pb-28 lg:pb-8">{children}</main>
      </div>
    </div>
      <BottomNav onOpenMenu={() => setIsMobileSidebarOpen(true)} />
    
    
    </>
  );
}
