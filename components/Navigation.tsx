"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  BookOpen,
  FileText,
  CreditCard,
  BarChart3,
  Bell,
  Settings,
  Star,
  BookMarked,
  UserCircle,
  Home,
  GraduationCap,
  Moon,
  Image,
  IndianRupee,
  BadgeCheck,
  Vote,
  FileBarChart2,
  Megaphone,
  Receipt,
} from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { useLanguageStore } from "@/store/language";
import { t } from "@/lib/i18n";
import {
  stripTenantPrefix,
  tenantLoginPath,
  withTenantPrefix,
} from "@/lib/tenant-routing";

type NavKey =
  | "dashboard"
  | "students"
  | "fees"
  | "otherPayments"
  | "idCards"
  | "exams"
  | "reports"
  | "seats"
  | "sksbv"
  | "posters"
  | "config"
  | "attendance"
  | "homework"
  | "diary"
  | "ibadah"
  | "performance"
  | "home"
  | "results"
  | "alerts"
  | "elections"
  | "overview"
  | "finance"
  | "committee"
  | "announcements"
  | "expenses";

const adminLinks: {
  href: string;
  icon: typeof LayoutDashboard;
  key: NavKey;
}[] = [
  { href: "/admin", icon: LayoutDashboard, key: "dashboard" },
  { href: "/admin/students", icon: Users, key: "students" },
  { href: "/admin/fees", icon: CreditCard, key: "fees" },
  { href: "/admin/other-payments", icon: IndianRupee, key: "otherPayments" },
  { href: "/admin/id-cards", icon: BadgeCheck, key: "idCards" },
  { href: "/admin/exams", icon: GraduationCap, key: "exams" },
  { href: "/admin/reports", icon: BarChart3, key: "reports" },
  { href: "/admin/seats", icon: BookMarked, key: "seats" },
  { href: "/admin/sksbv", icon: Star, key: "sksbv" },
  { href: "/admin/posters", icon: Image, key: "posters" },
  { href: "/admin/elections", icon: Vote, key: "elections" },
  { href: "/admin/config", icon: Settings, key: "config" },
];

const teacherLinks: {
  href: string;
  icon: typeof LayoutDashboard;
  key: NavKey;
}[] = [
  { href: "/teacher", icon: LayoutDashboard, key: "dashboard" },
  { href: "/teacher/attendance", icon: ClipboardList, key: "attendance" },
  { href: "/teacher/homework", icon: BookOpen, key: "homework" },
  { href: "/teacher/diary", icon: FileText, key: "diary" },
  { href: "/teacher/ibadah", icon: Moon, key: "ibadah" },
  { href: "/teacher/exams", icon: GraduationCap, key: "exams" },
  { href: "/teacher/performance", icon: Star, key: "performance" },
  { href: "/teacher/elections", icon: Vote, key: "elections" },
];

const parentLinks: {
  href: string;
  icon: typeof LayoutDashboard;
  key: NavKey;
}[] = [
  { href: "/parent", icon: Home, key: "home" },
  { href: "/parent/attendance", icon: ClipboardList, key: "attendance" },
  { href: "/parent/homework", icon: BookOpen, key: "homework" },
  { href: "/parent/ibadah", icon: Moon, key: "ibadah" },
  { href: "/parent/fees", icon: CreditCard, key: "fees" },
  { href: "/parent/results", icon: GraduationCap, key: "results" },
  { href: "/parent/elections", icon: Vote, key: "elections" },
  { href: "/parent/notifications", icon: Bell, key: "alerts" },
];

const committeeLinks: {
  href: string;
  icon: typeof LayoutDashboard;
  key: NavKey;
}[] = [
  { href: "/committee", icon: BarChart3, key: "overview" },
  { href: "/committee/finance", icon: IndianRupee, key: "finance" },
  { href: "/committee/expenses", icon: Receipt, key: "expenses" },
  { href: "/committee/students", icon: Users, key: "students" },
  { href: "/committee/attendance", icon: ClipboardList, key: "attendance" },
  { href: "/committee/elections", icon: Vote, key: "elections" },
  { href: "/committee/reports", icon: FileBarChart2, key: "reports" },
  { href: "/committee/announcements", icon: Megaphone, key: "announcements" },
];

function getLinksByRole(role: string) {
  if (role === "admin") return adminLinks;
  if (role === "teacher") return teacherLinks;
  if (role === "committee") return committeeLinks;
  return parentLinks;
}

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const { lang } = useLanguageStore();
  if (!user) return null;
  const shouldUseTenant = user.actorType !== "SUPER_ADMIN";
  const links = getLinksByRole(user.role);
  const uiPath = stripTenantPrefix(pathname);

  return (
    <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-gray-100 min-h-screen fixed left-0 top-0 z-40">
      {/* Logo */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center">
            <BookMarked className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-gray-900 text-sm leading-tight">
              {t("common", "appName", lang)}
            </p>
            <p className="text-xs text-gray-500">
              {t("common", "madrasa", lang)}
            </p>
          </div>
        </div>
      </div>

      {/* User info */}
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-3 bg-emerald-50 rounded-xl p-3">
          <div className="w-9 h-9 bg-emerald-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
            {user.name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">
              {user.name}
            </p>
            <p className="text-xs text-emerald-700 capitalize">
              {t("common", user.role as "admin" | "teacher" | "parent", lang)}
            </p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {links.map(({ href, icon: Icon, key }) => {
          const finalHref = withTenantPrefix(
            href,
            shouldUseTenant ? user.tenantSlug : undefined,
          );
          const active =
            uiPath === href ||
            (href !== "/admin" &&
              href !== "/teacher" &&
              href !== "/parent" &&
              uiPath.startsWith(href));
          return (
            <Link
              key={href}
              href={finalHref}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                active
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
              )}
            >
              <Icon className="w-5 h-5 shrink-0" />
              {t("nav", key, lang)}
            </Link>
          );
        })}
      </nav>

      {/* Notifications link */}
      <div className="p-4 border-t border-gray-100">
        <Link
          href={withTenantPrefix(
            `/${user.role}/notifications`,
            shouldUseTenant ? user.tenantSlug : undefined,
          )}
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all"
        >
          <Bell className="w-5 h-5" />
          {t("common", "notifications", lang)}
        </Link>
        <button
          onClick={() => {
            logout();
            window.location.href = shouldUseTenant
              ? tenantLoginPath(user.tenantSlug)
              : "/super-admin/login";
          }}
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-all w-full mt-1"
        >
          <UserCircle className="w-5 h-5" />
          {t("common", "signOut", lang)}
        </button>
      </div>
    </aside>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const { lang } = useLanguageStore();
  if (!user) return null;
  const shouldUseTenant = user.actorType !== "SUPER_ADMIN";
  const links = getLinksByRole(user.role).slice(0, 5);
  const uiPath = stripTenantPrefix(pathname);

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-50 pb-safe">
      <div className="flex items-stretch justify-around px-1">
        {links.map(({ href, icon: Icon, key }) => {
          const finalHref = withTenantPrefix(
            href,
            shouldUseTenant ? user.tenantSlug : undefined,
          );
          const active =
            uiPath === href ||
            (href !== "/admin" &&
              href !== "/teacher" &&
              href !== "/parent" &&
              uiPath.startsWith(href));
          return (
            <Link
              key={href}
              href={finalHref}
              className={cn(
                "flex flex-col items-center justify-center gap-1 py-2.5 px-2 min-w-0 flex-1 relative transition-all active:scale-95",
                active ? "text-emerald-600" : "text-gray-400",
              )}
            >
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-emerald-500 rounded-full" />
              )}
              <div
                className={cn(
                  "flex items-center justify-center rounded-xl transition-all",
                  active ? "bg-emerald-50 w-10 h-7" : "w-10 h-7",
                )}
              >
                <Icon
                  className={cn("w-5 h-5 shrink-0", active && "stroke-[2.5]")}
                />
              </div>
              <span
                className={cn(
                  "text-[10px] font-semibold leading-none",
                  active ? "text-emerald-600" : "text-gray-400",
                )}
              >
                {t("nav", key, lang)}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
