import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { getActivityLogs, type ActivityLogItem } from "@/lib/super-admin-api";
import { useAuthStore } from "@/store/auth";
import { motion } from "framer-motion";
import { Activity, Loader2, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const ACTOR_COLORS: Record<string, string> = {
  SUPER_ADMIN:  "bg-purple-100 text-purple-700",
  CLIENT_ADMIN: "bg-blue-100 text-blue-700",
  TEACHER:      "bg-emerald-100 text-emerald-700",
  PARENT:       "bg-amber-100 text-amber-700",
  COMMITTEE:    "bg-pink-100 text-pink-700",
};

const ACTION_ICONS: Record<string, string> = {
  AUTH_LOGIN:                   "🔐",
  AUTH_IMPERSONATE:             "🎭",
  ATTENDANCE_BULK_UPSERT:       "📋",
  ATTENDANCE_UPDATE:            "✏️",
  HOMEWORK_CREATE:              "📝",
  HOMEWORK_UPDATE:              "✏️",
  HOMEWORK_DELETE:              "🗑️",
  HOMEWORK_SUBMISSIONS_UPDATE:  "✅",
  DIARY_UPSERT:                 "📔",
  DIARY_UPDATE:                 "✏️",
  DIARY_DELETE:                 "🗑️",
  IBADAH_BULK_UPSERT:           "🤲",
  FEE_TYPE_CREATE:              "💰",
  FEE_TYPE_UPDATE:              "✏️",
  FEE_TYPE_DELETE:              "🗑️",
  FEE_PAYMENT_RECORD:           "💳",
  FEE_PAYMENT_UPDATE:           "✏️",
  FEE_PAYMENTS_GENERATE:        "⚡",
  NOTIFICATION_CREATE:          "🔔",
  NOTIFICATION_DELETE:          "🗑️",
  CLIENT_UPDATE:                "⚙️",
  SUBSCRIPTION_PAYMENT_RECORD:  "💳",
};

const ALL_ACTORS = ["", "SUPER_ADMIN", "CLIENT_ADMIN", "TEACHER", "PARENT", "COMMITTEE"];
const TAKE = 30;

export default function ActivityLogsPage() {
  const { user, accessToken, activeClientId } = useAuthStore();
  const cid   = activeClientId ?? "";
  const token = accessToken ?? "";

  const [logs, setLogs]       = useState<ActivityLogItem[]>([]);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(0);
  const [loading, setLoading] = useState(false);
  const [actorType, setActorType] = useState("");
  const [action, setAction]       = useState("");

  const load = useCallback(() => {
    if (!cid || !token) return;
    setLoading(true);
    getActivityLogs(cid, token, {
      actorType: actorType || undefined,
      action: action || undefined,
      skip: page * TAKE,
      take: TAKE,
    })
      .then((r) => { setLogs(r.data); setTotal(r.total); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [cid, token, actorType, action, page]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.ceil(total / TAKE);

  return (
    <DashboardLayout>
      <PageHeader title="Activity Logs" back backHref="/admin/reports" />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <select
          value={actorType}
          onChange={(e) => { setActorType(e.target.value); setPage(0); }}
          className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
        >
          <option value="">All roles</option>
          {ALL_ACTORS.slice(1).map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <input
          type="text"
          value={action}
          onChange={(e) => { setAction(e.target.value.toUpperCase()); setPage(0); }}
          placeholder="Filter by action…"
          className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400 min-w-[180px]"
        />
        <button
          onClick={() => { setActorType(""); setAction(""); setPage(0); }}
          className="text-xs text-gray-400 hover:text-gray-700 px-3 py-2 rounded-xl hover:bg-gray-50 transition-all"
        >
          Clear
        </button>
        <button
          onClick={load}
          className="ml-auto flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl hover:bg-emerald-100 transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* Summary */}
      <p className="text-xs text-gray-400 mb-3">
        {total} total entries{actorType || action ? " (filtered)" : ""}
      </p>

      {/* Log list */}
      {loading ? (
        <div className="flex items-center gap-2 text-gray-400 text-sm py-12 justify-center">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading logs...
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Activity className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-semibold">No activity found</p>
          <p className="text-xs mt-1">Mutations and logins are recorded here.</p>
        </div>
      ) : (
        <div className="space-y-2 mb-6">
          {logs.map((log, i) => (
            <motion.div
              key={log.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}
              className="bg-white rounded-2xl border border-gray-100 px-4 py-3 flex items-start gap-3"
            >
              <span className="text-lg shrink-0 mt-0.5" aria-hidden>
                {ACTION_ICONS[log.action] ?? "📌"}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                  <span className="text-sm font-semibold text-gray-900">{log.action}</span>
                  <span className={cn(
                    "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                    ACTOR_COLORS[log.actorType] ?? "bg-gray-100 text-gray-500",
                  )}>
                    {log.actorType}
                  </span>
                  {log.resource && (
                    <span className="text-[10px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded-full">
                      {log.resource}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500">
                  {log.actorName ?? log.actorId.slice(0, 20)}
                  {log.resourceId && (
                    <span className="text-gray-300 ml-1">· {log.resourceId.slice(0, 8)}…</span>
                  )}
                </p>
                {log.meta && typeof log.meta === "object" && Object.keys(log.meta).length > 0 && (
                  <p className="text-[10px] text-gray-400 mt-0.5 font-mono truncate">
                    {JSON.stringify(log.meta).slice(0, 80)}
                  </p>
                )}
              </div>
              <time className="text-[10px] text-gray-400 shrink-0 text-right">
                {new Date(log.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                <br />
                {new Date(log.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
              </time>
            </motion.div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pb-24">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="flex items-center gap-1 px-3 py-2 text-xs font-semibold rounded-xl border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition-all"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Prev
          </button>
          <span className="text-xs text-gray-500">
            Page {page + 1} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="flex items-center gap-1 px-3 py-2 text-xs font-semibold rounded-xl border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition-all"
          >
            Next <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </DashboardLayout>
  );
}
