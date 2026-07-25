import { useState, useEffect, useMemo } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { ActionCard } from "@/components/ui/Cards";
import { SectionHeader } from "@/components/ui/PageHeader";
import { ApiErrorBanner } from "@/components/ui/ApiErrorBanner";
import { DataTable, type Column, type SortDir } from "@/components/ui/DataTable";
import { type ClientListItem } from "@/lib/super-admin-api";
import { useStudentStats, useFeeSummary, useAttendanceSummary, useClients } from "@/lib/queries";
import { useAuthStore } from "@/store/auth";
import OperationsDashboard from "./crm/operations";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Users, CreditCard, BookOpen, BarChart3, Settings, GraduationCap,
  BookMarked, ClipboardList, Loader2, Building2, ShieldCheck,
  UserCircle2, LogIn, CheckCircle, XCircle,
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

function PlatformOverview() {
  const { user, accessToken } = useAuthStore();
  const navigate = useNavigate();

  const { data: clientsData, isLoading: loading, error: clientsError, refetch } = useClients(accessToken ?? "");
  const clients = clientsData?.data ?? [];
  const error = clientsError ? clientsError.message : null;

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
      {error && <ApiErrorBanner message={error} onRetry={() => refetch()} />}

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
  const { user, accessToken, activeClientId } = useAuthStore();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const slugMatch = pathname.match(/^\/m\/([^/]+)\//);
  const slugPrefix = slugMatch ? `/m/${slugMatch[1]}` : "";

  const cid   = activeClientId ?? "";
  const token = accessToken ?? "";
  const ayId  = user?.defaultAcademicYearId ?? "";

  const { data: studentStats, isLoading: loadingStudentStats } = useStudentStats({ clientId: cid, token });
  const { data: feeSummary, isLoading: loadingFeeSummary } = useFeeSummary({ clientId: cid, token }, ayId || undefined);
  const { data: attendanceSummary, isLoading: loadingAttendanceSummary } = useAttendanceSummary({ clientId: cid, token });

  const loading = loadingStudentStats || loadingFeeSummary || loadingAttendanceSummary;

  const stats = useMemo(() => {
    return {
      totalStudents: studentStats?.total ?? 0,
      activeStudents: studentStats?.byStatus.find((s: any) => s.status === "ACTIVE")?._count.id ?? 0,
      collectionPct: feeSummary
        ? (() => {
            const c = Number(feeSummary.totalCollected);
            const p = Number(feeSummary.totalPending);
            const t = c + p;
            return t > 0 ? Math.round((c / t) * 100) : 0;
          })()
        : 0,
      attRate: attendanceSummary?.rate ?? 0,
    };
  }, [studentStats, feeSummary, attendanceSummary]);

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
  const isPlatformUser = [
    "SUPER_ADMIN",
    "SALES_EXECUTIVE",
    "SALES_MANAGER",
    "IMPLEMENTATION_SPECIALIST",
    "SUPPORT_EXECUTIVE",
    "CUSTOMER_SUCCESS_MANAGER",
    "FINANCE_EXECUTIVE"
  ].includes(user?.actorType ?? "") && !activeClientId;

  return (
    <DashboardLayout>
      {isPlatformUser ? <OperationsDashboard /> : <MadrasaAdminDashboard />}
    </DashboardLayout>
  );
}
