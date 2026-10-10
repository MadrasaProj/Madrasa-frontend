import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { ApiErrorBanner } from "@/components/ui/ApiErrorBanner";
import { Skeleton } from "@/components/ui/Skeleton";
import { Input } from "@/components/ui/input";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { useLanguageStore } from "@/store/language";
import { t, type Lang } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import {
  Loader2,
  Receipt,
  Search,
  RefreshCw,
  Printer,
  SlidersHorizontal,
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
      color: "text-emerald-700",
      bg: "bg-emerald-50",
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
        <div className="bg-emerald-600 px-6 py-5 text-white text-center">
          <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-2">
            <Receipt className="w-6 h-6 text-white" />
          </div>
          <p className="font-bold text-lg">{receipt.client.name}</p>
          <p className="text-emerald-100 text-xs uppercase tracking-widest mt-0.5">
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
            <p className="text-xl font-bold text-emerald-600">
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
            className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5"
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

  const loadTypes = useCallback(async () => {
    if (!cid || !token) return;
    setTypesLoading(true);
    setError(null);
    try {
      setFeeTypes(
        await getFeeTypes(cid, token, user?.defaultAcademicYearId ?? undefined),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setTypesLoading(false);
    }
  }, [cid, token, user?.defaultAcademicYearId]);

  useEffect(() => {
    if (cid && token) loadTypes();
  }, [cid, token, loadTypes]);

  const loadPayments = useCallback(async () => {
    if (!cid || !token) return;
    setPayLoading(true);
    try {
      const res = await getPayments(cid, token, {
        feeTypeId: activeTypeId ?? undefined,
        status:
          statusFilter !== "all"
            ? (statusFilter as FeePaymentStatus)
            : undefined,
        skip: paySkip,
        take: 30,
      });
      setPayments(res.payments);
      setPayTotal(res.total);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPayLoading(false);
    }
  }, [cid, token, activeTypeId, statusFilter, paySkip]);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  const selectType = (id: string | null) => {
    setActiveTypeId(id);
    setPaySkip(0);
    setStatusFilter("all");
    setSearch("");
  };

  const activeType = feeTypes.find((f) => f.id === activeTypeId) ?? null;

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
      <div className="sticky top-12 z-30 -mx-4 mb-4 flex h-12 gap-2 bg-white  px-4 lg:top-[125px] *:my-auto shadow-lg shadow-gray-400/10">
        <div className="relative flex-1 min-w-0 ">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("teacherPages", "searchStudentName", lang)}
            className="border-0 bg-transparent pl-9 pr-4 text-sm"
          />
        </div>
        <Button
          variant="ghost"
          type="button"
          size="icon-lg"
          onClick={() => setFiltersOpen(true)}
          className="h-10 w-10 shrink-0 rounded-xl text-gray-600 hover:bg-gray-100"
          aria-label="Open filters"
        >
          <SlidersHorizontal className="w-4 h-4" />
        </Button>
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
              <DrawerClose className="mt-8 w-full h-10 rounded-xl bg-emerald-600 text-white text-sm font-semibold">Done</DrawerClose>
      </DrawerContent>
      </Drawer>

      {error && <ApiErrorBanner message={error} onRetry={loadPayments} />}

      {typesLoading ? (
        <div className="space-y-5">
          <Skeleton className="h-56 rounded-2xl" />
          <div className="space-y-0 divide-y divide-gray-50 rounded-2xl border border-gray-100 overflow-hidden">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3.5">
                <Skeleton className="w-9 h-9 rounded-xl shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className="h-4 w-16 shrink-0" />
                <Skeleton className="h-6 w-16 rounded-full shrink-0" />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          {payLoading ? (
            <div className="flex items-center justify-center py-10 text-gray-400">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
          ) : (
            <>
              <div className="overflow-hidden rounded-xl border bg-background">
                <div className="flex items-center justify-between border-b bg-muted/30 px-4 py-3">
                  <p className="text-sm font-medium text-muted-foreground">
                    {activeType
                      ? activeType.name
                      : t("teacherPages", "allFeeTypes", lang)}{" "}
                    · {payTotal} total
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={loadPayments}
                    className="text-muted-foreground"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    {t("teacherPages", "refreshBtn", lang)}
                  </Button>
                </div>
                <Table className="min-w-[760px]">
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>{t("common", "name", lang)}</TableHead>
                      <TableHead>{t("parentPages", "feeTypeLabel", lang)}</TableHead>
                      <TableHead>{t("common", "amount", lang)}</TableHead>
                      <TableHead>{t("common", "status", lang)}</TableHead>
                      <TableHead>{t("parentPages", "duePrefix", lang)}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-28 text-center text-muted-foreground">
                          {t("teacherPages", "noPaymentRecords", lang)}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filtered.map((payment) => {
                        const meta = STATUS_META[payment.status] ?? STATUS_META.PENDING;
                        const isPaid = payment.status === "PAID";
                        return (
                          <TableRow
                            key={payment.id}
                            tabIndex={0}
                            role="button"
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
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                event.currentTarget.click();
                              }
                            }}
                            className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                          >
                            <TableCell>
                              <div className="min-w-40">
                                <p className="font-medium text-foreground">{payment.student.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {payment.student.adno}
                                  {payment.student.class ? ` · ${payment.student.class.name}` : ""}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>{payment.feeType.name}</TableCell>
                            <TableCell className="font-medium">
                              {payment.feeType.isDonation
                                ? "Variable"
                                : `₹${Number(payment.dueAmount).toLocaleString()}`}
                            </TableCell>
                            <TableCell>
                              <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-medium", meta.bg, meta.color)}>
                                {meta.label}
                              </span>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {isPaid && payment.paidAt
                                ? new Date(payment.paidAt).toLocaleDateString("en-GB")
                                : payment.dueDate
                                  ? new Date(payment.dueDate).toLocaleDateString("en-GB")
                                  : "—"}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
                <div className="flex flex-wrap items-center justify-between gap-2 border-t bg-muted/30 px-4 py-3 text-xs">
                  <span className="text-muted-foreground">
                    {t("teacherPages", "paidPendingSummary", lang)
                      .replace(
                        "{paid}",
                        String(payments.filter((payment) => payment.status === "PAID").length),
                      )
                      .replace(
                        "{pending}",
                        String(payments.filter((payment) => payment.status !== "PAID" && payment.status !== "WAIVED").length),
                      )}
                  </span>
                  <div className="flex gap-3">
                    <span className="font-medium text-emerald-600">
                      {t("teacherPages", "collectedAmount", lang).replace(
                        "{amount}",
                        payments
                          .filter((payment) => payment.status === "PAID")
                          .reduce((sum, payment) => sum + Number(payment.paidAmount ?? payment.dueAmount), 0)
                          .toLocaleString(),
                      )}
                    </span>
                    <span className="font-medium text-amber-600">
                      {t("teacherPages", "pendingAmount", lang).replace(
                        "{amount}",
                        payments
                          .filter((payment) => payment.status !== "PAID" && payment.status !== "WAIVED")
                          .reduce((sum, payment) => sum + Number(payment.dueAmount), 0)
                          .toLocaleString(),
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {payTotal > 30 && (
                <div className="flex items-center justify-center gap-3 mt-4">
                  <Button
                    variant="ghost"
                    disabled={paySkip === 0}
                    onClick={() => setPaySkip(Math.max(0, paySkip - 30))}
                    className="px-4 py-2 rounded-xl border text-sm disabled:opacity-40"
                  >
                    {t("teacherPages", "prevBtn", lang)}
                  </Button>
                  <span className="text-sm text-gray-500">
                    {paySkip + 1}–{Math.min(paySkip + 30, payTotal)} of{" "}
                    {payTotal}
                  </span>
                  <Button
                    variant="ghost"
                    disabled={paySkip + 30 >= payTotal}
                    onClick={() => setPaySkip(paySkip + 30)}
                    className="px-4 py-2 rounded-xl border text-sm disabled:opacity-40"
                  >
                    {t("teacherPages", "nextBtn", lang)}
                  </Button>
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
