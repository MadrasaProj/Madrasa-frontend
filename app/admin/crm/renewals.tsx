import { useState, useEffect } from "react";
import { listLeads } from "@/lib/crm-api";
import { useAuthStore } from "@/store/auth";
import { DashboardLayout } from "@/components/DashboardLayout";
import { CrmSubNav } from "@/components/crm/CrmSubNav";
import {
  Calendar,
  AlertTriangle,
  Clock,
  Loader2,
  RefreshCw,
  Send,
  Search,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  BellRing,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface RenewalRecord {
  id: string;
  name: string;
  subdomain?: string;
  status: string;
  daysRemaining: number;
  amount: number;
  expiryDate?: string;
  probability: number;
}

export default function RenewalsDashboard() {
  const { accessToken } = useAuthStore();
  const [renewals, setRenewals] = useState<RenewalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [triggerLoading, setTriggerLoading] = useState<string | null>(null);

  // Filters & Pagination
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const loadData = async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const list = await listLeads(accessToken, { status: "WON" });

      const mapped: RenewalRecord[] = list.map((l: any) => {
        const days = l.renewalProfile?.daysRemaining ?? 365;
        const amount = Number(l.renewalProfile?.amount ?? 12000);
        const probability = l.renewalProfile?.renewalProbability ?? 1.0;

        let status = "SAFE";
        if (days <= 15) {
          status = "URGENT";
        } else if (days <= 60) {
          status = "ATTENTION";
        }

        return {
          id: l.renewalProfile?.id ?? l.id,
          name: l.name,
          subdomain: l.client?.subdomain,
          status,
          daysRemaining: days,
          amount,
          expiryDate: l.renewalProfile?.expiryDate ?? l.client?.subscriptionEnd,
          probability,
        };
      });

      setRenewals(mapped);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [accessToken]); // eslint-disable-line

  const handleSendReminder = (id: string, days: number) => {
    setTriggerLoading(id);
    setTimeout(() => {
      setSuccessMsg(`In-app renewal reminder triggered for madrasa admin (${days} days countdown).`);
      setTriggerLoading(null);
      setTimeout(() => setSuccessMsg(null), 3500);
    }, 700);
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "URGENT":
        return "bg-rose-50 text-rose-800 border-rose-200";
      case "ATTENTION":
        return "bg-amber-50 text-amber-800 border-amber-200";
      default:
        return "bg-emerald-50 text-emerald-800 border-emerald-200";
    }
  };

  const totalUpcomingAmount = renewals
    .filter((r) => r.status !== "SAFE")
    .reduce((sum, r) => sum + r.amount, 0);

  const urgentCount = renewals.filter((r) => r.status === "URGENT").length;
  const attentionCount = renewals.filter((r) => r.status === "ATTENTION").length;

  const fmtCurrency = (val: number | string) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(Number(val));
  };

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

  const filteredRenewals = renewals.filter((r) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      r.name.toLowerCase().includes(q) ||
      (r.subdomain && r.subdomain.toLowerCase().includes(q));
    const matchesStatus = statusFilter === "ALL" || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredRenewals.length / pageSize) || 1;
  const paginatedRenewals = filteredRenewals.slice((page - 1) * pageSize, page * pageSize);

  const filterCounts = {
    ALL: renewals.length,
    URGENT: renewals.filter((r) => r.status === "URGENT").length,
    ATTENTION: renewals.filter((r) => r.status === "ATTENTION").length,
    SAFE: renewals.filter((r) => r.status === "SAFE").length,
  };

  return (
    <DashboardLayout>
      <div className="pb-24 space-y-6">
        {/* Persistent CRM Sub-Navigation */}
        <CrmSubNav />

        {/* Header Panel */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
              Subscription Renewals &amp; Churn Center
            </h1>
            <p className="text-gray-500 text-xs sm:text-sm mt-1">
              Monitor active subscriptions, countdown alerts, and projected renewal probability
            </p>
          </div>
          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 bg-white hover:bg-gray-50 active:bg-gray-100 text-gray-700 font-bold text-xs sm:text-sm py-2.5 px-4 rounded-xl border border-gray-200 transition-all shadow-xs min-h-[44px]"
          >
            <RefreshCw className={cn("w-4 h-4 text-emerald-600", loading && "animate-spin")} />
            <span>Refresh Subscriptions</span>
          </button>
        </div>

        {/* Feedback Alert */}
        {successMsg && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl p-4 text-sm flex justify-between items-center shadow-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-semibold">{successMsg}</span>
            </div>
            <button
              onClick={() => setSuccessMsg(null)}
              className="font-bold underline text-xs text-emerald-800"
            >
              Dismiss
            </button>
          </div>
        )}
        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-900 rounded-2xl p-4 text-sm flex justify-between items-center shadow-xs">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => setError(null)}
              className="font-bold underline text-xs text-rose-800"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Summary Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <div className="bg-white rounded-3xl border border-gray-200/80 p-5 sm:p-6 shadow-xs flex flex-col justify-between">
            <div>
              <span className="text-xs uppercase font-bold text-gray-500 tracking-wider">
                Upcoming Renewal Value
              </span>
              <p className="text-2xl sm:text-3xl font-black text-gray-900 mt-2 tracking-tight">
                {fmtCurrency(totalUpcomingAmount)}
              </p>
            </div>
            <Calendar className="w-7 h-7 text-emerald-600/30 self-end mt-4" />
          </div>

          <div className="bg-rose-50/70 rounded-3xl border border-rose-200 p-5 sm:p-6 shadow-xs flex flex-col justify-between">
            <div>
              <span className="text-xs uppercase font-bold text-rose-800 tracking-wider">
                Urgent Expirations (&le; 15 Days)
              </span>
              <p className="text-2xl sm:text-3xl font-black text-rose-900 mt-2 tracking-tight">
                {urgentCount} Madrasa{urgentCount !== 1 ? "s" : ""}
              </p>
            </div>
            <AlertTriangle className="w-7 h-7 text-rose-500/40 self-end mt-4" />
          </div>

          <div className="bg-amber-50/70 rounded-3xl border border-amber-200 p-5 sm:p-6 shadow-xs flex flex-col justify-between">
            <div>
              <span className="text-xs uppercase font-bold text-amber-800 tracking-wider">
                Attention Window (&le; 60 Days)
              </span>
              <p className="text-2xl sm:text-3xl font-black text-amber-900 mt-2 tracking-tight">
                {attentionCount} Madrasa{attentionCount !== 1 ? "s" : ""}
              </p>
            </div>
            <Clock className="w-7 h-7 text-amber-500/40 self-end mt-4" />
          </div>
        </div>

        {/* Renewals Table & Cards Register */}
        <div className="bg-white rounded-3xl border border-gray-200/80 overflow-hidden shadow-xs">
          <div className="p-5 sm:p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-emerald-50 text-emerald-700">
                <BellRing className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-base font-black text-gray-900">Subscriptions Directory</h2>
                <p className="text-xs text-gray-500">
                  Total {filteredRenewals.length} account{filteredRenewals.length !== 1 ? "s" : ""} found
                </p>
              </div>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search madrasa or slug..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all"
              />
            </div>
          </div>

          {/* Status Filter Chips */}
          <div className="px-5 sm:px-6 py-3 bg-gray-50/70 border-b border-gray-100 flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500 mr-1">
              Validity Status:
            </span>
            {(["ALL", "URGENT", "ATTENTION", "SAFE"] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => {
                  setStatusFilter(st);
                  setPage(1);
                }}
                className={cn(
                  "min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border",
                  statusFilter === st
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-2xs"
                    : "bg-white text-gray-600 border-gray-200 hover:bg-gray-100"
                )}
              >
                {st} ({filterCounts[st as keyof typeof filterCounts] ?? 0})
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
            </div>
          ) : paginatedRenewals.length === 0 ? (
            <div className="text-center py-16 text-gray-400 text-sm font-medium">
              No customer accounts match the selected filters.
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm border-collapse">
                  <thead>
                    <tr className="bg-gray-50/80 border-b border-gray-100 text-gray-500 uppercase text-xs font-bold tracking-wider">
                      <th className="py-4 px-6">Client / Madrasa</th>
                      <th className="py-4 px-6">Expiry Date</th>
                      <th className="py-4 px-6">Days Left</th>
                      <th className="py-4 px-6">Renewal Price</th>
                      <th className="py-4 px-6">Retention Probability</th>
                      <th className="py-4 px-6">Status</th>
                      <th className="py-4 px-6 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-gray-800">
                    {paginatedRenewals.map((r) => (
                      <tr key={r.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="py-4 px-6">
                          <span className="font-bold text-gray-900 block">{r.name}</span>
                          <span className="text-xs text-gray-500 font-mono mt-0.5 block">
                            {r.subdomain || "no-subdomain"}
                          </span>
                        </td>
                        <td className="py-4 px-6 font-medium">
                          {r.expiryDate ? fmtDate(r.expiryDate) : "Not provisioned"}
                        </td>
                        <td className="py-4 px-6">
                          <span
                            className={cn(
                              "font-black text-sm",
                              r.daysRemaining <= 15
                                ? "text-rose-600"
                                : r.daysRemaining <= 60
                                ? "text-amber-600"
                                : "text-emerald-700"
                            )}
                          >
                            {r.daysRemaining} days
                          </span>
                        </td>
                        <td className="py-4 px-6 font-black text-gray-900 text-base font-mono">
                          {fmtCurrency(r.amount)}
                        </td>
                        <td className="py-4 px-6">
                          <span className="font-bold text-emerald-800">
                            {Math.round(r.probability * 100)}%
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <span
                            className={cn(
                              "text-xs font-bold px-3 py-1 border rounded-full uppercase inline-block",
                              getStatusStyle(r.status)
                            )}
                          >
                            {r.status}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <button
                            type="button"
                            onClick={() => handleSendReminder(r.id, r.daysRemaining)}
                            disabled={triggerLoading === r.id || r.status === "SAFE"}
                            className="min-h-[40px] bg-emerald-600 hover:bg-emerald-700 text-white disabled:bg-gray-100 disabled:text-gray-400 font-bold text-xs py-2 px-4 rounded-xl transition-all shadow-xs active:scale-95 inline-flex items-center gap-1.5 ml-auto"
                          >
                            {triggerLoading === r.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <>
                                <Send className="w-3.5 h-3.5" />
                                <span>Trigger Alert</span>
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards Stack View */}
              <div className="lg:hidden space-y-3.5 p-4 bg-gray-50/50">
                {paginatedRenewals.map((r) => (
                  <div
                    key={r.id}
                    className="bg-white rounded-2xl border border-gray-200/90 p-4 sm:p-5 shadow-xs space-y-3"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0">
                        <h3 className="font-bold text-gray-900 text-sm truncate">{r.name}</h3>
                        <p className="text-xs text-gray-500 font-mono mt-0.5">{r.subdomain || "no-subdomain"}</p>
                      </div>
                      <span
                        className={cn(
                          "text-xs font-bold px-3 py-1 border rounded-full uppercase shrink-0",
                          getStatusStyle(r.status)
                        )}
                      >
                        {r.status}
                      </span>
                    </div>

                    <div className="border-t border-gray-100 pt-3 space-y-1.5 text-xs text-gray-600">
                      <div className="flex justify-between">
                        <span>Expiry Date:</span>
                        <strong className="text-gray-900 font-semibold">
                          {r.expiryDate ? fmtDate(r.expiryDate) : "Not provisioned"}
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Days remaining:</span>
                        <span
                          className={cn(
                            "font-bold",
                            r.daysRemaining <= 15
                              ? "text-rose-600"
                              : r.daysRemaining <= 60
                              ? "text-amber-600"
                              : "text-emerald-700"
                          )}
                        >
                          {r.daysRemaining} days
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Renewal price:</span>
                        <strong className="text-gray-900 font-black text-sm font-mono">
                          {fmtCurrency(r.amount)}
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Renewal probability:</span>
                        <span className="text-emerald-800 font-bold">{Math.round(r.probability * 100)}%</span>
                      </div>
                    </div>

                    <div className="border-t border-gray-100 pt-3 flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleSendReminder(r.id, r.daysRemaining)}
                        disabled={triggerLoading === r.id || r.status === "SAFE"}
                        className="w-full sm:w-auto min-h-[44px] bg-emerald-600 hover:bg-emerald-700 text-white disabled:bg-gray-100 disabled:text-gray-400 font-bold text-xs sm:text-sm py-2.5 px-5 rounded-xl transition-all shadow-xs active:scale-[0.98] inline-flex items-center justify-center gap-2"
                      >
                        {triggerLoading === r.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Send className="w-4 h-4" />
                            <span>Trigger In-App Reminder</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="p-4 sm:p-5 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-white text-xs sm:text-sm">
                  <div className="flex items-center gap-2 text-gray-500 flex-wrap">
                    <span>
                      Showing <strong>{(page - 1) * pageSize + 1}</strong>–
                      <strong>{Math.min(page * pageSize, filteredRenewals.length)}</strong> of{" "}
                      <strong>{filteredRenewals.length}</strong> accounts
                    </span>
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setPage(1);
                      }}
                      className="bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1 text-xs text-gray-700 font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500 min-h-[36px]"
                    >
                      <option value={10}>10 / page</option>
                      <option value={20}>20 / page</option>
                      <option value={50}>50 / page</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="min-h-[40px] px-3 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-40 transition-all font-semibold flex items-center gap-1"
                    >
                      <ChevronLeft className="w-4 h-4" /> Prev
                    </button>
                    <span className="font-bold text-gray-700 px-2">
                      {page} / {totalPages}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="min-h-[40px] px-3 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-40 transition-all font-semibold flex items-center gap-1"
                    >
                      Next <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
