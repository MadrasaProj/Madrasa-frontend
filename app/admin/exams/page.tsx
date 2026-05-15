import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { getExams, createExam, deleteExam, type ExamRecord } from "@/lib/exams-api";
import { getResults, type ResultRecord } from "@/lib/results-api";
import { getAllClasses, type ClassRecord } from "@/lib/classes-api";
import { getSubjects, type SubjectRecord } from "@/lib/subjects-api";
import { useAuthStore } from "@/store/auth";
import { cn } from "@/lib/utils";
import {
  GraduationCap, Plus, Loader2, AlertCircle, Trash2,
  ChevronDown, ChevronUp, BarChart2, Users, X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

function getGrade(score: number, max = 100) {
  const pct = (score / max) * 100;
  if (pct >= 90) return { label: "A+", color: "text-emerald-700 bg-emerald-50" };
  if (pct >= 75) return { label: "A",  color: "text-blue-700 bg-blue-50" };
  if (pct >= 60) return { label: "B",  color: "text-indigo-700 bg-indigo-50" };
  if (pct >= 45) return { label: "C",  color: "text-yellow-700 bg-yellow-50" };
  return { label: "F", color: "text-red-700 bg-red-50" };
}

export default function AdminExamsPage() {
  const { user, accessToken, activeClientId } = useAuthStore();
  const cid   = activeClientId ?? "";
  const token = accessToken ?? "";
  const ayId  = user?.defaultAcademicYearId ?? "";

  const [exams, setExams]       = useState<ExamRecord[]>([]);
  const [classes, setClasses]   = useState<ClassRecord[]>([]);
  const [subjects, setSubjects] = useState<SubjectRecord[]>([]);
  const [loading, setLoading]   = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [resultsMap, setResultsMap] = useState<Record<string, ResultRecord[]>>({});
  const [loadingResults, setLoadingResults] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName]       = useState("");
  const [newClassId, setNewClassId] = useState("");
  const [newSubjectId, setNewSubjectId] = useState("");
  const [creating, setCreating]     = useState(false);

  const loadData = useCallback(async () => {
    if (!cid || !token) return;
    setLoading(true);
    try {
      const [examData, classData] = await Promise.all([
        getExams(cid, token, { accademicYearId: ayId || undefined, limit: 100 }),
        getAllClasses(cid, token),
      ]);
      setExams(examData.data ?? []);
      setClasses(classData);
      if (classData.length > 0) setNewClassId(classData[0].id);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [cid, token, ayId]);

  useEffect(() => { loadData(); }, [loadData]);

  // Load subjects when class changes
  useEffect(() => {
    if (!cid || !token || !newClassId) return;
    getSubjects(cid, token, newClassId).then((r) => {
      setSubjects(r.data ?? []);
      setNewSubjectId(r.data?.[0]?.id ?? "");
    }).catch(() => {});
  }, [cid, token, newClassId]);

  const loadResults = async (examId: string) => {
    if (resultsMap[examId]) { setExpandedId(expandedId === examId ? null : examId); return; }
    setLoadingResults(examId);
    try {
      const data = await getResults(cid, token, { examId, limit: 200 });
      setResultsMap((prev) => ({ ...prev, [examId]: data.data ?? [] }));
      setExpandedId(examId);
    } catch { /* silent */ }
    finally { setLoadingResults(null); }
  };

  const handleCreate = async () => {
    if (!newName || !newClassId || !newSubjectId) return;
    setCreating(true);
    try {
      await createExam(cid, token, {
        name: newName,
        classId: newClassId,
        subjectId: newSubjectId,
        accademicYearId: ayId,
      });
      setNewName("");
      setShowCreate(false);
      loadData();
    } catch (e) { alert((e as Error).message); }
    finally { setCreating(false); }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try { await deleteExam(cid, token, id); loadData(); }
    catch (e) { alert((e as Error).message); }
    finally { setDeletingId(null); }
  };

  return (
    <DashboardLayout>
      <PageHeader
        title="Exams & Results"
        icon={GraduationCap}
        action={
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold"
          >
            <Plus className="w-4 h-4" /> New Exam
          </button>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      ) : exams.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">No exams yet</div>
      ) : (
        <div className="space-y-3 pb-20">
          {exams.map((exam) => {
            const results  = resultsMap[exam.id] ?? [];
            const avgScore = results.length > 0
              ? Math.round(results.reduce((s, r) => s + r.score, 0) / results.length) : null;

            return (
              <div key={exam.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div
                  className="flex items-start gap-3 p-4 cursor-pointer"
                  onClick={() => loadResults(exam.id)}
                >
                  <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
                    <GraduationCap className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm">{exam.name}</p>
                    <p className="text-xs text-gray-400">
                      {exam.class?.name}
                      {exam.subject ? ` · ${exam.subject.name}` : ""}
                      {exam.accademicYear ? ` · ${exam.accademicYear.name}` : ""}
                    </p>
                    {avgScore !== null && (
                      <p className="text-xs text-emerald-600 mt-0.5">Avg: {avgScore}% · {results.length} results</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(exam.id); }}
                      disabled={deletingId === exam.id}
                      className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 transition-colors"
                    >
                      {deletingId === exam.id
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <Trash2 className="w-4 h-4" />}
                    </button>
                    {loadingResults === exam.id
                      ? <Loader2 className="w-4 h-4 animate-spin text-gray-300" />
                      : expandedId === exam.id
                        ? <ChevronUp className="w-4 h-4 text-gray-400" />
                        : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </div>
                </div>

                <AnimatePresence>
                  {expandedId === exam.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }} className="overflow-hidden"
                    >
                      <div className="border-t border-gray-50 bg-gray-50/60 px-4 py-3">
                        {results.length === 0 ? (
                          <p className="text-sm text-gray-400 text-center py-4">No results recorded yet</p>
                        ) : (
                          <>
                            {/* Quick stats */}
                            <div className="grid grid-cols-3 gap-2 mb-3">
                              {[
                                { label: "Students", value: results.length },
                                { label: "Average",  value: `${avgScore}%` },
                                { label: "Pass Rate", value: `${Math.round(results.filter((r) => r.score >= 45).length / results.length * 100)}%` },
                              ].map((s) => (
                                <div key={s.label} className="bg-white rounded-xl p-2.5 text-center border border-gray-100">
                                  <p className="text-sm font-bold text-gray-900">{s.value}</p>
                                  <p className="text-[10px] text-gray-400">{s.label}</p>
                                </div>
                              ))}
                            </div>
                            {/* Result rows */}
                            <div className="space-y-1.5">
                              {results.map((r) => {
                                const grade = getGrade(r.score);
                                return (
                                  <div key={r.id} className="bg-white rounded-xl px-3 py-2 flex items-center gap-3">
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-semibold text-gray-900 truncate">{r.student?.name}</p>
                                      <p className="text-xs text-gray-400">{r.student?.adno}</p>
                                    </div>
                                    <p className="text-sm font-bold text-gray-900">{r.score}</p>
                                    <span className={cn("text-xs font-bold px-2 py-0.5 rounded-lg", grade.color)}>
                                      {grade.label}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}

      {/* Create exam modal */}
      <AnimatePresence>
        {showCreate && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 z-40 backdrop-blur-sm" onClick={() => setShowCreate(false)} />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
                <div className="flex items-center justify-between mb-5">
                  <p className="font-bold text-gray-900 text-lg">New Exam</p>
                  <button onClick={() => setShowCreate(false)}><X className="w-5 h-5 text-gray-400" /></button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">Exam Name *</label>
                    <input value={newName} onChange={(e) => setNewName(e.target.value)}
                      placeholder="e.g. Term 1 Final Exam"
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">Class *</label>
                    <select value={newClassId} onChange={(e) => setNewClassId(e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white">
                      {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">Subject *</label>
                    <select value={newSubjectId} onChange={(e) => setNewSubjectId(e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white">
                      {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button onClick={() => setShowCreate(false)}
                    className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700">Cancel</button>
                  <button onClick={handleCreate} disabled={!newName || !newClassId || !newSubjectId || creating}
                    className="flex-1 py-3 bg-emerald-600 text-white rounded-xl text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-2">
                    {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Create Exam
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}
