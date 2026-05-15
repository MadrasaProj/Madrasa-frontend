import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { getExams, type ExamRecord } from "@/lib/exams-api";
import { getResults, type ResultRecord } from "@/lib/results-api";
import { getStudent, type StudentRecord } from "@/lib/students-api";
import { useAuthStore } from "@/store/auth";
import { cn } from "@/lib/utils";
import {
  Medal, Loader2, AlertCircle, RefreshCw, GraduationCap,
  TrendingUp,
} from "lucide-react";
import { motion } from "framer-motion";

function getGrade(score: number, max = 100) {
  const pct = (score / max) * 100;
  if (pct >= 90) return { label: "A+", color: "text-emerald-700", bg: "bg-emerald-50" };
  if (pct >= 75) return { label: "A",  color: "text-blue-700",    bg: "bg-blue-50"    };
  if (pct >= 60) return { label: "B",  color: "text-indigo-700",  bg: "bg-indigo-50"  };
  if (pct >= 45) return { label: "C",  color: "text-yellow-700",  bg: "bg-yellow-50"  };
  return { label: "F", color: "text-red-700", bg: "bg-red-50" };
}

interface ChildData {
  studentId: string;
  student: StudentRecord | null;
  exams: ExamRecord[];
  error: string | null;
}

export default function ParentResultsPage() {
  const { user, accessToken, activeStudentId } = useAuthStore();
  const cid   = user?.clientId ?? "";
  const token = accessToken ?? "";
  const ids   = user?.accessibleStudentIds ?? [];
  const ayId  = user?.defaultAcademicYearId ?? "";
  const effectiveId = activeStudentId ?? (ids[0] ?? "");

  const [active, setActive]             = useState<ChildData | null>(null);
  const [activeExamId, setActiveExamId] = useState("");
  const [results, setResults]           = useState<ResultRecord[]>([]);
  const [loadingResults, setLoadingResults] = useState(false);
  const [loading, setLoading]           = useState(true);

  const load = useCallback(async () => {
    if (!cid || !token || !effectiveId) { setLoading(false); return; }
    setLoading(true);
    try {
      const [student, examData] = await Promise.all([
        getStudent(cid, token, effectiveId).catch(() => null),
        getExams(cid, token, { accademicYearId: ayId || undefined, limit: 50 }).catch(() => ({ data: [] as ExamRecord[] })),
      ]);
      const child: ChildData = { studentId: effectiveId, student: student as StudentRecord, exams: examData.data ?? [], error: null };
      setActive(child);
      if (child.exams[0]) setActiveExamId(child.exams[0].id);
    } catch (e) {
      setActive({ studentId: effectiveId, student: null, exams: [], error: (e as Error).message });
    }
    setLoading(false);
  }, [cid, token, effectiveId, ayId]);

  useEffect(() => { load(); }, [load]);

  // Load results when exam changes
  useEffect(() => {
    if (!cid || !token || !effectiveId || !activeExamId) return;
    setLoadingResults(true);
    getResults(cid, token, { examId: activeExamId, studentId: effectiveId, limit: 50 })
      .then((data) => setResults(data.data ?? []))
      .catch(() => setResults([]))
      .finally(() => setLoadingResults(false));
  }, [cid, token, effectiveId, activeExamId]);
  const totalScore = results.reduce((s, r) => s + r.score, 0);
  const maxScore   = results.length * 100;
  const pct        = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
  const overallGrade = pct > 0 ? getGrade(pct) : null;

  return (
    <DashboardLayout>
      <PageHeader
        title="Results"
        icon={Medal}
        back backHref="/parent"
        action={
          <button onClick={load} className="p-2 rounded-xl bg-gray-100 text-gray-600">
            <RefreshCw className="w-4 h-4" />
          </button>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      ) : !effectiveId ? (
        <div className="text-center py-16 text-gray-400 text-sm">No children linked to this account</div>
      ) : (
        <>
          {active?.error ? (
            <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-2xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" /> {active.error}
            </div>
          ) : (
            <>
              {/* Student info */}
              {active?.student && (
                <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-5 flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-700 font-bold text-base shrink-0">
                    {active.student.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 truncate">{active.student.name}</p>
                    <p className="text-xs text-gray-400">{active.student.class?.name ?? ""} · {active.student.adno}</p>
                  </div>
                  {overallGrade && (
                    <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg shrink-0", overallGrade.bg, overallGrade.color)}>
                      {overallGrade.label}
                    </div>
                  )}
                </div>
              )}

              {/* Exam selector */}
              {active?.exams.length === 0 ? (
                <div className="text-center py-12 text-gray-400 text-sm">
                  <GraduationCap className="w-10 h-10 mx-auto mb-3 text-gray-200" />
                  No exams yet
                </div>
              ) : (
                <>
                  <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
                    {active?.exams.map((ex) => (
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

                  {loadingResults ? (
                    <div className="flex items-center justify-center gap-2 py-10 text-gray-400">
                      <Loader2 className="w-4 h-4 animate-spin" />
                    </div>
                  ) : results.length === 0 ? (
                    <div className="text-center py-10 text-gray-400 text-sm">No results for this exam</div>
                  ) : (
                    <>
                      {/* Overall summary */}
                      <div className="grid grid-cols-3 gap-3 mb-5">
                        <div className="bg-white rounded-2xl border border-gray-100 p-3 text-center">
                          <p className="text-lg font-bold text-gray-900">{results.length}</p>
                          <p className="text-[10px] text-gray-400">Subjects</p>
                        </div>
                        <div className={cn("rounded-2xl p-3 text-center", overallGrade?.bg ?? "bg-gray-50")}>
                          <p className={cn("text-lg font-bold", overallGrade?.color ?? "text-gray-900")}>{pct}%</p>
                          <p className="text-[10px] text-gray-400">Overall</p>
                        </div>
                        <div className="bg-white rounded-2xl border border-gray-100 p-3 text-center flex flex-col items-center">
                          <TrendingUp className="w-4 h-4 text-emerald-500 mb-0.5" />
                          <p className={cn("text-lg font-bold", overallGrade?.color ?? "text-gray-900")}>
                            {overallGrade?.label ?? "—"}
                          </p>
                          <p className="text-[10px] text-gray-400">Grade</p>
                        </div>
                      </div>

                      {/* Subject scores */}
                      <div className="space-y-2 pb-20">
                        {results.map((r, i) => {
                          const grade = getGrade(r.score);
                          return (
                            <motion.div
                              key={r.id}
                              initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                              className="bg-white rounded-2xl border border-gray-100 p-4"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <p className="font-semibold text-gray-900 text-sm">{r.subject?.name ?? "Subject"}</p>
                                <div className="flex items-center gap-2">
                                  <p className="font-bold text-gray-900">{r.score}<span className="text-xs text-gray-400 font-normal">/100</span></p>
                                  <span className={cn("text-sm font-bold px-2.5 py-1 rounded-xl", grade.bg, grade.color)}>
                                    {grade.label}
                                  </span>
                                </div>
                              </div>
                              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }} animate={{ width: `${r.score}%` }}
                                  transition={{ duration: 0.6, delay: i * 0.05 + 0.2 }}
                                  className={cn("h-full rounded-full", r.score >= 75 ? "bg-emerald-500" : r.score >= 45 ? "bg-amber-400" : "bg-red-400")}
                                />
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </>
              )}
            </>
          )}
        </>
      )}
    </DashboardLayout>
  );
}
