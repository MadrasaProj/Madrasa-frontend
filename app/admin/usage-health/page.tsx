import { useState, useEffect, useCallback, useMemo } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  getUsageHealth,
  listSuperAdminUsers,
  assignClient,
  type UsageHealthClientItem,
  type UsageHealthResponse,
  type SuperAdminUser,
} from "@/lib/super-admin-api";
import { useAuthStore } from "@/store/auth";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Activity,
  Award,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Clock,
  BookOpen,
  Calendar,
  Sparkles,
  UserCheck,
  UserX,
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  ArrowUpDown,
  ExternalLink,
  ShieldAlert,
  Layers,
  Zap,
  X,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Building2,
  Users,
  TrendingUp,
  TrendingDown,
  Info,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ── Score Colors & Badges ───────────────────────────────────────────────────

function getTierBadge(tier: "HEALTHY" | "MODERATE" | "AT_RISK" | "DORMANT") {
  switch (tier) {
    case "HEALTHY":
      return {
        label: "Champion",
        bg: "bg-emerald-50 text-emerald-700 border-emerald-200",
        dot: "bg-emerald-500",
        bar: "bg-emerald-500",
      };
    case "MODERATE":
      return {
        label: "Steady",
        bg: "bg-sky-50 text-sky-700 border-sky-200",
        dot: "bg-sky-500",
        bar: "bg-sky-500",
      };
    case "AT_RISK":
      return {
        label: "At Risk",
        bg: "bg-amber-50 text-amber-700 border-amber-200",
        dot: "bg-amber-500",
        bar: "bg-amber-500",
      };
    case "DORMANT":
      return {
        label: "Dormant",
        bg: "bg-rose-50 text-rose-700 border-rose-200",
        dot: "bg-rose-500",
        bar: "bg-rose-500",
      };
  }
}

function getScoreColor(score: number) {
  if (score >= 70) return "text-emerald-600";
  if (score >= 40) return "text-sky-600";
  if (score >= 15) return "text-amber-600";
  return "text-rose-600";
}

function getProgressBarColor(score: number) {
  if (score >= 70) return "bg-emerald-500";
  if (score >= 40) return "bg-sky-500";
  if (score >= 15) return "bg-amber-500";
  return "bg-rose-500";
}

// ── Reassign Modal ──────────────────────────────────────────────────────────

function AssignModal({
  client,
  users,
  token,
  onClose,
  onUpdated,
}: {
  client: UsageHealthClientItem;
  users: SuperAdminUser[];
  token: string;
  onClose: () => void;
  onUpdated: (updatedId: string, newAssigneeId: string | null) => void;
}) {
  const [selectedUser, setSelectedUser] = useState<string>(client.assigneeId || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await assignClient(client.id, selectedUser || null, token);
      toast.success(
        selectedUser
          ? `Madrasa assigned to ${users.find((u) => u.id === selectedUser)?.name || "user"}`
          : "Madrasa marked as unassigned"
      );
      onUpdated(client.id, selectedUser || null);
      onClose();
    } catch (e: any) {
      toast.error(e?.message || "Failed to update assignee");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100">
        <div className="flex items-center justify-between pb-4 border-b border-gray-100">
          <div>
            <h3 className="font-semibold text-gray-900 text-base">Assign Madrasa Ownership</h3>
            <p className="text-xs text-gray-500 mt-0.5">{client.name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="py-4 space-y-3">
          <p className="text-xs text-gray-600 leading-relaxed">
            Assigning an internal account manager or customer success specialist ensures consistent adoption
            outreach, regular habit tracking, and proactive retention.
          </p>

          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-1.5">
              Assigned Team Member <span className="text-red-500">* (Required)</span>
            </label>
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
            >
              <option value="">-- No Assignee (Unassigned) --</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role?.replace(/_/g, " ")}) - {u.identifier}
                </option>
              ))}
            </select>
          </div>

          {!selectedUser && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2 text-xs text-amber-800">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                <strong>Warning:</strong> Madrasas should have an assignee from available users for operational accountability.
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="px-4 py-2 text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-xl shadow-sm transition-all disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Assignment"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Detail Slide-Over Drawer ────────────────────────────────────────────────

function DetailDrawer({
  client,
  users,
  token,
  onClose,
  onOpenAssign,
}: {
  client: UsageHealthClientItem;
  users: SuperAdminUser[];
  token: string;
  onClose: () => void;
  onOpenAssign: () => void;
}) {
  const navigate = useNavigate();
  const tierBadge = getTierBadge(client.scoring.healthTier);

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-xs animate-in fade-in"
        onClick={onClose}
      />
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-lg bg-white shadow-2xl border-l border-gray-100 flex flex-col animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-base">
              {client.name.charAt(0)}
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 text-base leading-tight">{client.name}</h2>
              <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
                <span className="font-mono">{client.slug}</span>
                {client.city && <span>• {client.city}</span>}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Composite Score Banner */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-gray-900 to-gray-800 text-white shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase font-semibold text-gray-300 tracking-wider">
                  Overall Usage Health
                </p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl font-extrabold">{client.scoring.overallScore}</span>
                  <span className="text-sm text-gray-300 font-medium">/ 100</span>
                </div>
              </div>
              <span className={cn("px-3 py-1 rounded-full text-xs font-bold border", tierBadge.bg)}>
                {tierBadge.label}
              </span>
            </div>

            <div className="mt-4 pt-3 border-t border-gray-700/60">
              <p className="text-xs font-semibold text-primary-200">
                Strategic Recommendation:
              </p>
              <p className="text-sm font-medium text-white mt-0.5">
                {client.scoring.recommendation}
              </p>
              <p className="text-xs text-gray-300 mt-1 leading-relaxed">
                {client.scoring.priorityAction}
              </p>
            </div>
          </div>

          {/* Account Manager / Assignee Section */}
          <div className="p-4 rounded-2xl border border-gray-200 bg-white">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                Madrasa Assignee
              </span>
              <button
                onClick={onOpenAssign}
                className="text-xs font-semibold text-primary-600 hover:text-primary-700 underline"
              >
                Change Assignee
              </button>
            </div>
            {client.assignee ? (
              <div className="flex items-center gap-3 mt-1">
                <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-sm">
                  {client.assignee.name.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{client.assignee.name}</p>
                  <p className="text-xs text-gray-500">
                    {client.assignee.role?.replace(/_/g, " ")} • @{client.assignee.username}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Unassigned. Every madrasa requires an internal manager for ownership.</span>
              </div>
            )}
          </div>

          {/* Feature Breakdown 3 Pillars */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Core Feature Breakdown
            </h3>

            {/* 1. Daily Attendance Pillar */}
            <div className="p-4 rounded-2xl border border-gray-200 bg-gray-50/50 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-blue-100 text-blue-700">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-gray-900">Daily Attendance</span>
                    <p className="text-[11px] text-gray-500">Weight: 35% of overall score</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={cn("text-base font-extrabold", getScoreColor(client.metrics.attendance.score))}>
                    {client.metrics.attendance.score}%
                  </span>
                  <p className="text-[10px] text-gray-400">Adoption Score</p>
                </div>
              </div>

              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden mt-1">
                <div
                  className={cn("h-full rounded-full transition-all duration-500", getProgressBarColor(client.metrics.attendance.score))}
                  style={{ width: `${client.metrics.attendance.score}%` }}
                />
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-200/60 text-xs text-gray-600">
                <div>
                  <span className="text-gray-400 block text-[10px]">30d Sessions</span>
                  <span className="font-semibold text-gray-900">{client.metrics.attendance.total30d}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px]">7d Activity</span>
                  <span className="font-semibold text-gray-900">{client.metrics.attendance.total7d}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px]">Last Marked</span>
                  <span className="font-semibold text-gray-900">
                    {client.metrics.attendance.lastDate
                      ? new Date(client.metrics.attendance.lastDate).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                        })
                      : "Never"}
                  </span>
                </div>
              </div>
            </div>

            {/* 2. Ibadah Tracking Pillar */}
            <div className="p-4 rounded-2xl border border-gray-200 bg-gray-50/50 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-gray-900">Ibadah Tracking</span>
                    <p className="text-[11px] text-gray-500">Weight: 35% · Core Differentiator</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={cn("text-base font-extrabold", getScoreColor(client.metrics.ibadah.score))}>
                    {client.metrics.ibadah.score}%
                  </span>
                  <p className="text-[10px] text-gray-400">Adoption Score</p>
                </div>
              </div>

              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden mt-1">
                <div
                  className={cn("h-full rounded-full transition-all duration-500", getProgressBarColor(client.metrics.ibadah.score))}
                  style={{ width: `${client.metrics.ibadah.score}%` }}
                />
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-200/60 text-xs text-gray-600">
                <div>
                  <span className="text-gray-400 block text-[10px]">30d Logs</span>
                  <span className="font-semibold text-gray-900">{client.metrics.ibadah.total30d}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px]">7d Activity</span>
                  <span className="font-semibold text-gray-900">{client.metrics.ibadah.total7d}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px]">Last Logged</span>
                  <span className="font-semibold text-gray-900">
                    {client.metrics.ibadah.lastDate
                      ? new Date(client.metrics.ibadah.lastDate).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                        })
                      : "Never"}
                  </span>
                </div>
              </div>
            </div>

            {/* 3. Homework Pillar */}
            <div className="p-4 rounded-2xl border border-gray-200 bg-gray-50/50 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-purple-100 text-purple-700">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-gray-900">Homework & Assignments</span>
                    <p className="text-[11px] text-gray-500">Weight: 20% · Academic Rigor</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={cn("text-base font-extrabold", getScoreColor(client.metrics.homework.score))}>
                    {client.metrics.homework.score}%
                  </span>
                  <p className="text-[10px] text-gray-400">Adoption Score</p>
                </div>
              </div>

              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden mt-1">
                <div
                  className={cn("h-full rounded-full transition-all duration-500", getProgressBarColor(client.metrics.homework.score))}
                  style={{ width: `${client.metrics.homework.score}%` }}
                />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-200/60 text-xs text-gray-600">
                <div>
                  <span className="text-gray-400 block text-[10px]">30d Assignments</span>
                  <span className="font-semibold text-gray-900">{client.metrics.homework.total30d}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px]">Active Classes</span>
                  <span className="font-semibold text-gray-900">{client.counts.classes}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Metrics Stats */}
          <div className="grid grid-cols-3 gap-3 p-4 rounded-2xl bg-gray-50 border border-gray-200 text-center">
            <div>
              <p className="text-lg font-bold text-gray-900">{client.counts.students}</p>
              <p className="text-[11px] text-gray-500">Students</p>
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900">{client.counts.classes}</p>
              <p className="text-[11px] text-gray-500">Classes</p>
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900">{client.counts.teachers}</p>
              <p className="text-[11px] text-gray-500">Teachers</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
          <button
            onClick={() => navigate(`/m/${client.slug}/admin`)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-700 hover:text-primary-700 bg-white border border-gray-200 rounded-xl shadow-xs"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Launch Portal
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-xl"
          >
            Done
          </button>
        </div>
      </div>
    </>
  );
}

// ── Main Page Component ─────────────────────────────────────────────────────

export default function AdminUsageHealthPage() {
  const { accessToken, user } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Filters & State
  // Default assigneeId to 'me' if not specified in searchParams
  const initialAssignee = searchParams.get("assigneeId") || "me";
  const [assigneeFilter, setAssigneeFilter] = useState<string>(initialAssignee);
  const [searchQuery, setSearchQuery] = useState<string>(searchParams.get("search") || "");
  const [tierFilter, setTierFilter] = useState<string>(searchParams.get("tier") || "ALL");
  const [sortBy, setSortBy] = useState<string>(searchParams.get("sortBy") || "overallScore");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">((searchParams.get("sortOrder") as "asc" | "desc") || "desc");
  const [page, setPage] = useState<number>(parseInt(searchParams.get("page") || "1", 10) || 1);
  const [limit, setLimit] = useState<number>(parseInt(searchParams.get("limit") || "10", 10) || 10);

  // Data State
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<UsageHealthResponse | null>(null);
  const [superUsers, setSuperUsers] = useState<SuperAdminUser[]>([]);

  // Modals & Drawers
  const [selectedClientForAssign, setSelectedClientForAssign] = useState<UsageHealthClientItem | null>(null);
  const [selectedClientForDrawer, setSelectedClientForDrawer] = useState<UsageHealthClientItem | null>(null);

  // Load super admin users once
  useEffect(() => {
    if (!accessToken) return;
    listSuperAdminUsers(accessToken)
      .then((res) => setSuperUsers(res.data || []))
      .catch((err) => console.error("Failed to load super admin users", err));
  }, [accessToken]);

  // Load Usage Health data
  const loadData = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const res = await getUsageHealth(
        {
          page,
          limit,
          assigneeId: assigneeFilter,
          search: searchQuery.trim() || undefined,
          tier: tierFilter !== "ALL" ? tierFilter : undefined,
          sortBy,
          sortOrder,
        },
        accessToken
      );
      setData(res);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load usage health scores");
    } finally {
      setLoading(false);
    }
  }, [accessToken, page, limit, assigneeFilter, searchQuery, tierFilter, sortBy, sortOrder]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Sync params into URL
  useEffect(() => {
    const next = new URLSearchParams();
    if (assigneeFilter) next.set("assigneeId", assigneeFilter);
    if (searchQuery) next.set("search", searchQuery);
    if (tierFilter !== "ALL") next.set("tier", tierFilter);
    if (sortBy !== "overallScore") next.set("sortBy", sortBy);
    if (sortOrder !== "desc") next.set("sortOrder", sortOrder);
    if (page > 1) next.set("page", String(page));
    if (limit !== 10) next.set("limit", String(limit));
    setSearchParams(next, { replace: true });
  }, [assigneeFilter, searchQuery, tierFilter, sortBy, sortOrder, page, limit, setSearchParams]);

  // Handle assignment update
  const handleAssignmentUpdated = (clientId: string, newAssigneeId: string | null) => {
    setData((prev) => {
      if (!prev) return prev;
      const assignedUser = superUsers.find((u) => u.id === newAssigneeId) || null;
      return {
        ...prev,
        data: prev.data.map((c): UsageHealthClientItem =>
          c.id === clientId
            ? {
                ...c,
                assigneeId: newAssigneeId,
                assignee: assignedUser
                  ? { id: assignedUser.id, name: assignedUser.name, username: assignedUser.identifier, role: assignedUser.role || "" }
                  : null,
              }
            : c
        ),
      };
    });
    // If filtered to 'me' or 'unassigned', reload to reflect moving between buckets
    if (assigneeFilter === "me" || assigneeFilter === "unassigned") {
      loadData();
    }
  };

  const summary = data?.summary;
  const clientsList = data?.data || [];
  const pagination = data?.pagination;

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Header */}
        <PageHeader
          title="Madrasa Usage & Adoption Matrix"
          subtitle="Feature-wise usage scoring (Ibadah tracking, attendance & homeworks) with automated customer success signals and portfolio assignment."
          action={
            <div className="flex items-center gap-2">
              <button
                onClick={() => loadData()}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 shadow-xs transition-colors"
              >
                <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
                Refresh
              </button>
              <button
                onClick={() => navigate("/admin/madrasas")}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-primary-600 rounded-xl hover:bg-primary-700 shadow-xs transition-colors"
              >
                <Building2 className="w-3.5 h-3.5" />
                Manage Madrasas
              </button>
            </div>
          }
        />

        {/* Unassigned Warning Banner (If any exist across platform) */}
        {summary && summary.totalUnassignedCount > 0 && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-100 text-amber-800">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-amber-900">
                  {summary.totalUnassignedCount} Madrasa{summary.totalUnassignedCount > 1 ? "s" : ""} without Assignee
                </p>
                <p className="text-xs text-amber-700">
                  Assignees are required for customer success, usage accountability, and regular follow-ups.
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setAssigneeFilter("unassigned");
                setPage(1);
              }}
              className="px-3.5 py-1.5 text-xs font-bold text-amber-900 bg-amber-200/80 hover:bg-amber-200 rounded-xl transition-colors shrink-0"
            >
              Review Unassigned Madrasas
            </button>
          </div>
        )}

        {/* Strategic Executive KPI Scorecards */}
        {summary && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Overall Portfolio Health */}
            <div className="p-5 rounded-2xl bg-white border border-gray-100 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Usage Health Index
                </span>
                <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
                  <Activity className="w-4 h-4" />
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className={cn("text-3xl font-extrabold", getScoreColor(summary.avgOverallScore))}>
                  {summary.avgOverallScore}
                </span>
                <span className="text-xs font-semibold text-gray-400">/ 100 avg</span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                <span className="font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                  {summary.healthyCount} Champion
                </span>
                <span>•</span>
                <span className="font-semibold text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded">
                  {summary.moderateCount} Steady
                </span>
                <span>•</span>
                <span className="font-semibold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded">
                  {summary.dormantCount + summary.atRiskCount} At Risk
                </span>
              </div>
            </div>

            {/* 2. Daily Attendance Pillar */}
            <div className="p-5 rounded-2xl bg-white border border-gray-100 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Attendance Adoption
                </span>
                <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
                  <Calendar className="w-4 h-4" />
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className={cn("text-3xl font-extrabold", getScoreColor(summary.avgAttendanceScore))}>
                  {summary.avgAttendanceScore}%
                </span>
                <span className="text-xs text-gray-400 font-medium">Daily Habit</span>
              </div>
              <p className="text-[11px] text-gray-500">
                Weighted 35% · Regular classroom attendance roll-call consistency.
              </p>
            </div>

            {/* 3. Ibadah Tracking Pillar */}
            <div className="p-5 rounded-2xl bg-white border border-gray-100 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Ibadah Tracking
                </span>
                <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
                  <Sparkles className="w-4 h-4" />
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className={cn("text-3xl font-extrabold", getScoreColor(summary.avgIbadahScore))}>
                  {summary.avgIbadahScore}%
                </span>
                <span className="text-xs text-emerald-600 font-semibold">Core Differentiator</span>
              </div>
              <p className="text-[11px] text-gray-500">
                Weighted 35% · Prayer log frequency, consistency & active student reach.
              </p>
            </div>

            {/* 4. Homework Pillar */}
            <div className="p-5 rounded-2xl bg-white border border-gray-100 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Homework Engagement
                </span>
                <span className="p-1.5 rounded-lg bg-purple-50 text-purple-600">
                  <BookOpen className="w-4 h-4" />
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className={cn("text-3xl font-extrabold", getScoreColor(summary.avgHomeworkScore))}>
                  {summary.avgHomeworkScore}%
                </span>
                <span className="text-xs text-purple-600 font-semibold">Academic Rigor</span>
              </div>
              <p className="text-[11px] text-gray-500">
                Weighted 20% · Weekly class homework assignments created by teachers.
              </p>
            </div>
          </div>
        )}

        {/* Filters & Controls */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-xs space-y-3">
          {/* Top Row: Assignee Quick Pills */}
          <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-gray-100">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-bold text-gray-600 mr-1 flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5 text-primary-600" />
                Assignee View:
              </span>

              {/* My Assigned (Default) */}
              <button
                onClick={() => {
                  setAssigneeFilter("me");
                  setPage(1);
                }}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5",
                  assigneeFilter === "me"
                    ? "bg-primary-600 text-white shadow-xs"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                )}
              >
                <span>⭐ Assigned to Me ({user?.name || "Current User"})</span>
              </button>

              {/* All Madrasas */}
              <button
                onClick={() => {
                  setAssigneeFilter("all");
                  setPage(1);
                }}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer",
                  assigneeFilter === "all"
                    ? "bg-primary-600 text-white shadow-xs"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                )}
              >
                All Madrasas
              </button>

              {/* Unassigned Only */}
              <button
                onClick={() => {
                  setAssigneeFilter("unassigned");
                  setPage(1);
                }}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1",
                  assigneeFilter === "unassigned"
                    ? "bg-amber-600 text-white shadow-xs"
                    : "bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200"
                )}
              >
                <AlertCircle className="w-3 h-3" />
                Unassigned Only
              </button>
            </div>

            {/* Individual Team Member Selector */}
            <div className="flex items-center gap-2">
              <select
                value={["me", "all", "unassigned"].includes(assigneeFilter) ? "" : assigneeFilter}
                onChange={(e) => {
                  if (e.target.value) {
                    setAssigneeFilter(e.target.value);
                    setPage(1);
                  }
                }}
                className="text-xs px-2.5 py-1.5 border border-gray-200 rounded-xl bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Filter by Team Member...</option>
                {superUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role?.replace(/_/g, " ")})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Bottom Row: Search, Tier, Sorting & Page Size */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            {/* Search Input */}
            <div className="relative min-w-[240px] flex-1 max-w-sm">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by madrasa name, slug, city..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Tier Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-gray-500 font-medium">Health Tier:</span>
                <select
                  value={tierFilter}
                  onChange={(e) => {
                    setTierFilter(e.target.value);
                    setPage(1);
                  }}
                  className="text-xs px-2.5 py-1.5 border border-gray-200 rounded-xl bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 font-medium"
                >
                  <option value="ALL">All Tiers</option>
                  <option value="HEALTHY">Champion (70-100)</option>
                  <option value="MODERATE">Steady (40-69)</option>
                  <option value="AT_RISK">At Risk (15-39)</option>
                  <option value="DORMANT">Dormant (&lt;15)</option>
                </select>
              </div>

              {/* Sort By */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-gray-500 font-medium">Sort By:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="text-xs px-2.5 py-1.5 border border-gray-200 rounded-xl bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 font-medium"
                >
                  <option value="overallScore">Overall Score</option>
                  <option value="ibadahScore">Ibadah Score</option>
                  <option value="attendanceScore">Attendance Score</option>
                  <option value="homeworkScore">Homework Score</option>
                  <option value="students">Student Count</option>
                  <option value="name">Madrasa Name</option>
                  <option value="lastActive">Recently Active</option>
                </select>
                <button
                  onClick={() => setSortOrder(sortOrder === "desc" ? "asc" : "desc")}
                  title={`Sort Order: ${sortOrder === "desc" ? "Descending" : "Ascending"}`}
                  className="p-1.5 border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-600 transition-colors"
                >
                  <ArrowUpDown className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-xs">
          {loading ? (
            <div className="p-12 text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-primary-500 animate-spin mx-auto" />
              <p className="text-sm font-medium text-gray-600">Computing feature adoption telemetry...</p>
            </div>
          ) : clientsList.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <Building2 className="w-12 h-12 text-gray-300 mx-auto" />
              <h3 className="font-semibold text-gray-800 text-base">No Madrasas Found</h3>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                {assigneeFilter === "me"
                  ? "No madrasas currently assigned to you. Switch to 'All Madrasas' or assign madrasas to your account."
                  : "No madrasas matching the selected filter criteria."}
              </p>
              {assigneeFilter === "me" && (
                <button
                  onClick={() => setAssigneeFilter("all")}
                  className="mt-2 px-4 py-2 text-xs font-semibold text-primary-700 bg-primary-50 hover:bg-primary-100 rounded-xl transition-colors"
                >
                  View All Madrasas
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/70 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Madrasa & Scope</th>
                    <th className="py-3 px-4">Assignee</th>
                    <th className="py-3 px-4 text-center">Overall Health</th>
                    <th className="py-3 px-4">Ibadah Tracking</th>
                    <th className="py-3 px-4">Attendance</th>
                    <th className="py-3 px-4">Homework</th>
                    <th className="py-3 px-4">Strategic Recommendation</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs">
                  {clientsList.map((client) => {
                    const tierBadge = getTierBadge(client.scoring.healthTier);
                    return (
                      <tr
                        key={client.id}
                        className="hover:bg-gray-50/60 transition-colors group cursor-pointer"
                        onClick={() => setSelectedClientForDrawer(client)}
                      >
                        {/* 1. Madrasa Info */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary-700 font-bold flex items-center justify-center shrink-0 text-xs">
                              {client.name.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-gray-900 group-hover:text-primary-700 transition-colors">
                                {client.name}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5 text-[11px] text-gray-400">
                                <span>{client.counts.students} students</span>
                                <span>•</span>
                                <span>{client.counts.classes} classes</span>
                                {client.city && (
                                  <>
                                    <span>•</span>
                                    <span>{client.city}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* 2. Assignee */}
                        <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                          {client.assignee ? (
                            <div className="flex items-center gap-1.5">
                              <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-[10px]">
                                {client.assignee.name.charAt(0)}
                              </div>
                              <div className="min-w-0">
                                <span className="font-semibold text-gray-800 text-xs truncate block">
                                  {client.assignee.name}
                                </span>
                                <span className="text-[10px] text-gray-400 truncate block">
                                  {client.assignee.role?.replace(/_/g, " ")}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => setSelectedClientForAssign(client)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition-colors"
                            >
                              <AlertCircle className="w-3 h-3 text-amber-600" />
                              Assign Now
                            </button>
                          )}
                        </td>

                        {/* 3. Overall Health Score */}
                        <td className="py-3.5 px-4 text-center">
                          <div className="inline-flex flex-col items-center">
                            <span className={cn("text-base font-extrabold", getScoreColor(client.scoring.overallScore))}>
                              {client.scoring.overallScore}
                            </span>
                            <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full mt-0.5 border", tierBadge.bg)}>
                              {tierBadge.label}
                            </span>
                          </div>
                        </td>

                        {/* 4. Ibadah Tracking Pillar */}
                        <td className="py-3.5 px-4 min-w-[130px]">
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className={cn("font-bold", getScoreColor(client.metrics.ibadah.score))}>
                                {client.metrics.ibadah.score}%
                              </span>
                              <span className="text-gray-400 text-[10px]">
                                {client.metrics.ibadah.total30d} logs (30d)
                              </span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                              <div
                                className={cn("h-full rounded-full", getProgressBarColor(client.metrics.ibadah.score))}
                                style={{ width: `${client.metrics.ibadah.score}%` }}
                              />
                            </div>
                            <p className="text-[10px] text-gray-400">
                              {client.metrics.ibadah.lastDate
                                ? `Last: ${new Date(client.metrics.ibadah.lastDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}`
                                : "No logs"}
                            </p>
                          </div>
                        </td>

                        {/* 5. Attendance Pillar */}
                        <td className="py-3.5 px-4 min-w-[130px]">
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className={cn("font-bold", getScoreColor(client.metrics.attendance.score))}>
                                {client.metrics.attendance.score}%
                              </span>
                              <span className="text-gray-400 text-[10px]">
                                {client.metrics.attendance.total30d} sessions
                              </span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                              <div
                                className={cn("h-full rounded-full", getProgressBarColor(client.metrics.attendance.score))}
                                style={{ width: `${client.metrics.attendance.score}%` }}
                              />
                            </div>
                            <p className="text-[10px] text-gray-400">
                              {client.metrics.attendance.lastDate
                                ? `Last: ${new Date(client.metrics.attendance.lastDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}`
                                : "No attendance"}
                            </p>
                          </div>
                        </td>

                        {/* 6. Homework Pillar */}
                        <td className="py-3.5 px-4 min-w-[120px]">
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className={cn("font-bold", getScoreColor(client.metrics.homework.score))}>
                                {client.metrics.homework.score}%
                              </span>
                              <span className="text-gray-400 text-[10px]">
                                {client.metrics.homework.total30d} assigned
                              </span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                              <div
                                className={cn("h-full rounded-full", getProgressBarColor(client.metrics.homework.score))}
                                style={{ width: `${client.metrics.homework.score}%` }}
                              />
                            </div>
                            <p className="text-[10px] text-gray-400">
                              {client.metrics.homework.total30d > 0
                                ? `${client.metrics.homework.total30d} assignments/30d`
                                : "Zero assignments"}
                            </p>
                          </div>
                        </td>

                        {/* 7. Strategic Recommendation */}
                        <td className="py-3.5 px-4 max-w-[200px]">
                          <p className="font-semibold text-gray-800 text-[11px] truncate">
                            {client.scoring.recommendation}
                          </p>
                          <p className="text-[10px] text-gray-500 line-clamp-1">
                            {client.scoring.priorityAction}
                          </p>
                        </td>

                        {/* 8. Actions */}
                        <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setSelectedClientForAssign(client)}
                              title="Assign or reassign owner"
                              className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                            >
                              <UserCheck className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setSelectedClientForDrawer(client)}
                              title="View deep-dive telemetry"
                              className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                            >
                              <Info className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => navigate(`/m/${client.slug}/admin`)}
                              title="Open Madrasa Portal"
                              className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls */}
          {pagination && pagination.total > 0 && (
            <div className="p-4 border-t border-gray-100 flex items-center justify-between flex-wrap gap-3 text-xs bg-gray-50/50">
              <div className="flex items-center gap-2 text-gray-500 font-medium">
                <span>
                  Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} madrasas
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  Rows per page:
                  <select
                    value={limit}
                    onChange={(e) => {
                      setLimit(parseInt(e.target.value, 10));
                      setPage(1);
                    }}
                    className="border border-gray-200 rounded-lg px-2 py-0.5 bg-white text-gray-700 font-medium focus:outline-none"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  disabled={pagination.page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-2.5 py-1.5 border border-gray-200 rounded-lg bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <span className="px-3 py-1 text-xs font-semibold text-gray-700">
                  Page {pagination.page} of {pagination.totalPages || 1}
                </span>

                <button
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-2.5 py-1.5 border border-gray-200 rounded-lg bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Reassign Modal */}
      {selectedClientForAssign && (
        <AssignModal
          client={selectedClientForAssign}
          users={superUsers}
          token={accessToken!}
          onClose={() => setSelectedClientForAssign(null)}
          onUpdated={handleAssignmentUpdated}
        />
      )}

      {/* Detail Slide-Over Drawer */}
      {selectedClientForDrawer && (
        <DetailDrawer
          client={selectedClientForDrawer}
          users={superUsers}
          token={accessToken!}
          onClose={() => setSelectedClientForDrawer(null)}
          onOpenAssign={() => {
            setSelectedClientForAssign(selectedClientForDrawer);
          }}
        />
      )}
    </DashboardLayout>
  );
}
