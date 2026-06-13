import { useState, useEffect, useMemo } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { ActionCard } from "@/components/ui/Cards";
import { SectionHeader } from "@/components/ui/PageHeader";
import { ApiErrorBanner } from "@/components/ui/ApiErrorBanner";
import { DataTable, type Column, type SortDir } from "@/components/ui/DataTable";
import { getStudentStats, getFeeSummary, getAttendanceSummary } from "@/lib/reports-api";
import {
  listClients,
  type ClientListItem,
} from "@/lib/super-admin-api";
import { useAuthStore } from "@/store/auth";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Users, CreditCard, BookOpen, BarChart3, Settings, GraduationCap,
  BookMarked, ClipboardList, Loader2, Building2, ShieldCheck,
  UserCircle2, LogIn, CheckCircle, XCircle,
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const isExpired = (d?: string) => !!d && new Date(d) < new Date();

// ── Madrasas DataTable ────────────────────────────────────────────────────────

const MADRASA_COLUMNS: Column<ClientListItem>[] = [
  {
    key: "name",
    header: "Madrasa",
    sortable: true,
    render: (c) => (
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 bg-indigo-100 rounded-xl flex items-center justify-center shrink-0">
          <Building2 className="w-4 h-4 text-indigo-700" />
        </div>
        <div>
          <p className="font-semibold text-gray-900 text-sm leading-tight">{c.name}</p>
          <p className="text-xs font-mono text-gray-400">{c.slug}</p>
        </div>
      </div>
    ),
  },
  {
    key: "status",
    header: "Status",
    sortable: true,
    render: (c) => {
      const expired = isExpired(c.subscriptionEnd);
      return (
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={cn(
            "text-[10px] font-bold px-2 py-0.5 rounded-full",
            c.status === "ACTIVE" ? "bg-emerald-100 text-emerald-700"
              : c.status === "TRIAL" ? "bg-blue-100 text-blue-700"
              : "bg-gray-100 text-gray-500",
          )}>
            {c.status}
          </span>
          {expired && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600">EXPIRED</span>}
        </div>
      );
    },
    className: "hidden sm:table-cell",
    headerClass: "hidden sm:table-cell",
  },
  {
    key: "_count.students",
    header: "Students",
    sortable: true,
    render: (c) => <span className="text-sm font-semibold text-gray-700">{c._count?.students ?? 0}</span>,
    className: "hidden md:table-cell text-right",
    headerClass: "hidden md:table-cell text-right",
  },
  {
    key: "_count.users",
    header: "Staff",
    sortable: true,
    render: (c) => <span className="text-sm font-semibold text-gray-700">{c._count?.users ?? 0}</span>,
    className: "hidden md:table-cell text-right",
    headerClass: "hidden md:table-cell text-right",
  },
  {
    key: "city",
    header: "Location",
    render: (c) => c.city
      ? <span className="text-sm text-gray-500">{c.city}</span>
      : <span className="text-gray-300">—</span>,
    className: "hidden lg:table-cell",
    headerClass: "hidden lg:table-cell",
  },
  {
    key: "isLoginEnabled",
    header: "Login",
    render: (c) => c.isLoginEnabled
      ? <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium"><CheckCircle className="w-3.5 h-3.5" /> On</span>
      : <span className="flex items-center gap-1 text-xs text-gray-400"><XCircle className="w-3.5 h-3.5" /> Off</span>,
    className: "hidden sm:table-cell",
    headerClass: "hidden sm:table-cell",
  },
];

function MadrasaTable({
  clients, loading, entering, sortKey, sortDir, onSort, onEnter,
}: {
  clients: ClientListItem[];
  loading: boolean;
  entering: string | null;
  sortKey: string | undefined;
  sortDir: SortDir;
  onSort: (k: string, d: SortDir) => void;
  onEnter: (clientId: string, slug: string) => void;
}) {
  const sorted = useMemo(() => {
    if (!sortKey) return clients;
    return [...clients].sort((a, b) => {
      let av: any = sortKey.includes(".")
        ? sortKey.split(".").reduce((o: any, k) => o?.[k], a)
        : (a as any)[sortKey];
      let bv: any = sortKey.includes(".")
        ? sortKey.split(".").reduce((o: any, k) => o?.[k], b)
        : (b as any)[sortKey];
      av = av ?? "";
      bv = bv ?? "";
      const cmp = typeof av === "number" ? av - bv : String(av).localeCompare(String(bv));
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [clients, sortKey, sortDir]);

  const columns: Column<ClientListItem>[] = useMemo(() => [
    ...MADRASA_COLUMNS,
    {
      key: "actions",
      header: "",
      render: (c) => (
        <button
          onClick={(e) => { e.stopPropagation(); onEnter(c.id, c.slug); }}
          disabled={entering === c.id}
          className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60 transition-all"
        >
          {entering === c.id
            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : <LogIn className="w-3.5 h-3.5" />}
          Enter
        </button>
      ),
      className: "text-right",
    },
  ], [entering, onEnter]); // eslint-disable-line

  return (
    <DataTable
      columns={columns}
      data={sorted}
      keyExtractor={(c) => c.id}
      loading={loading}
      emptyIcon={Building2}
      emptyMessage="No madrasas registered yet"
      onSort={onSort}
      sortKey={sortKey}
      sortDir={sortDir}
      mobileRender={(c) => {
        const expired = isExpired(c.subscriptionEnd);
        return (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5 text-indigo-700" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-gray-900 text-sm">{c.name}</p>
                <span className="text-xs font-mono text-gray-400">{c.slug}</span>
                <span className={cn(
                  "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                  c.status === "ACTIVE" ? "bg-emerald-100 text-emerald-700"
                    : c.status === "TRIAL" ? "bg-blue-100 text-blue-700"
                    : "bg-gray-100 text-gray-500",
                )}>
                  {c.status}
                </span>
                {expired && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-600">EXPIRED</span>}
              </div>
              <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
                <span>{c._count?.students ?? 0} students</span>
                <span>{c._count?.users ?? 0} staff</span>
                {c.city && <span>{c.city}</span>}
                {c.isLoginEnabled
                  ? <span className="flex items-center gap-0.5 text-emerald-600 font-medium"><CheckCircle className="w-3 h-3" /> Login on</span>
                  : <span className="flex items-center gap-0.5 text-gray-400"><XCircle className="w-3 h-3" /> Login off</span>}
              </div>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); onEnter(c.id, c.slug); }}
              disabled={entering === c.id}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60 transition-all shrink-0"
            >
              {entering === c.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogIn className="w-3.5 h-3.5" />}
              Enter
            </button>
          </div>
        );
      }}
    />
  );
}

// ── Platform Overview (Super Admin without active client) ─────────────────────

function PlatformOverview() {
  const { user, accessToken, switchToClient } = useAuthStore();
  const navigate = useNavigate();
  const [clients, setClients] = useState<ClientListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [entering, setEntering] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<string | undefined>(undefined);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const loadClients = () => {
    if (!accessToken) return;
    setError(null);
    setLoading(true);
    listClients(accessToken)
      .then((r) => setClients(r.data))
      .catch((e) => { setError((e as Error).message); })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadClients();
  }, [accessToken]); // eslint-disable-line

  const totalClients = clients.length;
  const activeClients = clients.filter((c) => c.status === "ACTIVE").length;
  const totalStudents = clients.reduce((s, c) => s + (c._count?.students ?? 0), 0);
  const totalStaff = clients.reduce((s, c) => s + (c._count?.users ?? 0), 0);

  const handleEnter = (clientId: string, slug: string) => {
    setEntering(clientId);
    switchToClient(clientId, slug);
    navigate(`/m/${slug}/admin`);
  };

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
      {error && <ApiErrorBanner message={error} onRetry={loadClients} />}

      {/* Stats banner */}
      <div className="mb-5">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-indigo-700 to-purple-600 rounded-3xl p-5 text-white"
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

      {/* Madrasa list — quick switch */}
      <SectionHeader title="Madrasas" className="mb-3" />
      <MadrasaTable
        clients={clients}
        loading={loading}
        entering={entering}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={(k, d) => { setSortKey(k); setSortDir(d); }}
        onEnter={handleEnter}
      />
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

  const [stats, setStats] = useState({ totalStudents: 0, activeStudents: 0, collectionPct: 0, attRate: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!cid || !token) return;
    Promise.all([
      getStudentStats(cid, token).catch(() => null),
      getFeeSummary(cid, token, ayId || undefined).catch(() => null),
      getAttendanceSummary(cid, token).catch(() => null),
    ]).then(([stu, fee, att]) => {
      setStats({
        totalStudents: stu?.total ?? 0,
        activeStudents: stu?.byStatus.find((s: any) => s.status === "ACTIVE")?._count.id ?? 0,
        collectionPct: fee
          ? (() => { const c = Number(fee.totalCollected); const p = Number(fee.totalPending); const t = c + p; return t > 0 ? Math.round((c / t) * 100) : 0; })()
          : 0,
        attRate: att?.rate ?? 0,
      });
    }).finally(() => setLoading(false));
  }, [cid, token, ayId]);

  const statCards = [
    { label: "Total Students",  value: stats.totalStudents,       color: "text-blue-600" },
    { label: "Active Students", value: stats.activeStudents,      color: "text-emerald-600" },
    { label: "Fee Collection",  value: `${stats.collectionPct}%`, color: "text-amber-600" },
    { label: "Attendance Rate", value: `${stats.attRate}%`,       color: "text-purple-600" },
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
