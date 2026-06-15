import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { ApiErrorBanner } from "@/components/ui/ApiErrorBanner";
import {
  getStudentFees, getPaymentReceipt,
  type StudentFeeSummary, type ReceiptData,
} from "@/lib/fees-api";
import { useAuthStore } from "@/store/auth";
import type { StudentInfo } from "@/lib/auth-api";
import { cn } from "@/lib/utils";
import {
  IndianRupee, Loader2, CheckCircle, Receipt, Printer,
  AlertCircle, RefreshCw,
} from "lucide-react";
import { motion } from "framer-motion";

const STATUS_COLORS: Record<string, string> = {
  PAID:    "bg-emerald-100 text-emerald-700",
  PENDING: "bg-amber-100 text-amber-700",
  PARTIAL: "bg-blue-100 text-blue-700",
  OVERDUE: "bg-red-100 text-red-700",
  WAIVED:  "bg-gray-100 text-gray-500",
};

function ReceiptModal({ receipt, onClose }: { receipt: ReceiptData; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <motion.div
        initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        className="relative bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-sm p-6 shadow-2xl"
      >
        <div className="text-center mb-4 border-b border-dashed pb-4">
          <p className="font-bold text-lg">{receipt.client.name}</p>
          {receipt.client.address && <p className="text-xs text-gray-500">{receipt.client.address}</p>}
          <p className="text-xs font-bold text-emerald-700 mt-1 uppercase tracking-widest">Fee Receipt</p>
        </div>
        <div className="space-y-2 text-sm mb-4">
          {[
            ["Receipt No", receipt.reference ?? receipt.id.slice(0, 8).toUpperCase()],
            ["Date", receipt.paidAt ? new Date(receipt.paidAt).toLocaleDateString("en-GB") : "—"],
            ["Student", receipt.student.name],
            ["Adm No", receipt.student.adno],
            ["Class", receipt.student.class?.name ?? "—"],
            ["Fee Type", receipt.feeType.name],
            ["Amount Paid", `₹${Number(receipt.paidAmount ?? 0).toLocaleString()}`],
            ["Method", receipt.method ?? "—"],
          ].map(([label, value]) => (
            <div key={label} className="flex items-center justify-between">
              <span className="text-gray-500">{label}</span>
              <span className="font-semibold">{value}</span>
            </div>
          ))}
        </div>
        {receipt.notes && <p className="text-xs text-gray-400 italic mb-4">Note: {receipt.notes}</p>}
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border text-sm font-semibold text-gray-600">
            Close
          </button>
          <button
            onClick={() => window.print()}
            className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold flex items-center justify-center gap-1.5"
          >
            <Printer className="w-4 h-4" /> Print
          </button>
        </div>
      </motion.div>
    </div>
  );
}

interface ChildData {
  studentId: string;
  student: StudentInfo | null;
  summary: StudentFeeSummary | null;
  error: string | null;
}

export default function ParentFeesPage() {
  const { user, accessToken } = useAuthStore();
  const [children, setChildren] = useState<ChildData[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [loadingReceipt, setLoadingReceipt] = useState<string | null>(null);

  const cid   = user?.clientId ?? "";
  const token = accessToken ?? "";
  const ids   = user?.accessibleStudentIds ?? [];
  const accessibleStudents = user?.accessibleStudents ?? [];

  const load = useCallback(async () => {
    if (!cid || !token || !ids.length) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    const results = await Promise.all(
      ids.map(async (sid) => {
        try {
          const studentInfo = accessibleStudents.find((s) => s.id === sid) ?? null;
          const summary = await getStudentFees(cid, token, sid).catch((e) => ({ error: (e as Error).message }));
          if ("error" in summary) return { studentId: sid, student: studentInfo, summary: null, error: summary.error };
          return { studentId: sid, student: studentInfo, summary, error: null };
        } catch (e) {
          return { studentId: sid, student: null, summary: null, error: (e as Error).message };
        }
      }),
    );
    setChildren(results);
    setLoading(false);
  }, [cid, token, ids.join(",")]);

  useEffect(() => { load(); }, [load]);

  const showReceipt = async (paymentId: string) => {
    setLoadingReceipt(paymentId);
    setError(null);
    try { setReceipt(await getPaymentReceipt(cid, token, paymentId)); }
    catch (e) { setError((e as Error).message); }
    finally { setLoadingReceipt(null); }
  };

  const active = children[activeIdx];

  return (
    <DashboardLayout>
      <PageHeader title="My Fees" icon={IndianRupee} action={
        <button onClick={load} className="p-2 rounded-xl bg-gray-100 text-gray-600">
          <RefreshCw className="w-4 h-4" />
        </button>
      } />

      {error && <ApiErrorBanner message={error} onRetry={load} />}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      ) : !ids.length ? (
        <div className="text-center py-16 text-gray-400 text-sm">No children linked to this account</div>
      ) : (
        <>
          {/* Child tabs */}
          {children.length > 1 && (
            <div className="flex gap-2 mb-5">
              {children.map((c, i) => (
                <button
                  key={c.studentId}
                  onClick={() => setActiveIdx(i)}
                  className={cn(
                    "flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all",
                    i === activeIdx
                      ? "bg-emerald-600 text-white"
                      : "bg-white border border-gray-200 text-gray-600",
                  )}
                >
                  {c.student?.name ?? `Child ${i + 1}`}
                </button>
              ))}
            </div>
          )}

          {active?.error ? (
            <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-2xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" /> {active.error}
            </div>
          ) : active?.summary ? (
            <>
              {/* Student name if single child */}
{children.length === 1 && active.student && (
  <p className="text-sm text-gray-500 mb-4">{active.student.name}{active.student.className ? ` · ${active.student.className}` : ""}</p>
)}

              {/* Summary cards */}
              <div className="grid grid-cols-2 gap-3 mb-5">
                <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100">
                  <p className="text-xs text-emerald-600 mb-1">Total Paid</p>
                  <p className="text-2xl font-bold text-emerald-700">₹{Number(active.summary.totalPaid).toLocaleString()}</p>
                </div>
                <div className="bg-red-50 rounded-2xl p-4 border border-red-100">
                  <p className="text-xs text-red-500 mb-1">Pending</p>
                  <p className="text-2xl font-bold text-red-600">
                    ₹{Math.max(0, active.summary.totalDue - active.summary.totalPaid).toLocaleString()}
                  </p>
                </div>
              </div>

              {active.summary.pendingCount > 0 && (
                <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3 mb-4">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <p className="text-sm text-amber-700">
                    <span className="font-bold">{active.summary.pendingCount}</span> pending payment{active.summary.pendingCount !== 1 ? "s" : ""}
                  </p>
                </div>
              )}

              {/* Payment list */}
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Payment History</p>
              <div className="space-y-3">
                {active.summary.payments.length === 0 ? (
                  <div className="text-center py-10 text-gray-400 text-sm">No payment records yet</div>
                ) : (
                  active.summary.payments.map((p, i) => {
                    const isPaid = p.status === "PAID";
                    return (
                      <motion.div
                        key={p.id}
                        initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                        className="bg-white rounded-2xl border border-gray-100 p-4"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-semibold text-gray-900 text-sm">{p.feeType.name}</p>
                            {p.dueDate && (
                              <p className="text-xs text-gray-400">
                                Due: {new Date(p.dueDate).toLocaleDateString("en-GB")}
                              </p>
                            )}
                            {isPaid && p.paidAt && (
                              <p className="text-xs text-emerald-600">
                                Paid: {new Date(p.paidAt).toLocaleDateString("en-GB")}
                                {p.reference ? ` · ${p.reference}` : ""}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-gray-900">₹{Number(p.dueAmount).toLocaleString()}</p>
                            <span className={cn(
                              "text-xs font-semibold px-2 py-0.5 rounded-lg inline-block mt-1",
                              STATUS_COLORS[p.status] ?? STATUS_COLORS.PENDING,
                            )}>
                              {p.status}
                            </span>
                          </div>
                        </div>

                        {isPaid && (
                          <button
                            onClick={() => showReceipt(p.id)}
                            disabled={loadingReceipt === p.id}
                            className="w-full py-2 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-semibold flex items-center justify-center gap-1.5"
                          >
                            {loadingReceipt === p.id
                              ? <Loader2 className="w-3 h-3 animate-spin" />
                              : <Receipt className="w-3 h-3" />
                            }
                            View Receipt
                          </button>
                        )}
                        {!isPaid && (
                          <div className="bg-amber-50 rounded-xl px-3 py-2 text-xs text-amber-700 font-semibold flex items-center gap-1.5">
                            <AlertCircle className="w-3 h-3 shrink-0" />
                            Payment pending — contact admin to pay
                          </div>
                        )}
                      </motion.div>
                    );
                  })
                )}
              </div>

              {/* Fee types applicable */}
              {active.summary.feeTypes.length > 0 && (
                <>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mt-6 mb-3">Applicable Fees</p>
                  <div className="space-y-2">
                    {active.summary.feeTypes.map((ft) => (
                      <div key={ft.id} className="bg-white rounded-2xl border border-gray-100 px-4 py-3 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{ft.name}</p>
                          <p className="text-xs text-gray-400 capitalize">{ft.kind.toLowerCase()}{ft.frequency ? ` · ${ft.frequency}` : ""}</p>
                        </div>
                        <p className="font-bold text-gray-800">₹{Number(ft.amount).toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center gap-2 py-16 text-gray-400">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
          )}
        </>
      )}

      {receipt && <ReceiptModal receipt={receipt} onClose={() => setReceipt(null)} />}
    </DashboardLayout>
  );
}
