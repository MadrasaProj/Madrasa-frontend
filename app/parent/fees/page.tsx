import { useState, useMemo } from "react";
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
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useStudentFeesBatch, usePaymentReceipt } from "@/lib/queries";
import {
  IndianRupee,
  Loader2,
  Receipt,
  Printer,
  AlertCircle,
  Search,
  SlidersHorizontal,
  RefreshCw,
  Clock3,
  CircleCheck,
  ChevronRight,
} from "lucide-react";
import { motion } from "framer-motion";

type FilterTab = "ALL" | "PENDING" | "PAID" | "OVERDUE";

const FILTER_TABS: { id: FilterTab; labelKey: string }[] = [
  { id: "ALL", labelKey: "allFilterLabel" },
  { id: "PENDING", labelKey: "pendingFilterLabel" },
  { id: "PAID", labelKey: "paidFilterLabel" },
  { id: "OVERDUE", labelKey: "overdueFilterLabel" },
];

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
  if (frequency === "YEARLY") return t("parentPages", "frequencyYearly", lang);
  return null;
}

export default function ParentFeesPage() {
  const { user, accessToken, activeStudentId } = useAuthStore();
  const { lang } = useLanguageStore();
  const [filter, setFilter] = useState<FilterTab>("ALL");
  const [search, setSearch] = useState("");
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(
    null,
  );
  const [page, setPage] = useState(0);
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
  const activeTypeId = activeSummary?.feeTypes.some(
    (feeType) => feeType.id === selectedTypeId,
  )
    ? selectedTypeId
    : null;

  const filteredPayments = useMemo(() => {
    if (!activeSummary) return [];
    const payments = activeSummary.payments.filter(
      (payment) =>
        (!activeTypeId || payment.feeType.id === activeTypeId) &&
        payment.feeType.name
          .toLocaleLowerCase()
          .includes(search.trim().toLocaleLowerCase()),
    );
    if (filter === "ALL") return payments;
    if (filter === "PENDING") {
      return payments.filter(
        (p) => p.status === "PENDING" || p.status === "PARTIAL",
      );
    }
    if (filter === "PAID") {
      return payments.filter(
        (p) => p.status === "PAID" || p.status === "WAIVED",
      );
    }
    if (filter === "OVERDUE") {
      return payments.filter((p) => p.status === "OVERDUE");
    }
    return payments;
  }, [activeSummary, activeTypeId, filter, search]);

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
  const pageCount = Math.ceil(filteredPayments.length / 30);
  const currentPage = Math.min(page, Math.max(0, pageCount - 1));
  const visiblePayments = filteredPayments.slice(
    currentPage * 30,
    (currentPage + 1) * 30,
  );
  const selectedPayment: ParentPayment | null =
    activeSummary?.payments.find(
      (payment) => payment.id === selectedPaymentId,
    ) ?? null;

  return (
    <DashboardLayout>
      <PageHeader title={t("parentPages", "myFeesTitle", lang)} />

      <div className="mx-auto max-w-5xl px-3 pt-4 sm:px-4">
        <div className="flex items-center gap-2 rounded-2xl  p-1.5">
          <InputGroup className="h-10 min-w-0 flex-1 rounded-lg bg-white">
            <InputGroupInput
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(0);
              }}
              placeholder={`${t("parentPages", "feeTypeLabel", lang)}...`}
              aria-label={t("parentPages", "feeTypeLabel", lang)}
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
            className="h-10 w-10 shrink-0 rounded-xl text-gray-600"
            aria-label={t("common", "status", lang)}
          >
            <SlidersHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {filtersOpen && (
        <Drawer
          open={filtersOpen}
          onOpenChange={setFiltersOpen}
          swipeDirection="down"
        >
          <DrawerContent className="max-h-[85dvh] overflow-y-auto bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            <DrawerTitle className="mb-6 text-lg font-bold text-gray-900">
              Filters
            </DrawerTitle>
            {activeSummary && activeSummary.feeTypes.length > 0 && (
              <section className="mb-6">
                <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-400">
                  {t("parentPages", "feeTypeLabel", lang)}
                </h3>
                <div className="-mx-5 overflow-x-auto px-5">
                  <div className="flex w-max gap-2">
                    {[
                      { id: null, name: t("teacherPages", "allFeesBtn", lang) },
                      ...activeSummary.feeTypes,
                    ].map((feeType) => (
                      <Button
                        key={feeType.id ?? "all"}
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          setSelectedTypeId(feeType.id);
                          setPage(0);
                        }}
                        className={cn(
                          "h-9 shrink-0 rounded-full border px-4 text-sm font-medium",
                          activeTypeId === feeType.id
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-background text-foreground hover:bg-muted",
                        )}
                      >
                        {feeType.name}
                      </Button>
                    ))}
                  </div>
                </div>
              </section>
            )}
            <section>
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-400">
                {t("common", "status", lang)}
              </h3>
              <Tabs
                value={filter}
                onValueChange={(value) => {
                  setFilter(value as FilterTab);
                  setPage(0);
                }}
                className="w-full"
              >
                <TabsList className="grid h-auto w-full grid-cols-4">
                  {FILTER_TABS.map((tab) => (
                    <TabsTrigger
                      key={tab.id}
                      value={tab.id}
                      className="px-2 py-2 text-xs"
                    >
                      {t("parentPages", tab.labelKey as any, lang)}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </section>
            <DrawerClose className="mt-8 h-10 w-full rounded-xl bg-primary-600 text-sm font-semibold text-white">
              {t("parentPages", "done", lang)}
            </DrawerClose>
          </DrawerContent>
        </Drawer>
      )}

      {errorMessage && (
        <ApiErrorBanner message={errorMessage} onRetry={() => refetch()} />
      )}
      {receiptMutation.error && (
        <ApiErrorBanner message={(receiptMutation.error as Error).message} />
      )}

      <div className="mx-auto max-w-5xl px-3 pb-8 pt-0! sm:px-4">
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
            <section className="mb-4 overflow-hidden rounded-2xl bg-gradient-to-br from-white to-sky-50">
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
                  <span className="rounded-full border border-primary-100 bg-primary-50 px-2.5 py-1 text-xs font-medium text-primary-700">
                    <strong className="tabular-nums">
                      {filteredPayments.length}
                    </strong>{" "}
                    {t("teacherPages", "feeResultsShown", lang)}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5 text-[11px] font-medium">
                  <span className="rounded-full bg-white px-2.5 py-1 text-gray-700 ring-1 ring-gray-200">
                    {t("parentPages", "feeTypeLabel", lang)}:{" "}
                    {activeSummary.feeTypes.find(
                      (type) => type.id === activeTypeId,
                    )?.name ?? t("teacherPages", "allFeesBtn", lang)}
                  </span>
                  <span className="rounded-full bg-white px-2.5 py-1 text-gray-700 ring-1 ring-gray-200">
                    {t("common", "status", lang)}:{" "}
                    {t(
                      "parentPages",
                      FILTER_TABS.find((tab) => tab.id === filter)!
                        .labelKey as any,
                      lang,
                    )}
                  </span>
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

            <div className="mb-3 flex items-center justify-between gap-3 px-1">
              <h2 className="text-base font-semibold text-gray-950">
                {t("parentPages", "paymentHistory", lang)}
              </h2>
              
            </div>
            <div
              data-ui-style="classic"
              className="card divide-y divide-gray-100 overflow-hidden rounded-2xl bg-white p-0! shadow-none"
            >
              {filteredPayments.length === 0 ? (
                <div className="px-4 py-12 text-center text-sm text-gray-500">
                  {t("parentPages", "noPaymentRecords", lang)}
                </div>
              ) : (
                visiblePayments.map((payment) => (
                  <button
                    type="button"
                    key={payment.id}
                    aria-label={[
                      payment.feeType.name,
                      t(
                        "parentPages",
                        STATUS_META[payment.status].labelKey as any,
                        lang,
                      ),
                      payment.feeType.isDonation
                        ? "Variable"
                        : formatAmount(Number(payment.dueAmount)),
                    ].join(", ")}
                    onClick={() => setSelectedPaymentId(payment.id)}
                    className="w-full rounded-none p-4 text-left transition-colors hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary-500"
                  >
                    <div className="flex min-w-0 items-center gap-2 w-full ">
                      <div className="">
                        <span className="min-w-0 mr-2 truncate text-sm font-semibold text-gray-900">
                          {payment.feeType.name}
                        </span>
                        <StatusBadge status={payment.status} lang={lang} />
                      </div>
                      <div className="ml-auto">
                        <span className="inline-flex shrink-0 items-center gap-1 text-base font-semibold tabular-nums text-gray-950">
                          {payment.feeType.isDonation ? (
                            "Variable"
                          ) : (
                            <>
                              <IndianRupee
                                aria-hidden="true"
                                className="size-4"
                              />
                              {Number(payment.dueAmount).toLocaleString(
                                "en-IN",
                              )}
                            </>
                          )}
                           
                        </span>
                      </div>
                    </div>
                    <span className="mt-1 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                      <span className="text-xs text-gray-500">
                        {payment.status === "PAID" && payment.paidAt
                          ? t("parentPages", "paidPrefix", lang)
                          : t("parentPages", "duePrefix", lang)}{" "}
                        {formatDate(
                          payment.status === "PAID" && payment.paidAt
                            ? payment.paidAt
                            : payment.dueDate,
                        )}
                      </span>
                    </span>
                  </button>
                ))
              )}
            </div>

            {pageCount > 1 && (
              <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-white px-3 py-3">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 0}
                  onClick={() => setPage(currentPage - 1)}
                >
                  {t("teacherPages", "prevBtn", lang)}
                </Button>
                <p className="text-center text-xs tabular-nums text-gray-500">
                  {t("teacherPages", "pageOfTotal", lang)
                    .replace("{start}", String(currentPage * 30 + 1))
                    .replace(
                      "{end}",
                      String(
                        Math.min(
                          (currentPage + 1) * 30,
                          filteredPayments.length,
                        ),
                      ),
                    )
                    .replace("{total}", String(filteredPayments.length))}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= pageCount - 1}
                  onClick={() => setPage(currentPage + 1)}
                >
                  {t("teacherPages", "nextBtn", lang)}
                </Button>
              </div>
            )}

            {activeSummary.feeTypes.length > 0 && (
              <section className="mt-6">
                <h2 className="mb-3 px-1 text-xs font-bold uppercase tracking-wider text-gray-500">
                  {t("parentPages", "applicableFees", lang)}
                </h2>
                <div
                  data-ui-style="classic"
                  className="card divide-y divide-gray-100 overflow-hidden rounded-2xl bg-white p-0! shadow-none"
                >
                  {activeSummary.feeTypes.map((feeType) => {
                    const frequency = getFrequencyLabel(
                      feeType.frequency,
                      feeType.kind,
                      lang,
                    );
                    return (
                      <div
                        key={feeType.id}
                        className="flex items-center justify-between gap-4 px-4 py-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-gray-900">
                            {feeType.name}
                          </p>
                          {frequency && (
                            <p className="mt-0.5 text-xs text-gray-500">
                              {frequency}
                            </p>
                          )}
                        </div>
                        <span className="shrink-0 text-sm font-semibold tabular-nums text-gray-900">
                          {feeType.isDonation
                            ? "Variable"
                            : formatAmount(Number(feeType.amount))}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
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

      <Drawer
        open={!!selectedPayment?.id}
        onOpenChange={(open) => {
          if (!open) setSelectedPaymentId(null);
        }}
        swipeDirection="down"
      >
        <DrawerContent className="max-h-[88dvh] bg-background">
          {selectedPayment && (
            <>
              <div className="shrink-0 border-b px-5 py-4">
                <DrawerTitle className="text-lg font-semibold text-gray-950">
                  {selectedPayment.feeType.name}
                </DrawerTitle>
                {activeInfo && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {activeInfo.name}
                    {activeInfo.className ? " · " + activeInfo.className : ""}
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
                        status={selectedPayment.status}
                        lang={lang}
                      />
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">
                      {t("parentPages", "amountCol", lang)}
                    </dt>
                    <dd className="mt-1 font-semibold tabular-nums">
                      {selectedPayment.feeType.isDonation
                        ? "Variable"
                        : formatAmount(Number(selectedPayment.dueAmount))}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">
                      {t("parentPages", "amountPaidLabel", lang)}
                    </dt>
                    <dd className="mt-1 font-semibold tabular-nums">
                      {formatAmount(Number(selectedPayment.paidAmount ?? 0))}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">
                      {t("parentPages", "dueDateCol", lang)}
                    </dt>
                    <dd className="mt-1 font-medium">
                      {formatDate(selectedPayment.dueDate)}
                    </dd>
                  </div>
                  {selectedPayment.paidAt && (
                    <div>
                      <dt className="text-muted-foreground">
                        {t("parentPages", "paidOnCol", lang)}
                      </dt>
                      <dd className="mt-1 font-medium">
                        {formatDate(selectedPayment.paidAt)}
                      </dd>
                    </div>
                  )}
                  {selectedPayment.method && (
                    <div>
                      <dt className="text-muted-foreground">
                        {t("parentPages", "methodCol", lang)}
                      </dt>
                      <dd className="mt-1 font-medium">
                        {t(
                          "parentPages",
                          METHOD_LABEL_KEYS[selectedPayment.method] as any,
                          lang,
                        )}
                      </dd>
                    </div>
                  )}
                  {selectedPayment.reference && (
                    <div className="col-span-2">
                      <dt className="text-muted-foreground">
                        {t("parentPages", "referenceCol", lang)}
                      </dt>
                      <dd className="mt-1 break-all font-medium">
                        {selectedPayment.reference}
                      </dd>
                    </div>
                  )}
                  {selectedPayment.notes && (
                    <div className="col-span-2">
                      <dt className="text-muted-foreground">
                        {t("parentPages", "noteLabel", lang)}
                      </dt>
                      <dd className="mt-1 whitespace-pre-wrap font-medium">
                        {selectedPayment.notes}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
              <DrawerFooter className="shrink-0 border-t bg-background p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                {selectedPayment.status === "PAID" && (
                  <Button
                    type="button"
                    size="lg"
                    disabled={
                      receiptMutation.isPending &&
                      receiptMutation.variables === selectedPayment.id
                    }
                    onClick={() => {
                      const paymentId = selectedPayment.id;
                      setSelectedPaymentId(null);
                      void showReceipt(paymentId);
                    }}
                    className="w-full"
                  >
                    {receiptMutation.isPending &&
                    receiptMutation.variables === selectedPayment.id ? (
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
