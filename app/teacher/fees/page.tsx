import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { ApiErrorBanner } from "@/components/ui/ApiErrorBanner";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  getFeeTypes, getPayments, updatePayment, getPaymentReceipt,
  cancelPayment as cancelPaymentApi,
  undoCancelPayment as undoCancelPaymentApi,
  type FeeType, type FeePayment, type ReceiptData,
  type FeePaymentStatus,
} from "@/lib/fees-api";
import { useAuthStore } from "@/store/auth";
import { cn } from "@/lib/utils";
import {
  CreditCard, Loader2, Receipt, CheckCircle, Search, RefreshCw, Printer, XCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const PALETTE = [
  { bg: "bg-emerald-600", light: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700" },
  { bg: "bg-blue-600", light: "bg-blue-50", border: "border-blue-200", text: "text-blue-700" },
  { bg: "bg-sky-600", light: "bg-sky-50", border: "border-sky-200", text: "text-sky-700" },
  { bg: "bg-rose-600", light: "bg-rose-50", border: "border-rose-200", text: "text-rose-700" },
  { bg: "bg-orange-500", light: "bg-orange-50", border: "border-orange-200", text: "text-orange-700" },
  { bg: "bg-teal-600", light: "bg-teal-50", border: "border-teal-200", text: "text-teal-700" },
  { bg: "bg-indigo-600", light: "bg-indigo-50", border: "border-indigo-200", text: "text-indigo-700" },
  { bg: "bg-amber-500", light: "bg-amber-50", border: "border-amber-200", text: "text-amber-700" },
];

const STATUS_META: Record<FeePaymentStatus, { label: string; color: string; bg: string }> = {
  PENDING: { label: "Pending", color: "text-amber-700", bg: "bg-amber-50" },
  PAID: { label: "Paid", color: "text-emerald-700", bg: "bg-emerald-50" },
  PARTIAL: { label: "Partial", color: "text-blue-700", bg: "bg-blue-50" },
  OVERDUE: { label: "Overdue", color: "text-red-700", bg: "bg-red-50" },
  WAIVED: { label: "Waived", color: "text-gray-500", bg: "bg-gray-100" },
};

const PAYMENT_METHODS = ["CASH", "BANK_TRANSFER", "UPI", "CHEQUE", "OTHER"] as const;

function ReceiptModal({ receipt, onClose }: { receipt: ReceiptData; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ scale: 0.94, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="relative bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden">
        <div className="bg-emerald-600 px-6 py-5 text-white text-center">
          <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-2">
            <Receipt className="w-6 h-6 text-white" />
          </div>
          <p className="font-bold text-lg">{receipt.client.name}</p>
          <p className="text-emerald-100 text-xs uppercase tracking-widest mt-0.5">Fee Receipt</p>
        </div>
        <div className="px-6 py-5 space-y-2.5">
          {([
            ["Receipt No", receipt.reference ?? receipt.id.slice(0, 8).toUpperCase()],
            ["Student", receipt.student.name],
            ["Adm No", receipt.student.adno],
            ["Class", receipt.student.class?.name ?? "—"],
            ["Fee Type", receipt.feeType.name],
            ["Paid On", receipt.paidAt ? new Date(receipt.paidAt).toLocaleDateString("en-GB") : "—"],
            ["Method", receipt.method ?? "—"],
          ] as [string, string][]).map(([label, value]) => (
            <div key={label} className="flex justify-between items-start gap-4">
              <p className="text-xs text-gray-400 shrink-0">{label}</p>
              <p className="text-xs font-semibold text-gray-900 text-right">{value}</p>
            </div>
          ))}
          <div className="border-t border-dashed border-gray-200 pt-3 flex justify-between items-center">
            <p className="font-bold text-gray-900">Amount Paid</p>
            <p className="text-xl font-bold text-emerald-600">₹{Number(receipt.paidAmount ?? 0).toLocaleString()}</p>
          </div>
        </div>
        <div className="px-6 pb-5 flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 border rounded-xl text-sm font-semibold text-gray-600">Close</button>
          <button onClick={() => window.print()} className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5">
            <Printer className="w-4 h-4" /> Print
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default function TeacherFeesPage() {
  const { user, accessToken, activeClientId } = useAuthStore();
  const cid = activeClientId ?? "";
  const token = accessToken ?? "";

  const [feeTypes, setFeeTypes] = useState<FeeType[]>([]);
  const [activeTypeId, setActiveTypeId] = useState<string | null>(null);
  const [typesLoading, setTypesLoading] = useState(true);

  const [payments, setPayments] = useState<FeePayment[]>([]);
  const [payTotal, setPayTotal] = useState(0);
  const [payLoading, setPayLoading] = useState(false);
  const [paySkip, setPaySkip] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [recording, setRecording] = useState<string | null>(null);
  const [payMethod, setPayMethod] = useState("CASH");
  const [payRef, setPayRef] = useState("");
  const [saving, setSaving] = useState(false);

  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [loadingReceipt, setLoadingReceipt] = useState<string | null>(null);

  const [cancelling, setCancelling] = useState<string | null>(null);
  const [cancellingNote, setCancellingNote] = useState("");
  const [cancellingSave, setCancellingSave] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const loadTypes = useCallback(async () => {
    if (!cid || !token) return;
    setTypesLoading(true); setError(null);
    try { setFeeTypes(await getFeeTypes(cid, token, user?.defaultAcademicYearId ?? undefined)); }
    catch (e) { setError((e as Error).message); }
    finally { setTypesLoading(false); }
  }, [cid, token, user?.defaultAcademicYearId]);

  useEffect(() => { if (cid && token) loadTypes(); }, [cid, token, loadTypes]);

  const loadPayments = useCallback(async () => {
    if (!cid || !token) return;
    setPayLoading(true);
    try {
      const res = await getPayments(cid, token, {
        feeTypeId: activeTypeId ?? undefined,
        status: statusFilter !== "all" ? (statusFilter as FeePaymentStatus) : undefined,
        skip: paySkip, take: 30,
      });
      setPayments(res.payments); setPayTotal(res.total);
    } catch (e) { setError((e as Error).message); }
    finally { setPayLoading(false); }
  }, [cid, token, activeTypeId, statusFilter, paySkip]);

  useEffect(() => { loadPayments(); }, [loadPayments]);

  const activeType = feeTypes.find((f) => f.id === activeTypeId) ?? null;

  const filtered = search
    ? payments.filter((p) => p.student.name.toLowerCase().includes(search.toLowerCase()) || p.student.adno.includes(search))
    : payments;

  const markPaid = async (p: FeePayment) => {
    setSaving(true);
    try {
      await updatePayment(cid, token, p.id, {
        paidAmount: Number(p.dueAmount), method: payMethod as any,
        reference: payRef || undefined, status: "PAID", paidAt: new Date().toISOString(),
      });
      setRecording(null); setPayRef(""); loadPayments();
    } catch (e) { setError((e as Error).message); }
    finally { setSaving(false); }
  };

  const showReceiptFor = async (id: string) => {
    setLoadingReceipt(id);
    try { setReceipt(await getPaymentReceipt(cid, token, id)); }
    catch (e) { setError((e as Error).message); }
    finally { setLoadingReceipt(null); }
  };

  const cancelPayment = async (p: FeePayment) => {
    setCancellingSave(true);
    try {
      await cancelPaymentApi(cid, token, p.id, cancellingNote || undefined);
      setCancelling(null);
      setCancellingNote("");
      loadPayments();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setCancellingSave(false);
    }
  };

  const undoCancel = async (p: FeePayment) => {
    setCancellingSave(true);
    try {
      await undoCancelPaymentApi(cid, token, p.id);
      loadPayments();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setCancellingSave(false);
    }
  };

  const cancellingPayment = cancelling
    ? payments.find((p) => p.id === cancelling) ?? null
    : null;

  return (
    <DashboardLayout>
      <PageHeader title="Fees & Payments" subtitle="View and record payments" icon={CreditCard} />

      {error && <ApiErrorBanner message={error} onRetry={loadPayments} />}

      {typesLoading ? (
        <div className="space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-2xl" />
            ))}
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 flex-1 rounded-xl" />
            <Skeleton className="h-10 w-48 rounded-xl" />
          </div>
          <div className="space-y-0 divide-y divide-gray-50 rounded-2xl border border-gray-100 overflow-hidden">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3.5">
                <Skeleton className="w-9 h-9 rounded-xl shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className="h-4 w-16 shrink-0" />
                <Skeleton className="h-6 w-16 rounded-full shrink-0" />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-5">
            <button onClick={() => { setActiveTypeId(null); setPaySkip(0); setStatusFilter("all"); setSearch(""); }}
              className={cn("text-left p-4 rounded-2xl border-2 transition-all",
                activeTypeId === null ? "bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-100" : "bg-white border-gray-100 hover:border-gray-200 text-gray-700")}>
              <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center mb-2",
                activeTypeId === null ? "bg-white/20" : "bg-gray-100")}>
                <CreditCard className={cn("w-4 h-4", activeTypeId === null ? "text-white" : "text-gray-500")} />
              </div>
              <p className="text-xs font-bold truncate mb-1">All Fees</p>
              <p className={cn("text-[10px]", activeTypeId === null ? "text-gray-300" : "text-gray-400")}>
                {feeTypes.length} type{feeTypes.length !== 1 ? "s" : ""}
              </p>
            </button>

            {feeTypes.map((ft, i) => {
              const pal = PALETTE[i % PALETTE.length];
              const isActive = ft.id === activeTypeId;
              return (
                <button key={ft.id} onClick={() => { setActiveTypeId(ft.id); setPaySkip(0); setStatusFilter("all"); setSearch(""); }}
                  className={cn("text-left p-4 rounded-2xl border-2 transition-all",
                    isActive ? `${pal.light} ${pal.border}` : "bg-white border-gray-100 hover:border-gray-200")}>
                  <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center mb-2", pal.bg)}>
                    <CreditCard className="w-4 h-4 text-white" />
                  </div>
                  <p className={cn("text-xs font-bold truncate mb-1", isActive ? pal.text : "text-gray-700")}>{ft.name}</p>
                  <p className="text-base font-bold text-gray-900">₹{Number(ft.amount).toLocaleString()}</p>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-[10px] text-gray-400">{ft.kind === "RECURRING" ? `${ft.frequency ?? "recurring"}` : "one-time"}</p>
                    {ft._count && <p className="text-[10px] text-gray-400">{ft._count.payments} records</p>}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex gap-2 mb-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search student name or adm no…"
                className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:border-emerald-400" />
            </div>
            <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
              {(["all", "PAID", "PENDING", "OVERDUE"] as const).map((s) => (
                <button key={s} onClick={() => { setStatusFilter(s); setPaySkip(0); }}
                  className={cn("px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                    statusFilter === s ? "bg-white shadow-sm text-gray-900" : "text-gray-500")}>
                  {s === "all" ? "All" : STATUS_META[s as FeePaymentStatus].label}
                </button>
              ))}
            </div>
          </div>

          {payLoading ? (
            <div className="flex items-center justify-center py-10 text-gray-400">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
          ) : (
            <>
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                  <p className="text-xs font-semibold text-gray-500">
                    {activeType ? activeType.name : "All Fee Types"} — {payTotal} total
                  </p>
                  <button onClick={loadPayments} className="text-xs text-gray-400 flex items-center gap-1">
                    <RefreshCw className="w-3 h-3" /> Refresh
                  </button>
                </div>

                <div className="divide-y divide-gray-50">
                  {filtered.length === 0 ? (
                    <div className="py-12 text-center text-gray-400 text-sm">No payment records found</div>
                  ) : (
                    filtered.map((p) => {
                      const meta = STATUS_META[p.status] ?? STATUS_META.PENDING;
                      const isPaid = p.status === "PAID";
                      return (
                        <div key={p.id}>
                          <div className="flex items-center gap-3 px-4 py-3.5">
                            <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0",
                              isPaid ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700")}>
                              {p.student.name.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-900 truncate">{p.student.name}</p>
                              <p className="text-xs text-gray-400">
                                {p.student.adno}{p.student.class ? ` · ${p.student.class.name}` : ""}
                                {!activeType ? ` · ${p.feeType.name}` : ""}
                              </p>
                            </div>
                            <div className="text-right shrink-0 mr-1">
                              <p className="text-sm font-bold text-gray-900">₹{Number(p.dueAmount).toLocaleString()}</p>
                              {isPaid && p.paidAt ? (
                                <p className="text-[10px] text-emerald-600">{new Date(p.paidAt).toLocaleDateString("en-GB")}</p>
                              ) : p.dueDate ? (
                                <p className="text-[10px] text-amber-600">Due: {new Date(p.dueDate).toLocaleDateString("en-GB")}</p>
                              ) : null}
                            </div>
                            <span className={cn("px-2.5 py-1 rounded-full text-[11px] font-semibold shrink-0", meta.bg, meta.color)}>
                              {isPaid ? "✓ " : ""}{meta.label}
                            </span>
                            {isPaid ? (
                              <>
                                <button onClick={() => showReceiptFor(p.id)} disabled={loadingReceipt === p.id} className="shrink-0 p-1" title="View receipt">
                                  {loadingReceipt === p.id ? (
                                    <Loader2 className="w-4 h-4 text-gray-300 animate-spin" />
                                  ) : (
                                    <Receipt className="w-4 h-4 text-gray-300 hover:text-blue-500 transition-colors" />
                                  )}
                                </button>
                                <button
                                  onClick={() => {
                                    setCancelling(p.id);
                                    setCancellingNote("");
                                  }}
                                  className="shrink-0 p-1"
                                  title="Cancel fee"
                                >
                                  <XCircle
                                    className={cn(
                                      "w-5 h-5 transition-colors",
                                      cancelling === p.id
                                        ? "text-red-500"
                                        : "text-gray-300 hover:text-red-500",
                                    )}
                                  />
                                </button>
                              </>
                            ) : p.status === "WAIVED" ? (
                              <button
                                onClick={() => undoCancel(p)}
                                disabled={cancellingSave}
                                className="shrink-0 p-1"
                                title="Undo cancel"
                              >
                                <RefreshCw
                                  className={cn(
                                    "w-4 h-4 transition-colors",
                                    cancellingSave
                                      ? "text-gray-300 animate-spin"
                                      : "text-gray-300 hover:text-amber-500",
                                  )}
                                />
                              </button>
                            ) : (
                              <>
                                <button onClick={() => { setRecording(p.id); setPayMethod("CASH"); setPayRef(""); }} className="shrink-0 p-1" title="Mark paid">
                                  <CheckCircle className={cn("w-5 h-5 transition-colors",
                                    recording === p.id ? "text-emerald-500" : "text-gray-300 hover:text-emerald-500")} />
                                </button>
                                <button
                                  onClick={() => {
                                    setCancelling(p.id);
                                    setCancellingNote("");
                                  }}
                                  className="shrink-0 p-1"
                                  title="Cancel fee"
                                >
                                  <XCircle
                                    className={cn(
                                      "w-5 h-5 transition-colors",
                                      cancelling === p.id
                                        ? "text-red-500"
                                        : "text-gray-300 hover:text-red-500",
                                    )}
                                  />
                                </button>
                              </>
                            )}
                          </div>

                          <AnimatePresence>
                            {recording === p.id && (
                              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                <div className="px-4 pb-3 border-t border-gray-50 pt-2 space-y-2">
                                  <div className="grid grid-cols-2 gap-2">
                                    <select value={payMethod} onChange={(e) => setPayMethod(e.target.value)}
                                      className="px-3 py-2 rounded-xl border text-xs bg-white focus:outline-none">
                                      {PAYMENT_METHODS.map((m) => (<option key={m} value={m}>{m.replace(/_/g, " ")}</option>))}
                                    </select>
                                    <input type="text" value={payRef} onChange={(e) => setPayRef(e.target.value)}
                                      placeholder="Receipt / Ref no." className="px-3 py-2 rounded-xl border text-xs focus:outline-none focus:border-emerald-400" />
                                  </div>
                                  <div className="flex gap-2">
                                    <button onClick={() => setRecording(null)} className="flex-1 py-2 rounded-xl border text-xs font-semibold text-gray-600">Cancel</button>
                                    <button onClick={() => markPaid(p)} disabled={saving}
                                      className="flex-1 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold disabled:opacity-60 flex items-center justify-center gap-1">
                                      {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                                      Mark Paid
                                    </button>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-xs">
                  <span className="text-gray-500">{payments.filter((p) => p.status === "PAID").length} paid · {payments.filter((p) => p.status !== "PAID" && p.status !== "WAIVED").length} pending</span>
                  <div className="flex gap-3">
                    <span className="text-emerald-600 font-bold">
                      ₹{payments.filter((p) => p.status === "PAID").reduce((s, p) => s + Number(p.paidAmount ?? p.dueAmount), 0).toLocaleString()} collected
                    </span>
                    <span className="text-amber-600 font-bold">
                      ₹{payments.filter((p) => p.status !== "PAID" && p.status !== "WAIVED").reduce((s, p) => s + Number(p.dueAmount), 0).toLocaleString()} pending
                    </span>
                  </div>
                </div>
              </div>

              {payTotal > 30 && (
                <div className="flex items-center justify-center gap-3 mt-4">
                  <button disabled={paySkip === 0} onClick={() => setPaySkip(Math.max(0, paySkip - 30))}
                    className="px-4 py-2 rounded-xl border text-sm disabled:opacity-40">Prev</button>
                  <span className="text-sm text-gray-500">{paySkip + 1}–{Math.min(paySkip + 30, payTotal)} of {payTotal}</span>
                  <button disabled={paySkip + 30 >= payTotal} onClick={() => setPaySkip(paySkip + 30)}
                    className="px-4 py-2 rounded-xl border text-sm disabled:opacity-40">Next</button>
                </div>
              )}
            </>
          )}
        </>
      )}

      {receipt && <ReceiptModal receipt={receipt} onClose={() => setReceipt(null)} />}

      {/* Cancel Payment Modal */}
      <AnimatePresence>
        {cancellingPayment && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
              onClick={() => setCancelling(null)}
            />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div className="bg-white rounded-2xl sm:rounded-3xl w-full max-w-sm shadow-xl overflow-hidden">
                <div className="bg-red-50 px-5 py-4 border-b border-red-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                      <XCircle className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">Cancel Fee Payment</p>
                      <p className="text-xs text-gray-500">This action will mark the payment as waived</p>
                    </div>
                  </div>
                </div>
                <div className="px-5 py-4 space-y-3">
                  <div className="bg-gray-50 rounded-xl p-3 space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Student</span>
                      <span className="font-semibold text-gray-900">{cancellingPayment.student.name}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Adm No</span>
                      <span className="font-semibold text-gray-900">{cancellingPayment.student.adno}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Fee Type</span>
                      <span className="font-semibold text-gray-900">{cancellingPayment.feeType.name}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Amount</span>
                      <span className="font-semibold text-gray-900">₹{Number(cancellingPayment.paidAmount ?? cancellingPayment.dueAmount).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Status</span>
                      <span className="font-semibold text-amber-600">{cancellingPayment.status}</span>
                    </div>
                  </div>
                  <input type="text" value={cancellingNote} onChange={(e) => setCancellingNote(e.target.value)}
                    placeholder="Reason for cancellation (optional)"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-red-400" />
                </div>
                <div className="px-5 pb-5 flex gap-2">
                  <button onClick={() => { setCancelling(null); setCancellingNote(""); }}
                    className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600">Keep</button>
                  <button onClick={() => cancelPayment(cancellingPayment)} disabled={cancellingSave}
                    className="flex-1 py-3 rounded-xl bg-red-600 text-white text-sm font-bold disabled:opacity-60 flex items-center justify-center gap-1.5"
                  >
                    {cancellingSave ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                    Confirm Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}
