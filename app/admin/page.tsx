import { useMemo } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Skeleton } from "@/components/ui/Skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ApiErrorBanner } from "@/components/ui/ApiErrorBanner";
import { useStudentStats, useFeeSummary, useAttendanceSummary, useClients } from "@/lib/queries";
import { useAuthStore } from "@/store/auth";
import OperationsDashboard from "./crm/operations";
import { PortalLinksCard } from "@/components/admin/PortalLinksCard";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Users, CreditCard, BookOpen, BarChart3, Settings, GraduationCap,
  BookMarked, ClipboardList, Building2, ShieldCheck,
  Briefcase, Target, LifeBuoy, CheckCircle2, ClipboardCheck,
  type LucideIcon,
} from "lucide-react";
import PwaInstallButton from "@/components/PwaInstallButton";

type StatTone = "emerald" | "blue" | "amber" | "sky";
type DashboardStat = { label: string; value: number | string; icon: LucideIcon; tone: StatTone };
type DashboardAction = { title: string; icon: LucideIcon; href: string; desc: string };

const statToneClasses: Record<StatTone, { background: string; icon: string; value: string }> = {
  emerald: { background: "bg-gradient-to-br from-emerald-50/80 to-transparent", icon: "text-emerald-700", value: "text-emerald-800" },
  blue: { background: "bg-gradient-to-br from-blue-50/80 to-transparent", icon: "text-blue-700", value: "text-blue-800" },
  amber: { background: "bg-gradient-to-br from-amber-50/80 to-transparent", icon: "text-amber-700", value: "text-amber-800" },
  sky: { background: "bg-gradient-to-br from-sky-50/80 to-transparent", icon: "text-sky-700", value: "text-sky-800" },
};

function AdminWelcomeHeader({ platform }: { platform: boolean }) {
  const { user } = useAuthStore();
  const initials = (user?.name?.trim() || "Admin")
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <header className="flex items-center gap-2.5 sm:gap-3">
      <Avatar className="size-10 shrink-0 ring-2 ring-primary-100 sm:size-11">
        <AvatarImage src={user?.photoUrl ?? undefined} alt="" />
        <AvatarFallback className="bg-primary-50 text-sm font-semibold text-primary-700">
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 my-auto h-10">
        <h1 className="truncate text-lg font-bold tracking-tight text-gray-950 sm:text-xl">
          {user?.name ?? "Admin"} <span aria-hidden="true">👋</span>
        </h1>
        <span className="relative -top-2 inline-flex rounded-full text-[11px] font-semibold text-primary-700">
          {platform ? "Super Admin Platform" : "Madrasa Admin"}
        </span>
      </div>
    </header>
  );
}

function OverviewCard({ stats, loading, title = "Overview" }: { stats: DashboardStat[]; loading: boolean; title?: string }) {
  return (
    <section aria-labelledby="admin-overview-heading">
      <h2 id="admin-overview-heading" className="mb-3 text-base font-bold text-gray-900 sm:text-lg">{title}</h2>
      <div className="grid grid-cols-2 overflow-hidden rounded-2xl bg-gradient-to-br from-primary-50/60 via-white to-sky-50/60">
        {stats.map((stat, index) => {
          const tone = statToneClasses[stat.tone];
          return (
            <div
              key={stat.label}
              className={`min-w-0 p-2.5 sm:p-3 ${tone.background} ${index < 2 ? "border-b border-gray-100" : ""} ${index % 2 === 0 ? "border-r border-gray-100" : ""}`}
            >
              <div className="flex items-center gap-1.5">
                <stat.icon aria-hidden="true" className={`size-4 shrink-0 ${tone.icon}`} />
                <span className="text-sm font-medium leading-4 text-gray-700">{stat.label}</span>
              </div>
              {loading ? (
                <Skeleton className="mt-1.5 h-6 w-14" />
              ) : (
                <span className={`mt-1.5 block text-[22px] font-medium leading-none tabular-nums ${tone.value}`}>{stat.value}</span>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function QuickActionsGrid({ actions }: { actions: DashboardAction[] }) {
  const navigate = useNavigate();

  return (
    <section aria-labelledby="admin-actions-heading" className="overflow-hidden rounded-2xl border border-gray-100 bg-white p-4 shadow-xs card sm:p-5">
      <div className="mb-3.5 flex items-center justify-between">
        <h2 id="admin-actions-heading" className="text-sm font-bold text-gray-950 sm:text-base">Quick Actions</h2>
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-600">{actions.length}</span>
      </div>
      <ul className="grid grid-cols-3 gap-2 sm:gap-3">
        {actions.map((action) => (
          <li key={action.href} className="min-w-0">
            <button
              type="button"
              onClick={() => navigate(action.href)}
              aria-label={`${action.title}: ${action.desc}`}
              className="group flex w-full flex-col items-center justify-center gap-1.5 rounded-xl p-2.5 text-center transition-colors hover:bg-gray-50 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary-50 text-primary-700 transition-colors group-hover:bg-primary-100">
                <action.icon aria-hidden="true" className="size-5" />
              </span>
              <span className="line-clamp-2 min-h-8 text-xs font-semibold leading-snug text-gray-800 group-hover:text-primary-700">
                {action.title}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function PlatformOverview() {
  const { accessToken } = useAuthStore();

  const { data: clientsData, isLoading: loading, error: clientsError, refetch } = useClients(accessToken ?? "");
  const clients = clientsData?.data ?? [];
  const error = clientsError ? clientsError.message : null;

  const totalClients = clients.length;
  const activeClients = clients.filter((c) => c.status === "ACTIVE").length;
  const totalStudents = clients.reduce((s, c) => s + (c._count?.students ?? 0), 0);
  const totalStaff = clients.reduce((s, c) => s + (c._count?.users ?? 0), 0);

  const statCards: DashboardStat[] = [
    { label: "Total Madrasas", value: totalClients, icon: Building2, tone: "blue" },
    { label: "Active", value: activeClients, icon: CheckCircle2, tone: "emerald" },
    { label: "Total Students", value: totalStudents, icon: GraduationCap, tone: "sky" },
    { label: "Total Staff", value: totalStaff, icon: Users, tone: "amber" },
  ];

  const quickActions = [
    { title: "Madrasas",         icon: Building2,   href: "/admin/madrasas",              desc: "Manage all registered madrasas" },
    { title: "Platform Reports", icon: BarChart3,   href: "/admin/platform-reports",      desc: "Global platform analytics & health" },
    { title: "CRM Operations",   icon: Briefcase,   href: "/admin/crm/operations",        desc: "SaaS operations & daily checklist" },
    { title: "Leads Pipeline",   icon: Target,      href: "/admin/crm/leads",             desc: "Sales leads & demo conversions" },
    { title: "Support Desk",     icon: LifeBuoy,    href: "/admin/crm/support",           desc: "Support tickets & SLA monitoring" },
    { title: "Admin Users",      icon: ShieldCheck, href: "/admin/super-users",           desc: "Platform administrator accounts" },
    { title: "Global Syllabus",  icon: BookOpen,    href: "/admin/global-class-subjects", desc: "Curriculum, classes & subjects" },
  ];

  return (
    <>
      {error && <ApiErrorBanner message={error} onRetry={() => refetch()} />}
      <OverviewCard title="Platform Overview" stats={statCards} loading={loading} />
      <QuickActionsGrid actions={quickActions} />
    </>
  );
}

// ── Madrasa Admin Dashboard ────────────────────────────────────────────────────

function MadrasaAdminDashboard() {
  const { user, accessToken, activeClientId, activeTenantSlug } = useAuthStore();
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

  const statCards: DashboardStat[] = [
    { label: "Total Students", value: stats.totalStudents, icon: GraduationCap, tone: "blue" },
    { label: "Active Students", value: stats.activeStudents, icon: CheckCircle2, tone: "emerald" },
    { label: "Fee Collection", value: `${stats.collectionPct}%`, icon: CreditCard, tone: "amber" },
    { label: "Attendance Rate", value: `${stats.attRate}%`, icon: ClipboardCheck, tone: "sky" },
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
      <OverviewCard stats={statCards} loading={loading} />
      <QuickActionsGrid actions={quickActions} />
      <PortalLinksCard
        slug={slugMatch ? slugMatch[1] : (activeTenantSlug ?? user?.tenantSlug ?? "")}
        madrasaName={user?.madrasaName}
      />
    </>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const { user, activeClientId } = useAuthStore();
  const isSuperAdminPlatform = user?.actorType === "SUPER_ADMIN" && !activeClientId;
  const isCrmStaff = [
    "SALES_EXECUTIVE",
    "SALES_MANAGER",
    "IMPLEMENTATION_SPECIALIST",
    "SUPPORT_EXECUTIVE",
    "CUSTOMER_SUCCESS_MANAGER",
    "FINANCE_EXECUTIVE",
    "MARKETING_MANAGER",
    "TECHNICAL_MANAGER",
  ].includes(user?.actorType ?? "") && !activeClientId;

  if (isCrmStaff) {
    return <OperationsDashboard />;
  }

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-5">
        <AdminWelcomeHeader platform={isSuperAdminPlatform} />
        <PwaInstallButton variant="banner" className="mb-2" />
        {isSuperAdminPlatform ? <PlatformOverview /> : <MadrasaAdminDashboard />}
      </div>
    </DashboardLayout>
  );
}
