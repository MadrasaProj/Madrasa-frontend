import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { getExams, type ExamRecord } from "@/lib/exams-api";
import { getResults, bulkUpsertResults, type ResultRecord } from "@/lib/results-api";
import { getMyClasses, type ClassRecord } from "@/lib/classes-api";
import { getSubjects, type SubjectRecord } from "@/lib/subjects-api";
import { getStudents, type StudentRecord } from "@/lib/students-api";
import { useAuthStore } from "@/store/auth";
import { cn } from "@/lib/utils";
import {
  GraduationCap, Save, Loader2, CheckCircle2, Lock, Calendar, AlertCircle, BarChart2,
} from "lucide-react";
import { motion } from "framer-motion";

function getGrade(score: number, totalMarks = 100) {
  const pct = (score / totalMarks) * 100;
  if (pct >= 90) return { label: "A+", color: "text-emerald-700 bg-emerald-50" };
  if (pct >= 75) return { label: "A",  color: "text-blue-700 bg-blue-50" };
  if (pct >= 60) return { label: "B",  color: "text-indigo-700 bg-indigo-50" };
  if (pct >= 45) return { label: "C",  color: "text-yellow-700 bg-yellow-50" };
  return { label: "F", color: "text-red-700 bg-red-50" };
}

function fmt(d?: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export default function TeacherExamsPage() {
  const { user, accessToken } = useAuthStore();
  const navigate  = useNavigate();
  const location  = useLocation();
  const cid        = user?.clientId ?? "";
  const token      = accessToken ?? "";
  const ayId       = user?.defaultAcademicYearId ?? "";
  const teacherId  = user?.id ?? "";
  const isPeriodBased = user?.attendanceMode === "PERIOD_BASED";

  const goToClassReport = (examId: string, classId: string) => {
    const back = location.pathname;
    const base = location.pathname.replace(/\/exams.*/, "/exams");
    navigate(`${base}/class-report?examId=${examId}&classId=${classId}&ayId=${ayId}&back=${encodeURIComponent(back)}`);
  };

  // Data
  const [allClasses, setAllClasses]       = useState<ClassRecord[]>([]);
  const [mySubjects, setMySubjects]       = useState<SubjectRecord[]>([]);  // teacher's assigned subjects
  const [exams, setExams]                 = useState<ExamRecord[]>([]);
  const [students, setStudents]           = useState<StudentRecord[]>([]);
  const [existingResults, setExistingResults] = useState<ResultRecord[]>([]);
  const [scores, setScores]               = useState<Record<string, string>>({});

  // Selection
  const [activeExamId, setActiveExamId]       = useState("");
  const [activeClassId, setActiveClassId]     = useState("");
  const [activeSubjectId, setActiveSubjectId] = useState("");

  // UI state
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const [error, setError]       = useState<string | null>(null);

  // ── Derived ──────────────────────────────────────────────────────────────────

  // CLASS_BASED: teacher can only mark their own class (must be classTeacher).
  // PERIOD_BASED: teacher can mark any class where they have subjects assigned.
  const myClassIds = new Set(mySubjects.map((s) => s.classId));
  const teacherClasses = allClasses.filter((c) => myClassIds.has(c.id) || c.classTeacherId === teacherId);

  const [classSubjects, setClassSubjects] = useState<SubjectRecord[]>([]);

  const activeExam = exams.find((e) => e.id === activeExamId);
  const isLocked = !activeExam
    || activeExam.examStatus !== "MARK_ENTRY"
    || (!!activeExam.markEntryLastDate && new Date() > new Date(activeExam.markEntryLastDate));

  // ── Initial load ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!cid || !token || !teacherId) return;
    setLoading(true);

    Promise.all([
      getMyClasses(cid, token),
      // Load teacher's subjects (period-based: assigned to them; class-based: also needed to know classes)
      getSubjects(cid, token, { teacherId, limit: 500 }),
      getExams(cid, token, { accademicYearId: ayId || undefined, limit: 50 }),
    ])
      .then(([cls, subs, examData]) => {
        setAllClasses(cls);
        setMySubjects(subs.data ?? []);
        setExams(examData.data ?? []);

        // Auto-select first exam
        if (examData.data?.[0]) setActiveExamId(examData.data[0].id);

        // Auto-select: own class first (always works in both modes)
        const firstClass = cls.find((c) => c.classTeacherId === teacherId);
        if (firstClass) setActiveClassId(firstClass.id);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [cid, token, teacherId, ayId]);

  // ── Load subjects for selected class ─────────────────────────────────────────

  useEffect(() => {
    if (!cid || !token || !activeClassId) return;
    const cls = allClasses.find((c) => c.id === activeClassId);
    const isOwn = cls?.classTeacherId === teacherId;

    if (isOwn) {
      // Class teacher (any attendance mode) → all subjects of this class
      getSubjects(cid, token, { classId: activeClassId, limit: 200 })
        .then((r) => {
          setClassSubjects(r.data ?? []);
          if (r.data?.[0]) setActiveSubjectId(r.data[0].id);
          else setActiveSubjectId("");
        })
        .catch((e: Error) => setError(e.message));
    } else {
      // Not class teacher → only their assigned subjects in this class
      const mine = mySubjects.filter((s) => s.classId === activeClassId);
      setClassSubjects(mine);
      if (mine[0]) setActiveSubjectId(mine[0].id);
      else setActiveSubjectId("");
    }
  }, [activeClassId, allClasses, mySubjects, teacherId, isPeriodBased, cid, token]);

  // ── Load students + existing results when exam/class/subject changes ──────────

  const loadExamData = useCallback(async () => {
    if (!cid || !token || !activeClassId || !activeExamId) return;

    const [stuData, resData] = await Promise.all([
      getStudents(cid, token, { classId: activeClassId, limit: 200 }).catch(() => ({ data: [] as StudentRecord[] })),
      activeSubjectId
        ? getResults(cid, token, { examId: activeExamId, classId: activeClassId, limit: 500 }).catch(() => ({ data: [] as ResultRecord[] }))
        : Promise.resolve({ data: [] as ResultRecord[] }),
    ]);

    const stuList = stuData.data ?? [];
    const resList = resData.data ?? [];
    setStudents(stuList);
    setExistingResults(resList);

    // Pre-fill scores for current subject only
    if (activeSubjectId) {
      const scoreMap: Record<string, string> = {};
      stuList.forEach((s) => {
        const r = resList.find((r) => r.student?.id === s.id && r.subject?.id === activeSubjectId);
        scoreMap[s.id] = r != null ? String(r.score) : "";
      });
      setScores(scoreMap);
    }
  }, [cid, token, activeClassId, activeExamId, activeSubjectId]);

  useEffect(() => { loadExamData(); }, [loadExamData]);

  // ── Save ─────────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!activeExamId || !activeSubjectId || !activeClassId || isLocked) return;
    setSaving(true);
    setError(null);
    try {
      const items = students
        .filter((s) => scores[s.id] !== "" && scores[s.id] !== undefined)
        .map((s) => ({
          subjectId:  activeSubjectId,
          studentId:  s.id,
          score:      Number(scores[s.id]),
          totalMarks: 100,
        }));

      if (!items.length) {
        setError("No scores entered");
        return;
      }

      await bulkUpsertResults(cid, token, {
        examId:          activeExamId,
        classId:         activeClassId,
        accademicYearId: ayId,
        results:         items,
      });

      await loadExamData();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  // ── Stats ─────────────────────────────────────────────────────────────────────

  const filled = Object.values(scores).filter((v) => v !== "").length;
  const avg    = filled > 0
    ? Math.round(Object.values(scores).filter((v) => v !== "").reduce((s, v) => s + Number(v), 0) / filled)
    : 0;

  // ── Render ────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <DashboardLayout>
        <PageHeader title="Enter Marks" icon={GraduationCap} back backHref="/teacher" />
        <div className="flex items-center justify-center gap-2 py-16 text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <PageHeader title="Enter Marks" icon={GraduationCap} back backHref="/teacher" />

      <div className="space-y-4 pb-24">

        {/* Error */}
        {error && (
          <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-2xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}

        {/* ── Step 1: Select Exam ───────────────────────────────────────────── */}
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase mb-2">Exam</p>
          {exams.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No exams this academic year</p>
          ) : (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {exams.map((ex) => (
                <button key={ex.id} onClick={() => setActiveExamId(ex.id)}
                  className={cn(
                    "px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap shrink-0 transition-all flex items-center gap-1.5",
                    activeExamId === ex.id ? "bg-emerald-600 text-white shadow-sm" : "bg-white border border-gray-200 text-gray-700",
                  )}>
                  {ex.name}
                  {ex.examStatus === "MARK_ENTRY" && <span className="text-[10px] opacity-70">✏️</span>}
                  {(ex.examStatus === "PUBLISHED" || ex.examStatus === "CANCELLED") && <span className="text-[10px] opacity-70">🔒</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Exam status banner */}
        {activeExam && (
          <div className={cn(
            "rounded-2xl px-4 py-2.5 flex items-center gap-2 text-sm",
            isLocked ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-700",
          )}>
            {isLocked ? <Lock className="w-4 h-4 shrink-0" /> : <Calendar className="w-4 h-4 shrink-0" />}
            <div>
              {activeExam.examStatus !== "MARK_ENTRY"
                ? <span>Exam is <strong>{activeExam.examStatus.toLowerCase().replace("_", " ")}</strong> — mark entry not open</span>
                : activeExam.markEntryLastDate && new Date() > new Date(activeExam.markEntryLastDate)
                  ? <span>Deadline passed — <strong>{fmt(activeExam.markEntryLastDate)}</strong></span>
                  : <span>Mark entry open · Deadline: <strong>{fmt(activeExam.markEntryLastDate) ?? "None"}</strong></span>}
              {activeExam.startDate && (
                <span className="ml-3 text-xs opacity-70">{fmt(activeExam.startDate)} – {fmt(activeExam.endDate)}</span>
              )}
            </div>
          </div>
        )}

        {/* ── Step 2: Select Class ──────────────────────────────────────────── */}
        {teacherClasses.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-gray-400 uppercase">Your Class</p>
              {activeExamId && activeClassId && (
                <button
                  onClick={() => goToClassReport(activeExamId, activeClassId)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors">
                  <BarChart2 className="w-3.5 h-3.5" />
                  View Report
                </button>
              )}
            </div>
            <div className="flex gap-2 flex-wrap">
              {teacherClasses.map((cls) => (
                <button key={cls.id} onClick={() => setActiveClassId(cls.id)}
                  className={cn(
                    "px-4 py-2 rounded-xl text-sm font-semibold transition-all",
                    activeClassId === cls.id ? "bg-emerald-600 text-white" : "bg-white border border-gray-200 text-gray-700",
                  )}>
                  {cls.name}
                  {cls.classTeacherId === teacherId && (
                    <span className="ml-1 text-[10px] opacity-70">★</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {teacherClasses.length === 0 && (
          <div className="text-center py-10 text-gray-400 text-sm">
            No classes assigned. Ask admin to assign you as class teacher or subject teacher.
          </div>
        )}

        {/* ── Step 3: Select Subject ────────────────────────────────────────── */}
        {activeClassId && classSubjects.length > 0 && (
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase mb-2">Subject</p>
            <div className="flex gap-2 flex-wrap">
              {classSubjects.map((sub) => (
                <button key={sub.id} onClick={() => setActiveSubjectId(sub.id)}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-sm font-semibold transition-all",
                    activeSubjectId === sub.id ? "bg-teal-600 text-white" : "bg-white border border-gray-200 text-gray-600",
                  )}>
                  {sub.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {activeClassId && classSubjects.length === 0 && (
          <div className="bg-amber-50 text-amber-700 text-sm px-4 py-3 rounded-2xl">
            No subjects assigned for this class. Ask admin to assign subjects.
          </div>
        )}

        {/* ── Step 4: Students & Scores ─────────────────────────────────────── */}
        {activeExamId && activeClassId && activeSubjectId && (
          <>
            {/* Stats */}
            {students.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "Students", value: students.length },
                  { label: "Filled",   value: filled },
                  { label: "Average",  value: filled > 0 ? avg : "—" },
                ].map((s) => (
                  <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-3 text-center">
                    <p className="text-lg font-bold text-gray-900">{s.value}</p>
                    <p className="text-[10px] text-gray-400">{s.label}</p>
                  </div>
                ))}
              </div>
            )}

            {students.length === 0 ? (
              <p className="text-center py-10 text-gray-400 text-sm">No students in this class</p>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="px-4 py-2.5 bg-gray-50 flex justify-between text-xs font-bold text-gray-400 uppercase tracking-wide">
                  <span>Student</span>
                  <span>Score / 100</span>
                </div>
                <div className="divide-y divide-gray-50">
                  {students.map((s, i) => {
                    const score = scores[s.id] ?? "";
                    const grade = score !== "" ? getGrade(Number(score)) : null;
                    // Check if already saved (from existing results)
                    const saved = existingResults.find(
                      (r) => r.student?.id === s.id && r.subject?.id === activeSubjectId,
                    );
                    return (
                      <motion.div key={s.id}
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                        className="flex items-center gap-3 px-4 py-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{s.name}</p>
                          <p className="text-xs text-gray-400">{s.adno}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {saved && score === String(saved.score) && (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          )}
                          {grade && (
                            <span className={cn("text-xs font-bold px-2 py-0.5 rounded-lg", grade.color)}>
                              {grade.label}
                            </span>
                          )}
                          <input
                            type="number" min={0} max={100} value={score}
                            disabled={isLocked}
                            onChange={(e) => {
                              setError(null);
                              setScores((prev) => ({ ...prev, [s.id]: e.target.value }));
                            }}
                            placeholder="—"
                            className={cn(
                              "w-16 text-center px-2 py-1.5 border rounded-xl text-sm font-bold focus:outline-none focus:border-emerald-400 transition-colors",
                              isLocked
                                ? "bg-gray-50 border-gray-100 text-gray-300 cursor-not-allowed"
                                : "border-gray-200 focus:border-emerald-400",
                            )}
                          />
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Save button ───────────────────────────────────────────────────────── */}
      {activeExamId && activeClassId && activeSubjectId && students.length > 0 && !isLocked && (
        <div className="fixed bottom-20 lg:bottom-6 left-0 right-0 px-4 max-w-2xl mx-auto">
          <button onClick={handleSave} disabled={saving}
            className={cn(
              "w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl font-bold text-sm transition-all shadow-lg",
              saved  ? "bg-emerald-100 text-emerald-700"
                     : "bg-emerald-600 text-white hover:bg-emerald-700",
            )}>
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> :
             saved  ? <><CheckCircle2 className="w-5 h-5" /> Marks Saved</> :
                      <><Save className="w-5 h-5" /> Save Marks</>}
          </button>
        </div>
      )}
    </DashboardLayout>
  );
}
