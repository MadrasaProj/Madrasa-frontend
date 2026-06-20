import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Users,   ClipboardList, BookOpen, FileText,
  CreditCard, BarChart3, Bell, Settings, Star, BookMarked,
  UserCircle, Home, GraduationCap, Moon, IndianRupee,
  BadgeCheck, FileBarChart2, Megaphone, UserCog, Activity, LogOut,
  Building2, ShieldCheck, UserCircle2, School, Clock, FilePen,
  ClipboardCheck, Image, Trophy, Menu, X, ChevronDown, Languages,
} from "lucide-react";
import { ParentStudentSwitcher } from "@/components/ParentStudentSwitcher";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useAuthStore } from "@/store/auth";
import { useLanguageStore } from "@/store/language";
import { t } from "@/lib/i18n";
import { tenantLoginPath } from "@/lib/tenant-routing";
import { useState, useEffect, useRef } from "react";
import { getClientConfig, type ClientConfig } from "@/lib/config-api";

type NavKey =
  | "dashboard" | "students" | "teachers" | "classes" | "subjects" | "fees"
  | "idCards" | "exams" | "classTests" | "checkin" | "reports" | "logs" | "config" | "attendance"
  | "homework" | "diary" | "ibadah" | "performance" | "home"
  | "leaveRequests"
  | "results" | "alerts" | "overview" | "finance" | "announcements" | "notifications"
  | "madrasas" | "superUsers" | "platformReports" | "profile"
  | "teacherCheckin" | "posters" | "artsfest" | "academics" | "operations" | "financeExtras" | "settings"
  | "bestPerformance";

const adminLinks = [
  { href: "/admin",                icon: LayoutDashboard, key: "dashboard"     as NavKey },
  { href: "/admin/students",       icon: Users,           key: "students"      as NavKey },
  { href: "/admin/classes",        icon: School,          key: "classes"       as NavKey },
  { href: "/admin/subjects",       icon: BookOpen,        key: "subjects"      as NavKey },
  { href: "/admin/teachers",       icon: UserCog,         key: "teachers"      as NavKey },
  { href: "/admin/teacher-attendance", icon: ClipboardCheck,  key: "teacherCheckin" as NavKey },
  { href: "/admin/attendance",        icon: ClipboardList,   key: "attendance"     as NavKey },
  { href: "/admin/leave-requests",    icon: FilePen,         key: "leaveRequests"  as NavKey },
  { href: "/admin/ibadah",            icon: Moon,            key: "ibadah"         as NavKey },
  { href: "/admin/fees",           icon: CreditCard,      key: "fees"          as NavKey },
  { href: "/admin/id-cards",       icon: BadgeCheck,      key: "idCards"       as NavKey },
  { href: "/admin/posters",        icon: Image,           key: "posters"       as NavKey },
  { href: "/admin/exams",          icon: GraduationCap,   key: "exams"         as NavKey },
  { href: "/admin/exams/class-test", icon: GraduationCap, key: "classTests"    as NavKey },
  { href: "/admin/reports",        icon: BarChart3,       key: "reports"       as NavKey },
  { href: "/admin/logs",           icon: Activity,        key: "logs"          as NavKey },
  { href: "/admin/notifications",  icon: Bell,            key: "notifications" as NavKey },
  { href: "/admin/config",         icon: Settings,        key: "config"        as NavKey },
  { href: "/admin/best-performance", icon: Trophy,       key: "bestPerformance" as NavKey },
  { href: "/admin/profile",        icon: UserCircle2,     key: "profile"       as NavKey },
];

const teacherLinks = [
  { href: "/teacher",              icon: LayoutDashboard, key: "dashboard"    as NavKey },
  { href: "/teacher/checkin",      icon: Clock,           key: "checkin"      as NavKey },
  { href: "/teacher/attendance",      icon: ClipboardList,   key: "attendance"    as NavKey },
  { href: "/teacher/leave-requests",  icon: FilePen,         key: "leaveRequests" as NavKey },
  { href: "/teacher/homework",        icon: BookOpen,        key: "homework"      as NavKey },
  { href: "/teacher/diary",        icon: FileText,        key: "diary"        as NavKey },
  { href: "/teacher/ibadah",       icon: Moon,            key: "ibadah"       as NavKey },
  { href: "/teacher/fees",         icon: CreditCard,      key: "fees"         as NavKey },
  { href: "/teacher/exams",        icon: GraduationCap,   key: "exams"        as NavKey },
  { href: "/teacher/exams/class-test", icon: GraduationCap, key: "classTests" as NavKey },
  { href: "/teacher/performance",  icon: Star,            key: "performance"  as NavKey },
  { href: "/teacher/notifications",icon: Bell,            key: "notifications"as NavKey },
  { href: "/teacher/profile",      icon: UserCircle2,     key: "profile"      as NavKey },
];

const parentLinks = [
  { href: "/parent",               icon: Home,            key: "home"         as NavKey },
  { href: "/parent/attendance",       icon: ClipboardList,   key: "attendance"    as NavKey },
  { href: "/parent/leave-requests",   icon: FilePen,         key: "leaveRequests" as NavKey },
  { href: "/parent/homework",         icon: BookOpen,        key: "homework"      as NavKey },
  { href: "/parent/diary",         icon: FileText,        key: "diary"        as NavKey },
  { href: "/parent/ibadah",        icon: Moon,            key: "ibadah"       as NavKey },
  { href: "/parent/fees",          icon: CreditCard,      key: "fees"         as NavKey },
  { href: "/parent/posters",       icon: Image,           key: "posters"      as NavKey },
  { href: "/parent/results",       icon: GraduationCap,   key: "results"      as NavKey },
  { href: "/parent/notifications", icon: Bell,            key: "notifications"as NavKey },
  { href: "/parent/profile",       icon: UserCircle2,     key: "profile"      as NavKey },
];

const committeeLinks = [
  { href: "/committee",                    icon: BarChart3,       key: "overview"       as NavKey },
  { href: "/committee/finance",            icon: IndianRupee,     key: "finance"        as NavKey },
  { href: "/committee/students",           icon: Users,           key: "students"       as NavKey },
  { href: "/committee/attendance",         icon: ClipboardList,   key: "attendance"     as NavKey },
  { href: "/committee/teacher-attendance", icon: ClipboardCheck,  key: "teacherCheckin" as NavKey },
  { href: "/committee/reports",            icon: FileBarChart2,   key: "reports"        as NavKey },
  { href: "/committee/announcements",      icon: Megaphone,       key: "announcements"  as NavKey },
  { href: "/committee/best-performance",   icon: Trophy,          key: "bestPerformance" as NavKey },
  { href: "/committee/profile",            icon: UserCircle2,     key: "profile"        as NavKey },
];

const superAdminLinks = [
  { href: "/admin",                    icon: LayoutDashboard, key: "dashboard"       as NavKey },
  { href: "/admin/madrasas",           icon: Building2,       key: "madrasas"        as NavKey },
  { href: "/admin/super-users",        icon: ShieldCheck,     key: "superUsers"      as NavKey },
  { href: "/admin/ibadah-config",      icon: Moon,            key: "ibadah"          as NavKey },
  { href: "/admin/posters",            icon: Image,           key: "posters"         as NavKey },
  { href: "/admin/platform-reports",   icon: BarChart3,       key: "platformReports" as NavKey },
  { href: "/admin/profile",            icon: UserCircle2,     key: "profile"         as NavKey },
];

interface NavLink {
  href: string;
  icon: any;
  key: NavKey;
  isExternal?: boolean;
}

const getArtsfestLink = (role: string, actorType?: string): NavLink => {
  const isAdmin = role === "admin" || actorType === "SUPER_ADMIN";
  const envUrl = isAdmin
    ? import.meta.env.VITE_ARTSFEST_ADMIN_URL
    : import.meta.env.VITE_ARTSFEST_USER_URL;
  
  const defaultUrl = isAdmin ? "artsfestadmin.feztify.com" : "artsfest.feztify.com";
  const targetUrl = envUrl || defaultUrl;
  
  const href = /^https?:\/\//i.test(targetUrl) ? targetUrl : `https://${targetUrl}`;

  return {
    href,
    icon: Trophy,
    key: "artsfest",
    isExternal: true,
  };
};

function insertArtsfestLink(links: NavLink[], role: string, actorType?: string): NavLink[] {
  const artsfestLink = getArtsfestLink(role, actorType);
  const profileIndex = links.findIndex(l => l.key === "profile");
  if (profileIndex !== -1) {
    return [
      ...links.slice(0, profileIndex),
      artsfestLink,
      ...links.slice(profileIndex),
    ];
  }
  return [...links, artsfestLink];
}

const getAdminCategories = (role: string, actorType?: string) => {
  const links = insertArtsfestLink(adminLinks, role, actorType);
  return [
    {
      id: "overview",
      titleKey: "overview" as NavKey,
      icon: LayoutDashboard,
      links: links.filter(l => ["dashboard", "reports", "logs", "notifications"].includes(l.key))
    },
    {
      id: "academics",
      titleKey: "academics" as NavKey,
      icon: GraduationCap,
      links: links.filter(l => ["students", "classes", "subjects", "teachers", "exams", "classTests"].includes(l.key))
    },
    {
      id: "operations",
      titleKey: "operations" as NavKey,
      icon: ClipboardList,
      links: links.filter(l => ["attendance", "teacherCheckin", "leaveRequests", "ibadah", "bestPerformance"].includes(l.key))
    },
    {
      id: "finance",
      titleKey: "financeExtras" as NavKey,
      icon: CreditCard,
      links: links.filter(l => ["fees", "idCards", "posters", "artsfest"].includes(l.key))
    },
    {
      id: "settings",
      titleKey: "settings" as NavKey,
      icon: Settings,
      links: links.filter(l => ["config", "profile"].includes(l.key))
    }
  ];
};

function getLinksByRole(role: string, actorType?: string, hasActiveClient?: boolean): NavLink[] {
  if (actorType === "SUPER_ADMIN" && !hasActiveClient) return superAdminLinks;
  if (role === "admin") return adminLinks;
  if (role === "teacher") return teacherLinks;
  if (role === "committee") return committeeLinks;
  return parentLinks;
}

function useSlugPrefix(): string {
  const { pathname } = useLocation();
  const match = pathname.match(/^\/m\/([^/]+)\//);
  return match ? `/m/${match[1]}` : "";
}

const ROOT_PATHS = ["/admin", "/teacher", "/parent", "/committee"];

const isLinkActive = (pathname: string, fullHref: string, slugPrefix: string) => {
  const normPath = pathname.replace(/\/$/, "");
  const normHref = fullHref.replace(/\/$/, "");
  
  const basePaths = ["/admin", "/teacher", "/parent", "/committee"];
  const basePathsWithSlug = slugPrefix ? basePaths.map(p => `${slugPrefix}${p}`) : [];
  const allBasePaths = [...basePaths, ...basePathsWithSlug];
  
  if (allBasePaths.includes(normHref)) {
    return normPath === normHref;
  }
  return normPath === normHref || normPath.startsWith(normHref + "/");
};

export function Sidebar({ isOpen, onClose }: { isOpen?: boolean; onClose?: () => void }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, activeClientId, accessToken, logout } = useAuthStore();
  const { lang } = useLanguageStore();
  const slugPrefix = useSlugPrefix();
  const [commConfig, setCommConfig] = useState<Pick<ClientConfig, "showCommitteeAttendance" | "showCommitteeTeacherCheckin">>({});

  const activeRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (user?.role !== "committee" || !activeClientId || !accessToken) return;
    getClientConfig(activeClientId, accessToken)
      .then((cfg) => setCommConfig({ showCommitteeAttendance: cfg.showCommitteeAttendance, showCommitteeTeacherCheckin: cfg.showCommitteeTeacherCheckin }))
      .catch(() => {});
  }, [user?.role, activeClientId, accessToken]);

  useEffect(() => {
    if (activeRef.current) {
      activeRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [pathname]);

  if (!user) return null;

  const isSuperAdmin = user.actorType === "SUPER_ADMIN";
  const hasActiveClient = !!activeClientId;
  const isAdminView = (user.role === "admin" && !isSuperAdmin) || (isSuperAdmin && hasActiveClient);

  const adminCats = isAdminView ? getAdminCategories(user.role, user.actorType) : [];
  
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>(() => {
    if (!isAdminView) return {};
    const initial: Record<string, boolean> = {
      overview: true,
      academics: false,
      operations: false,
      finance: false,
      settings: false,
    };
    adminCats.forEach((cat) => {
      const hasActive = cat.links.some((l) => {
        const fullHref = l.isExternal ? l.href : (slugPrefix ? `${slugPrefix}${l.href}` : l.href);
        return !l.isExternal && isLinkActive(pathname, fullHref, slugPrefix);
      });
      if (hasActive) {
        initial[cat.id] = true;
      }
    });

    try {
      const saved = localStorage.getItem("sidebar_expanded_categories");
      if (saved) {
        return { ...initial, ...JSON.parse(saved) };
      }
    } catch (e) {}
    return initial;
  });

  useEffect(() => {
    if (!isAdminView) return;
    adminCats.forEach((cat) => {
      const hasActive = cat.links.some((l) => {
        const fullHref = l.isExternal ? l.href : (slugPrefix ? `${slugPrefix}${l.href}` : l.href);
        return !l.isExternal && isLinkActive(pathname, fullHref, slugPrefix);
      });
      if (hasActive) {
        setExpandedCategories((prev) => {
          if (prev[cat.id]) return prev;
          const next = { ...prev, [cat.id]: true };
          try {
            localStorage.setItem("sidebar_expanded_categories", JSON.stringify(next));
          } catch (e) {}
          return next;
        });
      }
    });
  }, [pathname, isAdminView, slugPrefix]);

  const toggleCategory = (id: string) => {
    setExpandedCategories((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem("sidebar_expanded_categories", JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  };

  let flatLinks = getLinksByRole(user.role, user.actorType, hasActiveClient);
  flatLinks = insertArtsfestLink(flatLinks, user.role, user.actorType);

  if (user.role === "committee") {
    flatLinks = flatLinks.filter((l) => {
      if (l.key === "attendance" && commConfig.showCommitteeAttendance === false) return false;
      if (l.key === "teacherCheckin" && commConfig.showCommitteeTeacherCheckin === false) return false;
      return true;
    });
  }

  const handleLinkClick = () => {
    onClose?.();
  };

  const renderLink = (l: NavLink, isNested = false) => {
    const Icon = l.icon;
    const isCheckin = l.key === "checkin";
    const fullHref = l.isExternal ? l.href : (slugPrefix ? `${slugPrefix}${l.href}` : l.href);
    const active = !l.isExternal && isLinkActive(pathname, fullHref, slugPrefix);

    const linkClasses = cn(
      "flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all focus-visible:ring-2 focus-visible:ring-emerald-500 outline-none",
      isNested && "pl-8",
      isCheckin && !active
        ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200 shadow-sm"
        : active
          ? "bg-emerald-600 text-white shadow-sm font-semibold"
          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
    );

    if (l.isExternal) {
      return (
        <a
          key={l.href}
          href={fullHref}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleLinkClick}
          className={linkClasses}
        >
          <Icon className="w-5 h-5 shrink-0 text-emerald-600" />
          <span>{t("nav", l.key, lang)}</span>
        </a>
      );
    }

    return (
      <Link
        key={l.href}
        to={fullHref}
        onClick={handleLinkClick}
        ref={active ? activeRef : undefined}
        className={linkClasses}
      >
        <Icon className={cn("w-5 h-5 shrink-0", isCheckin && !active && "text-emerald-600")} />
        <span className="truncate">{t("nav", l.key, lang)}</span>
        {isCheckin && !active && (
          <span className="ml-auto w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        )}
      </Link>
    );
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/40 backdrop-blur-xs z-50 transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={cn(
          "flex flex-col w-64 bg-white border-r border-gray-100 h-[100dvh] overflow-hidden fixed left-0 top-0 transition-transform duration-300",
          "lg:z-40 lg:translate-x-0 lg:flex", // Desktop styling
          isOpen ? "translate-x-0 z-50" : "-translate-x-full lg:translate-x-0" // Mobile styling
        )}
      >
        {/* Mobile Header / Close button */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center">
              <BookMarked className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-gray-900 text-sm leading-tight">{t("common", "appName", lang)}</p>
              <p className="text-xs text-gray-500">{t("common", "madrasa", lang)}</p>
            </div>
          </div>
          {isOpen && (
            <button
              onClick={onClose}
              className="lg:hidden p-1.5 rounded-xl text-gray-400 hover:bg-gray-100 active:scale-95 transition-transform"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="px-4 py-3 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3 bg-emerald-50 rounded-xl p-3">
            <div className="w-9 h-9 bg-emerald-600 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0">
              {user.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{user.name}</p>
              <p className="text-xs text-emerald-700 capitalize">
                {isSuperAdmin
                  ? "Super Admin"
                  : user.role === "committee"
                    ? (lang === "ml" ? "കമ്മിറ്റി" : "Committee")
                    : t("common", user.role as "admin" | "teacher" | "parent", lang)}
              </p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto min-h-0 scrollbar-thin">
          {isAdminView ? (
            // Categorized Navigation for Admin User
            <div className="space-y-4">
              {adminCats.map((cat) => {
                const isExpanded = expandedCategories[cat.id];
                const CatIcon = cat.icon;
                const hasActiveLink = cat.links.some((l) => {
                  const fullHref = l.isExternal ? l.href : (slugPrefix ? `${slugPrefix}${l.href}` : l.href);
                  return !l.isExternal && isLinkActive(pathname, fullHref, slugPrefix);
                });

                return (
                  <div key={cat.id} className="space-y-1">
                    <button
                      onClick={() => toggleCategory(cat.id)}
                      className={cn(
                        "flex items-center justify-between w-full px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors",
                        hasActiveLink
                          ? "text-emerald-700 bg-emerald-50/50"
                          : "text-gray-400 hover:text-gray-900 hover:bg-gray-50"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <CatIcon className="w-4 h-4 text-emerald-600/70" />
                        <span>{t("nav", cat.titleKey, lang)}</span>
                      </div>
                      <ChevronDown
                        className={cn(
                          "w-4 h-4 text-gray-400 transition-transform duration-200",
                          isExpanded ? "transform rotate-180" : ""
                        )}
                      />
                    </button>
                    {isExpanded && (
                      <div className="space-y-1 pt-1">
                        {cat.links.map((l) => renderLink(l, true))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            // Flat Navigation for other roles
            <div className="space-y-1">
              {flatLinks.map((l) => renderLink(l))}
            </div>
          )}
        </nav>

        {/* ── Mobile sidebar utilities ── */}
        <div className="lg:hidden px-4 py-3 border-t border-gray-100 bg-gray-50 space-y-1 shrink-0">
          {user.actorType === "PARENT" && (user.accessibleStudentIds?.length ?? 0) > 0 && (
            <ParentStudentSwitcher />
          )}
          <div className="flex items-center justify-between gap-2 px-3 py-2">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              {lang === "ml" ? "ഭാഷ" : "Language"}
            </span>
            <LanguageSwitcher />
          </div>
        </div>

        <div className="p-4 border-t border-gray-100 shrink-0">
          <button
            onClick={() => {
              logout();
              navigate(isSuperAdmin ? "/super-admin/login" : tenantLoginPath(user.tenantSlug), { replace: true });
            }}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-all w-full focus-visible:ring-2 focus-visible:ring-red-500 outline-none"
          >
            <LogOut className="w-5 h-5" />
            {t("common", "signOut", lang)}
          </button>
        </div>
      </aside>
    </>
  );
}

export function BottomNav({ onOpenMenu }: { onOpenMenu?: () => void }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, activeClientId, accessToken, logout } = useAuthStore();
  const { lang } = useLanguageStore();
  const slugPrefix = useSlugPrefix();
  const [commConfig, setCommConfig] = useState<Pick<ClientConfig, "showCommitteeAttendance" | "showCommitteeTeacherCheckin">>({});

  useEffect(() => {
    if (user?.role !== "committee" || !activeClientId || !accessToken) return;
    getClientConfig(activeClientId, accessToken)
      .then((cfg) => setCommConfig({ showCommitteeAttendance: cfg.showCommitteeAttendance, showCommitteeTeacherCheckin: cfg.showCommitteeTeacherCheckin }))
      .catch(() => {});
  }, [user?.role, activeClientId, accessToken]);

  if (!user) return null;

  const isSuperAdmin = user.actorType === "SUPER_ADMIN";
  const hasActiveClient = !!activeClientId;
  
  let allLinks = getLinksByRole(user.role, user.actorType, hasActiveClient);
  allLinks = insertArtsfestLink(allLinks, user.role, user.actorType);

  if (user.role === "committee") {
    allLinks = allLinks.filter((l) => {
      if (l.key === "attendance" && commConfig.showCommitteeAttendance === false) return false;
      if (l.key === "teacherCheckin" && commConfig.showCommitteeTeacherCheckin === false) return false;
      return true;
    });
  }

  const showMore = allLinks.length > 5;
  const links = showMore ? allLinks.slice(0, 4) : allLinks;

  return (
    <nav className="lg:hidden fixed bottom-0  left-0 right-0 bg-white border-t border-gray-100 z-30 pb-safe">
      <div className="flex items-stretch justify-around px-1">
        {links.map((l) => {
          const fullHref = l.isExternal ? l.href : (slugPrefix ? `${slugPrefix}${l.href}` : l.href);
          const active = !l.isExternal && isLinkActive(pathname, fullHref, slugPrefix);
          const Icon = l.icon;
          
          if (l.isExternal) {
            return (
              <a
                key={l.href}
                href={fullHref}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "flex flex-col items-center justify-center gap-1 py-2.5 px-2 min-w-0 flex-1 relative transition-all active:scale-95 text-gray-400",
                )}
              >
                <div className="flex items-center justify-center rounded-xl w-10 h-7">
                  <Icon className="w-5 h-5 shrink-0 text-emerald-600" />
                </div>
                <span className="text-[10px] font-semibold leading-none">
                  {t("nav", l.key, lang)}
                </span>
              </a>
            );
          }

          return (
            <Link
              key={l.href}
              to={fullHref}
              className={cn(
                "flex flex-col items-center justify-center gap-1 py-2.5 px-2 min-w-0 flex-1 relative transition-all active:scale-95",
                active ? "text-emerald-600" : "text-gray-400",
              )}
            >
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-emerald-500 rounded-full" />
              )}
              <div className={cn("flex items-center justify-center rounded-xl transition-all", active ? "bg-emerald-50 w-10 h-7" : "w-10 h-7")}>
                <Icon className={cn("w-5 h-5 shrink-0", active && "stroke-[2.5]")} />
              </div>
              <span className={cn("text-[10px] font-semibold leading-none text-center", active ? "text-emerald-600" : "text-gray-400")}>
                {t("nav", l.key, lang)}
              </span>
            </Link>
          );
        })}

        {showMore && (
          <button
            onClick={onOpenMenu}
            className="flex flex-col items-center justify-center gap-1 py-2.5 px-2 min-w-0 flex-1 relative transition-all active:scale-95 text-gray-400"
          >
            <div className="flex items-center justify-center rounded-xl w-10 h-7">
              <Menu className="w-5 h-5 shrink-0" />
            </div>
            <span className="text-[10px] font-semibold leading-none">
              {lang === "ml" ? "കൂടുതൽ" : "More"}
            </span>
          </button>
        )}

        {isSuperAdmin && !hasActiveClient && !showMore && (
          <button
            onClick={() => { logout(); navigate("/super-admin/login", { replace: true }); }}
            className="flex flex-col items-center justify-center gap-1 py-2.5 px-2 min-w-0 flex-1 relative transition-all active:scale-95 text-red-400"
          >
            <div className="flex items-center justify-center rounded-xl w-10 h-7">
              <LogOut className="w-5 h-5 shrink-0" />
            </div>
            <span className="text-[10px] font-semibold leading-none">Logout</span>
          </button>
        )}
      </div>
    </nav>
  );
}

