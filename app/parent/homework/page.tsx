import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { ApiErrorBanner } from "@/components/ui/ApiErrorBanner";
import { Drawer } from "@/components/ui/Drawer";
import type { StudentHomeworkItem, HomeworkStatus } from "@/lib/homework-api";
import { useAuthStore } from "@/store/auth";
import { useLanguageStore } from "@/store/language";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  useStudentHomework,
  useStudentRecord,
  useParentSubmitHomework,
} from "@/lib/queries";
import {
  BookOpen,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Clock,
  Calendar,
  RefreshCw,
  ChevronRight,
  ExternalLink,
  GraduationCap,
  BookText,
  User,
  Send,
  CheckCheck,
  Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const STATUS_CONFIG: Record<
  HomeworkStatus,
  {
    labelKey: string;
    color: string;
    dot: string;
    icon: React.ElementType;
    bg: string;
  }
> = {
  NOT_SUBMITTED: {
    labelKey: "pendingLabel",
    color: "bg-red-50 text-red-700 border-red-200 ring-red-400/20",
    dot: "bg-red-500",
    bg: "bg-red-500",
    icon: AlertCircle,
  },
  SUBMITTED: {
    labelKey: "submittedLabel",
    color: "bg-amber-50 text-amber-700 border-amber-200 ring-amber-400/20",
    dot: "bg-amber-500",
    bg: "bg-amber-500",
    icon: Clock,
  },
  CHECKED: {
    labelKey: "checkedLabel",
    color:
      "bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-400/20",
    dot: "bg-emerald-500",
    bg: "bg-emerald-500",
    icon: CheckCircle2,
  },
};

function daysLeftText(dueDate: string): {
  textKey: string;
  days: number;
  urgent: boolean;
  overdue: boolean;
} {
  const due = new Date(dueDate);
  const diff = due.getTime() - Date.now();
  if (diff < 0)
    return { textKey: "overdueText", days: 0, urgent: false, overdue: true };
  const days = Math.ceil(diff / 86400_000);
  if (days === 0)
    return { textKey: "dueToday", days: 0, urgent: true, overdue: false };
  if (days === 1)
    return { textKey: "dayLeft", days: 1, urgent: true, overdue: false };
  return { textKey: "daysLeft", days, urgent: false, overdue: false };
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

function formatDateFull(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function ParentHomeworkPage() {
  const { user, accessToken, activeStudentId } = useAuthStore();
  const { lang } = useLanguageStore();
  const cid = user?.clientId ?? "";
  const token = accessToken ?? "";
  const ids = user?.accessibleStudentIds ?? [];
  const effectiveId = activeStudentId ?? ids[0] ?? "";

  const [filter, setFilter] = useState<HomeworkStatus | "all">("all");
  const [selectedHw, setSelectedHw] = useState<StudentHomeworkItem | null>(
    null,
  );
  const [confirmSubmitHw, setConfirmSubmitHw] =
    useState<StudentHomeworkItem | null>(null);

  const {
    data: hwData,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useStudentHomework({ clientId: cid, token }, effectiveId);
  const { data: student } = useStudentRecord(
    { clientId: cid, token },
    effectiveId,
  );

  const submitMutation = useParentSubmitHomework({ clientId: cid, token });

  const homework = hwData?.homework ?? [];

  const pendingCount = homework.filter(
    (hw) => hw.submission.status === "NOT_SUBMITTED",
  ).length;
  const submittedCount = homework.filter(
    (hw) => hw.submission.status === "SUBMITTED",
  ).length;
  const checkedCount = homework.filter(
    (hw) => hw.submission.status === "CHECKED",
  ).length;

  const handleSubmitHomework = async (submissionId: string) => {
    try {
      await submitMutation.mutateAsync({
        studentId: effectiveId,
        submissionId,
      });
      setConfirmSubmitHw(null);
    } catch (e) {
      alert((e as Error).message);
    }
  };

  const filtered =
    filter === "all"
      ? homework
      : homework.filter((hw) => hw.submission.status === filter);

  const errorMessage = error instanceof Error ? error.message : null;

  return (
    <DashboardLayout>
      <PageHeader
        title={t("parentPages", "homeworkPageTitle", lang)}
        icon={BookOpen}
        back
        backHref="/parent"
        action={
          <button
            onClick={() => refetch()}
            disabled={isRefetching}
            className="p-2.5 rounded-xl bg-white border border-gray-200 text-gray-500 hover:text-gray-800 hover:border-gray-300 transition-all active:scale-95 shadow-sm"
          >
            <RefreshCw
              className={cn("w-4 h-4", isRefetching && "animate-spin")}
            />
          </button>
        }
      />

      {errorMessage && (
        <ApiErrorBanner message={errorMessage} onRetry={() => refetch()} />
      )}

      {isLoading ? (
        <div className="space-y-8 px-1">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 md:h-28 rounded-2xl" />
            ))}
          </div>
          <Skeleton className="h-10 rounded-xl w-72" />
          <div className="hidden md:block rounded-2xl border border-gray-100 bg-white overflow-hidden">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="flex items-center gap-6 p-5 border-b border-gray-50"
              >
                <Skeleton className="h-5 w-56" />
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-6 w-24 rounded-lg" />
                <Skeleton className="h-5 w-32 flex-1" />
                <Skeleton className="h-8 w-20 rounded-xl" />
              </div>
            ))}
          </div>
          <div className="md:hidden space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-52 rounded-2xl" />
            ))}
          </div>
        </div>
      ) : !effectiveId ? (
        <div className="text-center py-24 text-gray-400">
          <User className="w-14 h-14 mx-auto mb-4 text-gray-200" />
          <p className="font-semibold text-lg">
            {t("parentPages", "noChildrenLinked", lang)}
          </p>
          <p className="text-sm text-gray-400 mt-1">
            {t("parentPages", "addChildTrack", lang)}
          </p>
        </div>
      ) : (
        <>
          {errorMessage ? (
            <ApiErrorBanner message={errorMessage} onRetry={() => refetch()} />
          ) : hwData ? (
            <div className="space-y-8">
              {/* Student name banner */}
              {student && (
                <div className="flex items-center gap-4 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 rounded-2xl px-6 py-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white shrink-0 shadow-sm">
                    <GraduationCap className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">{student.name}</p>
                    <p className="text-sm text-gray-500">
                      Class {student.class?.name ?? "—"} &middot;{" "}
                      {homework.length} homework assignments
                    </p>
                  </div>
                </div>
              )}

              {/* Urgent banner */}
              {pendingCount > 0 && (
                <div className="flex items-center gap-3 bg-gradient-to-r from-red-50 to-rose-50 border border-red-200 rounded-2xl px-6 py-4">
                  <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center text-red-600 shrink-0">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <p className="text-sm text-red-700 font-medium">
                    <span className="font-bold text-lg">{pendingCount}</span>{" "}
                    {t("parentPages", "pendingHomeworks", lang)}
                  </p>
                </div>
              )}

              {/* Stats */}
              {/* <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(["NOT_SUBMITTED", "SUBMITTED", "CHECKED"] as const).map(
                  (s: HomeworkStatus) => {
                    const count =
                      s === "NOT_SUBMITTED"
                        ? pendingCount
                        : s === "SUBMITTED"
                          ? submittedCount
                          : checkedCount;
                    const cfg = STATUS_CONFIG[s];
                    const Icon = cfg.icon;
                    const activeFilter = filter === s;
                    return (
                      <button
                        key={s}
                        onClick={() => setFilter(s === filter ? "all" : s)}
                        className={cn(
                          "rounded-2xl p-4 md:p-5 border-2 transition-all text-left relative overflow-hidden group",
                          activeFilter
                            ? "border-gray-900 bg-gray-50 shadow-sm"
                            : "border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm",
                        )}
                      >
                        <div
                          className={cn(
                            "absolute inset-0 opacity-[0.03]",
                            activeFilter ? "bg-gray-900" : cfg.bg,
                          )}
                        />
                        <div className="flex md:flex-col items-center md:items-stretch gap-3 md:gap-0">
                          <div className="">
                            <div
                              className={cn(
                                "w-10 h-10 md:w-11 md:h-11 rounded-xl flex items-center justify-center transition-all shrink-0",
                                activeFilter
                                  ? "bg-gray-900 text-white"
                                  : "bg-gray-50 text-gray-500 group-hover:scale-105",
                              )}
                            >
                              <Icon className="w-5 h-5" />
                            </div>
                            <p className="text-xs md:text-sm font-medium mt-2 text-gray-500 truncate">
                              {t("parentPages", cfg.labelKey as any, lang)}
                            </p>
                          </div>

                          <div className="flex ml-auto md:flex-col items-baseline md:items-stretch gap-2 md:gap-0   min-w-0">
                            <p className="text-xl md:text-3xl font-bold text-gray-900 leading-none md:mb-1">
                              {count}
                            </p>
                          </div>
                          <div
                            className={cn(
                              "md:hidden w-1.5 h-1.5 rounded-full ",
                              activeFilter ? "bg-gray-900" : cfg.dot,
                            )}
                          />
                          
                           
                        </div>
                      </button>
                    );
                  },
                )}
              </div> */}

              {/* Filter tabs */}
              <div className="flex items-center justify-between">
                <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
                  {(
                    ["all", "NOT_SUBMITTED", "SUBMITTED", "CHECKED"] as const
                  ).map((f) => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={cn(
                        "px-4 py-2 rounded-lg text-sm font-semibold transition-all",
                        filter === f
                          ? "bg-white shadow-sm text-gray-900"
                          : "text-gray-500 hover:text-gray-700",
                      )}
                    >
                      {f === "all"
                        ? t("parentPages", "allFilterTab", lang)
                        : t(
                            "parentPages",
                            STATUS_CONFIG[f].labelKey as any,
                            lang,
                          )}
                    </button>
                  ))}
                </div>
                <p className="text-sm text-gray-400 hidden sm:block">
                  {filtered.length}{" "}
                  {t("parentPages", "homeworkAssignments", lang)}
                </p>
              </div>

              {/* ── Desktop table ── */}
              <div className="hidden md:block rounded-2xl border border-gray-100 bg-white overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/80">
                      <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        {t("parentPages", "assignmentCol", lang)}
                      </th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        {t("parentPages", "dueDateCol", lang)}
                      </th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        {t("parentPages", "statusCol", lang)}
                      </th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        {t("parentPages", "teacherNoteCol", lang)}
                      </th>
                      <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        {t("parentPages", "actionCol", lang)}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="text-center py-20 text-gray-400"
                        >
                          <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-200" />
                          <p className="font-semibold">
                            {t("parentPages", "noHomeworkFound", lang)}
                          </p>
                          <p className="text-sm text-gray-400 mt-1">
                            {filter !== "all"
                              ? `${t("parentPages", "noHomeworkCategory", lang)}`
                              : t("parentPages", "noHomeworkFound", lang)}
                          </p>
                        </td>
                      </tr>
                    ) : (
                      filtered.map((hw) => {
                        const due = daysLeftText(hw.dueDate);
                        const cfg = STATUS_CONFIG[hw.submission.status];
                        const Icon = cfg.icon;
                        return (
                          <tr
                            key={hw.id}
                            onClick={() => setSelectedHw(hw)}
                            className="border-b border-gray-50 last:border-0 transition-colors cursor-pointer hover:bg-emerald-50/40 group"
                          >
                            <td className="px-6 py-5">
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500 shrink-0 group-hover:bg-emerald-100 group-hover:text-emerald-600 transition-colors">
                                  <BookText className="w-5 h-5" />
                                </div>
                                <div className="min-w-0">
                                  <p className="font-semibold text-gray-900 truncate">
                                    {hw.title}
                                  </p>
                                  <p className="text-sm text-gray-400 truncate mt-0.5">
                                    {hw.class?.name}
                                    {hw.subject ? ` · ${hw.subject.name}` : ""}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-5">
                              <div className="flex items-center gap-2.5">
                                <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
                                <div>
                                  <span
                                    className={cn(
                                      "text-sm font-medium",
                                      due.overdue
                                        ? "text-red-600"
                                        : due.urgent
                                          ? "text-amber-600"
                                          : "text-gray-700",
                                    )}
                                  >
                                    {formatDate(hw.dueDate)}
                                  </span>
                                  {hw.submission.status === "NOT_SUBMITTED" && (
                                    <span
                                      className={cn(
                                        "ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded",
                                        due.overdue
                                          ? "bg-red-100 text-red-700"
                                          : due.urgent
                                            ? "bg-amber-100 text-amber-700"
                                            : "bg-gray-100 text-gray-500",
                                      )}
                                    >
                                      {due.textKey === "daysLeft"
                                        ? `${due.days} ${t("parentPages", "daysLeft", lang)}`
                                        : t(
                                            "parentPages",
                                            due.textKey as any,
                                            lang,
                                          )}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-5">
                              <span
                                className={cn(
                                  "inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border",
                                  cfg.color,
                                )}
                              >
                                <Icon className="w-3.5 h-3.5" />
                                {t("parentPages", cfg.labelKey as any, lang)}
                              </span>
                            </td>
                            <td className="px-6 py-5 max-w-[220px]">
                              {hw.submission.teacherNote ? (
                                <p className="text-sm text-gray-600 truncate">
                                  {hw.submission.teacherNote}
                                </p>
                              ) : (
                                <span className="text-sm text-gray-300">—</span>
                              )}
                            </td>
                            <td className="px-6 py-5 text-right">
                              {hw.submission.status === "NOT_SUBMITTED" ? (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setConfirmSubmitHw(hw);
                                  }}
                                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-all active:scale-95 shadow-sm"
                                >
                                  <Send className="w-3.5 h-3.5" />
                                  {t("parentPages", "submitBtn", lang)}
                                </button>
                              ) : (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedHw(hw);
                                  }}
                                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-400 hover:text-gray-700 transition-colors"
                                >
                                  {t("parentPages", "viewBtn", lang)}
                                  <ChevronRight className="w-4 h-4" />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* ── Mobile cards ── */}
              <div className="md:hidden space-y-4 pb-24">
                {filtered.length === 0 ? (
                  <div className="text-center py-20 text-gray-400">
                    <BookOpen className="w-14 h-14 mx-auto mb-3 text-gray-200" />
                    <p className="font-semibold">
                      {t("parentPages", "noHomeworkCategory", lang)}
                    </p>
                  </div>
                ) : (
                  <AnimatePresence mode="popLayout">
                    {filtered.map((hw, i) => {
                      const due = daysLeftText(hw.dueDate);
                      const cfg = STATUS_CONFIG[hw.submission.status];
                      const Icon = cfg.icon;
                      return (
                        <motion.div
                          key={hw.id}
                          layout
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.97 }}
                          transition={{ delay: Math.min(i * 0.03, 0.3) }}
                          className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
                        >
                          {/* Card header */}
                          <div
                            onClick={() => setSelectedHw(hw)}
                            className="p-5 cursor-pointer active:scale-[0.99] transition-all"
                          >
                            <div className="flex flex-col items-start justify-between gap-3 mb-3">
                              <span
                                className={cn(
                                  "inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1.5 rounded-lg border shrink-0",
                                  cfg.color,
                                )}
                              >
                                <Icon className="w-3 h-3" />
                                {t("parentPages", cfg.labelKey as any, lang)}
                              </span>
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500 shrink-0">
                                  <BookText className="w-5 h-5" />
                                </div>
                                <div className="min-w-0">
                                  <p className="font-bold text-gray-900 leading-snug">
                                    {hw.title}
                                  </p>
                                  <p className="text-sm text-gray-400 mt-0.5">
                                    {hw.class?.name}
                                    {hw.subject ? ` · ${hw.subject.name}` : ""}
                                  </p>
                                </div>
                              </div>
                            </div>

                            {hw.description && (
                              <p className="text-sm hidden sm:block text-gray-500 mb-4 line-clamp-2 leading-relaxed">
                                {hw.description}
                              </p>
                            )}

                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-gray-400" />
                                <span
                                  className={cn(
                                    "text-sm font-medium",
                                    due.overdue
                                      ? "text-red-600"
                                      : due.urgent
                                        ? "text-amber-600"
                                        : "text-gray-500",
                                  )}
                                >
                                  Due {formatDate(hw.dueDate)}
                                </span>
                              </div>
                              {hw.submission.status === "NOT_SUBMITTED" && (
                                <span
                                  className={cn(
                                    "text-[10px] font-bold px-2 py-0.5 rounded",
                                    due.overdue
                                      ? "bg-red-100 text-red-700"
                                      : due.urgent
                                        ? "bg-amber-100 text-amber-700"
                                        : "bg-gray-100 text-gray-500",
                                  )}
                                >
                                  {due.textKey === "daysLeft"
                                    ? `${due.days} ${t("parentPages", "daysLeft", lang)}`
                                    : t(
                                        "parentPages",
                                        due.textKey as any,
                                        lang,
                                      )}
                                </span>
                              )}
                            </div>

                            {hw.submission.submittedAt && (
                              <p className="text-sm text-emerald-600 font-medium mt-3 flex items-center gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Submitted{" "}
                                {new Date(
                                  hw.submission.submittedAt,
                                ).toLocaleDateString("en-GB")}
                              </p>
                            )}

                            {hw.submission.teacherNote && (
                              <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 mt-4">
                                <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider mb-0.5">
                                  Teacher Note
                                </p>
                                <p className="text-sm text-blue-700">
                                  {hw.submission.teacherNote}
                                </p>
                              </div>
                            )}
                          </div>

                          {/* Card actions */}
                          <div className="flex items-stretch border-t border-gray-100">
                            {hw.submission.status === "NOT_SUBMITTED" ? (
                              <>
                                <button
                                  onClick={() => setConfirmSubmitHw(hw)}
                                  disabled={
                                    submitMutation.isPending &&
                                    submitMutation.variables?.submissionId ===
                                      hw.submission.id
                                  }
                                  className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
                                >
                                  {submitMutation.isPending &&
                                  submitMutation.variables?.submissionId ===
                                    hw.submission.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Send className="w-4 h-4" />
                                  )}
                                  Mark as Submitted
                                </button>
                                <button
                                  onClick={() => setSelectedHw(hw)}
                                  className="px-5 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors"
                                >
                                  <ChevronRight className="w-5 h-5" />
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => setSelectedHw(hw)}
                                className="flex-1 py-3.5 bg-gray-50 text-gray-600 text-sm font-semibold flex items-center justify-center gap-2 hover:bg-gray-100 transition-colors active:scale-[0.99]"
                              >
                                <ExternalLink className="w-4 h-4" />
                                View Details
                              </button>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-40 rounded-2xl" />
              ))}
            </div>
          )}
        </>
      )}

      {/* Submit Confirmation Drawer */}
      <Drawer
        open={!!confirmSubmitHw}
        onOpenChange={(open) => {
          if (!open) setConfirmSubmitHw(null);
        }}
        title="Submit Homework"
        description={
          confirmSubmitHw
            ? `${confirmSubmitHw.class?.name ?? ""}${confirmSubmitHw.subject ? ` · ${confirmSubmitHw.subject.name}` : ""}`
            : ""
        }
      >
        {confirmSubmitHw && (
          <div className="p-6 space-y-6">
            {/* Homework summary */}
            <div className="bg-gray-50 rounded-2xl p-5 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                  <BookText className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-gray-900 text-lg">
                    {confirmSubmitHw.title}
                  </p>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {confirmSubmitHw.class?.name}
                    {confirmSubmitHw.subject
                      ? ` · ${confirmSubmitHw.subject.name}`
                      : ""}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white rounded-xl px-4 py-3 border border-gray-100">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">
                    Due Date
                  </p>
                  <p className="text-sm font-semibold text-gray-800">
                    {formatDateFull(confirmSubmitHw.dueDate)}
                  </p>
                </div>
                <div className="bg-white rounded-xl px-4 py-3 border border-gray-100">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">
                    Status
                  </p>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg border mt-0.5",
                      STATUS_CONFIG[confirmSubmitHw.submission.status].color,
                    )}
                  >
                    {(() => {
                      const Icon =
                        STATUS_CONFIG[confirmSubmitHw.submission.status].icon;
                      return <Icon className="w-3 h-3" />;
                    })()}
                    {t(
                      "parentPages",
                      STATUS_CONFIG[confirmSubmitHw.submission.status]
                        .labelKey as any,
                      lang,
                    )}
                  </span>
                </div>
              </div>

              {confirmSubmitHw.description && (
                <div className="bg-white rounded-xl px-4 py-3 border border-gray-100">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">
                    Description
                  </p>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {confirmSubmitHw.description}
                  </p>
                </div>
              )}
            </div>

            {/* Confirmation */}
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-bold text-amber-800 text-sm">
                    Confirm Submission
                  </p>
                  <p className="text-sm text-amber-700 mt-0.5 leading-relaxed">
                    By submitting, you confirm that your child has completed
                    this homework. This action can be reversed by the teacher.
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() =>
                handleSubmitHomework(confirmSubmitHw.submission.id)
              }
              disabled={submitMutation.isPending}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-sm"
            >
              {submitMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCheck className="w-4 h-4" />
              )}
              Confirm — Mark as Submitted
            </button>
          </div>
        )}
      </Drawer>

      {/* Homework Detail Drawer */}
      <Drawer
        open={!!selectedHw}
        onOpenChange={(open) => {
          if (!open) setSelectedHw(null);
        }}
        title={selectedHw?.title ?? ""}
        description={
          selectedHw
            ? `${selectedHw.class?.name ?? ""}${selectedHw.subject ? ` · ${selectedHw.subject.name}` : ""}`
            : ""
        }
      >
        {selectedHw && (
          <div className="p-6 space-y-6">
            {/* Status + Due */}
            <div className="flex items-center justify-between">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border",
                  STATUS_CONFIG[selectedHw.submission.status].color,
                )}
              >
                {(() => {
                  const Icon = STATUS_CONFIG[selectedHw.submission.status].icon;
                  return <Icon className="w-3.5 h-3.5" />;
                })()}
                {t(
                  "parentPages",
                  STATUS_CONFIG[selectedHw.submission.status].labelKey as any,
                  lang,
                )}
              </span>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Calendar className="w-4 h-4" />
                <span className="font-medium">
                  Due {formatDate(selectedHw.dueDate)}
                </span>
              </div>
            </div>

            {/* Description */}
            {selectedHw.description && (
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Description
                </p>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {selectedHw.description}
                </p>
              </div>
            )}

            {/* Submitted date */}
            {selectedHw.submission.submittedAt && (
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Submitted On
                </p>
                <div className="flex items-center gap-2 text-emerald-600">
                  <CheckCircle2 className="w-4 h-4" />
                  <p className="text-sm font-semibold">
                    {formatDateFull(selectedHw.submission.submittedAt)}
                  </p>
                </div>
              </div>
            )}

            {/* Teacher note */}
            {selectedHw.submission.teacherNote && (
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-5">
                <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider mb-1.5">
                  Teacher Note
                </p>
                <p className="text-sm text-blue-700 leading-relaxed">
                  {selectedHw.submission.teacherNote}
                </p>
              </div>
            )}

            {/* Class & Subject info */}
            <div className="grid grid-cols-2 gap-4">
              {selectedHw.class && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">
                    Class
                  </p>
                  <p className="text-sm font-semibold text-gray-800">
                    {selectedHw.class.name}
                  </p>
                </div>
              )}
              {selectedHw.subject && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">
                    Subject
                  </p>
                  <p className="text-sm font-semibold text-gray-800">
                    {selectedHw.subject.name}
                  </p>
                </div>
              )}
            </div>

            {/* Submit action */}
            {selectedHw.submission.status === "NOT_SUBMITTED" && (
              <div className="pt-2">
                <button
                  onClick={() => {
                    setSelectedHw(null);
                    setConfirmSubmitHw(selectedHw);
                  }}
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-sm"
                >
                  <Send className="w-4 h-4" />
                  Mark as Submitted
                </button>
              </div>
            )}

            {selectedHw.submission.status === "CHECKED" &&
              selectedHw.submission.submittedAt && (
                <div className="pt-2">
                  <div className="w-full py-3.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-sm font-bold flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    Homework Checked
                  </div>
                </div>
              )}
          </div>
        )}
      </Drawer>
    </DashboardLayout>
  );
}
