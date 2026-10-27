import { useState, useEffect, useCallback, useRef } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { ApiErrorBanner } from "@/components/ui/ApiErrorBanner";
import { Skeleton } from "@/components/ui/Skeleton";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { PaymentMethodPicker } from "@/components/teacher/PaymentMethodPicker";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  getFeeTypes,
  getPayments,
  recordPayment,
  updatePayment,
  getPaymentReceipt,
  cancelPayment as cancelPaymentApi,
  undoCancelPayment as undoCancelPaymentApi,
  type FeeType,
  type FeePayment,
  type ReceiptData,
  type FeePaymentStatus,
} from "@/lib/fees-api";
import { useAuthStore } from "@/store/auth";
import { useActiveClass } from "@/store/activeClass";
import { useLanguageStore } from "@/store/language";
import { t, type Lang } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import {
  Loader2,
  Receipt,
  Search,
  Printer,
  SlidersHorizontal,
  IndianRupee,
  Clock3,
  CircleCheck,
  CircleX,
} from "lucide-react";
import { motion } from "framer-motion";

function getStatusMeta(
  lang: Lang,
): Record<FeePaymentStatus, { label: string; color: string; bg: string }> {
  return {
    PENDING: {
      label: t("common", "pending", lang),
      color: "text-amber-700",
      bg: "bg-amber-50",
    },
    PAID: {
      label: t("common", "paid", lang),
      color: "text-primary-700",
      bg: "bg-primary-50",
    },
    PARTIAL: {
      label: t("teacherPages", "partialLabel", lang),
      color: "text-blue-700",
      bg: "bg-blue-50",
    },
    OVERDUE: {
      label: t("teacherPages", "overdueLabel", lang),
      color: "text-red-700",
      bg: "bg-red-50",
    },
    WAIVED: { label: "Waived", color: "text-gray-500", bg: "bg-gray-100" },
  };
}

function toLocalDateOnly(value: string): string {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function feePageItems(current: number, total: number): Array<number | "ellipsis"> {
  const pages = [...new Set([1, total, current - 1, current, current + 1])]
    .filter((page) => page >= 1 && page <= total)
    .sort((a, b) => a - b);
  const items: Array<number | "ellipsis"> = [];

  pages.forEach((page, index) => {
    const previous = pages[index - 1];
    if (previous && page - previous === 2) items.push(previous + 1);
    if (previous && page - previous > 2) items.push("ellipsis");
    items.push(page);
  });

  return items;
}

function FeeSemiCircle({
  segments,
  value,
  label,
  description,
}: {
  segments: { value: number; color: string }[];
  value: string;
  label: string;
  description: string;
}) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  let position = 0;
  const point = (fraction: number) => {
    const angle = Math.PI * (1 - fraction);
    return [100 + 78 * Math.cos(angle), 94 - 78 * Math.sin(angle)];
  };

  return (
    <svg viewBox="0 0 200 108" role="img" aria-label={description} className="mx-auto h-24 w-full max-w-52 sm:h-28">
      <path d="M 22 94 A 78 78 0 0 1 178 94" fill="none" stroke="#e5e7eb" strokeWidth="17" strokeLinecap="round" />
      {total > 0 && segments.map((segment, index) => {
        const start = position;
        position += segment.value / total;
        if (segment.value <= 0) return null;
        const [x1, y1] = point(start);
        const [x2, y2] = point(position);
        return (
          <path
            key={index}
            d={`M ${x1} ${y1} A 78 78 0 0 1 ${x2} ${y2}`}
            fill="none"
            stroke={segment.color}
            strokeWidth="17"
          />
        );
      })}
      <text x="100" y="72" textAnchor="middle" className="fill-gray-950 text-[23px] font-semibold">{value}</text>
      <text x="100" y="89" textAnchor="middle" className="fill-gray-500 text-[10px] font-medium">{label}</text>
    </svg>
  );
}

function FeeStats({
  payments,
  total,
  feeType,
  status,
  search,
  lang,
}: {
  payments: FeePayment[];
  total: number;
  feeType: string;
  status: string;
  search: string;
  lang: Lang;
}) {
  const amountPaid = (payment: FeePayment) =>
    Number(payment.paidAmount ?? (payment.status === "PAID" ? payment.dueAmount : 0));
  const paid = payments.filter((payment) => payment.status === "PAID").length;
  const overdue = payments.filter((payment) => payment.status === "OVERDUE").length;
  const waived = payments.filter((payment) => payment.status === "WAIVED").length;
  const pending = payments.length - paid - overdue - waived;
  const collected = payments.reduce(
    (sum, payment) =>
      payment.status === "WAIVED" ? sum : sum + amountPaid(payment),
    0,
  );
  const paidAmount = payments.reduce(
    (sum, payment) =>
      payment.status === "PAID" ? sum + amountPaid(payment) : sum,
    0,
  );
  const outstanding = payments.reduce(
    (sum, payment) =>
      payment.status === "WAIVED"
        ? sum
        : sum + Math.max(0, Number(payment.dueAmount) - amountPaid(payment)),
    0,
  );
  const overdueAmount = payments.reduce(
    (sum, payment) =>
      payment.status === "OVERDUE"
        ? sum + Math.max(0, Number(payment.dueAmount) - amountPaid(payment))
        : sum,
    0,
  );
  const waivedAmount = payments.reduce(
    (sum, payment) =>
      payment.status === "WAIVED" ? sum + Number(payment.dueAmount) : sum,
    0,
  );
  const pendingAmount = Math.max(0, outstanding - overdueAmount);
  const collectionRate = collected + outstanding > 0
    ? Math.round((collected / (collected + outstanding)) * 100)
    : 0;
  const formatAmount = (amount: number) => `₹${amount.toLocaleString("en-IN")}`;
  const stats = [
    {
      label: t("common", "paid", lang),
      value: paid,
      detail: t("teacherPages", "feeStatsPaidAmount", lang).replace("{amount}", formatAmount(paidAmount)),
      icon: CircleCheck,
      color: "text-primary-700",
    },
    {
      label: t("teacherPages", "feeStatsOverdue", lang),
      value: overdue,
      detail: t("teacherPages", "feeStatsOverdueAmount", lang).replace("{amount}", formatAmount(overdueAmount)),
      icon: Clock3,
      color: "text-red-700",
    },
    {
      label: t("teacherPages", "feeStatsWaived", lang),
      value: waived,
      detail: t("teacherPages", "feeStatsWaivedAmount", lang).replace("{amount}", formatAmount(waivedAmount)),
      icon: CircleX,
      color: "text-gray-600",
    },
    {
      label: t("teacherPages", "feeStatsPending", lang),
      value: pending,
      detail: t("teacherPages", "feeStatsPendingAmount", lang).replace("{amount}", formatAmount(pendingAmount)),
      icon: Clock3,
      color: "text-amber-700",
    },
    {
      label: t("teacherPages", "feeStatsCollected", lang),
      value: formatAmount(collected),
      detail: t("teacherPages", "feeStatsAmount", lang),
      icon: IndianRupee,
      color: "text-primary-700",
    },
    {
      label: t("teacherPages", "feeStatsToCollect", lang),
      value: formatAmount(outstanding),
      detail: t("teacherPages", "feeStatsAmount", lang),
      icon: Clock3,
      color: "text-amber-700",
    },
  ];

  return (
    <section className="  mb-4  overflow-hidden rounded-2xl bg-gradient-to-br from-white    to-sky-50">
      <div className="border-b border-gray-100   px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-semibold tabular-nums text-gray-950">{total}</span>
            <span className="text-xs font-medium text-gray-600">
              {t("teacherPages", "feeResultsTotal", lang)}
            </span>
          </div>
          <span className="rounded-full border border-primary-100 bg-primary-50 px-2.5 py-1 text-xs font-medium text-primary-700">
            <strong className="tabular-nums">{payments.length}</strong>{" "}
            {t("teacherPages", "feeResultsShown", lang)}
          </span>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-medium">
          <span className="max-w-full truncate rounded-full bg-white px-2.5 py-1 text-gray-700 ring-1 ring-gray-200">
            {t("parentPages", "feeTypeLabel", lang)}: {feeType}
          </span>
          <span className="max-w-full truncate rounded-full bg-white px-2.5 py-1 text-gray-700 ring-1 ring-gray-200">
            {t("common", "status", lang)}: {status}
          </span>
          {search.trim() && (
            <span className="max-w-full truncate rounded-full bg-white px-2.5 py-1 text-gray-700 ring-1 ring-gray-200">
              {t("teacherPages", "feeResultsSearch", lang)}: {search.trim()}
            </span>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-px bg-gray-100">
        <div className="min-w-0 bg-white/90 p-3 text-center sm:p-4">
          <h3 className="text-xs font-semibold text-gray-700">{t("teacherPages", "feeStatsCollectionRate", lang)}</h3>
          <FeeSemiCircle
            segments={[{ value: collected, color: "#059669" }, { value: outstanding, color: "#f59e0b" }]}
            value={`${collectionRate}%`}
            label={t("teacherPages", "feeStatsCollected", lang)}
            description={`${t("teacherPages", "feeStatsCollectionRate", lang)}: ${collectionRate}%`}
          />
          <div className="flex justify-center gap-3 text-[11px] text-gray-600">
            <span><span className="mr-1 inline-block size-2 rounded-full bg-emerald-600" />{t("teacherPages", "feeStatsCollected", lang)}</span>
            <span><span className="mr-1 inline-block size-2 rounded-full bg-amber-500" />{t("teacherPages", "feeStatsToCollect", lang)}</span>
          </div>
        </div>
        <div className="min-w-0 bg-white/90 p-3 text-center sm:p-4">
          <h3 className="text-xs font-semibold text-gray-700">{t("teacherPages", "feeStatsPaymentStatus", lang)}</h3>
          <FeeSemiCircle
            segments={[
              { value: paid, color: "#059669" },
              { value: overdue, color: "#dc2626" },
              { value: pending, color: "#f59e0b" },
              { value: waived, color: "#9ca3af" },
            ]}
            value={String(payments.length)}
            label={t("teacherPages", "feeStatsPayments", lang)}
            description={t("teacherPages", "feeStatsPaymentStatus", lang)}
          />
          <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-[11px] text-gray-600">
            {[
              [t("common", "paid", lang), "bg-emerald-600"],
              [t("teacherPages", "feeStatsOverdue", lang), "bg-red-600"],
              [t("teacherPages", "feeStatsPending", lang), "bg-amber-500"],
              [t("teacherPages", "feeStatsWaived", lang), "bg-gray-400"],
            ].map(([label, color]) => (
              <span key={label}><span className={cn("mr-1 inline-block size-2 rounded-full", color)} />{label}</span>
            ))}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-px border-t border-gray-100 bg-gray-100 sm:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="min-w-0 bg-white/90 p-3 sm:p-4">
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-gray-600">
                <Icon aria-hidden="true" className={cn("h-3.5 w-3.5 shrink-0", stat.color)} />
                <span>{stat.label}</span>
              </div>
              <div className="mt-2 text-base font-semibold tabular-nums text-gray-950 sm:text-lg">{stat.value}</div>
              <div className="mt-1 text-[11px] text-gray-500">{stat.detail}</div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ReceiptModal({
  receipt,
  onClose,
}: {
  receipt: ReceiptData;
  onClose: () => void;
}) {
  const { lang } = useLanguageStore();
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
        <div className="bg-primary-600 px-6 py-5 text-white text-center">
          <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-2">
            <Receipt className="w-6 h-6 text-white" />
          </div>
          <p className="font-bold text-lg">{receipt.client.name}</p>
          <p className="text-primary-100 text-xs uppercase tracking-widest mt-0.5">
            {t("teacherPages", "feeReceiptTitle", lang)}
          </p>
        </div>
        <div className="px-6 py-5 space-y-2.5">
          {(
            [
              [
                t("teacherPages", "receiptNoLabel", lang),
                receipt.reference ?? receipt.id.slice(0, 8).toUpperCase(),
              ],
              [t("common", "name", lang), receipt.student.name],
              [t("parentPages", "admNoLabel", lang), receipt.student.adno],
              [t("common", "class", lang), receipt.student.class?.name ?? "—"],
              [t("parentPages", "feeTypeLabel", lang), receipt.feeType.name],
              [
                t("teacherPages", "paidOnLabel", lang),
                receipt.paidAt
                  ? new Date(receipt.paidAt).toLocaleDateString("en-GB")
                  : "—",
              ],
              [t("parentPages", "methodLabel", lang), receipt.method ?? "—"],
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
            <p className="font-bold text-gray-900">
              {t("teacherPages", "amountPaidLabel", lang)}
            </p>
            <p className="text-xl font-bold text-primary-600">
              ₹{Number(receipt.paidAmount ?? 0).toLocaleString()}
            </p>
          </div>
        </div>
        <div className="px-6 pb-5 flex gap-2">
          <Button
            variant="ghost"
            onClick={onClose}
            className="flex-1 py-2.5 border rounded-xl text-sm font-semibold text-gray-600"
          >
            {t("common", "close", lang)}
          </Button>
          <Button
            variant="ghost"
            onClick={() => window.print()}
            className="flex-1 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5"
          >
            <Printer className="w-4 h-4" /> {t("common", "print", lang)}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

export default function TeacherFeesPage() {
  const { user, accessToken, activeClientId } = useAuthStore();
  const { lang } = useLanguageStore();
  const STATUS_META = getStatusMeta(lang);
  const cid = activeClientId ?? "";
  const token = accessToken ?? "";
  const { activeClassId } = useActiveClass();

  const [feeTypes, setFeeTypes] = useState<FeeType[]>([]);
  const [activeTypeId, setActiveTypeId] = useState<string | null>(null);
  const [typesLoading, setTypesLoading] = useState(true);

  const [payments, setPayments] = useState<FeePayment[]>([]);
  const [payTotal, setPayTotal] = useState(0);
  const [payLoading, setPayLoading] = useState(false);
  const [paySkip, setPaySkip] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);
  const [payMethod, setPayMethod] = useState("CASH");
  const [payRef, setPayRef] = useState("");
  const [donationAmount, setDonationAmount] = useState("");
  const [saving, setSaving] = useState(false);

  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [loadingReceipt, setLoadingReceipt] = useState<string | null>(null);

  const [cancelling, setCancelling] = useState<string | null>(null);
  const [cancellingNote, setCancellingNote] = useState("");
  const [cancellingSave, setCancellingSave] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const paymentsRequest = useRef<AbortController | null>(null);

  const loadTypes = useCallback(async () => {
    if (!cid || !token || !activeClassId) { setFeeTypes([]); setTypesLoading(false); return; }
    setFeeTypes([]);
    setTypesLoading(true);
    setError(null);
    try {
      setFeeTypes(
        (await getFeeTypes(cid, token, user?.defaultAcademicYearId ?? undefined)).filter((type) => type.targetClassIds.length === 0 || type.targetClassIds.includes(activeClassId)),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setTypesLoading(false);
    }
  }, [cid, token, user?.defaultAcademicYearId, activeClassId]);

  useEffect(() => {
    if (cid && token) loadTypes();
  }, [cid, token, loadTypes]);

  const loadPayments = useCallback(async () => {
    paymentsRequest.current?.abort();
    if (!cid || !token || !activeClassId) {
      setPayments([]);
      setPayTotal(0);
      setPayLoading(false);
      return;
    }
    const controller = new AbortController();
    paymentsRequest.current = controller;
    setPayments([]);
    setPayTotal(0);
    setPayLoading(true);
    try {
      const params = {
        classId: activeClassId,
        feeTypeId: activeTypeId ?? undefined,
        status:
          statusFilter !== "all"
            ? (statusFilter as FeePaymentStatus)
            : undefined,
        take: 200,
        signal: controller.signal,
      };
      const firstPage = await getPayments(cid, token, { ...params, skip: 0 });
      const allPayments = [...firstPage.payments];
      while (allPayments.length < firstPage.total) {
        const nextPage = await getPayments(cid, token, {
          ...params,
          skip: allPayments.length,
        });
        if (nextPage.payments.length === 0) {
          throw new Error("Could not load all payment records");
        }
        allPayments.push(...nextPage.payments);
      }
      if (controller.signal.aborted) return;
      setPayments(allPayments);
      setPayTotal(allPayments.length);
    } catch (e) {
      if (!controller.signal.aborted) setError((e as Error).message);
    } finally {
      if (paymentsRequest.current === controller) setPayLoading(false);
    }
  }, [cid, token, activeClassId, activeTypeId, statusFilter]);

  useEffect(() => {
    loadPayments();
    return () => paymentsRequest.current?.abort();
  }, [loadPayments]);

  const selectType = (id: string | null) => {
    setActiveTypeId(id);
    setPaySkip(0);
    setStatusFilter("all");
    setSearch("");
  };

  const activeType = feeTypes.find((f) => f.id === activeTypeId) ?? null;

  const searchTerm = search.trim().toLowerCase();
  const filtered = searchTerm
    ? payments.filter(
        (p) =>
          p.student.name.toLowerCase().includes(searchTerm) ||
          p.student.adno.toLowerCase().includes(searchTerm),
      )
    : payments;
  const visiblePayments = filtered.slice(paySkip, paySkip + 30);
  const currentPage = Math.floor(paySkip / 30) + 1;
  const pageCount = Math.ceil(filtered.length / 30);

  useEffect(() => {
    if (!payLoading && paySkip >= filtered.length && paySkip > 0) {
      setPaySkip(Math.max(0, Math.ceil(filtered.length / 30) - 1) * 30);
    }
  }, [filtered.length, payLoading, paySkip]);

  const markPaid = async (p: FeePayment) => {
    setSaving(true);
    try {
      const amount = p.feeType.isDonation
        ? Number(donationAmount)
        : Number(p.dueAmount);
      if (!amount || amount <= 0) {
        setError("Enter a donation amount greater than zero");
        return;
      }
      const paymentData = {
        paidAmount: amount,
        ...(p.feeType.isDonation ? { dueAmount: amount } : {}),
        method: payMethod as any,
        reference: payRef || undefined,
        status: "PAID" as const,
      };
      if (p.virtual) {
        await recordPayment(cid, token, {
          ...paymentData,
          studentId: p.student.id,
          feeTypeId: p.feeType.id,
          dueAmount: p.feeType.isDonation ? amount : Number(p.dueAmount),
          dueDate: toLocalDateOnly(p.dueDate),
          academicYearId: p.academicYearId ?? user?.defaultAcademicYearId ?? undefined,
        });
      } else {
        await updatePayment(cid, token, p.id, {
          ...paymentData,
          paidAt: new Date().toISOString(),
        });
      }
      setSelectedPaymentId(null);
      setPayRef("");
      setDonationAmount("");
      loadPayments();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
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

  const cancelPayment = async (p: FeePayment) => {
    setCancellingSave(true);
    try {
      let cancelledPayment: FeePayment;
      if (p.virtual) {
        const persistedPayment = await recordPayment(cid, token, {
          studentId: p.student.id,
          feeTypeId: p.feeType.id,
          paidAmount: 0,
          dueAmount: Number(p.dueAmount),
          dueDate: toLocalDateOnly(p.dueDate),
          status: "PENDING",
          academicYearId: p.academicYearId ?? user?.defaultAcademicYearId ?? undefined,
        });
        cancelledPayment = await cancelPaymentApi(
          cid,
          token,
          persistedPayment.id,
          cancellingNote || undefined,
        );
      } else {
        cancelledPayment = await cancelPaymentApi(
          cid,
          token,
          p.id,
          cancellingNote || undefined,
        );
      }
      setCancelling(null);
      setCancellingNote("");
      setSelectedPaymentId(null);
      await loadPayments();
      const dateKey = toLocalDateOnly;
      setPayments((current) =>
        current.map((payment) => {
          const isSamePayment =
            payment.id === p.id ||
            payment.id === cancelledPayment.id ||
            (payment.student.id === p.student.id &&
              payment.feeType.id === p.feeType.id &&
              dateKey(payment.dueDate) === dateKey(p.dueDate));
          return isSamePayment
            ? { ...payment, ...cancelledPayment, virtual: false }
            : payment;
        }),
      );
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
      setSelectedPaymentId(null);
      loadPayments();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setCancellingSave(false);
    }
  };

  const selectedPayment = selectedPaymentId
    ? (payments.find((p) => p.id === selectedPaymentId) ?? null)
    : null;

  return (
    <DashboardLayout>
      <PageHeader title={t("teacherPages", "feesPaymentsTitle", lang)} />

      <Drawer open={filtersOpen} onOpenChange={setFiltersOpen} swipeDirection="down">
        <div className="   pt-4! pb-2!">
          <div className="mx-auto flex w-full max-w-md items-center gap-2 p-1.5">
            <InputGroup className="h-10 flex-1 rounded-lg bg-white">
              <InputGroupInput
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPaySkip(0);
                }}
                placeholder={t("teacherPages", "searchStudentName", lang)}
                aria-label={t("teacherPages", "searchStudentName", lang)}
                className="h-full text-sm"
              />
              <InputGroupAddon align="inline-start">
                <Search className="h-4 w-4 text-gray-400" />
              </InputGroupAddon>
            </InputGroup>
            <Button
              variant="outline"
              type="button"
              size="icon-lg"
              onClick={() => setFiltersOpen(true)}
              className="h-10 w-10 shrink-0 rounded-xl text-gray-600 hover:bg-gray-100"
              aria-label="Open filters"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </Button>
          </div>
        </div>

      <DrawerContent className="max-h-[85dvh] bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]" aria-label="Fee filters">
              <div className="flex items-center justify-between mb-6">
                <DrawerTitle className="text-lg font-bold text-gray-900">Filters</DrawerTitle>
              </div>
              <section className="mb-6">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">{t("teacherPages", "allFeeTypes", lang)}</h3>
                <div className="-mx-5 overflow-x-auto px-5">
                  <div className="flex w-max gap-2">
                    {[{ id: null, name: t("teacherPages", "allFeesBtn", lang) }, ...feeTypes.map((ft) => ({ id: ft.id, name: ft.name }))].map((type) => (
                      <Button
                        variant="ghost"
                        key={type.id ?? "all"}
                        onClick={() => selectType(type.id)}
                        className={cn(
                          "h-9 shrink-0 rounded-full border px-4 text-sm font-medium transition-colors",
                          activeTypeId === type.id
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-background text-foreground hover:bg-muted",
                        )}
                      >
                        {type.name}
                      </Button>
                    ))}
                  </div>
                </div>
              </section>
              <section>
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">{t("common", "status", lang)}</h3>
                <Tabs
                  value={statusFilter}
                  onValueChange={(value) => {
                    setStatusFilter(value);
                    setPaySkip(0);
                  }}
                  className="w-full"
                >
                  <TabsList className="grid h-auto w-full grid-cols-4">
                    {(["all", "PAID", "PENDING", "OVERDUE"] as const).map((s) => (
                      <TabsTrigger key={s} value={s} className="px-2 py-2 text-xs">
                        {s === "all" ? t("common", "all", lang) : STATUS_META[s as FeePaymentStatus].label}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
              </section>
              <DrawerClose className="mt-8 w-full h-10 rounded-xl bg-primary-600 text-white text-sm font-semibold">Done</DrawerClose>
      </DrawerContent>
      </Drawer>

      {error && <ApiErrorBanner message={error} onRetry={loadPayments} />}

      {typesLoading ? (
        <div data-ui-style="classic" className="card p-0! mx-3 divide-y divide-gray-100 overflow-hidden rounded-2xl bg-white shadow-none">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="w-2/3 space-y-2">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
              <Skeleton className="mt-4 h-4 w-1/2" />
            </div>
          ))}
        </div>
      ) : (
        <>
          {payLoading ? (
            <div className="flex items-center justify-center py-10 text-gray-400">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
          ) : (
            <>
              <div className="p-0! px-4! pt-2!">
                <FeeStats
                  payments={filtered}
                  total={payTotal}
                  feeType={activeType?.name ?? t("teacherPages", "allFeesBtn", lang)}
                  status={statusFilter === "all" ? t("common", "all", lang) : (STATUS_META[statusFilter as FeePaymentStatus]?.label ?? statusFilter)}
                  search={search}
                  lang={lang}
                />
              </div>
              <div data-ui-style="classic" className="card mx-3 divide-y p-0! divide-gray-100 overflow-hidden rounded-2xl bg-white shadow-none">
                {filtered.length === 0 ? (
                  <div className="px-4 py-12 text-center text-sm text-muted-foreground">
                    {t("teacherPages", "noPaymentRecords", lang)}
                  </div>
                ) : (
                  visiblePayments.map((payment) => {
                    const meta = STATUS_META[payment.status] ?? STATUS_META.PENDING;
                    const isPaid = payment.status === "PAID";
                    return (
                      <button
                        type="button"
                        key={payment.id}
                        aria-label={`${payment.student.name}, ${payment.feeType.name}, ${meta.label}`}
                        onClick={() => {
                          setSelectedPaymentId(payment.id);
                          setPayMethod(payment.method ?? "CASH");
                          setPayRef(payment.reference ?? "");
                          setDonationAmount(
                            payment.feeType.isDonation && Number(payment.dueAmount) > 0
                              ? String(payment.dueAmount)
                              : "",
                          );
                          setCancelling(null);
                        }}
                        className="w-full rounded-none p-4 text-left transition-colors hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary-500"
                      >
                        <span className="flex items-start justify-between gap-3">
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold text-gray-900">{payment.student.name}</span>
                            <span className="block text-xs text-gray-500">
                              {payment.student.adno}
                              {payment.student.class ? ` · ${payment.student.class.name}` : ""}
                            </span>
                          </span>
                          <span className={cn("inline-flex shrink-0 rounded-full px-2.5 py-1 text-xs font-medium", meta.bg, meta.color)}>
                            {meta.label}
                          </span>
                        </span>
                        <span className="mt-3 flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
                          <span className="min-w-0">
                            <span className="block text-xs text-gray-500">{payment.feeType.name}</span>
                            <span className="block text-sm font-semibold text-gray-900">
                              {payment.feeType.isDonation
                                ? "Variable"
                                : `₹${Number(payment.dueAmount).toLocaleString()}`}
                            </span>
                          </span>
                          <span className="text-right text-xs text-gray-500">
                            <span className="block">{isPaid && payment.paidAt ? t("teacherPages", "paidOnLabel", lang) : t("parentPages", "duePrefix", lang)}</span>
                            <span className="block">
                              {isPaid && payment.paidAt
                                ? new Date(payment.paidAt).toLocaleDateString("en-GB")
                                : payment.dueDate
                                  ? new Date(payment.dueDate).toLocaleDateString("en-GB")
                                  : "—"}
                            </span>
                          </span>
                        </span>
                      </button>
                    );
                  })
                )}
              </div>

              {filtered.length > 30 && (
                <div className="mx-3 mt-4 rounded-2xl border border-gray-100  px-3 py-3">
                  <p className="text-center text-xs tabular-nums text-gray-500">
                    {t("teacherPages", "pageOfTotal", lang)
                      .replace("{start}", String(paySkip + 1))
                      .replace("{end}", String(Math.min(paySkip + 30, filtered.length)))
                      .replace("{total}", String(filtered.length))}
                  </p>
                  <Pagination className="mt-2" aria-label={t("teacherPages", "feePaginationLabel", lang)}>
                    <PaginationContent className="gap-1">
                      <PaginationItem>
                        <PaginationPrevious
                          href="#"
                          text={t("teacherPages", "prevBtn", lang)}
                          aria-label={t("teacherPages", "feePreviousPage", lang)}
                          aria-disabled={currentPage === 1}
                          tabIndex={currentPage === 1 ? -1 : undefined}
                          className={cn("rounded-lg", currentPage === 1 && "pointer-events-none opacity-40")}
                          onClick={(event) => {
                            event.preventDefault();
                            if (currentPage > 1) setPaySkip((currentPage - 2) * 30);
                          }}
                        />
                      </PaginationItem>
                      {feePageItems(currentPage, pageCount).map((item, index) => (
                        <PaginationItem
                          key={item === "ellipsis" ? `ellipsis-${index}` : item}
                          className={
                            item !== "ellipsis" && pageCount > 5 && item !== 1 && item !== currentPage && item !== pageCount
                              ? "hidden sm:block"
                              : undefined
                          }
                        >
                          {item === "ellipsis" ? (
                            <PaginationEllipsis />
                          ) : (
                            <PaginationLink
                              href="#"
                              isActive={item === currentPage}
                              aria-label={t("teacherPages", "feeGoToPage", lang).replace("{page}", String(item))}
                              className={cn("rounded-lg", item === currentPage && "border-primary-200 bg-primary-50 text-primary-700")}
                              onClick={(event) => {
                                event.preventDefault();
                                setPaySkip((item - 1) * 30);
                              }}
                            >
                              {item}
                            </PaginationLink>
                          )}
                        </PaginationItem>
                      ))}
                      <PaginationItem>
                        <PaginationNext
                          href="#"
                          text={t("teacherPages", "nextBtn", lang)}
                          aria-label={t("teacherPages", "feeNextPage", lang)}
                          aria-disabled={currentPage === pageCount}
                          tabIndex={currentPage === pageCount ? -1 : undefined}
                          className={cn("rounded-lg", currentPage === pageCount && "pointer-events-none opacity-40")}
                          onClick={(event) => {
                            event.preventDefault();
                            if (currentPage < pageCount) setPaySkip(currentPage * 30);
                          }}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </>
          )}
        </>
      )}

      {receipt && (
        <ReceiptModal receipt={receipt} onClose={() => setReceipt(null)} />
      )}

      <Drawer
        open={selectedPayment !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedPaymentId(null);
            setCancelling(null);
            setCancellingNote("");
          }
        }}
        swipeDirection="down"
      >
        <DrawerContent className="max-h-[88dvh] bg-background">
          {selectedPayment && (
            <>
              <div className="shrink-0 border-b px-5 py-4">
                <DrawerTitle className="text-lg font-semibold">
                  {selectedPayment.student.name}
                </DrawerTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  {selectedPayment.student.adno}
                  {selectedPayment.student.class
                    ? ` · ${selectedPayment.student.class.name}`
                    : ""}
                </p>
              </div>

              <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
                <dl className="grid grid-cols-2 gap-x-4 gap-y-4 text-sm">
                  <div>
                    <dt className="text-muted-foreground">{t("parentPages", "feeTypeLabel", lang)}</dt>
                    <dd className="mt-1 font-medium">{selectedPayment.feeType.name}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">{t("common", "status", lang)}</dt>
                    <dd className="mt-1">
                      <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-medium", (STATUS_META[selectedPayment.status] ?? STATUS_META.PENDING).bg, (STATUS_META[selectedPayment.status] ?? STATUS_META.PENDING).color)}>
                        {(STATUS_META[selectedPayment.status] ?? STATUS_META.PENDING).label}
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">{t("common", "amount", lang)}</dt>
                    <dd className="mt-1 font-medium">
                      ₹{Number(selectedPayment.dueAmount).toLocaleString()}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">{t("teacherPages", "amountPaidLabel", lang)}</dt>
                    <dd className="mt-1 font-medium">
                      ₹{Number(selectedPayment.paidAmount ?? 0).toLocaleString()}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">{t("parentPages", "duePrefix", lang)}</dt>
                    <dd className="mt-1 font-medium">
                      {selectedPayment.dueDate
                        ? new Date(selectedPayment.dueDate).toLocaleDateString("en-GB")
                        : "—"}
                    </dd>
                  </div>
                  {selectedPayment.paidAt && (
                    <div>
                      <dt className="text-muted-foreground">{t("teacherPages", "paidOnLabel", lang)}</dt>
                      <dd className="mt-1 font-medium">
                        {new Date(selectedPayment.paidAt).toLocaleDateString("en-GB")}
                      </dd>
                    </div>
                  )}
                  {selectedPayment.notes && (
                    <div className="col-span-2">
                      <dt className="text-muted-foreground">Notes</dt>
                      <dd className="mt-1 whitespace-pre-wrap font-medium">{selectedPayment.notes}</dd>
                    </div>
                  )}
                </dl>

              </div>

              <DrawerFooter className="shrink-0 bg-background p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                {selectedPayment.status === "WAIVED" ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    className="w-full"
                    disabled={cancellingSave}
                    onClick={() => undoCancel(selectedPayment)}
                  >
                    Undo cancel
                  </Button>
                ) : (
                <div className="space-y-3 rounded-xl border p-3">
                  <h3 className="text-sm font-semibold">
                    {cancelling === selectedPayment.id
                      ? t("teacherPages", "cancelFeeTitle", lang)
                      : "Payment details"}
                  </h3>
                  {cancelling === selectedPayment.id ? (
                    <Textarea
                      size="lg"
                      value={cancellingNote}
                      onChange={(event) => setCancellingNote(event.target.value)}
                      placeholder={t("teacherPages", "reasonForCancel", lang)}
                      rows={3}
                    />
                  ) : (
                    <>
                    {selectedPayment.status !== "PAID" &&
                      selectedPayment.feeType.isDonation &&
                      !cancelling && (
                        <Input
                          type="number"
                          size="lg"
                          min="0.01"
                          step="0.01"
                          value={donationAmount}
                          onChange={(event) => setDonationAmount(event.target.value)}
                          placeholder="Donation amount (₹)"
                        />
                      )}
                    <div className="space-y-3">
                      <PaymentMethodPicker
                        value={
                          selectedPayment.status === "PAID" ||
                          cancelling
                            ? selectedPayment.method ?? ""
                            : payMethod
                        }
                        onChange={setPayMethod}
                        disabled={
                          selectedPayment.status === "PAID" ||
                          !!cancelling
                        }
                      />
                      <Input
                        size="lg"
                        className="w-full"
                        value={
                          selectedPayment.status === "PAID" ||
                          cancelling
                            ? selectedPayment.reference ?? ""
                            : payRef
                        }
                        onChange={(event) => setPayRef(event.target.value)}
                        placeholder={t("teacherPages", "receiptRefPlc", lang)}
                        readOnly={
                          selectedPayment.status === "PAID" ||
                          !!cancelling
                        }
                      />
                    </div>
                    </>
                  )}
                    <ButtonGroup className="w-full [&>button]:flex-1">
                      {cancelling === selectedPayment.id ? (
                        <>
                          <Button
                            type="button"
                            variant="outline"
                            size="lg"
                            onClick={() => {
                              setCancelling(null);
                              setCancellingNote("");
                            }}
                          >
                            {t("common", "back", lang)}
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            size="lg"
                            disabled={cancellingSave}
                            onClick={() => cancelPayment(selectedPayment)}
                          >
                            {t("teacherPages", "confirmCancelBtn", lang)}
                          </Button>
                        </>
                      ) : selectedPayment.status === "PAID" ? (
                        <>
                          <Button
                            type="button"
                            variant="outline"
                            size="lg"
                            onClick={() => showReceiptFor(selectedPayment.id)}
                            disabled={loadingReceipt === selectedPayment.id}
                          >
                            {t("teacherPages", "viewReceiptTitle", lang)}
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            size="lg"
                            onClick={() => {
                              setCancelling(selectedPayment.id);
                              setCancellingNote("");
                            }}
                          >
                            {t("teacherPages", "cancelFeeTitle", lang)}
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            type="button"
                            variant="outline"
                            size="lg"
                            onClick={() => {
                              setCancelling(selectedPayment.id);
                              setCancellingNote("");
                            }}
                          >
                            {t("teacherPages", "cancelFeeTitle", lang)}
                          </Button>
                          <Button
                            type="button"
                            size="lg"
                            disabled={saving}
                            onClick={() => markPaid(selectedPayment)}
                          >
                            {t("teacherPages", "markPaidBtn", lang)}
                          </Button>
                        </>
                      )}
                    </ButtonGroup>
                </div>
                )}
              </DrawerFooter>
            </>
          )}
        </DrawerContent>
      </Drawer>

    </DashboardLayout>
  );
}
