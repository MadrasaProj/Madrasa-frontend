import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  getFeeTypes, getPayments, updatePayment, getPaymentReceipt, createFeeType,
  type FeeType, type FeePayment, type ReceiptData, type FeePaymentStatus,
} from "@/lib/fees-api";
import { getAllClasses, type ClassRecord } from "@/lib/classes-api";
import { useAuthStore } from "@/store/auth";
import { cn } from "@/lib/utils";
import {
  IndianRupee, Plus, Search, Download, Receipt, CheckCircle,
  Loader2, X, Printer, RefreshCw, AlertCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

const PALETTE = [
  { bg: "bg-blue-600",   text: "text-blue-700",   light: "bg-blue-50",   border: "border-blue-200" },
  { bg: "bg-purple-600", text: "text-purple-700",  light: "bg-purple-50", border: "border-purple-200" },
  { bg: "bg-teal-600",   text: "text-teal-700",    light: "bg-teal-50",   border: "border-teal-200" },
  { bg: "bg-rose-600",   text: "text-rose-700",    light: "bg-rose-50",   border: "border-rose-200" },
  { bg: "bg-orange-500", text: "text-orange-700",  light: "bg-orange-50", border: "border-orange-200" },
  { bg: "bg-amber-500",  text: "text-amber-700",   light: "bg-amber-50",  border: "border-amber-200" },
  { bg: "bg-indigo-600", text: "text-indigo-700",  light: "bg-indigo-50", border: "border-indigo-200" },
  { bg: "bg-emerald-600",text: "text-emerald-700", light: "bg-emerald-50",border: "border-emerald-200"},
];

const PAYMENT_METHODS = ["CASH", "BANK_TRANSFER", "UPI", "CHEQUE", "OTHER"] as const;

function ReceiptModal({ receipt, onClose }: { receipt: ReceiptData; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
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
          {[
            ["Receipt No", receipt.reference ?? receipt.id.slice(0, 8).toUpperCase()],
            ["Student",    receipt.student.name],
            ["Adm No",     receipt.student.adno],
            ["Class",      receipt.student.class?.name ?? "—"],
            ["Fee Type",   receipt.feeType.name],
            ["Paid On",    receipt.paidAt ? new Date(receipt.paidAt).toLocaleDateString("en-GB") : "—"],
            ["Method",     receipt.method ?? "—"],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between items-start gap-4">
              <p className="text-xs text-gray-400 shrink-0">{label}</p>
              <p className="text-xs font-semibold text-gray-900 text-right">{value}</p>
            </div>
          ))}
          <div className="border-t border-dashed border-gray-200 my-1 pt-1 flex justify-between items-center">
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

export default function OtherPaymentsPage() {
  const { user, accessToken, activeClientId } = useAuthStore();
  const cid   = activeClientId ?? "";
  const token = accessToken ?? "";

  // Fee types (campaigns)
  const [feeTypes, setFeeTypes]         = useState<FeeType[]>([]);
  const [activeId, setActiveId]         = useState<string | null>(null);
  const [typesLoading, setTypesLoading] = useState(true);

  // Payments for active fee type
  const [payments, setPayments]   = useState<FeePayment[]>([]);
  const [payTotal, setPayTotal]   = useState(0);
  const [payLoading, setPayLoading] = useState(false);
  const [paySkip, setPaySkip]     = useState(0);
  const [search, setSearch]       = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Inline mark-paid
  const [recording, setRecording] = useState<string | null>(null);
  const [method, setMethod]       = useState("CASH");
  const [reference, setReference] = useState("");
  const [saving, setSaving]       = useState(false);

  // Receipt
  const [receipt, setReceipt]           = useState<ReceiptData | null>(null);
  const [loadingReceipt, setLoadingReceipt] = useState<string | null>(null);

  // Add campaign modal
  const [showAdd, setShowAdd]     = useState(false);
  const [newName, setNewName]     = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newDueDay, setNewDueDay] = useState("");
  const [newDesc, setNewDesc]     = useState("");
  const [creating, setCreating]   = useState(false);

  // Classes for dropdown
  const [classes, setClasses]     = useState<ClassRecord[]>([]);

  // Tab
  const [activeTab, setActiveTab] = useState<"records" | "overview">("records");

  // Load fee types
  const loadTypes = useCallback(async () => {
    if (!cid || !token) return;
    setTypesLoading(true);
    try {
      const data = await getFeeTypes(cid, token);
      setFeeTypes(data);
      if (data.length > 0 && !activeId) setActiveId(data[0].id);
    } catch { /* silent */ }
    finally { setTypesLoading(false); }
  }, [cid, token]);

  useEffect(() => {
    if (!cid || !token) return;
    loadTypes();
    getAllClasses(cid, token).then(setClasses).catch(() => {});
  }, [cid, token, loadTypes]);

  // Load payments when fee type or filters change
  const loadPayments = useCallback(async () => {
    if (!cid || !token || !activeId) return;
    setPayLoading(true);
    try {
      const res = await getPayments(cid, token, {
        feeTypeId: activeId,
        status: statusFilter !== "all" ? (statusFilter as FeePaymentStatus) : undefined,
        skip: paySkip,
        take: 30,
      });
      setPayments(res.payments);
      setPayTotal(res.total);
    } catch { /* silent */ }
    finally { setPayLoading(false); }
  }, [cid, token, activeId, statusFilter, paySkip]);

  useEffect(() => { loadPayments(); }, [loadPayments]);

  // Stats for active fee type
  const active    = feeTypes.find((f) => f.id === activeId);
  const activePalette = active
    ? PALETTE[feeTypes.indexOf(active) % PALETTE.length]
    : PALETTE[0];

  const paidPayments    = payments.filter((p) => p.status === "PAID");
  const pendingPayments = payments.filter((p) => p.status !== "PAID");
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

  const chartData = feeTypes.map((ft, i) => ({
    name: ft.name.replace(" Fees","").replace(" Charity","").replace(" Fund",""),
    fill: PALETTE[i % PALETTE.length].bg.replace("bg-",""),
    count: ft._count?.payments ?? 0,
  }));

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
      loadPayments();
    } catch (e) { alert((e as Error).message); }
    finally { setSaving(false); }
  };

  const showReceiptFor = async (id: string) => {
    setLoadingReceipt(id);
    try { setReceipt(await getPaymentReceipt(cid, token, id)); }
    catch (e) { alert((e as Error).message); }
    finally { setLoadingReceipt(null); }
  };

  const handleCreate = async () => {
    if (!newName || !newAmount) return;
    setCreating(true);
    try {
      await createFeeType(cid, token, {
        name: newName,
        amount: Number(newAmount),
        kind: "ONE_TIME",
        description: newDesc || undefined,
        dueDay: newDueDay ? Number(newDueDay) : undefined,
      });
      setShowAdd(false);
      setNewName(""); setNewAmount(""); setNewDueDay(""); setNewDesc("");
      loadTypes();
    } catch (e) { alert((e as Error).message); }
    finally { setCreating(false); }
  };

  return (
    <DashboardLayout>
      <PageHeader
        title="Other Payments"
        subtitle="Fee campaigns & collections"
        icon={IndianRupee}
        action={
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold"
          >
            <Plus className="w-4 h-4" /> New Campaign
          </button>
        }
      />

      {typesLoading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      ) : feeTypes.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">
          No payment campaigns yet. Create one to get started.
        </div>
      ) : (
        <>
          {/* Category mini cards */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
            {feeTypes.map((ft, i) => {
              const pal = PALETTE[i % PALETTE.length];
              const isActive = ft.id === activeId;
              const count = ft._count?.payments ?? 0;
              return (
                <button
                  key={ft.id}
                  onClick={() => { setActiveId(ft.id); setPaySkip(0); setStatusFilter("all"); setSearch(""); }}
                  className={cn(
                    "text-left p-4 rounded-2xl border-2 transition-all",
                    isActive ? `${pal.light} ${pal.border}` : "bg-white border-gray-100 hover:border-gray-200",
                  )}
                >
                  <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center mb-2", pal.bg)}>
                    <IndianRupee className="w-4 h-4 text-white" />
                  </div>
                  <p className={cn("text-xs font-bold truncate mb-1", isActive ? pal.text : "text-gray-700")}>
                    {ft.name}
                  </p>
                  <p className="text-base font-bold text-gray-900">
                    ₹{Number(ft.amount).toLocaleString()}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{count} payment{count !== 1 ? "s" : ""}</p>
                </button>
              );
            })}
          </div>

          {/* Active category header */}
          {active && (
            <div className={cn("rounded-2xl p-5 mb-5 border-2", activePalette.light, activePalette.border)}>
              <div className="flex items-start gap-4">
                <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shrink-0", activePalette.bg)}>
                  <IndianRupee className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <p className={cn("font-bold text-lg", activePalette.text)}>{active.name}</p>
                  {active.description && (
                    <p className="text-sm text-gray-600 mt-0.5">{active.description}</p>
                  )}
                  <p className={cn("text-xs font-semibold mt-1", activePalette.text)}>
                    ₹{Number(active.amount).toLocaleString()} · {active.kind.toLowerCase()}
                    {active.frequency ? ` · ${active.frequency}` : ""}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2 mt-4">
                {[
                  { label: "Total",      value: String(payTotal),          sub: "records" },
                  { label: "Paid",       value: String(paidPayments.length),   sub: `₹${totalCollected.toLocaleString()}`, color: "text-emerald-600" },
                  { label: "Pending",    value: String(pendingPayments.length), sub: `₹${totalPending.toLocaleString()}`,  color: "text-amber-600" },
                  { label: "Collection", value: `${pctCollected}%`,        sub: "rate", color: pctCollected >= 80 ? "text-emerald-600" : "text-amber-600" },
                ].map((s) => (
                  <div key={s.label} className="bg-white/60 rounded-xl p-2.5 text-center">
                    <p className="text-[10px] text-gray-500">{s.label}</p>
                    <p className={cn("text-base font-bold", s.color ?? "text-gray-900")}>{s.value}</p>
                    <p className="text-[10px] text-gray-400">{s.sub}</p>
                  </div>
                ))}
              </div>

              {(totalCollected + totalPending) > 0 && (
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>₹{totalCollected.toLocaleString()} collected</span>
                    <span>₹{(totalCollected + totalPending).toLocaleString()} total</span>
                  </div>
                  <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }} animate={{ width: `${pctCollected}%` }}
                      transition={{ duration: 0.6, ease: "easeOut" }}
                      className={cn("h-full rounded-full", activePalette.bg)}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-2 mb-4 bg-gray-100 p-1 rounded-xl w-fit">
            {(["records", "overview"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-semibold capitalize transition-all",
                  activeTab === tab ? "bg-white shadow-sm text-emerald-700" : "text-gray-500",
                )}
              >
                {tab === "records" ? "Student Records" : "Overview"}
              </button>
            ))}
          </div>

          {/* Overview */}
          {activeTab === "overview" && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <p className="font-bold text-gray-900 mb-4 text-sm">All Campaigns Overview</p>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} barSize={28}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="count" name="Payments" fill="#059669" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-4 divide-y divide-gray-50">
                {feeTypes.map((ft, i) => {
                  const pal = PALETTE[i % PALETTE.length];
                  const count = ft._count?.payments ?? 0;
                  return (
                    <div key={ft.id} className="py-3 flex items-center gap-3">
                      <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0", pal.bg)}>
                        <IndianRupee className="w-3.5 h-3.5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{ft.name}</p>
                        <p className="text-xs text-gray-400">{ft.kind.toLowerCase()} · {count} payments</p>
                      </div>
                      <p className="text-sm font-bold text-gray-900 shrink-0">₹{Number(ft.amount).toLocaleString()}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Records */}
          {activeTab === "records" && (
            <>
              <div className="flex gap-2 mb-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search student name or adm no..."
                    className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none"
                  />
                </div>
                <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
                  {(["all", "PAID", "PENDING"] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => { setStatusFilter(s); setPaySkip(0); }}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                        statusFilter === s ? "bg-white shadow-sm text-gray-900" : "text-gray-500",
                      )}
                    >
                      {s === "all" ? "All" : s === "PAID" ? "Paid" : "Pending"}
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
                    <div className={cn("px-4 py-3 flex items-center justify-between", activePalette.light)}>
                      <p className={cn("font-semibold text-sm", activePalette.text)}>
                        {active?.name} — {filtered.length} shown
                      </p>
                      <button className="text-xs font-semibold text-gray-500 flex items-center gap-1">
                        <Download className="w-3.5 h-3.5" /> Export
                      </button>
                    </div>

                    <div className="divide-y divide-gray-50">
                      {filtered.length === 0 ? (
                        <div className="py-12 text-center text-gray-400 text-sm">No records found</div>
                      ) : filtered.map((p) => {
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
                                  {p.student.adno}{p.student.class ? ` · ${p.student.class.name}` : ""}
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
                                isPaid ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700",
                              )}>
                                {isPaid ? "✓ Paid" : "Pending"}
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
                                  onClick={() => { setRecording(p.id); setMethod("CASH"); setReference(""); }}
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

                            {/* Inline record panel */}
                            <AnimatePresence>
                              {recording === p.id && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }} className="overflow-hidden"
                                >
                                  <div className="px-4 pb-3 border-t border-gray-50 pt-2 space-y-2">
                                    <div className="grid grid-cols-2 gap-2">
                                      <select
                                        value={method}
                                        onChange={(e) => setMethod(e.target.value)}
                                        className="px-3 py-2 rounded-xl border text-xs bg-white focus:outline-none"
                                      >
                                        {PAYMENT_METHODS.map((m) => (
                                          <option key={m} value={m}>{m.replace("_", " ")}</option>
                                        ))}
                                      </select>
                                      <input
                                        type="text"
                                        value={reference}
                                        onChange={(e) => setReference(e.target.value)}
                                        placeholder="Receipt / Ref no."
                                        className="px-3 py-2 rounded-xl border text-xs focus:outline-none focus:border-emerald-400"
                                      />
                                    </div>
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => setRecording(null)}
                                        className="flex-1 py-2 rounded-xl border text-xs font-semibold text-gray-600"
                                      >
                                        Cancel
                                      </button>
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
                      <div className="flex gap-4">
                        <span className="text-emerald-600 font-bold">Collected: ₹{totalCollected.toLocaleString()}</span>
                        <span className="text-amber-600 font-bold">Pending: ₹{totalPending.toLocaleString()}</span>
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
                      <span className="text-sm text-gray-500">{paySkip + 1}–{Math.min(paySkip + 30, payTotal)} of {payTotal}</span>
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
        </>
      )}

      {/* Add campaign modal */}
      <AnimatePresence>
        {showAdd && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 z-40 backdrop-blur-sm"
              onClick={() => setShowAdd(false)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 bg-emerald-100 rounded-xl flex items-center justify-center">
                      <Plus className="w-5 h-5 text-emerald-600" />
                    </div>
                    <p className="font-bold text-gray-900 text-lg">New Payment Campaign</p>
                  </div>
                  <button onClick={() => setShowAdd(false)}><X className="w-5 h-5 text-gray-400" /></button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Campaign Title *</label>
                    <input
                      value={newName} onChange={(e) => setNewName(e.target.value)}
                      placeholder="e.g. SKSBV Fund, Building Fund"
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">Amount (₹) *</label>
                      <input
                        type="number" value={newAmount} onChange={(e) => setNewAmount(e.target.value)}
                        placeholder="200"
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">Due Day (optional)</label>
                      <input
                        type="number" value={newDueDay} onChange={(e) => setNewDueDay(e.target.value)}
                        placeholder="e.g. 31"
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Description (optional)</label>
                    <input
                      value={newDesc} onChange={(e) => setNewDesc(e.target.value)}
                      placeholder="Details about this fee campaign..."
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setShowAdd(false)}
                    className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreate}
                    disabled={!newName || !newAmount || creating}
                    className="flex-1 py-3 bg-emerald-600 text-white rounded-xl text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Create Campaign
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
