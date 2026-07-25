import { useState, useEffect, useCallback } from "react";

import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { ApiErrorBanner } from "@/components/ui/ApiErrorBanner";
import { Skeleton } from "@/components/ui/Skeleton";
import { getSubmissions, type HomeworkAssignment, type SubmissionsResponse } from "@/lib/homework-api";
import { type ClassRecord } from "@/lib/classes-api";
import { useClasses, useHomeworkList } from "@/lib/queries";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { useAuthStore } from "@/store/auth";
import { useLanguageStore } from "@/store/language";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import {
  BookOpen, AlertTriangle, CheckCircle2, Clock,
  Loader2, ChevronDown, ChevronUp, Calendar,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

function fmt(d: Date) { return d.toISOString().split("T")[0]; }

export default function TeacherHomeworkListPage() {
  const { lang } = useLanguageStore();
  const { user, accessToken } = useAuthStore();
  const cid   = user?.clientId ?? "";
  const token = accessToken ?? "";

  const qc = useQueryClient();
  const [activeClassId, setActiveClassId] = useState("");
  const [customError, setCustomError] = useState<string | null>(null);

  const { data: classesData, isLoading: loadingClasses } = useClasses({ clientId: cid, token });
  const classes = classesData ?? [];

  const { data: homeworkData, isLoading: loadingHomework, error: homeworkError } = useHomeworkList({ clientId: cid, token });
  const homework = homeworkData ?? [];

  const loading = loadingClasses || loadingHomework;
  const error = customError || homeworkError?.message || null;
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [subsMap, setSubsMap]     = useState<Record<string, SubmissionsResponse>>({});
  const [loadingSubs, setLoadingSubs] = useState<string | null>(null);
  const loadData = useCallback(() => {
    setCustomError(null);
    qc.invalidateQueries({ queryKey: queryKeys.classes.all });
    qc.invalidateQueries({ queryKey: queryKeys.homework.all });
  }, [qc]);

  useEffect(() => {
    if (classes.length > 0 && !activeClassId) {
      setActiveClassId(classes[0].id);
    }
  }, [classes, activeClassId]);

  const loadSubs = async (hwId: string) => {
    if (subsMap[hwId]) { setExpandedId(expandedId === hwId ? null : hwId); return; }
    setLoadingSubs(hwId);
    setCustomError(null);
    try {
      const data = await getSubmissions(cid, token, hwId);
      setSubsMap((prev) => ({ ...prev, [hwId]: data }));
      setExpandedId(hwId);
    } catch (e) { setCustomError((e as Error).message); }
    finally { setLoadingSubs(null); }
  };

  const today = fmt(new Date());
  const filtered = homework.filter((hw) => !activeClassId || hw.classId === activeClassId);
  const overdue  = filtered.filter((hw) => hw.dueDate.split("T")[0] < today);
  const upcoming = filtered.filter((hw) => hw.dueDate.split("T")[0] >= today);

  return (
    <DashboardLayout>
      <PageHeader title={t("teacherPages", "hwListTitle", lang)} icon={BookOpen} back backHref="/teacher" />

      {error && <ApiErrorBanner message={error} onRetry={loadData} />}

      {loading ? (
        <div className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-20 rounded-xl" />
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-2xl" />
            ))}
          </div>
          <Skeleton className="h-4 w-24" />
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-2xl" />
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Class filter */}
          <div className="flex gap-2 mb-4 flex-wrap">
            {classes.map((cls) => (
              <button
                key={cls.id}
                onClick={() => setActiveClassId(cls.id)}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-semibold transition-all",
                  activeClassId === cls.id ? "bg-emerald-600 text-white" : "bg-white border border-gray-200 text-gray-600",
                )}
              >
                {cls.name}
              </button>
            ))}
          </div>

          {/* Summary */}
          <div className="grid grid-cols-3 gap-2 mb-5">
            {[
              { label: t("common", "total", lang),    value: filtered.length, icon: BookOpen,     color: "text-blue-600",   bg: "bg-blue-50" },
              { label: t("teacherPages", "overdueTab", lang),  value: overdue.length,  icon: AlertTriangle, color: "text-red-600",    bg: "bg-red-50" },
              { label: t("common", "upcoming", lang), value: upcoming.length, icon: Clock,         color: "text-emerald-600", bg: "bg-emerald-50" },
            ].map(({ label, value, icon: Icon, color, bg }) => (
              <div key={label} className="bg-white rounded-2xl border border-gray-100 p-3 text-center">
                <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center mx-auto mb-1", bg)}>
                  <Icon className={cn("w-4 h-4", color)} />
                </div>
                <p className="text-lg font-bold text-gray-900">{value}</p>
                <p className="text-[10px] text-gray-400">{label}</p>
              </div>
            ))}
          </div>

          {/* Overdue section */}
          {overdue.length > 0 && (
            <>
              <p className="text-xs font-bold text-red-600 uppercase tracking-wide mb-2 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> {t("teacherPages", "overdueTab", lang)} ({overdue.length})
              </p>
              <div className="space-y-2 mb-5">
                {overdue.map((hw) => (
                  <HWRow key={hw.id} hw={hw} expandedId={expandedId} loadingSubs={loadingSubs}
                    subs={subsMap[hw.id]} onExpand={loadSubs} lang={lang} overdue />
                ))}
              </div>
            </>
          )}

          {/* Upcoming section */}
          {upcoming.length > 0 && (
            <>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">{t("common", "upcoming", lang)} ({upcoming.length})</p>
              <div className="space-y-2 pb-20">
                {upcoming.map((hw) => (
                  <HWRow key={hw.id} hw={hw} expandedId={expandedId} loadingSubs={loadingSubs}
                    subs={subsMap[hw.id]} onExpand={loadSubs} lang={lang} />
                ))}
              </div>
            </>
          )}

          {filtered.length === 0 && (
            <div className="text-center py-16 text-gray-400 text-sm">{t("teacherPages", "noHwFound", lang)}</div>
          )}
        </>
      )}
    </DashboardLayout>
  );
}

function HWRow({
  hw, expandedId, loadingSubs, subs, onExpand, overdue = false, lang,
}: {
  hw: HomeworkAssignment;
  expandedId: string | null;
  loadingSubs: string | null;
  subs?: SubmissionsResponse;
  onExpand: (id: string) => void;
  overdue?: boolean;
  lang: "en" | "ml";
}) {
  const due = new Date(hw.dueDate);
  const notSubmitted = subs?.submissions.filter((s) => s.status === "NOT_SUBMITTED").length ?? 0;
  const total        = subs?.submissions.length ?? hw._count?.submissions ?? 0;

  return (
    <div className={cn("bg-white rounded-2xl border overflow-hidden", overdue ? "border-red-100" : "border-gray-100")}>
      <div className="flex items-start gap-3 p-4 cursor-pointer" onClick={() => onExpand(hw.id)}>
        <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
          overdue ? "bg-red-50" : "bg-blue-50")}>
          <BookOpen className={cn("w-4 h-4", overdue ? "text-red-500" : "text-blue-600")} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 text-sm">{hw.title}</p>
          <p className="text-xs text-gray-400">{hw.class?.name}{hw.subject ? ` · ${hw.subject.name}` : ""}</p>
          <p className={cn("text-xs flex items-center gap-1 mt-0.5", overdue ? "text-red-500" : "text-gray-400")}>
            <Calendar className="w-3 h-3" />
            {t("teacherPages", "dueLabel", lang)} {due.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
            {overdue ? ` (${t("teacherPages", "overdueLabel", lang).toLowerCase()})` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {subs && <span className="text-xs text-red-500 font-bold">{notSubmitted}/{total} {t("teacherPages", "pendingCount", lang)}</span>}
          {loadingSubs === hw.id
            ? <Loader2 className="w-4 h-4 animate-spin text-gray-300" />
            : expandedId === hw.id
              ? <ChevronUp className="w-4 h-4 text-gray-400" />
              : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </div>

      <AnimatePresence>
        {expandedId === hw.id && subs && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="border-t border-gray-50 bg-gray-50/60 px-4 py-3 space-y-1.5">
              {subs.submissions.map((sub) => (
                <div key={sub.id} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-800 truncate">{sub.student?.name}</p>
                    <p className="text-[10px] text-gray-400">{sub.student?.adno}</p>
                  </div>
                  <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-lg",
                    sub.status === "CHECKED"       ? "bg-emerald-100 text-emerald-700" :
                    sub.status === "SUBMITTED"     ? "bg-amber-100 text-amber-700" :
                                                     "bg-red-100 text-red-700")}>
                    {sub.status.replace("_", " ")}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
