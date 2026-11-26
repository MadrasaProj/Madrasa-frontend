import { useState, useEffect, useCallback, useMemo } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  getUsageHealth,
  listAssignableUsers,
  assignClient,
  type UsageHealthClientItem,
  type UsageHealthResponse,
  type AssignableUser,
} from "@/lib/super-admin-api";
import { useAuthStore } from "@/store/auth";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  AlertCircle,
  BookOpen,
  Calendar,
  Sparkles,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  Search,
  ArrowUpDown,
  ExternalLink,
  Layers,
  Zap,
  X,
  RefreshCw,
  Building2,
  Info,
  LogIn,
} from "lucide-react";
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
  users: AssignableUser[];
  token: string;
  onClose: () => void;
  onUpdated: (updatedId: string, newAssigneeId: string | null) => void;
}) {
  const [selectedUser, setSelectedUser] = useState<string>(client.assigneeId || "");
  const [userSearch, setUserSearch] = useState("");
  const [saving, setSaving] = useState(false);

  const filteredUsers = useMemo(() => {
    if (!userSearch.trim()) return users;
    const q = userSearch.toLowerCase();
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.identifier.toLowerCase().includes(q) ||
        (u.role && u.role.toLowerCase().includes(q)) ||
        (u.clientName && u.clientName.toLowerCase().includes(q))
    );
  }, [users, userSearch]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

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
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-4 border-b border-gray-100">
          <div>
            <h3 className="font-semibold text-gray-900 text-base">Assign Madrasa Ownership</h3>
            <p className="text-xs text-gray-500 mt-0.5">{client.name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 cursor-pointer"
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

            {users.length > 6 && (
              <div className="relative mb-2">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Filter users by name or role..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
            )}

            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
            >
              <option value="">-- No Assignee (Unassigned) --</option>
              {filteredUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role?.replace(/_/g, " ")}) - {u.identifier} {u.clientName ? `[${u.clientName}]` : ""}
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

        <div className="pt-4 border-t border-gray-100 flex items-center justify-between gap-3">
          {client.assigneeId ? (
            <button
              type="button"
              onClick={() => setSelectedUser("")}
              disabled={saving || !selectedUser}
              className="text-xs text-red-600 hover:text-red-700 font-medium cursor-pointer"
            >
              Clear Assignment
            </button>
          ) : <div />}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={handleSave}
              className="px-4 py-2 text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-xl shadow-sm transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
            >
              {saving ? "Saving..." : "Save Assignment"}
            </button>
          </div>
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
  users: AssignableUser[];
  token: string;
  onClose: () => void;
  onOpenAssign: () => void;
}) {
  const navigate = useNavigate();
  const tierBadge = getTierBadge(client.scoring.healthTier);

  // Prevent background scroll and handle Escape key
  useEffect(() => {
    const origOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = origOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs animate-in fade-in"
        onClick={onClose}
      />
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md sm:max-w-lg bg-white shadow-2xl border-l border-gray-100 flex flex-col animate-in slide-in-from-right duration-200 overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/70 shrink-0">
          <div className="flex items-center gap-3 min-w-0 pr-2">
            <div className="w-10 h-10 rounded-xl bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-base shrink-0">
              {client.name.charAt(0)}
            </div>
            <div className="min-w-0">
              <h2 className="font-semibold text-gray-900 text-base leading-tight truncate">{client.name}</h2>
              <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
                <span className="font-mono text-[11px] text-gray-400">{client.slug}</span>
                {client.city && <span>• {client.city}</span>}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 shrink-0 cursor-pointer"
            aria-label="Close drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body with clear right-side padding so scrollbars never crowd content */}
        <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-5 space-y-5 overscroll-contain">
          {/* 1. Hero Composite Health & CSM Strategy Card */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-gray-900 via-gray-850 to-gray-800 text-white shadow-md relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] uppercase font-semibold text-gray-300 tracking-wider">
                  Usage Health Index
                </p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl sm:text-4xl font-extrabold">{client.scoring.overallScore}</span>
                  <span className="text-xs text-gray-300 font-medium">/ 100 avg</span>
                </div>
              </div>
              <span className={cn("px-3 py-1 rounded-full text-xs font-bold border", tierBadge.bg)}>
                {tierBadge.label}
              </span>
            </div>

            <div className="mt-3.5 pt-3 border-t border-gray-700/60">
              <div className="flex items-center gap-1.5 text-primary-300 text-xs font-bold">
                <Zap className="w-3.5 h-3.5" />
                Strategic CSM Recommendation:
              </div>
              <p className="text-sm font-semibold text-white mt-1 leading-snug">
                {client.scoring.recommendation}
              </p>
              <p className="text-xs text-gray-300 mt-1 leading-relaxed bg-white/5 p-2 rounded-lg border border-white/10">
                {client.scoring.priorityAction}
              </p>
            </div>

            <div className="mt-2.5 text-[10px] text-gray-400 flex items-center justify-between">
              <span>Formula: Attendance (40%) + Ibadah (40%) + HW (20%)</span>
              <span className="text-emerald-400 font-medium">100% Core Focus</span>
            </div>
          </div>

          {/* 2. Account Ownership & Accountability Card */}
          <div className="p-4 rounded-2xl border border-gray-200 bg-white shadow-2xs space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-primary-600" />
                Madrasa Account Assignee
              </span>
              <button
                onClick={onOpenAssign}
                className="text-xs font-semibold text-primary-600 hover:text-primary-700 underline cursor-pointer"
              >
                Change Assignee
              </button>
            </div>

            {client.assignee ? (
              <div className="flex items-center gap-3 pt-1">
                <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-sm shrink-0">
                  {client.assignee.name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{client.assignee.name}</p>
                  <p className="text-xs text-gray-500 truncate">
                    {client.assignee.role?.replace(/_/g, " ")} • @{client.assignee.username}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <div className="flex-1">
                  <strong>Unassigned Madrasa:</strong> Assigning an internal staff member is required to ensure habit continuity and adoption outreach.
                </div>
              </div>
            )}
          </div>

          {/* 3. Core Pedagogical Features (100% Score Weight) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-gray-400" />
                Core Pedagogical Pillars (100% Score Weight)
              </h3>
              <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Determines Rating
              </span>
            </div>

            {/* Attendance Pillar (40%) */}
            <div className="p-3.5 rounded-2xl border border-gray-200 bg-gray-50/50 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-blue-100 text-blue-700">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-gray-900">Daily Attendance</span>
                    <p className="text-[10px] text-gray-500">Weight: 40% · Habit Reliability</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={cn("text-base font-extrabold", getScoreColor(client.metrics.attendance.score))}>
                    {client.metrics.attendance.score}%
                  </span>
                  <p className="text-[9px] text-gray-400">Score</p>
                </div>
              </div>

              <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all duration-500", getProgressBarColor(client.metrics.attendance.score))}
                  style={{ width: `${client.metrics.attendance.score}%` }}
                />
              </div>

              <div className="grid grid-cols-3 gap-2 pt-1.5 border-t border-gray-200/60 text-xs text-gray-600">
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

            {/* Ibadah Tracking Pillar (40%) */}
            <div className="p-3.5 rounded-2xl border border-gray-200 bg-gray-50/50 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-gray-900">Ibadah Tracking</span>
                    <p className="text-[10px] text-emerald-700 font-medium">Weight: 40% · Core Differentiator</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={cn("text-base font-extrabold", getScoreColor(client.metrics.ibadah.score))}>
                    {client.metrics.ibadah.score}%
                  </span>
                  <p className="text-[9px] text-gray-400">Score</p>
                </div>
              </div>

              <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all duration-500", getProgressBarColor(client.metrics.ibadah.score))}
                  style={{ width: `${client.metrics.ibadah.score}%` }}
                />
              </div>

              <div className="grid grid-cols-3 gap-2 pt-1.5 border-t border-gray-200/60 text-xs text-gray-600">
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

            {/* Homework Pillar (20%) */}
            <div className="p-3.5 rounded-2xl border border-gray-200 bg-gray-50/50 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-purple-100 text-purple-700">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-gray-900">Homework & Assignments</span>
                    <p className="text-[10px] text-gray-500">Weight: 20% · Academic Rigor</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={cn("text-base font-extrabold", getScoreColor(client.metrics.homework.score))}>
                    {client.metrics.homework.score}%
                  </span>
                  <p className="text-[9px] text-gray-400">Score</p>
                </div>
              </div>

              <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all duration-500", getProgressBarColor(client.metrics.homework.score))}
                  style={{ width: `${client.metrics.homework.score}%` }}
                />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-gray-200/60 text-xs text-gray-600">
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

          {/* 4. Operational Telemetry: Web Portal Access (0% Score Weight) */}
          <div className="p-4 rounded-2xl border border-teal-200/80 bg-teal-50/30 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-teal-100 text-teal-700">
                  <LogIn className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-gray-900">Portal Login & Access</span>
                  <p className="text-[10px] text-teal-800 font-medium">
                    Operational Telemetry · 0% Score Weight
                  </p>
                </div>
              </div>
              <span
                className={cn(
                  "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                  client.metrics.portalLogin?.status === "FREQUENT"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : client.metrics.portalLogin?.status === "RECENT"
                    ? "bg-blue-50 text-blue-700 border-blue-200"
                    : client.metrics.portalLogin?.status === "OCCASIONAL"
                    ? "bg-amber-50 text-amber-700 border-amber-200"
                    : client.metrics.portalLogin?.status === "DISABLED"
                    ? "bg-rose-50 text-rose-700 border-rose-200"
                    : "bg-gray-100 text-gray-600 border-gray-200"
                )}
              >
                {client.metrics.portalLogin?.status ?? "INACTIVE"}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs text-gray-600 pt-1">
              <div>
                <span className="text-gray-400 block text-[10px]">30d Logins</span>
                <span className="font-semibold text-gray-900">
                  {client.metrics.portalLogin?.total30d ?? 0}
                </span>
              </div>
              <div>
                <span className="text-gray-400 block text-[10px]">7d Activity</span>
                <span className="font-semibold text-gray-900">
                  {client.metrics.portalLogin?.total7d ?? 0}
                </span>
              </div>
              <div>
                <span className="text-gray-400 block text-[10px]">Last Active</span>
                <span className="font-semibold text-gray-900">
                  {client.metrics.portalLogin?.lastLoginAt
                    ? new Date(client.metrics.portalLogin.lastLoginAt).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "Never"}
                </span>
              </div>
            </div>

            <div className="p-2 rounded-lg bg-teal-100/50 border border-teal-200/50 text-[10px] text-teal-900 leading-relaxed">
              <strong>Telemetry Guardrail:</strong> Tracks administrative portal access without altering pedagogical rating. Offline/in-person classes are never penalized.
            </div>
          </div>

          {/* 5. Scale & Vital Stats */}
          <div className="grid grid-cols-3 gap-3 p-3.5 rounded-2xl bg-gray-50 border border-gray-200 text-center">
            <div>
              <p className="text-base font-bold text-gray-900">{client.counts.students}</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">Students</p>
            </div>
            <div>
              <p className="text-base font-bold text-gray-900">{client.counts.classes}</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">Classes</p>
            </div>
            <div>
              <p className="text-base font-bold text-gray-900">{client.counts.teachers}</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">Teachers</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50/80 flex items-center justify-between shrink-0">
          <button
            onClick={() => navigate(`/m/${client.slug}/admin`)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-gray-700 hover:text-primary-700 bg-white border border-gray-200 rounded-xl shadow-2xs cursor-pointer transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Launch Portal
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-xl cursor-pointer transition-colors shadow-2xs"
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
  const [superUsers, setSuperUsers] = useState<AssignableUser[]>([]);

  // Modals & Drawers
  const [selectedClientForAssign, setSelectedClientForAssign] = useState<UsageHealthClientItem | null>(null);
  const [selectedClientForDrawer, setSelectedClientForDrawer] = useState<UsageHealthClientItem | null>(null);

  // Load assignable users once
  useEffect(() => {
    if (!accessToken) return;
    listAssignableUsers(accessToken)
      .then((res) => setSuperUsers(res.data || []))
      .catch((err) => console.error("Failed to load assignable users", err));
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
    const assignedUser = superUsers.find((u) => u.id === newAssigneeId) || null;
    setData((prev) => {
      if (!prev) return prev;
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
    setSelectedClientForDrawer((prev) => {
      if (!prev || prev.id !== clientId) return prev;
      return {
        ...prev,
        assigneeId: newAssigneeId,
        assignee: assignedUser
          ? { id: assignedUser.id, name: assignedUser.name, username: assignedUser.identifier, role: assignedUser.role || "" }
          : null,
      };
    });
    loadData();
  };

  const summary = data?.summary;
  const clientsList = data?.data || [];
  const pagination = data?.pagination;

  return (
    <DashboardLayout>
      {/* Root Container strictly constrained with zero horizontal overflow */}
      <div className="space-y-6 max-w-7xl mx-auto pb-12 w-full min-w-0">
        {/* Header with concise copy to protect right-side actions */}
        <PageHeader
          title="Madrasa Usage Matrix"
          subtitle="Feature adoption scoring & portfolio accountability"
          action={
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => loadData()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 shadow-2xs transition-colors cursor-pointer"
              >
                <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
                Refresh
              </button>
              <button
                onClick={() => navigate("/admin/madrasas")}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-primary-600 rounded-xl hover:bg-primary-700 shadow-2xs transition-colors cursor-pointer"
              >
                <Building2 className="w-3.5 h-3.5" />
                Manage Madrasas
              </button>
            </div>
          }
        />

        {/* Unassigned Warning Banner */}
        {summary && summary.totalUnassignedCount > 0 && (
          <div className="p-3.5 sm:p-4 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 rounded-xl bg-amber-100 text-amber-800 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-amber-900 truncate">
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
              className="px-3.5 py-1.5 text-xs font-bold text-amber-900 bg-amber-200/80 hover:bg-amber-200 rounded-xl transition-colors shrink-0 cursor-pointer"
            >
              Review Unassigned Madrasas
            </button>
          </div>
        )}

        {/* Strategic Executive KPI Scorecards - Clean responsive grid */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3.5 w-full min-w-0">
            {/* 1. Overall Portfolio Health */}
            <div className="p-4 rounded-2xl bg-white border border-gray-100 shadow-2xs space-y-2 min-w-0 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 truncate">
                  Usage Health Index
                </span>
                <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 shrink-0">
                  <Activity className="w-4 h-4" />
                </span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className={cn("text-2xl sm:text-3xl font-extrabold", getScoreColor(summary.avgOverallScore))}>
                  {summary.avgOverallScore}
                </span>
                <span className="text-xs font-semibold text-gray-400">/ 100 avg</span>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-gray-500 flex-wrap pt-1 border-t border-gray-50">
                <span className="font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                  {summary.healthyCount} Champion
                </span>
                <span className="font-semibold text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded">
                  {summary.moderateCount} Steady
                </span>
                <span className="font-semibold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded">
                  {summary.dormantCount + summary.atRiskCount} At Risk
                </span>
              </div>
            </div>

            {/* 2. Daily Attendance Pillar */}
            <div className="p-4 rounded-2xl bg-white border border-gray-100 shadow-2xs space-y-2 min-w-0 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 truncate">
                  Attendance Habit
                </span>
                <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600 shrink-0">
                  <Calendar className="w-4 h-4" />
                </span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className={cn("text-2xl sm:text-3xl font-extrabold", getScoreColor(summary.avgAttendanceScore))}>
                  {summary.avgAttendanceScore}%
                </span>
                <span className="text-xs text-gray-400 font-medium">Daily Habit</span>
              </div>
              <p className="text-[10px] text-gray-500 pt-1 border-t border-gray-50 truncate">
                40% Weight · Roll-call consistency
              </p>
            </div>

            {/* 3. Ibadah Tracking Pillar */}
            <div className="p-4 rounded-2xl bg-white border border-gray-100 shadow-2xs space-y-2 min-w-0 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 truncate">
                  Ibadah Tracking
                </span>
                <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 shrink-0">
                  <Sparkles className="w-4 h-4" />
                </span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className={cn("text-2xl sm:text-3xl font-extrabold", getScoreColor(summary.avgIbadahScore))}>
                  {summary.avgIbadahScore}%
                </span>
                <span className="text-[10px] text-emerald-600 font-semibold truncate">Core Differentiator</span>
              </div>
              <p className="text-[10px] text-gray-500 pt-1 border-t border-gray-50 truncate">
                40% Weight · Prayer habit tracking
              </p>
            </div>

            {/* 4. Homework Pillar */}
            <div className="p-4 rounded-2xl bg-white border border-gray-100 shadow-2xs space-y-2 min-w-0 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 truncate">
                  Homework Tasks
                </span>
                <span className="p-1.5 rounded-lg bg-purple-50 text-purple-600 shrink-0">
                  <BookOpen className="w-4 h-4" />
                </span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className={cn("text-2xl sm:text-3xl font-extrabold", getScoreColor(summary.avgHomeworkScore))}>
                  {summary.avgHomeworkScore}%
                </span>
                <span className="text-[10px] text-purple-600 font-semibold">Academic Rigor</span>
              </div>
              <p className="text-[10px] text-gray-500 pt-1 border-t border-gray-50 truncate">
                20% Weight · Teacher assignments
              </p>
            </div>

            {/* 5. Portal Login Telemetry */}
            <div className="p-4 rounded-2xl bg-white border border-gray-100 shadow-2xs space-y-2 min-w-0 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 truncate">
                  Portal Login Access
                </span>
                <span className="p-1.5 rounded-lg bg-teal-50 text-teal-600 shrink-0">
                  <LogIn className="w-4 h-4" />
                </span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-extrabold text-teal-700">
                  {summary.totalPortalLogins30d ?? 0}
                </span>
                <span className="text-[10px] text-teal-600 font-semibold truncate">30d Logins</span>
              </div>
              <p className="text-[10px] text-gray-500 pt-1 border-t border-gray-50 truncate">
                {summary.activePortalsCount ?? 0} portals active · 0% score weight
              </p>
            </div>
          </div>
        )}

        {/* Filters & Controls */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-2xs space-y-3 w-full min-w-0">
          {/* Top Row: Assignee Quick Pills */}
          <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-gray-100">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-bold text-gray-600 mr-1 flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5 text-primary-600" />
                Portfolio View:
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
                    ? "bg-primary-600 text-white shadow-2xs"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                )}
              >
                <span>⭐ My Assigned ({user?.name || "Current User"})</span>
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
                    ? "bg-primary-600 text-white shadow-2xs"
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
                    ? "bg-amber-600 text-white shadow-2xs"
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
                    {u.name} ({u.role?.replace(/_/g, " ")}) {u.clientName ? `[${u.clientName}]` : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Bottom Row: Search, Tier, Sorting & Page Size */}
          <div className="flex items-center justify-between flex-wrap gap-2.5">
            {/* Search Input */}
            <div className="relative min-w-[200px] flex-1 max-w-sm">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search madrasa name, slug, city..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Tier Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-gray-500 font-medium">Tier:</span>
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
                <span className="text-xs text-gray-500 font-medium">Sort:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="text-xs px-2.5 py-1.5 border border-gray-200 rounded-xl bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 font-medium"
                >
                  <option value="overallScore">Overall Score</option>
                  <option value="ibadahScore">Ibadah Score</option>
                  <option value="attendanceScore">Attendance Score</option>
                  <option value="homeworkScore">Homework Score</option>
                  <option value="portalLogin">Portal Login Activity</option>
                  <option value="students">Student Count</option>
                  <option value="name">Madrasa Name</option>
                  <option value="lastActive">Recently Active</option>
                </select>
                <button
                  onClick={() => setSortOrder(sortOrder === "desc" ? "asc" : "desc")}
                  title={`Sort Order: ${sortOrder === "desc" ? "Descending" : "Ascending"}`}
                  className="p-1.5 border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-600 transition-colors cursor-pointer"
                >
                  <ArrowUpDown className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Streamlined Directory Table with Sticky Right Actions Column */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-2xs w-full min-w-0">
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
                  className="mt-2 px-4 py-2 text-xs font-semibold text-primary-700 bg-primary-50 hover:bg-primary-100 rounded-xl transition-colors cursor-pointer"
                >
                  View All Madrasas
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto w-full min-w-0">
              <table className="w-full text-left border-collapse min-w-[780px]">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/80 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                    <th className="py-3 px-4 min-w-[190px]">Madrasa & Identity</th>
                    <th className="py-3 px-3 min-w-[130px]">Account Assignee</th>
                    <th className="py-3 px-3 min-w-[90px] text-center">Health Index</th>
                    <th className="py-3 px-3 min-w-[200px]">Pedagogical Pillars (100%)</th>
                    <th className="py-3 px-3 min-w-[110px]">Portal Telemetry</th>
                    <th className="py-3 px-3 text-right min-w-[95px] sticky right-0 bg-gray-50/95 z-10 shadow-[-4px_0_8px_-2px_rgba(0,0,0,0.04)]">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs">
                  {clientsList.map((client) => {
                    const tierBadge = getTierBadge(client.scoring.healthTier);
                    return (
                      <tr
                        key={client.id}
                        className="hover:bg-gray-50/80 transition-colors group cursor-pointer"
                        onClick={() => setSelectedClientForDrawer(client)}
                      >
                        {/* 1. Madrasa Info & Strategy Tag */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-start gap-2.5">
                            <div className="relative shrink-0 mt-0.5">
                              <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary-700 font-bold flex items-center justify-center text-xs">
                                {client.name.charAt(0)}
                              </div>
                              <span
                                className={cn(
                                  "absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white",
                                  tierBadge.dot
                                )}
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-gray-900 group-hover:text-primary-700 transition-colors truncate max-w-[200px]">
                                {client.name}
                              </p>
                              <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-gray-400 truncate">
                                <span className="font-mono text-[10px] text-gray-400">{client.slug}</span>
                                <span>•</span>
                                <span>{client.counts.students} sts</span>
                                <span>•</span>
                                <span>{client.counts.classes} cls</span>
                                {client.city && (
                                  <>
                                    <span>•</span>
                                    <span className="truncate">{client.city}</span>
                                  </>
                                )}
                              </div>
                              {/* Strategy Pill in identity column */}
                              <div className="mt-1 flex items-center gap-1">
                                <span
                                  className="text-[10px] font-medium text-amber-900 bg-amber-50/90 border border-amber-200/70 px-1.5 py-0.5 rounded truncate max-w-[180px] block"
                                  title={`${client.scoring.recommendation}: ${client.scoring.priorityAction}`}
                                >
                                  💡 {client.scoring.recommendation}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* 2. Assignee */}
                        <td className="py-3.5 px-3" onClick={(e) => e.stopPropagation()}>
                          {client.assignee ? (
                            <button
                              onClick={() => setSelectedClientForAssign(client)}
                              className="flex items-center gap-2 hover:bg-gray-100/80 p-1 rounded-lg transition-colors text-left w-full cursor-pointer group/btn"
                              title="Click to change account manager"
                            >
                              <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-[10px] shrink-0">
                                {client.assignee.name.charAt(0)}
                              </div>
                              <div className="min-w-0 flex-1">
                                <span className="font-semibold text-gray-800 text-xs truncate block group-hover/btn:text-primary-700">
                                  {client.assignee.name}
                                </span>
                                <span className="text-[10px] text-gray-400 truncate block">
                                  {client.assignee.role?.replace(/_/g, " ")}
                                </span>
                              </div>
                            </button>
                          ) : (
                            <button
                              onClick={() => setSelectedClientForAssign(client)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition-colors cursor-pointer"
                              title="Assign an account manager"
                            >
                              <AlertCircle className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                              <span>Assign Manager</span>
                            </button>
                          )}
                        </td>

                        {/* 3. Overall Health Score */}
                        <td className="py-3.5 px-3 text-center">
                          <div className="inline-flex flex-col items-center">
                            <span className={cn("text-base font-extrabold tracking-tight", getScoreColor(client.scoring.overallScore))}>
                              {client.scoring.overallScore}
                              <span className="text-[10px] font-medium text-gray-400">/100</span>
                            </span>
                            <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full mt-0.5 border", tierBadge.bg)}>
                              {tierBadge.label}
                            </span>
                          </div>
                        </td>

                        {/* 4. Pedagogical Pillars (Clean 3-Chip Comparative View) */}
                        <td className="py-3.5 px-3">
                          <div className="grid grid-cols-3 gap-1.5 text-center min-w-[190px]">
                            {/* Attendance */}
                            <div className="p-1 rounded-lg bg-blue-50/70 border border-blue-100/80">
                              <div className="flex items-center justify-center gap-0.5 text-[9px] text-blue-700 font-semibold truncate">
                                <Calendar className="w-2.5 h-2.5 shrink-0" />
                                <span>Att (40%)</span>
                              </div>
                              <div className="text-xs font-extrabold text-blue-900 mt-0.5">
                                {client.metrics.attendance.score}%
                              </div>
                              <div className="text-[9px] text-blue-600/90 truncate">
                                {client.metrics.attendance.total30d} sess
                              </div>
                            </div>

                            {/* Ibadah */}
                            <div className="p-1 rounded-lg bg-emerald-50/70 border border-emerald-100/80">
                              <div className="flex items-center justify-center gap-0.5 text-[9px] text-emerald-700 font-semibold truncate">
                                <Sparkles className="w-2.5 h-2.5 shrink-0" />
                                <span>Iba (40%)</span>
                              </div>
                              <div className="text-xs font-extrabold text-emerald-900 mt-0.5">
                                {client.metrics.ibadah.score}%
                              </div>
                              <div className="text-[9px] text-emerald-600/90 truncate">
                                {client.metrics.ibadah.total30d} logs
                              </div>
                            </div>

                            {/* Homework */}
                            <div className="p-1 rounded-lg bg-purple-50/70 border border-purple-100/80">
                              <div className="flex items-center justify-center gap-0.5 text-[9px] text-purple-700 font-semibold truncate">
                                <BookOpen className="w-2.5 h-2.5 shrink-0" />
                                <span>HW (20%)</span>
                              </div>
                              <div className="text-xs font-extrabold text-purple-900 mt-0.5">
                                {client.metrics.homework.score}%
                              </div>
                              <div className="text-[9px] text-purple-600/90 truncate">
                                {client.metrics.homework.total30d} tasks
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* 5. Portal Telemetry (0% Rating Weight) */}
                        <td className="py-3.5 px-3">
                          <div className="space-y-0.5 min-w-[95px]">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={cn(
                                  "font-bold text-[9px] px-1.5 py-0.5 rounded-sm border shrink-0",
                                  client.metrics.portalLogin?.status === "FREQUENT"
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                    : client.metrics.portalLogin?.status === "RECENT"
                                    ? "bg-blue-50 text-blue-700 border-blue-200"
                                    : client.metrics.portalLogin?.status === "OCCASIONAL"
                                    ? "bg-amber-50 text-amber-700 border-amber-200"
                                    : client.metrics.portalLogin?.status === "DISABLED"
                                    ? "bg-rose-50 text-rose-700 border-rose-200"
                                    : "bg-gray-100 text-gray-600 border-gray-200"
                                )}
                              >
                                {client.metrics.portalLogin?.status ?? "INACTIVE"}
                              </span>
                              <span className="text-[10px] font-semibold text-gray-700 truncate">
                                {client.metrics.portalLogin?.total30d ?? 0} logins
                              </span>
                            </div>
                            <p className="text-[10px] text-gray-400 truncate">
                              {client.metrics.portalLogin?.lastLoginAt
                                ? `Last: ${new Date(client.metrics.portalLogin.lastLoginAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}`
                                : "No portal logins"}
                            </p>
                            <span className="text-[9px] text-gray-400 block font-mono">
                              (0% weight)
                            </span>
                          </div>
                        </td>

                        {/* 6. Sticky Actions Column - Perfectly pinned to the right edge */}
                        <td
                          className="py-3.5 px-3 text-right sticky right-0 bg-white group-hover:bg-gray-50/95 z-10 shadow-[-4px_0_8px_-2px_rgba(0,0,0,0.04)]"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => setSelectedClientForDrawer(client)}
                              title="View deep-dive telemetry"
                              className="p-1.5 rounded-lg text-primary-600 hover:text-primary-700 hover:bg-primary-50 transition-colors cursor-pointer"
                            >
                              <Info className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setSelectedClientForAssign(client)}
                              title="Assign or reassign owner"
                              className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                            >
                              <UserCheck className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => navigate(`/m/${client.slug}/admin`)}
                              title="Open Madrasa Portal"
                              className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
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
            <div className="p-3.5 sm:p-4 border-t border-gray-100 flex items-center justify-between flex-wrap gap-3 text-xs bg-gray-50/50">
              <div className="flex items-center gap-2 text-gray-500 font-medium">
                <span>
                  Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} madrasas
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  Rows:
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
                  className="px-2.5 py-1.5 border border-gray-200 rounded-lg bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <span className="px-3 py-1 text-xs font-semibold text-gray-700">
                  Page {pagination.page} of {pagination.totalPages || 1}
                </span>

                <button
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-2.5 py-1.5 border border-gray-200 rounded-lg bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
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
