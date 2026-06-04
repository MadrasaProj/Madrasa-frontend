import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { ApiErrorBanner } from "@/components/ui/ApiErrorBanner";
import {
  getStudentHomework,
  type StudentHomeworkResponse,
  type HomeworkStatus,
} from "@/lib/homework-api";
import { getStudent, type StudentRecord } from "@/lib/students-api";
import { useAuthStore } from "@/store/auth";
import { cn } from "@/lib/utils";
import {
  BookOpen,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Clock,
  Calendar,
  RefreshCw,
} from "lucide-react";
import { motion } from "framer-motion";

const STATUS_CONFIG: Record<
  HomeworkStatus,
  { label: string; color: string; icon: React.ElementType }
> = {
  NOT_SUBMITTED: {
    label: "Pending",
    color: "bg-red-100 text-red-700",
    icon: AlertCircle,
  },
  SUBMITTED: {
    label: "Submitted",
    color: "bg-amber-100 text-amber-700",
    icon: Clock,
  },
  CHECKED: {
    label: "Checked",
    color: "bg-emerald-100 text-emerald-700",
    icon: CheckCircle2,
  },
};

function urgencyColor(dueDate: string, status: HomeworkStatus): string {
  if (status === "CHECKED") return "border-emerald-100";
  if (status === "SUBMITTED") return "border-amber-100";
  const due = new Date(dueDate);
  const diff = due.getTime() - Date.now();
  if (diff < 0) return "border-red-300 bg-red-50/50";
  if (diff < 86400_000) return "border-amber-300 bg-amber-50/50";
  return "border-gray-100";
}

interface ChildData {
  studentId: string;
  student: StudentRecord | null;
  hw: StudentHomeworkResponse | null;
  error: string | null;
}

export default function ParentHomeworkPage() {
  const { user, accessToken, activeStudentId } = useAuthStore();
  const cid = user?.clientId ?? "";
  const token = accessToken ?? "";
  const ids = user?.accessibleStudentIds ?? [];
  const effectiveId = activeStudentId ?? ids[0] ?? "";

  const [active, setActive] = useState<ChildData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<HomeworkStatus | "all">("all");

  const load = useCallback(async () => {
    if (!cid || !token || !effectiveId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [student, hw] = await Promise.all([
        getStudent(cid, token, effectiveId).catch(() => null),
        getStudentHomework(cid, token, effectiveId).catch((e: Error) => ({
          error: e.message,
        })),
      ]);
      if ("error" in hw) {
        setActive({
          studentId: effectiveId,
          student: student as StudentRecord,
          hw: null,
          error: (hw as any).error,
        });
      } else {
        setActive({
          studentId: effectiveId,
          student: student as StudentRecord,
          hw,
          error: null,
        });
      }
    } catch (e) {
      setActive({
        studentId: effectiveId,
        student: null,
        hw: null,
        error: (e as Error).message,
      });
    }
    setLoading(false);
  }, [cid, token, effectiveId]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered =
    active?.hw?.homework.filter(
      (hw) => filter === "all" || hw.submission.status === filter,
    ) ?? [];

  const pendingCount =
    active?.hw?.homework.filter(
      (hw) => hw.submission.status === "NOT_SUBMITTED",
    ).length ?? 0;

  return (
    <DashboardLayout>
      <PageHeader
        title="Homework"
        icon={BookOpen}
        back
        backHref="/parent"
        action={
          <button
            onClick={load}
            className="p-2 rounded-xl bg-gray-100 text-gray-600"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      ) : !effectiveId ? (
        <div className="text-center py-16 text-gray-400 text-sm">
          No children linked to this account
        </div>
      ) : (
        <>
          {active?.error ? (
            <ApiErrorBanner message={active.error} onRetry={load} />
          ) : active?.hw ? (
            <>
              {/* Summary bar */}
              {pendingCount > 0 && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-2xl px-4 py-3 mb-4">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <p className="text-sm text-red-700">
                    <span className="font-bold">{pendingCount}</span> pending
                    homework{pendingCount !== 1 ? "s" : ""}
                  </p>
                </div>
              )}

              {/* Stats cards */}
              <div className="grid grid-cols-3 gap-2 mb-5">
                {(["NOT_SUBMITTED", "SUBMITTED", "CHECKED"] as const).map(
                  (s: HomeworkStatus) => {
                    const count = active.hw!.homework.filter(
                      (hw) => hw.submission.status === s,
                    ).length;
                    const cfg = STATUS_CONFIG[s];
                    const Icon = cfg.icon;
                    return (
                      <button
                        key={s}
                        onClick={() => setFilter(s === filter ? "all" : s)}
                        className={cn(
                          "rounded-2xl p-3 border-2 transition-all text-left",
                          filter === s
                            ? `${cfg.color} border-current`
                            : "bg-white border-gray-100",
                        )}
                      >
                        <Icon className="w-4 h-4 mb-1 opacity-70" />
                        <p className="text-lg font-bold">{count}</p>
                        <p className="text-[10px] font-semibold opacity-70">
                          {cfg.label}
                        </p>
                      </button>
                    );
                  },
                )}
              </div>

              {/* Filter tabs */}
              <div className="flex gap-1.5 mb-4 bg-gray-100 p-1 rounded-xl w-fit">
                {(
                  ["all", "NOT_SUBMITTED", "SUBMITTED", "CHECKED"] as const
                ).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                      filter === f
                        ? "bg-white shadow-sm text-gray-900"
                        : "text-gray-500",
                    )}
                  >
                    {f === "all" ? "All" : STATUS_CONFIG[f].label}
                  </button>
                ))}
              </div>

              {/* Homework list */}
              <div className="space-y-3 pb-20">
                {filtered.length === 0 ? (
                  <div className="text-center py-12 text-gray-400 text-sm">
                    <BookOpen className="w-10 h-10 mx-auto mb-3 text-gray-200" />
                    No homework in this category
                  </div>
                ) : (
                  filtered.map((hw, i) => {
                    const due = new Date(hw.dueDate);
                    const isOver = due < new Date();
                    const diff = due.getTime() - Date.now();
                    const daysLeft = Math.ceil(diff / 86400_000);
                    const sub = hw.submission;
                    const cfg = STATUS_CONFIG[sub.status];
                    const Icon = cfg.icon;

                    return (
                      <motion.div
                        key={hw.id}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className={cn(
                          "bg-white rounded-2xl border-2 p-4",
                          urgencyColor(hw.dueDate, sub.status),
                        )}
                      >
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 text-sm">
                              {hw.title}
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {hw.class?.name}
                              {hw.subject ? ` · ${hw.subject.name}` : ""}
                            </p>
                          </div>
                          <span
                            className={cn(
                              "text-[10px] font-bold px-2 py-1 rounded-lg shrink-0 flex items-center gap-1",
                              cfg.color,
                            )}
                          >
                            <Icon className="w-3 h-3" /> {cfg.label}
                          </span>
                        </div>

                        {hw.description && (
                          <p className="text-xs text-gray-500 mb-2">
                            {hw.description}
                          </p>
                        )}

                        <div className="flex items-center justify-between">
                          <p
                            className={cn(
                              "text-xs flex items-center gap-1",
                              isOver && sub.status === "NOT_SUBMITTED"
                                ? "text-red-500 font-semibold"
                                : "text-gray-400",
                            )}
                          >
                            <Calendar className="w-3 h-3" />
                            Due{" "}
                            {due.toLocaleDateString("en-GB", {
                              day: "numeric",
                              month: "short",
                            })}
                            {sub.status === "NOT_SUBMITTED" && (
                              <span
                                className={cn(
                                  "ml-1",
                                  isOver
                                    ? "text-red-500"
                                    : daysLeft <= 1
                                      ? "text-amber-600"
                                      : "text-gray-400",
                                )}
                              >
                                {isOver
                                  ? "(overdue!)"
                                  : daysLeft === 0
                                    ? "(today)"
                                    : `(${daysLeft}d left)`}
                              </span>
                            )}
                          </p>
                          {sub.submittedAt && (
                            <p className="text-xs text-emerald-600">
                              Submitted{" "}
                              {new Date(sub.submittedAt).toLocaleDateString(
                                "en-GB",
                              )}
                            </p>
                          )}
                        </div>

                        {sub.teacherNote && (
                          <div className="mt-2 bg-blue-50 rounded-xl px-3 py-2 text-xs text-blue-700">
                            Teacher: {sub.teacherNote}
                          </div>
                        )}
                      </motion.div>
                    );
                  })
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center gap-2 py-16 text-gray-400">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
          )}
        </>
      )}
    </DashboardLayout>
  );
}
