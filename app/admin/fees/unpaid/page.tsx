import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { getPayments, updatePayment, type FeePayment, type FeePaymentStatus } from "@/lib/fees-api";
import { getAllClasses, type ClassRecord } from "@/lib/classes-api";
import { useAuthStore } from "@/store/auth";
import { cn } from "@/lib/utils";
import { AlertCircle, Loader2, CheckCircle, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { SkeletonList } from "@/components/ui/Skeleton";

const PAYMENT_METHODS = ["CASH", "BANK_TRANSFER", "UPI", "CHEQUE", "OTHER"] as const;

export default function AdminFeesUnpaidPage() {
  const { user, accessToken, activeClientId } = useAuthStore();
  const [payments, setPayments]     = useState<FeePayment[]>([]);
  const [total, setTotal]           = useState(0);
  const [skip, setSkip]             = useState(0);
  const [filterClass, setFilterClass] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("PENDING");
  const [classes, setClasses]       = useState<ClassRecord[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);

  // Quick-record state
  const [recording, setRecording]   = useState<string | null>(null); // paymentId
  const [method, setMethod]         = useState("CASH");
  const [reference, setReference]   = useState("");
  const [saving, setSaving]         = useState(false);

  const cid = activeClientId ?? "";
  const token = accessToken ?? "";

  useEffect(() => {
    if (!cid || !token) return;
    const ac = new AbortController();
    getAllClasses(cid, token, ac.signal).then(setClasses).catch(() => {});
    return () => ac.abort();
  }, [cid, token]);

  const load = useCallback(async () => {
    if (!cid || !token) return;
    setLoading(true); setError(null);
    try {
      const res = await getPayments(cid, token, {
        status: filterStatus as FeePaymentStatus || undefined,
        classId: filterClass || undefined,
        skip, take: 30,
      });
      setPayments(res.payments);
      setTotal(res.total);
    } catch (err) { setError((err as Error).message); }
    finally { setLoading(false); }
  }, [cid, token, filterStatus, filterClass, skip]);

  useEffect(() => { load(); }, [load]);

  const markPaid = async (p: FeePayment) => {
    setSaving(true);
    try {
      await updatePayment(cid, token, p.id, {
        paidAmount: Number(p.dueAmount),
        method: method as any,
        reference: reference || undefined,
        status: "PAID",
        paidAt: new Date().toISOString(),
      });
      setRecording(null);
      setReference("");
      load();
    } catch (err) { alert((err as Error).message); }
    finally { setSaving(false); }
  };

  const STATUS_COLOR: Record<string, string> = {
    PENDING: "bg-amber-50 text-amber-700",
    PARTIAL: "bg-blue-50 text-blue-700",
    OVERDUE: "bg-red-50 text-red-700",
  };

  return (
    <DashboardLayout>
      <PageHeader title="Unpaid Fees" subtitle={`${total} records`} icon={AlertCircle} back backHref="/admin/fees" />

      {/* Filters */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setSkip(0); }}
          className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none">
          <option value="">All Status</option>
          <option value="PENDING">Pending</option>
          <option value="PARTIAL">Partial</option>
          <option value="OVERDUE">Overdue</option>
        </select>
        <select value={filterClass} onChange={(e) => { setFilterClass(e.target.value); setSkip(0); }}
          className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none">
          <option value="">All Classes</option>
          {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {loading ? (
        <SkeletonList count={4} />
      ) : error ? (
        <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-2xl">{error}</div>
      ) : (
        <>
          <p className="text-xs text-gray-400 mb-3">{total} total · showing {payments.length}</p>
          <div className="space-y-2">
            {payments.map((p) => (
              <div key={p.id}>
                <div className="bg-white rounded-2xl border border-gray-100 p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{p.student.name}</p>
                      <p className="text-xs text-gray-400">{p.student.adno} · {p.student.class?.name ?? ""}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{p.feeType.name}</p>
                      {p.dueDate && <p className="text-xs text-gray-400">Due: {new Date(p.dueDate).toLocaleDateString("en-GB")}</p>}
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900">₹{Number(p.dueAmount).toLocaleString()}</p>
                      {p.paidAmount && Number(p.paidAmount) > 0 && (
                        <p className="text-xs text-emerald-600">Paid: ₹{Number(p.paidAmount).toLocaleString()}</p>
                      )}
                      <span className={cn("text-xs font-bold px-2 py-0.5 rounded-lg mt-1 inline-block",
                        STATUS_COLOR[p.status] ?? STATUS_COLOR.PENDING)}>
                        {p.status}
                      </span>
                    </div>
                  </div>

                  {/* Quick-record panel */}
                  <AnimatePresence>
                    {recording === p.id && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden">
                        <div className="pt-3 mt-3 border-t border-gray-100 space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <select value={method} onChange={(e) => setMethod(e.target.value)}
                              className="px-3 py-2 rounded-xl border text-xs bg-white focus:outline-none">
                              {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m.replace("_", " ")}</option>)}
                            </select>
                            <input type="text" value={reference} onChange={(e) => setReference(e.target.value)}
                              placeholder="Receipt / Ref no."
                              className="px-3 py-2 rounded-xl border text-xs focus:outline-none focus:border-emerald-400" />
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => setRecording(null)}
                              className="flex-1 py-2 rounded-xl border text-xs font-semibold text-gray-600">Cancel</button>
                            <button onClick={() => markPaid(p)} disabled={saving}
                              className="flex-1 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold disabled:opacity-60 flex items-center justify-center gap-1">
                              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />} Mark Paid
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {recording !== p.id && (
                    <button onClick={() => { setRecording(p.id); setMethod("CASH"); setReference(""); }}
                      className="mt-3 w-full py-2.5 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold flex items-center justify-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5" /> Record Payment
                    </button>
                  )}
                </div>
              </div>
            ))}
            {payments.length === 0 && <div className="text-center py-10 text-gray-400 text-sm">No unpaid records found</div>}
          </div>

          {total > 30 && (
            <div className="flex items-center justify-center gap-3 mt-4">
              <button disabled={skip === 0} onClick={() => setSkip(Math.max(0, skip - 30))} className="px-4 py-2 rounded-xl border text-sm disabled:opacity-40">Prev</button>
              <span className="text-sm text-gray-500">{skip + 1}–{Math.min(skip + 30, total)} of {total}</span>
              <button disabled={skip + 30 >= total} onClick={() => setSkip(skip + 30)} className="px-4 py-2 rounded-xl border text-sm disabled:opacity-40">Next</button>
            </div>
          )}
        </>
      )}
    </DashboardLayout>
  );
}
