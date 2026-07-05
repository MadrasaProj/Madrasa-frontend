import { useState, useEffect } from "react";
import { getCommissions, payCommission, type CommissionRecord, type DistrictAllowanceItem } from "@/lib/crm-api";
import { useAuthStore } from "@/store/auth";
import { DashboardLayout } from "@/components/DashboardLayout";
import {
  CreditCard, Award, DollarSign, Loader2, CheckCircle2,
  AlertCircle, RefreshCw, Sparkles, TrendingUp, Landmark, MapPin, Gift
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export default function CommissionsDashboard() {
  const { accessToken, user } = useAuthStore();
  const [records, setRecords] = useState<CommissionRecord[]>([]);
  const [allowances, setAllowances] = useState<DistrictAllowanceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

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
    setActionLoading(true);
    try {
      await payCommission(id, accessToken);
      setSuccessMsg("Commission payment approved and recorded successfully!");
      loadData();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (e) {
      setError("Failed to process payment: " + (e as Error).message);
    } finally {
      setActionLoading(false);
    }
  };

  // Calculate earnings summaries
  const totalCommissionUnpaid = records
    .filter(r => r.paymentStatus === "UNPAID")
    .reduce((sum, r) => sum + Number(r.amount), 0);

  const totalCommissionPaid = records
    .filter(r => r.paymentStatus === "PAID")
    .reduce((sum, r) => sum + Number(r.amount), 0);

  const totalDistrictAllowances = allowances.reduce((sum, a) => sum + a.payout, 0);

  // Group by contributor to show total earnings per user
  const userEarningsMap: Record<string, { name: string; paid: number; unpaid: number; total: number }> = {};
  records.forEach(r => {
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
  const isFinanceOrAdmin = ["SUPER_ADMIN", "FINANCE_EXECUTIVE", "SALES_MANAGER"].includes(user?.actorType ?? "");

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
        {/* Header Panel */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-gray-800">Commissions & Revenue Splits</h1>
            <p className="text-gray-500 text-xs">Track sales achievements, split attribution balances, flat bonuses, and district allowances.</p>
          </div>
          <button
            onClick={loadData}
            className="flex items-center justify-center gap-1.5 bg-gray-150 hover:bg-gray-200 text-gray-700 font-bold text-xs py-2.5 px-4 rounded-xl transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh Registry
          </button>
        </div>

        {successMsg && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl p-4 text-sm flex justify-between items-center">
            <span>{successMsg}</span>
            <button onClick={() => setSuccessMsg(null)} className="font-bold underline text-xs">Dismiss</button>
          </div>
        )}
        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl p-4 text-sm flex justify-between items-center">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="font-bold underline text-xs">Dismiss</button>
          </div>
        )}

        {/* Summary Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-gradient-to-r from-emerald-700 to-teal-650 rounded-3xl p-5 text-white shadow-sm flex flex-col justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-emerald-250 tracking-wider">Total Commission Paid</span>
              <p className="text-2xl font-black mt-1">{fmtCurrency(totalCommissionPaid)}</p>
            </div>
            <TrendingUp className="w-8 h-8 opacity-20 self-end mt-4" />
          </div>
          <div className="bg-white rounded-3xl border border-gray-100 p-5 shadow-sm flex flex-col justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Unpaid Balances</span>
              <p className="text-2xl font-black text-amber-600 mt-1">{fmtCurrency(totalCommissionUnpaid)}</p>
            </div>
            <Landmark className="w-8 h-8 text-amber-100 self-end mt-4" />
          </div>
          <div className="bg-white rounded-3xl border border-gray-100 p-5 shadow-sm flex flex-col justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">District Allowance Pool</span>
              <p className="text-2xl font-black text-gray-800 mt-1">{fmtCurrency(totalDistrictAllowances)}</p>
            </div>
            <MapPin className="w-8 h-8 text-emerald-100 self-end mt-4" />
          </div>
        </div>

        {/* Contributor Earnings ledger */}
        {isFinanceOrAdmin && userEarningsList.length > 0 && (
          <div className="bg-white rounded-3xl border border-gray-100 p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-black text-gray-800 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-650" />
              Contributor Earnings Ledger
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {userEarningsList.map((e) => (
                <div key={e.name} className="p-4 bg-gray-50/50 rounded-2xl border border-gray-100 flex flex-col justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-gray-800">{e.name}</h4>
                    <p className="text-[10px] text-gray-400 mt-0.5">Split revenue credit accumulator</p>
                  </div>
                  <div className="mt-4 flex justify-between items-end border-t border-gray-105 pt-3">
                    <div>
                      <span className="block text-[8px] text-gray-400 font-bold uppercase">Paid</span>
                      <span className="text-xs font-bold text-emerald-700">{fmtCurrency(e.paid)}</span>
                    </div>
                    <div>
                      <span className="block text-[8px] text-gray-400 font-bold uppercase">Unpaid</span>
                      <span className="text-xs font-bold text-amber-600">{fmtCurrency(e.unpaid)}</span>
                    </div>
                    <div>
                      <span className="block text-[8px] text-gray-400 font-bold uppercase">Total</span>
                      <span className="text-xs font-black text-gray-800">{fmtCurrency(e.total)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* District Head Allowances Ledger */}
        {allowances.length > 0 && (
          <div className="bg-white rounded-3xl border border-gray-100 p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-black text-gray-800 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-600" />
              District Head Allowances Ledger
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {allowances.map((al) => (
                <div key={al.districtId} className="bg-gray-50/40 rounded-2xl border border-gray-100 p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start gap-2">
                      <h4 className="font-bold text-sm text-gray-900">{al.districtName}</h4>
                      {al.payout > 0 ? (
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          Active Allowance
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                          No Allowance
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">Head: {al.headUserName}</p>
                    <p className="text-xs text-gray-600 mt-2 font-medium">
                      Won Madrasas: <strong className="text-gray-950 font-bold">{al.madrasaCount}</strong>
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center">
                    <span className="text-[9px] text-gray-400 font-medium">Rate: {fmtCurrency(al.rate)} / {al.threshold} active</span>
                    <span className="font-bold text-sm text-emerald-700">{fmtCurrency(al.payout)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Payout transactions register */}
        <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
          <div className="p-5 border-b border-gray-50 flex items-center justify-between">
            <h2 className="text-sm font-black text-gray-800 flex items-center gap-2">
              <CreditCard className="w-4.5 h-4.5 text-emerald-600" />
              Payout Transactions Register
            </h2>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
            </div>
          ) : records.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm font-medium">
              No commission transactions recorded yet.
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100 text-gray-400 uppercase font-semibold">
                      <th className="py-4 px-6">Client / Lead</th>
                      <th className="py-4 px-6">Sales Executive</th>
                      <th className="py-4 px-6">Calculated On</th>
                      <th className="py-4 px-6">Split %</th>
                      <th className="py-4 px-6">Flat Bonus</th>
                      <th className="py-4 px-6">Total Due</th>
                      <th className="py-4 px-6">Status</th>
                      {isFinanceOrAdmin && <th className="py-4 px-6 text-right">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 text-gray-700 font-medium">
                    {records.map((r) => (
                      <tr key={r.id} className="hover:bg-gray-50/30 transition-all">
                        <td className="py-4 px-6">
                          <span className="font-bold text-gray-800">{r.client.name}</span>
                          {r.lead && <span className="block text-[9px] text-gray-400 mt-0.5 font-mono">Pipeline: {r.lead.name}</span>}
                        </td>
                        <td className="py-4 px-6 font-bold">{r.user?.name}</td>
                        <td className="py-4 px-6 font-mono">₹{Number(r.calculatedOnAmount).toLocaleString()}</td>
                        <td className="py-4 px-6 font-bold">{Number(r.percentage)}%</td>
                        <td className="py-4 px-6 font-mono text-gray-500">
                          {r.flatBonus && Number(r.flatBonus) > 0 ? (
                            <span className="inline-flex items-center gap-0.5 text-xs text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded-lg border border-indigo-100">
                              <Gift className="w-3 h-3 text-indigo-500 shrink-0" />
                              {fmtCurrency(r.flatBonus)}
                            </span>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="py-4 px-6 font-black text-emerald-800 font-mono">{fmtCurrency(r.amount)}</td>
                        <td className="py-4 px-6">
                          <span className={cn("text-[9px] font-bold px-2.5 py-1 rounded-full uppercase border",
                            r.paymentStatus === "PAID"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                              : "bg-amber-50 text-amber-700 border-amber-100"
                          )}>
                            {r.paymentStatus}
                          </span>
                        </td>
                        {isFinanceOrAdmin && (
                          <td className="py-4 px-6 text-right">
                            {r.paymentStatus === "UNPAID" ? (
                              <button
                                onClick={() => handlePayCommission(r.id)}
                                disabled={actionLoading}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] py-1.5 px-3 rounded-xl transition-all active:scale-95 disabled:opacity-50"
                              >
                                Approve Payout
                              </button>
                            ) : (
                              <span className="text-[10px] text-gray-400 font-semibold flex items-center justify-end gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-650" /> Paid
                              </span>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards Stack View */}
              <div className="md:hidden space-y-4 p-4 bg-gray-50/30">
                {records.map((r) => (
                  <motion.div
                    key={r.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-3"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <h4 className="font-bold text-gray-800 text-sm">{r.client.name}</h4>
                        {r.lead && <p className="text-[10px] text-gray-400 mt-0.5">Pipeline: {r.lead.name}</p>}
                      </div>
                      <span className="font-black font-mono text-base text-emerald-850">
                        {fmtCurrency(r.amount)}
                      </span>
                    </div>

                    <div className="border-t border-gray-50 pt-2.5 space-y-1.5 text-xs text-gray-500">
                      <div className="flex justify-between">
                        <span>Attributed Rep:</span>
                        <strong className="text-gray-800 font-semibold">{r.user?.name}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Calculated on:</span>
                        <span className="font-mono text-gray-700">₹{Number(r.calculatedOnAmount).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Commission rate:</span>
                        <strong className="text-gray-800 font-bold">{Number(r.percentage)}%</strong>
                      </div>
                      {r.flatBonus && Number(r.flatBonus) > 0 && (
                        <div className="flex justify-between items-center">
                          <span>Flat conversion bonus:</span>
                          <span className="inline-flex items-center gap-0.5 font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded-lg border border-indigo-100 scale-90 origin-right">
                            <Gift className="w-3.5 h-3.5 text-indigo-500" />
                            {fmtCurrency(r.flatBonus)}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="border-t border-gray-50 pt-3 flex justify-between items-center">
                      <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full uppercase border",
                        r.paymentStatus === "PAID"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                          : "bg-amber-50 text-amber-700 border-amber-100"
                      )}>
                        {r.paymentStatus}
                      </span>

                      {isFinanceOrAdmin && r.paymentStatus === "UNPAID" && (
                        <button
                          onClick={() => handlePayCommission(r.id)}
                          disabled={actionLoading}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] py-1.5 px-3 rounded-xl transition-all active:scale-95"
                        >
                          Approve Payout
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
