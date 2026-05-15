import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { getExams, type ExamRecord } from "@/lib/exams-api";
import { getResults, bulkUpsertResults, type ResultRecord } from "@/lib/results-api";
import { getMyClasses, type ClassRecord } from "@/lib/classes-api";
import { getStudents, type StudentRecord } from "@/lib/students-api";
import { useAuthStore } from "@/store/auth";
import { cn } from "@/lib/utils";
import {
  GraduationCap, Save, Loader2, CheckCircle2, AlertCircle,
  ChevronLeft, ChevronRight,
} from "lucide-react";
import { motion } from "framer-motion";

function getGrade(score: number, max = 100) {
  const pct = (score / max) * 100;
  if (pct >= 90) return { label: "A+", color: "text-emerald-700 bg-emerald-50" };
  if (pct >= 75) return { label: "A",  color: "text-blue-700 bg-blue-50" };
  if (pct >= 60) return { label: "B",  color: "text-indigo-700 bg-indigo-50" };
  if (pct >= 45) return { label: "C",  color: "text-yellow-700 bg-yellow-50" };
  return { label: "F", color: "text-red-700 bg-red-50" };
}

export default function TeacherExamsPage() {
  const { user, accessToken } = useAuthStore();
  const cid   = user?.clientId ?? "";
  const token = accessToken ?? "";
  const ayId  = user?.defaultAcademicYearId ?? "";

  const [classes, setClasses]     = useState<ClassRecord[]>([]);
  const [exams, setExams]         = useState<ExamRecord[]>([]);
  const [students, setStudents]   = useState<StudentRecord[]>([]);
  const [results, setResults]     = useState<ResultRecord[]>([]);
  const [scores, setScores]       = useState<Record<string, string>>({});

  const [activeClassId, setActiveClassId] = useState("");
  const [activeExamId, setActiveExamId]   = useState("");
  const [loading, setLoading]             = useState(true);
  const [saving, setSaving]               = useState(false);
  const [saved, setSaved]                 = useState(false);

  // Load classes
  useEffect(() => {
    if (!cid || !token) return;
    getMyClasses(cid, token).then((cls) => {
      setClasses(cls);
      if (cls.length > 0) setActiveClassId(cls[0].id);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [cid, token]);

  // Load exams for active class
  useEffect(() => {
    if (!cid || !token || !activeClassId) return;
    getExams(cid, token, { classId: activeClassId, accademicYearId: ayId || undefined, limit: 50 })
      .then((data) => {
        setExams(data.data ?? []);
        const first = data.data?.[0];
        if (first) setActiveExamId(first.id);
      }).catch(() => {});
  }, [cid, token, activeClassId, ayId]);

  // Load students + results when exam selected
  const loadExamData = useCallback(async () => {
    if (!cid || !token || !activeClassId || !activeExamId) return;
    const [stuData, resData] = await Promise.all([
      getStudents(cid, token, { classId: activeClassId, take: 100 }).catch(() => ({ data: [] as StudentRecord[] })),
      getResults(cid, token, { examId: activeExamId, classId: activeClassId, limit: 200 }).catch(() => ({ data: [] as ResultRecord[] })),
    ]);
    const stuList = stuData.data ?? [];
    const resList = resData.data ?? [];
    setStudents(stuList);
    setResults(resList);
    // Pre-fill scores
    const scoreMap: Record<string, string> = {};
    stuList.forEach((s) => {
      const r = resList.find((r) => r.student?.id === s.id);
      scoreMap[s.id] = r ? String(r.score) : "";
    });
    setScores(scoreMap);
  }, [cid, token, activeClassId, activeExamId]);

  useEffect(() => { loadExamData(); }, [loadExamData]);

  const activeExam = exams.find((e) => e.id === activeExamId);

  const handleSave = async () => {
    if (!activeExamId || !activeExam) return;
    setSaving(true);
    try {
      const items = students
        .filter((s) => scores[s.id] !== "" && scores[s.id] !== undefined)
        .map((s) => {
          const existing = results.find((r) => r.student?.id === s.id);
          return {
            subjectId:      activeExam.subject?.id ?? "",
            examId:         activeExamId,
            studentId:      s.id,
            classId:        activeClassId,
            score:          Number(scores[s.id]),
            accademicYearId: ayId,
            existingId:     existing?.id,
          };
        });
      if (!items.length) return;
      await bulkUpsertResults(cid, token, items);
      await loadExamData();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) { alert((e as Error).message); }
    finally { setSaving(false); }
  };

  const stats = {
    filled: Object.values(scores).filter((v) => v !== "").length,
    total: students.length,
    avg: Object.values(scores).filter((v) => v !== "").reduce((s, v, _, a) =>
      s + Number(v) / a.filter((x) => x !== "").length, 0,
    ),
  };

  return (
    <DashboardLayout>
      <PageHeader title="Enter Marks" icon={GraduationCap} back backHref="/teacher" />

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      ) : classes.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">No classes assigned</div>
      ) : (
        <>
          {/* Class selector */}
          <div className="flex gap-2 mb-4 flex-wrap">
            {classes.map((cls) => (
              <button
                key={cls.id}
                onClick={() => setActiveClassId(cls.id)}
                className={cn(
                  "px-4 py-2 rounded-xl text-sm font-semibold transition-all",
                  activeClassId === cls.id
                    ? "bg-emerald-600 text-white"
                    : "bg-white border border-gray-200 text-gray-700",
                )}
              >
                {cls.name}
              </button>
            ))}
          </div>

          {/* Exam selector */}
          {exams.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">No exams for this class</div>
          ) : (
            <>
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
                    {ex.subject ? ` · ${ex.subject.name}` : ""}
                  </button>
                ))}
              </div>

              {/* Stats */}
              {students.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {[
                    { label: "Students", value: stats.total },
                    { label: "Filled",   value: stats.filled },
                    { label: "Average",  value: stats.filled > 0 ? `${Math.round(stats.avg)}%` : "—" },
                  ].map((s) => (
                    <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-3 text-center">
                      <p className="text-lg font-bold text-gray-900">{s.value}</p>
                      <p className="text-[10px] text-gray-400">{s.label}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Score grid */}
              {students.length === 0 ? (
                <div className="text-center py-10 text-gray-400 text-sm">No students in this class</div>
              ) : (
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-4">
                  <div className="px-4 py-2.5 bg-gray-50 flex justify-between text-xs font-bold text-gray-400 uppercase">
                    <span>Student</span>
                    <span>Score / 100</span>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {students.map((s, i) => {
                      const score = scores[s.id] ?? "";
                      const grade = score !== "" ? getGrade(Number(score)) : null;
                      return (
                        <motion.div
                          key={s.id}
                          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                          className="flex items-center gap-3 px-4 py-3"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">{s.name}</p>
                            <p className="text-xs text-gray-400">{s.adno}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {grade && (
                              <span className={cn("text-xs font-bold px-2 py-0.5 rounded-lg", grade.color)}>
                                {grade.label}
                              </span>
                            )}
                            <input
                              type="number"
                              min={0}
                              max={100}
                              value={score}
                              onChange={(e) => setScores((prev) => ({ ...prev, [s.id]: e.target.value }))}
                              placeholder="—"
                              className="w-16 text-center px-2 py-1.5 border border-gray-200 rounded-xl text-sm font-bold focus:outline-none focus:border-emerald-400"
                            />
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              )}

              {students.length > 0 && (
                <div className="sticky bottom-20 lg:bottom-6">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className={cn(
                      "w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl font-bold text-sm transition-all shadow-lg",
                      saved ? "bg-emerald-100 text-emerald-700" : "bg-emerald-600 text-white hover:bg-emerald-700",
                    )}
                  >
                    {saving ? <Loader2 className="w-5 h-5 animate-spin" /> :
                     saved ? <><CheckCircle2 className="w-5 h-5" /> Marks Saved</> :
                             <><Save className="w-5 h-5" /> Save Marks</>}
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </DashboardLayout>
  );
}
