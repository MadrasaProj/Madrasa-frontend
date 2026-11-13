import { SkeletonList } from "@/components/ui/Skeleton";
import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useTenantPath } from "@/hooks/useTenantPath";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { ClassPicker } from "@/components/ui/ClassPicker";
import { FeeStats } from "@/components/fees/FeeStats";
import { FeeTypeList } from "@/components/fees/FeeTypeList";
import { TeacherFeesContent } from "@/app/teacher/fees/page";
import { useLanguageStore } from "@/store/language";
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
  getFeeSummary,
  getTransactions,
  createFeeTransaction,
  deleteFeeTransaction,
  getTransactionSummary,
  type FeeType,
  type FeePayment,
  type FeePaymentStatus,
  type FeeTransaction,
  type TransactionSummary,
  type FeeSummaryResponse,
} from "@/lib/fees-api";
import { useAuthStore } from "@/store/auth";
import { useClasses, useTeachers } from "@/lib/queries";
import { cn } from "@/lib/utils";
import {
  CreditCard,
  Loader2,
  CheckCircle,
  Users,
  Zap,
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

const formatCurrency = (value: number) => `₹${value.toLocaleString("en-IN")}`;

export default function AdminFeesPage() {
  const tenantPath = useTenantPath();
  const { lang } = useLanguageStore();
  const { user, accessToken, activeClientId } = useAuthStore();
  const cid = activeClientId ?? "";
  const token = accessToken ?? "";

  const [feeTypes, setFeeTypes] = useState<FeeType[]>([]);
  const [activeTypeId, setActiveTypeId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [typesLoading, setTypesLoading] = useState(true);
  const [filterClass, setFilterClass] = useState("");

  const [tab, setTab] = useState<"records" | "reports" | "transactions">(
    "records",
  );

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

  const teachersOnly = Object.fromEntries((teachersData?.data ?? []).map((teacher) => [teacher.id, teacher.name]));

  useEffect(() => {
    if (!cid || !token) return;
    loadTypes();
  }, [cid, token, loadTypes]);

  // Stats / Report
  const [summary, setSummary] = useState<FeeSummaryResponse | null>(null);
  const [overviewPayments, setOverviewPayments] = useState<FeePayment[] | null>(null);
  const [overviewRevision, setOverviewRevision] = useState(0);
  const reportFeeTypeId = activeTypeId ?? "";
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

  useEffect(() => {
    if (!cid || !token) {
      setOverviewPayments(null);
      return;
    }
    const controller = new AbortController();
    setOverviewPayments(null);
    const loadOverviewPayments = async () => {
      try {
        const rows: FeePayment[] = [];
        while (true) {
          const result = await getPayments(cid, token, {
            classId: filterClass || undefined,
            academicYearId: user?.defaultAcademicYearId ?? undefined,
            skip: rows.length,
            take: 200,
            signal: controller.signal,
          });
          rows.push(...result.payments);
          if (rows.length >= result.total) break;
          if (result.payments.length === 0) throw new Error("Could not load all payment records");
        }
        if (!controller.signal.aborted) setOverviewPayments(rows);
      } catch (cause) {
        if (!controller.signal.aborted) setError((cause as Error).message);
      }
    };
    void loadOverviewPayments();
    return () => controller.abort();
  }, [cid, token, filterClass, user?.defaultAcademicYearId, overviewRevision]);

  const loadReportData = useCallback(async () => {
    if (!cid || !token) return;
    setReportPayLoading(true);
    try {
      const [summaryData, paymentsForReport] = await Promise.all([
        getFeeSummary(cid, token, user?.defaultAcademicYearId ?? undefined),
        (async () => {
          const rows: FeePayment[] = [];
          while (true) {
            const result = await getPayments(cid, token, {
              feeTypeId: reportFeeTypeId || undefined,
              classId: filterClass || undefined,
              academicYearId: user?.defaultAcademicYearId ?? undefined,
              skip: rows.length,
              take: 200,
            });
            rows.push(...result.payments);
            if (rows.length >= result.total) return rows;
            if (result.payments.length === 0) throw new Error("Could not load all report payments");
          }
        })(),
      ]);
      setSummary(summaryData);
      setReportPayments(paymentsForReport);
    } catch {
      /* silent */
    } finally {
      setReportPayLoading(false);
    }
  }, [cid, token, user?.defaultAcademicYearId, reportFeeTypeId, filterClass]);

  useEffect(() => {
    if (drawerOpen && tab === "reports") loadReportData();
  }, [drawerOpen, tab, loadReportData]);

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
    if (drawerOpen && tab === "transactions") {
      loadTransactions();
      loadTxSummary();
      loadTxStudentTotals();
    }
  }, [drawerOpen, tab, loadTransactions, loadTxSummary, loadTxStudentTotals]);

  const selectType = (id: string) => {
    setActiveTypeId(id);
    setTab("records");
    setDrawerOpen(true);
  };

  const activeType = feeTypes.find((feeType) => feeType.id === activeTypeId);

  const feeTypeTotals = new Map((summary?.byFeeType ?? []).map((item) => [
    item.feeTypeId as string,
    { collected: Number(item._sum.paidAmount ?? 0), due: Number(item._sum.dueAmount ?? 0) },
  ]));
  if (overviewPayments) {
    feeTypeTotals.clear();
    for (const payment of overviewPayments) {
      if (payment.status === "WAIVED") continue;
      const totals = feeTypeTotals.get(payment.feeType.id) ?? { collected: 0, due: 0 };
      totals.collected += Number(payment.paidAmount ?? (payment.status === "PAID" ? payment.dueAmount : 0));
      totals.due += Math.max(Number(payment.dueAmount), Number(payment.paidAmount ?? 0));
      feeTypeTotals.set(payment.feeType.id, totals);
    }
  }
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
      <PageHeader
        title="Fees & Payments"
        switcher={
          <ClassPicker
            title="Class"
            value={filterClass}
            options={[{ value: "", label: "All classes" }, ...classes.map((item) => ({ value: item.id, label: item.name }))]}
            onChange={(value) => {
              setFilterClass(value);
              setActiveTypeId(null);
              setDrawerOpen(false);
            }}
            placeholder="All classes"
          />
        }
      />

      {error && (
        <ApiErrorBanner
          message={error}
          onRetry={() => {
            loadTypes();
            loadSummary();
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
          {overviewPayments === null ? <SkeletonList count={3} /> : <FeeStats payments={overviewPayments} lang={lang} />}

          <div className="mb-6">
            <FeeTypeList
              items={feeTypes
                .filter((feeType) => !filterClass || feeType.targetClassIds.length === 0 || feeType.targetClassIds.includes(filterClass))
                .map((feeType) => {
                  const totals = feeTypeTotals.get(feeType.id);
                  return { feeType, collected: totals?.collected ?? 0, total: totals?.due ?? 0 };
                })}
              lang={lang}
              selectedId={drawerOpen ? activeTypeId : null}
              onSelect={selectType}
              title="Fee types"
              action={
                <Link to={tenantPath("/admin/fees/types")} className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-primary-500">
                  <Zap className="size-4" /> Manage types
                </Link>
              }
            />
          </div>

          <ResponsivePopover
            open={drawerOpen}
            onOpenChange={setDrawerOpen}
            title={activeType?.name ?? "Fees"}
            description={filterClass ? classes.find((item) => item.id === filterClass)?.name : "All classes"}
            fullHeight
            fullHeightWidth="min(56rem, 100vw)"
            className="max-w-4xl"
            
          >
              <Tabs value={tab} onValueChange={(value) => setTab(value as typeof tab)} className="shrink-0 px-4 py-2 sm:px-6">
                <TabsList className="max-w-full overflow-x-auto shadow-none">
                  <TabsTrigger value="records" className="shadow-none!">Payment records</TabsTrigger>
                  <TabsTrigger value="transactions" className="shadow-none!">Transactions</TabsTrigger>
                  <TabsTrigger value="reports" className="shadow-none!">Reports</TabsTrigger>
                </TabsList>
              </Tabs>
              <div className={cn("min-h-0 flex-1 overflow-y-auto", tab === "records" ? "py-4" : "px-4 py-4 sm:px-6")}>

          {drawerOpen && tab === "records" && (
            <TeacherFeesContent
              key={`${filterClass}:${activeTypeId ?? "all"}`}
              classId={filterClass}
              feeTypeId={activeTypeId}
              inlineDetails
              onPaymentChange={() => {
                loadSummary();
                setOverviewRevision((value) => value + 1);
              }}
            />
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
              {reportPayLoading ? (
                <div className="flex items-center justify-center gap-2 py-12 text-gray-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                </div>
              ) : (
                <>
                  <FeeStats payments={reportPayments} lang={lang} />

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
              </div>
          </ResponsivePopover>
        </>
      )}

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
