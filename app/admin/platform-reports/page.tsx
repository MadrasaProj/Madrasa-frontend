import { useState, useEffect, useMemo } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  getPlatformStats,
  listClients,
  type PlatformStats,
  type ClientListItem,
} from "@/lib/super-admin-api";
import { useAuthStore } from "@/store/auth";
import {
  BarChart3,
  Building2,
  Users,
  AlertTriangle,
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  Filter,
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { SkeletonGrid } from "@/components/ui/Skeleton";

// ── Helpers ────────────────────────────────────────────────────────────────────

const fmtDate = (d?: string) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-emerald-500",
  TRIAL: "bg-blue-400",
  SUSPENDED: "bg-amber-400",
  CANCELLED: "bg-gray-400",
};

const STATUS_TEXT: Record<string, string> = {
  ACTIVE: "text-emerald-700 bg-emerald-100",
  TRIAL: "text-blue-700 bg-blue-100",
  SUSPENDED: "text-amber-700 bg-amber-100",
  CANCELLED: "text-gray-600 bg-gray-100",
};

// ── Derived stats from client list ────────────────────────────────────────────

function deriveFromClients(clients: ClientListItem[]): PlatformStats {
  const now = new Date();
  const thirtyDays = new Date(now.getTime() + 30 * 86400000);
  return {
    totalClients: clients.length,
    activeClients: clients.filter((c) => c.status === "ACTIVE").length,
    trialClients: clients.filter((c) => c.status === "TRIAL").length,
    suspendedClients: clients.filter((c) => c.status === "SUSPENDED").length,
    totalStudents: clients.reduce((s, c) => s + (c._count?.students ?? 0), 0),
    totalStaff: clients.reduce((s, c) => s + (c._count?.users ?? 0), 0),
    totalRevenue: 0,
    clientSummaries: clients.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      status: c.status,
      students: c._count?.students ?? 0,
      staff: c._count?.users ?? 0,
      lastLoginAt: c.lastLoginAt,
      subscriptionEnd: c.subscriptionEnd,
    })),
  };
}

// ── Stat Card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, color }: {
  label: string; value: number | string; icon: React.ElementType; color: string;
}) {
  return (
    <div className={cn("bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3")}>
      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", color)}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <p className="text-xl font-black text-gray-900">{value}</p>
        <p className="text-xs text-gray-400 leading-tight">{label}</p>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function AdminPlatformReportsPage() {
  const { accessToken } = useAuthStore();
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const load = () => {
    if (!accessToken) return;
    setLoading(true);
    setError("");
    getPlatformStats(accessToken)
      .then((s) => setStats(s))
      .catch(() => {
        // Fallback to listClients-derived stats
        listClients(accessToken)
          .then((r) => setStats(deriveFromClients(r.data)))
          .catch((e) => setError(e?.message ?? "Failed to load platform data."));
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [accessToken]);

  const now = new Date();
  const soonExpiring = stats?.clientSummaries.filter((c) => {
    if (!c.subscriptionEnd) return false;
    const end = new Date(c.subscriptionEnd);
    return end > now && end < new Date(now.getTime() + 30 * 86400000);
  }) ?? [];

  const expired = stats?.clientSummaries.filter((c) => {
    return !!c.subscriptionEnd && new Date(c.subscriptionEnd) < now;
  }) ?? [];

  const statusCounts = stats
    ? {
        ACTIVE: stats.activeClients,
        TRIAL: stats.trialClients,
        SUSPENDED: stats.suspendedClients,
        CANCELLED: stats.totalClients - stats.activeClients - stats.trialClients - stats.suspendedClients,
      }
    : {};

  // Filtered madrasas list for reports table
  const filteredSummaries = useMemo(() => {
    if (!stats?.clientSummaries) return [];
    return stats.clientSummaries.filter((c) => {
      const q = search.toLowerCase().trim();
      const matchSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.slug.toLowerCase().includes(q);
      const matchStatus = statusFilter === "ALL" || c.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [stats?.clientSummaries, search, statusFilter]);

  const totalPages = Math.ceil(filteredSummaries.length / pageSize) || 1;

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, pageSize]);

  const paginatedSummaries = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredSummaries.slice(start, start + pageSize);
  }, [filteredSummaries, page, pageSize]);

  return (
    <DashboardLayout>
      <PageHeader
        title="Platform Reports"
        icon={BarChart3}
        action={
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-200 transition-all disabled:opacity-60 cursor-pointer"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} /> Refresh
          </button>
        }
      />

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">{error}</div>
      )}

      {loading ? (
        <SkeletonGrid count={4} className="grid-cols-2 lg:grid-cols-4 gap-3" />
      ) : stats ? (
        <div className="space-y-6 pb-20">
          {/* Top stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
              <StatCard label="Total Madrasas" value={stats.totalClients} icon={Building2} color="bg-indigo-500" />
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
              <StatCard label="Active Madrasas" value={stats.activeClients} icon={Building2} color="bg-emerald-500" />
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <StatCard label="Total Students" value={stats.totalStudents} icon={Users} color="bg-blue-500" />
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <StatCard label="Total Staff" value={stats.totalStaff} icon={Users} color="bg-teal-500" />
            </motion.div>
          </div>

          {/* Status breakdown */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <p className="text-sm font-bold text-gray-700 mb-3">Status Breakdown</p>
            <div className="space-y-2">
              {(["ACTIVE", "TRIAL", "SUSPENDED", "CANCELLED"] as const).map((s) => {
                const count = statusCounts[s] ?? 0;
                const pct = stats.totalClients > 0 ? Math.round((count / stats.totalClients) * 100) : 0;
                return (
                  <div key={s} className="flex items-center gap-3">
                    <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full w-20 text-center", STATUS_TEXT[s] ?? "text-gray-600 bg-gray-100")}>
                      {s}
                    </span>
                    <div className="flex-1 bg-gray-100 rounded-full h-2">
                      <div className={cn("h-2 rounded-full transition-all", STATUS_COLORS[s] ?? "bg-gray-400")}
                        style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs font-semibold text-gray-600 w-8 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Subscription health alerts */}
          {(soonExpiring.length > 0 || expired.length > 0) && (
            <div className="bg-amber-50 rounded-2xl border border-amber-200 p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <p className="text-sm font-bold text-amber-800">Subscription Health</p>
              </div>
              {expired.length > 0 && (
                <p className="text-xs text-red-600 font-semibold mb-1">
                  {expired.length} madrasa{expired.length > 1 ? "s" : ""} with expired subscription
                </p>
              )}
              {soonExpiring.length > 0 && (
                <p className="text-xs text-amber-700 font-semibold">
                  {soonExpiring.length} madrasa{soonExpiring.length > 1 ? "s" : ""} expiring within 30 days
                </p>
              )}
            </div>
          )}

          {/* Client table with Search, Filter & Pagination */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-xs">
            {/* Header + Search + Status Filter */}
            <div className="p-4 border-b border-gray-100 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-gray-800">Madrasas Directory & Reports</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Showing {filteredSummaries.length} of {stats.clientSummaries.length} madrasas
                  </p>
                </div>

                {/* Search Bar */}
                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search name or slug..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  />
                </div>
              </div>

              {/* Status Filter Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {[
                  { key: "ALL", label: "All Statuses", count: stats.clientSummaries.length },
                  { key: "ACTIVE", label: "Active", count: statusCounts.ACTIVE ?? 0 },
                  { key: "TRIAL", label: "Trial", count: statusCounts.TRIAL ?? 0 },
                  { key: "SUSPENDED", label: "Suspended", count: statusCounts.SUSPENDED ?? 0 },
                  { key: "CANCELLED", label: "Cancelled", count: statusCounts.CANCELLED ?? 0 },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setStatusFilter(tab.key)}
                    className={cn(
                      "px-2.5 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border shrink-0 cursor-pointer",
                      statusFilter === tab.key
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                        : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                    )}
                  >
                    {tab.label} <span className="opacity-75 text-[10px]">({tab.count})</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Madrasas List */}
            {filteredSummaries.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-xs">
                No madrasas match your search or filter.
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {paginatedSummaries.map((c) => {
                  const isExpiredSub = !!c.subscriptionEnd && new Date(c.subscriptionEnd) < now;
                  return (
                    <div
                      key={c.id}
                      className="p-3.5 flex items-center gap-3 hover:bg-gray-50/50 transition-colors"
                    >
                      <div className="w-9 h-9 bg-gray-100 rounded-xl flex items-center justify-center shrink-0">
                        <Building2 className="w-4 h-4 text-gray-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-gray-900 text-sm truncate">{c.name}</p>
                          <span className="text-xs font-mono text-gray-400">{c.slug}</span>
                          <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-full", STATUS_TEXT[c.status] ?? "text-gray-600 bg-gray-100")}>
                            {c.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-400 flex-wrap">
                          <span className="font-medium text-gray-600">{c.students} students</span>
                          <span>•</span>
                          <span>{c.staff} staff</span>
                          <span>•</span>
                          {c.subscriptionEnd && (
                            <span className={cn(isExpiredSub ? "text-red-500 font-semibold" : "")}>
                              Sub ends: {fmtDate(c.subscriptionEnd)}
                              {isExpiredSub && " (EXPIRED)"}
                            </span>
                          )}
                          {c.lastLoginAt && (
                            <>
                              <span>•</span>
                              <span>Last login: {fmtDate(c.lastLoginAt)}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination Controls */}
            {filteredSummaries.length > 0 && (
              <div className="p-3 border-t border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 font-medium">
                    Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filteredSummaries.length)} of {filteredSummaries.length}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-gray-400">Rows:</span>
                    <select
                      value={pageSize}
                      onChange={(e) => setPageSize(Number(e.target.value))}
                      className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                    >
                      {[10, 20, 50, 100].map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center gap-2">
                    <button
                      disabled={page <= 1}
                      onClick={() => setPage((p) => p - 1)}
                      className="w-7 h-7 rounded-lg border border-gray-200 bg-white flex items-center justify-center disabled:opacity-40 hover:bg-gray-100 transition-colors cursor-pointer"
                      aria-label="Previous page"
                    >
                      <ChevronLeft className="w-3.5 h-3.5 text-gray-600" />
                    </button>
                    <span className="text-xs text-gray-600 font-semibold min-w-[4rem] text-center">
                      Page {page} / {totalPages}
                    </span>
                    <button
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => p + 1)}
                      className="w-7 h-7 rounded-lg border border-gray-200 bg-white flex items-center justify-center disabled:opacity-40 hover:bg-gray-100 transition-colors cursor-pointer"
                      aria-label="Next page"
                    >
                      <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </DashboardLayout>
  );
}
