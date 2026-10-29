import { useState, useEffect } from "react";
import {
  getGlobalMetrics,
  getDailyOperations,
  type GlobalMetrics,
  type DailyOperations,
  runChurnCheck,
} from "@/lib/crm-api";
import { useAuthStore } from "@/store/auth";
import { DashboardLayout } from "@/components/DashboardLayout";
import { CrmSubNav } from "@/components/crm/CrmSubNav";
import { useNavigate } from "react-router-dom";
import {
  Users,
  CreditCard,
  BarChart3,
  ShieldCheck,
  AlertTriangle,
  ClipboardList,
  CheckCircle,
  Clock,
  Calendar,
  ArrowRight,
  TrendingUp,
  Activity,
  Inbox,
  Play,
  RefreshCw,
  MessageSquare,
  Sparkles,
  Zap,
  Search,
  X,
  Phone,
  ChevronRight,
  ShieldAlert,
  Flame,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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
  const [activeQueueTab, setActiveQueueTab] = useState<"followups" | "tasks" | "tickets" | "csRisk">("followups");

  const loadData = async () => {
    if (!accessToken) return;
    setError(null);
    try {
      const [m, o] = await Promise.all([
        getGlobalMetrics(accessToken).catch(() => null),
        getDailyOperations(accessToken).catch(() => null),
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
        <div className="pb-20">
          <CrmSubNav />
          <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
            <RefreshCw className="w-9 h-9 animate-spin text-emerald-600" />
            <p className="text-gray-600 text-sm font-semibold">Loading Operations Hub...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const showFinancials = ["SUPER_ADMIN", "FINANCE_EXECUTIVE", "SALES_MANAGER"].includes(user?.actorType ?? "");
  const isSuperOrCS = ["SUPER_ADMIN", "CUSTOMER_SUCCESS_MANAGER"].includes(user?.actorType ?? "");
  const canViewTickets = ["SUPER_ADMIN", "CUSTOMER_SUCCESS_MANAGER", "SUPPORT_EXECUTIVE"].includes(user?.actorType ?? "");

  const statCards = [
    { label: "Total Leads", value: (metrics?.totalLeads ?? 0).toLocaleString(), icon: Users, tone: "text-blue-600 bg-blue-50 border-blue-100" },
    { label: "Active Demos / Trials", value: (metrics?.activeTrials ?? 0).toLocaleString(), icon: Play, tone: "text-emerald-600 bg-emerald-50 border-emerald-100" },
    { label: "Active Madrasas", value: (metrics?.activeMadrasas ?? 0).toLocaleString(), icon: Activity, tone: "text-purple-600 bg-purple-50 border-purple-100" },
    { label: "Open Tickets", value: (metrics?.openTickets ?? 0).toLocaleString(), icon: ShieldCheck, tone: "text-amber-600 bg-amber-50 border-amber-100" },
  ];

  const financialCards = showFinancials
    ? [
        { label: "Revenue This Month", value: `₹${(metrics?.revenueThisMonth ?? 0).toLocaleString("en-IN")}`, icon: TrendingUp },
        { label: "Estimated MRR", value: `₹${(metrics?.mrr ?? 0).toLocaleString("en-IN")}`, icon: CreditCard },
        { label: "ARR Forecast", value: `₹${(metrics?.arr ?? 0).toLocaleString("en-IN")}`, icon: BarChart3 },
        { label: "Conversion Rate", value: `${metrics?.conversionRate ?? 0}%`, icon: CheckCircle },
      ]
    : [];

  const missedCount = ops?.missedFollowUps.length || 0;
  const todayCount = ops?.followUpsToday.length || 0;
  const slaBreachCount = (ops?.activeTickets || []).filter((t) => t.slaBreached).length;
  const overdueTasksCount = ops?.overdueTasks.length || 0;
  const criticalCsCount = ops?.criticalCustomers.length || 0;
  const totalTasksCount = (ops?.tasksToday.length || 0) + overdueTasksCount;
  const totalTicketsCount = ops?.activeTickets.length || 0;

  const hasUrgentIssues = missedCount > 0 || slaBreachCount > 0 || overdueTasksCount > 0 || criticalCsCount > 0;

  return (
    <DashboardLayout>
      <div className="pb-24 space-y-6">
        {/* Persistent CRM Sub-Navigation */}
        <CrmSubNav />

        {/* ── Executive Command Header ── */}
        <div className="bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden border border-emerald-800/40">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>Executive Operations &amp; Growth Hub</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                Welcome back, {user?.name || "Operations Lead"}
              </h1>
              <p className="text-slate-300 text-sm max-w-xl leading-relaxed">
                Role: <span className="font-semibold text-emerald-400 uppercase tracking-wide">{user?.actorType.replace(/_/g, " ")}</span>
                {" "}• Prioritized daily action queue for sales conversion and customer retention.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setRefreshing(true);
                  loadData();
                }}
                disabled={refreshing}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 active:bg-white/25 text-white font-bold text-sm px-5 py-3 rounded-2xl backdrop-blur-md transition-all active:scale-[0.98] border border-white/15 min-h-[44px]"
              >
                <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
                <span>Refresh Hub</span>
              </button>

              {isSuperOrCS && (
                <button
                  type="button"
                  onClick={handleChurnCheck}
                  disabled={refreshing}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-bold text-sm px-5 py-3 rounded-2xl transition-all shadow-sm active:scale-[0.98] border border-rose-500 min-h-[44px]"
                >
                  <AlertTriangle className="w-4 h-4" />
                  <span>Run CS Audit</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Feedback Alert */}
        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-900 rounded-2xl p-4 text-sm flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span className="font-medium">{error}</span>
            </div>
            <button
              onClick={loadData}
              className="text-xs font-bold text-rose-700 hover:underline uppercase px-2 py-1"
            >
              Retry
            </button>
          </div>
        )}

        {/* ── Key Metrics Grid ── */}
        <section aria-label="Key CRM Metrics">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {statCards.map((c) => {
              const Icon = c.icon;
              return (
                <div
                  key={c.label}
                  className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-gray-200/80 shadow-xs flex flex-col justify-between transition-all hover:shadow-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
                      {c.label}
                    </p>
                    <div className={cn("p-2 rounded-xl border shrink-0", c.tone)}>
                      <Icon className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="text-2xl sm:text-3xl font-black text-gray-900 mt-3 tracking-tight">
                    {c.value}
                  </p>
                </div>
              );
            })}
          </div>

          {showFinancials && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-3 sm:mt-4">
              {financialCards.map((c) => {
                const Icon = c.icon;
                return (
                  <div
                    key={c.label}
                    className="bg-emerald-50/60 border border-emerald-200/70 rounded-2xl sm:rounded-3xl p-4 sm:p-5 flex flex-col justify-between shadow-2xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                        {c.label}
                      </p>
                      <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800 shrink-0">
                        <Icon className="w-4 h-4" />
                      </div>
                    </div>
                    <p className="text-2xl sm:text-3xl font-black text-emerald-950 mt-3 tracking-tight">
                      {c.value}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── OPERATIONAL FOCUS & SMART AI RADAR ── */}
        <div className="bg-white rounded-3xl border border-gray-200/80 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <span className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-700 shrink-0">
                <Sparkles className="w-5 h-5 text-amber-600" />
              </span>
              <div>
                <h2 className="text-base sm:text-lg font-black text-gray-900 tracking-tight">
                  Operational Radar &amp; Smart Priorities
                </h2>
                <p className="text-xs text-gray-500">
                  Critical tactical blockers that need resolution to keep sales and retention velocity high
                </p>
              </div>
            </div>
            <span
              className={cn(
                "text-xs font-black uppercase tracking-wider px-3.5 py-1.5 rounded-full border self-start sm:self-center shrink-0",
                hasUrgentIssues
                  ? "bg-rose-50 text-rose-800 border-rose-200"
                  : "bg-emerald-50 text-emerald-800 border-emerald-200"
              )}
            >
              {hasUrgentIssues ? "Attention Needed" : "All Queues Healthy"}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {missedCount > 0 && (
              <div className="p-4 sm:p-5 rounded-2xl bg-rose-50/80 border border-rose-200 flex flex-col justify-between gap-4 shadow-2xs">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span className="text-xs font-bold uppercase tracking-wider text-rose-800">
                      Sales Urgency
                    </span>
                  </div>
                  <h3 className="text-sm font-black text-rose-950">
                    {missedCount} Overdue Follow-up{missedCount > 1 ? "s" : ""}
                  </h3>
                  <p className="text-xs text-rose-800/85 leading-relaxed">
                    Prospects with passed follow-up dates have a steep drop in conversion probability.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate("/admin/crm/leads?filter=overdue")}
                  className="w-full min-h-[44px] py-2.5 px-4 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white rounded-xl text-xs sm:text-sm font-bold transition-all shadow-sm active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <span>Resolve Overdue Leads</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {slaBreachCount > 0 && (
              <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/80 border border-amber-200 flex flex-col justify-between gap-4 shadow-2xs">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-800">
                      Support SLA Risk
                    </span>
                  </div>
                  <h3 className="text-sm font-black text-amber-950">
                    {slaBreachCount} Ticket{slaBreachCount > 1 ? "s" : ""} Breached SLA
                  </h3>
                  <p className="text-xs text-amber-800/85 leading-relaxed">
                    Customer tickets have passed their guaranteed response window. Urgent escalation required.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate("/admin/crm/support")}
                  className="w-full min-h-[44px] py-2.5 px-4 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white rounded-xl text-xs sm:text-sm font-bold transition-all shadow-sm active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <span>Open Support Desk</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {criticalCsCount > 0 && (
              <div className="p-4 sm:p-5 rounded-2xl bg-orange-50/80 border border-orange-200 flex flex-col justify-between gap-4 shadow-2xs">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-orange-600 shrink-0" />
                    <span className="text-xs font-bold uppercase tracking-wider text-orange-800">
                      Customer Success Risk
                    </span>
                  </div>
                  <h3 className="text-sm font-black text-orange-950">
                    {criticalCsCount} Madrasa{criticalCsCount > 1 ? "s" : ""} At Churn Risk
                  </h3>
                  <p className="text-xs text-orange-800/85 leading-relaxed">
                    Portal inactivity or low engagement detected. Early outreach protects ARR.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleChurnCheck}
                  className="w-full min-h-[44px] py-2.5 px-4 bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white rounded-xl text-xs sm:text-sm font-bold transition-all shadow-sm active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <span>Audit CS Health</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {todayCount > 0 && (
              <div className="p-4 sm:p-5 rounded-2xl bg-sky-50/80 border border-sky-200 flex flex-col justify-between gap-4 shadow-2xs">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-sky-600 shrink-0" />
                    <span className="text-xs font-bold uppercase tracking-wider text-sky-800">
                      Scheduled Today
                    </span>
                  </div>
                  <h3 className="text-sm font-black text-sky-950">
                    {todayCount} Outreach Call{todayCount > 1 ? "s" : ""} Due
                  </h3>
                  <p className="text-xs text-sky-800/85 leading-relaxed">
                    Prospect follow-ups and scheduled discussions planned for today.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate("/admin/crm/leads?filter=today")}
                  className="w-full min-h-[44px] py-2.5 px-4 bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white rounded-xl text-xs sm:text-sm font-bold transition-all shadow-sm active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <span>View Today&apos;s Calls</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {!hasUrgentIssues && (
              <div className="col-span-full p-5 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-emerald-100 text-emerald-800 shrink-0">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-emerald-950">Clean Operational Radar</h3>
                    <p className="text-xs text-emerald-800/90 leading-relaxed">
                      Zero overdue follow-ups, zero SLA breaches, and healthy customer engagement. Great work!
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => navigate("/admin/crm/leads")}
                  className="min-h-[44px] py-2.5 px-5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs sm:text-sm font-bold transition-all shadow-sm active:scale-[0.98] shrink-0 flex items-center gap-2"
                >
                  <span>Explore Leads Pipeline</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── DAILY QUEUES: MOBILE-FRIENDLY & DESKTOP RESPONSIVE ── */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-emerald-600 shrink-0" />
              <h2 className="text-lg font-black text-gray-900 tracking-tight">
                Daily Operations Queues
              </h2>
            </div>

            {/* Quick Queue Search Bar */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search queues..."
                value={queueSearch}
                onChange={(e) => setQueueSearch(e.target.value)}
                className="w-full pl-10 pr-9 py-2.5 text-xs sm:text-sm bg-white border border-gray-200/90 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all shadow-2xs"
              />
              {queueSearch && (
                <button
                  type="button"
                  onClick={() => setQueueSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Mobile Tabbed Switcher (Visible on small screens to prevent huge vertical clutter) */}
          <div className="lg:hidden flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1">
            {[
              { key: "followups", label: "Follow-ups", count: (ops?.followUpsToday.length || 0) + missedCount },
              { key: "tasks", label: "Tasks", count: totalTasksCount },
              ...(canViewTickets ? [{ key: "tickets", label: "Support", count: totalTicketsCount }] : []),
              ...(isSuperOrCS ? [{ key: "csRisk", label: "CS Risk", count: criticalCsCount }] : []),
            ].map((tab) => {
              const isSelected = activeQueueTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveQueueTab(tab.key as any)}
                  className={cn(
                    "min-h-[42px] px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 transition-all border flex items-center gap-2",
                    isSelected
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                      : "bg-white text-gray-700 border-gray-200/80 hover:bg-gray-50"
                  )}
                >
                  <span>{tab.label}</span>
                  <span
                    className={cn(
                      "px-1.5 py-0.5 rounded-full text-[10px] font-black",
                      isSelected ? "bg-white/20 text-white" : "bg-gray-100 text-gray-600"
                    )}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Queues Layout: Dual Column on Desktop, Tabbed on Mobile */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {/* Left Column: Follow-up Queue */}
            <div
              className={cn(
                "space-y-4",
                activeQueueTab !== "followups" && "hidden lg:block"
              )}
            >
              {/* Overdue / Missed Follow-ups Card */}
              <div className="bg-white rounded-3xl border border-rose-200/80 p-5 sm:p-6 shadow-xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-rose-100">
                  <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-rose-700 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    Overdue Actions ({missedCount})
                  </h3>
                  <button
                    type="button"
                    onClick={() => navigate("/admin/crm/leads?filter=overdue")}
                    className="text-xs font-bold text-rose-700 hover:underline flex items-center gap-1"
                  >
                    Pipeline <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {(() => {
                  const list = (ops?.missedFollowUps || []).filter(
                    (f) =>
                      !queueSearch ||
                      f.name.toLowerCase().includes(queueSearch.toLowerCase()) ||
                      f.place?.toLowerCase().includes(queueSearch.toLowerCase())
                  );

                  if (list.length === 0) {
                    return (
                      <div className="text-center py-6 text-emerald-800 text-xs font-semibold">
                        {queueSearch ? "No items matching filter." : "🎉 All clear! Zero overdue follow-up calls."}
                      </div>
                    );
                  }

                  return (
                    <div className="divide-y divide-gray-100">
                      {list.map((f) => (
                        <div
                          key={f.id}
                          className="py-3.5 flex items-center justify-between gap-3 hover:bg-rose-50/40 px-2 rounded-2xl transition-all cursor-pointer group"
                          onClick={() => navigate(`/admin/crm/leads?id=${f.id}`)}
                        >
                          <div className="min-w-0 space-y-1">
                            <h4 className="text-sm font-bold text-gray-900 truncate group-hover:text-rose-700 transition-colors">
                              {f.name}
                            </h4>
                            <p className="text-xs text-gray-500">
                              {f.place || "Place not set"} •{" "}
                              <span className="text-rose-700 font-semibold">
                                Due: {f.nextFollowUpDate ? new Date(f.nextFollowUpDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : "Overdue"}
                              </span>
                            </p>
                            {f.timeline && f.timeline.length > 0 && f.timeline[0]?.notes && (
                              <p className="text-xs text-gray-600 line-clamp-1 italic bg-gray-50 px-2 py-1 rounded-lg border border-gray-100">
                                💬 {f.timeline[0].notes}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/admin/crm/leads?id=${f.id}`);
                              }}
                              className="min-h-[38px] px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-2xs transition-all active:scale-95 flex items-center gap-1"
                            >
                              Act <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>

              {/* Today's Follow-up Queue */}
              <div className="bg-white rounded-3xl border border-gray-200/80 p-5 sm:p-6 shadow-xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                  <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-amber-700 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
                    Due Today ({todayCount})
                  </h3>
                  <button
                    type="button"
                    onClick={() => navigate("/admin/crm/leads?filter=today")}
                    className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1"
                  >
                    View All <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {(() => {
                  const list = (ops?.followUpsToday || []).filter(
                    (f) =>
                      !queueSearch ||
                      f.name.toLowerCase().includes(queueSearch.toLowerCase()) ||
                      f.place?.toLowerCase().includes(queueSearch.toLowerCase())
                  );

                  if (list.length === 0) {
                    return (
                      <div className="text-center py-6 text-gray-400 text-xs font-semibold">
                        <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                        {queueSearch ? "No items matching filter." : "All set for today! No pending follow-ups scheduled."}
                      </div>
                    );
                  }

                  return (
                    <div className="divide-y divide-gray-100">
                      {list.map((f) => (
                        <div
                          key={f.id}
                          className="py-3.5 flex items-center justify-between gap-3 hover:bg-emerald-50/40 px-2 rounded-2xl transition-all cursor-pointer group"
                          onClick={() => navigate(`/admin/crm/leads?id=${f.id}`)}
                        >
                          <div className="min-w-0 space-y-1">
                            <h4 className="text-sm font-bold text-gray-900 truncate group-hover:text-emerald-700 transition-colors">
                              {f.name}
                            </h4>
                            <p className="text-xs text-gray-500">
                              {f.place || "Place not set"} •{" "}
                              <span className="text-emerald-700 font-semibold capitalize">
                                {f.status.replace(/_/g, " ").toLowerCase()}
                              </span>
                            </p>
                            {f.timeline && f.timeline.length > 0 && f.timeline[0]?.notes && (
                              <p className="text-xs text-gray-600 line-clamp-1 italic bg-gray-50 px-2 py-1 rounded-lg border border-gray-100">
                                💬 {f.timeline[0].notes}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/admin/crm/leads?id=${f.id}`);
                              }}
                              className="min-h-[38px] px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-2xs transition-all active:scale-95 flex items-center gap-1"
                            >
                              Call <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Right Column: Tasks, Support Tickets & CS Risk */}
            <div
              className={cn(
                "space-y-6",
                activeQueueTab === "followups" && "hidden lg:block"
              )}
            >
              {/* Tasks Section */}
              <div
                className={cn(
                  "bg-white rounded-3xl border border-gray-200/80 p-5 sm:p-6 shadow-xs space-y-4",
                  activeQueueTab !== "tasks" && activeQueueTab !== "followups" && "hidden lg:block"
                )}
              >
                <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                  <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
                    <ClipboardList className="w-4.5 h-4.5 text-emerald-600" />
                    Critical Tasks ({totalTasksCount})
                  </h3>
                  <button
                    type="button"
                    onClick={() => navigate("/admin/crm/leads")}
                    className="text-xs font-bold text-emerald-700 hover:underline"
                  >
                    Manage
                  </button>
                </div>

                {totalTasksCount === 0 ? (
                  <div className="text-center py-6 text-gray-400 text-xs font-semibold">
                    <Inbox className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    No pending tasks assigned.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {ops?.overdueTasks.map((t) => (
                      <div
                        key={t.id}
                        className="p-3.5 bg-rose-50/60 rounded-2xl border border-rose-200/80 flex items-start justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="bg-rose-100 text-rose-800 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                              Overdue
                            </span>
                            <span className="text-xs font-bold text-rose-950">{t.title}</span>
                          </div>
                          <p className="text-xs text-rose-700/90">
                            Due: {new Date(t.dueDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}{" "}
                            {t.lead ? `• Lead: ${t.lead.name}` : ""}
                          </p>
                        </div>
                        <span className="text-xs font-bold text-rose-700 shrink-0 uppercase">{t.priority}</span>
                      </div>
                    ))}

                    {ops?.tasksToday.map((t) => (
                      <div
                        key={t.id}
                        className="p-3.5 bg-gray-50 rounded-2xl border border-gray-200 flex items-start justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="bg-amber-100 text-amber-800 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                              Today
                            </span>
                            <span className="text-xs font-bold text-gray-900">{t.title}</span>
                          </div>
                          <p className="text-xs text-gray-600">
                            {t.lead ? `Lead: ${t.lead.name}` : "General Task"}
                          </p>
                        </div>
                        <span className="text-xs font-bold text-amber-700 shrink-0 uppercase">{t.priority}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Support Tickets Section */}
              {canViewTickets && (
                <div
                  className={cn(
                    "bg-white rounded-3xl border border-gray-200/80 p-5 sm:p-6 shadow-xs space-y-4",
                    activeQueueTab !== "tickets" && activeQueueTab !== "followups" && "hidden lg:block"
                  )}
                >
                  <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                    <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
                      <MessageSquare className="w-4.5 h-4.5 text-emerald-600" />
                      Active Support Tickets ({totalTicketsCount})
                    </h3>
                    <button
                      type="button"
                      onClick={() => navigate("/admin/crm/support")}
                      className="text-xs font-bold text-emerald-700 hover:underline"
                    >
                      Support Desk
                    </button>
                  </div>

                  {totalTicketsCount === 0 ? (
                    <div className="text-center py-6 text-gray-400 text-xs font-semibold">
                      <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                      All support tickets resolved! Clean desk.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {ops?.activeTickets.map((t) => (
                        <div
                          key={t.id}
                          onClick={() => navigate("/admin/crm/support")}
                          className="p-3.5 hover:bg-gray-50/80 cursor-pointer rounded-2xl border border-gray-200/80 flex items-center justify-between gap-3 transition-all"
                        >
                          <div className="min-w-0 space-y-1">
                            <h4 className="text-xs sm:text-sm font-bold text-gray-900 truncate">
                              {t.title}
                            </h4>
                            <p className="text-xs text-gray-500">
                              {t.client?.name || "Client"} •{" "}
                              <span className="capitalize">{t.status.replace(/_/g, " ").toLowerCase()}</span>
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {t.slaBreached && (
                              <span className="bg-rose-100 text-rose-800 text-[10px] font-black px-2 py-0.5 rounded-full uppercase flex items-center gap-1">
                                <Clock className="w-3 h-3" /> SLA
                              </span>
                            )}
                            <span className="text-xs font-bold bg-gray-100 text-gray-700 px-2.5 py-1 rounded-lg">
                              {t.priority}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Customer Success Churn Flags */}
              {isSuperOrCS && (
                <div
                  className={cn(
                    "bg-rose-50/30 rounded-3xl border border-rose-200/80 p-5 sm:p-6 shadow-xs space-y-4",
                    activeQueueTab !== "csRisk" && activeQueueTab !== "followups" && "hidden lg:block"
                  )}
                >
                  <div className="flex items-center justify-between pb-2 border-b border-rose-100">
                    <h3 className="text-sm font-black text-rose-900 flex items-center gap-2">
                      <AlertTriangle className="w-4.5 h-4.5 text-rose-600" />
                      CS Churn Flags ({criticalCsCount})
                    </h3>
                    <button
                      type="button"
                      onClick={handleChurnCheck}
                      className="text-xs font-bold text-rose-700 hover:underline"
                    >
                      Audit
                    </button>
                  </div>

                  {criticalCsCount === 0 ? (
                    <div className="text-center py-5 text-emerald-800 text-xs font-bold">
                      Zero accounts flagged for active churn risk.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {ops?.criticalCustomers.map((c) => (
                        <div
                          key={c.id}
                          className="p-3.5 bg-white rounded-2xl border border-rose-200 flex items-center justify-between gap-3 shadow-2xs"
                        >
                          <div className="min-w-0 space-y-0.5">
                            <h4 className="text-xs sm:text-sm font-bold text-gray-900 truncate">
                              {c.client?.name || "Madrasa Account"}
                            </h4>
                            <p className="text-xs text-rose-700 font-medium">{c.riskReason || "Low activity"}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => navigate(`/admin/crm/leads?id=${c.id}`)}
                            className="min-h-[38px] px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-2xs active:scale-95 shrink-0"
                          >
                            Review Account
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
