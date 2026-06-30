import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { ApiErrorBanner } from "@/components/ui/ApiErrorBanner";
import { DataTable, type Column } from "@/components/ui/DataTable";
import type { ReceiptData, FeePayment, FeePaymentStatus, StudentFeeSummary } from "@/lib/fees-api";
import { useAuthStore } from "@/store/auth";
import { useLanguageStore } from "@/store/language";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/Skeleton";
import { useStudentFeesBatch, usePaymentReceipt } from "@/lib/queries";
import {
  IndianRupee, Loader2, Receipt, Printer,
  AlertCircle, RefreshCw, CheckCircle2, CalendarClock,
  CircleDollarSign, Wallet, XCircle, Sparkles,
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
  { bg: string; text: string; ring: string; icon: typeof CheckCircle2; labelKey: string }
> = {
  PAID:    { bg: "bg-emerald-50", text: "text-emerald-700", ring: "ring-emerald-200/70", icon: CheckCircle2,    labelKey: "paidStatusLabel" },
  PENDING: { bg: "bg-amber-50",   text: "text-amber-700",   ring: "ring-amber-200/70",   icon: CalendarClock,   labelKey: "pendingStatusLabel" },
  PARTIAL: { bg: "bg-blue-50",    text: "text-blue-700",    ring: "ring-blue-200/70",    icon: CircleDollarSign,labelKey: "partialStatusLabel" },
  OVERDUE: { bg: "bg-red-50",     text: "text-red-700",     ring: "ring-red-200/70",     icon: AlertCircle,     labelKey: "overdueStatusLabel" },
  WAIVED:  { bg: "bg-gray-100",   text: "text-gray-600",    ring: "ring-gray-200/70",   icon: Sparkles,        labelKey: "waivedStatusLabel" },
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
  const Icon = m.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold ring-1",
        m.bg, m.text, m.ring,
      )}
    >
      <Icon className="w-3 h-3" />
      {t("parentPages", m.labelKey as any, lang)}
    </span>
  );
}

function ReceiptModal({
  receipt, onClose, lang,
}: { receipt: ReceiptData; onClose: () => void; lang: "en" | "ml" }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <motion.div
        initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        className="relative bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-sm p-6 shadow-2xl"
      >
        <div className="text-center mb-4 border-b border-dashed pb-4">
          <p className="font-bold text-lg">{receipt.client.name}</p>
          {receipt.client.address && (
            <p className="text-xs text-gray-500">{receipt.client.address}</p>
          )}
          <p className="text-xs font-bold text-emerald-700 mt-1 uppercase tracking-widest">
            {t("parentPages", "feeReceipt", lang)}
          </p>
        </div>
        <div className="space-y-2 text-sm mb-4">
          {[
            [t("parentPages", "receiptNo", lang), receipt.reference ?? receipt.id.slice(0, 8).toUpperCase()],
            [t("parentPages", "dateLabel", lang), receipt.paidAt ? new Date(receipt.paidAt).toLocaleDateString("en-GB") : "—"],
            [t("parentPages", "studentLabel", lang), receipt.student.name],
            [t("parentPages", "admNoLabel", lang), receipt.student.adno],
            [t("parentPages", "classInfoLabel", lang), receipt.student.class?.name ?? "—"],
            [t("parentPages", "feeTypeLabel", lang), receipt.feeType.name],
            [t("parentPages", "amountPaidLabel", lang), `₹${Number(receipt.paidAmount ?? 0).toLocaleString()}`],
            [t("parentPages", "methodLabel", lang), receipt.method ?? "—"],
          ].map(([label, value]) => (
            <div key={label} className="flex items-center justify-between">
              <span className="text-gray-500">{label}</span>
              <span className="font-semibold">{value}</span>
            </div>
          ))}
        </div>
        {receipt.notes && (
          <p className="text-xs text-gray-400 italic mb-4">
            {t("parentPages", "noteLabel", lang)}: {receipt.notes}
          </p>
        )}
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border text-sm font-semibold text-gray-600"
          >
            {t("parentPages", "closeBtn", lang)}
          </button>
          <button
            onClick={() => window.print()}
            className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold flex items-center justify-center gap-1.5"
          >
            <Printer className="w-4 h-4" /> {t("parentPages", "printBtn", lang)}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function SummaryCard({
  label, value, accent,
}: { label: string; value: string; accent: "emerald" | "red" | "amber" }) {
  const tones = {
    emerald: { card: "bg-emerald-50 border-emerald-100", label: "text-emerald-600", value: "text-emerald-700" },
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

type PaymentRow = Omit<FeePayment, "student">;

export default function ParentFeesPage() {
  const { user, accessToken } = useAuthStore();
  const { lang } = useLanguageStore();
  const [activeIdx, setActiveIdx] = useState(0);
  const [filter, setFilter] = useState<FilterTab>("ALL");
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);

  const cid   = user?.clientId ?? "";
  const token = accessToken ?? "";
  const ids   = user?.accessibleStudentIds ?? [];
  const accessibleStudents = user?.accessibleStudents ?? [];

  const { data, isLoading, error, refetch, isRefetching } = useStudentFeesBatch(
    { clientId: cid, token },
    ids,
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

  const activeId = ids[activeIdx];
  const activeSummary = activeId ? getSummary(activeId) : null;
  const activeInfo = accessibleStudents.find((s) => s.id === activeId);
  const errorMessage = error instanceof Error ? error.message : null;

  const counts = useMemo(() => {
    const empty = { ALL: 0, PENDING: 0, PAID: 0, OVERDUE: 0 };
    if (!activeSummary) return empty;
    const all = activeSummary.payments;
    return {
      ALL: all.length,
      PENDING: all.filter((p) => p.status === "PENDING" || p.status === "PARTIAL").length,
      PAID: all.filter((p) => p.status === "PAID" || p.status === "WAIVED").length,
      OVERDUE: all.filter((p) => p.status === "OVERDUE").length,
    };
  }, [activeSummary]);

  const filteredPayments = useMemo(() => {
    if (!activeSummary) return [];
    if (filter === "ALL") return activeSummary.payments;
    if (filter === "PENDING") {
      return activeSummary.payments.filter((p) => p.status === "PENDING" || p.status === "PARTIAL");
    }
    if (filter === "PAID") {
      return activeSummary.payments.filter((p) => p.status === "PAID" || p.status === "WAIVED");
    }
    if (filter === "OVERDUE") {
      return activeSummary.payments.filter((p) => p.status === "OVERDUE");
    }
    return activeSummary.payments;
  }, [activeSummary, filter]);

  const overdueCount = activeSummary?.payments.filter((p) => p.status === "OVERDUE").length ?? 0;
  const totalDue = activeSummary ? Math.max(0, activeSummary.totalDue - activeSummary.totalPaid) : 0;

  // Look up frequency from the parent feeTypes list (the payments' feeType
  // type doesn't carry it, but the summary's feeTypes does)
  const frequencyById = useMemo(() => {
    const map = new Map<string, { frequency: string | null; kind: string }>();
    activeSummary?.feeTypes.forEach((ft) => map.set(ft.id, { frequency: ft.frequency, kind: ft.kind }));
    return map;
  }, [activeSummary]);

  const columns: Column<PaymentRow>[] = useMemo(() => [
    {
      key: "feeType",
      header: t("parentPages", "feeTypeLabel", lang),
      render: (p) => {
        const meta = frequencyById.get(p.feeType.id);
        const freq = meta ? getFrequencyLabel(meta.frequency, meta.kind, lang) : null;
        return (
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 text-sm truncate">{p.feeType.name}</p>
            {freq && <p className="text-xs text-gray-400 mt-0.5">{freq}</p>}
          </div>
        );
      },
    },
    {
      key: "amount",
      header: t("parentPages", "amountCol", lang),
      className: "text-right",
      headerClass: "text-right",
      render: (p) => (
        <span className="font-bold text-gray-900 tabular-nums whitespace-nowrap">
          ₹{Number(p.dueAmount).toLocaleString()}
        </span>
      ),
    },
    {
      key: "dueDate",
      header: t("parentPages", "dueDateCol", lang),
      render: (p) => (
        <span className="text-sm text-gray-700 tabular-nums whitespace-nowrap">
          {p.dueDate ? new Date(p.dueDate).toLocaleDateString("en-GB") : "—"}
        </span>
      ),
    },
    {
      key: "paidAt",
      header: t("parentPages", "paidOnCol", lang),
      render: (p) => (
        <span
          className={cn(
            "text-sm tabular-nums whitespace-nowrap",
            p.paidAt ? "text-emerald-700 font-semibold" : "text-gray-400",
          )}
        >
          {p.paidAt ? new Date(p.paidAt).toLocaleDateString("en-GB") : "—"}
        </span>
      ),
    },
    {
      key: "method",
      header: t("parentPages", "methodCol", lang),
      render: (p) => (
        <span className="text-sm text-gray-700">
          {p.method ? t("parentPages", METHOD_LABEL_KEYS[p.method] as any, lang) : <span className="text-gray-400">—</span>}
        </span>
      ),
    },
    {
      key: "status",
      header: t("parentPages", "statusCol", lang),
      render: (p) => <StatusBadge status={p.status} lang={lang} />,
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      headerClass: "text-right",
      render: (p) => {
        if (p.status !== "PAID") return null;
        const isLoading = receiptMutation.isPending && receiptMutation.variables === p.id;
        return (
          <button
            onClick={(e) => { e.stopPropagation(); showReceipt(p.id); }}
            disabled={isLoading}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-emerald-700 hover:bg-emerald-50 border border-emerald-100 transition-colors disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Receipt className="w-3 h-3" />
            )}
            {t("parentPages", "viewReceiptBtn", lang)}
          </button>
        );
      },
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [lang, receiptMutation.isPending, receiptMutation.variables]);

  const mobileRender = (p: PaymentRow) => {
    const isLoading = receiptMutation.isPending && receiptMutation.variables === p.id;
    return (
      <div className="space-y-2.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-gray-900 text-sm truncate">{p.feeType.name}</p>
            <p className="text-xs text-gray-400 mt-0.5 tabular-nums">
              {p.dueDate
                ? `${t("parentPages", "duePrefix", lang)} ${new Date(p.dueDate).toLocaleDateString("en-GB")}`
                : "—"}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="font-bold text-gray-900 text-lg tabular-nums">
              ₹{Number(p.dueAmount).toLocaleString()}
            </p>
            <div className="mt-1.5">
              <StatusBadge status={p.status} lang={lang} />
            </div>
          </div>
        </div>

        {p.paidAt && (
          <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {t("parentPages", "paidPrefix", lang)} {new Date(p.paidAt).toLocaleDateString("en-GB")}
            {p.method && (
              <span className="text-gray-400 font-normal ml-1">
                · {t("parentPages", METHOD_LABEL_KEYS[p.method] as any, lang)}
              </span>
            )}
          </div>
        )}

        {p.status === "PAID" ? (
          <button
            onClick={() => showReceipt(p.id)}
            disabled={isLoading}
            className="w-full py-2 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Receipt className="w-3 h-3" />
            )}
            {t("parentPages", "viewReceiptBtn", lang)}
          </button>
        ) : (
          <div className="bg-amber-50 rounded-lg px-3 py-2 text-xs text-amber-700 font-semibold flex items-center gap-1.5">
            <AlertCircle className="w-3 h-3 shrink-0" />
            {t("parentPages", "paymentPendingMsg", lang)}
          </div>
        )}
      </div>
    );
  };

  return (
    <DashboardLayout>
      <PageHeader
        title={t("parentPages", "myFeesTitle", lang)}
        subtitle={t("parentPages", "feesSub", lang)}
        icon={IndianRupee}
        action={
          <button
            onClick={() => refetch()}
            disabled={isRefetching}
            aria-label="Refresh"
            className="p-2 rounded-xl bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn("w-4 h-4", isRefetching && "animate-spin")} />
          </button>
        }
      />

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
          {/* Child tabs */}
          {ids.length > 1 && (
            <div className="flex gap-2 mb-5">
              {ids.map((sid, i) => {
                const info = accessibleStudents.find((s) => s.id === sid);
                const s = getSummary(sid);
                const childError = s ? null : data?.[sid] instanceof Error ? (data[sid] as Error).message : null;
                return (
                  <button
                    key={sid}
                    onClick={() => setActiveIdx(i)}
                    className={cn(
                      "flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all truncate",
                      i === activeIdx
                        ? "bg-emerald-600 text-white shadow-sm"
                        : "bg-white border border-gray-200 text-gray-600 hover:border-gray-300",
                    )}
                  >
                    {info?.name ?? `Child ${i + 1}`}
                    {childError && <XCircle className="w-3 h-3 inline ml-1 opacity-60" />}
                  </button>
                );
              })}
            </div>
          )}

          {/* Single child name + class */}
          {ids.length === 1 && activeInfo && (
            <p className="text-sm text-gray-500 mb-4">
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

              {/* Filter tabs */}
              <div className="flex items-center justify-between gap-3 mb-3">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  {t("parentPages", "paymentHistory", lang)}
                </p>
                <div className="flex gap-1 bg-gray-100 rounded-xl p-0.5">
                  {FILTER_TABS.map((f) => {
                    const isActive = filter === f.id;
                    const count = counts[f.id];
                    return (
                      <button
                        key={f.id}
                        onClick={() => setFilter(f.id)}
                        className={cn(
                          "flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                          isActive
                            ? "bg-white text-emerald-700 shadow-sm"
                            : "text-gray-500 hover:text-gray-700",
                        )}
                      >
                        <span>{t("parentPages", f.labelKey as any, lang)}</span>
                        <span
                          className={cn(
                            "min-w-[1.25rem] text-center rounded-md text-[10px] font-bold px-1",
                            isActive ? "bg-emerald-50 text-emerald-600" : "bg-white/60 text-gray-400",
                          )}
                        >
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Payment table */}
              <DataTable
                columns={columns}
                data={filteredPayments}
                keyExtractor={(p) => p.id}
                emptyIcon={Wallet}
                emptyMessage={t("parentPages", "noPaymentRecords", lang)}
                mobileRender={mobileRender}
              />

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
                          <IndianRupee className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{ft.name}</span>
                          {freq && <span className="text-gray-400">· {freq}</span>}
                          <span className="text-gray-400 ml-1">₹{Number(ft.amount).toLocaleString()}</span>
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
