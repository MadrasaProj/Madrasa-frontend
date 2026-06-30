import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { ApiErrorBanner } from "@/components/ui/ApiErrorBanner";
import type { ReceiptData } from "@/lib/fees-api";
import { useAuthStore } from "@/store/auth";
import { useLanguageStore } from "@/store/language";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/Skeleton";
import { useStudentFeesBatch, usePaymentReceipt } from "@/lib/queries";
import {
  IndianRupee, Loader2, Receipt, Printer,
  AlertCircle, RefreshCw,
} from "lucide-react";
import { motion } from "framer-motion";

const STATUS_COLORS: Record<string, string> = {
  PAID:    "bg-emerald-100 text-emerald-700",
  PENDING: "bg-amber-100 text-amber-700",
  PARTIAL: "bg-blue-100 text-blue-700",
  OVERDUE: "bg-red-100 text-red-700",
  WAIVED:  "bg-gray-100 text-gray-500",
};

function ReceiptModal({ receipt, onClose, lang }: { receipt: ReceiptData; onClose: () => void; lang: "en" | "ml" }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <motion.div
        initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        className="relative bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-sm p-6 shadow-2xl"
      >
        <div className="text-center mb-4 border-b border-dashed pb-4">
          <p className="font-bold text-lg">{receipt.client.name}</p>
          {receipt.client.address && <p className="text-xs text-gray-500">{receipt.client.address}</p>}
          <p className="text-xs font-bold text-emerald-700 mt-1 uppercase tracking-widest">{t("parentPages", "feeReceipt", lang)}</p>
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
        {receipt.notes && <p className="text-xs text-gray-400 italic mb-4">{t("parentPages", "noteLabel", lang)}: {receipt.notes}</p>}
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border text-sm font-semibold text-gray-600">
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

interface ChildData {
  studentId: string;
  error: string | null;
}

export default function ParentFeesPage() {
  const { user, accessToken } = useAuthStore();
  const { lang } = useLanguageStore();
  const [activeIdx, setActiveIdx] = useState(0);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);

  const cid   = user?.clientId ?? "";
  const token = accessToken ?? "";
  const ids   = user?.accessibleStudentIds ?? [];
  const accessibleStudents = user?.accessibleStudents ?? [];

  const { data, isLoading, error, refetch, isRefetching } = useStudentFeesBatch(
    { clientId: cid, token },
    ids,
  );

  const children: ChildData[] = ids.map((sid) => {
    const entry = data?.[sid];
    if (!entry) return { studentId: sid, error: null };
    if (entry instanceof Error) return { studentId: sid, error: entry.message };
    return { studentId: sid, error: null };
  });

  const getSummary = (sid: string) => {
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

  const active = children[activeIdx];
  const activeSummary = active ? getSummary(active.studentId) : null;
  const errorMessage = error instanceof Error ? error.message : null;

  return (
    <DashboardLayout>
      <PageHeader title={t("parentPages", "myFeesTitle", lang)} icon={IndianRupee} action={
        <button onClick={() => refetch()} disabled={isRefetching} className="p-2 rounded-xl bg-gray-100 text-gray-600">
          <RefreshCw className={cn("w-4 h-4", isRefetching && "animate-spin")} />
        </button>
      } />

      {errorMessage && <ApiErrorBanner message={errorMessage} onRetry={() => refetch()} />}
      {receiptMutation.error && <ApiErrorBanner message={(receiptMutation.error as Error).message} />}

      {isLoading ? (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-24 rounded-2xl" />
            ))}
          </div>
          <Skeleton className="h-5 w-40 rounded-lg" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 rounded-2xl" />
            ))}
          </div>
        </div>
      ) : !ids.length ? (
        <div className="text-center py-16 text-gray-400 text-sm">{t("parentPages", "noChildrenAccount", lang)}</div>
      ) : (
        <>
          {/* Child tabs */}
          {children.length > 1 && (
            <div className="flex gap-2 mb-5">
              {children.map((c, i) => {
                const info = accessibleStudents.find((s) => s.id === c.studentId);
                return (
                  <button
                    key={c.studentId}
                    onClick={() => setActiveIdx(i)}
                    className={cn(
                      "flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all",
                      i === activeIdx
                        ? "bg-emerald-600 text-white"
                        : "bg-white border border-gray-200 text-gray-600",
                    )}
                  >
                    {info?.name ?? `Child ${i + 1}`}
                  </button>
                );
              })}
            </div>
          )}

          {active?.error ? (
            <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-2xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" /> {active.error}
            </div>
          ) : activeSummary ? (
            <>
              {/* Student name if single child */}
              {children.length === 1 && (() => {
                const info = accessibleStudents.find((s) => s.id === active.studentId);
                return info ? (
                  <p className="text-sm text-gray-500 mb-4">{info.name}{info.className ? ` · ${info.className}` : ""}</p>
                ) : null;
              })()}

              {/* Summary cards */}
              <div className="grid grid-cols-2 gap-3 mb-5">
                <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100">
                  <p className="text-xs text-emerald-600 mb-1">{t("parentPages", "totalPaidFees", lang)}</p>
                  <p className="text-2xl font-bold text-emerald-700">₹{Number(activeSummary.totalPaid).toLocaleString()}</p>
                </div>
                <div className="bg-red-50 rounded-2xl p-4 border border-red-100">
                  <p className="text-xs text-red-500 mb-1">{t("parentPages", "pendingLabel", lang)}</p>
                  <p className="text-2xl font-bold text-red-600">
                    ₹{Math.max(0, activeSummary.totalDue - activeSummary.totalPaid).toLocaleString()}
                  </p>
                </div>
              </div>

              {activeSummary.pendingCount > 0 && (
                <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3 mb-4">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <p className="text-sm text-amber-700">
                    <span className="font-bold">{activeSummary.pendingCount}</span> {t("parentPages", "pendingPayments", lang)}
                  </p>
                </div>
              )}

              {/* Payment list */}
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">{t("parentPages", "paymentHistory", lang)}</p>
              <div className="space-y-3">
                {activeSummary.payments.length === 0 ? (
                  <div className="text-center py-10 text-gray-400 text-sm">{t("parentPages", "noPaymentRecords", lang)}</div>
                ) : (
                  activeSummary.payments.map((p, i) => {
                    const isPaid = p.status === "PAID";
                    return (
                      <motion.div
                        key={p.id}
                        initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                        className="bg-white rounded-2xl border border-gray-100 p-4"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-semibold text-gray-900 text-sm">{p.feeType.name}</p>
                            {p.dueDate && (
                              <p className="text-xs text-gray-400">
                                {t("parentPages", "duePrefix", lang)} {new Date(p.dueDate).toLocaleDateString("en-GB")}
                              </p>
                            )}
                            {isPaid && p.paidAt && (
                              <p className="text-xs text-emerald-600">
                                {t("parentPages", "paidPrefix", lang)} {new Date(p.paidAt).toLocaleDateString("en-GB")}
                                {p.reference ? ` · ${p.reference}` : ""}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-gray-900">₹{Number(p.dueAmount).toLocaleString()}</p>
                            <span className={cn(
                              "text-xs font-semibold px-2 py-0.5 rounded-lg inline-block mt-1",
                              STATUS_COLORS[p.status] ?? STATUS_COLORS.PENDING,
                            )}>
                              {p.status}
                            </span>
                          </div>
                        </div>

                        {isPaid && (
                          <button
                            onClick={() => showReceipt(p.id)}
                            disabled={receiptMutation.isPending && receiptMutation.variables === p.id}
                            className="w-full py-2 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-semibold flex items-center justify-center gap-1.5"
                          >
                            {receiptMutation.isPending && receiptMutation.variables === p.id
                              ? <Loader2 className="w-3 h-3 animate-spin" />
                              : <Receipt className="w-3 h-3" />
                            }
                            {t("parentPages", "viewReceiptBtn", lang)}
                          </button>
                        )}
                        {!isPaid && (
                          <div className="bg-amber-50 rounded-xl px-3 py-2 text-xs text-amber-700 font-semibold flex items-center gap-1.5">
                            <AlertCircle className="w-3 h-3 shrink-0" />
                            {t("parentPages", "paymentPendingMsg", lang)}
                          </div>
                        )}
                      </motion.div>
                    );
                  })
                )}
              </div>

              {/* Fee types applicable */}
              {activeSummary.feeTypes.length > 0 && (
                <>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mt-6 mb-3">{t("parentPages", "applicableFees", lang)}</p>
                  <div className="flex flex-wrap gap-2">
                    {activeSummary.feeTypes.map((ft) => (
                      <div key={ft.id} className="h-10 px-4 rounded-md inline-flex items-center gap-1.5 bg-gray-50 text-gray-600 text-xs font-semibold">
                        <IndianRupee className="w-3.5 h-3.5" />
                        {ft.name}
                        <span className="text-gray-400 ml-1">₹{Number(ft.amount).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-28 rounded-2xl" />
              ))}
            </div>
          )}
        </>
      )}

      {receipt && <ReceiptModal receipt={receipt} onClose={() => setReceipt(null)} lang={lang} />}
    </DashboardLayout>
  );
}
