import { t } from "@/lib/i18n";
import {
  Bell, Star, Users, IndianRupee, GraduationCap, Activity, TrendingUp,
  LayoutDashboard, Megaphone, BarChart3, FileBarChart2, ClipboardList,
  BookMarked, Layers, FileSpreadsheet,
} from "lucide-react";
import type { ProfileConfig } from "./ProfilePage";

function tl(key: string): string {
  return t("common", key as any, "en");
}

export const teacherProfileConfig: ProfileConfig = {
  roleLabel: t("common", "teacher", "en"),
  roleShort: "TEACHER",
  roleBadgeClass: "bg-blue-100",
  roleBadgeTextClass: "text-blue-700",
  homePath: "/teacher",
  notifPath: "/teacher/notifications",
  quickLinks: [
    { label: t("nav", "dashboard", "en"),       icon: Activity,     href: "/teacher" },
    { label: t("nav", "notifications", "en"),   icon: Bell,         href: "/teacher/notifications" },
    { label: t("nav", "performance", "en"),     icon: Star,         href: "/teacher/performance" },
    { label: t("nav", "attendance", "en"),      icon: ClipboardList,href: "/teacher/attendance" },
  ],
  showMsrId: true,
};

export const parentProfileConfig: ProfileConfig = {
  roleLabel: t("common", "parent", "en"),
  roleShort: "PARENT",
  roleBadgeClass: "bg-amber-100",
  roleBadgeTextClass: "text-amber-700",
  homePath: "/parent",
  notifPath: "/parent/notifications",
  quickLinks: [
    { label: t("nav", "dashboard", "en"),       icon: LayoutDashboard, href: "/parent" },
    { label: t("nav", "notifications", "en"),   icon: Bell,            href: "/parent/notifications" },
    { label: t("nav", "attendance", "en"),      icon: ClipboardList,   href: "/parent/attendance" },
    { label: t("nav", "fees", "en"),            icon: IndianRupee,     href: "/parent/fees" },
  ],
  showParentExtras: true,
};

export const adminProfileConfig: ProfileConfig = {
  roleLabel: t("common", "admin", "en") + " Admin",
  roleShort: "MAD_ADMIN",
  roleBadgeClass: "bg-emerald-100",
  roleBadgeTextClass: "text-emerald-700",
  homePath: "/admin",
  notifPath: "/admin/notifications",
  quickLinks: [
    { label: t("nav", "dashboard", "en"),       icon: LayoutDashboard, href: "/admin" },
    { label: t("nav", "students", "en"),        icon: Users,           href: "/admin/students" },
    { label: t("nav", "teachers", "en"),        icon: GraduationCap,   href: "/admin/teachers" },
    { label: t("nav", "classes", "en"),         icon: Layers,          href: "/admin/classes" },
    { label: t("nav", "exams", "en"),           icon: BookMarked,      href: "/admin/exams" },
    { label: t("nav", "fees", "en"),            icon: IndianRupee,     href: "/admin/fees" },
    { label: t("nav", "reports", "en"),         icon: FileSpreadsheet, href: "/admin/reports" },
    { label: t("nav", "notifications", "en"),   icon: Bell,            href: "/admin/notifications" },
  ],
};

export const superAdminProfileConfig: ProfileConfig = {
  roleLabel: "Super Admin",
  roleShort: "SUPER_ADMIN",
  roleBadgeClass: "bg-indigo-100",
  roleBadgeTextClass: "text-indigo-700",
  homePath: "/admin",
  notifPath: "/admin/notifications",
  quickLinks: [
    { label: t("nav", "dashboard", "en"),       icon: LayoutDashboard, href: "/admin" },
    { label: t("nav", "madrasas", "en"),        icon: TrendingUp,      href: "/admin/madrasas" },
    { label: t("nav", "superUsers", "en"),      icon: Users,           href: "/admin/super-users" },
    { label: t("nav", "platformReports", "en"), icon: BarChart3,       href: "/admin/platform-reports" },
  ],
};

export const committeeProfileConfig: ProfileConfig = {
  roleLabel: t("nav", "committee", "en"),
  roleShort: "COMMITTEE",
  roleBadgeClass: "bg-blue-100",
  roleBadgeTextClass: "text-blue-700",
  homePath: "/committee",
  notifPath: "/committee",
  quickLinks: [
    { label: t("nav", "dashboard", "en"),       icon: LayoutDashboard, href: "/committee" },
    { label: t("nav", "students", "en"),        icon: Users,           href: "/committee/students" },
    { label: t("nav", "reports", "en"),         icon: FileBarChart2,   href: "/committee/reports" },
    { label: t("nav", "announcements", "en"),   icon: Megaphone,       href: "/committee/announcements" },
  ],
};
