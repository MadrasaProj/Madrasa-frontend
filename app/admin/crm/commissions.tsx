import { useState, useEffect } from "react";
import {
  getCommissions,
  payCommission,
  type CommissionRecord,
  type DistrictAllowanceItem,
} from "@/lib/crm-api";
import { useAuthStore } from "@/store/auth";
import { DashboardLayout } from "@/components/DashboardLayout";
import { CrmSubNav } from "@/components/crm/CrmSubNav";
import {
  CreditCard,
  Award,
  DollarSign,
  Loader2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sparkles,
  TrendingUp,
  Landmark,
  MapPin,
  Gift,
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Check,
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export default function CommissionsDashboard() {
  const { accessToken, user } = useAuthStore();
  const [records, setRecords] = useState<CommissionRecord[]>([]);
  const [allowances, setAllowances] = useState<DistrictAllowanceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

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
      const data = await getCommissions(accessToken);
      setRecords(data.records || []);
      setAllowances(data.allowances || []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [accessToken]); // eslint-disable-line

  const handlePayCommission = async (id: string) => {
    if (!accessToken) return;
    setActionLoadingId(id);
    try {
      await payCommission(id, accessToken);
      setSuccessMsg("Commission payment approved and recorded successfully!");
      loadData();
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (e) {
      setError("Failed to process payment: " + (e as Error).message);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Calculate earnings summaries
  const totalCommissionUnpaid = records
    .filter((r) => r.paymentStatus === "UNPAID")
    .reduce((sum, r) => sum + Number(r.amount), 0);

  const totalCommissionPaid = records
    .filter((r) => r.paymentStatus === "PAID")
    .reduce((sum, r) => sum + Number(r.amount), 0);

  const totalDistrictAllowances = allowances.reduce((sum, a) => sum + a.payout, 0);

  // Group by contributor
  const userEarningsMap: Record<
    string,
    { name: string; paid: number; unpaid: number; total: number }
  > = {};
  records.forEach((r) => {
    const uName = r.user?.name ?? "Unknown Team Member";
    if (!userEarningsMap[uName]) {
      userEarningsMap[uName] = { name: uName, paid: 0, unpaid: 0, total: 0 };
    }
    const amt = Number(r.amount);
    if (r.paymentStatus === "PAID") {
      userEarningsMap[uName].paid += amt;
    } else {
      userEarningsMap[uName].unpaid += amt;
    }
    userEarningsMap[uName].total += amt;
  });

  const userEarningsList = Object.values(userEarningsMap);
  const isFinanceOrAdmin = ["SUPER_ADMIN", "FINANCE_EXECUTIVE", "SALES_MANAGER"].includes(
    user?.actorType ?? ""
  );

  // Filtered & Paginated records
  const filteredRecords = records.filter((r) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      r.client.name.toLowerCase().includes(q) ||
      (r.lead?.name && r.lead.name.toLowerCase().includes(q)) ||
      (r.user?.name && r.user.name.toLowerCase().includes(q));
    const matchesStatus = statusFilter === "ALL" || r.paymentStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredRecords.length / pageSize) || 1;
  const paginatedRecords = filteredRecords.slice((page - 1) * pageSize, page * pageSize);

  const filterCounts = {
    ALL: records.length,
    UNPAID: records.filter((r) => r.paymentStatus === "UNPAID").length,
    PAID: records.filter((r) => r.paymentStatus === "PAID").length,
  };

  const fmtCurrency = (val: number | string) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(Number(val));
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
              Commissions &amp; Payouts Registry
            </h1>
            <p className="text-gray-500 text-xs sm:text-sm mt-1">
              Track sales conversion splits, performance bonuses, and district management allowances
            </p>
          </div>
          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 bg-white hover:bg-gray-50 active:bg-gray-100 text-gray-700 font-bold text-xs sm:text-sm py-2.5 px-4 rounded-xl border border-gray-200 transition-all shadow-xs min-h-[44px]"
          >
            <RefreshCw className={cn("w-4 h-4 text-emerald-600", loading && "animate-spin")} />
            <span>Refresh Ledger</span>
          </button>
        </div>

        {/* Feedback Alerts */}
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
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
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
          <div className="bg-emerald-800 rounded-3xl p-5 sm:p-6 text-white shadow-xs flex flex-col justify-between">
            <div>
              <span className="text-xs uppercase font-bold text-emerald-200 tracking-wider">
                Total Commission Paid
              </span>
              <p className="text-2xl sm:text-3xl font-black mt-2 tracking-tight">
                {fmtCurrency(totalCommissionPaid)}
              </p>
            </div>
            <TrendingUp className="w-7 h-7 text-emerald-300/40 self-end mt-4" />
          </div>

          <div className="bg-white rounded-3xl border border-gray-200/80 p-5 sm:p-6 shadow-xs flex flex-col justify-between">
            <div>
              <span className="text-xs uppercase font-bold text-amber-700 tracking-wider">
                Unpaid Balances
              </span>
              <p className="text-2xl sm:text-3xl font-black text-amber-600 mt-2 tracking-tight">
                {fmtCurrency(totalCommissionUnpaid)}
              </p>
            </div>
            <Landmark className="w-7 h-7 text-amber-500/30 self-end mt-4" />
          </div>

          <div className="bg-white rounded-3xl border border-gray-200/80 p-5 sm:p-6 shadow-xs flex flex-col justify-between">
            <div>
              <span className="text-xs uppercase font-bold text-gray-500 tracking-wider">
                District Allowance Pool
              </span>
              <p className="text-2xl sm:text-3xl font-black text-gray-900 mt-2 tracking-tight">
                {fmtCurrency(totalDistrictAllowances)}
              </p>
            </div>
            <MapPin className="w-7 h-7 text-emerald-600/30 self-end mt-4" />
          </div>
        </div>

        {/* Contributor Earnings Ledger */}
        {isFinanceOrAdmin && userEarningsList.length > 0 && (
          <div className="bg-white rounded-3xl border border-gray-200/80 p-5 sm:p-6 shadow-xs space-y-4">
            <h2 className="text-base font-black text-gray-900 flex items-center gap-2">
              <Sparkles className="w-4.5 h-4.5 text-emerald-600" />
              Contributor Earnings Ledger
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {userEarningsList.map((e) => (
                <div
                  key={e.name}
                  className="p-4 bg-gray-50 rounded-2xl border border-gray-200/80 flex flex-col justify-between gap-3"
                >
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">{e.name}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">Split revenue credit accumulator</p>
                  </div>
                  <div className="flex justify-between items-end border-t border-gray-200 pt-3">
                    <div>
                      <span className="block text-[10px] text-gray-500 font-bold uppercase tracking-wider">Paid</span>
                      <span className="text-xs sm:text-sm font-bold text-emerald-700">{fmtCurrency(e.paid)}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-amber-700 font-bold uppercase tracking-wider">Unpaid</span>
                      <span className="text-xs sm:text-sm font-bold text-amber-600">{fmtCurrency(e.unpaid)}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-gray-500 font-bold uppercase tracking-wider">Total</span>
                      <span className="text-xs sm:text-sm font-black text-gray-900">{fmtCurrency(e.total)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* District Head Allowances Ledger */}
        {allowances.length > 0 && (
          <div className="bg-white rounded-3xl border border-gray-200/80 p-5 sm:p-6 shadow-xs space-y-4">
            <h2 className="text-base font-black text-gray-900 flex items-center gap-2">
              <MapPin className="w-4.5 h-4.5 text-emerald-600" />
              District Head Allowances
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {allowances.map((al) => (
                <div
                  key={al.districtId}
                  className="bg-gray-50 rounded-2xl border border-gray-200/80 p-4 flex flex-col justify-between gap-3"
                >
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-start gap-2">
                      <h3 className="font-bold text-sm text-gray-900">{al.districtName}</h3>
                      {al.payout > 0 ? (
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                          Active Pool
                        </span>
                      ) : (
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200">
                          Threshold Not Met
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">Head: <strong className="text-gray-800">{al.headUserName}</strong></p>
                    <p className="text-xs text-gray-600">
                      Won Madrasas: <strong className="text-gray-900 font-bold">{al.madrasaCount}</strong>
                    </p>
                  </div>
                  <div className="pt-3 border-t border-gray-200 flex justify-between items-center">
                    <span className="text-xs text-gray-500">
                      Rate: {fmtCurrency(al.rate)} / {al.threshold} active
                    </span>
                    <span className="font-bold text-sm text-emerald-800">{fmtCurrency(al.payout)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Payout Transactions Register */}
        <div className="bg-white rounded-3xl border border-gray-200/80 overflow-hidden shadow-xs">
          <div className="p-5 sm:p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-emerald-50 text-emerald-700">
                <CreditCard className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-base font-black text-gray-900">Payout Transactions Register</h2>
                <p className="text-xs text-gray-500">
                  Total {filteredRecords.length} recorded transaction{filteredRecords.length !== 1 ? "s" : ""}
                </p>
              </div>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search madrasa, rep, deal..."
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
              Filter Status:
            </span>
            {(["ALL", "UNPAID", "PAID"] as const).map((st) => (
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
          ) : paginatedRecords.length === 0 ? (
            <div className="text-center py-16 text-gray-400 text-sm font-medium">
              No commission transactions match the current filter.
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm border-collapse">
                  <thead>
                    <tr className="bg-gray-50/80 border-b border-gray-100 text-gray-500 uppercase text-xs font-bold tracking-wider">
                      <th className="py-4 px-6">Client / Lead</th>
                      <th className="py-4 px-6">Sales Rep</th>
                      <th className="py-4 px-6">Calculated On</th>
                      <th className="py-4 px-6">Split %</th>
                      <th className="py-4 px-6">Flat Bonus</th>
                      <th className="py-4 px-6">Total Payout</th>
                      <th className="py-4 px-6">Status</th>
                      {isFinanceOrAdmin && <th className="py-4 px-6 text-right">Action</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-gray-800">
                    {paginatedRecords.map((r) => (
                      <tr key={r.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="py-4 px-6">
                          <span className="font-bold text-gray-900 block">{r.client.name}</span>
                          {r.lead && (
                            <span className="text-xs text-gray-500 mt-0.5 block">
                              Pipeline: {r.lead.name}
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-6 font-semibold">{r.user?.name || "Unassigned"}</td>
                        <td className="py-4 px-6 font-mono text-gray-600">
                          ₹{Number(r.calculatedOnAmount).toLocaleString("en-IN")}
                        </td>
                        <td className="py-4 px-6 font-bold">{Number(r.percentage)}%</td>
                        <td className="py-4 px-6">
                          {r.flatBonus && Number(r.flatBonus) > 0 ? (
                            <span className="inline-flex items-center gap-1 text-xs text-indigo-700 bg-indigo-50 px-2 py-1 rounded-lg border border-indigo-100 font-semibold">
                              <Gift className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                              {fmtCurrency(r.flatBonus)}
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="py-4 px-6 font-black text-emerald-800 text-base">
                          {fmtCurrency(r.amount)}
                        </td>
                        <td className="py-4 px-6">
                          <span
                            className={cn(
                              "text-xs font-bold px-3 py-1 rounded-full uppercase border inline-block",
                              r.paymentStatus === "PAID"
                                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                : "bg-amber-50 text-amber-800 border-amber-200"
                            )}
                          >
                            {r.paymentStatus}
                          </span>
                        </td>
                        {isFinanceOrAdmin && (
                          <td className="py-4 px-6 text-right">
                            {r.paymentStatus === "UNPAID" ? (
                              <button
                                type="button"
                                onClick={() => handlePayCommission(r.id)}
                                disabled={actionLoadingId === r.id}
                                className="min-h-[40px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2 px-4 rounded-xl transition-all shadow-xs active:scale-95 disabled:opacity-50 inline-flex items-center gap-1.5"
                              >
                                {actionLoadingId === r.id && (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                )}
                                Approve Payout
                              </button>
                            ) : (
                              <span className="text-xs text-gray-400 font-semibold inline-flex items-center gap-1 justify-end">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Paid
                              </span>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards Stack View (No horizontal scrolling tables!) */}
              <div className="lg:hidden space-y-3.5 p-4 bg-gray-50/50">
                {paginatedRecords.map((r) => (
                  <div
                    key={r.id}
                    className="bg-white rounded-2xl border border-gray-200/90 p-4 sm:p-5 shadow-xs space-y-3"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0">
                        <h3 className="font-bold text-gray-900 text-sm truncate">{r.client.name}</h3>
                        {r.lead && <p className="text-xs text-gray-500 mt-0.5">Pipeline: {r.lead.name}</p>}
                      </div>
                      <span className="font-black text-base text-emerald-800 shrink-0">
                        {fmtCurrency(r.amount)}
                      </span>
                    </div>

                    <div className="border-t border-gray-100 pt-3 space-y-1.5 text-xs text-gray-600">
                      <div className="flex justify-between">
                        <span>Sales Rep:</span>
                        <strong className="text-gray-900 font-semibold">{r.user?.name || "Unassigned"}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Calculated on:</span>
                        <span className="font-mono text-gray-800">₹{Number(r.calculatedOnAmount).toLocaleString("en-IN")}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Commission rate:</span>
                        <strong className="text-gray-900 font-bold">{Number(r.percentage)}%</strong>
                      </div>
                      {r.flatBonus && Number(r.flatBonus) > 0 && (
                        <div className="flex justify-between items-center">
                          <span>Flat bonus:</span>
                          <span className="inline-flex items-center gap-1 font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100">
                            <Gift className="w-3.5 h-3.5 text-indigo-500" />
                            {fmtCurrency(r.flatBonus)}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="border-t border-gray-100 pt-3 flex items-center justify-between gap-3">
                      <span
                        className={cn(
                          "text-xs font-bold px-3 py-1 rounded-full uppercase border",
                          r.paymentStatus === "PAID"
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                            : "bg-amber-50 text-amber-800 border-amber-200"
                        )}
                      >
                        {r.paymentStatus}
                      </span>

                      {isFinanceOrAdmin && r.paymentStatus === "UNPAID" && (
                        <button
                          type="button"
                          onClick={() => handlePayCommission(r.id)}
                          disabled={actionLoadingId === r.id}
                          className="min-h-[44px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2 px-4 rounded-xl transition-all shadow-xs active:scale-[0.98] inline-flex items-center gap-1.5"
                        >
                          {actionLoadingId === r.id && (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          )}
                          Approve Payout
                        </button>
                      )}
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
                      <strong>{Math.min(page * pageSize, filteredRecords.length)}</strong> of{" "}
                      <strong>{filteredRecords.length}</strong> records
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
