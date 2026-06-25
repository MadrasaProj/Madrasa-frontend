import {
  Bell, Star, Users, IndianRupee, GraduationCap, Activity, TrendingUp,
  LayoutDashboard, Megaphone, BarChart3, FileBarChart2, ClipboardList,
  BookMarked, Layers, FileSpreadsheet,
} from "lucide-react";
import type { ProfileConfig } from "./ProfilePage";

export const teacherProfileConfig: ProfileConfig = {
  roleLabel: "Teacher",
  roleShort: "TEACHER",
  roleBadgeClass: "bg-blue-100",
  roleBadgeTextClass: "text-blue-700",
  homePath: "/teacher",
  notifPath: "/teacher/notifications",
  quickLinks: [
    { label: "Dashboard",    icon: Activity,     href: "/teacher" },
    { label: "Notifications",icon: Bell,         href: "/teacher/notifications" },
    { label: "Performance",  icon: Star,         href: "/teacher/performance" },
    { label: "Attendance",   icon: ClipboardList,href: "/teacher/attendance" },
  ],
  showMsrId: true,
};

export const parentProfileConfig: ProfileConfig = {
  roleLabel: "Parent",
  roleShort: "PARENT",
  roleBadgeClass: "bg-amber-100",
  roleBadgeTextClass: "text-amber-700",
  homePath: "/parent",
  notifPath: "/parent/notifications",
  quickLinks: [
    { label: "Dashboard",     icon: LayoutDashboard, href: "/parent" },
    { label: "Notifications", icon: Bell,            href: "/parent/notifications" },
    { label: "Attendance",    icon: ClipboardList,   href: "/parent/attendance" },
    { label: "Fees",          icon: IndianRupee,     href: "/parent/fees" },
  ],
  showParentExtras: true,
};

export const adminProfileConfig: ProfileConfig = {
  roleLabel: "Madrasa Admin",
  roleShort: "MAD_ADMIN",
  roleBadgeClass: "bg-emerald-100",
  roleBadgeTextClass: "text-emerald-700",
  homePath: "/admin",
  notifPath: "/admin/notifications",
  quickLinks: [
    { label: "Dashboard",     icon: LayoutDashboard, href: "/admin" },
    { label: "Students",      icon: Users,           href: "/admin/students" },
    { label: "Teachers",      icon: GraduationCap,   href: "/admin/teachers" },
    { label: "Classes",       icon: Layers,          href: "/admin/classes" },
    { label: "Exams",         icon: BookMarked,      href: "/admin/exams" },
    { label: "Fees",          icon: IndianRupee,     href: "/admin/fees" },
    { label: "Reports",       icon: FileSpreadsheet, href: "/admin/reports" },
    { label: "Notifications", icon: Bell,            href: "/admin/notifications" },
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
    { label: "Dashboard",     icon: LayoutDashboard, href: "/admin" },
    { label: "Madrasas",      icon: TrendingUp,      href: "/admin/madrasas" },
    { label: "Super Users",   icon: Users,           href: "/admin/super-users" },
    { label: "Reports",       icon: BarChart3,       href: "/admin/platform-reports" },
  ],
};

export const committeeProfileConfig: ProfileConfig = {
  roleLabel: "Committee",
  roleShort: "COMMITTEE",
  roleBadgeClass: "bg-blue-100",
  roleBadgeTextClass: "text-blue-700",
  homePath: "/committee",
  notifPath: "/committee",
  quickLinks: [
    { label: "Dashboard",     icon: LayoutDashboard, href: "/committee" },
    { label: "Students",      icon: Users,           href: "/committee/students" },
    { label: "Reports",       icon: FileBarChart2,   href: "/committee/reports" },
    { label: "Announcements", icon: Megaphone,       href: "/committee/announcements" },
  ],
};
