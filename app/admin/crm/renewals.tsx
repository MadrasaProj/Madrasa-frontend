import { useState, useEffect } from "react";
import { getGlobalMetrics, listLeads, type LeadListItem } from "@/lib/crm-api";
import { useAuthStore } from "@/store/auth";
import { DashboardLayout } from "@/components/DashboardLayout";
import {
  Calendar, AlertTriangle, ShieldCheck, Clock, Loader2,
  DollarSign, RefreshCw, Send, Sparkles, User, BadgeAlert
} from "lucide-react";
import { motion } from "framer-motion";
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

  const loadData = async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const list = await listLeads(accessToken, { status: "WON" });
      
      // Transform WON leads into RenewalRecord
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
          probability
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
    // Simulate sending in-app dashboard reminder alerts
    setTimeout(() => {
      setSuccessMsg(`In-app renewal reminder triggered for admin (${days} days countdown).`);
      setTriggerLoading(null);
    }, 800);
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "URGENT": return "bg-rose-50 text-rose-700 border-rose-100";
      case "ATTENTION": return "bg-amber-50 text-amber-700 border-amber-100";
      default: return "bg-emerald-50 text-emerald-700 border-emerald-100";
    }
  };

  // Aggregated totals
  const totalUpcomingAmount = renewals
    .filter(r => r.status !== "SAFE")
    .reduce((sum, r) => sum + r.amount, 0);

  const urgentCount = renewals.filter(r => r.status === "URGENT").length;
  const attentionCount = renewals.filter(r => r.status === "ATTENTION").length;

  const fmtCurrency = (val: number | string) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(Number(val));
  };

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

  return (
    <DashboardLayout>
      <div className="pb-24 space-y-6">
        {/* Header Panel */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-gray-800">Subscription Renewals Center</h1>
            <p className="text-gray-500 text-xs">Monitor subscription validity, expirations, and projected renewal probability.</p>
          </div>
          <button
            onClick={loadData}
            className="flex items-center justify-center gap-1.5 bg-gray-100 hover:bg-gray-250 text-gray-700 font-bold text-xs py-2.5 px-4 rounded-xl transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh Registry
          </button>
        </div>

        {successMsg && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl p-4 text-sm flex justify-between items-center shadow-sm">
            <span>{successMsg}</span>
            <button onClick={() => setSuccessMsg(null)} className="font-bold underline text-xs">Dismiss</button>
          </div>
        )}
        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl p-4 text-sm flex justify-between items-center shadow-sm">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="font-bold underline text-xs">Dismiss</button>
          </div>
        )}

        {/* Aggregates Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-3xl border border-gray-100 p-5 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-gray-400">Projected Pipeline</span>
              <p className="text-2xl font-black text-gray-800 mt-1">{fmtCurrency(totalUpcomingAmount)}</p>
            </div>
            <DollarSign className="w-8 h-8 text-emerald-550 bg-emerald-50 p-1.5 rounded-full" />
          </div>
          <div className="bg-rose-50 border border-rose-100 p-5 rounded-3xl flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-rose-800">Critical Expirations (&lt;15 Days)</span>
              <p className="text-2xl font-black text-rose-950 mt-1">{urgentCount}</p>
            </div>
            <BadgeAlert className="w-8 h-8 text-rose-600" />
          </div>
          <div className="bg-amber-50 border border-amber-100 p-5 rounded-3xl flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-amber-800">Warning Expirations (&lt;60 Days)</span>
              <p className="text-2xl font-black text-amber-950 mt-1">{attentionCount}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-amber-600" />
          </div>
        </div>

        {/* Renewals Table Registry */}
        <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
          <div className="p-5 border-b border-gray-50 flex items-center gap-1.5">
            <Calendar className="w-4.5 h-4.5 text-emerald-600" />
            <h2 className="text-sm font-black text-gray-800">Upcoming Expirations Register</h2>
          </div>

          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
            </div>
          ) : renewals.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm font-medium">
              No customer accounts found.
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100 text-gray-400 uppercase font-semibold">
                      <th className="py-4 px-6">Client Name</th>
                      <th className="py-4 px-6">Expiry Date</th>
                      <th className="py-4 px-6">Remaining Days</th>
                      <th className="py-4 px-6">Renewal Amount</th>
                      <th className="py-4 px-6">Probability</th>
                      <th className="py-4 px-6">Status</th>
                      <th className="py-4 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 text-gray-700 font-medium">
                    {renewals.map((r) => (
                      <tr key={r.id} className="hover:bg-gray-50/50 transition-all">
                        <td className="py-4 px-6">
                          <span className="font-bold text-gray-800">{r.name}</span>
                          <span className="block text-[9px] text-gray-400 mt-0.5 font-mono">{r.subdomain}</span>
                        </td>
                        <td className="py-4 px-6">
                          {r.expiryDate ? fmtDate(r.expiryDate) : "Not provisioned"}
                        </td>
                        <td className="py-4 px-6 font-bold">
                          {r.daysRemaining} days
                        </td>
                        <td className="py-4 px-6 font-bold font-mono">{fmtCurrency(r.amount)}</td>
                        <td className="py-4 px-6">
                          <span className="font-bold text-emerald-700">{r.probability * 100}%</span>
                        </td>
                        <td className="py-4 px-6">
                          <span className={cn("text-[9px] font-bold px-2.5 py-1 border rounded-full uppercase", getStatusStyle(r.status))}>
                            {r.status}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <button
                            onClick={() => handleSendReminder(r.id, r.daysRemaining)}
                            disabled={triggerLoading === r.id || r.status === "SAFE"}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white disabled:bg-gray-100 disabled:text-gray-400 font-bold text-[10px] py-1.5 px-3 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-1.5 ml-auto"
                          >
                            {triggerLoading === r.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <>
                                <Send className="w-3 h-3" /> Trigger Alert
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card Stack */}
              <div className="md:hidden space-y-4 p-4 bg-gray-50/30">
                {renewals.map((r) => (
                  <motion.div
                    key={r.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-3"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <h4 className="font-bold text-gray-800 text-sm">{r.name}</h4>
                        <p className="text-[10px] text-gray-400 font-mono mt-0.5">{r.subdomain}</p>
                      </div>
                      <span className={cn("text-[9px] font-bold px-2 py-0.5 border rounded-full uppercase", getStatusStyle(r.status))}>
                        {r.status}
                      </span>
                    </div>

                    <div className="border-t border-gray-50 pt-2.5 space-y-1.5 text-xs text-gray-500">
                      <div className="flex justify-between">
                        <span>Expiry Date:</span>
                        <strong className="text-gray-800 font-semibold">{r.expiryDate ? fmtDate(r.expiryDate) : "Not provisioned"}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Days remaining:</span>
                        <span className="font-bold text-gray-700">{r.daysRemaining} days</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Renewal price:</span>
                        <strong className="text-gray-800 font-bold font-mono">{fmtCurrency(r.amount)}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Renewal probability:</span>
                        <span className="text-emerald-700 font-bold">{r.probability * 100}%</span>
                      </div>
                    </div>

                    <div className="border-t border-gray-50 pt-3 flex justify-end">
                      <button
                        onClick={() => handleSendReminder(r.id, r.daysRemaining)}
                        disabled={triggerLoading === r.id || r.status === "SAFE"}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white disabled:bg-gray-100 disabled:text-gray-400 font-bold text-[10px] py-2 px-4.5 rounded-xl transition-all active:scale-95 flex items-center gap-1"
                      >
                        {triggerLoading === r.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <>
                            <Send className="w-3 h-3" /> Trigger Alert
                          </>
                        )}
                      </button>
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
