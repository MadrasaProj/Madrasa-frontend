import { Sidebar, BottomNav } from "@/components/Navigation";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import {
  Bell, ShieldAlert, X, Menu, ChevronDown, UserCircle, LogOut,
  HelpCircle, Check,
} from "lucide-react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore } from "@/store/auth";
import { useLanguageStore } from "@/store/language";
import { t } from "@/lib/i18n";
import { getRoleFromPath, getTenantSlugFromPath } from "@/lib/tenant-routing";
import RoleLoginPage from "@/components/auth/RoleLoginPage";
import { useClientConfig } from "@/lib/queries";
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

// ── User Menu ──────────────────────────────────────────────────────────────────
// Renders as an absolute-positioned dropdown (desktop) or a bottom sheet
// drawer (mobile). For parents, the menu body also includes a student
// switcher section.

type UserMenuUser = NonNullable<ReturnType<typeof useAuthStore.getState>["user"]>;

type UserMenuProps = {
  user: UserMenuUser;
  roleLabel: string;
  isSuperAdmin: boolean;
  isViewingMadrasa: boolean;
  notifPath: string;
  compact?: boolean;
  variant?: "dropdown" | "drawer";
};

function UserMenu({
  user,
  roleLabel,
  isSuperAdmin,
  isViewingMadrasa,
  notifPath,
  compact,
  variant = "dropdown",
}: UserMenuProps) {
  const {
    activeTenantSlug,
    logout,
    activeStudentId,
    setActiveStudent,
  } = useAuthStore();
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const isDrawer = variant === "drawer";

  // Body scroll lock when the drawer is open
  useEffect(() => {
    if (!open || !isDrawer) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open, isDrawer]);

  // Escape closes; click-outside closes (dropdown variant only — the
  // drawer has its own backdrop tap-to-close)
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handleKey);
    if (isDrawer) {
      return () => document.removeEventListener("keydown", handleKey);
    }
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open, isDrawer]);

  // Parent student data
  const isParent = user.actorType === "PARENT";
  const studentIds = isParent ? (user.accessibleStudentIds ?? []) : [];
  const students = isParent ? (user.accessibleStudents ?? []) : [];
  const currentStudentId = isParent
    ? (activeStudentId ?? studentIds[0] ?? null)
    : null;
  const showStudentSwitcher = isParent && studentIds.length > 0;

  const slugPrefix = activeTenantSlug ? `/m/${activeTenantSlug}` : "";
  const profilePath = `/${user.role}/profile`;

  const handleLogout = () => {
    setOpen(false);
    logout();
  };

  const handleSelectStudent = (id: string) => {
    setActiveStudent(id);
    setOpen(false);
  };

  const initial = user.name?.charAt(0).toUpperCase() ?? "U";
  const subtitle =
    user.email ||
    user.phone ||
    (isSuperAdmin ? "Platform Administrator" : "Madrasa Member");

  // Avatar — used in trigger and profile header (sized by caller)
  const Avatar = ({
    size,
  }: {
    size: "sm" | "md" | "lg";
  }) => {
    const sizes = {
      sm: "w-8 h-8 rounded-lg",
      md: "w-11 h-11 rounded-xl",
      lg: "w-12 h-12 rounded-2xl",
    } as const;
    const text = size === "sm" ? "text-sm" : size === "md" ? "text-base" : "text-lg";
    return user.photoUrl ? (
      <img
        src={user.photoUrl}
        alt=""
        className={cn(sizes[size], "object-cover ring-2 ring-white shadow-sm")}
      />
    ) : (
      <div
        className={cn(
          sizes[size],
          "bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 flex items-center justify-center text-white font-bold shadow-sm shadow-emerald-600/20",
          text,
        )}
      >
        {initial}
      </div>
    );
  };

  // Menu body — shared by both variants
  const menuBody = (
    <>
      {/* Profile header */}
      <div className="px-4 py-4 border-b border-gray-100 bg-gradient-to-br from-emerald-50/70 via-white to-teal-50/40">
        <div className="flex items-center gap-3">
          <Avatar size={isDrawer ? "lg" : "md"} />
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

      {/* Student switcher (parents only) */}
      {showStudentSwitcher && (
        <div className="border-b border-gray-100">
          <p className="px-4 pt-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">
            Switch Student
          </p>
          <div className="max-h-56 overflow-y-auto pb-1">
            {studentIds.map((id) => {
              const info = students.find((s) => s.id === id);
              const name = info?.name ?? "Student";
              const sub = info?.className ?? info?.adno ?? "";
              const isActive = currentStudentId === id;
              return (
                <button
                  key={id}
                  onClick={() => handleSelectStudent(id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors",
                    isActive
                      ? "bg-emerald-50"
                      : "hover:bg-gray-50 active:bg-gray-100",
                  )}
                  role="menuitem"
                >
                  {info?.photoUrl ? (
                    <img
                      src={info.photoUrl}
                      alt=""
                      className="w-8 h-8 rounded-lg object-cover ring-1 ring-white shrink-0"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-100 to-teal-100 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0">
                      {name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        "text-sm font-semibold leading-tight truncate",
                        isActive ? "text-emerald-700" : "text-gray-900",
                      )}
                    >
                      {name}
                    </p>
                    {sub && (
                      <p className="text-xs text-gray-400 leading-tight mt-0.5 truncate">
                        {sub}
                      </p>
                    )}
                  </div>
                  {isActive && (
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Action items */}
      <div className="py-1.5">
        <Link
          to={`${slugPrefix}${profilePath}`}
          onClick={() => setOpen(false)}
          className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors"
          role="menuitem"
        >
          <span className="w-7 h-7 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0">
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
    </>
  );

  // Trigger button
  const trigger = (
    <button
      onClick={() => setOpen((o) => !o)}
      className={cn(
        "group flex items-center gap-2.5 pl-1.5 pr-2.5 py-1.5 rounded-xl bg-white border border-gray-200",
        "hover:border-gray-300 hover:shadow-sm active:scale-[0.98] transition-all",
        open && "border-gray-300 shadow-sm",
      )}
      aria-haspopup="menu"
      aria-expanded={open}
      aria-label={open ? "Close menu" : "Open menu"}
    >
      <Avatar size="sm" />
      {!compact && (
        <div className="hidden xl:block text-left leading-tight">
          <p className="text-sm font-semibold text-gray-900 truncate max-w-[140px]">
            {user.name}
          </p>
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
  );

  if (isDrawer) {
    return (
      <>
        {trigger}
        <AnimatePresence>
          {open && (
            <>
              <motion.div
                key="backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={() => setOpen(false)}
                className="fixed inset-0 bg-black/50 z-40"
                aria-hidden
              />
              <motion.div
                key="drawer"
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 32, stiffness: 320 }}
                className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden"
                role="dialog"
                aria-label="User menu"
              >
                <div className="pt-2.5 pb-1 flex justify-center shrink-0 relative">
                  <div className="w-10 h-1 bg-gray-300 rounded-full" />
                  <button
                    onClick={() => setOpen(false)}
                    className="absolute right-3 top-1.5 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg active:scale-95 transition-all"
                    aria-label="Close menu"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="overflow-y-auto flex-1 overscroll-contain pb-[max(0.5rem,env(safe-area-inset-bottom))]">
                  {menuBody}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </>
    );
  }

  return (
    <div ref={menuRef} className="relative">
      {trigger}
      <AnimatePresence>
        {open && (
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
            {menuBody}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Dashboard Layout ───────────────────────────────────────────────────────────

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user, activeClientId, activeTenantSlug, hasHydrated, accessToken, setAttendanceMode, logout, switchToClient } = useAuthStore();
  const { lang } = useLanguageStore();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [resolvingClient, setResolvingClient] = useState(false);

  const slug = getTenantSlugFromPath(pathname);
  const needsResolution = !!(
    hasHydrated &&
    user?.actorType === "SUPER_ADMIN" &&
    slug &&
    (activeTenantSlug?.toLowerCase() !== slug.toLowerCase() || !activeClientId)
  );

  // Global 401 handler — any API that dispatches "auth:unauthorized" triggers logout
  useEffect(() => {
    const handler = () => {
      logout();
    };
    window.addEventListener("auth:unauthorized", handler);
    return () => window.removeEventListener("auth:unauthorized", handler);
  }, [logout]);

  // For super admin, sync activeClientId when URL slug changes
  useEffect(() => {
    if (!hasHydrated || !user || user.actorType !== "SUPER_ADMIN" || !accessToken) return;

    const slug = getTenantSlugFromPath(pathname);
    if (!slug) {
      // If we are on a platform page (e.g. /admin), clear the active client
      if (activeClientId !== null) {
        switchToClient(null, null);
      }
      return;
    }

    if (activeTenantSlug?.toLowerCase() === slug.toLowerCase() && activeClientId) {
      // Already synced
      return;
    }

    // Otherwise, we need to resolve the clientId for this slug
    setResolvingClient(true);
    import("@/lib/super-admin-api")
      .then(({ listClients }) => listClients(accessToken))
      .then(({ data }) => {
        const client = data.find((c) => c.slug.toLowerCase() === slug.toLowerCase());
        if (client) {
          switchToClient(client.id, client.slug);
        } else {
          console.error(`Client not found for slug: ${slug}`);
          navigate("/admin", { replace: true });
        }
      })
      .catch((e) => {
        console.error("Failed to list clients for super-admin slug sync:", e);
      })
      .finally(() => {
        setResolvingClient(false);
      });
  }, [hasHydrated, user, accessToken, pathname, activeTenantSlug, activeClientId, switchToClient, navigate]);

  // Fetch client config using cached query hook
  const { data: clientConfig } = useClientConfig({
    clientId: activeClientId ?? "",
    token: accessToken ?? "",
  });

  // Sync attendanceMode when super admin switches to a madrasa or clientConfig is loaded
  useEffect(() => {
    if (user?.actorType !== "SUPER_ADMIN" || !clientConfig) return;
    if (clientConfig.attendanceMode) {
      setAttendanceMode(clientConfig.attendanceMode);
    }
  }, [clientConfig, user?.actorType, setAttendanceMode]);

  useEffect(() => {
    if (!hasHydrated) return;
    if (!user) return;

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
  }, [hasHydrated, pathname, navigate, user]); // eslint-disable-line

  const isResolving = resolvingClient || needsResolution;

  if (!hasHydrated || isResolving) {
    return (
      <div className="min-h-screen bg-[#faf9f6] flex items-center justify-center text-sm text-gray-500">
        {isResolving ? "Loading tenant settings..." : "Loading..."}
      </div>
    );
  }

  if (!user) {
    const pathRole = getRoleFromPath(pathname);
    const pathSlug = getTenantSlugFromPath(pathname);

    if (pathname === "/" || (!pathRole && !pathSlug)) {
      return (
        <div className="min-h-screen bg-[#faf9f6] flex items-center justify-center text-sm text-gray-500">
          Redirecting...
        </div>
      );
    }

    if (!pathSlug && pathRole !== "admin") {
      return <RoleLoginPage type="TEACHER" />;
    }

    const typeMap: Record<string, "SUPER_ADMIN" | "CLIENT_ADMIN" | "TEACHER" | "PARENT" | "COMMITTEE"> = {
      admin: pathSlug ? "CLIENT_ADMIN" : "SUPER_ADMIN",
      teacher: "TEACHER",
      parent: "PARENT",
      committee: "COMMITTEE",
    };

    return <RoleLoginPage type={typeMap[pathRole ?? "admin"]} tenantSlug={pathSlug ?? undefined} />;
  }

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
          className="lg:hidden sticky top-0 z-30 bg-white/95   border-b border-gray-100 px-4 py-0 flex items-center justify-between"
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
              variant="drawer"
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
