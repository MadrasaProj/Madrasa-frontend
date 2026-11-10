import { SkeletonList } from "@/components/ui/Skeleton";
import { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { useTenantPath } from "@/hooks/useTenantPath";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { ApiErrorBanner } from "@/components/ui/ApiErrorBanner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DrawerSelector } from "@/components/DrawerSelector";
import { DatePickerDrawer } from "@/components/DatePickerDrawer";
import { ResponsivePopover } from "@/components/ui/responsivePopover";
import {
  getFeeTypes,
  getPayments,
  recordPayment,
  updatePayment,
  getPaymentReceipt,
  getFeeSummary,
  cancelPayment as cancelPaymentApi,
  undoCancelPayment as undoCancelPaymentApi,
  getTransactions,
  createFeeTransaction,
  deleteFeeTransaction,
  getTransactionSummary,
  type FeeType,
  type FeePayment,
  type ReceiptData,
  type FeePaymentStatus,
  type FeeTransaction,
  type TransactionSummary,
  type FeeSummaryResponse,
} from "@/lib/fees-api";
import { useAuthStore } from "@/store/auth";
import { useClasses, useTeachers, useUsers } from "@/lib/queries";
import { cn } from "@/lib/utils";
import {
  CreditCard,
  Loader2,
  Receipt,
  CheckCircle,
  RefreshCw,
  Printer,
  Search,
  XCircle,
  Users,
  Zap,
  Pencil,
  Save,
  ChevronRight,
  IndianRupee,
  Clock3,
  CalendarDays,
  ArrowRightLeft,
  Trash2,
  Plus,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const STATUS_META: Record<
  FeePaymentStatus,
  { label: string; color: string; bg: string }
> = {
  PENDING: { label: "Pending", color: "text-amber-700", bg: "bg-amber-50" },
  PAID: { label: "Paid", color: "text-primary-700", bg: "bg-primary-50" },
  PARTIAL: { label: "Partial", color: "text-blue-700", bg: "bg-blue-50" },
  OVERDUE: { label: "Overdue", color: "text-red-700", bg: "bg-red-50" },
  WAIVED: { label: "Waived", color: "text-gray-500", bg: "bg-gray-100" },
};

const PAYMENT_METHODS = [
  "CASH",
  "BANK_TRANSFER",
  "UPI",
  "CHEQUE",
  "OTHER",
] as const;

const formatCurrency = (value: number) => `₹${value.toLocaleString("en-IN")}`;

function FeeTypeProgress({ collected, total }: { collected: number; total: number }) {
  const percentage = total > 0 ? Math.min(100, Math.max(0, collected / total * 100)) : 0;
  return (
    <svg viewBox="0 0 36 36" className="size-9 shrink-0 -rotate-90" role="img" aria-label={`${Math.round(percentage)}% collected`}>
      <circle cx="18" cy="18" r="14" fill="none" stroke="#e5e7eb" strokeWidth="4" />
      <circle cx="18" cy="18" r="14" fill="none" stroke="#059669" strokeWidth="4" strokeLinecap="round" pathLength="100" strokeDasharray={`${percentage} 100`} />
    </svg>
  );
}

function FeeStats({ collected, pending }: { collected: number; pending: number }) {
  const stats = [
    { label: "Collected", value: collected, icon: IndianRupee, color: "text-primary-700" },
    { label: "To collect", value: pending, icon: Clock3, color: "text-amber-700" },
  ];
  return (
    <section className="mb-5 grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-gray-100 bg-gradient-to-br from-white to-sky-50">
      {stats.map(({ label, value, icon: Icon, color }) => (
        <div key={label} className="min-w-0 bg-white/85 p-2.5 sm:p-3">
          <div className="flex items-center gap-1.5 text-xs font-medium text-gray-600 sm:text-sm">
            <Icon aria-hidden="true" className={cn("size-4 shrink-0", color)} />
            <span>{label}</span>
          </div>
          <p className="mt-1.5 truncate text-lg font-bold tabular-nums text-gray-950 sm:text-2xl" title={formatCurrency(value)}>{formatCurrency(value)}</p>
        </div>
      ))}
    </section>
  );
}

function ReceiptModal({ receipt, onClose }: { receipt: ReceiptData; onClose: () => void }) {
  return (
    <ResponsivePopover open onOpenChange={(open) => { if (!open) onClose(); }} title="Fee receipt" description={receipt.client.name}>
      <div className="space-y-5 px-4 pb-6 pt-2 sm:px-6">
        <dl className="divide-y divide-gray-100 overflow-hidden rounded-2xl bg-white text-sm">
          {[
            ["Receipt no", receipt.reference ?? receipt.id.slice(0, 8).toUpperCase()],
            ["Student", receipt.student.name],
            ["Admission no", receipt.student.adno],
            ["Class", receipt.student.class?.name ?? "—"],
            ["Fee type", receipt.feeType.name],
            ["Paid on", receipt.paidAt ? new Date(receipt.paidAt).toLocaleDateString("en-GB") : "—"],
            ["Method", receipt.method ?? "—"],
            ["Amount paid", formatCurrency(Number(receipt.paidAmount ?? 0))],
          ].map(([label, value]) => (
            <div key={label} className="flex items-center justify-between gap-3 px-4 py-4">
              <dt className="text-gray-500">{label}</dt>
              <dd className="text-right font-semibold text-gray-950">{value}</dd>
            </div>
          ))}
        </dl>
        <Button type="button" onClick={() => window.print()}><Printer className="size-4" /> Print receipt</Button>
      </div>
    </ResponsivePopover>
  );
}

function RecordPaymentModal({
  payment, method, reference, amount, saving,
  onMethodChange, onReferenceChange, onAmountChange, onConfirm, onClose,
}: {
  payment: FeePayment;
  method: string;
  reference: string;
  amount: string;
  saving: boolean;
  onMethodChange: (value: string) => void;
  onReferenceChange: (value: string) => void;
  onAmountChange: (value: string) => void;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <ResponsivePopover open onOpenChange={(open) => { if (!open) onClose(); }} title="Mark payment" description={payment.student.name}>
      <div className="space-y-4 px-4 pb-6 pt-2 sm:px-6">
        <div className="flex items-center justify-between gap-3 rounded-xl bg-primary-50 px-4 py-3 text-sm">
          <span className="min-w-0 truncate text-primary-700">{payment.feeType.name}</span>
          <strong className="shrink-0 tabular-nums text-primary-700">{payment.feeType.isDonation ? "Variable" : formatCurrency(Number(payment.dueAmount))}</strong>
        </div>
        {payment.feeType.isDonation && (
          <div className="space-y-1.5">
            <label htmlFor="donation-amount" className="text-sm font-medium text-gray-700">Donation amount</label>
            <Input id="donation-amount" type="number" min="0.01" step="0.01" value={amount} onChange={(event) => onAmountChange(event.target.value)} placeholder="Amount received" autoFocus />
          </div>
        )}
        <DrawerSelector title="Payment method" value={method} options={PAYMENT_METHODS.map((item) => ({ value: item, label: item.replace(/_/g, " ") }))} onChange={onMethodChange} />
        <Input value={reference} onChange={(event) => onReferenceChange(event.target.value)} placeholder="Receipt / reference no. (optional)" aria-label="Receipt or reference number" />
        <div className="flex gap-2">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button type="button" className="flex-1" disabled={saving} onClick={onConfirm}><CheckCircle className="size-4" /> Mark paid</Button>
        </div>
      </div>
    </ResponsivePopover>
  );
}

export default function AdminFeesPage() {
  const tenantPath = useTenantPath();
  const { user, accessToken, activeClientId } = useAuthStore();
  const cid = activeClientId ?? "";
  const token = accessToken ?? "";

  const [feeTypes, setFeeTypes] = useState<FeeType[]>([]);
  const [activeTypeId, setActiveTypeId] = useState<string | null>(null); // null = all
  const [typesLoading, setTypesLoading] = useState(true);

  const [payments, setPayments] = useState<FeePayment[]>([]);
  const [payTotal, setPayTotal] = useState(0);
  const [payLoading, setPayLoading] = useState(false);
  const [paySkip, setPaySkip] = useState(0);
  const [payTake, setPayTake] = useState(30);
  const [search, setSearch] = useState("");
  const [filterClass, setFilterClass] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);


  const [tab, setTab] = useState<"records" | "reports" | "transactions">(
    "records",
  );

  // Inline mark-paid state
  const [recording, setRecording] = useState<string | null>(null);
  const [payMethod, setPayMethod] = useState("CASH");
  const [payRef, setPayRef] = useState("");
  const [donationAmount, setDonationAmount] = useState("");
  const [saving, setSaving] = useState(false);

  // Cancel state
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [cancellingNote, setCancellingNote] = useState("");
  const [cancellingSave, setCancellingSave] = useState(false);

  // Receipt
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [loadingReceipt, setLoadingReceipt] = useState<string | null>(null);

  // Overwrite amount / discount state
  const [editingAmount, setEditingAmount] = useState<string | null>(null);
  const [customAmount, setCustomAmount] = useState("");



  // Transactions tab state
  const [transactions, setTransactions] = useState<FeeTransaction[]>([]);
  const [txTotal, setTxTotal] = useState(0);
  const [txLoading, setTxLoading] = useState(false);
  const [txSkip, setTxSkip] = useState(0);
  const [txTake, setTxTake] = useState(30);
  const [txSummary, setTxSummary] = useState<TransactionSummary | null>(null);
  const [txSummaryLoading, setTxSummaryLoading] = useState(false);
  const [txStudentTotals, setTxStudentTotals] = useState<{
    totalDue: number;
    totalCollected: number;
    totalPending: number;
  } | null>(null);
  const [txTeacherId, setTxTeacherId] = useState<string>("");
  const [txFromDate, setTxFromDate] = useState<string>("");
  const [txToDate, setTxToDate] = useState<string>("");
  const [dateDrawer, setDateDrawer] = useState<"from" | "to" | null>(null);

  // Transaction create modal state
  const [txCreating, setTxCreating] = useState(false);
  const [txSaving, setTxSaving] = useState(false);
  const [txFormDateOpen, setTxFormDateOpen] = useState(false);
  const [txForm, setTxForm] = useState({
    amount: "",
    feeTypeId: "",
    date: new Date().toISOString().split("T")[0],
    teacherId: "",
  });
  const [txFormError, setTxFormError] = useState<string | null>(null);

  // Transaction delete state
  const [deletingTx, setDeletingTx] = useState<string | null>(null);
  const [deletingTxSave, setDeletingTxSave] = useState(false);

  // Error
  const [error, setError] = useState<string | null>(null);

  // Load fee types
  const loadTypes = useCallback(async () => {
    if (!cid || !token) return;
    setTypesLoading(true);
    setError(null);
    try {
      const data = await getFeeTypes(
        cid,
        token,
        user?.defaultAcademicYearId ?? undefined,
      );
      setFeeTypes(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setTypesLoading(false);
    }
  }, [cid, token, user?.defaultAcademicYearId]);

  // Load classes using cached query hook
  const { data: classesData } = useClasses({ clientId: cid, token });
  const classes = classesData ?? [];

  // Load teachers using cached query hook
  const { data: teachersData } = useTeachers({ clientId: cid, token });

  // Load users using cached query hook
  const { data: usersData } = useUsers({ clientId: cid, token });

  const { teachers, teachersOnly } = useMemo<{ teachers: Record<string, string>; teachersOnly: Record<string, string> }>(() => {
    const map: Record<string, string> = {};
    const teacherOnlyMap: Record<string, string> = {};
    
    for (const t of teachersData?.data ?? []) {
      map[t.id] = t.name;
      teacherOnlyMap[t.id] = t.name;
    }
    
    for (const u of usersData?.data ?? []) {
      map[u.id] = u.name;
    }
    
    return { teachers: map, teachersOnly: teacherOnlyMap };
  }, [teachersData, usersData]);

  useEffect(() => {
    if (!cid || !token) return;
    loadTypes();
  }, [cid, token, loadTypes]);

  // Load payments
  const loadPayments = useCallback(async () => {
    if (!cid || !token) return;
    setPayLoading(true);
    try {
      const res = await getPayments(cid, token, {
        feeTypeId: activeTypeId ?? undefined,
        classId: filterClass || undefined,
        status:
          statusFilter !== "all"
            ? (statusFilter as FeePaymentStatus)
            : undefined,
        skip: paySkip,
        take: payTake,
      });
      setPayments(res.payments);
      setPayTotal(res.total);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPayLoading(false);
    }
  }, [cid, token, activeTypeId, filterClass, statusFilter, paySkip, payTake]);

  useEffect(() => {
    if (tab === "records") loadPayments();
  }, [tab, loadPayments]);

  // Stats / Report
  const [summary, setSummary] = useState<FeeSummaryResponse | null>(null);
  const reportFeeTypeId = activeTypeId ?? "";
  const [reportClassId, setReportClassId] = useState<string>("");
  const [reportPayments, setReportPayments] = useState<FeePayment[]>([]);
  const [reportPayLoading, setReportPayLoading] = useState(false);

  const loadSummary = useCallback(async () => {
    if (!cid || !token) return;
    try {
      setSummary(await getFeeSummary(cid, token, user?.defaultAcademicYearId ?? undefined));
    } catch (e) {
      setError((e as Error).message);
    }
  }, [cid, token, user?.defaultAcademicYearId]);

  useEffect(() => { loadSummary(); }, [loadSummary]);

  const loadReportData = useCallback(async () => {
    if (!cid || !token) return;
    setReportPayLoading(true);
    try {
      const [summaryData, payRes] = await Promise.all([
        getFeeSummary(cid, token, user?.defaultAcademicYearId ?? undefined),
        getPayments(cid, token, {
          feeTypeId: reportFeeTypeId || undefined,
          classId: reportClassId || undefined,
          academicYearId: user?.defaultAcademicYearId ?? undefined,
          take: 500,
        }),
      ]);
      setSummary(summaryData);
      setReportPayments(payRes.payments);
    } catch {
      /* silent */
    } finally {
      setReportPayLoading(false);
    }
  }, [cid, token, user?.defaultAcademicYearId, reportFeeTypeId, reportClassId]);

  useEffect(() => {
    if (tab === "reports") loadReportData();
  }, [tab, loadReportData]);

  // Transactions tab loader
  const loadTransactions = useCallback(async () => {
    if (!cid || !token) return;
    setTxLoading(true);
    try {
      const res = await getTransactions(cid, token, {
        feeTypeId: activeTypeId ?? undefined,
        teacherId: txTeacherId || undefined,
        fromDate: txFromDate || undefined,
        toDate: txToDate || undefined,
        skip: txSkip,
        take: txTake,
      });
      setTransactions(res.transactions);
      setTxTotal(res.total);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setTxLoading(false);
    }
  }, [cid, token, activeTypeId, txTeacherId, txFromDate, txToDate, txSkip, txTake]);

  const loadTxSummary = useCallback(async () => {
    if (!cid || !token) return;
    setTxSummaryLoading(true);
    try {
      const res = await getTransactionSummary(cid, token);
      setTxSummary(res);
    } catch {
      /* silent */
    } finally {
      setTxSummaryLoading(false);
    }
  }, [cid, token]);

  const loadTxStudentTotals = useCallback(async () => {
    if (!cid || !token) return;
    try {
      const res = await getFeeSummary(cid, token, user?.defaultAcademicYearId ?? undefined);
      if (res?.totals) {
        setTxStudentTotals({
          totalDue: res.totals.studentDue,
          totalCollected: res.totals.studentCollected,
          totalPending: res.totals.studentPending,
        });
      }
    } catch {
      /* silent */
    }
  }, [cid, token, user?.defaultAcademicYearId]);

  useEffect(() => {
    if (tab === "transactions") {
      loadTransactions();
      loadTxSummary();
      loadTxStudentTotals();
    }
  }, [tab, loadTransactions, loadTxSummary, loadTxStudentTotals]);

  const selectType = (id: string | null) => {
    setActiveTypeId(id);
    setPaySkip(0);
    setStatusFilter("all");
    setSearch("");
  };

  const activeType = feeTypes.find((f) => f.id === activeTypeId) ?? null;

  const feeTypeTotals = new Map((summary?.byFeeType ?? []).map((item) => [
    item.feeTypeId as string,
    { collected: Number(item._sum.paidAmount ?? 0), due: Number(item._sum.dueAmount ?? 0) },
  ]));
  const selectedTotals = activeType ? feeTypeTotals.get(activeType.id) : null;
  const collected = activeType
    ? (selectedTotals?.collected ?? 0)
    : Number(summary?.totals.studentCollected ?? 0);
  const pending = activeType
    ? Math.max(0, (selectedTotals?.due ?? 0) - (selectedTotals?.collected ?? 0))
    : Number(summary?.totals.studentPending ?? 0);

  const filtered = search
    ? payments.filter(
        (p) =>
          p.student.name.toLowerCase().includes(search.toLowerCase()) ||
          p.student.adno.includes(search),
      )
    : payments;

  const markPaid = async (p: FeePayment) => {
    setSaving(true);
    try {
      const amount = p.feeType.isDonation ? Number(donationAmount) : Number(p.dueAmount);
      if (!amount || amount <= 0) { setError("Enter a donation amount greater than zero"); return; }
      if (p.virtual) {
        await recordPayment(cid, token, {
          studentId: p.student.id,
          feeTypeId: p.feeType.id,
          dueDate: p.dueDate,
          dueAmount: amount,
          paidAmount: amount,
          method: payMethod as any,
          reference: payRef || undefined,
          status: "PAID",
        });
      } else {
        await updatePayment(cid, token, p.id, {
          paidAmount: amount,
          ...(p.feeType.isDonation ? { dueAmount: amount } : {}),
          method: payMethod as any,
          reference: payRef || undefined,
          status: "PAID",
        });
      }
      setRecording(null);
      setPayRef("");
      loadPayments();
      loadSummary();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const cancelPayment = async (p: FeePayment) => {
    setCancellingSave(true);
    try {
      if (p.virtual) {
        await recordPayment(cid, token, {
          studentId: p.student.id,
          feeTypeId: p.feeType.id,
          dueDate: p.dueDate,
          dueAmount: Number(p.dueAmount),
          paidAmount: 0,
          status: "WAIVED",
          notes: cancellingNote || undefined,
        });
      } else {
        await cancelPaymentApi(cid, token, p.id, cancellingNote || undefined);
      }
      setCancelling(null);
      setCancellingNote("");
      loadPayments();
      loadSummary();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setCancellingSave(false);
    }
  };

  const saveDiscount = async (p: FeePayment) => {
    if (!customAmount || isNaN(Number(customAmount))) return;
    setSaving(true);
    try {
      if (p.virtual) {
        await recordPayment(cid, token, {
          studentId: p.student.id,
          feeTypeId: p.feeType.id,
          dueDate: p.dueDate,
          dueAmount: Number(customAmount),
          paidAmount: 0,
          status: "PENDING",
        });
      } else {
        await updatePayment(cid, token, p.id, {
          dueAmount: Number(customAmount),
        });
      }
      setEditingAmount(null);
      loadPayments();
      loadSummary();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const undoCancel = async (p: FeePayment) => {
    setCancellingSave(true);
    try {
      await undoCancelPaymentApi(cid, token, p.id);
      loadPayments();
      loadSummary();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setCancellingSave(false);
    }
  };

  const showReceiptFor = async (id: string) => {
    setLoadingReceipt(id);
    try {
      setReceipt(await getPaymentReceipt(cid, token, id));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoadingReceipt(null);
    }
  };

  const cancellingPayment = cancelling
    ? (payments.find((p) => p.id === cancelling) ?? null)
    : null;

  const recordingPayment = recording
    ? (payments.find((p) => p.id === recording) ?? null)
    : null;

  const editingPayment = editingAmount
    ? (payments.find((p) => p.id === editingAmount) ?? null)
    : null;
  const selectedPayment = selectedPaymentId
    ? (payments.find((payment) => payment.id === selectedPaymentId) ?? null)
    : null;

  const chartData =
    summary?.byFeeType.map((b) => {
      const ft = feeTypes.find((f) => f.id === b.feeTypeId);
      return {
        name: ft?.name ?? b.feeTypeId.slice(0, 6),
        due: Number(b._sum.dueAmount ?? 0),
        paid: Number(b._sum.paidAmount ?? 0),
        count: b._count.id,
      };
    }) ?? [];

  const deletingTransaction = transactions.find((transaction) => transaction.id === deletingTx) ?? null;

  const saveTransaction = async () => {
    const amount = Number(txForm.amount);
    if (!amount || amount <= 0) return setTxFormError("Enter a valid amount");
    if (!txForm.feeTypeId) return setTxFormError("Select a fee type");
    if (!txForm.teacherId) return setTxFormError("Select a teacher");
    if (!user?.id) return setTxFormError("Unable to identify current admin");
    if (txForm.teacherId === user.id) return setTxFormError("Teacher cannot be the same as the receiving admin");
    setTxSaving(true);
    setTxFormError(null);
    try {
      await createFeeTransaction(cid, token, {
        amount,
        feeTypeId: txForm.feeTypeId,
        date: txForm.date,
        teacherId: txForm.teacherId,
        adminId: user.id,
      });
      setTxCreating(false);
      loadTransactions();
      loadTxSummary();
    } catch (e) {
      setTxFormError((e as Error).message);
    } finally {
      setTxSaving(false);
    }
  };

  const deleteTransaction = async () => {
    if (!deletingTx) return;
    setDeletingTxSave(true);
    try {
      await deleteFeeTransaction(cid, token, deletingTx);
      setDeletingTx(null);
      loadTransactions();
      loadTxSummary();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setDeletingTxSave(false);
    }
  };

  return (
    <DashboardLayout>
      <PageHeader title="Fees & Payments" />

      {error && (
        <ApiErrorBanner
          message={error}
          onRetry={() => {
            loadTypes();
            loadSummary();
            if (tab === "records") loadPayments();
            if (tab === "reports") loadReportData();
            if (tab === "transactions") { loadTransactions(); loadTxSummary(); }
          }}
        />
      )}

      {typesLoading ? (
        <SkeletonList count={3} />
      ) : feeTypes.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <CreditCard className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">
            No fee types yet.{" "}
            <Link to={tenantPath("/admin/fees/types")} className="text-primary-600 underline">
              Manage fee types
            </Link>{" "}
            to start collecting.
          </p>
        </div>
      ) : (
        <>
          <FeeStats collected={collected} pending={pending} />

          <section className="mb-6">
            <div className="mb-2 flex items-center justify-between gap-3 px-1">
              <h2 className="text-sm font-semibold text-gray-700">All fee types</h2>
              <Link to={tenantPath("/admin/fees/types")} className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-primary-500">
                <Zap className="size-4" /> Manage types
              </Link>
            </div>
            <div className="divide-y divide-gray-100 overflow-hidden rounded-2xl bg-white">
              <button
                type="button"
                aria-pressed={activeTypeId === null}
                onClick={() => selectType(null)}
                className={cn(
                  "flex w-full items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary-500",
                  activeTypeId === null && "bg-primary-50/50",
                )}
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-gray-950 sm:text-base">All fees</span>
                  <span className="mt-1 block text-xs text-gray-500">{feeTypes.length} fee types</span>
                </span>
                <span className="text-right text-xs font-semibold tabular-nums sm:text-sm">
                  <span className="block text-primary-700">{formatCurrency(Number(summary?.totals.studentCollected ?? 0))}</span>
                  <span className="block text-gray-500">/ {formatCurrency(Number(summary?.totals.studentDue ?? 0))}</span>
                </span>
                <FeeTypeProgress collected={Number(summary?.totals.studentCollected ?? 0)} total={Number(summary?.totals.studentDue ?? 0)} />
                <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-gray-400" />
              </button>
              {feeTypes.map((feeType) => {
                const totals = feeTypeTotals.get(feeType.id);
                const due = totals?.due ?? 0;
                const collectedForType = totals?.collected ?? 0;
                return (
                  <button
                    key={feeType.id}
                    type="button"
                    aria-pressed={activeTypeId === feeType.id}
                    onClick={() => selectType(feeType.id)}
                    className={cn(
                      "flex w-full items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary-500",
                      activeTypeId === feeType.id && "bg-primary-50/50",
                    )}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-gray-950 sm:text-base">{feeType.name}</span>
                      <span className="mt-1 block text-xs text-gray-500">
                        {feeType.kind === "RECURRING" ? feeType.frequency ?? "Recurring" : "One time"}
                        {" · "}{feeType.isDonation ? "Variable amount" : formatCurrency(Number(feeType.amount))}
                      </span>
                    </span>
                    <span className="text-right text-xs font-semibold tabular-nums sm:text-sm">
                      <span className="block text-primary-700">{formatCurrency(collectedForType)}</span>
                      <span className="block text-gray-500">/ {formatCurrency(due)}</span>
                    </span>
                    <FeeTypeProgress collected={collectedForType} total={due} />
                    <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-gray-400" />
                  </button>
                );
              })}
            </div>
          </section>

          <Tabs value={tab} onValueChange={(value) => setTab(value as typeof tab)} className="mb-4">
            <TabsList className="max-w-full overflow-x-auto shadow-none">
              <TabsTrigger value="records" className="shadow-none!">Payment records</TabsTrigger>
              <TabsTrigger value="transactions" className="shadow-none!">Transactions</TabsTrigger>
              <TabsTrigger value="reports" className="shadow-none!">Reports</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* ── Records tab ── */}
          {tab === "records" && (
            <>
              <div className="flex gap-2 mb-3 flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search student name or adm no…"
                    aria-label="Search student name or admission number"
                    className="w-full pl-9"
                  />
                </div>
                <DrawerSelector
                  title="Class"
                  value={filterClass}
                  options={[{ value: "", label: "All classes" }, ...classes.map((item) => ({ value: item.id, label: item.name }))]}
                  onChange={(value) => {
                    setFilterClass(value);
                    setPaySkip(0);
                  }}
                  className="w-auto min-w-36"
                />
                <Tabs value={statusFilter} onValueChange={(value) => { setStatusFilter(value); setPaySkip(0); }}>
                  <TabsList className="max-w-full overflow-x-auto shadow-none">
                    {(["all", "PAID", "PENDING", "OVERDUE"] as const).map((status) => (
                      <TabsTrigger key={status} value={status} className="text-xs shadow-none!">
                        {status === "all" ? "All" : STATUS_META[status].label}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
              </div>

              <section>
                <h2 className="mb-2 px-1 text-sm font-semibold text-gray-700">Payment records <span className="font-normal text-gray-500">({payTotal})</span></h2>
                <div className="divide-y divide-gray-100 overflow-hidden rounded-2xl bg-white">
                  {payLoading ? <SkeletonList count={4} /> : filtered.length === 0 ? (
                    <p className="px-4 py-10 text-center text-sm text-gray-500">No payment records found</p>
                  ) : filtered.map((payment) => {
                    const meta = STATUS_META[payment.status] ?? STATUS_META.PENDING;
                    return (
                      <button
                        key={payment.id}
                        type="button"
                        aria-haspopup="dialog"
                        onClick={() => setSelectedPaymentId(payment.id)}
                        className="flex w-full items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary-500"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-gray-950 sm:text-base">{payment.student.name}</span>
                          <span className="mt-1 block truncate text-xs text-gray-500">
                            {payment.student.adno}{payment.student.class ? ` · ${payment.student.class.name}` : ""} · {payment.feeType.name}
                          </span>
                        </span>
                        <span className="shrink-0 text-right">
                          <span className="block text-sm font-semibold tabular-nums text-gray-950">{formatCurrency(Number(payment.dueAmount))}</span>
                          <span className={cn("mt-1 inline-block rounded-lg px-2 py-0.5 text-xs font-medium", meta.bg, meta.color)}>{meta.label}</span>
                        </span>
                        <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-gray-400" />
                      </button>
                    );
                  })}
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-gray-500">
                  <span>{payTotal === 0 ? 0 : paySkip + 1}–{Math.min(paySkip + payTake, payTotal)} of {payTotal}</span>
                  <div className="flex items-center gap-2">
                    <DrawerSelector title="Records per page" value={String(payTake)} options={[10, 20, 30, 50, 100].map((size) => ({ value: String(size), label: `${size} per page` }))} onChange={(value) => { setPayTake(Number(value)); setPaySkip(0); }} className="h-9 w-28 text-xs" />
                    <Button type="button" size="xs" variant="outline" disabled={paySkip === 0 || payLoading} onClick={() => setPaySkip(Math.max(0, paySkip - payTake))}>Previous</Button>
                    <Button type="button" size="xs" variant="outline" disabled={paySkip + payTake >= payTotal || payLoading} onClick={() => setPaySkip(paySkip + payTake)}>Next</Button>
                  </div>
                </div>
              </section>

              <ResponsivePopover
                open={selectedPayment !== null}
                onOpenChange={(open) => { if (!open) setSelectedPaymentId(null); }}
                title={selectedPayment?.student.name}
                description={selectedPayment ? `${selectedPayment.student.adno} · ${selectedPayment.feeType.name}` : undefined}
              >
                {selectedPayment && (
                  <div className="space-y-5 px-4 pb-6 pt-2 sm:px-6">
                    <dl className="divide-y divide-gray-100 overflow-hidden rounded-2xl bg-white text-sm">
                      {[
                        ["Class", selectedPayment.student.class?.name ?? "—"],
                        ["Due date", selectedPayment.dueDate ? new Date(selectedPayment.dueDate).toLocaleDateString("en-GB") : "—"],
                        ["Amount due", formatCurrency(Number(selectedPayment.dueAmount))],
                        ["Amount paid", formatCurrency(Number(selectedPayment.paidAmount ?? 0))],
                        ["Status", STATUS_META[selectedPayment.status]?.label ?? selectedPayment.status],
                        ["Collector", selectedPayment.collectedBy ? teachers[selectedPayment.collectedBy] ?? selectedPayment.collectedBy.slice(0, 8) : "—"],
                      ].map(([label, value]) => (
                        <div key={label} className="flex items-center justify-between gap-3 px-4 py-4">
                          <dt className="text-gray-500">{label}</dt><dd className="text-right font-semibold text-gray-900">{value}</dd>
                        </div>
                      ))}
                    </dl>
                    <div className="flex flex-wrap gap-2">
                      {selectedPayment.status === "PAID" ? (
                        <>
                          <Button type="button" variant="outline" disabled={loadingReceipt === selectedPayment.id} onClick={() => { showReceiptFor(selectedPayment.id); setSelectedPaymentId(null); }}><Receipt className="size-4" /> Receipt</Button>
                          <Button type="button" variant="outline" onClick={() => { setCancelling(selectedPayment.id); setCancellingNote(""); setSelectedPaymentId(null); }}><XCircle className="size-4" /> Cancel or refund</Button>
                        </>
                      ) : selectedPayment.status === "WAIVED" ? (
                        <Button type="button" variant="outline" disabled={cancellingSave} onClick={() => { undoCancel(selectedPayment); setSelectedPaymentId(null); }}><RefreshCw className="size-4" /> Undo cancel</Button>
                      ) : (
                        <>
                          <Button type="button" onClick={() => { setRecording(selectedPayment.id); setPayMethod("CASH"); setPayRef(""); setDonationAmount(selectedPayment.feeType.isDonation && Number(selectedPayment.dueAmount) > 0 ? String(selectedPayment.dueAmount) : ""); setSelectedPaymentId(null); }}><CheckCircle className="size-4" /> Mark paid</Button>
                          <Button type="button" variant="outline" onClick={() => { setEditingAmount(selectedPayment.id); setCustomAmount(String(selectedPayment.dueAmount)); setSelectedPaymentId(null); }}><Pencil className="size-4" /> Adjust amount</Button>
                          <Button type="button" variant="outline" onClick={() => { setCancelling(selectedPayment.id); setCancellingNote(""); setSelectedPaymentId(null); }}><XCircle className="size-4" /> Cancel</Button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </ResponsivePopover>

              {/* Mark-paid modal */}
              {recordingPayment && (
                  <RecordPaymentModal
                    payment={recordingPayment}
                    method={payMethod}
                    reference={payRef}
                    amount={donationAmount}
                    saving={saving}
                    onMethodChange={setPayMethod}
                    onReferenceChange={setPayRef}
                    onAmountChange={setDonationAmount}
                    onConfirm={() => markPaid(recordingPayment)}
                    onClose={() => setRecording(null)}
                  />
                )}

              <ResponsivePopover
                open={editingPayment !== null}
                onOpenChange={(open) => { if (!open) setEditingAmount(null); }}
                title={editingPayment ? `Adjust amount · ${editingPayment.student.name}` : "Adjust amount"}
                description={editingPayment?.feeType.name}
              >
                {editingPayment && (
                  <div className="space-y-4 px-4 pb-6 pt-2 sm:px-6">
                    <label className="block text-sm font-medium text-gray-700" htmlFor="adjust-fee-amount">New amount</label>
                    <Input id="adjust-fee-amount" type="number" min="0" value={customAmount} onChange={(event) => setCustomAmount(event.target.value)} placeholder="Enter adjusted amount" />
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" className="flex-1" onClick={() => setEditingAmount(null)}>Cancel</Button>
                      <Button type="button" className="flex-1" onClick={() => saveDiscount(editingPayment)} disabled={saving}><Save className="size-4" /> Save amount</Button>
                    </div>
                  </div>
                )}
              </ResponsivePopover>
            </>
          )}

          {/* ── Transactions tab ── */}
          {tab === "transactions" && (
            <div className="space-y-4">
              <section className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-gray-100 bg-gradient-to-br from-white to-sky-50">
                {[
                  { label: "From students", value: txStudentTotals?.totalCollected ?? 0, icon: Users },
                  { label: "From teachers", value: txSummary?.totalAmount ?? 0, icon: ArrowRightLeft },
                ].map(({ label, value, icon: Icon }) => (
                  <div key={label} className="min-w-0 bg-white/85 p-2.5 sm:p-3">
                    <p className="flex items-center gap-1.5 text-xs font-medium text-gray-600 sm:text-sm"><Icon className="size-4 text-primary-700" aria-hidden="true" />{label}</p>
                    <p className="mt-1.5 truncate text-lg font-bold tabular-nums text-gray-950 sm:text-2xl" title={formatCurrency(value)}>{formatCurrency(value)}</p>
                  </div>
                ))}
              </section>

              {txSummary && txSummary.byTeacher.length > 0 && (
                <section>
                  <h2 className="mb-2 px-1 text-sm font-semibold text-gray-700">Collected from each teacher</h2>
                  <div className="divide-y divide-gray-100 overflow-hidden rounded-2xl bg-white">
                    {txSummary.byTeacher.map((teacher) => (
                      <div key={teacher.teacherId} className="flex items-center gap-3 px-4 py-4">
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-gray-950">{teacher.teacherName ?? "Unknown teacher"}</span>
                          <span className="mt-1 block text-xs text-gray-500">{teacher.count} transactions</span>
                        </span>
                        <span className="shrink-0 text-sm font-semibold tabular-nums text-primary-700">{formatCurrency(teacher.totalAmount)}</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Filters + new transaction */}
              <div className="flex gap-2 flex-wrap items-center">
                <DrawerSelector
                  title="Teacher"
                  value={txTeacherId}
                  options={[{ value: "", label: "All teachers" }, ...Object.entries(teachersOnly).map(([id, name]) => ({ value: id, label: name }))]}
                  onChange={(value) => {
                    setTxTeacherId(value);
                    setTxSkip(0);
                  }}
                  className="w-auto min-w-36"
                />
                <Button type="button" variant="outline" className="shadow-none" onClick={() => setDateDrawer("from")}><CalendarDays className="size-4" />{txFromDate || "From date"}</Button>
                <Button type="button" variant="outline" className="shadow-none" onClick={() => setDateDrawer("to")}><CalendarDays className="size-4" />{txToDate || "To date"}</Button>
                <DatePickerDrawer open={dateDrawer === "from"} onOpenChange={(open) => { if (!open) setDateDrawer(null); }} date={txFromDate} onDateChange={(date) => { setTxFromDate(date); setTxSkip(0); }} title="From date" allowClear disableFuture={false} />
                <DatePickerDrawer open={dateDrawer === "to"} onOpenChange={(open) => { if (!open) setDateDrawer(null); }} date={txToDate} onDateChange={(date) => { setTxToDate(date); setTxSkip(0); }} title="To date" allowClear disableFuture={false} />
                <Button
                  type="button"
                  onClick={() => {
                    setTxForm({
                      amount: "",
                      feeTypeId: activeTypeId ?? "",
                      date: new Date().toISOString().split("T")[0],
                      teacherId: "",
                    });
                    setTxFormError(null);
                    setTxCreating(true);
                  }}
                  className="ml-auto"
                >
                  <Plus className="w-4 h-4" /> New Transaction
                </Button>
              </div>

              <section>
                <h2 className="mb-2 px-1 text-sm font-semibold text-gray-700">Transactions <span className="font-normal text-gray-500">({txTotal})</span></h2>
                <div className="divide-y divide-gray-100 overflow-hidden rounded-2xl bg-white">
                  {txLoading || txSummaryLoading ? <SkeletonList count={4} /> : transactions.length === 0 ? (
                    <p className="px-4 py-10 text-center text-sm text-gray-500">No transactions yet</p>
                  ) : transactions.map((transaction) => (
                    <div key={transaction.id} className="flex items-center gap-3 px-4 py-4">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-gray-950 sm:text-base">{transaction.teacher.name} → {transaction.admin.name}</span>
                        <span className="mt-1 block truncate text-xs text-gray-500">{transaction.feeType.name} · {new Date(transaction.date).toLocaleDateString("en-GB")}</span>
                      </span>
                      <span className="shrink-0 text-sm font-semibold tabular-nums text-primary-700">{formatCurrency(Number(transaction.amount))}</span>
                      <Button type="button" variant="ghost" size="icon-xs" aria-label={`Delete transaction from ${transaction.teacher.name}`} onClick={() => setDeletingTx(transaction.id)}><Trash2 className="size-4 text-gray-500" /></Button>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-gray-500">
                  <span>{txTotal === 0 ? 0 : txSkip + 1}–{Math.min(txSkip + txTake, txTotal)} of {txTotal}</span>
                  <div className="flex items-center gap-2">
                    <DrawerSelector title="Transactions per page" value={String(txTake)} options={[10, 20, 30, 50, 100].map((size) => ({ value: String(size), label: `${size} per page` }))} onChange={(value) => { setTxTake(Number(value)); setTxSkip(0); }} className="h-9 w-28 text-xs" />
                    <Button type="button" size="xs" variant="outline" disabled={txSkip === 0 || txLoading} onClick={() => setTxSkip(Math.max(0, txSkip - txTake))}>Previous</Button>
                    <Button type="button" size="xs" variant="outline" disabled={txSkip + txTake >= txTotal || txLoading} onClick={() => setTxSkip(txSkip + txTake)}>Next</Button>
                  </div>
                </div>
              </section>
            </div>
          )}

          {/* ── Reports tab ── */}
          {tab === "reports" && (
            <div className="space-y-4">
              {/* Filters */}
              <div className="flex flex-wrap gap-2">
                <DrawerSelector title="Class" value={reportClassId} options={[{ value: "", label: "All classes" }, ...classes.map((item) => ({ value: item.id, label: item.name }))]} onChange={setReportClassId} className="w-auto min-w-36" />
              </div>

              {reportPayLoading ? (
                <div className="flex items-center justify-center gap-2 py-12 text-gray-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                </div>
              ) : (
                <>
                  <FeeStats
                    collected={reportPayments.reduce((sum, payment) => sum + Number(payment.paidAmount ?? 0), 0)}
                    pending={reportPayments.reduce((sum, payment) => payment.status === "WAIVED" ? sum : sum + Math.max(0, Number(payment.dueAmount) - Number(payment.paidAmount ?? 0)), 0)}
                  />

                  {/* Student list by status */}
                  <section>
                    <h2 className="mb-2 px-1 text-sm font-semibold text-gray-700">Students <span className="font-normal text-gray-500">({reportPayments.length})</span></h2>
                    <div className="divide-y divide-gray-100 overflow-hidden rounded-2xl bg-white">
                    {reportPayments.length === 0 ? (
                      <div className="text-center py-10 text-gray-400 text-sm">
                        No payments found
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-100">
                        {reportPayments.map((p) => (
                          <div
                            key={p.id}
                            className="flex items-center gap-3 px-4 py-4"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-900 truncate">
                                {p.student.name}
                              </p>
                              <p className="text-xs text-gray-400">
                                {p.student.adno}
                                {p.student.class
                                  ? ` · ${p.student.class.name}`
                                  : ""}
                                {p.feeType ? ` · ${p.feeType.name}` : ""}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-sm font-bold text-gray-900">
                                ₹{Number(p.dueAmount).toLocaleString()}
                              </p>
                              <span
                                className={cn(
                                  "text-[10px] font-semibold px-2 py-0.5 rounded-lg",
                                  STATUS_META[p.status as FeePaymentStatus]
                                    ?.bg ?? "bg-gray-100",
                                  STATUS_META[p.status as FeePaymentStatus]
                                    ?.color ?? "text-gray-600",
                                )}
                              >
                                {STATUS_META[p.status as FeePaymentStatus]
                                  ?.label ?? p.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    </div>
                  </section>

                  {/* Collection bar chart */}
                  {chartData.length > 0 && (
                    <div className="bg-white rounded-2xl border border-gray-100 p-5">
                      <p className="font-bold text-gray-900 text-sm mb-4">
                        Collection by Fee Type
                      </p>
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={chartData} barSize={24}>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#f0f0f0"
                          />
                          <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                          <YAxis tick={{ fontSize: 10 }} />
                          <Tooltip
                            formatter={(v: any) =>
                              `₹${(v || 0).toLocaleString()}`
                            }
                          />
                          <Bar
                            dataKey="paid"
                            name="Collected"
                            fill="var(--primary)"
                            radius={[4, 4, 0, 0]}
                          />
                          <Bar
                            dataKey="due"
                            name="Due"
                            fill="#e5e7eb"
                            radius={[4, 4, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* Status breakdown */}
                  {summary && summary.byStatus.length > 0 && (
                    <div className="bg-white rounded-2xl border border-gray-100 p-5">
                      <p className="font-bold text-gray-900 text-sm mb-4">
                        By Status
                      </p>
                      <div className="space-y-2">
                        {summary.byStatus.map((s) => {
                          const meta =
                            STATUS_META[s.status as FeePaymentStatus] ??
                            STATUS_META.PENDING;
                          const due = Number(s._sum.dueAmount ?? 0);
                          const paid = Number(s._sum.paidAmount ?? 0);
                          return (
                            <div
                              key={s.status}
                              className="flex items-center gap-3"
                            >
                              <span
                                className={cn(
                                  "text-xs font-bold px-2.5 py-1 rounded-lg w-20 text-center shrink-0",
                                  meta.bg,
                                  meta.color,
                                )}
                              >
                                {meta.label}
                              </span>
                              <div className="flex-1">
                                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                  <div
                                    className={cn(
                                      "h-full rounded-full",
                                      s.status === "PAID"
                                        ? "bg-primary-500"
                                        : s.status === "OVERDUE"
                                          ? "bg-red-400"
                                          : "bg-amber-400",
                                    )}
                                    style={{
                                      width: `${due > 0 ? Math.min(100, (paid / due) * 100) : 0}%`,
                                    }}
                                  />
                                </div>
                              </div>
                              <span className="text-xs font-bold text-gray-700 w-10 text-right shrink-0">
                                {s._count.id}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </>
      )}

      {receipt && (
        <ReceiptModal receipt={receipt} onClose={() => setReceipt(null)} />
      )}

      <ResponsivePopover open={cancellingPayment !== null} onOpenChange={(open) => { if (!open && !cancellingSave) setCancelling(null); }} title="Cancel fee payment" description="This will mark the payment as waived">
        {cancellingPayment && (
          <div className="space-y-4 px-4 pb-6 pt-2 sm:px-6">
            <dl className="divide-y divide-gray-100 overflow-hidden rounded-2xl bg-white text-sm">
              {[
                ["Student", cancellingPayment.student.name],
                ["Admission no", cancellingPayment.student.adno],
                ["Fee type", cancellingPayment.feeType.name],
                ["Amount", formatCurrency(Number(cancellingPayment.paidAmount ?? cancellingPayment.dueAmount))],
                ["Status", cancellingPayment.status],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-3 px-4 py-4"><dt className="text-gray-500">{label}</dt><dd className="text-right font-semibold text-gray-950">{value}</dd></div>
              ))}
            </dl>
            <Input value={cancellingNote} onChange={(event) => setCancellingNote(event.target.value)} placeholder="Reason (optional)" aria-label="Reason for cancellation" />
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" disabled={cancellingSave} onClick={() => { setCancelling(null); setCancellingNote(""); }}>Keep</Button>
              <Button type="button" variant="destructive" className="flex-1" disabled={cancellingSave} onClick={() => cancelPayment(cancellingPayment)}><XCircle className="size-4" /> Confirm cancel</Button>
            </div>
          </div>
        )}
      </ResponsivePopover>

      <ResponsivePopover open={txCreating} onOpenChange={(open) => { if (!open && !txSaving) setTxCreating(false); }} title="New transaction" description="Record a teacher to admin handover" fullHeight>
        <div className="mx-auto w-full max-w-xl space-y-4 px-4 pb-6 pt-2 sm:px-6">
          <div className="space-y-1.5">
            <label htmlFor="tx-amount" className="text-sm font-medium text-gray-700">Amount</label>
            <Input id="tx-amount" type="number" min="0.01" step="0.01" value={txForm.amount} onChange={(event) => setTxForm((current) => ({ ...current, amount: event.target.value }))} placeholder="0" />
          </div>
          <div className="space-y-1.5">
            <p className="text-sm font-medium text-gray-700">Date</p>
            <Button type="button" variant="outline" className="w-full justify-between shadow-none" onClick={() => setTxFormDateOpen(true)}>{txForm.date}<CalendarDays className="size-4" /></Button>
          </div>
          <DatePickerDrawer open={txFormDateOpen} onOpenChange={setTxFormDateOpen} date={txForm.date} onDateChange={(date) => setTxForm((current) => ({ ...current, date }))} title="Transaction date" disableFuture={false} />
          <DrawerSelector title="Fee type" value={txForm.feeTypeId} options={feeTypes.map((feeType) => ({ value: feeType.id, label: feeType.name }))} onChange={(value) => setTxForm((current) => ({ ...current, feeTypeId: value }))} placeholder="Select fee type" />
          <DrawerSelector title="Teacher" value={txForm.teacherId} options={Object.entries(teachersOnly).map(([id, name]) => ({ value: id, label: name }))} onChange={(value) => setTxForm((current) => ({ ...current, teacherId: value }))} placeholder="Select teacher" />
          <p className="rounded-xl bg-primary-50 px-3 py-2 text-xs text-primary-800">Receiving admin: <span className="font-semibold">{user?.name ?? "You"}</span></p>
          {txFormError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{txFormError}</p>}
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="flex-1" disabled={txSaving} onClick={() => setTxCreating(false)}>Cancel</Button>
            <Button type="button" className="flex-1" disabled={txSaving} onClick={saveTransaction}><CheckCircle className="size-4" /> Save transaction</Button>
          </div>
        </div>
      </ResponsivePopover>

      <ResponsivePopover open={deletingTransaction !== null} onOpenChange={(open) => { if (!open && !deletingTxSave) setDeletingTx(null); }} title="Delete transaction" description="This action cannot be undone">
        {deletingTransaction && (
          <div className="space-y-4 px-4 pb-6 pt-2 sm:px-6">
            <dl className="divide-y divide-gray-100 overflow-hidden rounded-2xl bg-white text-sm">
              {[
                ["Amount", formatCurrency(Number(deletingTransaction.amount))],
                ["Fee type", deletingTransaction.feeType.name],
                ["From", deletingTransaction.teacher.name],
                ["To", deletingTransaction.admin.name],
                ["Date", new Date(deletingTransaction.date).toLocaleDateString("en-GB")],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-3 px-4 py-4"><dt className="text-gray-500">{label}</dt><dd className="text-right font-semibold text-gray-950">{value}</dd></div>
              ))}
            </dl>
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" disabled={deletingTxSave} onClick={() => setDeletingTx(null)}>Keep</Button>
              <Button type="button" variant="destructive" className="flex-1" disabled={deletingTxSave} onClick={deleteTransaction}><Trash2 className="size-4" /> Delete</Button>
            </div>
          </div>
        )}
      </ResponsivePopover>
    </DashboardLayout>
  );
}
