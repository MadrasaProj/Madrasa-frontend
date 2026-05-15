import { useState, useEffect, useCallback, useRef } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader, SectionHeader } from "@/components/ui/PageHeader";
import {
  getFeeTypes, getPayments, createFeeType, recordPayment, updatePayment,
  getFeeSummary, generatePayments, getPaymentReceipt,
  type FeeType, type FeePayment, type ReceiptData, type CreateFeeTypePayload,
  type RecordPaymentPayload, type FeePaymentStatus,
} from "@/lib/fees-api";
import { getAllClasses, type ClassRecord } from "@/lib/classes-api";
import { getStudents, type StudentRecord } from "@/lib/students-api";
import { useAuthStore } from "@/store/auth";
import { useLanguageStore } from "@/store/language";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import {
  CreditCard, Plus, Loader2, Receipt, CheckCircle, Clock, AlertCircle,
  BarChart2, Settings, RefreshCw, Printer, ChevronDown, Users,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

// ── Status helpers ─────────────────────────────────────────────────────────────
const STATUS_META: Record<FeePaymentStatus, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  PENDING:  { label: "Pending",  color: "text-amber-700",  bg: "bg-amber-50",   icon: <Clock className="w-3.5 h-3.5" /> },
  PAID:     { label: "Paid",     color: "text-emerald-700",bg: "bg-emerald-50", icon: <CheckCircle className="w-3.5 h-3.5" /> },
  PARTIAL:  { label: "Partial",  color: "text-blue-700",   bg: "bg-blue-50",    icon: <Clock className="w-3.5 h-3.5" /> },
  OVERDUE:  { label: "Overdue",  color: "text-red-700",    bg: "bg-red-50",     icon: <AlertCircle className="w-3.5 h-3.5" /> },
  WAIVED:   { label: "Waived",   color: "text-gray-600",   bg: "bg-gray-100",   icon: <CheckCircle className="w-3.5 h-3.5" /> },
};

type Tab = "types" | "payments" | "reports";
const PAYMENT_METHODS = ["CASH", "BANK_TRANSFER", "UPI", "CHEQUE", "OTHER"] as const;

// ── Receipt component ─────────────────────────────────────────────────────────
function ReceiptModal({ receipt, onClose }: { receipt: ReceiptData; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <motion.div initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        className="relative bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-sm p-6 shadow-2xl"
      >
        {/* Receipt header */}
        <div className="text-center mb-4 border-b border-dashed border-gray-200 pb-4">
          <p className="font-bold text-gray-900 text-lg">{receipt.client.name}</p>
          {receipt.client.address && <p className="text-xs text-gray-500">{receipt.client.address}</p>}
          {receipt.client.phone && <p className="text-xs text-gray-500">{receipt.client.phone}</p>}
          <p className="text-xs font-bold text-emerald-700 mt-1 uppercase tracking-widest">Fee Receipt</p>
        </div>

        {/* Details */}
        <div className="space-y-2 text-sm mb-4">
          {[
            ["Receipt No", receipt.reference ?? receipt.id.slice(0, 8).toUpperCase()],
            ["Date", receipt.paidAt ? new Date(receipt.paidAt).toLocaleDateString("en-GB") : "—"],
            ["Student", receipt.student.name],
            ["Adm No", receipt.student.adno],
            ["Class", receipt.student.class?.name ?? "—"],
            ["Fee", receipt.feeType.name],
            ["Due Amount", `₹${Number(receipt.dueAmount).toLocaleString()}`],
            ["Paid Amount", `₹${Number(receipt.paidAmount ?? 0).toLocaleString()}`],
            ["Method", receipt.method ?? "—"],
          ].map(([label, value]) => (
            <div key={label} className="flex items-center justify-between">
              <span className="text-gray-500">{label}</span>
              <span className="font-semibold text-gray-800">{value}</span>
            </div>
          ))}
        </div>

        <div className="border-t border-dashed border-gray-200 pt-3 mb-4">
          <div className="flex items-center justify-between text-base font-bold">
            <span>Status</span>
            <span className={cn("px-3 py-1 rounded-lg text-sm", STATUS_META[receipt.status].bg, STATUS_META[receipt.status].color)}>
              {STATUS_META[receipt.status].label}
            </span>
          </div>
        </div>

        {receipt.notes && (
          <p className="text-xs text-gray-400 italic mb-4">Note: {receipt.notes}</p>
        )}

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600">
            Close
          </button>
          <button onClick={() => window.print()}
            className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold flex items-center justify-center gap-1.5">
            <Printer className="w-4 h-4" /> Print
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Record Payment Modal ────────────────────────────────────────────────────
function RecordPaymentModal({
  payment, token, clientId, onClose, onSaved,
}: {
  payment: FeePayment;
  token: string; clientId: string;
  onClose: () => void; onSaved: () => void;
}) {
  const [amount, setAmount]   = useState(String(Number(payment.dueAmount)));
  const [method, setMethod]   = useState<string>("CASH");
  const [reference, setRef]   = useState("");
  const [notes, setNotes]     = useState("");
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const save = async () => {
    setSaving(true); setError(null);
    try {
      await updatePayment(clientId, token, payment.id, {
        paidAmount: Number(amount),
        method: method as any,
        reference: reference || undefined,
        notes: notes || undefined,
        status: Number(amount) >= Number(payment.dueAmount) ? "PAID" : "PARTIAL",
        paidAt: new Date().toISOString(),
      });
      onSaved();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <motion.div initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        className="relative bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-sm p-5 shadow-2xl"
      >
        <h3 className="font-bold text-gray-900 mb-1">Record Payment</h3>
        <p className="text-sm text-gray-500 mb-4">{payment.student.name} · {payment.feeType.name}</p>

        {error && <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-xl mb-3">{error}</div>}

        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Amount Paid (₹)</label>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-emerald-400" />
            <p className="text-xs text-gray-400 mt-1">Due: ₹{Number(payment.dueAmount).toLocaleString()}</p>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Payment Method</label>
            <select value={method} onChange={(e) => setMethod(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none">
              {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m.replace("_", " ")}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Receipt / Reference No.</label>
            <input type="text" value={reference} onChange={(e) => setRef(e.target.value)}
              placeholder="Optional"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-emerald-400" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Notes</label>
            <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-emerald-400" />
          </div>
        </div>

        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600">Cancel</button>
          <button onClick={save} disabled={saving || !amount}
            className="flex-1 py-3 rounded-xl bg-emerald-600 text-white text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-1.5">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            Save
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AdminFeesPage() {
  const { lang } = useLanguageStore();
  const { user, accessToken, activeClientId } = useAuthStore();

  const [tab, setTab]               = useState<Tab>("types");
  const [feeTypes, setFeeTypes]     = useState<FeeType[]>([]);
  const [payments, setPayments]     = useState<FeePayment[]>([]);
  const [paymentsTotal, setPaymentsTotal] = useState(0);
  const [classes, setClasses]       = useState<ClassRecord[]>([]);
  const [summary, setSummary]       = useState<{ byStatus: any[] } | null>(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);

  // Filters
  const [filterFeeType, setFilterFeeType]   = useState<string>("");
  const [filterStatus, setFilterStatus]     = useState<string>("");
  const [filterClass, setFilterClass]       = useState<string>("");
  const [paymentsSkip, setPaymentsSkip]     = useState(0);

  // Modals
  const [showCreateType, setShowCreateType] = useState(false);
  const [showGenerate, setShowGenerate]     = useState<FeeType | null>(null);
  const [recordingPayment, setRecordingPayment] = useState<FeePayment | null>(null);
  const [viewReceipt, setViewReceipt]       = useState<ReceiptData | null>(null);
  const [loadingReceipt, setLoadingReceipt] = useState<string | null>(null);

  // Create fee type form
  const [newType, setNewType] = useState<Partial<CreateFeeTypePayload>>({ kind: "ONE_TIME", amount: 0 });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Generate state
  const [generating, setGenerating] = useState(false);

  const cid = activeClientId;
  const token = accessToken ?? "";

  // Load classes once
  useEffect(() => {
    if (!cid || !token) return;
    const ac = new AbortController();
    getAllClasses(cid, token, ac.signal).then(setClasses).catch(() => {});
    return () => ac.abort();
  }, [cid, token]);

  // Load fee types
  const loadFeeTypes = useCallback(async () => {
    if (!cid || !token) return;
    setLoading(true); setError(null);
    try {
      const data = await getFeeTypes(cid, token, user?.defaultAcademicYearId ?? undefined);
      setFeeTypes(data);
    } catch (err) { setError((err as Error).message); }
    finally { setLoading(false); }
  }, [cid, token, user?.defaultAcademicYearId]);

  // Load payments
  const loadPayments = useCallback(async () => {
    if (!cid || !token) return;
    setLoading(true); setError(null);
    try {
      const res = await getPayments(cid, token, {
        feeTypeId: filterFeeType || undefined,
        status: filterStatus as any || undefined,
        classId: filterClass || undefined,
        skip: paymentsSkip,
        take: 30,
      });
      setPayments(res.payments);
      setPaymentsTotal(res.total);
    } catch (err) { setError((err as Error).message); }
    finally { setLoading(false); }
  }, [cid, token, filterFeeType, filterStatus, filterClass, paymentsSkip]);

  // Load summary for reports tab
  const loadSummary = useCallback(async () => {
    if (!cid || !token) return;
    setLoading(true);
    try {
      const data = await getFeeSummary(cid, token, user?.defaultAcademicYearId ?? undefined);
      setSummary(data);
    } catch (err) {} finally { setLoading(false); }
  }, [cid, token, user?.defaultAcademicYearId]);

  useEffect(() => {
    if (tab === "types") loadFeeTypes();
    else if (tab === "payments") loadPayments();
    else if (tab === "reports") loadSummary();
  }, [tab, loadFeeTypes, loadPayments, loadSummary]);

  // Create fee type
  const handleCreateType = async () => {
    if (!cid || !token || !newType.name || !newType.amount) return;
    setCreating(true); setCreateError(null);
    try {
      await createFeeType(cid, token, newType as CreateFeeTypePayload);
      setShowCreateType(false);
      setNewType({ kind: "ONE_TIME", amount: 0 });
      loadFeeTypes();
    } catch (err) { setCreateError((err as Error).message); }
    finally { setCreating(false); }
  };

  // Generate payments for a fee type
  const handleGenerate = async (ft: FeeType) => {
    if (!cid || !token) return;
    setGenerating(true);
    try {
      const res = await generatePayments(cid, token, {
        feeTypeId: ft.id,
        academicYearId: user?.defaultAcademicYearId ?? undefined,
      });
      alert(`Generated ${res.generated} payment records${res.message ? ` — ${res.message}` : ""}`);
      setShowGenerate(null);
    } catch (err) { alert((err as Error).message); }
    finally { setGenerating(false); }
  };

  // Show receipt
  const showReceiptFor = async (id: string) => {
    if (!cid || !token) return;
    setLoadingReceipt(id);
    try {
      const data = await getPaymentReceipt(cid, token, id);
      setViewReceipt(data);
    } catch (err) { alert((err as Error).message); }
    finally { setLoadingReceipt(null); }
  };

  // Chart data from summary
  const chartData = summary?.byStatus.map((s) => ({
    status: s.status,
    due: Number(s._sum.dueAmount ?? 0),
    paid: Number(s._sum.paidAmount ?? 0),
    count: s._count.id,
  })) ?? [];

  const totalCollected = chartData.filter((d) => d.status === "PAID").reduce((a, b) => a + b.paid, 0);
  const totalPending = chartData.filter((d) => ["PENDING","PARTIAL","OVERDUE"].includes(d.status)).reduce((a, b) => a + b.due, 0);

  return (
    <DashboardLayout>
      <PageHeader title={t("nav", "fees", lang)} subtitle="Fee management" icon={CreditCard} />

      {/* Tab bar */}
      <div className="flex gap-1.5 mb-5 bg-gray-100 p-1 rounded-2xl">
        {([["types", "Fee Types", <Settings className="w-3.5 h-3.5" />],
           ["payments", "Payments", <CreditCard className="w-3.5 h-3.5" />],
           ["reports", "Reports", <BarChart2 className="w-3.5 h-3.5" />]] as [Tab, string, React.ReactNode][])
          .map(([key, label, icon]) => (
            <button key={key} onClick={() => setTab(key)}
              className={cn("flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all",
                tab === key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500")}>
              {icon}{label}
            </button>
          ))}
      </div>

      {/* ── FEE TYPES TAB ── */}
      {tab === "types" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-500">{feeTypes.length} fee types</p>
            <button onClick={() => { setShowCreateType(true); setCreateError(null); }}
              className="flex items-center gap-1.5 bg-emerald-600 text-white px-3 py-2 rounded-xl text-xs font-bold">
              <Plus className="w-3.5 h-3.5" /> New Fee Type
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-gray-400"><Loader2 className="w-4 h-4 animate-spin" /></div>
          ) : error ? (
            <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-2xl">{error}</div>
          ) : feeTypes.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <CreditCard className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>No fee types yet. Create one to start collecting fees.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {feeTypes.map((ft) => (
                <div key={ft.id} className="bg-white rounded-2xl border border-gray-100 p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900">{ft.name}</p>
                      {ft.description && <p className="text-xs text-gray-500 mt-0.5">{ft.description}</p>}
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <p className="font-bold text-emerald-700 text-lg">₹{Number(ft.amount).toLocaleString()}</p>
                      <span className={cn("text-xs font-bold px-2 py-0.5 rounded-lg",
                        ft.kind === "ONE_TIME" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700")}>
                        {ft.kind === "ONE_TIME" ? "One Time" : `Recurring · ${ft.frequency ?? ""}`}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex gap-2 text-xs text-gray-400">
                      {ft.targetClassIds.length > 0 ? (
                        <span>{ft.targetClassIds.length} class(es)</span>
                      ) : (
                        <span className="flex items-center gap-1"><Users className="w-3 h-3" /> All classes</span>
                      )}
                      {ft._count && <span>· {ft._count.payments} payments</span>}
                    </div>
                    <button onClick={() => setShowGenerate(ft)}
                      className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl">
                      Generate Payments
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── PAYMENTS TAB ── */}
      {tab === "payments" && (
        <div>
          {/* Filters */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            <select value={filterFeeType} onChange={(e) => { setFilterFeeType(e.target.value); setPaymentsSkip(0); }}
              className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none">
              <option value="">All Fee Types</option>
              {feeTypes.map((ft) => <option key={ft.id} value={ft.id}>{ft.name}</option>)}
            </select>
            <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPaymentsSkip(0); }}
              className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none">
              <option value="">All Status</option>
              {Object.keys(STATUS_META).map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={filterClass} onChange={(e) => { setFilterClass(e.target.value); setPaymentsSkip(0); }}
              className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none">
              <option value="">All Classes</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <button onClick={() => { setFilterFeeType(""); setFilterStatus(""); setFilterClass(""); setPaymentsSkip(0); }}
              className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-500 flex items-center justify-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" /> Clear
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-gray-400"><Loader2 className="w-4 h-4 animate-spin" /></div>
          ) : error ? (
            <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-2xl">{error}</div>
          ) : (
            <>
              <p className="text-xs text-gray-400 mb-3">{paymentsTotal} total records</p>
              <div className="space-y-2">
                {payments.map((p) => {
                  const meta = STATUS_META[p.status];
                  return (
                    <div key={p.id} className="bg-white rounded-2xl border border-gray-100 p-4">
                      <div className="flex items-center justify-between mb-1.5">
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">{p.student.name}</p>
                          <p className="text-xs text-gray-400">{p.student.adno} · {p.student.class?.name ?? ""} · {p.feeType.name}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-gray-900">₹{Number(p.dueAmount).toLocaleString()}</p>
                          <span className={cn("text-xs font-bold px-2 py-0.5 rounded-lg flex items-center gap-1", meta.bg, meta.color)}>
                            {meta.icon}{meta.label}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        {p.dueDate && (
                          <p className="text-xs text-gray-400">Due: {new Date(p.dueDate).toLocaleDateString("en-GB")}</p>
                        )}
                        {p.paidAt && (
                          <p className="text-xs text-emerald-600">Paid: {new Date(p.paidAt).toLocaleDateString("en-GB")}</p>
                        )}
                        <div className="flex-1" />
                        {p.status !== "PAID" && p.status !== "WAIVED" && (
                          <button onClick={() => setRecordingPayment(p)}
                            className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl">
                            Record Payment
                          </button>
                        )}
                        {(p.status === "PAID" || p.status === "PARTIAL") && (
                          <button onClick={() => showReceiptFor(p.id)} disabled={loadingReceipt === p.id}
                            className="text-xs font-bold text-gray-600 bg-gray-100 px-3 py-1.5 rounded-xl flex items-center gap-1">
                            {loadingReceipt === p.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Receipt className="w-3 h-3" />}
                            Receipt
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
                {payments.length === 0 && (
                  <div className="text-center py-10 text-gray-400 text-sm">No payment records found</div>
                )}
              </div>

              {/* Pagination */}
              {paymentsTotal > 30 && (
                <div className="flex items-center justify-center gap-3 mt-4">
                  <button disabled={paymentsSkip === 0} onClick={() => setPaymentsSkip(Math.max(0, paymentsSkip - 30))}
                    className="px-4 py-2 rounded-xl border text-sm disabled:opacity-40">Prev</button>
                  <span className="text-sm text-gray-500">{paymentsSkip + 1}–{Math.min(paymentsSkip + 30, paymentsTotal)} of {paymentsTotal}</span>
                  <button disabled={paymentsSkip + 30 >= paymentsTotal} onClick={() => setPaymentsSkip(paymentsSkip + 30)}
                    className="px-4 py-2 rounded-xl border text-sm disabled:opacity-40">Next</button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── REPORTS TAB ── */}
      {tab === "reports" && (
        <div>
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-gray-400"><Loader2 className="w-4 h-4 animate-spin" /></div>
          ) : (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-2 gap-3 mb-5">
                <div className="bg-emerald-500 rounded-2xl p-4 text-white">
                  <p className="text-emerald-100 text-xs font-medium">Total Collected</p>
                  <p className="text-2xl font-bold mt-1">₹{totalCollected.toLocaleString()}</p>
                </div>
                <div className="bg-white rounded-2xl p-4 border border-gray-100">
                  <p className="text-gray-500 text-xs font-medium">Total Pending</p>
                  <p className="text-2xl font-bold mt-1 text-amber-600">₹{totalPending.toLocaleString()}</p>
                </div>
              </div>

              {/* Status breakdown */}
              <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4">
                <SectionHeader title="By Status" />
                {chartData.length === 0 ? (
                  <p className="text-sm text-gray-400 py-4 text-center">No data yet</p>
                ) : (
                  <div className="space-y-2">
                    {chartData.map((d) => {
                      const meta = STATUS_META[d.status as FeePaymentStatus] ?? STATUS_META.PENDING;
                      return (
                        <div key={d.status} className="flex items-center gap-3">
                          <span className={cn("text-xs font-bold px-2 py-1 rounded-lg w-20 text-center", meta.bg, meta.color)}>{d.status}</span>
                          <div className="flex-1">
                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div className={cn("h-full rounded-full",
                                d.status === "PAID" ? "bg-emerald-500" :
                                d.status === "OVERDUE" ? "bg-red-400" : "bg-amber-400")}
                                style={{ width: `${Math.min(100, (d.paid / Math.max(d.due, 1)) * 100)}%` }} />
                            </div>
                          </div>
                          <span className="text-xs font-bold text-gray-700 w-12 text-right">{d.count}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── MODALS ── */}

      {/* Create fee type */}
      <AnimatePresence>
        {showCreateType && (
          <>
            <motion.div key="bd" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40" onClick={() => setShowCreateType(false)} />
            <motion.div key="drawer" initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl max-h-[90dvh] flex flex-col">
              <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 bg-gray-300 rounded-full" /></div>
              <div className="flex items-center justify-between px-5 py-3 border-b shrink-0">
                <h2 className="font-bold text-gray-900">New Fee Type</h2>
                <button onClick={() => setShowCreateType(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">✕</button>
              </div>
              <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4 pb-8">
                {createError && <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-xl">{createError}</div>}
                {[
                  { key: "name", label: "Fee Name", placeholder: "e.g. SKSBV, Monthly Fee", type: "text" },
                  { key: "amount", label: "Amount (₹)", placeholder: "500", type: "number" },
                  { key: "description", label: "Description (optional)", placeholder: "", type: "text" },
                ].map(({ key, label, placeholder, type }) => (
                  <div key={key}>
                    <label className="text-xs font-semibold text-gray-600 mb-1.5 block">{label}</label>
                    <input type={type} placeholder={placeholder} value={(newType as any)[key] ?? ""}
                      onChange={(e) => setNewType((n) => ({ ...n, [key]: type === "number" ? Number(e.target.value) : e.target.value }))}
                      className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-gray-50 focus:outline-none focus:border-emerald-400 text-sm" />
                  </div>
                ))}
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(["ONE_TIME", "RECURRING"] as const).map((k) => (
                      <label key={k} className={cn("flex items-center justify-center gap-2 py-3 rounded-2xl border text-sm font-semibold cursor-pointer transition-all",
                        newType.kind === k ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-gray-200 bg-gray-50 text-gray-700")}>
                        <input type="radio" className="sr-only" checked={newType.kind === k} onChange={() => setNewType((n) => ({ ...n, kind: k }))} />
                        {k === "ONE_TIME" ? "One Time" : "Recurring"}
                      </label>
                    ))}
                  </div>
                </div>
                {newType.kind === "RECURRING" && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Frequency</label>
                      <select value={newType.frequency ?? "monthly"}
                        onChange={(e) => setNewType((n) => ({ ...n, frequency: e.target.value }))}
                        className="w-full px-3 py-3 rounded-2xl border border-gray-200 bg-gray-50 text-sm">
                        {["monthly","quarterly","yearly"].map((f) => <option key={f} value={f}>{f}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Due Day</label>
                      <input type="number" min={1} max={31} placeholder="5"
                        value={newType.dueDay ?? ""}
                        onChange={(e) => setNewType((n) => ({ ...n, dueDay: Number(e.target.value) }))}
                        className="w-full px-3 py-3 rounded-2xl border border-gray-200 bg-gray-50 text-sm focus:outline-none" />
                    </div>
                  </div>
                )}
                <button onClick={handleCreateType} disabled={creating || !newType.name || !newType.amount}
                  className="w-full bg-emerald-600 text-white font-bold py-4 rounded-2xl disabled:opacity-60 flex items-center justify-center gap-2">
                  {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Create Fee Type
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Generate payments confirmation */}
      {showGenerate && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowGenerate(null)} />
          <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
            className="relative bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-sm p-5 shadow-2xl">
            <h3 className="font-bold text-gray-900 mb-1">Generate Payments</h3>
            <p className="text-sm text-gray-500 mb-4">
              This will create <strong>PENDING</strong> payment records for all eligible students for &quot;{showGenerate.name}&quot;.
            </p>
            <div className="bg-amber-50 text-amber-700 text-xs px-3 py-2 rounded-xl mb-4">
              Already-existing records will be skipped. This action is safe to repeat.
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowGenerate(null)} className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600">Cancel</button>
              <button onClick={() => handleGenerate(showGenerate)} disabled={generating}
                className="flex-1 py-3 rounded-xl bg-emerald-600 text-white text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-1.5">
                {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Generate
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Record payment modal */}
      {recordingPayment && (
        <RecordPaymentModal
          payment={recordingPayment}
          token={token}
          clientId={cid ?? ""}
          onClose={() => setRecordingPayment(null)}
          onSaved={() => { setRecordingPayment(null); loadPayments(); }}
        />
      )}

      {/* Receipt modal */}
      {viewReceipt && <ReceiptModal receipt={viewReceipt} onClose={() => setViewReceipt(null)} />}
    </DashboardLayout>
  );
}
