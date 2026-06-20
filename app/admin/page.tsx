import { useState, useEffect, useMemo } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { ActionCard } from "@/components/ui/Cards";
import { SectionHeader } from "@/components/ui/PageHeader";
import { ApiErrorBanner } from "@/components/ui/ApiErrorBanner";
import { DataTable, type Column, type SortDir } from "@/components/ui/DataTable";
import {
  useStudentStats,
  useReportFeeSummary,
  useAttendanceSummary,
  useSuperAdminClients,
} from "@/lib/api-hooks";
import { useAuthStore } from "@/store/auth";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Users, CreditCard, BookOpen, BarChart3, Settings, GraduationCap,
  BookMarked, ClipboardList, Loader2, Building2, ShieldCheck,
  UserCircle2, LogIn, CheckCircle, XCircle,
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

function PlatformOverview() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { data: clientsData, isLoading: loading, error } = useSuperAdminClients();

  const clients = clientsData?.data ?? [];
  const totalClients = clients.length;
  const activeClients = clients.filter((c) => c.status === "ACTIVE").length;
  const totalStudents = clients.reduce((s, c) => s + (c._count?.students ?? 0), 0);
  const totalStaff = clients.reduce((s, c) => s + (c._count?.users ?? 0), 0);

  const statCards = [
    { label: "Total Madrasas",  value: loading ? "…" : totalClients,  },
    { label: "Active",          value: loading ? "…" : activeClients, },
    { label: "Total Students",  value: loading ? "…" : totalStudents, },
    { label: "Total Staff",     value: loading ? "…" : totalStaff,    },
  ];

  const quickActions = [
    { title: "Madrasas",         icon: Building2,   href: "/admin/madrasas",         desc: "Manage all madrasas" },
    { title: "Admin Users",      icon: ShieldCheck, href: "/admin/super-users",      desc: "Platform administrators" },
    { title: "Platform Reports", icon: BarChart3,   href: "/admin/platform-reports", desc: "Analytics & stats" },
    { title: "Profile",          icon: UserCircle2, href: "/admin/profile",          desc: "Your account settings" },
  ];

  return (
    <>
      {error && <ApiErrorBanner message={(error as Error).message} />}

      {/* Stats banner */}
      <div className="mb-5">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-emerald-800 to-teal-600 rounded-3xl p-5 text-white"
        >
          <p className="text-indigo-200 text-xs font-semibold uppercase tracking-widest mb-1">
            Super Admin Platform
          </p>
          <h1 className="text-xl font-bold mb-3">Welcome, {user?.name ?? "Admin"}</h1>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            {statCards.map((s) => (
              <div key={s.label} className="bg-white/15 rounded-2xl p-2.5 text-center">
                <p className="text-lg font-black text-white">{s.value}</p>
                <p className="text-[10px] text-indigo-200 leading-tight">{s.label}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Quick actions */}
      <SectionHeader title="Quick Actions" className="mb-3" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {quickActions.map((a, i) => (
          <motion.div key={a.title} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <ActionCard title={a.title} description={a.desc} icon={a.icon} onClick={() => navigate(a.href)} />
          </motion.div>
        ))}
      </div>
    </>
  );
}

// ── Madrasa Admin Dashboard ────────────────────────────────────────────────────

function MadrasaAdminDashboard() {
  const { user, activeClientId } = useAuthStore();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const slugMatch = pathname.match(/^\/m\/([^/]+)\//);
  const slugPrefix = slugMatch ? `/m/${slugMatch[1]}` : "";

  const ayId  = user?.defaultAcademicYearId ?? "";

  const { data: stu, isLoading: statsLoading } = useStudentStats();
  const { data: fee } = useReportFeeSummary(ayId || undefined);
  const { data: att } = useAttendanceSummary();

  const loading = statsLoading;

  const stats = useMemo(() => {
    const collectionPct = fee
      ? (() => { const c = Number(fee.totalCollected); const p = Number(fee.totalPending); const t = c + p; return t > 0 ? Math.round((c / t) * 100) : 0; })()
      : 0;
    return {
      totalStudents: stu?.total ?? 0,
      activeStudents: stu?.byStatus.find((s: any) => s.status === "ACTIVE")?._count.id ?? 0,
      collectionPct,
      attRate: att?.rate ?? 0,
    };
  }, [stu, fee, att]);

  const statCards = [
    { label: "Total Students",  value: stats.totalStudents,       color: "text-blue-600" },
    { label: "Active Students", value: stats.activeStudents,      color: "text-emerald-600" },
    { label: "Fee Collection",  value: `${stats.collectionPct}%`, color: "text-amber-600" },
    { label: "Attendance Rate", value: `${stats.attRate}%`,       color: "text-emerald-600" },
  ];

  const quickActions = [
    { title: "Students",      icon: GraduationCap, href: `${slugPrefix}/admin/students`,      desc: "Manage student records" },
    { title: "Teachers",      icon: Users,         href: `${slugPrefix}/admin/teachers`,      desc: "Staff management" },
    { title: "Attendance",    icon: ClipboardList, href: `${slugPrefix}/admin/present`,       desc: "Today's attendance" },
    { title: "Teacher Check-in", icon: ClipboardList, href: `${slugPrefix}/admin/teacher-attendance`,  desc: "Teacher attendance" },
    { title: "Fees",          icon: CreditCard,    href: `${slugPrefix}/admin/fees`,          desc: "Fee management" },
    { title: "Exams",         icon: BookOpen,      href: `${slugPrefix}/admin/exams`,         desc: "Results & exams" },
    { title: "Notifications", icon: BookMarked,    href: `${slugPrefix}/admin/notifications`, desc: "Send announcements" },
    { title: "Reports",       icon: BarChart3,     href: `${slugPrefix}/admin/reports`,       desc: "Analytics & audit logs" },
    { title: "Configuration", icon: Settings,      href: `${slugPrefix}/admin/config`,        desc: "Madrasa settings" },
  ];

  return (
    <>
      <div className="mb-5">
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-emerald-700 to-teal-600 rounded-3xl p-5 text-white">
          <p className="text-emerald-200 text-xs font-semibold uppercase tracking-widest mb-1">Admin Dashboard</p>
          <h1 className="text-xl font-bold mb-3">Welcome back</h1>
          {loading ? (
            <div className="flex items-center gap-2 text-emerald-200"><Loader2 className="w-4 h-4 animate-spin" /><span className="text-sm">Loading stats...</span></div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
              {statCards.map((s) => (
                <div key={s.label} className="bg-white/15 rounded-2xl p-2.5 text-center">
                  <p className="text-lg font-black">{s.value}</p>
                  <p className="text-[10px] text-emerald-200 leading-tight">{s.label}</p>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
      <SectionHeader title="Quick Actions" className="mb-3" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pb-20">
        {quickActions.map((a, i) => (
          <motion.div key={a.title} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <ActionCard title={a.title} description={a.desc} icon={a.icon} onClick={() => navigate(a.href)} />
          </motion.div>
        ))}
      </div>
    </>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const { user, activeClientId } = useAuthStore();
  const isSuperAdmin = user?.actorType === "SUPER_ADMIN" && !activeClientId;
  return (
    <DashboardLayout>
      {isSuperAdmin ? <PlatformOverview /> : <MadrasaAdminDashboard />}
    </DashboardLayout>
  );
}
