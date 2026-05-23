import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { ApiErrorBanner } from "@/components/ui/ApiErrorBanner";
import {
  getExams, createExam, updateExam, deleteExam, generateRanks,
  type ExamRecord, type ExamStatus,
} from "@/lib/exams-api";
import {
  getResults, updateResult, deleteResult, bulkUpsertResults,
  calcGrade, type ResultRecord,
} from "@/lib/results-api";
import { getAllClasses, type ClassRecord } from "@/lib/classes-api";
import { getSubjects, type SubjectRecord } from "@/lib/subjects-api";
import { getStudents, type StudentRecord } from "@/lib/students-api";
import { useAuthStore } from "@/store/auth";
import { cn } from "@/lib/utils";
import {
  GraduationCap, Plus, Loader2, Trash2, ChevronDown, ChevronUp,
  Trophy, X, Calendar, Edit2, Check, AlertTriangle, RefreshCw,
  AlertCircle, PenLine, Save, CheckCircle2, BarChart2, Settings,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<ExamStatus, string> = {
  DRAFT:      "Draft",
  MARK_ENTRY: "Mark Entry",
  PUBLISHED:  "Published",
  CANCELLED:  "Cancelled",
};
const STATUS_COLORS: Record<ExamStatus, string> = {
  DRAFT:      "bg-gray-100 text-gray-600",
  MARK_ENTRY: "bg-amber-100 text-amber-700",
  PUBLISHED:  "bg-emerald-100 text-emerald-700",
  CANCELLED:  "bg-red-100 text-red-500",
};

function fmt(d?: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function gradeChip(score: number, totalMarks = 100) {
  const g = calcGrade(score, totalMarks);
  const map: Record<string, string> = {
    "A+": "text-emerald-700 bg-emerald-50 border-emerald-200",
    "A":  "text-blue-700 bg-blue-50 border-blue-200",
    "B":  "text-indigo-700 bg-indigo-50 border-indigo-200",
    "C":  "text-yellow-700 bg-yellow-50 border-yellow-200",
    "F":  "text-red-700 bg-red-50 border-red-200",
  };
  return { label: g, cls: map[g] ?? "text-gray-500 bg-gray-50 border-gray-200" };
}

// ── Student grouping ──────────────────────────────────────────────────────────

interface StudentResult {
  studentId: string;
  name: string;
  adno: string;
  className: string;
  rank: number | null;
  totalScore: number;
  maxScore: number;
  pct: number;
  subjects: ResultRecord[];
}

function groupByStudent(results: ResultRecord[]): StudentResult[] {
  const map = new Map<string, StudentResult>();
  for (const r of results) {
    const sid = r.student?.id ?? "__unknown__";
    if (!map.has(sid)) {
      map.set(sid, {
        studentId: sid,
        name:       r.student?.name ?? "Unknown",
        adno:       r.student?.adno ?? "",
        className:  r.class?.name   ?? "—",
        rank:       null,
        totalScore: 0,
        maxScore:   0,
        pct:        0,
        subjects:   [],
      });
    }
    const e = map.get(sid)!;
    e.totalScore += r.score;
    e.maxScore   += r.totalMarks;
    e.subjects.push(r);
    if (r.rank != null) e.rank = r.rank;
  }
  for (const e of map.values()) {
    e.pct = e.maxScore > 0 ? Math.round((e.totalScore / e.maxScore) * 100) : 0;
    e.subjects.sort((a, b) => (a.subject?.name ?? "").localeCompare(b.subject?.name ?? ""));
  }
  return [...map.values()].sort((a, b) => {
    if (a.rank !== null && b.rank !== null) return a.rank - b.rank;
    if (a.rank !== null) return -1;
    if (b.rank !== null) return 1;
    return b.pct - a.pct;
  });
}

// ── Exam form ─────────────────────────────────────────────────────────────────

interface ExamForm {
  name: string; startDate: string; endDate: string;
  markEntryLastDate: string; publishedDate: string; examStatus: ExamStatus;
}
const EMPTY_FORM: ExamForm = {
  name: "", startDate: "", endDate: "", markEntryLastDate: "", publishedDate: "", examStatus: "DRAFT",
};

// ── Mark entry state per exam ─────────────────────────────────────────────────

interface MarkEntryState {
  classId: string;
  subjectId: string;
  students: StudentRecord[];
  subjects: SubjectRecord[];
  scores: Record<string, string>;
  loading: boolean;
  saving: boolean;
  saved: boolean;
  error: string | null;
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AdminExamsPage() {
  const { user, accessToken, activeClientId } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const cid     = activeClientId ?? "";
  const token   = accessToken ?? "";
  const ayId    = user?.defaultAcademicYearId ?? "";
  const isAdmin = user?.actorType === "SUPER_ADMIN" || user?.actorType === "CLIENT_ADMIN";

  const goToClassReport = (examId: string, classId: string) => {
    const back = location.pathname;
    navigate(`${location.pathname.replace(/\/exams.*/, "/exams")}/class-report?examId=${examId}&classId=${classId}&ayId=${ayId}&back=${encodeURIComponent(back)}`);
  };

  const [exams, setExams]     = useState<ExamRecord[]>([]);
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  // Per-exam results
  const [expandedId, setExpandedId]         = useState<string | null>(null);
  const [resultsMap, setResultsMap]         = useState<Record<string, ResultRecord[]>>({});
  const [resultErrorMap, setResultErrorMap] = useState<Record<string, string>>({});
  const [loadingResults, setLoadingResults] = useState<string | null>(null);
  const [filterClassId, setFilterClassId]   = useState("");
  const [rankingId, setRankingId]           = useState<string | null>(null);
  const [rankStaleFor, setRankStaleFor]     = useState<Set<string>>(new Set());

  // Inline score edit
  const [editCell, setEditCell]     = useState<{ resultId: string; examId: string; score: string } | null>(null);
  const [savingCell, setSavingCell] = useState<string | null>(null);
  const [deletingResultId, setDeletingResultId] = useState<string | null>(null);

  // Mark entry panel (per exam)
  const [markEntryOpen, setMarkEntryOpen]   = useState<string | null>(null); // examId
  const [markEntry, setMarkEntry]           = useState<MarkEntryState>({
    classId: "", subjectId: "", students: [], subjects: [], scores: {},
    loading: false, saving: false, saved: false, error: null,
  });

  // Exam CRUD
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm]   = useState<ExamForm>(EMPTY_FORM);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm]   = useState<Partial<ExamForm>>({});
  const [saving, setSaving]       = useState(false);

  // ── Load ───────────────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    if (!cid || !token) return;
    setPageError(null);
    setLoading(true);
    try {
      const [examData, classData] = await Promise.all([
        getExams(cid, token, { accademicYearId: ayId || undefined, limit: 100 }),
        getAllClasses(cid, token),
      ]);
      setExams(examData.data ?? []);
      setClasses(classData);
    } catch (e) { setPageError((e as Error).message); }
    finally { setLoading(false); }
  }, [cid, token, ayId]);

  useEffect(() => { loadData(); }, [loadData]);

  const loadResults = useCallback(async (examId: string, classId?: string) => {
    setLoadingResults(examId);
    setResultErrorMap((prev) => { const m = { ...prev }; delete m[examId]; return m; });
    try {
      const data = await getResults(cid, token, {
        examId,
        classId: classId || undefined,
        limit: 2000,
      });
      const rows = data.data ?? [];
      setResultsMap((prev) => ({ ...prev, [examId]: rows }));
      const hasNullRank = rows.length > 0 && rows.some((r) => r.rank == null);
      setRankStaleFor((prev) => {
        const s = new Set(prev);
        if (hasNullRank) s.add(examId); else s.delete(examId);
        return s;
      });
    } catch (e) {
      setResultErrorMap((prev) => ({ ...prev, [examId]: (e as Error).message }));
    } finally {
      setLoadingResults(null);
    }
  }, [cid, token]);

  const toggleExpand = useCallback(async (examId: string) => {
    if (expandedId === examId) { setExpandedId(null); setMarkEntryOpen(null); return; }
    setExpandedId(examId);
    await loadResults(examId, filterClassId || undefined);
  }, [expandedId, filterClassId, loadResults]);

  // ── Inline score edit ──────────────────────────────────────────────────────

  const commitEdit = async () => {
    if (!editCell) return;
    const { resultId, examId, score } = editCell;
    const num = parseFloat(score);
    if (isNaN(num) || num < 0) { setEditCell(null); return; }

    const prev = resultsMap[examId]?.find((r) => r.id === resultId);
    setSavingCell(resultId);
    try {
      await updateResult(cid, token, resultId, { score: num });
      setResultsMap((m) => ({
        ...m,
        [examId]: (m[examId] ?? []).map((r) =>
          r.id === resultId ? { ...r, score: num, rank: null } : r,
        ),
      }));
      setRankStaleFor((s) => new Set([...s, examId]));
    } catch (e) {
      alert((e as Error).message);
      if (prev) setResultsMap((m) => ({ ...m, [examId]: (m[examId] ?? []).map((r) => r.id === resultId ? prev : r) }));
    } finally { setSavingCell(null); setEditCell(null); }
  };

  // ── Delete single result ───────────────────────────────────────────────────

  const handleDeleteResult = async (resultId: string, examId: string) => {
    if (!confirm("Delete this result?")) return;
    setDeletingResultId(resultId);
    try {
      await deleteResult(cid, token, resultId);
      setResultsMap((m) => ({
        ...m,
        [examId]: (m[examId] ?? []).filter((r) => r.id !== resultId),
      }));
      setRankStaleFor((s) => new Set([...s, examId]));
    } catch (e) { alert((e as Error).message); }
    finally { setDeletingResultId(null); }
  };

  // ── Generate ranks ─────────────────────────────────────────────────────────

  const handleGenerateRanks = async (examId: string) => {
    setRankingId(examId);
    try {
      const r = await generateRanks(cid, token, examId);
      await loadResults(examId, filterClassId || undefined);
      alert(`Ranks generated: ${r.ranked} results across ${r.classes} class${r.classes !== 1 ? "es" : ""}.`);
    } catch (e) { alert((e as Error).message); }
    finally { setRankingId(null); }
  };

  // ── Mark entry (admin — unrestricted) ──────────────────────────────────────

  const openMarkEntry = async (examId: string) => {
    setMarkEntryOpen(examId);
    if (!classes[0]) return;
    const firstClass = classes[0];
    await loadMarkEntryClass(examId, firstClass.id);
  };

  const loadMarkEntryClass = async (examId: string, classId: string) => {
    setMarkEntry((p) => ({ ...p, classId, subjectId: "", students: [], subjects: [], scores: {}, loading: true, error: null }));
    try {
      const [subData, stuData] = await Promise.all([
        getSubjects(cid, token, { classId, limit: 200 }),
        getStudents(cid, token, { classId, limit: 500 }),
      ]);
      const subs = subData.data ?? [];
      const stus = stuData.data ?? [];
      setMarkEntry((p) => ({
        ...p, classId, students: stus, subjects: subs,
        subjectId: subs[0]?.id ?? "",
        scores: {}, loading: false,
      }));
    } catch (e) {
      setMarkEntry((p) => ({ ...p, loading: false, error: (e as Error).message }));
    }
  };

  const loadMarkEntrySubject = async (examId: string, subjectId: string) => {
    setMarkEntry((p) => ({ ...p, subjectId, scores: {} }));
    // Pre-fill existing results for this exam+subject+class
    try {
      const existing = (resultsMap[examId] ?? []).filter((r) => r.subject?.id === subjectId);
      const scoreMap: Record<string, string> = {};
      markEntry.students.forEach((s) => {
        const r = existing.find((r) => r.student?.id === s.id);
        if (r) scoreMap[s.id] = String(r.score);
      });
      setMarkEntry((p) => ({ ...p, subjectId, scores: scoreMap }));
    } catch { /* pre-fill is best-effort */ }
  };

  const handleMarkEntrySave = async (examId: string) => {
    const { classId, subjectId, students, scores } = markEntry;
    if (!classId || !subjectId) return;

    const items = students
      .filter((s) => scores[s.id] !== "" && scores[s.id] !== undefined)
      .map((s) => ({
        subjectId,
        studentId: s.id,
        score: Number(scores[s.id]),
        totalMarks: 100,
      }));

    if (!items.length) { alert("No scores entered."); return; }

    setMarkEntry((p) => ({ ...p, saving: true, error: null }));
    try {
      await bulkUpsertResults(cid, token, {
        examId,
        classId,
        accademicYearId: ayId,
        results: items,
      });
      setMarkEntry((p) => ({ ...p, saving: false, saved: true }));
      setTimeout(() => setMarkEntry((p) => ({ ...p, saved: false })), 3000);
      // Reload results to reflect new/updated entries
      await loadResults(examId, filterClassId || undefined);
    } catch (e) {
      setMarkEntry((p) => ({ ...p, saving: false, error: (e as Error).message }));
    }
  };

  // ── Exam CRUD ──────────────────────────────────────────────────────────────

  const handleCreate = async () => {
    if (!form.name) return;
    setCreating(true);
    try {
      await createExam(cid, token, {
        name: form.name, accademicYearId: ayId,
        startDate: form.startDate || undefined, endDate: form.endDate || undefined,
        markEntryLastDate: form.markEntryLastDate || undefined,
        publishedDate: form.publishedDate || undefined,
        examStatus: form.examStatus,
      });
      setForm(EMPTY_FORM); setShowCreate(false); loadData();
    } catch (e) { alert((e as Error).message); }
    finally { setCreating(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this exam? Cannot be undone.")) return;
    setDeletingId(id);
    try { await deleteExam(cid, token, id); loadData(); }
    catch (e) { alert((e as Error).message); }
    finally { setDeletingId(null); }
  };

  const startEdit = (exam: ExamRecord) => {
    setEditingId(exam.id);
    setEditForm({
      name: exam.name,
      startDate:         exam.startDate         ? exam.startDate.slice(0, 10)         : "",
      endDate:           exam.endDate           ? exam.endDate.slice(0, 10)           : "",
      markEntryLastDate: exam.markEntryLastDate ? exam.markEntryLastDate.slice(0, 10) : "",
      publishedDate:     exam.publishedDate     ? exam.publishedDate.slice(0, 10)     : "",
      examStatus: exam.examStatus,
    });
  };

  const handleSaveEdit = async (examId: string) => {
    setSaving(true);
    try {
      await updateExam(cid, token, examId, {
        name: editForm.name,
        startDate: editForm.startDate || null, endDate: editForm.endDate || null,
        markEntryLastDate: editForm.markEntryLastDate || null,
        publishedDate: editForm.publishedDate || null,
        examStatus: editForm.examStatus,
      });
      setEditingId(null); loadData();
    } catch (e) { alert((e as Error).message); }
    finally { setSaving(false); }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <DashboardLayout>
      <PageHeader
        title="Exams"
        icon={GraduationCap}
        action={
          <div className="flex items-center gap-2">
            {isAdmin && (
              <button
                onClick={() => navigate(`${location.pathname.replace(/\/exams.*/, "/exams")}/config`)}
                className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-200 transition-colors"
              >
                <Settings className="w-4 h-4" /> Settings
              </button>
            )}
            <button onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold">
              <Plus className="w-4 h-4" /> New Exam
            </button>
          </div>
        }
      />

      {pageError && <ApiErrorBanner message={pageError} onRetry={loadData} />}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      ) : !pageError && exams.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">No exams yet. Create one to get started.</div>
      ) : (
        <div className="space-y-3 pb-24">
          {exams.map((exam) => {
            const results    = resultsMap[exam.id] ?? [];
            const students   = groupByStudent(results);
            const isEditing  = editingId === exam.id;
            const isStale    = rankStaleFor.has(exam.id);
            const isExpanded = expandedId === exam.id;
            const isRanking  = rankingId === exam.id;
            const resultError = resultErrorMap[exam.id];
            const isMarkEntryOpen = markEntryOpen === exam.id;

            return (
              <div key={exam.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">

                {/* ── Exam header ── */}
                <div className="p-4">
                  {isEditing ? (
                    <div className="space-y-3">
                      <input value={editForm.name ?? ""}
                        onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                        placeholder="Exam name" />
                      <div className="grid grid-cols-2 gap-2">
                        {([["startDate", "Start"], ["endDate", "End"], ["markEntryLastDate", "Mark Entry Deadline"], ["publishedDate", "Publish Date"]] as const).map(([field, label]) => (
                          <div key={field}>
                            <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase">{label}</label>
                            <input type="date" value={editForm[field] ?? ""}
                              onChange={(e) => setEditForm((f) => ({ ...f, [field]: e.target.value }))}
                              className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                          </div>
                        ))}
                      </div>
                      <select value={editForm.examStatus ?? "DRAFT"}
                        onChange={(e) => setEditForm((f) => ({ ...f, examStatus: e.target.value as ExamStatus }))}
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400">
                        {(Object.keys(STATUS_LABELS) as ExamStatus[]).map((s) => (
                          <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                        ))}
                      </select>
                      <div className="flex gap-2">
                        <button onClick={() => setEditingId(null)} className="flex-1 py-2 border border-gray-200 rounded-xl text-sm text-gray-600">Cancel</button>
                        <button onClick={() => handleSaveEdit(exam.id)} disabled={saving}
                          className="flex-1 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-1 disabled:opacity-60">
                          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => toggleExpand(exam.id)}>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-gray-900 text-sm">{exam.name}</p>
                          <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border", STATUS_COLORS[exam.examStatus])}>
                            {STATUS_LABELS[exam.examStatus]}
                          </span>
                          {isStale && isExpanded && (
                            <span className="flex items-center gap-0.5 text-[10px] text-amber-600 font-semibold">
                              <AlertTriangle className="w-3 h-3" /> Ranks stale
                            </span>
                          )}
                        </div>
                        {exam.accademicYear && <p className="text-xs text-gray-400 mt-0.5">{exam.accademicYear.name}</p>}
                        <div className="flex gap-3 mt-1.5 flex-wrap">
                          {exam.startDate && (
                            <span className="flex items-center gap-1 text-[11px] text-gray-400">
                              <Calendar className="w-3 h-3" /> {fmt(exam.startDate)} – {fmt(exam.endDate)}
                            </span>
                          )}
                          {exam.markEntryLastDate && (
                            <span className="text-[11px] text-amber-600 font-medium">Entry by {fmt(exam.markEntryLastDate)}</span>
                          )}
                          {(exam._count?.results ?? 0) > 0 && (
                            <span className="text-[11px] text-emerald-600 font-medium">{exam._count!.results} results</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={(e) => { e.stopPropagation(); startEdit(exam); }}
                          className="p-1.5 rounded-lg text-gray-300 hover:text-blue-500 transition-colors" title="Edit exam">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); handleDelete(exam.id); }} disabled={deletingId === exam.id}
                          className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 transition-colors" title="Delete exam">
                          {deletingId === exam.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        </button>
                        <button onClick={() => toggleExpand(exam.id)} className="p-1.5 text-gray-400">
                          {loadingResults === exam.id
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* ── Results + Mark Entry panel ── */}
                <AnimatePresence>
                  {isExpanded && !isEditing && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <div className="border-t border-gray-100 bg-gray-50/50 px-4 py-3 space-y-3">

                        {/* Controls row */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <select value={filterClassId}
                            onChange={async (e) => { setFilterClassId(e.target.value); await loadResults(exam.id, e.target.value || undefined); }}
                            className="flex-1 min-w-[120px] px-3 py-1.5 border border-gray-200 rounded-xl text-xs bg-white focus:outline-none">
                            <option value="">All classes</option>
                            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                          <button onClick={() => loadResults(exam.id, filterClassId || undefined)}
                            className="p-1.5 rounded-xl border border-gray-200 text-gray-400 hover:text-gray-700 transition-colors" title="Refresh">
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleGenerateRanks(exam.id)} disabled={isRanking}
                            className={cn(
                              "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 disabled:opacity-60 transition-colors",
                              isStale ? "bg-amber-500 hover:bg-amber-600 text-white" : "bg-emerald-600 hover:bg-emerald-700 text-white",
                            )}>
                            {isRanking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trophy className="w-3.5 h-3.5" />}
                            Generate Ranks
                          </button>
                          {filterClassId && (
                            <button
                              onClick={() => goToClassReport(exam.id, filterClassId)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors shrink-0">
                              <BarChart2 className="w-3.5 h-3.5" />
                              View Report
                            </button>
                          )}
                          <button
                            onClick={() => {
                              if (isMarkEntryOpen) { setMarkEntryOpen(null); }
                              else { openMarkEntry(exam.id); }
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shrink-0">
                            <PenLine className="w-3.5 h-3.5" />
                            {isMarkEntryOpen ? "Close Entry" : "Enter Marks"}
                          </button>
                        </div>

                        {/* ── Mark Entry Panel ── */}
                        <AnimatePresence>
                          {isMarkEntryOpen && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                              <div className="bg-white rounded-2xl border border-emerald-100 p-4 space-y-3">
                                <p className="text-xs font-bold text-emerald-700 uppercase tracking-wide">Enter / Edit Marks</p>

                                {markEntry.error && (
                                  <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 px-3 py-2 rounded-xl">
                                    <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {markEntry.error}
                                  </div>
                                )}

                                {/* Class + Subject selectors */}
                                <div className="flex gap-2 flex-wrap">
                                  <select value={markEntry.classId}
                                    onChange={(e) => loadMarkEntryClass(exam.id, e.target.value)}
                                    className="flex-1 min-w-[120px] px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400">
                                    <option value="">Select class</option>
                                    {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                                  </select>
                                  <select value={markEntry.subjectId}
                                    onChange={(e) => loadMarkEntrySubject(exam.id, e.target.value)}
                                    disabled={!markEntry.classId || markEntry.subjects.length === 0}
                                    className="flex-1 min-w-[120px] px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:opacity-50">
                                    <option value="">Select subject</option>
                                    {markEntry.subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                                  </select>
                                </div>

                                {/* Student score grid */}
                                {markEntry.loading ? (
                                  <div className="flex items-center justify-center py-6 text-gray-400">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  </div>
                                ) : markEntry.students.length === 0 ? (
                                  <p className="text-xs text-gray-400 text-center py-4">Select a class to see students</p>
                                ) : !markEntry.subjectId ? (
                                  <p className="text-xs text-gray-400 text-center py-4">Select a subject to enter marks</p>
                                ) : (
                                  <>
                                    <div className="rounded-xl border border-gray-100 overflow-hidden">
                                      <div className="px-3 py-2 bg-gray-50 flex justify-between text-[10px] font-bold text-gray-400 uppercase">
                                        <span>Student</span>
                                        <span>Score / 100</span>
                                      </div>
                                      <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
                                        {markEntry.students.map((s) => {
                                          const score = markEntry.scores[s.id] ?? "";
                                          const chip  = score !== "" ? gradeChip(Number(score)) : null;
                                          return (
                                            <div key={s.id} className="flex items-center gap-3 px-3 py-2.5">
                                              <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold text-gray-900 truncate">{s.name}</p>
                                                <p className="text-xs text-gray-400">{s.adno}</p>
                                              </div>
                                              <div className="flex items-center gap-2 shrink-0">
                                                {chip && (
                                                  <span className={cn("text-xs font-bold px-2 py-0.5 rounded-lg border", chip.cls)}>
                                                    {chip.label}
                                                  </span>
                                                )}
                                                <input
                                                  type="number" min={0} max={100} value={score}
                                                  onChange={(e) => setMarkEntry((p) => ({
                                                    ...p, scores: { ...p.scores, [s.id]: e.target.value },
                                                  }))}
                                                  placeholder="—"
                                                  className="w-16 text-center px-2 py-1.5 border border-gray-200 rounded-lg text-sm font-bold focus:outline-none focus:border-emerald-400"
                                                />
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                    <button onClick={() => handleMarkEntrySave(exam.id)} disabled={markEntry.saving}
                                      className={cn(
                                        "w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all",
                                        markEntry.saved
                                          ? "bg-emerald-100 text-emerald-700"
                                          : "bg-emerald-600 text-white hover:bg-emerald-700",
                                      )}>
                                      {markEntry.saving
                                        ? <Loader2 className="w-4 h-4 animate-spin" />
                                        : markEntry.saved
                                          ? <><CheckCircle2 className="w-4 h-4" /> Marks Saved</>
                                          : <><Save className="w-4 h-4" /> Save Marks</>}
                                    </button>
                                  </>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* Stale warning */}
                        {isStale && (
                          <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-100 rounded-xl text-xs text-amber-700">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                            Scores were edited. Click Generate Ranks to update.
                          </div>
                        )}

                        {resultError && (
                          <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" /> Failed to load: {resultError}
                          </div>
                        )}

                        {!resultError && results.length === 0 && (
                          <p className="text-sm text-gray-400 text-center py-4">
                            No results yet. Use "Enter Marks" above to add them.
                          </p>
                        )}

                        {/* Summary */}
                        {students.length > 0 && (
                          <div className="grid grid-cols-4 gap-2">
                            {[
                              { label: "Students", value: students.length },
                              { label: "Subjects",  value: new Set(results.map((r) => r.subject?.id)).size },
                              { label: "Pass Rate", value: students.length ? `${Math.round(students.filter((s) => calcGrade(s.totalScore, s.maxScore) !== "F").length / students.length * 100)}%` : "—" },
                              { label: "Avg", value: students.length ? `${Math.round(students.reduce((s, st) => s + st.pct, 0) / students.length)}%` : "—" },
                            ].map((s) => (
                              <div key={s.label} className="bg-white rounded-xl p-2.5 text-center border border-gray-100">
                                <p className="text-base font-bold text-gray-900">{s.value}</p>
                                <p className="text-[11px] text-gray-400 mt-0.5">{s.label}</p>
                              </div>
                            ))}
                          </div>
                        )}

                        {students.length > 0 && (
                          <p className="text-[10px] text-gray-400 text-center">
                            Click score to edit inline · Trash to delete · Regenerate ranks after changes
                          </p>
                        )}

                        {/* Student result cards */}
                        <div className="space-y-2">
                          {students.map((st, idx) => {
                            const overall = gradeChip(st.totalScore, st.maxScore);
                            return (
                              <motion.div key={st.studentId}
                                initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.02 }}
                                className="bg-white rounded-2xl border border-gray-100 overflow-hidden">

                                {/* Student header */}
                                <div className="flex items-center gap-3 px-4 py-2.5 bg-gray-50/80 border-b border-gray-100">
                                  <div className="w-8 flex items-center justify-center shrink-0">
                                    {st.rank
                                      ? <span className="text-sm font-black text-amber-500">#{st.rank}</span>
                                      : <span className="text-xs text-gray-300">—</span>}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-gray-900 truncate">{st.name}</p>
                                    <p className="text-xs text-gray-400">{st.adno} · {st.className}</p>
                                  </div>
                                  <div className="text-right shrink-0">
                                    <p className="text-sm font-bold text-gray-900">
                                      {st.totalScore}<span className="text-xs font-normal text-gray-400">/{st.maxScore}</span>
                                    </p>
                                    <p className="text-xs text-gray-400">{st.pct}%</p>
                                  </div>
                                  <span className={cn("text-xs font-bold px-2 py-1 rounded-lg border w-10 text-center shrink-0", overall.cls)}>
                                    {overall.label}
                                  </span>
                                </div>

                                {/* Subject rows — editable + deletable */}
                                <div className="divide-y divide-gray-50">
                                  {st.subjects.map((r) => {
                                    const isEditingCell = editCell?.resultId === r.id;
                                    const isSavingCell  = savingCell === r.id;
                                    const isDeletingR   = deletingResultId === r.id;
                                    const chip = gradeChip(r.score, r.totalMarks);

                                    return (
                                      <div key={r.id} className="flex items-center gap-2 px-4 py-2">
                                        <p className="flex-1 text-sm text-gray-700 truncate min-w-0">
                                          {r.subject?.name ?? "Subject"}
                                        </p>
                                        <span className={cn("text-xs font-bold px-2 py-0.5 rounded-lg border w-9 text-center shrink-0", chip.cls)}>
                                          {chip.label}
                                        </span>
                                        {/* Score — click to edit inline */}
                                        <div className="shrink-0 w-28 flex items-center justify-end gap-1">
                                          {isEditingCell ? (
                                            <input autoFocus type="number" min={0} max={r.totalMarks}
                                              value={editCell!.score}
                                              onChange={(e) => setEditCell({ ...editCell!, score: e.target.value })}
                                              onBlur={commitEdit}
                                              onKeyDown={(e) => { if (e.key === "Enter") commitEdit(); if (e.key === "Escape") setEditCell(null); }}
                                              className="w-20 text-center px-2 py-1 border-2 border-emerald-400 rounded-lg text-sm font-bold focus:outline-none bg-white" />
                                          ) : (
                                            <button
                                              onClick={() => setEditCell({ resultId: r.id, examId: exam.id, score: String(r.score) })}
                                              className="text-sm font-bold px-3 py-1 rounded-lg hover:bg-blue-50 hover:text-blue-700 transition-colors cursor-pointer min-w-[5rem] text-right"
                                              title="Click to edit">
                                              {isSavingCell
                                                ? <Loader2 className="w-4 h-4 animate-spin inline" />
                                                : <>{r.score}<span className="text-xs font-normal text-gray-400">/{r.totalMarks}</span></>}
                                            </button>
                                          )}
                                        </div>
                                        {/* Delete result */}
                                        <button
                                          onClick={() => handleDeleteResult(r.id, exam.id)}
                                          disabled={isDeletingR}
                                          className="p-1 rounded-lg text-gray-200 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
                                          title="Delete this result">
                                          {isDeletingR ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                                        </button>
                                        {/* Who marked */}
                                        {r.markedBy && (
                                          <span className="hidden sm:block text-[10px] text-gray-300 truncate w-16 text-right shrink-0"
                                            title={`Marked by ${r.markedBy.name}`}>
                                            {r.markedBy.name}
                                          </span>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </motion.div>
                            );
                          })}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Create exam modal ── */}
      <AnimatePresence>
        {showCreate && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 z-40 backdrop-blur-sm" onClick={() => setShowCreate(false)} />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <p className="font-bold text-gray-900 text-lg">New Exam</p>
                    <p className="text-xs text-gray-400 mt-0.5">School-wide · teachers enter marks per class &amp; subject</p>
                  </div>
                  <button onClick={() => setShowCreate(false)}><X className="w-5 h-5 text-gray-400" /></button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">Exam Name *</label>
                    <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      placeholder="e.g. Term 1 Exam, Annual Exam"
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">Status</label>
                    <select value={form.examStatus} onChange={(e) => setForm((f) => ({ ...f, examStatus: e.target.value as ExamStatus }))}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
                      {(Object.keys(STATUS_LABELS) as ExamStatus[]).map((s) => (
                        <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {([["startDate", "Start Date"], ["endDate", "End Date"], ["markEntryLastDate", "Mark Entry Deadline"], ["publishedDate", "Publish Date"]] as const).map(([field, label]) => (
                      <div key={field}>
                        <label className="block text-xs font-semibold text-gray-500 mb-1.5">{label}</label>
                        <input type="date" value={form[field]}
                          onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button onClick={() => setShowCreate(false)} className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700">Cancel</button>
                  <button onClick={handleCreate} disabled={!form.name || creating}
                    className="flex-1 py-3 bg-emerald-600 text-white rounded-xl text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-2">
                    {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Create Exam
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
