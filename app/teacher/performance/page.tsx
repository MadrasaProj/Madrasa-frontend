import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { getResults, type ResultRecord } from "@/lib/results-api";
import { getExams, type ExamRecord } from "@/lib/exams-api";
import { getMyClasses, type ClassRecord } from "@/lib/classes-api";
import { getHomeworkSummary } from "@/lib/reports-api";
import { useAuthStore } from "@/store/auth";
import { useLanguageStore } from "@/store/language";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Star, TrendingUp, BookOpen, RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

function getGrade(score: number) {
  if (score >= 90) return { label: "A+", color: "#10b981" };
  if (score >= 75) return { label: "A", color: "#3b82f6" };
  if (score >= 60) return { label: "B", color: "#8b5cf6" };
  if (score >= 45) return { label: "C", color: "#f59e0b" };
  return { label: "F", color: "#ef4444" };
}

export default function TeacherPerformancePage() {
  const { user, accessToken } = useAuthStore();
  const cid = user?.clientId ?? "";
  const token = accessToken ?? "";
  const ayId = user?.defaultAcademicYearId ?? "";

  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [exams, setExams] = useState<ExamRecord[]>([]);
  const [results, setResults] = useState<ResultRecord[]>([]);
  const [hwSummary, setHwSummary] = useState<{
    completionRate: number;
    totalAssignments: number;
  } | null>(null);
  const [activeClassId, setActiveClassId] = useState("");
  const [activeExamId, setActiveExamId] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!cid || !token) return;
    Promise.all([
      getMyClasses(cid, token),
      getHomeworkSummary(cid, token).catch(() => null),
    ])
      .then(([cls, hw]) => {
        setClasses(cls);
        setHwSummary(
          hw
            ? {
                completionRate: hw.completionRate,
                totalAssignments: hw.totalAssignments,
              }
            : null,
        );
        if (cls.length > 0) setActiveClassId(cls[0].id);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [cid, token]);

  useEffect(() => {
    if (!cid || !token || !activeClassId) return;
    getExams(cid, token, { accademicYearId: ayId || undefined, limit: 20 })
      .then((data) => {
        setExams(data.data ?? []);
        const first = data.data?.[0];
        if (first) setActiveExamId(first.id);
      })
      .catch(() => {});
  }, [cid, token, activeClassId, ayId]);

  useEffect(() => {
    if (!cid || !token || !activeExamId) return;
    getResults(cid, token, {
      examId: activeExamId,
      classId: activeClassId,
      limit: 100,
    })
      .then((data) => setResults(data.data ?? []))
      .catch(() => {});
  }, [cid, token, activeExamId, activeClassId]);

  const gradeData = ["A+", "A", "B", "C", "F"].map((g) => ({
    grade: g,
    count: results.filter((r) => getGrade(r.score).label === g).length,
    color: getGrade(
      g === "A+" ? 95 : g === "A" ? 80 : g === "B" ? 65 : g === "C" ? 50 : 0,
    ).color,
  }));

  const avgScore =
    results.length > 0
      ? Math.round(results.reduce((s, r) => s + r.score, 0) / results.length)
      : 0;

  const topStudents = [...results]
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  return (
    <DashboardLayout>
      <PageHeader
        title="Class Performance"
        icon={Star}
        back
        backHref="/teacher"
      />

      {loading ? (
        <div className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-20 rounded-xl" />
            ))}
          </div>
          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-2xl" />
            ))}
          </div>
          <Skeleton className="h-48 rounded-2xl" />
          <Skeleton className="h-4 w-28" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 bg-white rounded-2xl border border-gray-100 p-4">
              <Skeleton className="w-7 h-7 rounded-xl shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/3" />
              </div>
              <Skeleton className="h-6 w-12 rounded-lg shrink-0" />
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* Class selector */}
          <div className="flex gap-2 mb-4 flex-wrap">
            {classes.map((cls) => (
              <button
                key={cls.id}
                onClick={() => setActiveClassId(cls.id)}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-semibold transition-all",
                  activeClassId === cls.id
                    ? "bg-emerald-600 text-white"
                    : "bg-white border border-gray-200 text-gray-600",
                )}
              >
                {cls.name}
              </button>
            ))}
          </div>

          {/* Exam selector */}
          {exams.length > 0 && (
            <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
              {exams.map((ex) => (
                <button
                  key={ex.id}
                  onClick={() => setActiveExamId(ex.id)}
                  className={cn(
                    "px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-all",
                    activeExamId === ex.id
                      ? "bg-blue-600 text-white"
                      : "bg-white border border-gray-200 text-gray-600",
                  )}
                >
                  {ex.name}
                </button>
              ))}
            </div>
          )}

          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            {[
              {
                label: "Students",
                value: results.length,
                icon: Star,
                color: "text-blue-600",
                bg: "bg-blue-50",
              },
              {
                label: "Avg Score",
                value: `${avgScore}%`,
                icon: TrendingUp,
                color: "text-emerald-600",
                bg: "bg-emerald-50",
              },
              {
                label: "HW Compl.",
                value: hwSummary ? `${hwSummary.completionRate}%` : "—",
                icon: BookOpen,
                color: "text-indigo-600",
                bg: "bg-indigo-50",
              },
            ].map(({ label, value, icon: Icon, color, bg }) => (
              <div
                key={label}
                className="bg-white rounded-2xl border border-gray-100 p-3 text-center"
              >
                <div
                  className={cn(
                    "w-8 h-8 rounded-xl flex items-center justify-center mx-auto mb-1",
                    bg,
                  )}
                >
                  <Icon className={cn("w-4 h-4", color)} />
                </div>
                <p className="text-lg font-bold text-gray-900">{value}</p>
                <p className="text-[10px] text-gray-400">{label}</p>
              </div>
            ))}
          </div>

          {results.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-sm">
              {exams.length === 0
                ? "No exams found for this class"
                : "No results recorded yet"}
            </div>
          ) : (
            <>
              {/* Grade distribution chart */}
              <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-5">
                <p className="text-sm font-bold text-gray-800 mb-3">
                  Grade Distribution
                </p>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={gradeData} barSize={36}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="grade" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" name="Students" radius={[4, 4, 0, 0]}>
                      {gradeData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Top students */}
              {topStudents.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-20">
                  <div className="px-4 py-3 bg-amber-50 border-b border-amber-100">
                    <p className="text-xs font-bold text-amber-700 uppercase tracking-wide flex items-center gap-1.5">
                      <Star className="w-3.5 h-3.5" /> Top Students
                    </p>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {topStudents.map((r, i) => {
                      const grade = getGrade(r.score);
                      return (
                        <motion.div
                          key={r.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: i * 0.05 }}
                          className="flex items-center gap-3 px-4 py-3"
                        >
                          <div
                            className={cn(
                              "w-7 h-7 rounded-xl flex items-center justify-center text-sm font-bold shrink-0",
                              i === 0
                                ? "bg-amber-100 text-amber-700"
                                : i === 1
                                  ? "bg-gray-100 text-gray-600"
                                  : "bg-orange-100 text-orange-700",
                            )}
                          >
                            {i + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">
                              {r.student?.name}
                            </p>
                            <p className="text-xs text-gray-400">
                              {r.student?.adno}
                            </p>
                          </div>
                          <p className="text-lg font-bold text-gray-900">
                            {r.score}
                          </p>
                          <span
                            className="text-xs font-bold px-2 py-0.5 rounded-lg"
                            style={{
                              color: grade.color,
                              backgroundColor: `${grade.color}20`,
                            }}
                          >
                            {grade.label}
                          </span>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </DashboardLayout>
  );
}
