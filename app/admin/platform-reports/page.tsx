import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  getPlatformStats,
  listClients,
  type PlatformStats,
  type ClientListItem,
} from "@/lib/super-admin-api";
import { useAuthStore } from "@/store/auth";
import { BarChart3, Loader2, Building2, Users, AlertTriangle, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

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

  return (
    <DashboardLayout>
      <PageHeader
        title="Platform Reports"
        icon={BarChart3}
        action={
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-200 transition-all disabled:opacity-60"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} /> Refresh
          </button>
        }
      />

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">{error}</div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-gray-400 text-sm py-12 justify-center">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading platform data...
        </div>
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

          {/* Client table */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-50">
              <p className="text-sm font-bold text-gray-700">All Madrasas</p>
            </div>
            <div className="divide-y divide-gray-50">
              {stats.clientSummaries.map((c, i) => {
                const isExpiredSub = !!c.subscriptionEnd && new Date(c.subscriptionEnd) < now;
                return (
                  <motion.div
                    key={c.id}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                    className="p-3 flex items-center gap-3"
                  >
                    <div className="w-8 h-8 bg-gray-100 rounded-xl flex items-center justify-center shrink-0">
                      <Building2 className="w-4 h-4 text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-gray-900 text-sm truncate">{c.name}</p>
                        <span className="text-xs font-mono text-gray-400">{c.slug}</span>
                        <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-full", STATUS_TEXT[c.status] ?? "text-gray-600 bg-gray-100")}>
                          {c.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
                        <span>{c.students} students</span>
                        <span>{c.staff} staff</span>
                        {c.subscriptionEnd && (
                          <span className={cn(isExpiredSub ? "text-red-500 font-semibold" : "")}>
                            Sub ends: {fmtDate(c.subscriptionEnd)}
                            {isExpiredSub && " (EXPIRED)"}
                          </span>
                        )}
                        {c.lastLoginAt && (
                          <span>Last login: {fmtDate(c.lastLoginAt)}</span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </DashboardLayout>
  );
}
