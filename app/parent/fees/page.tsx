import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { ApiErrorBanner } from "@/components/ui/ApiErrorBanner";
import type {
  ReceiptData,
  FeePaymentStatus,
  StudentFeeSummary,
} from "@/lib/fees-api";
import { useAuthStore } from "@/store/auth";
import { useLanguageStore } from "@/store/language";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/Skeleton";
import { ResponsivePopover } from "@/components/ui/responsivePopover";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useStudentFeesBatch, usePaymentReceipt } from "@/lib/queries";
import {
  IndianRupee,
  Loader2,
  Receipt,
  Printer,
  AlertCircle,
  Clock3,
  CircleCheck,
  ChevronRight,
} from "lucide-react";
import { motion } from "framer-motion";

const STATUS_META: Record<
  FeePaymentStatus,
  { bg: string; text: string; labelKey: string }
> = {
  PAID: {
    bg: "bg-primary-50",
    text: "text-primary-700",
    labelKey: "paidStatusLabel",
  },
  PENDING: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    labelKey: "pendingStatusLabel",
  },
  PARTIAL: {
    bg: "bg-blue-50",
    text: "text-blue-700",
    labelKey: "partialStatusLabel",
  },
  OVERDUE: {
    bg: "bg-red-50",
    text: "text-red-700",
    labelKey: "overdueStatusLabel",
  },
  WAIVED: {
    bg: "bg-gray-100",
    text: "text-gray-600",
    labelKey: "waivedStatusLabel",
  },
};

const METHOD_LABEL_KEYS: Record<string, string> = {
  CASH: "methodCash",
  BANK_TRANSFER: "methodBankTransfer",
  UPI: "methodUPI",
  CHEQUE: "methodCheque",
  OTHER: "methodOther",
};

function StatusBadge({
  status,
  lang,
}: {
  status: FeePaymentStatus;
  lang: "en" | "ml";
}) {
  const m = STATUS_META[status];
  return (
    <span
      className={cn(
        "inline-flex shrink-0 rounded-full px-2.5 py-1 text-xs font-medium",
        m.bg,
        m.text,
      )}
    >
      {t("parentPages", m.labelKey as any, lang)}
    </span>
  );
}

function ReceiptModal({
  receipt,
  onClose,
  lang,
}: {
  receipt: ReceiptData;
  onClose: () => void;
  lang: "en" | "ml";
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
        className="relative w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-2xl"
      >
        <div className="bg-primary-600 px-6 py-5 text-center text-white">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20">
            <Receipt className="h-6 w-6" />
          </div>
          <p className="text-lg font-bold">{receipt.client.name}</p>
          {receipt.client.address && (
            <p className="text-xs text-primary-100">{receipt.client.address}</p>
          )}
          <p className="mt-1 text-xs uppercase tracking-widest text-primary-100">
            {t("parentPages", "feeReceipt", lang)}
          </p>
        </div>
        <div className="space-y-2.5 px-6 py-5">
          {[
            [
              t("parentPages", "receiptNo", lang),
              receipt.reference ?? receipt.id.slice(0, 8).toUpperCase(),
            ],
            [
              t("parentPages", "dateLabel", lang),
              receipt.paidAt
                ? new Date(receipt.paidAt).toLocaleDateString("en-GB")
                : "—",
            ],
            [t("parentPages", "studentLabel", lang), receipt.student.name],
            [t("parentPages", "admNoLabel", lang), receipt.student.adno],
            [
              t("parentPages", "classInfoLabel", lang),
              receipt.student.class?.name ?? "—",
            ],
            [t("parentPages", "feeTypeLabel", lang), receipt.feeType.name],
            [t("parentPages", "methodLabel", lang), receipt.method ?? "—"],
          ].map(([label, value]) => (
            <div key={label} className="flex items-start justify-between gap-4">
              <span className="shrink-0 text-xs text-gray-400">{label}</span>
              <span className="text-right text-xs font-semibold text-gray-900">
                {value}
              </span>
            </div>
          ))}
          <div className="flex items-center justify-between border-t border-dashed border-gray-200 pt-3">
            <span className="font-bold text-gray-900">
              {t("parentPages", "amountPaidLabel", lang)}
            </span>
            <span className="text-xl font-bold text-primary-600">
              ₹{Number(receipt.paidAmount ?? 0).toLocaleString()}
            </span>
          </div>
          {receipt.notes && (
            <p className="text-xs italic text-gray-400">
              {t("parentPages", "noteLabel", lang)}: {receipt.notes}
            </p>
          )}
        </div>
        <div className="flex gap-2 px-6 pb-5">
          <Button
            variant="ghost"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border text-sm font-semibold text-gray-600"
          >
            {t("parentPages", "closeBtn", lang)}
          </Button>
          <Button
            variant="ghost"
            onClick={() => window.print()}
            className="flex-1 py-2.5 rounded-xl bg-primary-600 text-white text-sm font-semibold flex items-center justify-center gap-1.5"
          >
            <Printer className="w-4 h-4" /> {t("parentPages", "printBtn", lang)}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

type ParentPayment = StudentFeeSummary["payments"][number];

const formatAmount = (amount: number) => `₹${amount.toLocaleString("en-IN")}`;
const formatDate = (date: string | null | undefined) =>
  date ? new Date(date).toLocaleDateString("en-GB") : "—";

function getFrequencyLabel(
  frequency: string | null | undefined,
  kind: string,
  lang: "en" | "ml",
): string | null {
  if (kind === "ONE_TIME") return t("parentPages", "frequencyOneTime", lang);
  if (frequency === "MONTHLY")
    return t("parentPages", "frequencyMonthly", lang);
  if (frequency === "WEEKLY") return t("teacherPages", "feeFrequencyWeekly", lang);
  if (frequency === "QUARTERLY") return t("parentPages", "frequencyQuarterly", lang);
  if (frequency === "YEARLY") return t("parentPages", "frequencyYearly", lang);
  return null;
}

function getBillingInterval(dueDate: string, frequency: string | null, lang: "en" | "ml") {
  const date = new Date(dueDate);
  if (Number.isNaN(date.getTime())) return { key: dueDate, label: dueDate };
  const locale = lang === "ml" ? "ml-IN" : "en-IN";
  const year = date.getFullYear();
  const month = date.getMonth();
  switch (frequency?.toUpperCase()) {
    case "WEEKLY": {
      const start = new Date(year, month, date.getDate());
      start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      const format = (value: Date) => value.toLocaleDateString(locale, { day: "numeric", month: "short" });
      return { key: `W-${start.getFullYear()}-${start.getMonth()}-${start.getDate()}`, label: `${format(start)} – ${format(end)} ${end.getFullYear()}` };
    }
    case "MONTHLY": return { key: `${year}-${month}`, label: date.toLocaleDateString(locale, { month: "long", year: "numeric" }) };
    case "QUARTERLY": {
      const firstMonth = Math.floor(month / 3) * 3;
      const first = new Date(year, firstMonth, 1);
      const last = new Date(year, firstMonth + 2, 1);
      return { key: `${year}-Q${Math.floor(month / 3) + 1}`, label: `${first.toLocaleDateString(locale, { month: "short" })}–${last.toLocaleDateString(locale, { month: "short" })} ${year}` };
    }
    case "YEARLY": return { key: String(year), label: String(year) };
    default: return { key: dueDate, label: formatDate(dueDate) };
  }
}

function feeStatus(payments: ParentPayment[]): FeePaymentStatus {
  if (payments.some((payment) => payment.status === "OVERDUE")) return "OVERDUE";
  if (payments.some((payment) => payment.status === "PARTIAL")) return "PARTIAL";
  if (payments.some((payment) => payment.status === "PENDING") || payments.length === 0) return "PENDING";
  if (payments.every((payment) => payment.status === "WAIVED")) return "WAIVED";
  return "PAID";
}

function feeTotals(payments: ParentPayment[]) {
  return payments.filter((payment) => payment.status !== "WAIVED").reduce(
    (totals, payment) => {
      const paid = Number(payment.paidAmount ?? (payment.status === "PAID" ? payment.dueAmount : 0));
      return {
        due: totals.due + Math.max(Number(payment.dueAmount), paid),
        paid: totals.paid + paid,
      };
    },
    { due: 0, paid: 0 },
  );
}

function OneTimePaymentDrawer({
  payment, student, lang, receiptPending, receiptPaymentId, onClose, onReceipt,
}: {
  payment: ParentPayment | null;
  student?: { name: string; className?: string | null };
  lang: "en" | "ml";
  receiptPending: boolean;
  receiptPaymentId?: string;
  onClose: () => void;
  onReceipt: (id: string) => void;
}) {
  return (
      <Drawer
        open={payment !== null}
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
        swipeDirection="down"
      >
        <DrawerContent className="max-h-[88dvh] bg-background">
          {payment && (
            <>
              <div className="shrink-0 border-b px-5 py-4">
                <DrawerTitle className="text-lg font-semibold text-gray-950">
                  {payment.feeType.name}
                </DrawerTitle>
                {student && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {student.name}
                    {student.className ? " · " + student.className : ""}
                  </p>
                )}
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto p-5">
                <dl className="grid grid-cols-2 gap-x-4 gap-y-5 text-sm">
                  <div>
                    <dt className="text-muted-foreground">
                      {t("common", "status", lang)}
                    </dt>
                    <dd className="mt-1">
                      <StatusBadge
                        status={payment.status}
                        lang={lang}
                      />
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">
                      {t("parentPages", "amountCol", lang)}
                    </dt>
                    <dd className="mt-1 font-semibold tabular-nums">
                      {payment.feeType.isDonation
                        ? "Variable"
                        : formatAmount(Number(payment.dueAmount))}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">
                      {t("parentPages", "amountPaidLabel", lang)}
                    </dt>
                    <dd className="mt-1 font-semibold tabular-nums">
                      {formatAmount(Number(payment.paidAmount ?? 0))}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">
                      {t("parentPages", "dueDateCol", lang)}
                    </dt>
                    <dd className="mt-1 font-medium">
                      {formatDate(payment.dueDate)}
                    </dd>
                  </div>
                  {payment.paidAt && (
                    <div>
                      <dt className="text-muted-foreground">
                        {t("parentPages", "paidOnCol", lang)}
                      </dt>
                      <dd className="mt-1 font-medium">
                        {formatDate(payment.paidAt)}
                      </dd>
                    </div>
                  )}
                  {payment.method && (
                    <div>
                      <dt className="text-muted-foreground">
                        {t("parentPages", "methodCol", lang)}
                      </dt>
                      <dd className="mt-1 font-medium">
                        {t(
                          "parentPages",
                          METHOD_LABEL_KEYS[payment.method] as any,
                          lang,
                        )}
                      </dd>
                    </div>
                  )}
                  {payment.reference && (
                    <div className="col-span-2">
                      <dt className="text-muted-foreground">
                        {t("parentPages", "referenceCol", lang)}
                      </dt>
                      <dd className="mt-1 break-all font-medium">
                        {payment.reference}
                      </dd>
                    </div>
                  )}
                  {payment.notes && (
                    <div className="col-span-2">
                      <dt className="text-muted-foreground">
                        {t("parentPages", "noteLabel", lang)}
                      </dt>
                      <dd className="mt-1 whitespace-pre-wrap font-medium">
                        {payment.notes}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
              <DrawerFooter className="shrink-0 border-t bg-background p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                {payment.status === "PAID" && (
                  <Button
                    type="button"
                    size="lg"
                    disabled={
                      receiptPending &&
                      receiptPaymentId === payment.id
                    }
                    onClick={() => {
                      const paymentId = payment.id;
                      onClose();
                      onReceipt(paymentId);
                    }}
                    className="w-full"
                  >
                    {receiptPending &&
                    receiptPaymentId === payment.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Receipt className="h-4 w-4" />
                    )}
                    {t("parentPages", "viewReceiptBtn", lang)}
                  </Button>
                )}
                <DrawerClose className="h-10 w-full rounded-xl border bg-white text-sm font-semibold text-gray-700">
                  {t("parentPages", "closeBtn", lang)}
                </DrawerClose>
              </DrawerFooter>
            </>
          )}
        </DrawerContent>
      </Drawer>

  );
}

export default function ParentFeesPage() {
  const { user, accessToken, activeStudentId } = useAuthStore();
  const { lang } = useLanguageStore();
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(
    null,
  );
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);

  const cid = user?.clientId ?? "";
  const token = accessToken ?? "";
  const ids = user?.accessibleStudentIds ?? [];
  const accessibleStudents = user?.accessibleStudents ?? [];
  const activeId = activeStudentId ?? ids[0] ?? "";

  const { data, isLoading, error, refetch } = useStudentFeesBatch(
    { clientId: cid, token },
    activeId ? [activeId] : [],
  );

  const getSummary = (sid: string): StudentFeeSummary | null => {
    const entry = data?.[sid];
    if (!entry || entry instanceof Error) return null;
    return entry;
  };

  const receiptMutation = usePaymentReceipt({ clientId: cid, token });

  const showReceipt = async (paymentId: string) => {
    try {
      const r = await receiptMutation.mutateAsync(paymentId);
      setReceipt(r);
    } catch {
      // surfaced via mutation state
    }
  };

  const activeSummary = activeId ? getSummary(activeId) : null;
  const activeInfo = accessibleStudents.find((s) => s.id === activeId);
  const errorMessage = error instanceof Error ? error.message : null;
  const selectedFeeType = activeSummary?.feeTypes.find((type) => type.id === selectedTypeId) ?? null;
  const selectedTypePayments = activeSummary?.payments
    .filter((payment) => payment.feeType.id === selectedTypeId)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate)) ?? [];

  const overdueCount =
    activeSummary?.payments.filter((p) => p.status === "OVERDUE").length ?? 0;
  const totalDue = activeSummary
    ? Math.max(0, activeSummary.totalDue - activeSummary.totalPaid)
    : 0;
  const paidCount =
    activeSummary?.payments.filter((p) => p.status === "PAID").length ?? 0;
  const progress =
    activeSummary && activeSummary.totalPaid + totalDue > 0
      ? Math.round(
          (activeSummary.totalPaid / (activeSummary.totalPaid + totalDue)) *
            100,
        )
      : 0;
  const ringCircumference = 2 * Math.PI * 54;
  const selectedPayment: ParentPayment | null =
    selectedPaymentId?(activeSummary?.payments.find(
      (payment) => payment.id === selectedPaymentId,
    ) ?? null):null;

  return (
    <DashboardLayout>
      <PageHeader title={t("parentPages", "myFeesTitle", lang)} />

      {errorMessage && (
        <ApiErrorBanner message={errorMessage} onRetry={() => refetch()} />
      )}
      {receiptMutation.error && (
        <ApiErrorBanner message={(receiptMutation.error as Error).message} />
      )}

      <div className="mx-auto   ">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-44 rounded-2xl" />
            <Skeleton className="h-8 w-1/2 rounded-lg" />
            <div className="overflow-hidden rounded-2xl bg-white">
              {[1, 2, 3, 4].map((item) => (
                <Skeleton key={item} className="m-4 h-20 rounded-xl" />
              ))}
            </div>
          </div>
        ) : !ids.length ? (
          <div className="rounded-2xl bg-white px-4 py-16 text-center text-sm text-gray-500">
            {t("parentPages", "noChildrenAccount", lang)}
          </div>
        ) : activeSummary ? (
          <>
            <section className="mb-4  overflow-hidden rounded-2xl bg-gradient-to-br from-white to-sky-50">
              <div className="border-b border-gray-100 px-4 py-3 sm:px-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-950">
                      {activeInfo?.name ??
                        t("parentPages", "feesOverview", lang)}
                    </p>
                    {activeInfo?.className && (
                      <p className="mt-0.5 text-xs text-gray-500">
                        {activeInfo.className}
                      </p>
                    )}
                  </div>

                </div>
              </div>
              <div className="flex flex-col items-center justify-center gap-4 px-4 py-5 sm:flex-row sm:gap-8 sm:px-5">
                <div
                  role="progressbar"
                  aria-label={t("teacherPages", "feeStatsCollectionRate", lang)}
                  aria-valuenow={progress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  className="relative size-32 shrink-0"
                >
                  <svg
                    viewBox="0 0 128 128"
                    aria-hidden="true"
                    className="size-full"
                  >
                    <circle
                      cx="64"
                      cy="64"
                      r="54"
                      fill="none"
                      stroke={
                        activeSummary.totalPaid + totalDue > 0
                          ? "#fde68a"
                          : "#e5e7eb"
                      }
                      strokeWidth="12"
                    />
                    {progress > 0 && (
                      <circle
                        cx="64"
                        cy="64"
                        r="54"
                        fill="none"
                        stroke="#059669"
                        strokeWidth="12"
                        strokeLinecap="round"
                        transform="rotate(-90 64 64)"
                        strokeDasharray={ringCircumference}
                        strokeDashoffset={
                          ringCircumference * (1 - progress / 100)
                        }
                      />
                    )}
                  </svg>
                  <span className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-semibold tabular-nums text-gray-950">
                      {progress}%
                    </span>
                    <span className="text-[10px] font-medium text-gray-500">
                      {t("teacherPages", "feeStatsCollected", lang)}
                    </span>
                  </span>
                </div>
                <div className="text-center sm:text-left">
                  <h2 className="text-sm font-semibold text-gray-900">
                    {t("teacherPages", "feeStatsCollectionRate", lang)}
                  </h2>
                  <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-gray-600 sm:justify-start">
                    <span>
                      <span className="mr-1.5 inline-block size-2 rounded-full bg-emerald-600" />
                      {t("parentPages", "totalPaidFees", lang)}
                    </span>
                    <span>
                      <span className="mr-1.5 inline-block size-2 rounded-full bg-amber-200" />
                      {t("parentPages", "totalDueLabel", lang)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-px border-t border-gray-100 bg-gray-100 sm:grid-cols-4">
                {[
                  {
                    label: t("parentPages", "totalPaidFees", lang),
                    value: formatAmount(activeSummary.totalPaid),
                    icon: CircleCheck,
                    color: "text-primary-700",
                  },
                  {
                    label: t("parentPages", "totalDueLabel", lang),
                    value: formatAmount(totalDue),
                    icon: IndianRupee,
                    color: "text-amber-700",
                  },
                  {
                    label: t("parentPages", "paidStatusLabel", lang),
                    value: String(paidCount),
                    icon: CircleCheck,
                    color: "text-primary-700",
                  },
                  {
                    label: t("parentPages", "overdueStatusLabel", lang),
                    value: String(overdueCount),
                    icon: Clock3,
                    color: "text-red-700",
                  },
                ].map((stat) => {
                  const Icon = stat.icon;
                  return (
                    <div
                      key={stat.label}
                      className="min-w-0 bg-white/90 p-3 sm:p-4"
                    >
                      <div className="flex items-center gap-1.5 text-[11px] font-medium text-gray-600">
                        <Icon
                          aria-hidden="true"
                          className={cn("h-3.5 w-3.5 shrink-0", stat.color)}
                        />
                        <span>{stat.label}</span>
                      </div>
                      <div className="mt-2 text-base font-semibold tabular-nums text-gray-950 sm:text-lg">
                        {stat.value}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {overdueCount > 0 && (
              <div className="mb-4 flex items-center gap-2 rounded-2xl border border-red-100 bg-red-50 px-4 py-3">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                <p className="text-sm text-red-700">
                  <strong>{overdueCount}</strong>{" "}
                  {t("parentPages", "overdueAlert", lang)}
                </p>
              </div>
            )}

            <section className="mb-6">
              <h2 className="mb-3 px-1 text-sm font-semibold text-gray-950">
                {t("teacherPages", "allFeeTypes", lang)}
              </h2>
              <div data-ui-style="classic" className="card  divide-y  divide-gray-100 overflow-hidden rounded-2xl bg-white   border-2 border-white ">
                {activeSummary.feeTypes.length === 0 ? (
                  <div className="px-4 py-12 text-center text-sm text-gray-500">
                    {t("teacherPages", "noFeeTypes", lang)}
                  </div>
                ) : activeSummary.feeTypes.map((feeType) => {
                  const payments = activeSummary.payments.filter((payment) => payment.feeType.id === feeType.id);
                  const status = feeStatus(payments);
                  const totals = feeTotals(payments);
                  const frequency = getFrequencyLabel(feeType.frequency, feeType.kind, lang);
                  return (
                    <button
                      key={feeType.id}
                      type="button"
                      aria-haspopup="dialog"
                      onClick={() => {
                        if (feeType.kind === "ONE_TIME") {
                          const payment = payments[0];
                          if (payment) { setSelectedPaymentId(payment.id); return; }
                        }
                        setSelectedTypeId(feeType.id);
                      }}
                      className={cn(
                        "w-full bg-white first:pt-4 last:pb-4   px-4 py-2 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary-500",
                       
                      )}
                    >
                      <span className="flex items-start   gap-3">
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-gray-950">{feeType.name}</span>
                          <span className="mt-1 block text-xs text-gray-600">
                            {feeType.kind === "ONE_TIME" ? t("parentPages", "frequencyOneTime", lang) : frequency ?? t("teacherPages", "feeTypeRecurring", lang)}
                            {" · "}{feeType.isDonation ? t("teacherPages", "feeTypeDonation", lang) : formatAmount(Number(feeType.amount))}
                          </span>
                        </span>
                        <span className={cn("shrink-0 my-auto ml-auto text-right text-xs font-semibold tabular-nums", STATUS_META[status].text)}>
                          {status !== "WAIVED" && (
                            <span className="block">{formatAmount(status === "PAID" ? totals.paid : payments.length === 0 ? Number(feeType.amount) : Math.max(0, totals.due - totals.paid))}</span>
                          )}
                          <span className="block">{t("parentPages", STATUS_META[status].labelKey as any, lang)}</span>
                        </span>
                      <ChevronRight className="text-gray-400 size-5 my-auto"/>
                      </span>
                      {/* <span className="mt-3 flex items-center justify-between gap-3 border-t border-gray-200/70 pt-3">
                        <span className="text-xs text-gray-600">
                          {t("parentPages", "amountPaidLabel", lang)} <strong className="text-gray-900">{formatAmount(totals.paid)}</strong>
                          {" / "}{t("teacherPages", "feeTotalAmount", lang)} <strong className="text-gray-900">{formatAmount(totals.due)}</strong>
                        </span>
                        <ChevronRight className="size-4 shrink-0 text-gray-400" aria-hidden="true" />
                      </span> */}
                    </button>
                  );
                })}
              </div>
            </section>
          </>
        ) : data?.[activeId] instanceof Error ? (
          <div className="flex items-center gap-2 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {(data[activeId] as Error).message}
          </div>
        ) : (
          <div className="space-y-3">
            {[1, 2, 3].map((item) => (
              <Skeleton key={item} className="h-20 rounded-xl" />
            ))}
          </div>
        )}
      </div>

      <ResponsivePopover
        open={selectedFeeType !== null}
        onOpenChange={(open) => { if (!open) setSelectedTypeId(null); }}
        title={selectedFeeType?.name}
        description={selectedFeeType ? getFrequencyLabel(selectedFeeType.frequency, selectedFeeType.kind, lang) : undefined}
        drawerOnDesktop
        contentClassName="px-4 pb-6"
      >
        {selectedFeeType && (() => {
          const totals = feeTotals(selectedTypePayments);
          const status = feeStatus(selectedTypePayments);
          const groups = new Map<string, { label: string; payments: ParentPayment[] }>();
          selectedTypePayments.forEach((payment) => {
            const { key, label } = getBillingInterval(payment.dueDate, selectedFeeType.frequency, lang);
            const group = groups.get(key);
            if (group) group.payments.push(payment);
            else groups.set(key, { label, payments: [payment] });
          });
          return (
            <div className="mx-auto max-w-2xl space-y-5 pt-4">
              <div className={cn(
                "rounded-2xl border bg-gradient-to-r p-4",
                status === "OVERDUE" ? "from-white to-red-100/20 border-red-100 " :
                status === "PAID" || status === "WAIVED" ? "from-white border-green-100  to-green-100/20" :
                "from-white to-amber-100/20 border-amber-100 ",
              )}>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-gray-900">{selectedFeeType.name}</p>
                  <StatusBadge status={status} lang={lang} />
                </div>
                <p className="mt-1 text-xs text-gray-600">
                  {selectedFeeType.kind === "ONE_TIME" ? t("parentPages", "frequencyOneTime", lang) : getFrequencyLabel(selectedFeeType.frequency, selectedFeeType.kind, lang)}
                  {" · "}{selectedFeeType.isDonation ? t("teacherPages", "feeTypeDonation", lang) : formatAmount(Number(selectedFeeType.amount))}
                </p>
                <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-gray-200/70 pt-3 text-sm">
                  <div><dt className="text-xs text-gray-500">{t("teacherPages", "feeTotalAmount", lang)}</dt><dd className="mt-1 font-semibold tabular-nums">{formatAmount(totals.due)}</dd></div>
                  <div><dt className="text-xs text-gray-500">{t("parentPages", "totalPaidFees", lang)}</dt><dd className="mt-1 font-semibold tabular-nums text-primary-700">{formatAmount(totals.paid)}</dd></div>
                  <div><dt className="text-xs text-gray-500">{t("parentPages", "pendingStatusLabel", lang)}</dt><dd className="mt-1 font-semibold tabular-nums text-amber-700">{formatAmount(Math.max(0, totals.due - totals.paid))}</dd></div>
                </dl>
              </div>
              {selectedFeeType.kind === "RECURRING" && <section>
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500">{t("teacherPages", "feePeriodBreakdown", lang)}</h3>
                {groups.size === 0 ? (
                  <p className="rounded-xl border border-gray-100 px-4 py-8 text-center text-sm text-gray-500">{t("parentPages", "noPaymentRecords", lang)}</p>
                ) :

                <div className="border border-gray-100 py-1 rounded-2xl divide-y divide-gray-100 ">
{ Array.from(groups, ([key, { label, payments }]) => {
                  const periodTotals = feeTotals(payments);
                  const periodStatus = feeStatus(payments);
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        setSelectedTypeId(null);
                        setSelectedPaymentId(payments[0].id);
                      }}
                      className="flex w-full items-center justify-between gap-3 bg-white px-4 py-2 text-left hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-primary-500"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900">{label}</p>
                        <p className="mt-1 text-xs tabular-nums text-gray-500">
                          {formatAmount(periodTotals.paid)} / {formatAmount(periodTotals.due)}
                        </p>
                      </div>
                      <StatusBadge status={periodStatus} lang={lang} />
                    </button>
                  );
                })}
                </div>
               }

              </section>}
            </div>
          );
        })()}
      </ResponsivePopover>

      <OneTimePaymentDrawer
        payment={selectedPayment}
        student={activeInfo}
        lang={lang}
        receiptPending={receiptMutation.isPending}
        receiptPaymentId={receiptMutation.variables}
        onClose={() => setSelectedPaymentId(null)}
        onReceipt={(id) => { void showReceipt(id); }}
      />

      {receipt && (
        <ReceiptModal
          receipt={receipt}
          onClose={() => setReceipt(null)}
          lang={lang}
        />
      )}
    </DashboardLayout>
  );
}
