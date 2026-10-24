import { useState, useEffect } from "react";
import { getGlobalMetrics, getDailyOperations, type GlobalMetrics, type DailyOperations, runChurnCheck } from "@/lib/crm-api";
import { useAuthStore } from "@/store/auth";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useNavigate } from "react-router-dom";
import {
  Users, CreditCard, BarChart3, ShieldCheck, AlertTriangle,
  ClipboardList, CheckCircle, Clock, Calendar, ArrowRight,
  TrendingUp, Activity, Inbox, Play, RefreshCw, MessageSquare,
  Sparkles, Zap, Search, X
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export default function OperationsDashboard() {
  const { accessToken, user } = useAuthStore();
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<GlobalMetrics | null>(null);
  const [ops, setOps] = useState<DailyOperations | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [queueSearch, setQueueSearch] = useState("");

  const loadData = async () => {
    if (!accessToken) return;
    setError(null);
    try {
      const [m, o] = await Promise.all([
        getGlobalMetrics(accessToken).catch(() => null),
        getDailyOperations(accessToken).catch(() => null)
      ]);
      if (m) setMetrics(m);
      if (o) setOps(o);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleChurnCheck = async () => {
    if (!accessToken) return;
    setRefreshing(true);
    try {
      await runChurnCheck(accessToken);
      await loadData();
    } catch (e) {
      setError("Failed to run churn diagnostic: " + (e as Error).message);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [accessToken]); // eslint-disable-line

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3">
          <RefreshCw className="w-10 h-10 animate-spin text-emerald-600" />
          <p className="text-gray-500 text-sm">Loading Operations Center...</p>
        </div>
      </DashboardLayout>
    );
  }

  // Define metric cards to render based on permissions
  const showFinancials = ["SUPER_ADMIN", "FINANCE_EXECUTIVE", "SALES_MANAGER"].includes(user?.actorType ?? "");

  const statCards = [
    { label: "Total Leads", value: metrics?.totalLeads ?? 0, icon: Users, color: "from-blue-500 to-indigo-600" },
    { label: "Active Demos/Trials", value: metrics?.activeTrials ?? 0, icon: Play, color: "from-emerald-400 to-teal-600" },
    { label: "Active Madrasas", value: metrics?.activeMadrasas ?? 0, icon: Activity, color: "from-purple-500 to-indigo-600" },
    { label: "Open Tickets", value: metrics?.openTickets ?? 0, icon: ShieldCheck, color: "from-amber-500 to-orange-600" }
  ];

  const financialCards = showFinancials ? [
    { label: "Revenue This Month", value: `₹${(metrics?.revenueThisMonth ?? 0).toLocaleString()}`, icon: TrendingUp },
    { label: "Estimated MRR", value: `₹${(metrics?.mrr ?? 0).toLocaleString()}`, icon: CreditCard },
    { label: "ARR Forecast", value: `₹${(metrics?.arr ?? 0).toLocaleString()}`, icon: BarChart3 },
    { label: "Conversion Rate", value: `${metrics?.conversionRate ?? 0}%`, icon: CheckCircle }
  ] : [];

  return (
    <DashboardLayout>
      <div className="pb-24 space-y-6">
      {/* Top Welcome Banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative bg-gradient-to-r from-emerald-800 to-teal-600 rounded-3xl p-6 text-white overflow-hidden shadow-lg"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full translate-x-20 -translate-y-20 blur-2xl" />
        <p className="text-teal-200 text-xs font-bold uppercase tracking-widest mb-1">
          SaaS Operations & Growth Hub
        </p>
        <h1 className="text-2xl font-black mb-2">Welcome, {user?.name}</h1>
        <p className="text-teal-100 text-sm max-w-xl">
          Role: <span className="font-semibold text-white uppercase tracking-wider">{user?.actorType.replace(/_/g, " ")}</span>
        </p>
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => { setRefreshing(true); loadData(); }}
            disabled={refreshing}
            className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white font-bold text-xs px-4 py-2 rounded-xl backdrop-blur transition-all active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", refreshing && "animate-spin")} />
            Refresh Queue
          </button>
          {["SUPER_ADMIN", "CUSTOMER_SUCCESS_MANAGER"].includes(user?.actorType ?? "") && (
            <button
              onClick={handleChurnCheck}
              disabled={refreshing}
              className="flex items-center gap-1.5 bg-rose-600/35 hover:bg-rose-600/50 text-rose-100 border border-rose-500/30 font-bold text-xs px-4 py-2 rounded-xl backdrop-blur transition-all active:scale-95 disabled:opacity-50"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Diagnose CS Churn
            </button>
          )}
        </div>
      </motion.div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl p-4 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={loadData} className="font-bold underline">Retry</button>
        </div>
      )}

      {/* Main Metrics Panels */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((c, i) => {
          const Icon = c.icon;
          return (
            <motion.div
              key={c.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-white rounded-3xl p-4 border border-gray-100 shadow-sm flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <p className="text-gray-400 text-xs font-semibold uppercase">{c.label}</p>
                <div className={cn("p-2 rounded-2xl bg-gradient-to-br text-white", c.color)}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-gray-800 mt-3">{c.value}</p>
            </motion.div>
          );
        })}
      </div>

      {showFinancials && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {financialCards.map((c, i) => {
            const Icon = c.icon;
            return (
              <motion.div
                key={c.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: (i + 4) * 0.05 }}
                className="bg-emerald-50/50 border border-emerald-100 rounded-3xl p-4 flex flex-col justify-between"
              >
                <div className="flex items-center justify-between">
                  <p className="text-emerald-800 text-xs font-semibold uppercase">{c.label}</p>
                  <div className="p-2 rounded-2xl bg-emerald-100 text-emerald-800">
                    <Icon className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-2xl font-black text-emerald-950 mt-3">{c.value}</p>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ── OPERATIONAL FOCUS & SMART AI RADAR ── */}
      {(() => {
        const missedCount = ops?.missedFollowUps.length || 0;
        const todayCount = ops?.followUpsToday.length || 0;
        const slaBreachCount = (ops?.activeTickets || []).filter(t => t.slaBreached).length;
        const overdueTasksCount = ops?.overdueTasks.length || 0;
        const criticalCsCount = ops?.criticalCustomers.length || 0;

        const hasUrgentIssues = missedCount > 0 || slaBreachCount > 0 || overdueTasksCount > 0 || criticalCsCount > 0;

        return (
          <div className="bg-white rounded-3xl border border-gray-100 p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-2xl bg-amber-500/10 text-amber-600">
                  <Sparkles className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-sm font-black text-gray-800">Operational Focus & Smart AI Radar</h3>
                  <p className="text-[11px] text-gray-400">Prioritized tactical actions to maximize customer retention and sales velocity</p>
                </div>
              </div>
              <span className={cn(
                "text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full border self-start sm:self-center shadow-2xs",
                hasUrgentIssues ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"
              )}>
                {hasUrgentIssues ? "Attention Needed" : "All Queues Healthy"}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {/* Overdue Follow-ups */}
              {missedCount > 0 && (
                <div className="p-4 rounded-2xl bg-gradient-to-br from-rose-50/80 to-white border border-rose-200/80 flex flex-col justify-between gap-3 shadow-2xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-rose-800">Sales Urgency</span>
                    </div>
                    <h4 className="text-xs font-black text-rose-950">{missedCount} Overdue Follow-up(s)</h4>
                    <p className="text-[11px] text-rose-800/80 leading-relaxed">
                      Calling delayed prospects within 24 hours prevents deals from dropping off.
                    </p>
                  </div>
                  <button
                    onClick={() => navigate("/admin/crm/leads?filter=overdue")}
                    className="w-full py-2 px-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 flex items-center justify-center gap-1.5"
                  >
                    Resolve Overdue Leads <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Tickets Breached SLA */}
              {slaBreachCount > 0 && (
                <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50/80 to-white border border-amber-200/80 flex flex-col justify-between gap-3 shadow-2xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">Support SLA Risk</span>
                    </div>
                    <h4 className="text-xs font-black text-amber-950">{slaBreachCount} Ticket(s) Past SLA</h4>
                    <p className="text-[11px] text-amber-800/80 leading-relaxed">
                      Support tickets have exceeded the guaranteed response window. Reassign or resolve.
                    </p>
                  </div>
                  <button
                    onClick={() => navigate("/admin/crm/support")}
                    className="w-full py-2 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 flex items-center justify-center gap-1.5"
                  >
                    Open Support Desk <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Critical CS Churn Accounts */}
              {criticalCsCount > 0 && (
                <div className="p-4 rounded-2xl bg-gradient-to-br from-orange-50/80 to-white border border-orange-200/80 flex flex-col justify-between gap-3 shadow-2xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-orange-800">Customer Success</span>
                    </div>
                    <h4 className="text-xs font-black text-orange-950">{criticalCsCount} Madrasa(s) At Risk</h4>
                    <p className="text-[11px] text-orange-800/80 leading-relaxed">
                      Inactivity detected in portal usage. Check in with madrasa administrators.
                    </p>
                  </div>
                  <button
                    onClick={handleChurnCheck}
                    className="w-full py-2 px-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 flex items-center justify-center gap-1.5"
                  >
                    Run CS Health Audit <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Today's Scheduled Follow-ups */}
              {todayCount > 0 && (
                <div className="p-4 rounded-2xl bg-gradient-to-br from-sky-50/80 to-white border border-sky-200/80 flex flex-col justify-between gap-3 shadow-2xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-sky-800">Daily Routine</span>
                    </div>
                    <h4 className="text-xs font-black text-sky-950">{todayCount} Outreach Due Today</h4>
                    <p className="text-[11px] text-sky-800/80 leading-relaxed">
                      Complete today's scheduled calls and demonstrations on time.
                    </p>
                  </div>
                  <button
                    onClick={() => navigate("/admin/crm/leads?filter=today")}
                    className="w-full py-2 px-3 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 flex items-center justify-center gap-1.5"
                  >
                    View Today's Outreach <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Overdue Tasks */}
              {overdueTasksCount > 0 && (
                <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-50/80 to-white border border-purple-200/80 flex flex-col justify-between gap-3 shadow-2xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <ClipboardList className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-purple-800">Pending Tasks</span>
                    </div>
                    <h4 className="text-xs font-black text-purple-950">{overdueTasksCount} Overdue Task(s)</h4>
                    <p className="text-[11px] text-purple-800/80 leading-relaxed">
                      Clear operational blockers and complete internal task assignments.
                    </p>
                  </div>
                  <button
                    onClick={() => navigate("/admin/crm/leads")}
                    className="w-full py-2 px-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 flex items-center justify-center gap-1.5"
                  >
                    View Assigned Tasks <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Perfect Queue Condition */}
              {!hasUrgentIssues && (
                <div className="col-span-full p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-700">
                      <CheckCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-emerald-950">Clean Operational Deck</h4>
                      <p className="text-[11px] text-emerald-800/80">All support tickets, follow-ups, and customer health parameters are completely on track.</p>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate("/admin/crm/leads")}
                    className="py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 shrink-0 flex items-center gap-1"
                  >
                    Expand Pipeline <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* OPERATIONS CENTER: DAILY QUEUES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Side: Follow-up Queue */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h2 className="text-lg font-black text-gray-800 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-emerald-600" />
              Follow-up Queue
            </h2>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-gray-400" />
                <input
                  type="text"
                  value={queueSearch}
                  onChange={e => setQueueSearch(e.target.value)}
                  placeholder="Filter queue..."
                  className="w-40 sm:w-48 pl-8 pr-7 py-1.5 bg-white border border-gray-200 rounded-xl text-xs placeholder-gray-400 focus:outline-none focus:border-emerald-500 shadow-2xs"
                />
                {queueSearch && (
                  <button onClick={() => setQueueSearch("")} className="absolute right-2 top-2 text-gray-400 hover:text-gray-600">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <button
                onClick={() => navigate("/admin/crm/leads")}
                className="text-xs font-bold text-emerald-600 flex items-center gap-1 hover:underline shrink-0"
              >
                CRM Pipeline <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Today's Queue Card */}
          <div className="bg-white rounded-3xl border border-gray-100 p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-600 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
              Today's Action Required ({ops?.followUpsToday.length ?? 0})
            </h3>
            {(() => {
              const list = (ops?.followUpsToday || []).filter(f =>
                !queueSearch ||
                f.name.toLowerCase().includes(queueSearch.toLowerCase()) ||
                f.place?.toLowerCase().includes(queueSearch.toLowerCase())
              );

              if (list.length === 0) {
                return (
                  <div className="text-center py-6 text-gray-400 text-sm">
                    <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                    {queueSearch ? "No items matching filter." : "All set for today! No pending followups."}
                  </div>
                );
              }

              return (
                <div className="divide-y divide-gray-50 max-h-60 overflow-y-auto pr-1">
                  {list.map((f) => (
                    <div
                      key={f.id}
                      onClick={() => navigate(`/admin/crm/leads?id=${f.id}`)}
                      className="py-3 flex items-center justify-between cursor-pointer hover:bg-gray-50/50 px-2 rounded-xl transition-all"
                    >
                      <div>
                        <h4 className="text-sm font-bold text-gray-800">{f.name}</h4>
                        <p className="text-xs text-gray-400">{f.place}, {f.status.replace(/_/g, " ")}</p>
                        {f.timeline && f.timeline.length > 0 && f.timeline[0]?.notes && (
                          <p className="text-[10px] text-gray-500 mt-1 line-clamp-1 italic bg-white/80 px-2 py-0.5 rounded border border-gray-100">
                            💬 {f.timeline[0].notes}
                          </p>
                        )}
                      </div>
                      <ArrowRight className="w-4 h-4 text-gray-300" />
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>

          {/* Missed Followups Card */}
          <div className="bg-rose-50/30 rounded-3xl border border-rose-100 p-5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-rose-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              Overdue / Missed Actions ({ops?.missedFollowUps.length ?? 0})
            </h3>
            {(() => {
              const list = (ops?.missedFollowUps || []).filter(f =>
                !queueSearch ||
                f.name.toLowerCase().includes(queueSearch.toLowerCase()) ||
                f.place?.toLowerCase().includes(queueSearch.toLowerCase())
              );

              if (list.length === 0) {
                return (
                  <div className="text-center py-4 text-emerald-700 text-xs font-semibold">
                    {queueSearch ? "No overdue items matching filter." : "🎉 Awesome! No missed follow-up schedules."}
                  </div>
                );
              }

              return (
                <div className="divide-y divide-rose-100/50 max-h-60 overflow-y-auto pr-1">
                  {list.map((f) => (
                    <div
                      key={f.id}
                      onClick={() => navigate(`/admin/crm/leads?id=${f.id}`)}
                      className="py-3 flex items-center justify-between cursor-pointer hover:bg-rose-50 px-2 rounded-xl transition-all"
                    >
                      <div>
                        <h4 className="text-sm font-bold text-rose-950">{f.name}</h4>
                        <p className="text-xs text-rose-600/70">{f.place} • Next: {f.nextFollowUpDate ? new Date(f.nextFollowUpDate).toLocaleDateString() : "No date"}</p>
                        {f.timeline && f.timeline.length > 0 && f.timeline[0]?.notes && (
                          <p className="text-[10px] text-rose-800/80 mt-1 line-clamp-1 italic bg-white/80 px-2 py-0.5 rounded border border-rose-100">
                            💬 {f.timeline[0].notes}
                          </p>
                        )}
                      </div>
                      <ArrowRight className="w-4 h-4 text-rose-400" />
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>

        {/* Right Side: Tasks & Tickets */}
        <div className="space-y-6">
          {/* Tasks Section */}
          <div className="space-y-4">
            <h2 className="text-lg font-black text-gray-800 flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-emerald-600" />
              Critical Tasks ({ (ops?.tasksToday.length ?? 0) + (ops?.overdueTasks.length ?? 0) })
            </h2>
            <div className="bg-white rounded-3xl border border-gray-100 p-5 shadow-sm space-y-3">
              {ops?.tasksToday.length === 0 && ops?.overdueTasks.length === 0 ? (
                <div className="text-center py-6 text-gray-400 text-sm">
                  <Inbox className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  No pending tasks assigned to you.
                </div>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {ops?.overdueTasks.map((t) => (
                    <div key={t.id} className="p-3 bg-rose-50/50 rounded-2xl border border-rose-100 flex items-start justify-between">
                      <div>
                        <span className="bg-rose-100 text-rose-800 text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase mr-2">Overdue</span>
                        <h4 className="text-xs font-bold text-rose-950 inline">{t.title}</h4>
                        <p className="text-[10px] text-rose-700/80 mt-1">Due: {new Date(t.dueDate).toLocaleDateString()} {t.lead ? `• ${t.lead.name}` : ""}</p>
                      </div>
                      <span className="text-[10px] font-bold text-rose-700">{t.priority}</span>
                    </div>
                  ))}
                  {ops?.tasksToday.map((t) => (
                    <div key={t.id} className="p-3 bg-gray-50/50 rounded-2xl border border-gray-100 flex items-start justify-between">
                      <div>
                        <span className="bg-amber-100 text-amber-800 text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase mr-2">Today</span>
                        <h4 className="text-xs font-bold text-gray-800 inline">{t.title}</h4>
                        <p className="text-[10px] text-gray-500 mt-1">{t.lead ? `Lead: ${t.lead.name}` : ""}</p>
                      </div>
                      <span className="text-[10px] font-bold text-amber-700">{t.priority}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Tickets Section */}
          {["SUPER_ADMIN", "CUSTOMER_SUCCESS_MANAGER", "SUPPORT_EXECUTIVE"].includes(user?.actorType ?? "") && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-black text-gray-800 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-emerald-600" />
                  Active Support Tickets ({ops?.activeTickets.length ?? 0})
                </h2>
                <button
                  onClick={() => navigate("/admin/crm/support")}
                  className="text-xs font-bold text-emerald-600 hover:underline"
                >
                  Support Portal
                </button>
              </div>
              <div className="bg-white rounded-3xl border border-gray-100 p-5 shadow-sm space-y-3">
                {ops?.activeTickets.length === 0 ? (
                  <div className="text-center py-6 text-gray-400 text-sm">
                    All support tickets resolved! Clean desk.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {ops?.activeTickets.map((t) => (
                      <div
                        key={t.id}
                        onClick={() => navigate("/admin/crm/support")}
                        className="p-3 hover:bg-gray-50 cursor-pointer rounded-2xl border border-gray-50 flex items-center justify-between transition-all"
                      >
                        <div>
                          <h4 className="text-xs font-bold text-gray-800">{t.title}</h4>
                          <p className="text-[10px] text-gray-400">{t.client.name} • {t.status.replace(/_/g, " ")}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {t.slaBreached && (
                            <span className="bg-rose-100 text-rose-800 text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase">SLA Breach</span>
                          )}
                          <span className="text-[9px] font-bold bg-amber-50 text-amber-800 px-2 py-0.5 rounded-md">{t.priority}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* CS Risk Section */}
          {["SUPER_ADMIN", "CUSTOMER_SUCCESS_MANAGER"].includes(user?.actorType ?? "") && (
            <div className="space-y-4">
              <h2 className="text-lg font-black text-rose-800 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
                Critical CS Churn Flags ({ops?.criticalCustomers.length ?? 0})
              </h2>
              <div className="bg-rose-50/20 rounded-3xl border border-rose-100 p-5 space-y-3">
                {ops?.criticalCustomers.length === 0 ? (
                  <div className="text-center py-4 text-emerald-800 text-xs font-bold">
                    No customers at active churn risk.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {ops?.criticalCustomers.map((c) => (
                      <div key={c.id} className="p-3 bg-white rounded-2xl border border-rose-100 flex items-center justify-between">
                        <div>
                          <h4 className="text-xs font-bold text-rose-950">{c.client.name}</h4>
                          <p className="text-[9px] text-rose-700/80 mt-0.5">{c.riskReason}</p>
                        </div>
                        <button
                          onClick={() => navigate(`/admin/crm/leads?id=${c.id}`)}
                          className="bg-rose-100 text-rose-800 hover:bg-rose-200 text-[10px] font-bold py-1 px-3 rounded-lg transition-all"
                        >
                          Review CSM
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      </div>
    </DashboardLayout>
  );
}
