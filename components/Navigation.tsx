import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Users, ClipboardList, BookOpen, FileText,
  CreditCard, BarChart3, Bell, Settings, Star, BookMarked,
  UserCircle, Home, GraduationCap, Moon, IndianRupee,
  BadgeCheck, FileBarChart2, Megaphone, UserCog, Activity, LogOut,
  Building2, ShieldCheck, UserCircle2,
} from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { useLanguageStore } from "@/store/language";
import { t } from "@/lib/i18n";
import { tenantLoginPath } from "@/lib/tenant-routing";

type NavKey =
  | "dashboard" | "students" | "teachers" | "fees" | "otherPayments"
  | "idCards" | "exams" | "reports" | "logs" | "config" | "attendance"
  | "homework" | "diary" | "ibadah" | "performance" | "home"
  | "results" | "alerts" | "overview" | "finance" | "announcements" | "notifications"
  | "madrasas" | "superUsers" | "platformReports" | "profile";

const adminLinks = [
  { href: "/admin",                icon: LayoutDashboard, key: "dashboard" as NavKey },
  { href: "/admin/students",       icon: Users,           key: "students"  as NavKey },
  { href: "/admin/teachers",       icon: UserCog,         key: "teachers"  as NavKey },
  { href: "/admin/fees",           icon: CreditCard,      key: "fees"      as NavKey },
  { href: "/admin/other-payments", icon: IndianRupee,     key: "otherPayments" as NavKey },
  { href: "/admin/id-cards",       icon: BadgeCheck,      key: "idCards"   as NavKey },
  { href: "/admin/exams",          icon: GraduationCap,   key: "exams"     as NavKey },
  { href: "/admin/reports",        icon: BarChart3,       key: "reports"       as NavKey },
  { href: "/admin/logs",           icon: Activity,        key: "logs"          as NavKey },
  { href: "/admin/notifications",  icon: Bell,            key: "notifications" as NavKey },
  { href: "/admin/config",         icon: Settings,        key: "config"        as NavKey },
  { href: "/admin/profile",        icon: UserCircle2,     key: "profile"       as NavKey },
];

const teacherLinks = [
  { href: "/teacher",              icon: LayoutDashboard, key: "dashboard"    as NavKey },
  { href: "/teacher/attendance",   icon: ClipboardList,   key: "attendance"   as NavKey },
  { href: "/teacher/homework",     icon: BookOpen,        key: "homework"     as NavKey },
  { href: "/teacher/diary",        icon: FileText,        key: "diary"        as NavKey },
  { href: "/teacher/ibadah",       icon: Moon,            key: "ibadah"       as NavKey },
  { href: "/teacher/exams",        icon: GraduationCap,   key: "exams"        as NavKey },
  { href: "/teacher/performance",  icon: Star,            key: "performance"  as NavKey },
  { href: "/teacher/notifications",icon: Bell,            key: "notifications"as NavKey },
  { href: "/teacher/profile",      icon: UserCircle2,     key: "profile"      as NavKey },
];

const parentLinks = [
  { href: "/parent",               icon: Home,            key: "home"         as NavKey },
  { href: "/parent/attendance",    icon: ClipboardList,   key: "attendance"   as NavKey },
  { href: "/parent/homework",      icon: BookOpen,        key: "homework"     as NavKey },
  { href: "/parent/ibadah",        icon: Moon,            key: "ibadah"       as NavKey },
  { href: "/parent/fees",          icon: CreditCard,      key: "fees"         as NavKey },
  { href: "/parent/results",       icon: GraduationCap,   key: "results"      as NavKey },
  { href: "/parent/notifications", icon: Bell,            key: "notifications"as NavKey },
  { href: "/parent/profile",       icon: UserCircle2,     key: "profile"      as NavKey },
];

const committeeLinks = [
  { href: "/committee",               icon: BarChart3,     key: "overview"      as NavKey },
  { href: "/committee/finance",       icon: IndianRupee,   key: "finance"       as NavKey },
  { href: "/committee/students",      icon: Users,         key: "students"      as NavKey },
  { href: "/committee/attendance",    icon: ClipboardList, key: "attendance"    as NavKey },
  { href: "/committee/reports",       icon: FileBarChart2, key: "reports"       as NavKey },
  { href: "/committee/announcements", icon: Megaphone,     key: "announcements" as NavKey },
  { href: "/committee/profile",       icon: UserCircle2,   key: "profile"       as NavKey },
];

const superAdminLinks = [
  { href: "/admin",                    icon: LayoutDashboard, key: "dashboard"       as NavKey },
  { href: "/admin/madrasas",           icon: Building2,       key: "madrasas"        as NavKey },
  { href: "/admin/super-users",        icon: ShieldCheck,     key: "superUsers"      as NavKey },
  { href: "/admin/platform-reports",   icon: BarChart3,       key: "platformReports" as NavKey },
  { href: "/admin/profile",            icon: UserCircle2,     key: "profile"         as NavKey },
];

function getLinksByRole(role: string, actorType?: string, hasActiveClient?: boolean) {
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

export function Sidebar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, activeClientId, logout } = useAuthStore();
  const { lang } = useLanguageStore();
  const slugPrefix = useSlugPrefix();
  if (!user) return null;

  const isSuperAdmin = user.actorType === "SUPER_ADMIN";
  const hasActiveClient = !!activeClientId;
  const links = getLinksByRole(user.role, user.actorType, hasActiveClient);

  return (
    <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-gray-100 h-screen overflow-hidden fixed left-0 top-0 z-40">
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center">
            <BookMarked className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-gray-900 text-sm leading-tight">{t("common", "appName", lang)}</p>
            <p className="text-xs text-gray-500">{t("common", "madrasa", lang)}</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-3 bg-emerald-50 rounded-xl p-3">
          <div className="w-9 h-9 bg-emerald-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
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

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {links.map(({ href, icon: Icon, key }) => {
          const fullHref = slugPrefix ? `${slugPrefix}${href}` : href;
          const active = pathname === fullHref || (!ROOT_PATHS.includes(fullHref) && pathname.startsWith(fullHref));
          return (
            <Link
              key={href}
              to={fullHref}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                active ? "bg-emerald-600 text-white shadow-sm" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
              )}
            >
              <Icon className="w-5 h-5 shrink-0" />
              {t("nav", key, lang)}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-100">
        <button
          onClick={() => {
            logout();
            navigate(isSuperAdmin ? "/super-admin/login" : tenantLoginPath(user.tenantSlug), { replace: true });
          }}
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-all w-full"
        >
          <UserCircle className="w-5 h-5" />
          {t("common", "signOut", lang)}
        </button>
      </div>
    </aside>
  );
}

export function BottomNav() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, activeClientId, logout } = useAuthStore();
  const { lang } = useLanguageStore();
  const slugPrefix = useSlugPrefix();
  if (!user) return null;

  const isSuperAdmin = user.actorType === "SUPER_ADMIN";
  const hasActiveClient = !!activeClientId;
  const links = getLinksByRole(user.role, user.actorType, hasActiveClient).slice(0, isSuperAdmin && !hasActiveClient ? 4 : 5);

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-50 pb-safe">
      <div className="flex items-stretch justify-around px-1">
        {links.map(({ href, icon: Icon, key }) => {
          const fullHref = slugPrefix ? `${slugPrefix}${href}` : href;
          const active = pathname === fullHref || (!ROOT_PATHS.includes(fullHref) && pathname.startsWith(fullHref));
          return (
            <Link
              key={href}
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
              <span className={cn("text-[10px] font-semibold leading-none", active ? "text-emerald-600" : "text-gray-400")}>
                {t("nav", key, lang)}
              </span>
            </Link>
          );
        })}
        {isSuperAdmin && !hasActiveClient && (
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
