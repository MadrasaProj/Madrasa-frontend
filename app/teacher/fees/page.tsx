import { useState, useEffect, useCallback, useRef } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { IllustratedEmptyState } from "@/components/ui/IllustratedEmptyState";
import { ApiErrorBanner } from "@/components/ui/ApiErrorBanner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { PaymentMethodPicker } from "@/components/teacher/PaymentMethodPicker";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import { ResponsivePopover } from "@/components/ui/responsivePopover";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Drawer,
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
import { getStudents, type StudentRecord } from "@/lib/students-api";
import { useAuthStore } from "@/store/auth";
import { useActiveClass } from "@/store/activeClass";
import { useLanguageStore } from "@/store/language";
import { t, type Lang } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import {
  Loader2,
  Receipt,
  Printer,
  IndianRupee,
  Clock3,
  CircleCheck,
  CircleX,
  AlertCircle,
  ChevronRight,
} from "lucide-react";
import { motion } from "framer-motion";
import { PolarAngleAxis, RadialBar, RadialBarChart } from "recharts";

const feeProgressChartConfig = {
  collected: { color: "#059669" },
} satisfies ChartConfig;

const formatCurrency = (amount: number) => `₹${amount.toLocaleString("en-IN")}`;

function getFrequencyLabel(frequency: string | null, lang: Lang): string | null {
  if (!frequency) return null;
  switch (frequency.toUpperCase()) {
    case "WEEKLY": return t("teacherPages", "feeFrequencyWeekly", lang);
    case "MONTHLY": return t("parentPages", "frequencyMonthly", lang);
    case "QUARTERLY": return t("parentPages", "frequencyQuarterly", lang);
    case "YEARLY": return t("parentPages", "frequencyYearly", lang);
    default: return frequency.charAt(0).toUpperCase() + frequency.slice(1).toLowerCase();
  }
}

function getBillingInterval(dueDate: string, frequency: string | null, lang: Lang) {
  const date = new Date(dueDate);
  if (Number.isNaN(date.getTime())) return { key: dueDate, label: dueDate };

  const locale = lang === "ml" ? "ml-IN" : "en-IN";
  const year = date.getFullYear();
  const month = date.getMonth();
  const monthKey = String(month + 1).padStart(2, "0");
  switch (frequency?.toUpperCase()) {
    case "WEEKLY": {
      const start = new Date(year, month, date.getDate());
      start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      const format = (value: Date) => value.toLocaleDateString(locale, { day: "numeric", month: "short" });
      return {
        key: `W-${toLocalDateOnly(start.toISOString())}`,
        label: `${format(start)} – ${format(end)} ${end.getFullYear()}`,
      };
    }
    case "MONTHLY":
      return {
        key: `${year}-${monthKey}`,
        label: date.toLocaleDateString(locale, { month: "long", year: "numeric" }),
      };
    case "QUARTERLY": {
      const quarterStart = Math.floor(month / 3) * 3;
      const first = new Date(year, quarterStart, 1);
      const last = new Date(year, quarterStart + 2, 1);
      return {
        key: `${year}-Q${Math.floor(month / 3) + 1}`,
        label: `${first.toLocaleDateString(locale, { month: "short" })}–${last.toLocaleDateString(locale, { month: "short" })} ${year}`,
      };
    }
    case "YEARLY":
      return { key: String(year), label: String(year) };
    default:
      return {
        key: toLocalDateOnly(dueDate),
        label: date.toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" }),
      };
  }
}

async function getAllClassStudents(clientId: string, token: string, classId: string, signal: AbortSignal) {
  const students: StudentRecord[] = [];
  const limit = 200;
  let page = 1;
  while (true) {
    const result = await getStudents(clientId, token, { classId, page, limit, signal });
    students.push(...result.data);
    if (result.data.length === 0 || students.length >= result.total) return students;
    page += 1;
  }
}

function FeeTypeProgress({ collected, total, ariaLabel }: { collected: number; total: number; ariaLabel?: string }) {
  const percentage = total > 0 ? Math.min(100, Math.max(0, (collected / total) * 100)) : 0;

  return (
    <div
      className="size-[30px] shrink-0"
      role="img"
      aria-label={ariaLabel ?? (total > 0 ? `${Math.round(percentage)}% collected` : "No amount recorded")}
    >
      <ChartContainer
        config={feeProgressChartConfig}
        initialDimension={{ width: 30, height: 30 }}
        className="!aspect-auto size-[30px]"
        aria-hidden="true"
      >
        <RadialBarChart
          data={[{ value: percentage, fill: "#059669" }]}
          startAngle={90}
          endAngle={-270}
          innerRadius={10}
          outerRadius={14}
        >
          <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
          <RadialBar
            dataKey="value"
            background={{ fill: "#e5e7eb" }}
            cornerRadius={3}
            isAnimationActive={false}
          />
        </RadialBarChart>
      </ChartContainer>
    </div>
  );
}

function CollectionProgress({ collected, total }: { collected: number; total: number }) {
  const percentage = total > 0 ? Math.min(100, Math.max(0, (collected / total) * 100)) : 0;

  return (
    <svg
      viewBox="0 0 40 40"
      className="size-10 shrink-0"
      role="img"
      aria-label={total > 0 ? `${Math.round(percentage)}% collected` : "No amount recorded"}
    >
      <circle cx="20" cy="20" r="15" fill="none" stroke="rgba(0, 0, 0, 0.35)" strokeWidth="6" />
      <circle
        cx="20"
        cy="20"
        r="15"
        fill="none"
        stroke="white"
        strokeWidth="6"
        strokeLinecap="round"
        pathLength="100"
        strokeDasharray={`${percentage} 100`}
        transform="rotate(-90 20 20)"
      />
    </svg>
  );
}

function PeriodProgress({ paid, total }: { paid: number; total: number }) {
  const percentage = total > 0 ? (paid / total) * 100 : 0;

  return (
    <div className="relative size-[50px] bg-white rounded-full shrink-0" role="img" aria-label={`${paid} of ${total} periods paid`}>
      <ChartContainer
        config={feeProgressChartConfig}
        initialDimension={{ width: 50, height: 50 }}
        className="!aspect-auto size-[50px]"
        aria-hidden="true"
      >
        <RadialBarChart
          data={[{ value: percentage, fill: "#059669" }]}
          startAngle={90}
          endAngle={-270}
          innerRadius={18}
          outerRadius={23}
        >
          <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
          <RadialBar dataKey="value" background={{ fill: "#e5e7eb" }} cornerRadius={5} isAnimationActive={false} />
        </RadialBarChart>
      </ChartContainer>
      <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm font-bold tabular-nums text-gray-900">
        {paid}/{total}
      </span>
    </div>
  );
}

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
      <text x="100" y="89" textAnchor="middle" className="fill-gray-500 text-[13px] font-medium">{label}</text>
    </svg>
  );
}

function FeeStats({
  payments,
  lang,
}: {
  payments: FeePayment[];
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
  const outstanding = payments.reduce(
    (sum, payment) =>
      payment.status === "WAIVED"
        ? sum
        : sum + Math.max(0, Number(payment.dueAmount) - amountPaid(payment)),
    0,
  );
  const formatAmount = (amount: number) => `₹${amount.toLocaleString("en-IN")}`;
  const stats = [
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
    <section className="mb-4 overflow-hidden rounded-2xl bg-gradient-to-br from-white to-sky-50">
      <div className="bg-white/90 p-3 text-center sm:p-4">
        <h3 className="text-sm font-semibold text-gray-700">{t("teacherPages", "feeStatsPaymentStatus", lang)}</h3>
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
        <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs text-gray-600">
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
      <div className="grid grid-cols-2 gap-px border-t border-gray-100 bg-gray-100">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="min-w-0 bg-white/90 p-3 sm:p-4">
              <div className="flex items-center gap-1.5 text-sm font-medium text-gray-600">
                <Icon aria-hidden="true" className={cn("h-4 w-4 shrink-0", stat.color)} />
                <span>{stat.label}</span>
              </div>
              <div className="mt-2 text-xl font-bold tabular-nums text-gray-950 sm:text-2xl">{stat.value}</div>
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
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
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
  const [payments, setPayments] = useState<FeePayment[]>([]);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [payLoading, setPayLoading] = useState(true);
  const [expandedFeeTypeId, setExpandedFeeTypeId] = useState<string | null>(null);
  const [studentFilter, setStudentFilter] = useState<"all" | "paid" | "unpaid">("all");
  const [recurringStudentId, setRecurringStudentId] = useState<string | null>(null);
  const [recurringView, setRecurringView] = useState<"students" | "intervals">("students");
  const [selectedIntervalKey, setSelectedIntervalKey] = useState<string | null>(null);

  const [selectedPayment, setSelectedPayment] = useState<FeePayment | null>(null);
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
  const paymentsRequest = useRef<AbortController | null>(null);

  const loadPayments = useCallback(async () => {
    paymentsRequest.current?.abort();
    if (!cid || !token || !activeClassId) {
      setFeeTypes([]);
      setPayments([]);
      setStudents([]);
      setPayLoading(false);
      return;
    }
    const controller = new AbortController();
    paymentsRequest.current = controller;
    setPayLoading(true);
    setError(null);
    try {
      const params = {
        classId: activeClassId,
        take: 200,
        signal: controller.signal,
      };
      const [types, firstPage, classStudents] = await Promise.all([
        getFeeTypes(cid, token, user?.defaultAcademicYearId ?? undefined, controller.signal),
        getPayments(cid, token, { ...params, skip: 0 }),
        getAllClassStudents(cid, token, activeClassId, controller.signal),
      ]);
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
      setFeeTypes(types.filter((type) => type.targetClassIds.length === 0 || type.targetClassIds.includes(activeClassId)));
      setPayments(allPayments);
      setStudents(classStudents);
    } catch (e) {
      if (!controller.signal.aborted) setError((e as Error).message);
    } finally {
      if (paymentsRequest.current === controller) setPayLoading(false);
    }
  }, [cid, token, activeClassId, user?.defaultAcademicYearId]);

  useEffect(() => {
    loadPayments();
    return () => paymentsRequest.current?.abort();
  }, [loadPayments]);

  const selectedFeeType = feeTypes.find((type) => type.id === expandedFeeTypeId) ?? null;
  const feeTypeSummaries = feeTypes.map((feeType) => {
    const feePayments = payments.filter((payment) => payment.feeType.id === feeType.id);
    const activePayments = feePayments.filter((payment) => payment.status !== "WAIVED");
    const collected = activePayments.reduce(
      (sum, payment) => sum + Number(payment.paidAmount ?? (payment.status === "PAID" ? payment.dueAmount : 0)),
      0,
    );
    const total = activePayments.reduce(
      (sum, payment) => sum + Math.max(Number(payment.dueAmount), Number(payment.paidAmount ?? 0)),
      0,
    );
    return { feeType, collected, total };
  });
  const selectedTypePayments = selectedFeeType
    ? payments.filter((payment) => payment.feeType.id === selectedFeeType.id)
    : [];
  const billingIntervals = new Map<string, { key: string; label: string; dueDate: string; payments: FeePayment[] }>();
  if (selectedFeeType?.kind === "RECURRING") {
    selectedTypePayments.forEach((payment) => {
      const { key, label } = getBillingInterval(payment.dueDate, selectedFeeType.frequency, lang);
      const interval = billingIntervals.get(key);
      if (interval) {
        interval.payments.push(payment);
        if (payment.dueDate < interval.dueDate) interval.dueDate = payment.dueDate;
      } else {
        billingIntervals.set(key, { key, label, dueDate: payment.dueDate, payments: [payment] });
      }
    });
  }
  const today = toLocalDateOnly(new Date().toISOString());
  const elapsedPeriodCount = Array.from(billingIntervals.values())
    .filter((interval) => toLocalDateOnly(interval.dueDate) <= today).length;
  const studentRows = students.map((student) => {
    const periods = selectedTypePayments
      .filter((payment) => payment.student.id === student.id)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    const paidPeriods = periods.filter((payment) => payment.status === "PAID").length;
    const collected = periods.reduce(
      (sum, payment) => payment.status === "WAIVED" ? sum : sum + Number(payment.paidAmount ?? (payment.status === "PAID" ? payment.dueAmount : 0)),
      0,
    );
    const total = periods.reduce(
      (sum, payment) => payment.status === "WAIVED" ? sum : sum + Math.max(Number(payment.dueAmount), Number(payment.paidAmount ?? 0)),
      0,
    );
    const pendingAmount = Math.max(0, Math.round((total - collected) * 100) / 100);
    const isPaid = selectedFeeType?.kind === "ONE_TIME"
      ? paidPeriods > 0
      : periods.length > 0 && paidPeriods === periods.length;
    return { student, periods, paidPeriods, collected, total, pendingAmount, isPaid };
  }).sort((a, b) => a.student.name.localeCompare(b.student.name));
  const paidStudentCount = studentRows.filter((row) => row.isPaid).length;
  const visibleStudentRows = studentRows.filter((row) =>
    studentFilter === "all" || (studentFilter === "paid" ? row.isPaid : !row.isPaid),
  );
  const recurringStudent = studentRows.find((row) => row.student.id === recurringStudentId) ?? null;
  const intervalSummaries = Array.from(billingIntervals.values()).map((interval) => {
    const rows = studentRows.map(({ student }) => {
      const payment = interval.payments.find((item) => item.student.id === student.id);
      const status: FeePaymentStatus = payment?.status ?? "PENDING";
      const dueAmount = Number(payment?.dueAmount ?? selectedFeeType?.amount ?? 0);
      const paidAmount = status === "WAIVED"
        ? 0
        : Number(payment?.paidAmount ?? (status === "PAID" ? payment?.dueAmount : 0));
      const remaining = status === "WAIVED"
        ? 0
        : Math.max(0, Math.round((dueAmount - paidAmount) * 100) / 100);
      return { student, status, dueAmount, paidAmount, remaining };
    });
    return {
      ...interval,
      rows,
      paidStudents: rows.filter((row) => row.status === "PAID").length,
      pendingStudents: rows.filter((row) => row.status === "PENDING" || row.status === "PARTIAL" || row.status === "OVERDUE").length,
      collected: rows.reduce((sum, row) => sum + row.paidAmount, 0),
      toCollect: rows.reduce((sum, row) => sum + row.remaining, 0),
    };
  }).sort((a, b) => b.key.localeCompare(a.key));
  const selectedInterval = intervalSummaries.find((interval) => interval.key === selectedIntervalKey) ?? null;
  const selectedFeeTypeSummary = feeTypeSummaries.find((summary) => summary.feeType.id === expandedFeeTypeId);

  const openPayment = (payment: FeePayment) => {
    setError(null);
    setSelectedPayment(payment);
    setPayMethod(payment.method ?? "CASH");
    setPayRef(payment.reference ?? "");
    setDonationAmount(
      payment.feeType.isDonation && Number(payment.dueAmount) > 0
        ? String(payment.dueAmount)
        : "",
    );
    setCancelling(null);
  };

  const openOneTimePayment = (row: (typeof studentRows)[number]) => {
    if (!selectedFeeType) return;
    const existing = row.periods.find((payment) => payment.status === "PAID") ?? row.periods[0];
    if (existing) {
      openPayment(existing);
      return;
    }
    const today = new Date().toISOString();
    openPayment({
      id: `virtual-${selectedFeeType.id}-${row.student.id}`,
      virtual: true,
      dueAmount: selectedFeeType.amount,
      paidAmount: null,
      dueDate: selectedFeeType.startDate ?? today,
      paidAt: null,
      method: null,
      reference: null,
      notes: null,
      status: "PENDING",
      academicYearId: selectedFeeType.academicYearId,
      createdAt: today,
      student: { id: row.student.id, name: row.student.name, adno: row.student.adno, class: row.student.class },
      feeType: {
        id: selectedFeeType.id,
        name: selectedFeeType.name,
        kind: selectedFeeType.kind,
        isDonation: selectedFeeType.isDonation,
      },
    });
  };

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
      setSelectedPayment(null);
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
      setSelectedPayment(null);
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
      setSelectedPayment(null);
      loadPayments();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setCancellingSave(false);
    }
  };

  return (
    <DashboardLayout>
      <PageHeader title={t("teacherPages", "feesPaymentsTitle", lang)} />

      {error && <ApiErrorBanner message={error} onRetry={loadPayments} />}

      {payLoading ? (
            <div className="flex items-center justify-center py-10 text-gray-400">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
          ) : feeTypes.length === 0 && payments.length === 0 && !error ? (
            <IllustratedEmptyState
              image="/images/teacher/fees-empty.webp"
              title={t("teacherPages", "noFeeTypes", lang)}
              description={t("teacherPages", "feesEmptyDescription", lang)}
            />
          ) : (
            <>
              <div className="p-0! px-4! pt-4!  ">
                <FeeStats
                  payments={payments}
                  lang={lang}
                />
              </div>
              <section className=" ">
                <h2 className="mb-2 px-1 text-sm font-semibold text-gray-700">
                  {t("teacherPages", "allFeeTypes", lang)}
                </h2>
                <div data-ui-style="classic" className="card divide-y divide-gray-100 overflow-hidden rounded-2xl bg-white p-0! shadow-none">
                  {feeTypeSummaries.length === 0 ? (
                    <p className="px-4 py-10 text-center text-sm text-muted-foreground">
                      {t("teacherPages", "noFeeTypes", lang)}
                    </p>
                  ) : feeTypeSummaries.map(({ feeType, collected, total }) => {
                    const kind = feeType.kind === "ONE_TIME"
                      ? t("parentPages", "frequencyOneTime", lang)
                      : t("teacherPages", "feeTypeRecurring", lang);
                    const frequency = feeType.kind === "RECURRING"
                      ? getFrequencyLabel(feeType.frequency, lang)
                      : null;
                    const expanded = expandedFeeTypeId === feeType.id;

                    return (
                      <button
                        key={feeType.id}
                        type="button"
                        aria-haspopup="dialog"
                        onClick={() => {
                          setExpandedFeeTypeId(feeType.id);
                          setStudentFilter("all");
                          setRecurringStudentId(null);
                          setRecurringView("students");
                          setSelectedIntervalKey(null);
                        }}
                        className={cn(
                          "flex w-full items-center gap-2 px-4 py-4 text-left transition-colors hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary-500 sm:gap-4",
                          expanded && "bg-primary-50/50",
                        )}
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-gray-950 sm:text-base">{feeType.name}</span>
                          <span className="mt-1 block text-xs text-gray-500">
                            {kind}{frequency ? ` · ${frequency}` : ""} ·{" "}
                            <span className="font-semibold tabular-nums text-gray-800">
                              {feeType.isDonation
                                ? t("teacherPages", "feeTypeDonation", lang)
                                : `₹${Number(feeType.amount).toLocaleString("en-IN")}`}
                            </span>
                          </span>
                        </span>
                        <span className="  text-right text-xs font-semibold leading-tight   sm:text-2xl">
                          <span className="block text-primary-700">₹{collected.toLocaleString("en-IN")}</span>
                          <span className="block text-gray-500">/ ₹{total.toLocaleString("en-IN")}</span>
                        </span>
                        <FeeTypeProgress collected={collected} total={total} />
                        <ChevronRight className="ml-1 text-gray-400" />
                      </button>
                    );
                  })}
                </div>
              </section>

            </>
          )}

      <ResponsivePopover
        open={selectedFeeType !== null}
        onOpenChange={(open) => {
          if (!open) {
            setExpandedFeeTypeId(null);
            setRecurringStudentId(null);
            setSelectedIntervalKey(null);
            setSelectedPayment(null);
          }
        }}
        title={selectedFeeType?.name}
        description={selectedFeeType?.kind === "RECURRING"
          ? t("teacherPages", "feeTypeRecurring", lang)
          : t("parentPages", "frequencyOneTime", lang)}
        fullHeight
      >
        {selectedFeeType && (
          <div className="mx-auto w-full max-w-3xl space-y-5 px-4 pb-8 pt-2 sm:px-6">
            <div className="rounded-2xl border-2 border-white shadow-xs bg-linear-120 from-primary-400 to-primary-700 *:text-gray-100  p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wide">
                    {t("teacherPages", "feeStatsCollected", lang)} / {t("teacherPages", "feeTotalAmount", lang)}
                  </p>
                  <p className="mt-1 text-xl font-bold tabular-nums sm:text-2xl">
                    <span className="text-primary-100">{formatCurrency(selectedFeeTypeSummary?.collected ?? 0)}</span>
                    <span className="text-gray-100"> / </span>
                    <span className="text-primary-900">{formatCurrency(selectedFeeTypeSummary?.total ?? 0)}</span>
                  </p>
                </div>
                <CollectionProgress
                  collected={selectedFeeTypeSummary?.collected ?? 0}
                  total={selectedFeeTypeSummary?.total ?? 0}
                />
              </div>

              <dl className="mt-2 grid grid-cols-2   *:bg-linear-120 *:from-white/20  *:p-2 gap-0.5 *:shadow-xs *:rounded pt-0 text-sm">
                <div>
                  <dt className="text-xs text-gray-200">{t("teacherPages", "feeAmount", lang)}</dt>
                  <dd className="mt-1 font-semibold tabular-nums text-gray-100">
                    {selectedFeeType.isDonation
                      ? t("teacherPages", "feeTypeDonation", lang)
                      : formatCurrency(Number(selectedFeeType.amount))}
                  </dd>
                </div>
                {selectedFeeType.kind === "RECURRING" && (
                  <>
                    <div>
                      <dt className="text-xs text-gray-200">{t("teacherPages", "feeInterval", lang)}</dt>
                      <dd className="mt-1 font-semibold text-gray-100">
                        {getFrequencyLabel(selectedFeeType.frequency, lang) ?? "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-gray-200">{t("teacherPages", "feePeriodsElapsed", lang)}</dt>
                      <dd className="mt-1 font-semibold tabular-nums text-gray-100">{elapsedPeriodCount}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-gray-200">{t("teacherPages", "feeTotalPerStudent", lang)}</dt>
                      <dd className="mt-1 font-semibold tabular-nums text-gray-100">
                        {selectedFeeType.isDonation
                          ? "—"
                          : formatCurrency(Number(selectedFeeType.amount) * elapsedPeriodCount)}
                      </dd>
                    </div>
                  </>
                )}
              </dl>
            </div>

            {selectedFeeType.kind === "RECURRING" && (
              <Tabs
                value={recurringView}
                onValueChange={(value) => setRecurringView(value as typeof recurringView)}
                className="sticky top-2 z-10 -mx-4 px-4 sm:-mx-6 sm:px-6"
              >
                <TabsList className="grid w-max grid-cols-2   ">
                  <TabsTrigger value="students">{t("common", "students", lang)}</TabsTrigger>
                  <TabsTrigger value="intervals">{t("teacherPages", "feeIntervalsTab", lang)}</TabsTrigger>
                </TabsList>
              </Tabs>
            )}

            {selectedFeeType.kind === "ONE_TIME" && (
              <Tabs value={studentFilter} onValueChange={(value) => setStudentFilter(value as typeof studentFilter)}>
                <TabsList className="grid h-auto w-max grid-cols-3">
                  <TabsTrigger value="all" className="px-2 py-2 text-xs sm:text-sm">
                    {t("common", "all", lang)} ({studentRows.length})
                  </TabsTrigger>
                  <TabsTrigger value="paid" className="px-2 py-2 text-xs sm:text-sm">
                    {t("common", "paid", lang)} ({paidStudentCount})
                  </TabsTrigger>
                  <TabsTrigger value="unpaid" className="px-2 py-2 text-xs sm:text-sm">
                    {t("teacherPages", "feeUnpaid", lang)} ({studentRows.length - paidStudentCount})
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            )}

            {(selectedFeeType.kind === "ONE_TIME" || recurringView === "students") && (
            <div className="divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-100 bg-white">
              {visibleStudentRows.length === 0 ? (
                <p className="px-4 py-10 text-center text-sm text-gray-500">
                  {t("teacherPages", "feeNoStudents", lang)}
                </p>
              ) : visibleStudentRows.map((row) => {
                const oneTimePayment = row.periods.find((payment) => payment.status === "PAID") ?? row.periods[0];
                const status = oneTimePayment?.status ?? "PENDING";
                const meta = STATUS_META[status];
                const StatusIcon = status === "PAID" ? CircleCheck
                  : status === "OVERDUE" ? AlertCircle
                    : status === "WAIVED" ? CircleX : Clock3;
                return (
                  <button
                    key={row.student.id}
                    type="button"
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary-500"
                    onClick={() => selectedFeeType.kind === "ONE_TIME"
                      ? openOneTimePayment(row)
                      : setRecurringStudentId(row.student.id)}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-gray-900">{row.student.name}</span>
                      <span className="block text-xs text-gray-500">{row.student.adno}</span>
                      {/* {selectedFeeType.kind === "RECURRING" && (
                        <span className="mt-1 block text-xs tabular-nums text-gray-600">
                          {row.paidPeriods}/{row.periods.length} {t("teacherPages", "feePeriods", lang)}
                          {" · "}{formatCurrency(row.collected)} / {formatCurrency(row.total)}
                        </span>
                      )} */}
                    </span>
                    {selectedFeeType.kind === "ONE_TIME" ? (
                      <span className={cn("flex h-6 px-1 shrink-0 gap-1 text-xs items-center justify-center rounded-lg", meta.bg, meta.color)} title={meta.label}>
                        <StatusIcon aria-hidden="true" className="size-4" />
                        {meta.label}
                      </span>
                    ) : (
                      row.pendingAmount > 0 && (
                        <span className="shrink-0 text-right text-xs font-semibold tabular-nums text-amber-700">
                          <span className="block">{formatCurrency(row.pendingAmount)}</span>
                          <span className="block">{t("common", "pending", lang)}</span>
                        </span>
                      )
                    )}
                    <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-gray-400" />
                  </button>
                );
              })}
            </div>
            )}

            {selectedFeeType.kind === "RECURRING" && recurringView === "intervals" && (
              <div className="divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-100 bg-white">
                {intervalSummaries.length === 0 ? (
                  <p className="px-4 py-10 text-center text-sm text-gray-500">
                    {t("teacherPages", "feeNoIntervals", lang)}
                  </p>
                ) : intervalSummaries.map((interval) => (
                  <button
                    key={interval.key}
                    type="button"
                    aria-haspopup="dialog"
                    onClick={() => setSelectedIntervalKey(interval.key)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary-500"
                  >
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-gray-900">
                      {interval.label}
                    </span>
                    <FeeTypeProgress
                      collected={interval.paidStudents}
                      total={interval.rows.length}
                      ariaLabel={`${interval.paidStudents}/${interval.rows.length} ${t("teacherPages", "feePaidStudents", lang)}`}
                    />
                    <span className="shrink-0 text-right text-xs font-semibold tabular-nums text-amber-700">
                      <span className="block">{formatCurrency(interval.toCollect)}</span>
                      <span className="block">{t("common", "pending", lang)}</span>
                    </span>
                    <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-gray-400" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      <ResponsivePopover
        open={recurringStudent !== null && selectedFeeType?.kind === "RECURRING"}
        onOpenChange={(open) => { if (!open) setRecurringStudentId(null); }}
        title={recurringStudent?.student.name}
        description={selectedFeeType
          ? [
              selectedFeeType.name,
              getFrequencyLabel(selectedFeeType.frequency, lang),
              selectedFeeType.isDonation
                ? t("teacherPages", "feeTypeDonation", lang)
                : formatCurrency(Number(selectedFeeType.amount)),
            ].filter(Boolean).join(" · ")
          : undefined}
        fullHeight
      >
        {recurringStudent && selectedFeeType && (
          <div className="mx-auto w-full max-w-2xl space-y-5 px-4 pb-8 pt-2 sm:px-6">
            <div className="flex items-center gap-3 rounded-xl     bg-primary-50/50 p-2.5 ">
             
              <PeriodProgress paid={recurringStudent.paidPeriods} total={recurringStudent.periods.length} />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900">
                  {recurringStudent.paidPeriods}/{recurringStudent.periods.length} {t("teacherPages", "feePeriodsPaid", lang)}
                </p>
                <p className="mt-1 text-xs tabular-nums text-gray-600">
                  <span className="font-semibold text-emerald-700">{formatCurrency(recurringStudent.collected)}</span>
                  {" / "}{formatCurrency(recurringStudent.total)}
                </p>
              </div>
            </div>
            <section>
              <h3 className="mb-2 text-sm font-semibold text-gray-700">
                {t("teacherPages", "feePeriodBreakdown", lang)}
              </h3>
              <div className="divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-100 bg-white">
                {recurringStudent.periods.length === 0 ? (
                  <p className="px-4 py-10 text-center text-sm text-gray-500">
                    {t("teacherPages", "feeNoPeriods", lang)}
                  </p>
                ) : recurringStudent.periods.map((payment) => {
                  const meta = STATUS_META[payment.status];
                  const date = new Date(payment.dueDate);
                  const periodLabel = Number.isNaN(date.getTime())
                    ? payment.dueDate
                    : date.toLocaleDateString(lang === "ml" ? "ml-IN" : "en-IN", {
                      month: selectedFeeType.frequency === "YEARLY" ? undefined : "long",
                      year: "numeric",
                    });
                  return (
                    <div key={payment.id} className="flex items-center justify-between gap-3 px-4 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-900">{periodLabel}</p>
                        <p className={cn("mt-0.5 text-xs font-medium", meta.color)}>{meta.label}</p>
                        <p className="mt-0.5 text-xs tabular-nums text-gray-500">
                          {formatCurrency(Number(payment.paidAmount ?? 0))} / {formatCurrency(Number(payment.dueAmount))}
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant={payment.status === "PAID" || payment.status === "WAIVED" ? "outline" : "default"}
                        onClick={() => openPayment(payment)}
                      >
                        {payment.status === "PAID" || payment.status === "WAIVED"
                          ? t("teacherPages", "feeView", lang)
                          : t("teacherPages", "feePay", lang)}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        )}
      </ResponsivePopover>

      <ResponsivePopover
        open={selectedInterval !== null && selectedFeeType?.kind === "RECURRING"}
        onOpenChange={(open) => { if (!open) setSelectedIntervalKey(null); }}
        title={selectedInterval?.label}
        description={selectedFeeType?.name}
        fullHeight
      >
        {selectedInterval && (
          <div className="mx-auto w-full max-w-2xl space-y-5 px-4 pb-8 pt-2 sm:px-6">
            <dl className="grid grid-cols-2 gap-3 rounded-2xl border border-gray-100 bg-gray-50 p-4 text-sm">
              <div>
                <dt className="text-xs text-gray-500">{t("teacherPages", "feePaidStudents", lang)}</dt>
                <dd className="mt-1 font-semibold tabular-nums text-emerald-700">{selectedInterval.paidStudents}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">{t("teacherPages", "feePendingStudents", lang)}</dt>
                <dd className="mt-1 font-semibold tabular-nums text-amber-700">{selectedInterval.pendingStudents}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">{t("teacherPages", "feeStatsCollected", lang)}</dt>
                <dd className="mt-1 font-semibold tabular-nums text-emerald-700">{formatCurrency(selectedInterval.collected)}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">{t("teacherPages", "feeStatsToCollect", lang)}</dt>
                <dd className="mt-1 font-semibold tabular-nums text-amber-700">{formatCurrency(selectedInterval.toCollect)}</dd>
              </div>
            </dl>
            <section>
              <h3 className="mb-2 text-sm font-semibold text-gray-700">{t("common", "students", lang)}</h3>
              <div className="divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-100 bg-white">
                {selectedInterval.rows.length === 0 ? (
                  <p className="px-4 py-10 text-center text-sm text-gray-500">
                    {t("teacherPages", "feeNoStudents", lang)}
                  </p>
                ) : selectedInterval.rows.map((row) => {
                  const meta = STATUS_META[row.status];
                  return (
                    <div key={row.student.id} className="flex items-center justify-between gap-3 px-4 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-900">{row.student.name}</p>
                        <p className="text-xs text-gray-500">{row.student.adno}</p>
                        <p className="mt-1 text-xs tabular-nums text-gray-500">
                          {formatCurrency(row.paidAmount)} / {formatCurrency(row.dueAmount)}
                        </p>
                      </div>
                      <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-xs font-medium", meta.bg, meta.color)}>
                        {meta.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        )}
      </ResponsivePopover>


      {receipt && (
        <ReceiptModal receipt={receipt} onClose={() => setReceipt(null)} />
      )}

      <Drawer
        open={selectedPayment !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedPayment(null);
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
                  {selectedFeeType?.kind === "RECURRING" && (
                    <div>
                      <dt className="text-muted-foreground">{t("teacherPages", "feeInterval", lang)}</dt>
                      <dd className="mt-1 font-medium">
                        {getFrequencyLabel(selectedFeeType.frequency, lang) ?? "—"}
                      </dd>
                    </div>
                  )}
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
                {error && <p role="alert" className="mb-3 text-sm text-red-700">{error}</p>}
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
      </ResponsivePopover>

    </DashboardLayout>
  );
}
