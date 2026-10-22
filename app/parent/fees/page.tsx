import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { ApiErrorBanner } from "@/components/ui/ApiErrorBanner";
import type { ReceiptData, FeePaymentStatus, StudentFeeSummary } from "@/lib/fees-api";
import { useAuthStore } from "@/store/auth";
import { useLanguageStore } from "@/store/language";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/Skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerClose, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useStudentFeesBatch, usePaymentReceipt } from "@/lib/queries";
import {
  IndianRupee, Loader2, Receipt, Printer,
  AlertCircle,
  Search, SlidersHorizontal, RefreshCw,
} from "lucide-react";
import { motion } from "framer-motion";

type FilterTab = "ALL" | "PENDING" | "PAID" | "OVERDUE";

const FILTER_TABS: { id: FilterTab; labelKey: string }[] = [
  { id: "ALL",     labelKey: "allFilterLabel" },
  { id: "PENDING", labelKey: "pendingFilterLabel" },
  { id: "PAID",    labelKey: "paidFilterLabel" },
  { id: "OVERDUE", labelKey: "overdueFilterLabel" },
];

const STATUS_META: Record<
  FeePaymentStatus,
  { bg: string; text: string; labelKey: string }
> = {
  PAID:    { bg: "bg-primary-50", text: "text-primary-700", labelKey: "paidStatusLabel" },
  PENDING: { bg: "bg-amber-50",   text: "text-amber-700",   labelKey: "pendingStatusLabel" },
  PARTIAL: { bg: "bg-blue-50",    text: "text-blue-700",    labelKey: "partialStatusLabel" },
  OVERDUE: { bg: "bg-red-50",     text: "text-red-700",     labelKey: "overdueStatusLabel" },
  WAIVED:  { bg: "bg-gray-100",   text: "text-gray-600",    labelKey: "waivedStatusLabel" },
};

const METHOD_LABEL_KEYS: Record<string, string> = {
  CASH: "methodCash",
  BANK_TRANSFER: "methodBankTransfer",
  UPI: "methodUPI",
  CHEQUE: "methodCheque",
  OTHER: "methodOther",
};

function StatusBadge({ status, lang }: { status: FeePaymentStatus; lang: "en" | "ml" }) {
  const m = STATUS_META[status];
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-xs font-medium",
        m.bg, m.text,
      )}
    >
      {t("parentPages", m.labelKey as any, lang)}
    </span>
  );
}

function ReceiptModal({
  receipt, onClose, lang,
}: { receipt: ReceiptData; onClose: () => void; lang: "en" | "ml" }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ scale: 0.94, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
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
            [t("parentPages", "receiptNo", lang), receipt.reference ?? receipt.id.slice(0, 8).toUpperCase()],
            [t("parentPages", "dateLabel", lang), receipt.paidAt ? new Date(receipt.paidAt).toLocaleDateString("en-GB") : "—"],
            [t("parentPages", "studentLabel", lang), receipt.student.name],
            [t("parentPages", "admNoLabel", lang), receipt.student.adno],
            [t("parentPages", "classInfoLabel", lang), receipt.student.class?.name ?? "—"],
            [t("parentPages", "feeTypeLabel", lang), receipt.feeType.name],
            [t("parentPages", "methodLabel", lang), receipt.method ?? "—"],
          ].map(([label, value]) => (
            <div key={label} className="flex items-start justify-between gap-4">
              <span className="shrink-0 text-xs text-gray-400">{label}</span>
              <span className="text-right text-xs font-semibold text-gray-900">{value}</span>
            </div>
          ))}
          <div className="flex items-center justify-between border-t border-dashed border-gray-200 pt-3">
            <span className="font-bold text-gray-900">{t("parentPages", "amountPaidLabel", lang)}</span>
            <span className="text-xl font-bold text-primary-600">₹{Number(receipt.paidAmount ?? 0).toLocaleString()}</span>
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

function SummaryCard({
  label, value, accent,
}: { label: string; value: string; accent: "emerald" | "red" | "amber" }) {
  const tones = {
    emerald: { card: "bg-primary-50 border-primary-100", label: "text-primary-600", value: "text-primary-700" },
    red:     { card: "bg-red-50 border-red-100",         label: "text-red-500",     value: "text-red-600" },
    amber:   { card: "bg-amber-50 border-amber-100",     label: "text-amber-600",   value: "text-amber-700" },
  } as const;
  const t = tones[accent];
  return (
    <div className={cn("rounded-2xl p-4 border", t.card)}>
      <p className={cn("text-xs mb-1 font-semibold", t.label)}>{label}</p>
      <p className={cn("text-2xl font-bold tabular-nums", t.value)}>{value}</p>
    </div>
  );
}

function getFrequencyLabel(frequency: string | null | undefined, kind: string, lang: "en" | "ml"): string | null {
  if (kind === "ONE_TIME") return t("parentPages", "frequencyOneTime", lang);
  if (frequency === "MONTHLY") return t("parentPages", "frequencyMonthly", lang);
  if (frequency === "YEARLY") return t("parentPages", "frequencyYearly", lang);
  return null;
}

export default function ParentFeesPage() {
  const { user, accessToken, activeStudentId } = useAuthStore();
  const { lang } = useLanguageStore();
  const [filter, setFilter] = useState<FilterTab>("ALL");
  const [search, setSearch] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);

  const cid   = user?.clientId ?? "";
  const token = accessToken ?? "";
  const ids   = user?.accessibleStudentIds ?? [];
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

  const filteredPayments = useMemo(() => {
    if (!activeSummary) return [];
    const payments = activeSummary.payments.filter((p) =>
      p.feeType.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()),
    );
    if (filter === "ALL") return payments;
    if (filter === "PENDING") {
      return payments.filter((p) => p.status === "PENDING" || p.status === "PARTIAL");
    }
    if (filter === "PAID") {
      return payments.filter((p) => p.status === "PAID" || p.status === "WAIVED");
    }
    if (filter === "OVERDUE") {
      return payments.filter((p) => p.status === "OVERDUE");
    }
    return payments;
  }, [activeSummary, filter, search]);

  const overdueCount = activeSummary?.payments.filter((p) => p.status === "OVERDUE").length ?? 0;
  const totalDue = activeSummary ? Math.max(0, activeSummary.totalDue - activeSummary.totalPaid) : 0;


  return (
    <DashboardLayout>
      <PageHeader title={t("parentPages", "myFeesTitle", lang)} />

      <div className="fixed w-full top-12 z-30    mb-4 flex   gap-2 bg-white !p-2 shadow-lg shadow-gray-400/10 *:my-auto">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={`${t("parentPages", "feeTypeLabel", lang)}...`}
            aria-label={t("parentPages", "feeTypeLabel", lang)}
            className="border-0 bg-transparent pl-9 pr-4 text-sm"
          />
        </div>
        <Button
          variant="ghost"
          type="button"
          size="icon-lg"
          onClick={() => setFiltersOpen(true)}
          className="h-10 w-10 shrink-0 rounded-xl text-gray-600 hover:bg-gray-100"
          aria-label={t("common", "status", lang)}
        >
          <SlidersHorizontal className="h-4 w-4" />
        </Button>
      </div>

      <Drawer open={filtersOpen} onOpenChange={setFiltersOpen} swipeDirection="down">
        <DrawerContent className="max-h-[85dvh] bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          <DrawerTitle className="mb-6 text-lg font-bold text-gray-900">Filters</DrawerTitle>
          <section>
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-400">
              {t("common", "status", lang)}
            </h3>
            <Tabs value={filter} onValueChange={(value) => setFilter(value as FilterTab)} className="w-full">
              <TabsList className="grid h-auto w-full grid-cols-4">
                {FILTER_TABS.map((tab) => (
                  <TabsTrigger key={tab.id} value={tab.id} className="px-2 py-2 text-xs">
                    {t("parentPages", tab.labelKey as any, lang)}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </section>
          <DrawerClose className="mt-8 h-10 w-full rounded-xl bg-primary-600 text-sm font-semibold text-white">
            Done
          </DrawerClose>
        </DrawerContent>
      </Drawer>

      {errorMessage && <ApiErrorBanner message={errorMessage} onRetry={() => refetch()} />}
      {receiptMutation.error && (
        <ApiErrorBanner message={(receiptMutation.error as Error).message} />
      )}

      {isLoading ? (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
          </div>
          <Skeleton className="h-10 w-full rounded-xl" />
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-14 rounded-xl" />
            ))}
          </div>
        </div>
      ) : !ids.length ? (
        <div className="text-center py-16 text-gray-400 text-sm">
          {t("parentPages", "noChildrenAccount", lang)}
        </div>
      ) : (
        <>
          {activeInfo && (
            <p className="mb-4 text-sm text-gray-500">
              {activeInfo.name}
              {activeInfo.className ? ` · ${activeInfo.className}` : ""}
            </p>
          )}

          {activeSummary ? (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <SummaryCard
                  label={t("parentPages", "totalPaidFees", lang)}
                  value={`₹${Number(activeSummary.totalPaid).toLocaleString()}`}
                  accent="emerald"
                />
                <SummaryCard
                  label={t("parentPages", "totalDueLabel", lang)}
                  value={`₹${totalDue.toLocaleString()}`}
                  accent={totalDue > 0 ? "red" : "emerald"}
                />
              </div>

              {/* Overdue alert */}
              {overdueCount > 0 && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-2xl px-4 py-3 mb-4">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <p className="text-sm text-red-700">
                    <span className="font-bold">{overdueCount}</span>{" "}
                    {t("parentPages", "overdueAlert", lang)}
                  </p>
                </div>
              )}

              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-base font-semibold text-foreground">
                  {t("parentPages", "paymentHistory", lang)}
                  <span className="text-sm font-normal text-muted-foreground"> · {filteredPayments.length} total</span>
                </h2>
                <Button variant="ghost" size="sm" onClick={() => refetch()} className="text-muted-foreground">
                  <RefreshCw className="h-3.5 w-3.5" />
                  {t("teacherPages", "refreshBtn", lang)}
                </Button>
              </div>

              <div className="overflow-hidden rounded-xl border bg-background">
                <Table className="min-w-[760px]">
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>{t("parentPages", "feeTypeLabel", lang)}</TableHead>
                      <TableHead>{t("parentPages", "amountCol", lang)}</TableHead>
                      <TableHead>{t("parentPages", "statusCol", lang)}</TableHead>
                      <TableHead>{t("parentPages", "dueDateCol", lang)}</TableHead>
                      <TableHead>{t("parentPages", "paidOnCol", lang)}</TableHead>
                      <TableHead><span className="sr-only">{t("parentPages", "viewReceiptBtn", lang)}</span></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPayments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-28 text-center text-muted-foreground">
                          {t("parentPages", "noPaymentRecords", lang)}
                        </TableCell>
                      </TableRow>
                    ) : filteredPayments.map((payment) => {
                      const isReceiptLoading = receiptMutation.isPending && receiptMutation.variables === payment.id;
                      return (
                        <TableRow key={payment.id}>
                          <TableCell className="font-medium text-foreground">{payment.feeType.name}</TableCell>
                          <TableCell className="font-medium whitespace-nowrap">
                            {payment.feeType.isDonation ? "Variable" : `₹${Number(payment.dueAmount).toLocaleString()}`}
                          </TableCell>
                          <TableCell><StatusBadge status={payment.status} lang={lang} /></TableCell>
                          <TableCell className="whitespace-nowrap text-muted-foreground">
                            {payment.dueDate ? new Date(payment.dueDate).toLocaleDateString("en-GB") : "—"}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            <span className={payment.paidAt ? "text-primary-700" : "text-muted-foreground"}>
                              {payment.paidAt ? new Date(payment.paidAt).toLocaleDateString("en-GB") : "—"}
                            </span>
                            {payment.method && (
                              <p className="text-xs text-muted-foreground">
                                {t("parentPages", METHOD_LABEL_KEYS[payment.method] as any, lang)}
                              </p>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {payment.status === "PAID" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => showReceipt(payment.id)}
                                disabled={isReceiptLoading}
                                className="text-primary-700"
                              >
                                {isReceiptLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Receipt className="h-3.5 w-3.5" />}
                                {t("parentPages", "viewReceiptBtn", lang)}
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Applicable fees */}
              {activeSummary.feeTypes.length > 0 && (
                <>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mt-6 mb-3">
                    {t("parentPages", "applicableFees", lang)}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {activeSummary.feeTypes.map((ft) => {
                      const freq = getFrequencyLabel(ft.frequency, ft.kind, lang);
                      return (
                        <div
                          key={ft.id}
                          className="h-10 px-4 rounded-md inline-flex items-center gap-1.5 bg-white border border-gray-200 text-gray-700 text-xs font-semibold"
                        >
                          <IndianRupee className="w-3.5 h-3.5 text-primary-600" />
                          <span>{ft.name}</span>
                          {freq && <span className="text-gray-400">· {freq}</span>}
                          <span className="text-gray-400 ml-1">{ft.isDonation ? "Variable" : `₹${Number(ft.amount).toLocaleString()}`}</span>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </>
          ) : data?.[activeId] instanceof Error ? (
            <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-2xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {(data[activeId] as Error).message}
            </div>
          ) : (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-14 rounded-xl" />
              ))}
            </div>
          )}
        </>
      )}

      {receipt && (
        <ReceiptModal receipt={receipt} onClose={() => setReceipt(null)} lang={lang} />
      )}
    </DashboardLayout>
  );
}
