import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { ApiErrorBanner } from "@/components/ui/ApiErrorBanner";
import {
  getFeeTypes, getPayments, createFeeType, updatePayment,
  generatePayments, getPaymentReceipt,
  type FeeType, type FeePayment, type ReceiptData,
  type FeePaymentStatus, type CreateFeeTypePayload,
} from "@/lib/fees-api";
import { getAllClasses, type ClassRecord } from "@/lib/classes-api";
import { useAuthStore } from "@/store/auth";
import { cn } from "@/lib/utils";
import {
  CreditCard, Plus, Loader2, Receipt, CheckCircle, Clock,
  AlertCircle, RefreshCw, Printer, Search, X, Users, Zap,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

// ── Palette for fee type cards ─────────────────────────────────────────────
const PALETTE = [
  { bg: "bg-emerald-600", light: "bg-emerald-50",  border: "border-emerald-200", text: "text-emerald-700" },
  { bg: "bg-blue-600",    light: "bg-blue-50",     border: "border-blue-200",    text: "text-blue-700"    },
  { bg: "bg-purple-600",  light: "bg-purple-50",   border: "border-purple-200",  text: "text-purple-700"  },
  { bg: "bg-rose-600",    light: "bg-rose-50",     border: "border-rose-200",    text: "text-rose-700"    },
  { bg: "bg-orange-500",  light: "bg-orange-50",   border: "border-orange-200",  text: "text-orange-700"  },
  { bg: "bg-teal-600",    light: "bg-teal-50",     border: "border-teal-200",    text: "text-teal-700"    },
  { bg: "bg-indigo-600",  light: "bg-indigo-50",   border: "border-indigo-200",  text: "text-indigo-700"  },
  { bg: "bg-amber-500",   light: "bg-amber-50",    border: "border-amber-200",   text: "text-amber-700"   },
];

const STATUS_META: Record<FeePaymentStatus, { label: string; color: string; bg: string }> = {
  PENDING:  { label: "Pending",  color: "text-amber-700",   bg: "bg-amber-50"   },
  PAID:     { label: "Paid",     color: "text-emerald-700", bg: "bg-emerald-50" },
  PARTIAL:  { label: "Partial",  color: "text-blue-700",    bg: "bg-blue-50"    },
  OVERDUE:  { label: "Overdue",  color: "text-red-700",     bg: "bg-red-50"     },
  WAIVED:   { label: "Waived",   color: "text-gray-500",    bg: "bg-gray-100"   },
};

const PAYMENT_METHODS = ["CASH", "BANK_TRANSFER", "UPI", "CHEQUE", "OTHER"] as const;

// ── Receipt Modal ──────────────────────────────────────────────────────────
function ReceiptModal({ receipt, onClose }: { receipt: ReceiptData; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ scale: 0.94, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="relative bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden"
      >
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
            ["Student",   receipt.student.name],
            ["Adm No",    receipt.student.adno],
            ["Class",     receipt.student.class?.name ?? "—"],
            ["Fee Type",  receipt.feeType.name],
            ["Paid On",   receipt.paidAt ? new Date(receipt.paidAt).toLocaleDateString("en-GB") : "—"],
            ["Method",    receipt.method ?? "—"],
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

// ── Main Page ──────────────────────────────────────────────────────────────
export default function AdminFeesPage() {
  const { user, accessToken, activeClientId } = useAuthStore();
  const cid   = activeClientId ?? "";
  const token = accessToken ?? "";

  const [feeTypes, setFeeTypes]       = useState<FeeType[]>([]);
  const [activeTypeId, setActiveTypeId] = useState<string | null>(null); // null = all
  const [typesLoading, setTypesLoading] = useState(true);

  const [payments, setPayments]       = useState<FeePayment[]>([]);
  const [payTotal, setPayTotal]       = useState(0);
  const [payLoading, setPayLoading]   = useState(false);
  const [paySkip, setPaySkip]         = useState(0);
  const [search, setSearch]           = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [classes, setClasses]         = useState<ClassRecord[]>([]);
  const [tab, setTab]                 = useState<"records" | "reports">("records");

  // Inline mark-paid state
  const [recording, setRecording]     = useState<string | null>(null);
  const [payMethod, setPayMethod]     = useState("CASH");
  const [payRef, setPayRef]           = useState("");
  const [saving, setSaving]           = useState(false);

  // Receipt
  const [receipt, setReceipt]         = useState<ReceiptData | null>(null);
  const [loadingReceipt, setLoadingReceipt] = useState<string | null>(null);

  // Generate
  const [generating, setGenerating]   = useState<string | null>(null);

  // Error
  const [error, setError]             = useState<string | null>(null);

  // Create modal
  const [showCreate, setShowCreate]   = useState(false);
  const [newFee, setNewFee]           = useState<Partial<CreateFeeTypePayload>>({ kind: "ONE_TIME", amount: 0 });
  const [creating, setCreating]       = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Load fee types
  const loadTypes = useCallback(async () => {
    if (!cid || !token) return;
    setTypesLoading(true);
    setError(null);
    try {
      const data = await getFeeTypes(cid, token, user?.defaultAcademicYearId ?? undefined);
      setFeeTypes(data);
    } catch (e) { setError((e as Error).message); }
    finally { setTypesLoading(false); }
  }, [cid, token, user?.defaultAcademicYearId]);

  useEffect(() => {
    if (!cid || !token) return;
    loadTypes();
    getAllClasses(cid, token).then(setClasses).catch(() => {});
  }, [cid, token, loadTypes]);

  // Load payments
  const loadPayments = useCallback(async () => {
    if (!cid || !token) return;
    setPayLoading(true);
    try {
      const res = await getPayments(cid, token, {
        feeTypeId: activeTypeId ?? undefined,
        status: statusFilter !== "all" ? (statusFilter as FeePaymentStatus) : undefined,
        skip: paySkip,
        take: 30,
      });
      setPayments(res.payments);
      setPayTotal(res.total);
    } catch (e) { setError((e as Error).message); }
    finally { setPayLoading(false); }
  }, [cid, token, activeTypeId, statusFilter, paySkip]);

  useEffect(() => {
    if (tab === "records") loadPayments();
  }, [tab, loadPayments]);

  // Stats
  const [summary, setSummary] = useState<{ byStatus: any[]; byFeeType: any[] } | null>(null);
  const loadSummary = useCallback(async () => {
    if (!cid || !token) return;
    try {
      const { getFeeSummary } = await import("@/lib/fees-api");
      const data = await getFeeSummary(cid, token, user?.defaultAcademicYearId ?? undefined);
      setSummary(data);
    } catch { /* silent */ }
  }, [cid, token, user?.defaultAcademicYearId]);

  useEffect(() => {
    if (tab === "reports") loadSummary();
  }, [tab, loadSummary]);

  const activeType = feeTypes.find((f) => f.id === activeTypeId) ?? null;
  const activePalette = activeType ? PALETTE[feeTypes.indexOf(activeType) % PALETTE.length] : PALETTE[0];

  const paidPayments    = payments.filter((p) => p.status === "PAID");
  const pendingPayments = payments.filter((p) => p.status !== "PAID" && p.status !== "WAIVED");
  const totalCollected  = paidPayments.reduce((s, p) => s + Number(p.paidAmount ?? p.dueAmount), 0);
  const totalPending    = pendingPayments.reduce((s, p) => s + Number(p.dueAmount), 0);
  const pctCollected    = (totalCollected + totalPending) > 0
    ? Math.round((totalCollected / (totalCollected + totalPending)) * 100) : 0;

  const filtered = search
    ? payments.filter((p) =>
        p.student.name.toLowerCase().includes(search.toLowerCase()) ||
        p.student.adno.includes(search),
      )
    : payments;

  const markPaid = async (p: FeePayment) => {
    setSaving(true);
    try {
      await updatePayment(cid, token, p.id, {
        paidAmount: Number(p.dueAmount),
        method: payMethod as any,
        reference: payRef || undefined,
        status: "PAID",
        paidAt: new Date().toISOString(),
      });
      setRecording(null);
      setPayRef("");
      loadPayments();
    } catch (e) { setError((e as Error).message); }
    finally { setSaving(false); }
  };

  const showReceiptFor = async (id: string) => {
    setLoadingReceipt(id);
    try { setReceipt(await getPaymentReceipt(cid, token, id)); }
    catch (e) { setError((e as Error).message); }
    finally { setLoadingReceipt(null); }
  };

  const handleGenerate = async (ft: FeeType) => {
    setGenerating(ft.id);
    setError(null);
    try {
      const res = await generatePayments(cid, token, {
        feeTypeId: ft.id,
        academicYearId: user?.defaultAcademicYearId ?? undefined,
      });
      if (activeTypeId === ft.id) loadPayments();
      alert(`Generated ${res.generated} payment records${res.message ? ` — ${res.message}` : ""}`);
    } catch (e) { setError((e as Error).message); }
    finally { setGenerating(null); }
  };

  const handleCreate = async () => {
    if (!newFee.name || !newFee.amount) return;
    setCreating(true);
    setCreateError(null);
    try {
      await createFeeType(cid, token, newFee as CreateFeeTypePayload);
      setShowCreate(false);
      setNewFee({ kind: "ONE_TIME", amount: 0 });
      loadTypes();
    } catch (e) { setCreateError((e as Error).message); }
    finally { setCreating(false); }
  };

  const chartData = summary?.byFeeType.map((b) => {
    const ft = feeTypes.find((f) => f.id === b.feeTypeId);
    return {
      name: ft?.name ?? b.feeTypeId.slice(0, 6),
      due: Number(b._sum.dueAmount ?? 0),
      paid: Number(b._sum.paidAmount ?? 0),
      count: b._count.id,
    };
  }) ?? [];

  return (
    <DashboardLayout>
      <PageHeader
        title="Fees & Payments"
        subtitle="All fee types, campaigns, and payment records"
        icon={CreditCard}
        action={
          <button
            onClick={() => { setShowCreate(true); setCreateError(null); }}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold"
          >
            <Plus className="w-4 h-4" /> New Fee Type
          </button>
        }
      />

      {error && <ApiErrorBanner message={error} onRetry={tab === "records" ? loadPayments : loadSummary} />}

      {typesLoading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      ) : feeTypes.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <CreditCard className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No fee types yet. Create one to start collecting.</p>
          <button
            onClick={() => { setShowCreate(true); setCreateError(null); }}
            className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Create Fee Type
          </button>
        </div>
      ) : (
        <>
          {/* Fee type cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-5">
            {/* All card */}
            <button
              onClick={() => { setActiveTypeId(null); setPaySkip(0); setStatusFilter("all"); setSearch(""); }}
              className={cn(
                "text-left p-4 rounded-2xl border-2 transition-all",
                activeTypeId === null
                  ? "bg-gray-900 border-gray-900 text-white"
                  : "bg-white border-gray-100 hover:border-gray-200 text-gray-700",
              )}
            >
              <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center mb-2", activeTypeId === null ? "bg-white/20" : "bg-gray-100")}>
                <Users className={cn("w-4 h-4", activeTypeId === null ? "text-white" : "text-gray-500")} />
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
                <button
                  key={ft.id}
                  onClick={() => { setActiveTypeId(ft.id); setPaySkip(0); setStatusFilter("all"); setSearch(""); }}
                  className={cn(
                    "text-left p-4 rounded-2xl border-2 transition-all",
                    isActive ? `${pal.light} ${pal.border}` : "bg-white border-gray-100 hover:border-gray-200",
                  )}
                >
                  <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center mb-2", pal.bg)}>
                    <CreditCard className="w-4 h-4 text-white" />
                  </div>
                  <p className={cn("text-xs font-bold truncate mb-1", isActive ? pal.text : "text-gray-700")}>
                    {ft.name}
                  </p>
                  <p className="text-base font-bold text-gray-900">₹{Number(ft.amount).toLocaleString()}</p>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-[10px] text-gray-400">
                      {ft.kind === "RECURRING" ? `${ft.frequency ?? "recurring"}` : "one-time"}
                    </p>
                    {ft._count && (
                      <p className="text-[10px] text-gray-400">{ft._count.payments} records</p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Selected type stats strip */}
          {activeType && (
            <div className={cn("rounded-2xl p-4 mb-5 border-2", activePalette.light, activePalette.border)}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className={cn("font-bold", activePalette.text)}>{activeType.name}</p>
                  {activeType.description && (
                    <p className="text-xs text-gray-500 mt-0.5">{activeType.description}</p>
                  )}
                </div>
                <button
                  onClick={() => handleGenerate(activeType)}
                  disabled={generating === activeType.id}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all",
                    activePalette.bg, "text-white disabled:opacity-60",
                  )}
                >
                  {generating === activeType.id
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <Zap className="w-3.5 h-3.5" />}
                  Generate
                </button>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: "Total",      value: String(payTotal),              sub: "records"                       },
                  { label: "Paid",       value: String(paidPayments.length),   sub: `₹${totalCollected.toLocaleString()}`, color: "text-emerald-600" },
                  { label: "Pending",    value: String(pendingPayments.length), sub: `₹${totalPending.toLocaleString()}`,   color: "text-amber-600"   },
                  { label: "Collected",  value: `${pctCollected}%`,            sub: "rate", color: pctCollected >= 80 ? "text-emerald-600" : "text-amber-600" },
                ].map((s) => (
                  <div key={s.label} className="bg-white/60 rounded-xl p-2 text-center">
                    <p className="text-[10px] text-gray-500">{s.label}</p>
                    <p className={cn("text-sm font-bold", s.color ?? "text-gray-900")}>{s.value}</p>
                    <p className="text-[10px] text-gray-400">{s.sub}</p>
                  </div>
                ))}
              </div>
              {(totalCollected + totalPending) > 0 && (
                <div className="mt-3">
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }} animate={{ width: `${pctCollected}%` }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                      className={cn("h-full rounded-full", activePalette.bg)}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-1.5 mb-4 bg-gray-100 p-1 rounded-xl w-fit">
            {(["records", "reports"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-semibold capitalize transition-all",
                  tab === t ? "bg-white shadow-sm text-emerald-700" : "text-gray-500",
                )}
              >
                {t === "records" ? "Payment Records" : "Reports"}
              </button>
            ))}
          </div>

          {/* ── Records tab ── */}
          {tab === "records" && (
            <>
              <div className="flex gap-2 mb-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search student name or adm no…"
                    className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:border-emerald-400"
                  />
                </div>
                <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
                  {(["all", "PAID", "PENDING", "OVERDUE"] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => { setStatusFilter(s); setPaySkip(0); }}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                        statusFilter === s ? "bg-white shadow-sm text-gray-900" : "text-gray-500",
                      )}
                    >
                      {s === "all" ? "All" : STATUS_META[s as FeePaymentStatus].label}
                    </button>
                  ))}
                </div>
              </div>

              {payLoading ? (
                <div className="flex items-center justify-center gap-2 py-10 text-gray-400">
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
                      ) : filtered.map((p) => {
                        const meta = STATUS_META[p.status] ?? STATUS_META.PENDING;
                        const isPaid = p.status === "PAID";
                        return (
                          <div key={p.id}>
                            <div className="flex items-center gap-3 px-4 py-3.5">
                              <div className={cn(
                                "w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0",
                                isPaid ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700",
                              )}>
                                {p.student.name.charAt(0)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-900 truncate">{p.student.name}</p>
                                <p className="text-xs text-gray-400">
                                  {p.student.adno}
                                  {p.student.class ? ` · ${p.student.class.name}` : ""}
                                  {!activeType ? ` · ${p.feeType.name}` : ""}
                                </p>
                              </div>
                              <div className="text-right shrink-0 mr-1">
                                <p className="text-sm font-bold text-gray-900">₹{Number(p.dueAmount).toLocaleString()}</p>
                                {isPaid && p.paidAt
                                  ? <p className="text-[10px] text-emerald-600">{new Date(p.paidAt).toLocaleDateString("en-GB")}</p>
                                  : p.dueDate
                                    ? <p className="text-[10px] text-amber-600">Due: {new Date(p.dueDate).toLocaleDateString("en-GB")}</p>
                                    : null}
                              </div>
                              <span className={cn(
                                "px-2.5 py-1 rounded-full text-[11px] font-semibold shrink-0",
                                meta.bg, meta.color,
                              )}>
                                {isPaid ? "✓ " : ""}{meta.label}
                              </span>
                              {isPaid ? (
                                <button
                                  onClick={() => showReceiptFor(p.id)}
                                  disabled={loadingReceipt === p.id}
                                  className="shrink-0 p-1"
                                >
                                  {loadingReceipt === p.id
                                    ? <Loader2 className="w-4 h-4 text-gray-300 animate-spin" />
                                    : <Receipt className="w-4 h-4 text-gray-300 hover:text-blue-500 transition-colors" />}
                                </button>
                              ) : (
                                <button
                                  onClick={() => { setRecording(p.id); setPayMethod("CASH"); setPayRef(""); }}
                                  className="shrink-0 p-1"
                                  title="Mark paid"
                                >
                                  <CheckCircle className={cn(
                                    "w-5 h-5 transition-colors",
                                    recording === p.id ? "text-emerald-500" : "text-gray-300 hover:text-emerald-500",
                                  )} />
                                </button>
                              )}
                            </div>

                            {/* Inline mark-paid panel */}
                            <AnimatePresence>
                              {recording === p.id && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }} className="overflow-hidden"
                                >
                                  <div className="px-4 pb-3 border-t border-gray-50 pt-2 space-y-2">
                                    <div className="grid grid-cols-2 gap-2">
                                      <select
                                        value={payMethod}
                                        onChange={(e) => setPayMethod(e.target.value)}
                                        className="px-3 py-2 rounded-xl border text-xs bg-white focus:outline-none"
                                      >
                                        {PAYMENT_METHODS.map((m) => (
                                          <option key={m} value={m}>{m.replace(/_/g, " ")}</option>
                                        ))}
                                      </select>
                                      <input
                                        type="text" value={payRef}
                                        onChange={(e) => setPayRef(e.target.value)}
                                        placeholder="Receipt / Ref no."
                                        className="px-3 py-2 rounded-xl border text-xs focus:outline-none focus:border-emerald-400"
                                      />
                                    </div>
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => setRecording(null)}
                                        className="flex-1 py-2 rounded-xl border text-xs font-semibold text-gray-600"
                                      >Cancel</button>
                                      <button
                                        onClick={() => markPaid(p)}
                                        disabled={saving}
                                        className="flex-1 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold disabled:opacity-60 flex items-center justify-center gap-1"
                                      >
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
                      })}
                    </div>

                    <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-xs">
                      <span className="text-gray-500">{paidPayments.length} paid · {pendingPayments.length} pending</span>
                      <div className="flex gap-3">
                        <span className="text-emerald-600 font-bold">₹{totalCollected.toLocaleString()} collected</span>
                        <span className="text-amber-600 font-bold">₹{totalPending.toLocaleString()} pending</span>
                      </div>
                    </div>
                  </div>

                  {payTotal > 30 && (
                    <div className="flex items-center justify-center gap-3 mt-4">
                      <button
                        disabled={paySkip === 0}
                        onClick={() => setPaySkip(Math.max(0, paySkip - 30))}
                        className="px-4 py-2 rounded-xl border text-sm disabled:opacity-40"
                      >Prev</button>
                      <span className="text-sm text-gray-500">
                        {paySkip + 1}–{Math.min(paySkip + 30, payTotal)} of {payTotal}
                      </span>
                      <button
                        disabled={paySkip + 30 >= payTotal}
                        onClick={() => setPaySkip(paySkip + 30)}
                        className="px-4 py-2 rounded-xl border text-sm disabled:opacity-40"
                      >Next</button>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* ── Reports tab ── */}
          {tab === "reports" && (
            <div className="space-y-4">
              {!summary ? (
                <div className="flex items-center justify-center gap-2 py-12 text-gray-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                </div>
              ) : (
                <>
                  {/* Collection bar chart */}
                  {chartData.length > 0 && (
                    <div className="bg-white rounded-2xl border border-gray-100 p-5">
                      <p className="font-bold text-gray-900 text-sm mb-4">Collection by Fee Type</p>
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={chartData} barSize={24}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                          <YAxis tick={{ fontSize: 10 }} />
                          <Tooltip formatter={(v: number) => `₹${v.toLocaleString()}`} />
                          <Bar dataKey="paid" name="Collected" fill="#059669" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="due"  name="Due"       fill="#e5e7eb" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* Status breakdown */}
                  <div className="bg-white rounded-2xl border border-gray-100 p-5">
                    <p className="font-bold text-gray-900 text-sm mb-4">By Status</p>
                    <div className="space-y-2">
                      {summary.byStatus.map((s) => {
                        const meta = STATUS_META[s.status as FeePaymentStatus] ?? STATUS_META.PENDING;
                        const due  = Number(s._sum.dueAmount ?? 0);
                        const paid = Number(s._sum.paidAmount ?? 0);
                        return (
                          <div key={s.status} className="flex items-center gap-3">
                            <span className={cn("text-xs font-bold px-2.5 py-1 rounded-lg w-20 text-center shrink-0", meta.bg, meta.color)}>
                              {meta.label}
                            </span>
                            <div className="flex-1">
                              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className={cn("h-full rounded-full", s.status === "PAID" ? "bg-emerald-500" : s.status === "OVERDUE" ? "bg-red-400" : "bg-amber-400")}
                                  style={{ width: `${due > 0 ? Math.min(100, (paid / due) * 100) : 0}%` }}
                                />
                              </div>
                            </div>
                            <span className="text-xs font-bold text-gray-700 w-10 text-right shrink-0">{s._count.id}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Per fee type table */}
                  <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-bold text-gray-900">All Fee Types</p>
                    </div>
                    <div className="divide-y divide-gray-50">
                      {feeTypes.map((ft, i) => {
                        const pal = PALETTE[i % PALETTE.length];
                        return (
                          <div key={ft.id} className="flex items-center gap-3 px-4 py-3">
                            <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center shrink-0", pal.bg)}>
                              <CreditCard className="w-3.5 h-3.5 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-900 truncate">{ft.name}</p>
                              <p className="text-xs text-gray-400 capitalize">
                                {ft.kind.toLowerCase()}{ft.frequency ? ` · ${ft.frequency}` : ""}
                                {ft.targetClassIds.length > 0
                                  ? ` · ${ft.targetClassIds.length} class(es)`
                                  : " · all classes"}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-sm font-bold text-gray-900">₹{Number(ft.amount).toLocaleString()}</p>
                              <p className="text-[10px] text-gray-400">{ft._count?.payments ?? 0} records</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}

      {/* ── Create fee type modal ── */}
      <AnimatePresence>
        {showCreate && (
          <>
            <motion.div
              key="bd" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
              onClick={() => setShowCreate(false)}
            />
            <motion.div
              key="modal" initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
            >
              <div className="bg-white rounded-2xl sm:rounded-3xl w-full max-w-md shadow-xl max-h-[90dvh] overflow-y-auto">
                <div className="flex items-center justify-between px-5 py-4 border-b">
                  <p className="font-bold text-gray-900">New Fee Type</p>
                  <button onClick={() => setShowCreate(false)}>
                    <X className="w-5 h-5 text-gray-400" />
                  </button>
                </div>
                <div className="px-5 py-4 space-y-4">
                  {createError && (
                    <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-xl">{createError}</div>
                  )}
                  <div>
                    <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Name *</label>
                    <input
                      type="text" value={newFee.name ?? ""} placeholder="e.g. Monthly Fee, SKSBV Fund"
                      onChange={(e) => setNewFee((n) => ({ ...n, name: e.target.value }))}
                      className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-gray-50 focus:outline-none focus:border-emerald-400 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Amount (₹) *</label>
                    <input
                      type="number" value={newFee.amount ?? ""} placeholder="500"
                      onChange={(e) => setNewFee((n) => ({ ...n, amount: Number(e.target.value) }))}
                      className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-gray-50 focus:outline-none focus:border-emerald-400 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Description (optional)</label>
                    <input
                      type="text" value={newFee.description ?? ""} placeholder="Details…"
                      onChange={(e) => setNewFee((n) => ({ ...n, description: e.target.value }))}
                      className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-gray-50 focus:outline-none focus:border-emerald-400 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Type</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(["ONE_TIME", "RECURRING"] as const).map((k) => (
                        <label
                          key={k}
                          className={cn(
                            "flex items-center justify-center gap-2 py-3 rounded-2xl border text-sm font-semibold cursor-pointer transition-all",
                            newFee.kind === k ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-gray-200 bg-gray-50 text-gray-700",
                          )}
                        >
                          <input type="radio" className="sr-only" checked={newFee.kind === k} onChange={() => setNewFee((n) => ({ ...n, kind: k }))} />
                          {k === "ONE_TIME" ? "One Time" : "Recurring"}
                        </label>
                      ))}
                    </div>
                  </div>
                  {newFee.kind === "RECURRING" && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Frequency</label>
                        <select
                          value={newFee.frequency ?? "monthly"}
                          onChange={(e) => setNewFee((n) => ({ ...n, frequency: e.target.value }))}
                          className="w-full px-3 py-3 rounded-2xl border border-gray-200 bg-gray-50 text-sm"
                        >
                          {["monthly", "quarterly", "yearly"].map((f) => <option key={f} value={f}>{f}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Due Day</label>
                        <input
                          type="number" min={1} max={31} placeholder="5"
                          value={newFee.dueDay ?? ""}
                          onChange={(e) => setNewFee((n) => ({ ...n, dueDay: Number(e.target.value) }))}
                          className="w-full px-3 py-3 rounded-2xl border border-gray-200 bg-gray-50 text-sm focus:outline-none"
                        />
                      </div>
                    </div>
                  )}
                  {classes.length > 0 && (
                    <div>
                      <label className="text-xs font-semibold text-gray-600 mb-1.5 block">
                        Target Classes (leave empty = all classes)
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {classes.map((c) => {
                          const selected = (newFee.targetClassIds ?? []).includes(c.id);
                          return (
                            <button
                              key={c.id} type="button"
                              onClick={() => setNewFee((n) => ({
                                ...n,
                                targetClassIds: selected
                                  ? (n.targetClassIds ?? []).filter((id) => id !== c.id)
                                  : [...(n.targetClassIds ?? []), c.id],
                              }))}
                              className={cn(
                                "px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all",
                                selected ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-gray-200 text-gray-600",
                              )}
                            >
                              {c.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
                <div className="px-5 pb-5">
                  <button
                    onClick={handleCreate}
                    disabled={creating || !newFee.name || !newFee.amount}
                    className="w-full bg-emerald-600 text-white font-bold py-4 rounded-2xl disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    Create Fee Type
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {receipt && <ReceiptModal receipt={receipt} onClose={() => setReceipt(null)} />}
    </DashboardLayout>
  );
}
