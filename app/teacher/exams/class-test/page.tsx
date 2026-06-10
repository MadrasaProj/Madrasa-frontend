import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { ApiErrorBanner } from "@/components/ui/ApiErrorBanner";
import {
  getExams, createExam, updateExam, deleteExam,
  type ExamRecord, type ExamStatus,
} from "@/lib/exams-api";
import { getResults, bulkUpsertResults, type ResultRecord } from "@/lib/results-api";
import { getMyClasses, type ClassRecord } from "@/lib/classes-api";
import { getSubjects, type SubjectRecord } from "@/lib/subjects-api";
import { getStudents, type StudentRecord } from "@/lib/students-api";
import { useAuthStore } from "@/store/auth";
import { cn } from "@/lib/utils";
import {
  GraduationCap, Plus, Loader2, Trash2, ChevronDown, ChevronUp,
  Pencil, X, Save, CheckCircle2, AlertCircle, PenLine, Calendar,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const STATUS_LABELS: Record<ExamStatus, string> = {
  DRAFT: "Draft", MARK_ENTRY: "Mark Entry", PUBLISHED: "Published", CANCELLED: "Cancelled",
};
const STATUS_COLORS: Record<ExamStatus, string> = {
  DRAFT: "bg-gray-100 text-gray-600", MARK_ENTRY: "bg-amber-100 text-amber-700",
  PUBLISHED: "bg-emerald-100 text-emerald-700", CANCELLED: "bg-red-100 text-red-500",
};

function fmt(d?: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

export default function TeacherClassTestsPage() {
  const { user, accessToken, activeClientId } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const cid   = activeClientId ?? "";
  const token = accessToken ?? "";
  const ayId  = user?.defaultAcademicYearId ?? "";

  const [exams, setExams]       = useState<ExamRecord[]>([]);
  const [classes, setClasses]   = useState<ClassRecord[]>([]);
  const [subjects, setSubjects] = useState<SubjectRecord[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [filterClassId, setFilterClassId] = useState("");

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [results, setResults]       = useState<ResultRecord[]>([]);
  const [loadingResults, setLoadingResults] = useState(false);

  const [showDrawer, setShowDrawer] = useState(false);
  const [editTarget, setEditTarget] = useState<ExamRecord | null>(null);
  const [formName, setFormName]     = useState("");
  const [formClassId, setFormClassId]     = useState("");
  const [formSubjectId, setFormSubjectId] = useState("");
  const [formStartDate, setFormStartDate] = useState("");
  const [formEndDate, setFormEndDate]     = useState("");
  const [formStatus, setFormStatus]       = useState<ExamStatus>("DRAFT");
  const [saving, setSaving]         = useState(false);
  const [saveError, setSaveError]   = useState("");
  const [deleting, setDeleting]     = useState<string | null>(null);

  const [meStudents, setMeStudents]     = useState<StudentRecord[]>([]);
  const [meSubjectId, setMeSubjectId]   = useState("");
  const [meScores, setMeScores]         = useState<Record<string, string>>({});
  const [meSaving, setMeSaving]         = useState(false);
  const [meSaved, setMeSaved]           = useState(false);

  const load = useCallback(async (clsId?: string) => {
    if (!cid || !token) return;
    setLoading(true); setError(null);
    try {
      const [examData, clsData, subData] = await Promise.all([
        getExams(cid, token, { type: "CLASS_TEST", limit: 100, classId: clsId || undefined }),
        getMyClasses(cid, token),
        getSubjects(cid, token, {}),
      ]);
      setExams(examData.data ?? []);
      setClasses(clsData);
      setSubjects(subData.data ?? []);
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }, [cid, token]);

  useEffect(() => { load(filterClassId); }, [load]);

  const openAdd = () => {
    setEditTarget(null);
    setFormName(""); setFormClassId(""); setFormSubjectId("");
    setFormStartDate(""); setFormEndDate(""); setFormStatus("DRAFT");
    setSaveError(""); setShowDrawer(true);
  };

  const openEdit = (exam: ExamRecord) => {
    setEditTarget(exam);
    setFormName(exam.name);
    setFormClassId(exam.classId ?? "");
    setFormSubjectId(exam.subjectId ?? "");
    setFormStartDate(exam.startDate?.slice(0, 10) ?? "");
    setFormEndDate(exam.endDate?.slice(0, 10) ?? "");
    setFormStatus(exam.examStatus);
    setSaveError(""); setShowDrawer(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) { setSaveError("Name is required"); return; }
    if (!formClassId) { setSaveError("Class is required"); return; }
    if (!formSubjectId) { setSaveError("Subject is required"); return; }
    setSaving(true); setSaveError("");
    try {
      if (editTarget) {
        const updated = await updateExam(cid, token, editTarget.id, {
          name: formName.trim(),
          startDate: formStartDate || null,
          endDate: formEndDate || null,
          examStatus: formStatus,
        });
        setExams((prev) => prev.map((e) => e.id === updated.id ? { ...e, ...updated } : e));
      } else {
        const created = await createExam(cid, token, {
          name: formName.trim(),
          accademicYearId: ayId,
          type: "CLASS_TEST",
          classId: formClassId,
          subjectId: formSubjectId,
          startDate: formStartDate || undefined,
          endDate: formEndDate || undefined,
          examStatus: formStatus,
        });
        setExams((prev) => [...prev, created]);
      }
      setShowDrawer(false);
    } catch (e) { setSaveError((e as Error).message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this class test?")) return;
    setDeleting(id);
    try { await deleteExam(cid, token, id); setExams((prev) => prev.filter((e) => e.id !== id)); }
    catch (e) { setError((e as Error).message); }
    finally { setDeleting(null); }
  };

  const toggleExpand = async (examId: string) => {
    if (expandedId === examId) { setExpandedId(null); return; }
    setExpandedId(examId);
    setLoadingResults(true);
    try {
      const data = await getResults(cid, token, { examId, limit: 2000 });
      setResults(data.data ?? []);
      const r = data.data ?? [];
      const exam = exams.find((e) => e.id === examId);
      const clsId = r.length > 0 ? r[0].classId : (exam?.classId ?? "");
      const subId = r.length > 0 ? (r[0].subject?.id ?? "") : "";
      if (clsId) {
        const students = await getStudents(cid, token, { classId: clsId, limit: 500 });
        setMeStudents(students.data ?? []);
        setMeSubjectId(subId);
        const scoreMap: Record<string, string> = {};
        for (const s of students.data ?? []) {
          const found = r.find((res) => res.student?.id === s.id);
          if (found) scoreMap[s.id] = String(found.score);
        }
        setMeScores(scoreMap);
      } else {
        setMeStudents([]); setMeSubjectId(""); setMeScores({});
      }
    } catch { setResults([]); }
    finally { setLoadingResults(false); }
  };

  const loadMeStudents = async (examId: string, classId: string) => {
    setMeSaving(false); setMeSaved(false);
    try {
      const subData = await getSubjects(cid, token, { classId, limit: 200 });
      const stuData = await getStudents(cid, token, { classId, limit: 500 });
      const existing = results.filter((r) =>
        subData.data?.some((s) => s.id === r.subject?.id),
      );
      const scoreMap: Record<string, string> = {};
      for (const s of stuData.data ?? []) {
        const found = existing.find((r) => r.student?.id === s.id);
        if (found) scoreMap[s.id] = String(found.score);
      }
      setMeStudents(stuData.data ?? []);
      setMeSubjectId(subData.data?.[0]?.id ?? "");
      setMeScores(scoreMap);
    } catch { /* ignore */ }
  };

  const handleMeSave = async (examId: string) => {
    const items = meStudents
      .filter((s) => meScores[s.id] !== "" && meScores[s.id] !== undefined)
      .map((s) => ({ subjectId: meSubjectId, studentId: s.id, score: Number(meScores[s.id]), totalMarks: 100 }));
    if (!items.length) return;
    setMeSaving(true);
    try {
      await bulkUpsertResults(cid, token, {
        examId, classId: filterClassId || (exams.find((e) => e.id === examId)?.classId ?? ""),
        accademicYearId: ayId, results: items,
      });
      setMeSaved(true);
      setTimeout(() => setMeSaved(false), 3000);
      const data = await getResults(cid, token, { examId, limit: 2000 });
      setResults(data.data ?? []);
    } catch { /* ignore */ }
    finally { setMeSaving(false); }
  };

  return (
    <DashboardLayout>
      <PageHeader
        title="Class Tests"
        icon={GraduationCap}
        subtitle={`${exams.length} tests`}
        action={
          <button onClick={openAdd}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors">
            <Plus className="w-4 h-4" /> New Class Test
          </button>
        }
      />

      {error && <ApiErrorBanner message={error} onRetry={() => load(filterClassId)} />}

      <div className="flex gap-3 mb-4">
        <select value={filterClassId} onChange={(e) => { setFilterClassId(e.target.value); load(e.target.value); }}
          className="w-full max-w-xs px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
          <option value="">All Classes</option>
          {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
      ) : exams.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">No class tests yet. Create one to get started.</div>
      ) : (
        <div className="space-y-3 pb-24">
          {exams.map((exam) => {
            const isExpanded = expandedId === exam.id;
            const isDeleting = deleting === exam.id;
            return (
              <div key={exam.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => toggleExpand(exam.id)}>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-gray-900 text-sm">{exam.name}</p>
                        <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border", STATUS_COLORS[exam.examStatus])}>
                          {STATUS_LABELS[exam.examStatus]}
                        </span>
                      </div>
                      <div className="flex gap-3 mt-1 flex-wrap text-xs text-gray-500">
                        <span>{exam.class?.name ?? "—"}</span>
                        {exam.subject && <span>· {exam.subject.name}</span>}
                        {exam.startDate && (
                          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {fmt(exam.startDate)} – {fmt(exam.endDate)}</span>
                        )}
                        {(exam._count?.results ?? 0) > 0 && (
                          <span className="text-emerald-600 font-medium">{exam._count!.results} results</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={(e) => { e.stopPropagation(); openEdit(exam); }}
                        className="p-1.5 rounded-lg text-gray-300 hover:text-blue-500 transition-colors" title="Edit">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(exam.id); }} disabled={isDeleting}
                        className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 transition-colors" title="Delete">
                        {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                      </button>
                      <button onClick={() => toggleExpand(exam.id)} className="p-1.5 text-gray-400">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <div className="border-t border-gray-100 bg-gray-50/50 px-4 py-3 space-y-3">
                        {loadingResults ? (
                          <div className="flex justify-center py-6"><Loader2 className="w-4 h-4 animate-spin" /></div>
                        ) : (
                          <>
                            <div className="flex items-center gap-2">
                              <select value={exam.classId ?? ""} onChange={(e) => loadMeStudents(exam.id, e.target.value)}
                                className="flex-1 px-3 py-1.5 border border-gray-200 rounded-xl text-xs bg-white focus:outline-none">
                                <option value={exam.classId ?? ""}>{exam.class?.name ?? "Select class"}</option>
                              </select>
                              <button onClick={() => handleMeSave(exam.id)} disabled={meSaving}
                                className={cn(
                                  "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors",
                                  meSaved ? "bg-emerald-100 text-emerald-700" : "bg-emerald-600 text-white hover:bg-emerald-700",
                                )}>
                                {meSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : meSaved ? <CheckCircle2 className="w-3.5 h-3.5" /> : <PenLine className="w-3.5 h-3.5" />}
                                {meSaved ? "Saved" : "Save Marks"}
                              </button>
                            </div>

                            {meStudents.length === 0 ? (
                              <p className="text-xs text-gray-400 text-center py-4">Select a class to enter marks</p>
                            ) : (
                              <div className="rounded-xl border border-gray-100 overflow-hidden bg-white">
                                <div className="px-3 py-2 bg-gray-50 flex justify-between text-[10px] font-bold text-gray-400 uppercase border-b">
                                  <span>Student</span>
                                  <span>Score / 100</span>
                                </div>
                                <div className="divide-y divide-gray-50 max-h-72 overflow-y-auto">
                                  {meStudents.map((s) => (
                                    <div key={s.id} className="flex items-center gap-3 px-3 py-2">
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-gray-900 truncate">{s.name}</p>
                                        <p className="text-xs text-gray-400">{s.adno}</p>
                                      </div>
                                      <input type="number" min={0} max={100}
                                        value={meScores[s.id] ?? ""}
                                        onChange={(e) => setMeScores((m) => ({ ...m, [s.id]: e.target.value }))}
                                        placeholder="—"
                                        className="w-16 text-center px-2 py-1.5 border border-gray-200 rounded-lg text-sm font-bold focus:outline-none focus:border-emerald-400"
                                      />
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
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

      {/* Add/Edit Drawer */}
      <AnimatePresence>
        {showDrawer && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => !saving && setShowDrawer(false)}
              className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm" />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl max-h-[90dvh] flex flex-col">
              <div className="flex justify-center pt-3 pb-1 shrink-0"><div className="w-10 h-1 bg-gray-300 rounded-full" /></div>
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 shrink-0">
                <h2 className="font-bold text-gray-900 text-lg">{editTarget ? "Edit Class Test" : "New Class Test"}</h2>
                <button onClick={() => !saving && setShowDrawer(false)} disabled={saving}
                  className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4 pb-8">
                {saveError && <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl">{saveError}</div>}

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Test Name <span className="text-red-500">*</span></label>
                  <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Chapter 3 Quiz"
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-emerald-400 focus:bg-white transition-colors" />
                </div>

                {!editTarget && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">Class <span className="text-red-500">*</span></label>
                      <select value={formClassId} onChange={(e) => { setFormClassId(e.target.value); setFormSubjectId(""); }}
                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-emerald-400 focus:bg-white transition-colors">
                        <option value="">Select class</option>
                        {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">Subject <span className="text-red-500">*</span></label>
                      <select value={formSubjectId} onChange={(e) => setFormSubjectId(e.target.value)}
                        disabled={!formClassId}
                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-emerald-400 focus:bg-white transition-colors disabled:opacity-50">
                        <option value="">Select subject</option>
                        {subjects.filter((s) => s.classId === formClassId).map((s) => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                  </>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Start Date</label>
                    <input type="date" value={formStartDate} onChange={(e) => setFormStartDate(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-emerald-400 focus:bg-white transition-colors" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">End Date</label>
                    <input type="date" value={formEndDate} onChange={(e) => setFormEndDate(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-emerald-400 focus:bg-white transition-colors" />
                  </div>
                </div>

                {editTarget && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Status</label>
                    <select value={formStatus} onChange={(e) => setFormStatus(e.target.value as ExamStatus)}
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-emerald-400 focus:bg-white transition-colors">
                      {(Object.keys(STATUS_LABELS) as ExamStatus[]).map((s) => (
                        <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              <div className="px-5 py-4 border-t border-gray-100 flex gap-3 shrink-0">
                <button onClick={() => !saving && setShowDrawer(false)} disabled={saving}
                  className="flex-1 px-4 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 disabled:opacity-50">
                  Cancel
                </button>
                <button onClick={handleSave} disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 disabled:opacity-50">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editTarget ? "Save Changes" : "Create Test"}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}
