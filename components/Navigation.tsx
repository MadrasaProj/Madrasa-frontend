import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  User,
  ClipboardList,
  BookOpen,
  FileText,
  CreditCard,
  BarChart3,
  Bell,
  Settings,
  Star,
  UserCircle,
  Home,
  GraduationCap,
  Moon,
  IndianRupee,
  BadgeCheck,
  FileBarChart2,
  Megaphone,
  UserCog,
  Activity,
  LogOut,
  Building2,
  ShieldCheck,
  UserCircle2,
  School,
  Clock,
  FilePen,
  ClipboardCheck,
  Image,
  Trophy,
  Menu,
  X,
  ChevronDown,
  ChevronRight,
  Languages,
  MapPin,
  Receipt,
  Download,
} from "lucide-react";
import { Drawer } from "@/components/ui/drawerView";
import OnboardingDrawer from "@/components/twa/OnboardingDrawer";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import PwaInstallButton from "@/components/PwaInstallButton";
import { useAuthStore } from "@/store/auth";
import { useLanguageStore } from "@/store/language";
import { t } from "@/lib/i18n";
import { useState, useEffect, useRef } from "react";
import { type ClientConfig } from "@/lib/config-api";
import { useClientConfig } from "@/lib/queries";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { ButtonGroup } from "./ui/button-group";

type NavKey =
  | "dashboard"
  | "students"
  | "teachers"
  | "classes"
  | "subjects"
  | "fees"
  | "idCards"
  | "exams"
  | "classTests"
  | "checkin"
  | "reports"
  | "logs"
  | "config"
  | "attendance"
  | "homework"
  | "diary"
  | "ibadah"
  | "performance"
  | "home"
  | "leaveRequests"
  | "results"
  | "alerts"
  | "overview"
  | "finance"
  | "announcements"
  | "notifications"
  | "madrasas"
  | "superUsers"
  | "platformReports"
  | "profile"
  | "teacherCheckin"
  | "socialFrames"
  | "posters"
  | "artsfest"
  | "academics"
  | "operations"
  | "financeExtras"
  | "settings"
  | "bestPerformance"
  | "feeTypes"
  | "globalClassSubjects";

const adminLinks = [
  { href: "/admin", icon: LayoutDashboard, key: "dashboard" as NavKey },
  { href: "/admin/students", icon: Users, key: "students" as NavKey },
  { href: "/admin/classes", icon: School, key: "classes" as NavKey },
  { href: "/admin/subjects", icon: BookOpen, key: "subjects" as NavKey },
  { href: "/admin/teachers", icon: UserCog, key: "teachers" as NavKey },
  {
    href: "/admin/teacher-attendance",
    icon: ClipboardCheck,
    key: "teacherCheckin" as NavKey,
  },
  {
    href: "/admin/attendance",
    icon: ClipboardList,
    key: "attendance" as NavKey,
  },
  {
    href: "/admin/leave-requests",
    icon: FilePen,
    key: "leaveRequests" as NavKey,
  },
  { href: "/admin/ibadah", icon: Moon, key: "ibadah" as NavKey },
  { href: "/admin/fees", icon: CreditCard, key: "fees" as NavKey, exact: true },
  { href: "/admin/fees/types", icon: CreditCard, key: "feeTypes" as NavKey },
  { href: "/admin/id-cards", icon: BadgeCheck, key: "idCards" as NavKey },
  { href: "/admin/social-frames", icon: Image, key: "socialFrames" as NavKey },
  { href: "/admin/posters", icon: FileText, key: "posters" as NavKey },
  {
    href: "/admin/exams",
    icon: GraduationCap,
    key: "exams" as NavKey,
    exact: true,
  },
  {
    href: "/admin/exams/class-test",
    icon: GraduationCap,
    key: "classTests" as NavKey,
  },
  { href: "/admin/reports", icon: BarChart3, key: "reports" as NavKey },
  { href: "/admin/logs", icon: Activity, key: "logs" as NavKey },
  { href: "/admin/notifications", icon: Bell, key: "notifications" as NavKey },
  { href: "/admin/config", icon: Settings, key: "config" as NavKey },
  {
    href: "/admin/best-performance",
    icon: Trophy,
    key: "bestPerformance" as NavKey,
  },
  { href: "/admin/profile", icon: UserCircle2, key: "profile" as NavKey },
];

const teacherLinks = [
  { href: "/teacher", icon: LayoutDashboard, key: "dashboard" as NavKey },
  { href: "/teacher/checkin", icon: Clock, key: "checkin" as NavKey },
  {
    href: "/teacher/attendance",
    icon: ClipboardList,
    key: "attendance" as NavKey,
  },
  {
    href: "/teacher/leave-requests",
    icon: FilePen,
    key: "leaveRequests" as NavKey,
  },
  { href: "/teacher/homework", icon: BookOpen, key: "homework" as NavKey },
  { href: "/teacher/diary", icon: FileText, key: "diary" as NavKey },
  { href: "/teacher/ibadah", icon: Moon, key: "ibadah" as NavKey },
  { href: "/teacher/fees", icon: CreditCard, key: "fees" as NavKey },
  {
    href: "/teacher/exams",
    icon: GraduationCap,
    key: "exams" as NavKey,
    exact: true,
  },
  {
    href: "/teacher/exams/class-test",
    icon: GraduationCap,
    key: "classTests" as NavKey,
  },
  { href: "/teacher/performance", icon: Star, key: "performance" as NavKey },
  {
    href: "/teacher/reports/individual",
    icon: FileText,
    key: "reports" as NavKey,
  },
  {
    href: "/teacher/best-performance",
    icon: Trophy,
    key: "bestPerformance" as NavKey,
  },
  {
    href: "/teacher/notifications",
    icon: Bell,
    key: "notifications" as NavKey,
  },
  { href: "/teacher/profile", icon: UserCircle2, key: "profile" as NavKey },
];

const parentLinks = [
  { href: "/parent", icon: Home, key: "home" as NavKey },
  { href: "/parent/students", icon: User, key: "students" as NavKey },
  {
    href: "/parent/attendance",
    icon: ClipboardList,
    key: "attendance" as NavKey,
  },
  { href: "/parent/ibadah", icon: Moon, key: "ibadah" as NavKey },
  {
    href: "/parent/leave-requests",
    icon: FilePen,
    key: "leaveRequests" as NavKey,
  },
  { href: "/parent/homework", icon: BookOpen, key: "homework" as NavKey },
  { href: "/parent/diary", icon: FileText, key: "diary" as NavKey },
  { href: "/parent/fees", icon: CreditCard, key: "fees" as NavKey },
  { href: "/parent/id-cards", icon: BadgeCheck, key: "idCards" as NavKey },
  { href: "/parent/social-frames", icon: Image, key: "socialFrames" as NavKey },
  { href: "/parent/results", icon: GraduationCap, key: "results" as NavKey },
  {
    href: "/parent/best-performance",
    icon: Trophy,
    key: "bestPerformance" as NavKey,
  },
  { href: "/parent/notifications", icon: Bell, key: "notifications" as NavKey },
  { href: "/parent/profile", icon: UserCircle2, key: "profile" as NavKey },
];

const committeeLinks = [
  { href: "/committee", icon: BarChart3, key: "overview" as NavKey },
  { href: "/committee/finance", icon: IndianRupee, key: "finance" as NavKey },
  { href: "/committee/students", icon: Users, key: "students" as NavKey },
  {
    href: "/committee/attendance",
    icon: ClipboardList,
    key: "attendance" as NavKey,
  },
  {
    href: "/committee/teacher-attendance",
    icon: ClipboardCheck,
    key: "teacherCheckin" as NavKey,
  },
  { href: "/committee/reports", icon: FileBarChart2, key: "reports" as NavKey },
  {
    href: "/committee/announcements",
    icon: Megaphone,
    key: "announcements" as NavKey,
  },
  {
    href: "/committee/best-performance",
    icon: Trophy,
    key: "bestPerformance" as NavKey,
  },
  { href: "/committee/profile", icon: UserCircle2, key: "profile" as NavKey },
];

const superAdminLinks = [
  { href: "/admin", icon: LayoutDashboard, key: "dashboard" as NavKey },
  { href: "/admin/madrasas", icon: Building2, key: "madrasas" as NavKey },
  {
    href: "/admin/super-users",
    icon: ShieldCheck,
    key: "superUsers" as NavKey,
  },
  { href: "/admin/ibadah-config", icon: Moon, key: "ibadah" as NavKey },
  { href: "/admin/social-frames", icon: Image, key: "socialFrames" as NavKey },
  { href: "/admin/posters", icon: FileText, key: "posters" as NavKey },
  {
    href: "/admin/global-class-subjects",
    icon: BookOpen,
    key: "globalClassSubjects" as NavKey,
  },
  {
    href: "/admin/platform-reports",
    icon: BarChart3,
    key: "platformReports" as NavKey,
  },
  { href: "/admin/profile", icon: UserCircle2, key: "profile" as NavKey },
];

interface NavLink {
  href: string;
  icon: any;
  key: NavKey;
  isExternal?: boolean;
  exact?: boolean;
}

const getArtsfestLink = (role: string, actorType?: string): NavLink => {
  const isAdmin = role === "admin" || actorType === "SUPER_ADMIN";
  const envUrl = isAdmin
    ? import.meta.env.VITE_ARTSFEST_ADMIN_URL
    : import.meta.env.VITE_ARTSFEST_USER_URL;

  const defaultUrl = isAdmin
    ? "artsfestadmin.feztify.com"
    : "artsfest.feztify.com";
  const targetUrl = envUrl || defaultUrl;

  const href = /^https?:\/\//i.test(targetUrl)
    ? targetUrl
    : `https://${targetUrl}`;

  return {
    href,
    icon: Trophy,
    key: "artsfest",
    isExternal: true,
  };
};

function insertArtsfestLink(
  links: NavLink[],
  role: string,
  actorType?: string,
): NavLink[] {
  const artsfestLink = getArtsfestLink(role, actorType);
  const profileIndex = links.findIndex((l) => l.key === "profile");
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
      links: links.filter((l) =>
        ["dashboard", "reports", "logs", "notifications"].includes(l.key),
      ),
    },
    {
      id: "academics",
      titleKey: "academics" as NavKey,
      icon: GraduationCap,
      links: links.filter((l) =>
        [
          "students",
          "classes",
          "subjects",
          "teachers",
          "exams",
          "classTests",
        ].includes(l.key),
      ),
    },
    {
      id: "operations",
      titleKey: "operations" as NavKey,
      icon: ClipboardList,
      links: links.filter((l) =>
        [
          "attendance",
          "teacherCheckin",
          "leaveRequests",
          "ibadah",
          "bestPerformance",
        ].includes(l.key),
      ),
    },
    {
      id: "finance",
      titleKey: "financeExtras" as NavKey,
      icon: CreditCard,
      links: links.filter((l) =>
        [
          "fees",
          "feeTypes",
          "idCards",
          "socialFrames",
          "posters",
          "artsfest",
        ].includes(l.key),
      ),
    },
    {
      id: "settings",
      titleKey: "settings" as NavKey,
      icon: Settings,
      links: links.filter((l) => ["config", "profile"].includes(l.key)),
    },
  ];
};

function getLinksByRole(
  role: string,
  actorType?: string,
  hasActiveClient?: boolean,
): NavLink[] {
  if (actorType === "SUPER_ADMIN" && !hasActiveClient) return superAdminLinks;
  if (!hasActiveClient) {
    if (actorType === "SALES_EXECUTIVE") {
      return [
        { href: "/admin", icon: LayoutDashboard, key: "dashboard" as NavKey },
        { href: "/admin/crm/leads", icon: Building2, key: "leads" as NavKey },
        {
          href: "/admin/crm/commissions",
          icon: CreditCard,
          key: "commissions" as NavKey,
        },
        { href: "/admin/profile", icon: UserCircle2, key: "profile" as NavKey },
      ];
    }
    if (actorType === "SALES_MANAGER") {
      return [
        { href: "/admin", icon: LayoutDashboard, key: "dashboard" as NavKey },
        { href: "/admin/crm/leads", icon: Building2, key: "leads" as NavKey },
        {
          href: "/admin/crm/commissions",
          icon: CreditCard,
          key: "commissions" as NavKey,
        },
        {
          href: "/admin/crm/districts",
          icon: MapPin,
          key: "districts" as NavKey,
        },
        {
          href: "/admin/crm/expenses",
          icon: Receipt,
          key: "expenses" as NavKey,
        },
        { href: "/admin/profile", icon: UserCircle2, key: "profile" as NavKey },
      ];
    }
    if (
      actorType === "MARKETING_MANAGER" ||
      actorType === "TECHNICAL_MANAGER"
    ) {
      return [
        { href: "/admin", icon: LayoutDashboard, key: "dashboard" as NavKey },
        {
          href: "/admin/crm/expenses",
          icon: Receipt,
          key: "expenses" as NavKey,
        },
        { href: "/admin/profile", icon: UserCircle2, key: "profile" as NavKey },
      ];
    }
    if (actorType === "SUPPORT_EXECUTIVE") {
      return [
        { href: "/admin", icon: LayoutDashboard, key: "dashboard" as NavKey },
        {
          href: "/admin/crm/support",
          icon: ShieldCheck,
          key: "support" as NavKey,
        },
        { href: "/admin/profile", icon: UserCircle2, key: "profile" as NavKey },
      ];
    }
    if (actorType === "IMPLEMENTATION_SPECIALIST") {
      return [
        { href: "/admin", icon: LayoutDashboard, key: "dashboard" as NavKey },
        { href: "/admin/crm/leads", icon: Building2, key: "leads" as NavKey },
        { href: "/admin/profile", icon: UserCircle2, key: "profile" as NavKey },
      ];
    }
    if (actorType === "CUSTOMER_SUCCESS_MANAGER") {
      return [
        { href: "/admin", icon: LayoutDashboard, key: "dashboard" as NavKey },
        { href: "/admin/crm/leads", icon: Building2, key: "leads" as NavKey },
        {
          href: "/admin/crm/support",
          icon: ShieldCheck,
          key: "support" as NavKey,
        },
        {
          href: "/admin/crm/renewals",
          icon: ClipboardList,
          key: "renewals" as NavKey,
        },
        { href: "/admin/profile", icon: UserCircle2, key: "profile" as NavKey },
      ];
    }
    if (actorType === "FINANCE_EXECUTIVE") {
      return [
        { href: "/admin", icon: LayoutDashboard, key: "dashboard" as NavKey },
        {
          href: "/admin/crm/renewals",
          icon: ClipboardList,
          key: "renewals" as NavKey,
        },
        {
          href: "/admin/crm/commissions",
          icon: CreditCard,
          key: "commissions" as NavKey,
        },
        { href: "/admin/profile", icon: UserCircle2, key: "profile" as NavKey },
      ];
    }
  }
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

const isLinkActive = (
  pathname: string,
  fullHref: string,
  slugPrefix: string,
  exact?: boolean,
) => {
  const normPath = pathname.replace(/\/$/, "");
  const normHref = fullHref.replace(/\/$/, "");

  if (exact) {
    return normPath === normHref;
  }

  const basePaths = ["/admin", "/teacher", "/parent", "/committee"];
  const basePathsWithSlug = slugPrefix
    ? basePaths.map((p) => `${slugPrefix}${p}`)
    : [];
  const allBasePaths = [...basePaths, ...basePathsWithSlug];

  if (allBasePaths.includes(normHref)) {
    return normPath === normHref;
  }
  return normPath === normHref || normPath.startsWith(normHref + "/");
};

export function Sidebar({
  isOpen,
  onClose,
}: {
  isOpen?: boolean;
  onClose?: () => void;
}) {
  const { pathname } = useLocation();
  const { user, activeClientId, accessToken, logout } = useAuthStore();
  const { lang } = useLanguageStore();
  const slugPrefix = useSlugPrefix();
  const { data: clientConfig } = useClientConfig({
    clientId: activeClientId ?? "",
    token: accessToken ?? "",
  });

  const commConfig = {
    showCommitteeAttendance: clientConfig?.showCommitteeAttendance,
    showCommitteeTeacherCheckin: clientConfig?.showCommitteeTeacherCheckin,
  };
  const disabledModules = clientConfig?.disabledParentModules ?? [];

  const activeRef = useRef<HTMLAnchorElement>(null);

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
  const isAdminView =
    (user.role === "admin" && !isSuperAdmin) ||
    (isSuperAdmin && hasActiveClient);

  const adminCats = isAdminView
    ? getAdminCategories(user.role, user.actorType)
    : [];

  const [expandedCategories, setExpandedCategories] = useState<
    Record<string, boolean>
  >(() => {
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
        const fullHref = l.isExternal
          ? l.href
          : slugPrefix
            ? `${slugPrefix}${l.href}`
            : l.href;
        return (
          !l.isExternal && isLinkActive(pathname, fullHref, slugPrefix, l.exact)
        );
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
        const fullHref = l.isExternal
          ? l.href
          : slugPrefix
            ? `${slugPrefix}${l.href}`
            : l.href;
        return (
          !l.isExternal && isLinkActive(pathname, fullHref, slugPrefix, l.exact)
        );
      });
      if (hasActive) {
        setExpandedCategories((prev) => {
          if (prev[cat.id]) return prev;
          const next = { ...prev, [cat.id]: true };
          try {
            localStorage.setItem(
              "sidebar_expanded_categories",
              JSON.stringify(next),
            );
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
        localStorage.setItem(
          "sidebar_expanded_categories",
          JSON.stringify(next),
        );
      } catch (e) {}
      return next;
    });
  };

  let flatLinks = getLinksByRole(user.role, user.actorType, hasActiveClient);
  flatLinks = insertArtsfestLink(flatLinks, user.role, user.actorType);

  if (user.role === "committee") {
    flatLinks = flatLinks.filter((l) => {
      if (
        l.key === "attendance" &&
        commConfig.showCommitteeAttendance === false
      )
        return false;
      if (
        l.key === "teacherCheckin" &&
        commConfig.showCommitteeTeacherCheckin === false
      )
        return false;
      return true;
    });
  }
  if (user.actorType === "PARENT") {
    flatLinks = flatLinks.filter((l) => !disabledModules.includes(l.key));
  }

  const handleLinkClick = () => {
    onClose?.();
  };

  const renderLink = (l: NavLink, isNested = false) => {
    const Icon = l.icon;
    const isCheckin = l.key === "checkin";
    const fullHref = l.isExternal
      ? l.href
      : slugPrefix
        ? `${slugPrefix}${l.href}`
        : l.href;
    const active =
      !l.isExternal && isLinkActive(pathname, fullHref, slugPrefix, l.exact);

    const linkClasses = cn(
      "flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all focus-visible:ring-2 focus-visible:ring-emerald-500 outline-none",
      isNested && "pl-8",
      isCheckin && !active
        ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200 shadow-sm"
        : active
          ? "bg-emerald-600 text-white shadow-sm font-semibold"
          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
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
        <Icon
          className={cn(
            "w-5 h-5 shrink-0",
            isCheckin && !active && "text-emerald-600",
          )}
        />
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
          isOpen ? "translate-x-0 z-50" : "-translate-x-full lg:translate-x-0", // Mobile styling
        )}
      >
        {/* Mobile Header / Close Button */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <img
              src="/icons/icon.svg"
              alt="Smart Madrasa"
              className="w-10 h-10"
            />
            <div>
              <p className="font-bold text-gray-900 text-sm leading-tight">
                {t("common", "appName", lang)}
              </p>
              <p className="text-xs text-gray-500">
                {t("common", "madrasa", lang)}
              </p>
            </div>
          </div>
          {isOpen && (
            <Button
              onClick={onClose}
              className="lg:hidden p-1.5 rounded-xl text-gray-400 hover:bg-gray-100 active:scale-95 transition-transform"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </Button>
          )}
        </div>
        <div className="px-4 py-3 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3 bg-emerald-50 rounded-xl p-3">
            {user.photoUrl ? (
              <img
                src={user.photoUrl}
                alt="Profile"
                className="w-9 h-9 rounded-full object-cover shrink-0"
              />
            ) : (
              <div className="w-9 h-9 bg-emerald-600 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0">
                {user.name.charAt(0)}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">
                {user.name}
              </p>
              <p className="text-xs text-emerald-700 capitalize">
                {isSuperAdmin
                  ? "Super Admin"
                  : user.role === "committee"
                    ? lang === "ml"
                      ? "കമ്മിറ്റി"
                      : "Committee"
                    : t(
                        "common",
                        user.role as "admin" | "teacher" | "parent",
                        lang,
                      )}
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
                  const fullHref = l.isExternal
                    ? l.href
                    : slugPrefix
                      ? `${slugPrefix}${l.href}`
                      : l.href;
                  return (
                    !l.isExternal &&
                    isLinkActive(pathname, fullHref, slugPrefix, l.exact)
                  );
                });

                return (
                  <div key={cat.id} className="space-y-1">
                    <Button
                      onClick={() => toggleCategory(cat.id)}
                      className={cn(
                        "flex items-center justify-between w-full px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors",
                        hasActiveLink
                          ? "text-emerald-700 bg-emerald-50/50"
                          : "text-gray-400 hover:text-gray-900 hover:bg-gray-50",
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <CatIcon className="w-4 h-4 text-emerald-600/70" />
                        <span>{t("nav", cat.titleKey, lang)}</span>
                      </div>
                      <ChevronDown
                        className={cn(
                          "w-4 h-4 text-gray-400 transition-transform duration-200",
                          isExpanded ? "transform rotate-180" : "",
                        )}
                      />
                    </Button>
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
          <div className="flex items-center justify-between gap-2 px-3 py-2">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              {lang === "ml" ? "ഭാഷ" : "Language"}
            </span>
            <LanguageSwitcher />
          </div>
        </div>

        <div className="border-t border-gray-100 shrink-0">
          <div className="px-4 pt-2 pb-1">
            <PwaInstallButton />
          </div>
          <div className="p-4 pt-2">
            <Button
              onClick={() => {
                logout();
              }}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-all w-full focus-visible:ring-2 focus-visible:ring-red-500 outline-none"
            >
              <LogOut className="w-5 h-5" />
              {t("common", "signOut", lang)}
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
}

export function BottomNav({ onOpenMenu }: { onOpenMenu?: () => void }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const {
    user,
    activeClientId,
    accessToken,
    logout,
    activeStudentId,
    setActiveStudent,
  } = useAuthStore();
  const { lang } = useLanguageStore();
  const [moreOpen, setMoreOpen] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [onboardingRole, setOnboardingRole] = useState<
    "parent" | "teacher" | "admin" | null
  >(null);
  const [onboardingSlug, setOnboardingSlug] = useState("");
  const slugPrefix = useSlugPrefix();
  const { data: clientConfig } = useClientConfig({
    clientId: activeClientId ?? "",
    token: accessToken ?? "",
  });

  const commConfig = {
    showCommitteeAttendance: clientConfig?.showCommitteeAttendance,
    showCommitteeTeacherCheckin: clientConfig?.showCommitteeTeacherCheckin,
  };
  const disabledModules = clientConfig?.disabledParentModules ?? [];

  if (!user) return null;

  const isSuperAdmin = user.actorType === "SUPER_ADMIN";
  const hasActiveClient = !!activeClientId;
  const isParent = user.actorType === "PARENT";
  const studentIds = isParent ? (user.accessibleStudentIds ?? []) : [];
  const students = isParent ? (user.accessibleStudents ?? []) : [];
  const currentStudentId = activeStudentId ?? studentIds[0] ?? null;

  let allLinks = getLinksByRole(user.role, user.actorType, hasActiveClient);
  allLinks = insertArtsfestLink(allLinks, user.role, user.actorType);

  if (user.role === "committee") {
    allLinks = allLinks.filter((l) => {
      if (
        l.key === "attendance" &&
        commConfig.showCommitteeAttendance === false
      )
        return false;
      if (
        l.key === "teacherCheckin" &&
        commConfig.showCommitteeTeacherCheckin === false
      )
        return false;
      return true;
    });
  }
  if (user.actorType === "PARENT") {
    allLinks = allLinks.filter((l) => !disabledModules.includes(l.key));
  }

  const showMore = allLinks.length > 3;
  const links = showMore ? allLinks.slice(0, 3) : allLinks;
  const moreLinks = showMore ? allLinks.slice(3) : [];
  const sessionCount = Object.keys(useAuthStore.getState().sessions).length;
  const profileHref = `/${user.role}/profile`;

  const openNewSession = () => {
    setMoreOpen(false);
    setOnboardingRole(null);
    setOnboardingSlug("");
    setOnboardingOpen(true);
  };

  const renderMoreLink = (l: (typeof allLinks)[number]) => {
    const fullHref = l.isExternal
      ? l.href
      : slugPrefix
        ? `${slugPrefix}${l.href}`
        : l.href;
    const active =
      !l.isExternal && isLinkActive(pathname, fullHref, slugPrefix);
    const Icon = l.icon;
    const className = cn(
      "flex min-h-24 flex-col items-center justify-center gap-2 rounded-2xl px-3 py-4 text-center text-xs font-semibold transition-colors active:scale-[0.98]",
      active
        ? "bg-gray-50 text-emerald-700"
        : "bg-white text-gray-700 hover:bg-gray-50",
    );
    return l.isExternal ? (
      <a
        key={l.href}
        href={fullHref}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
        onClick={() => setMoreOpen(false)}
      >
        <Icon className="h-6 w-6 shrink-0 text-emerald-600" />
        <span className="leading-tight">{t("nav", l.key, lang)}</span>
      </a>
    ) : (
      <Link
        key={l.href}
        to={fullHref}
        className={className}
        onClick={() => setMoreOpen(false)}
      >
        <Icon
          className={cn(
            "h-6 w-6 shrink-0",
            active ? "text-emerald-600" : "text-gray-400",
          )}
        />
        <span className="leading-tight">{t("nav", l.key, lang)}</span>
      </Link>
    );
  };

  return (
    <>
      <nav className="lg:hidden fixed bottom-3 left-1/2  w-max -translate-x-1/2 z-30 rounded-2xl border border-white/60 bg-white/85 shadow-[0_8px_30px_rgba(15,67,45,0.12)] backdrop-blur-xl supports-[backdrop-filter]:bg-white/70 pb-safe">
        <div className="flex items-stretch justify-center gap-1 px-0">
          {links.map((l) => {
            const fullHref = l.isExternal
              ? l.href
              : slugPrefix
                ? `${slugPrefix}${l.href}`
                : l.href;
            const active =
              !l.isExternal && isLinkActive(pathname, fullHref, slugPrefix);
            const Icon = l.icon;

            if (l.isExternal) {
              return (
                <a
                  key={l.href}
                  href={fullHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "flex flex-col items-center justify-center gap-1 py-2.5 px-1 relative transition-all active:scale-95 text-gray-400",
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
                  "flex flex-col items-center justify-center gap-1 p-1 relative transition-all active:scale-95",
                  active ? "text-emerald-600" : "text-gray-400",
                )}
              >
                {/* {active && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-emerald-500 rounded-full" />
                )} */}
                <div
                  className={cn(
                    "flex items-center justify-center rounded-xl w-12 transition-all",
                    active ? " ":"",
                  )}
                >
                  <Icon
                    className={cn("w-5 h-5 shrink-0", active && "stroke-[2.5]")}
                  />
                </div>
                {/* <span
                  className={cn(
                    "text-[10px] font-semibold leading-none text-center",
                    active ? "text-emerald-600" : "text-gray-400",
                  )}
                >
                  {t("nav", l.key, lang)}
                </span> */}
              </Link>
            );
          })}

          {showMore && (
            <button
              onClick={() => setMoreOpen(true)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 py-2.5 px-1 relative transition-all active:scale-95 text-gray-400",
              )}
            >
              <div className="flex items-center justify-center rounded-xl w-10 h-7">
                <Menu className="w-5 h-5 shrink-0" />
              </div>
              {/* <span className="text-[10px] font-semibold leading-none">
                {lang === "ml" ? "കൂടുതൽ" : "More"}
              </span> */}
            </button>
          )}

          {isSuperAdmin && !hasActiveClient && !showMore && (
            <Button
              onClick={() => {
                logout();
              }}
              className="flex flex-col items-center justify-center gap-1 py-2.5 px-1 relative transition-all active:scale-95 text-red-400"
            >
              <div className="flex items-center justify-center rounded-xl w-10 h-7">
                <LogOut className="w-5 h-5 shrink-0" />
              </div>
              <span className="text-[10px] font-semibold leading-none">
                Logout
              </span>
            </Button>
          )}
        </div>
      </nav>
      <Drawer
        showCloseButton={false}
        open={moreOpen}
        onOpenChange={setMoreOpen}
        data-swipe-direction="bottom"
        // title={lang === "ml" ? "കൂടുതൽ" : "More"}
        // description={
        //   lang === "ml" ? "നാവിഗേഷൻ ഓപ്ഷനുകൾ" : "All navigation options"
        // }

        contentClassName="px-4 py-3"
      >
       
        <ButtonGroup
          orientation="vertical"
          style={{ gap: 0 }}
          className="w-full border rounded-lg border-gray-100"
        >
          <Link
            to={profileHref}
            onClick={() => setMoreOpen(false)}
            className="flex items-center gap-3 p-2 px-3"
          >
            <Avatar size="lg" >
              <AvatarImage src={user.photoUrl!} />
              <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
            </Avatar>

            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-bold text-gray-900">
                {user.name}
              </span>
              <span className="block truncate text-xs capitalize text-gray-700">
                {user.role}
              </span>
            </span>
            <ChevronRight className="h-5 w-5 shrink-0 text-gray-600" />
          </Link>
          <ButtonGroup className="grid grid-cols-3 p-1 border-gray-100 gap-px border-t w-full">
            {sessionCount > 1 && (
              <Button
                variant={"ghost"}
                size={"lg"}
                onClick={() => {
                  setMoreOpen(false);
                  navigate("/");
                }}
              >
                {lang === "ml" ? "സെഷൻ മാറ്റുക" : "Switch session"}
              </Button>
            )}
            <Button size={"lg"} variant={"ghost"} onClick={openNewSession}>
              <span className="block text-base leading-none">+</span>
              {lang === "ml" ? "സെഷൻ ചേർക്കുക" : "Add session"}
            </Button>
            <Button
              size={"lg"}
              variant={"ghost"}
              onClick={() => {
                setMoreOpen(false);
                logout();
              }}
            >
              {lang === "ml" ? "പുറത്തുകടക്കുക" : "Sign out"}
            </Button>
          </ButtonGroup>
        </ButtonGroup>


         {isParent && studentIds.length > 0 && (
          <div className="border-b border-gray-100  py-3">
            <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
              {lang === "ml" ? "വിദ്യാർത്ഥിയെ തിരഞ്ഞെടുക്കുക" : "Switch student"}
            </p>
            <ButtonGroup
              orientation="vertical"
              style={{ gap: 0 }}
              className="w-full rounded-lg border overflow-hidden border-gray-100  *:border-b *:border-gray-100"
            >
              {studentIds.map((id) => {
                const student = students.find((item) => item.id === id);
                const name = student?.name ?? "Student";
                const isActive = currentStudentId === id;

                return (
                  <button
                    key={id}
                    onClick={() => {
                      setActiveStudent(id);
                      setMoreOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center gap-3  p-3  text-left transition-colors",
                      isActive
                        ? "bg-linear-90 from-gray-100 to-transparent text-primary"
                        : "hover:bg-gray-50 active:bg-gray-100",
                    )}
                  >
                    <Avatar size="sm">
                      <AvatarImage src={student?.photoUrl ?? undefined} />
                      <AvatarFallback>
                        {name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold  ">
                        {name}
                      </p>
                      <p className="shrink-0 text-xs text-gray-500">
                        {student?.className ?? "—"}
                      </p>
                    </div>
                  </button>
                );
              })}
            </ButtonGroup>
          </div>
        )}
        <div className="grid grid-cols-4 gap-2 py-3">
            {moreLinks.map(renderMoreLink)}
        </div>
      </Drawer>
      <OnboardingDrawer
        open={onboardingOpen}
        onOpenChange={setOnboardingOpen}
        role={onboardingRole}
        setRole={setOnboardingRole}
        slug={onboardingSlug}
        setSlug={setOnboardingSlug}
        onClearSlug={() => {
          setOnboardingSlug("");
          setOnboardingRole(null);
        }}
        onSubmit={(event) => {
          event.preventDefault();
          if (onboardingRole && onboardingSlug.trim())
            navigate(
              `/m/${onboardingSlug.trim().toLowerCase()}/${onboardingRole}`,
            );
        }}
      />
    </>
  );
}
