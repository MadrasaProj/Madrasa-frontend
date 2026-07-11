import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable } from "@/components/ui/DataTable";
import { ApiErrorBanner } from "@/components/ui/ApiErrorBanner";
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
} from "@/lib/fees-api";
import { getAllClasses, type ClassRecord } from "@/lib/classes-api";
import { getTeachers, type TeacherRecord } from "@/lib/teachers-api";
import { apiFetch } from "@/lib/fetch";
import { useAuthStore } from "@/store/auth";
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
  ChevronDown,
  ArrowRightLeft,
  Trash2,
  Plus,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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
  PAID: { label: "Paid", color: "text-emerald-700", bg: "bg-emerald-50" },
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

// ── Receipt Modal ──────────────────────────────────────────────────────────
function ReceiptModal({
  receipt,
  onClose,
}: {
  receipt: ReceiptData;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ scale: 0.94, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden"
      >
        <div className="bg-emerald-600 px-6 py-5 text-white text-center">
          <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-2">
            <Receipt className="w-6 h-6 text-white" />
          </div>
          <p className="font-bold text-lg">{receipt.client.name}</p>
          <p className="text-emerald-100 text-xs uppercase tracking-widest mt-0.5">
            Fee Receipt
          </p>
        </div>
        <div className="px-6 py-5 space-y-2.5">
          {(
            [
              [
                "Receipt No",
                receipt.reference ?? receipt.id.slice(0, 8).toUpperCase(),
              ],
              ["Student", receipt.student.name],
              ["Adm No", receipt.student.adno],
              ["Class", receipt.student.class?.name ?? "—"],
              ["Fee Type", receipt.feeType.name],
              [
                "Paid On",
                receipt.paidAt
                  ? new Date(receipt.paidAt).toLocaleDateString("en-GB")
                  : "—",
              ],
              ["Method", receipt.method ?? "—"],
            ] as [string, string][]
          ).map(([label, value]) => (
            <div key={label} className="flex justify-between items-start gap-4">
              <p className="text-xs text-gray-400 shrink-0">{label}</p>
              <p className="text-xs font-semibold text-gray-900 text-right">
                {value}
              </p>
            </div>
          ))}
          <div className="border-t border-dashed border-gray-200 pt-3 flex justify-between items-center">
            <p className="font-bold text-gray-900">Amount Paid</p>
            <p className="text-xl font-bold text-emerald-600">
              ₹{Number(receipt.paidAmount ?? 0).toLocaleString()}
            </p>
          </div>
        </div>
        <div className="px-6 pb-5 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border rounded-xl text-sm font-semibold text-gray-600"
          >
            Close
          </button>
          <button
            onClick={() => window.print()}
            className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5"
          >
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

  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [tab, setTab] = useState<"records" | "reports" | "transactions">(
    "records",
  );

  // Inline mark-paid state
  const [recording, setRecording] = useState<string | null>(null);
  const [payMethod, setPayMethod] = useState("CASH");
  const [payRef, setPayRef] = useState("");
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

  // Teachers lookup (for collectedBy)
  const [teachers, setTeachers] = useState<Record<string, string>>({});
  // Teachers only (for transaction modal — excludes admins)
  const [teachersOnly, setTeachersOnly] = useState<Record<string, string>>({});

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

  // Transaction create modal state
  const [txCreating, setTxCreating] = useState(false);
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

  useEffect(() => {
    if (!cid || !token) return;
    loadTypes();
    getAllClasses(cid, token)
      .then(setClasses)
      .catch(() => {});
    (async () => {
      const map: Record<string, string> = {};
      const teacherOnlyMap: Record<string, string> = {};
      try {
        const teachersRes = await getTeachers(cid, token, { limit: 500 });
        for (const t of teachersRes.data ?? []) {
          map[t.id] = t.name;
          teacherOnlyMap[t.id] = t.name;
        }
      } catch {}
      try {
        const usersRes = await apiFetch<{
          data: { id: string; name: string }[];
        }>(
          `${import.meta.env.VITE_API_ORIGIN ?? "http://localhost:3000"}/api/v2/${cid}/users`,
          token,
        );
        for (const u of usersRes.data ?? []) map[u.id] = u.name;
      } catch {}
      setTeachers(map);
      setTeachersOnly(teacherOnlyMap);
    })();
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
  const [summary, setSummary] = useState<{
    byStatus: any[];
    byFeeType: any[];
    totals?: {
      studentDue: number;
      studentCollected: number;
      studentPending: number;
      fromTeachers: number;
      teacherTransactionCount: number;
    };
  } | null>(null);
  const reportFeeTypeId = activeTypeId ?? "";
  const [reportClassId, setReportClassId] = useState<string>("");
  const [reportPayments, setReportPayments] = useState<FeePayment[]>([]);
  const [reportPayLoading, setReportPayLoading] = useState(false);

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

  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false);
  const typeDropdownRef = useRef<HTMLDivElement | null>(null);
  const chevronBtnRef = useRef<HTMLButtonElement | null>(null);
  const [chevronRect, setChevronRect] = useState<{
    top: number;
    right: number;
  } | null>(null);

  useEffect(() => {
    if (!typeDropdownOpen) return;
    const onClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (
        typeDropdownRef.current &&
        !typeDropdownRef.current.contains(t) &&
        !(t as HTMLElement).closest?.("[data-fee-dropdown-panel]")
      ) {
        setTypeDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [typeDropdownOpen]);

  useEffect(() => {
    if (!typeDropdownOpen) return;
    const updatePos = () => {
      const r = chevronBtnRef.current?.getBoundingClientRect();
      if (r)
        setChevronRect({
          top: r.bottom + 8,
          right: window.innerWidth - r.right,
        });
    };
    updatePos();
    window.addEventListener("scroll", updatePos, true);
    window.addEventListener("resize", updatePos);
    return () => {
      window.removeEventListener("scroll", updatePos, true);
      window.removeEventListener("resize", updatePos);
    };
  }, [typeDropdownOpen]);

  const toggleTypeDropdown = () => {
    if (!typeDropdownOpen && chevronBtnRef.current) {
      const r = chevronBtnRef.current.getBoundingClientRect();
      setChevronRect({ top: r.bottom + 8, right: window.innerWidth - r.right });
    }
    setTypeDropdownOpen((o) => !o);
  };

  const selectType = (id: string | null) => {
    setActiveTypeId(id);
    setPaySkip(0);
    setStatusFilter("all");
    setSearch("");
    setTypeDropdownOpen(false);
  };

  const activeType = feeTypes.find((f) => f.id === activeTypeId) ?? null;

  const paidPayments = payments.filter((p) => p.status === "PAID");
  const pendingPayments = payments.filter(
    (p) => p.status !== "PAID" && p.status !== "WAIVED",
  );
  const totalCollected = paidPayments.reduce(
    (s, p) => s + Number(p.paidAmount ?? p.dueAmount),
    0,
  );
  const totalPending = pendingPayments.reduce(
    (s, p) => s + Number(p.dueAmount),
    0,
  );
  const pctCollected =
    totalCollected + totalPending > 0
      ? Math.round((totalCollected / (totalCollected + totalPending)) * 100)
      : 0;

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
      if (p.virtual) {
        await recordPayment(cid, token, {
          studentId: p.student.id,
          feeTypeId: p.feeType.id,
          dueDate: p.dueDate,
          dueAmount: Number(p.dueAmount),
          paidAmount: Number(p.dueAmount),
          method: payMethod as any,
          reference: payRef || undefined,
          status: "PAID",
        });
      } else {
        await updatePayment(cid, token, p.id, {
          paidAmount: Number(p.dueAmount),
          method: payMethod as any,
          reference: payRef || undefined,
          status: "PAID",
        });
      }
      setRecording(null);
      setPayRef("");
      loadPayments();
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

  return (
    <DashboardLayout>
      <PageHeader
        title="Fees & Payments"
        subtitle="All fee types, campaigns, and payment records"
        icon={CreditCard}
        action={
          <a
            href="/admin/fees/types"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-all"
          >
            <Zap className="w-4 h-4" /> Manage Types
          </a>
        }
      />

      {error && (
        <ApiErrorBanner
          message={error}
          onRetry={tab === "records" ? loadPayments : loadReportData}
        />
      )}

      {typesLoading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      ) : feeTypes.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <CreditCard className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">
            No fee types yet.{" "}
            <a href="/admin/fees/types" className="text-emerald-600 underline">
              Create one
            </a>{" "}
            to start collecting.
          </p>
        </div>
      ) : (
        <>
          {/* Fee type buttons */}
          <div className="flex items-center gap-1.5 mb-5 overflow-x-auto pb-1">
            <button
              onClick={() => selectType(null)}
              className={cn(
                "h-10 px-4 rounded-md text-xs font-semibold whitespace-nowrap transition-all shrink-0 inline-flex items-center gap-1.5",
                activeTypeId === null
                  ? "bg-emerald-600 text-white shadow-sm"
                  : " text-gray-600 hover:bg-gray-200",
              )}
            >
              <Users className="w-3.5 h-3.5" />
              All Fees
            </button>

            {feeTypes.map((ft) => {
              const isActive = ft.id === activeTypeId;
              return (
                <button
                  key={ft.id}
                  onClick={() => selectType(ft.id)}
                  className={cn(
                    "h-10 px-4 rounded-md text-xs font-semibold whitespace-nowrap transition-all shrink-0 inline-flex items-center gap-1.5",
                    isActive
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "bg-gray-50 text-gray-600 hover:bg-gray-100",
                  )}
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  {ft.name}
                </button>
              );
            })}

            <div className="max-md:sticky max-md:right-0 md:ml-auto z-10 flex items-center max-md:pl-8 max-md:bg-gradient-to-l from-white via-white/95 to-transparent">
              <button
                ref={chevronBtnRef}
                onClick={toggleTypeDropdown}
                className="h-10 w-10 rounded-full inline-flex items-center justify-center transition-all text-gray-500 hover:text-gray-700 shrink-0"
                title="All fee types"
                aria-label="All fee types"
                aria-expanded={typeDropdownOpen}
              >
                <ChevronDown
                  className={cn(
                    "w-4 h-4 transition-transform duration-200",
                    typeDropdownOpen && "rotate-180",
                  )}
                />
              </button>
            </div>
          </div>

          {typeDropdownOpen &&
            chevronRect &&
            createPortal(
              <AnimatePresence>
                <motion.div
                  key="fee-dropdown"
                  data-fee-dropdown-panel
                  ref={typeDropdownRef}
                  initial={{ opacity: 0, y: -4, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.98 }}
                  transition={{ duration: 0.12 }}
                  style={{
                    position: "fixed",
                    top: chevronRect.top,
                    right: chevronRect.right,
                  }}
                  className="z-50 w-72 bg-white rounded-2xl shadow-xl ring-1 ring-gray-100 overflow-hidden"
                >
                  <div className="px-3 py-2 bg-gray-50">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                      All Fee Types
                    </p>
                  </div>
                  <div className="max-h-80 overflow-y-auto py-1">
                    <button
                      onClick={() => selectType(null)}
                      className={cn(
                        "w-full flex items-center gap-2.5 px-3 py-2.5 text-xs hover:bg-gray-50 text-left",
                        activeTypeId === null &&
                          "bg-emerald-50 text-emerald-700 font-semibold",
                      )}
                    >
                      <Users
                        className={cn(
                          "w-4 h-4 shrink-0",
                          activeTypeId === null
                            ? "text-emerald-600"
                            : "text-gray-400",
                        )}
                      />
                      <span className="flex-1 truncate">All Fees</span>
                      <span className="text-[10px] text-gray-400">
                        {feeTypes.length} types
                      </span>
                    </button>
                    {feeTypes.map((ft) => {
                      const isActive = ft.id === activeTypeId;
                      return (
                        <button
                          key={ft.id}
                          onClick={() => selectType(ft.id)}
                          className={cn(
                            "w-full flex items-center gap-2.5 px-3 py-2.5 text-xs hover:bg-gray-50 text-left",
                            isActive &&
                              "bg-emerald-50 text-emerald-700 font-semibold",
                          )}
                        >
                          <CreditCard
                            className={cn(
                              "w-4 h-4 shrink-0",
                              isActive ? "text-emerald-600" : "text-gray-400",
                            )}
                          />
                          <span className="flex-1 truncate">{ft.name}</span>
                          <span className="text-[10px] text-gray-400 shrink-0">
                            ₹{Number(ft.amount).toLocaleString()}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              </AnimatePresence>,
              document.body,
            )}

          {/* Selected type stats strip */}
          {activeType && (
            <div className="rounded-2xl p-4 mb-5 border-2 bg-emerald-50 border-emerald-200">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-bold text-emerald-700">
                    {activeType.name}
                  </p>
                  {activeType.description && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      {activeType.description}
                    </p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: "Total", value: String(payTotal), sub: "records" },
                  {
                    label: "Paid",
                    value: String(paidPayments.length),
                    sub: `₹${totalCollected.toLocaleString()}`,
                    color: "text-emerald-600",
                  },
                  {
                    label: "Pending",
                    value: String(pendingPayments.length),
                    sub: `₹${totalPending.toLocaleString()}`,
                    color: "text-amber-600",
                  },
                  {
                    label: "Collected",
                    value: `${pctCollected}%`,
                    sub: "rate",
                    color:
                      pctCollected >= 80
                        ? "text-emerald-600"
                        : "text-amber-600",
                  },
                ].map((s) => (
                  <div
                    key={s.label}
                    className="bg-white/60 rounded-xl p-2 text-center"
                  >
                    <p className="text-[10px] text-gray-500">{s.label}</p>
                    <p
                      className={cn(
                        "text-sm font-bold",
                        s.color ?? "text-gray-900",
                      )}
                    >
                      {s.value}
                    </p>
                    <p className="text-[10px] text-gray-400">{s.sub}</p>
                  </div>
                ))}
              </div>
              {totalCollected + totalPending > 0 && (
                <div className="mt-3">
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pctCollected}%` }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                      className="h-full rounded-full bg-emerald-600"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-1.5 mb-4 bg-gray-100 p-1 rounded-xl w-fit">
            {(["records", "transactions", "reports"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-semibold capitalize transition-all inline-flex items-center gap-1.5",
                  tab === t
                    ? "bg-white shadow-sm text-emerald-700"
                    : "text-gray-500",
                )}
              >
                {t === "records"
                  ? "Payment Records"
                  : t === "transactions"
                    ? "Transactions"
                    : "Reports"}
              </button>
            ))}
          </div>

          {/* ── Records tab ── */}
          {tab === "records" && (
            <>
              <div className="flex gap-2 mb-3 flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search student name or adm no…"
                    className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:border-emerald-400"
                  />
                </div>
                <select
                  value={filterClass}
                  onChange={(e) => {
                    setFilterClass(e.target.value);
                    setPaySkip(0);
                  }}
                  className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:border-emerald-400"
                >
                  <option value="">All Classes</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
                  {(["all", "PAID", "PENDING", "OVERDUE"] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => {
                        setStatusFilter(s);
                        setPaySkip(0);
                      }}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                        statusFilter === s
                          ? "bg-white shadow-sm text-gray-900"
                          : "text-gray-500",
                      )}
                    >
                      {s === "all"
                        ? "All"
                        : STATUS_META[s as FeePaymentStatus].label}
                    </button>
                  ))}
                </div>
              </div>

              <DataTable
                columns={[
                  {
                    key: "student",
                    header: "Student",
                    render: (p: FeePayment) => (
                      <div className="flex items-center gap-2.5">
                        <div
                          className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0",
                            p.status === "PAID"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-amber-100 text-amber-700",
                          )}
                        >
                          {p.student.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900 truncate max-w-[180px]">
                            {p.student.name}
                          </p>
                          <p className="text-xs text-gray-400">
                            {p.student.adno}
                            {p.student.class
                              ? ` · ${p.student.class.name}`
                              : ""}
                          </p>
                        </div>
                      </div>
                    ),
                  },
                  ...(activeType
                    ? []
                    : [
                        {
                          key: "feeType" as string,
                          header: "Fee Type",
                          render: (p: FeePayment) => (
                            <span className="text-sm text-gray-600">
                              {p.feeType.name}
                            </span>
                          ),
                        },
                      ]),
                  {
                    key: "dueDate",
                    header: "Due Date",
                    render: (p: FeePayment) => {
                      const isPaid = p.status === "PAID";
                      return (
                        <span
                          className={cn(
                            "text-sm",
                            isPaid ? "text-emerald-600" : "text-amber-600",
                          )}
                        >
                          {isPaid && p.paidAt
                            ? new Date(p.paidAt).toLocaleDateString("en-GB")
                            : p.dueDate
                              ? `Due: ${new Date(p.dueDate).toLocaleDateString("en-GB")}`
                              : "—"}
                        </span>
                      );
                    },
                  },
                  {
                    key: "amount",
                    header: "Amount",
                    render: (p: FeePayment) => (
                      <span className="text-sm font-bold text-gray-900">
                        ₹{Number(p.dueAmount).toLocaleString()}
                      </span>
                    ),
                  },
                  {
                    key: "status",
                    header: "Status",
                    render: (p: FeePayment) => {
                      const meta = STATUS_META[p.status] ?? STATUS_META.PENDING;
                      return (
                        <span
                          className={cn(
                            "px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap",
                            meta.bg,
                            meta.color,
                          )}
                        >
                          {p.status === "PAID" ? "✓ " : ""}
                          {meta.label}
                        </span>
                      );
                    },
                  },
                  {
                    key: "collectedBy",
                    header: "Collector",
                    render: (p: FeePayment) =>
                      p.status === "PAID" && p.collectedBy ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-gray-100 text-gray-700 text-xs font-medium">
                          <Users className="w-3 h-3 text-gray-500" />
                          {teachers[p.collectedBy] ??
                            (p.collectedBy === cid
                              ? (user?.name ?? "Admin")
                              : p.collectedBy.slice(0, 8))}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      ),
                  },
                  {
                    key: "actions",
                    header: "",
                    className: "text-right",
                    render: (p: FeePayment) => (
                      <div className="flex items-center justify-end gap-0.5">
                        {p.status === "PAID" ? (
                          <>
                            <button
                              onClick={() => showReceiptFor(p.id)}
                              disabled={loadingReceipt === p.id}
                              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                              title="Receipt"
                            >
                              {loadingReceipt === p.id ? (
                                <Loader2 className="w-3.5 h-3.5 text-gray-300 animate-spin" />
                              ) : (
                                <Receipt className="w-3.5 h-3.5 text-gray-400 hover:text-blue-500" />
                              )}
                            </button>
                            <button
                              onClick={() => {
                                setCancelling(p.id);
                                setCancellingNote("");
                              }}
                              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                              title="Cancel/Refund"
                            >
                              <XCircle className="w-3.5 h-3.5 text-gray-400 hover:text-red-500" />
                            </button>
                          </>
                        ) : p.status === "WAIVED" ? (
                          <button
                            onClick={() => undoCancel(p)}
                            disabled={cancellingSave}
                            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                            title="Undo cancel"
                          >
                            <RefreshCw
                              className={cn(
                                "w-3.5 h-3.5",
                                cancellingSave
                                  ? "text-gray-300 animate-spin"
                                  : "text-gray-400 hover:text-amber-500",
                              )}
                            />
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={() => {
                                setEditingAmount(p.id);
                                setCustomAmount(String(p.dueAmount));
                              }}
                              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                              title="Discount"
                            >
                              <Pencil className="w-3.5 h-3.5 text-gray-400 hover:text-blue-500" />
                            </button>
                            <button
                              onClick={() => {
                                setRecording(p.id);
                                setPayMethod("CASH");
                                setPayRef("");
                              }}
                              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                              title="Mark paid"
                            >
                              <CheckCircle className="w-3.5 h-3.5 text-gray-400 hover:text-emerald-500" />
                            </button>
                            <button
                              onClick={() => {
                                setCancelling(p.id);
                                setCancellingNote("");
                              }}
                              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                              title="Cancel"
                            >
                              <XCircle className="w-3.5 h-3.5 text-gray-400 hover:text-red-500" />
                            </button>
                          </>
                        )}
                      </div>
                    ),
                  },
                ]}
                data={filtered}
                keyExtractor={(p: FeePayment) => p.id}
                loading={payLoading}
                pagination={{
                  page: Math.floor(paySkip / payTake) + 1,
                  totalPages: Math.ceil(payTotal / payTake) || 1,
                  total: payTotal,
                  pageSize: payTake,
                  pageSizeOptions: [10, 20, 30, 50, 100],
                  onPageChange: (page: number) =>
                    setPaySkip((page - 1) * payTake),
                  onPageSizeChange: (size: number) => {
                    setPayTake(size);
                    setPaySkip(0);
                  },
                }}
                emptyMessage="No payment records found"
                emptyIcon={CreditCard}
                mobileRender={(p: FeePayment) => {
                  const meta = STATUS_META[p.status] ?? STATUS_META.PENDING;
                  return (
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0",
                            p.status === "PAID"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-amber-100 text-amber-700",
                          )}
                        >
                          {p.student.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {p.student.name}
                          </p>
                          <p className="text-xs text-gray-400">
                            {p.student.adno}
                            {p.student.class
                              ? ` · ${p.student.class.name}`
                              : ""}
                          </p>
                        </div>
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0",
                            meta.bg,
                            meta.color,
                          )}
                        >
                          {p.status === "PAID" ? "✓ " : ""}
                          {meta.label}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>{p.feeType.name}</span>
                        <span className="font-bold text-gray-900">
                          ₹{Number(p.dueAmount).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between text-[10px]">
                        {p.status === "PAID" && p.paidAt ? (
                          <span className="text-emerald-600">
                            Paid:{" "}
                            {new Date(p.paidAt).toLocaleDateString("en-GB")}
                          </span>
                        ) : (
                          <span className="text-amber-600">
                            Due:{" "}
                            {new Date(p.dueDate).toLocaleDateString("en-GB")}
                          </span>
                        )}
                        <div className="flex gap-1">
                          {p.status === "PAID" ? (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  showReceiptFor(p.id);
                                }}
                                className="p-1"
                              >
                                <Receipt className="w-3.5 h-3.5 text-gray-400" />
                              </button>
                            </>
                          ) : p.status !== "WAIVED" ? (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingAmount(p.id);
                                  setCustomAmount(String(p.dueAmount));
                                }}
                                className="p-1"
                              >
                                <Pencil className="w-3.5 h-3.5 text-gray-400" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setRecording(p.id);
                                  setPayMethod("CASH");
                                  setPayRef("");
                                }}
                                className="p-1"
                              >
                                <CheckCircle className="w-3.5 h-3.5 text-gray-400" />
                              </button>
                            </>
                          ) : null}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              p.status === "WAIVED"
                                ? undoCancel(p)
                                : setCancelling(p.id);
                            }}
                            className="p-1"
                          >
                            {p.status === "WAIVED" ? (
                              <RefreshCw className="w-3.5 h-3.5 text-gray-400" />
                            ) : (
                              <XCircle className="w-3.5 h-3.5 text-gray-400" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                }}
              />

              {/* Inline mark-paid panel (outside table) */}
              <AnimatePresence>
                {recordingPayment && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="bg-white rounded-2xl border border-emerald-200 shadow-lg overflow-hidden mt-3"
                  >
                    <div className="px-4 py-3 bg-emerald-50 border-b border-emerald-100">
                      <p className="text-sm font-semibold text-emerald-800">
                        Mark Paid — {recordingPayment.student.name} · ₹
                        {Number(recordingPayment.dueAmount).toLocaleString()}
                      </p>
                    </div>
                    <div className="p-4 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <select
                          value={payMethod}
                          onChange={(e) => setPayMethod(e.target.value)}
                          className="px-3 py-2.5 rounded-xl border text-sm bg-white focus:outline-none focus:border-emerald-400"
                        >
                          {PAYMENT_METHODS.map((m) => (
                            <option key={m} value={m}>
                              {m.replace(/_/g, " ")}
                            </option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={payRef}
                          onChange={(e) => setPayRef(e.target.value)}
                          placeholder="Receipt / Ref no."
                          className="px-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:border-emerald-400"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setRecording(null)}
                          className="flex-1 py-2.5 rounded-xl border text-sm font-semibold text-gray-600"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => markPaid(recordingPayment)}
                          disabled={saving}
                          className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold disabled:opacity-60 flex items-center justify-center gap-1.5"
                        >
                          {saving ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <CheckCircle className="w-4 h-4" />
                          )}
                          Confirm Payment
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Inline edit amount / discount panel (outside table) */}
              <AnimatePresence>
                {editingPayment && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="bg-white rounded-2xl border border-blue-200 shadow-lg overflow-hidden mt-3"
                  >
                    <div className="px-4 py-3 bg-blue-50 border-b border-blue-100">
                      <p className="text-sm font-semibold text-blue-800">
                        Discount — {editingPayment.student.name} ·{" "}
                        {editingPayment.feeType.name}
                      </p>
                    </div>
                    <div className="p-4 space-y-3">
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-500 shrink-0">
                          New Amount:
                        </span>
                        <input
                          type="number"
                          value={customAmount}
                          onChange={(e) => setCustomAmount(e.target.value)}
                          placeholder="Enter discounted amount"
                          className="flex-1 px-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:border-blue-400"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingAmount(null)}
                          className="flex-1 py-2.5 rounded-xl border text-sm font-semibold text-gray-600"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => saveDiscount(editingPayment)}
                          disabled={saving}
                          className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold disabled:opacity-60 flex items-center justify-center gap-1.5"
                        >
                          {saving ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Save className="w-4 h-4" />
                          )}
                          Save Amount
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}

          {/* ── Transactions tab ── */}
          {tab === "transactions" && (
            <div className="space-y-4">
              {/* Totals: students vs teachers */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-2xl p-4 border-2 bg-emerald-50 border-emerald-200">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">
                      From Students
                    </p>
                    <Users className="w-4 h-4 text-emerald-500" />
                  </div>
                  <p className="text-2xl font-bold text-emerald-700">
                    ₹
                    {(txStudentTotals?.totalCollected ?? 0).toLocaleString()}
                  </p>
                  <p className="text-[10px] text-emerald-600 mt-1">
                    Total collected
                  </p>
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    <div className="bg-white/60 rounded-xl p-2 text-center">
                      <p className="text-[9px] text-gray-500">Total Due</p>
                      <p className="text-xs font-bold text-gray-900">
                        ₹
                        {(txStudentTotals?.totalDue ?? 0).toLocaleString()}
                      </p>
                    </div>
                    <div className="bg-white/60 rounded-xl p-2 text-center">
                      <p className="text-[9px] text-gray-500">Pending</p>
                      <p className="text-xs font-bold text-amber-600">
                        ₹
                        {(txStudentTotals?.totalPending ?? 0).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="rounded-2xl p-4 border-2 bg-emerald-50 border-emerald-200">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">
                      From Teachers
                    </p>
                    <ArrowRightLeft className="w-4 h-4 text-emerald-500" />
                  </div>
                  <p className="text-2xl font-bold text-emerald-700">
                    ₹{(txSummary?.totalAmount ?? 0).toLocaleString()}
                  </p>
                  <p className="text-[10px] text-emerald-600 mt-1">
                    {txSummary?.transactionCount ?? 0} transactions across{" "}
                    {txSummary?.byTeacher.length ?? 0} teachers
                  </p>
                </div>
              </div>

              {/* Per-teacher totals */}
              {txSummary && txSummary.byTeacher.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                    <p className="text-sm font-bold text-gray-900">
                      Total Collected From Each Teacher
                    </p>
                    <p className="text-xs text-gray-400">
                      {txSummary.byTeacher.length} teacher
                      {txSummary.byTeacher.length === 1 ? "" : "s"}
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-gray-100">
                    {txSummary.byTeacher.map((b) => {
                      const max =
                        txSummary.byTeacher[0]?.totalAmount ?? 0;
                      const pct =
                        max > 0 ? (b.totalAmount / max) * 100 : 0;
                      return (
                        <div
                          key={b.teacherId}
                          className="bg-white p-4 flex flex-col gap-2"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm shrink-0">
                              {(b.teacherName ?? "?")
                                .trim()
                                .charAt(0)
                                .toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-900 truncate">
                                {b.teacherName ?? "Unknown teacher"}
                              </p>
                              <p className="text-[10px] text-gray-400">
                                {b.count} transaction
                                {b.count === 1 ? "" : "s"}
                              </p>
                            </div>
                            <p className="text-sm font-bold text-emerald-700 shrink-0">
                              ₹{b.totalAmount.toLocaleString()}
                            </p>
                          </div>
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 rounded-full transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Filters + new transaction */}
              <div className="flex gap-2 flex-wrap items-center">
                <select
                  value={txTeacherId}
                  onChange={(e) => {
                    setTxTeacherId(e.target.value);
                    setTxSkip(0);
                  }}
                  className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:border-emerald-400"
                >
                  <option value="">All Teachers</option>
                  {Object.entries(teachersOnly).map(([id, name]) => (
                    <option key={id} value={id}>
                      {name}
                    </option>
                  ))}
                </select>
                <input
                  type="date"
                  value={txFromDate}
                  onChange={(e) => {
                    setTxFromDate(e.target.value);
                    setTxSkip(0);
                  }}
                  className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:border-emerald-400"
                />
                <input
                  type="date"
                  value={txToDate}
                  onChange={(e) => {
                    setTxToDate(e.target.value);
                    setTxSkip(0);
                  }}
                  className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:border-emerald-400"
                />
                <button
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
                  className="ml-auto px-3 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold inline-flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" /> New Transaction
                </button>
              </div>

              {/* Transactions table */}
              <DataTable
                columns={[
                  {
                    key: "date",
                    header: "Date",
                    render: (t: FeeTransaction) => (
                      <span className="text-sm text-gray-700">
                        {new Date(t.date).toLocaleDateString("en-GB")}
                      </span>
                    ),
                  },
                  {
                    key: "teacher",
                    header: "From (Teacher)",
                    render: (t: FeeTransaction) => (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-gray-100 text-gray-700 text-xs font-medium">
                        <Users className="w-3 h-3 text-gray-500" />
                        {t.teacher.name}
                      </span>
                    ),
                  },
                  {
                    key: "feeType",
                    header: "Fee Type",
                    render: (t: FeeTransaction) => (
                      <span className="text-sm text-gray-600">
                        {t.feeType.name}
                      </span>
                    ),
                  },
                  {
                    key: "admin",
                    header: "To (Admin)",
                    render: (t: FeeTransaction) => (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-medium">
                        <Users className="w-3 h-3 text-blue-500" />
                        {t.admin.name}
                      </span>
                    ),
                  },
                  {
                    key: "amount",
                    header: "Amount",
                    className: "text-right",
                    render: (t: FeeTransaction) => (
                      <span className="text-sm font-bold text-emerald-700">
                        ₹{Number(t.amount).toLocaleString()}
                      </span>
                    ),
                  },
                  {
                    key: "actions",
                    header: "",
                    className: "text-right",
                    render: (t: FeeTransaction) => (
                      <button
                        onClick={() => setDeletingTx(t.id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                        title="Delete transaction"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-gray-400 hover:text-red-500" />
                      </button>
                    ),
                  },
                ]}
                data={transactions}
                keyExtractor={(t: FeeTransaction) => t.id}
                loading={txLoading || txSummaryLoading}
                pagination={{
                  page: Math.floor(txSkip / txTake) + 1,
                  totalPages: Math.ceil(txTotal / txTake) || 1,
                  total: txTotal,
                  pageSize: txTake,
                  pageSizeOptions: [10, 20, 30, 50, 100],
                  onPageChange: (page: number) =>
                    setTxSkip((page - 1) * txTake),
                  onPageSizeChange: (size: number) => {
                    setTxTake(size);
                    setTxSkip(0);
                  },
                }}
                emptyMessage="No transactions yet. Use ‘New Transaction’ to record a teacher-to-admin handover."
                emptyIcon={ArrowRightLeft}
                mobileRender={(t: FeeTransaction) => (
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 bg-blue-100 text-blue-700">
                        {t.teacher.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {t.teacher.name} → {t.admin.name}
                        </p>
                        <p className="text-xs text-gray-400">
                          {t.feeType.name} ·{" "}
                          {new Date(t.date).toLocaleDateString("en-GB")}
                        </p>
                      </div>
                      <div className="text-right shrink-0 flex items-center gap-1.5">
                        <span className="text-sm font-bold text-emerald-700">
                          ₹{Number(t.amount).toLocaleString()}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletingTx(t.id);
                          }}
                          className="p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-gray-400" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              />
            </div>
          )}

          {/* ── Reports tab ── */}
          {tab === "reports" && (
            <div className="space-y-4">
              {/* Filters */}
              <div className="flex flex-wrap gap-2">
                <select
                  value={reportClassId}
                  onChange={(e) => setReportClassId(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white"
                >
                  <option value="">All Classes</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {reportPayLoading ? (
                <div className="flex items-center justify-center gap-2 py-12 text-gray-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                </div>
              ) : (
                <>
                  {/* Summary cards */}
                  {(() => {
                    const totalDue = reportPayments.reduce(
                      (s, p) => s + Number(p.dueAmount),
                      0,
                    );
                    const totalPaid = reportPayments.reduce(
                      (s, p) => s + Number(p.paidAmount ?? 0),
                      0,
                    );
                    const totalPending = reportPayments
                      .filter(
                        (p) => p.status === "PENDING" || p.status === "OVERDUE",
                      )
                      .reduce(
                        (s, p) =>
                          s + Number(p.dueAmount) - Number(p.paidAmount ?? 0),
                        0,
                      );
                    const paidCount = reportPayments.filter(
                      (p) => p.status === "PAID",
                    ).length;
                    const pendingCount = reportPayments.filter(
                      (p) => p.status === "PENDING" || p.status === "OVERDUE",
                    ).length;
                    const waivedCount = reportPayments.filter(
                      (p) => p.status === "WAIVED",
                    ).length;
                    return (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100">
                          <p className="text-xs text-emerald-600 font-semibold">
                            Collected
                          </p>
                          <p className="text-lg font-bold text-emerald-800 mt-1">
                            ₹{totalPaid.toLocaleString()}
                          </p>
                          <p className="text-[10px] text-emerald-500 mt-0.5">
                            {paidCount} students
                          </p>
                        </div>
                        <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100">
                          <p className="text-xs text-amber-600 font-semibold">
                            Pending
                          </p>
                          <p className="text-lg font-bold text-amber-800 mt-1">
                            ₹{totalPending.toLocaleString()}
                          </p>
                          <p className="text-[10px] text-amber-500 mt-0.5">
                            {pendingCount} students
                          </p>
                        </div>
                        <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                          <p className="text-xs text-gray-600 font-semibold">
                            Total Due
                          </p>
                          <p className="text-lg font-bold text-gray-800 mt-1">
                            ₹{totalDue.toLocaleString()}
                          </p>
                          <p className="text-[10px] text-gray-500 mt-0.5">
                            {reportPayments.length} records
                          </p>
                        </div>
                        <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                          <p className="text-xs text-gray-600 font-semibold">
                            Waived
                          </p>
                          <p className="text-lg font-bold text-gray-800 mt-1">
                            {waivedCount}
                          </p>
                          <p className="text-[10px] text-gray-500 mt-0.5">
                            cancelled
                          </p>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Student list by status */}
                  <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                      <p className="text-sm font-bold text-gray-900">
                        Students
                      </p>
                      <p className="text-xs text-gray-400">
                        {reportPayments.length} records
                      </p>
                    </div>
                    {reportPayments.length === 0 ? (
                      <div className="text-center py-10 text-gray-400 text-sm">
                        No payments found
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-50">
                        {reportPayments.map((p) => (
                          <div
                            key={p.id}
                            className="flex items-center gap-3 px-4 py-3"
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
                            fill="#059669"
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
                                        ? "bg-emerald-500"
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

      {/* Cancel fee modal */}
      <AnimatePresence>
        {cancellingPayment && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
              onClick={() => setCancelling(null)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              onClick={() => setCancelling(null)}
            >
              <div
                className="bg-white rounded-2xl sm:rounded-3xl w-full max-w-sm shadow-xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="bg-red-50 px-5 py-4 border-b border-red-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                      <XCircle className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">
                        Cancel Fee Payment
                      </p>
                      <p className="text-xs text-gray-500">
                        This action will mark the payment as waived
                      </p>
                    </div>
                  </div>
                </div>
                <div className="px-5 py-4 space-y-3">
                  <div className="bg-gray-50 rounded-xl p-3 space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Student</span>
                      <span className="font-semibold text-gray-900">
                        {cancellingPayment.student.name}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Adm No</span>
                      <span className="font-semibold text-gray-900">
                        {cancellingPayment.student.adno}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Fee Type</span>
                      <span className="font-semibold text-gray-900">
                        {cancellingPayment.feeType.name}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Amount</span>
                      <span className="font-semibold text-gray-900">
                        ₹
                        {Number(
                          cancellingPayment.paidAmount ??
                            cancellingPayment.dueAmount,
                        ).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Status</span>
                      <span className="font-semibold text-amber-600">
                        {cancellingPayment.status}
                      </span>
                    </div>
                  </div>
                  <input
                    type="text"
                    value={cancellingNote}
                    onChange={(e) => setCancellingNote(e.target.value)}
                    placeholder="Reason for cancellation (optional)"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-red-400"
                  />
                </div>
                <div className="px-5 pb-5 flex gap-2">
                  <button
                    onClick={() => {
                      setCancelling(null);
                      setCancellingNote("");
                    }}
                    className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600"
                  >
                    Keep
                  </button>
                  <button
                    onClick={() => cancelPayment(cancellingPayment)}
                    disabled={cancellingSave}
                    className="flex-1 py-3 rounded-xl bg-red-600 text-white text-sm font-bold disabled:opacity-60 flex items-center justify-center gap-1.5"
                  >
                    {cancellingSave ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <XCircle className="w-4 h-4" />
                    )}
                    Confirm Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* New transaction modal */}
      <AnimatePresence>
        {txCreating && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
              onClick={() => setTxCreating(false)}
            />
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed inset-x-0 bottom-0 z-50 sm:inset-0 sm:flex sm:items-center sm:justify-center sm:p-4"
              onClick={() => setTxCreating(false)}
            >
              <div
                className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md shadow-xl overflow-hidden max-h-[90vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="sm:hidden flex justify-center pt-2 pb-1 bg-emerald-600">
                  <div className="w-10 h-1.5 rounded-full bg-gray-200" />
                </div>
                <div className="bg-emerald-600 px-5 py-4 text-white">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                      <ArrowRightLeft className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-bold">
                        New Teacher → Admin Transaction
                      </p>
                      <p className="text-xs text-emerald-50/90">
                        Record an amount handed over by a teacher
                      </p>
                    </div>
                  </div>
                </div>
                <div className="px-5 py-4 space-y-3 overflow-y-auto flex-1">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">
                        Amount
                      </label>
                      <input
                        type="number"
                        value={txForm.amount}
                        onChange={(e) =>
                          setTxForm((f) => ({ ...f, amount: e.target.value }))
                        }
                        placeholder="0"
                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">
                        Date
                      </label>
                      <input
                        type="date"
                        value={txForm.date}
                        onChange={(e) =>
                          setTxForm((f) => ({ ...f, date: e.target.value }))
                        }
                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">
                      Fee Type
                    </label>
                    <select
                      value={txForm.feeTypeId}
                      onChange={(e) =>
                        setTxForm((f) => ({ ...f, feeTypeId: e.target.value }))
                      }
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="">Select fee type…</option>
                      {feeTypes.map((ft) => (
                        <option key={ft.id} value={ft.id}>
                          {ft.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">
                      Teacher
                    </label>
                    <select
                      value={txForm.teacherId}
                      onChange={(e) =>
                        setTxForm((f) => ({ ...f, teacherId: e.target.value }))
                      }
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="">Select teacher…</option>
                      {Object.entries(teachersOnly).map(([id, name]) => (
                        <option key={id} value={id}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-2.5 text-xs text-emerald-800">
                    <span className="font-semibold">Receiving Admin:</span>{" "}
                    {user?.name ?? "You"}{" "}
                    <span className="text-emerald-600/80">
                      (this device's logged-in admin)
                    </span>
                  </div>
                  {txFormError && (
                    <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">
                      {txFormError}
                    </p>
                  )}
                </div>
                <div className="px-5 pb-5 pt-3 flex gap-2 border-t border-gray-100">
                  <button
                    onClick={() => setTxCreating(false)}
                    className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      const amt = Number(txForm.amount);
                      if (!amt || amt <= 0) {
                        setTxFormError("Enter a valid amount");
                        return;
                      }
                      if (!txForm.feeTypeId) {
                        setTxFormError("Select a fee type");
                        return;
                      }
                      if (!txForm.teacherId) {
                        setTxFormError("Select a teacher");
                        return;
                      }
                      if (!user?.id) {
                        setTxFormError("Unable to identify current admin");
                        return;
                      }
                      if (txForm.teacherId === user.id) {
                        setTxFormError(
                          "Teacher cannot be the same as the receiving admin",
                        );
                        return;
                      }
                      try {
                        await createFeeTransaction(cid, token, {
                          amount: amt,
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
                      }
                    }}
                    className="flex-1 py-3 rounded-xl bg-emerald-600 text-white text-sm font-bold flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle className="w-4 h-4" /> Save Transaction
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Delete transaction modal */}
      <AnimatePresence>
        {deletingTx && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
              onClick={() => setDeletingTx(null)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              onClick={() => setDeletingTx(null)}
            >
              <div
                className="bg-white rounded-2xl sm:rounded-3xl w-full max-w-sm shadow-xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="bg-red-50 px-5 py-4 border-b border-red-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                      <Trash2 className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">
                        Delete Transaction
                      </p>
                      <p className="text-xs text-gray-500">
                        This action cannot be undone
                      </p>
                    </div>
                  </div>
                </div>
                <div className="px-5 py-4 space-y-3">
                  {(() => {
                    const tx = transactions.find((t) => t.id === deletingTx);
                    if (!tx) return null;
                    return (
                      <div className="bg-gray-50 rounded-xl p-3 space-y-1.5">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Amount</span>
                          <span className="font-bold text-gray-900">
                            ₹{Number(tx.amount).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Fee Type</span>
                          <span className="font-semibold text-gray-900">
                            {tx.feeType.name}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">From</span>
                          <span className="font-semibold text-gray-900">
                            {tx.teacher.name}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">To</span>
                          <span className="font-semibold text-gray-900">
                            {tx.admin.name}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Date</span>
                          <span className="font-semibold text-gray-900">
                            {new Date(tx.date).toLocaleDateString("en-GB")}
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
                <div className="px-5 pb-5 flex gap-2">
                  <button
                    onClick={() => setDeletingTx(null)}
                    className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
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
                    }}
                    disabled={deletingTxSave}
                    className="flex-1 py-3 rounded-xl bg-red-600 text-white text-sm font-bold disabled:opacity-60 flex items-center justify-center gap-1.5"
                  >
                    {deletingTxSave ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                    Delete
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
