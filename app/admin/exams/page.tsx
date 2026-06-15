import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { ApiErrorBanner } from "@/components/ui/ApiErrorBanner";
import {
  getExams, createExam, updateExam, deleteExam, generateRanks,
  type ExamRecord, type ExamStatus, type ExamType,
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
  Plus, Loader2, Trash2, ChevronDown, ChevronUp, Search, Filter,
  Trophy, X, Calendar, Edit2, Check, AlertTriangle, RefreshCw,
  AlertCircle, PenLine, Save, CheckCircle2, BarChart2, MoreVertical,
  BookOpen, Award, GraduationCap, ClipboardCheck, FileText, ChevronRight
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
  DRAFT:      "bg-gray-100 text-gray-700 border-gray-200",
  MARK_ENTRY: "bg-amber-50 text-amber-700 border-amber-200",
  PUBLISHED:  "bg-emerald-50 text-emerald-700 border-emerald-200",
  CANCELLED:  "bg-rose-50 text-rose-700 border-rose-200",
};

type TabFilter = "ALL" | "MADRASA" | "CLASS" | "DRAFT" | "MARK_ENTRY" | "PUBLISHED" | "ARCHIVED";

interface ExamForm {
  name: string;
  type: ExamType;
  classId: string;
  subjectId: string;
  startDate: string;
  endDate: string;
  markEntryLastDate: string;
  publishedDate: string;
  examStatus: ExamStatus;
  maxMarks: number;
  passMarks: number;
}

const EMPTY_FORM: ExamForm = {
  name: "",
  type: "TERM_EXAM",
  classId: "",
  subjectId: "",
  startDate: "",
  endDate: "",
  markEntryLastDate: "",
  publishedDate: "",
  examStatus: "DRAFT",
  maxMarks: 100,
  passMarks: 36,
};

function fmt(d?: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function gradeChip(score: number, totalMarks = 100) {
  const g = calcGrade(score, totalMarks);
  const map: Record<string, string> = {
    "A+": "text-emerald-700 bg-emerald-50 border-emerald-200",
    "A":  "text-teal-700 bg-teal-50 border-teal-200",
    "B+": "text-blue-700 bg-blue-50 border-blue-200",
    "B":  "text-indigo-700 bg-indigo-50 border-indigo-200",
    "C+": "text-amber-700 bg-amber-50 border-amber-200",
    "C":  "text-yellow-700 bg-yellow-50 border-yellow-200",
    "D+": "text-orange-700 bg-orange-50 border-orange-200",
    "D":  "text-red-700 bg-red-50 border-red-200",
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

// ── Mark entry state per exam ─────────────────────────────────────────────────

interface MarkEntryState {
  classId: string;
  subjectId: string;
  students: { id: string; name: string; adno: string }[];
  subjects: SubjectRecord[];
  scores: Record<string, string>;
  loading: boolean;
  saving: boolean;
  saved: boolean;
  error: string | null;
}

export default function AdminExamsPage() {
  const { user, accessToken, activeClientId } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const cid     = activeClientId ?? "";
  const token   = accessToken ?? "";
  const ayId    = user?.defaultAcademicYearId ?? "";

  const goToClassReport = (examId: string, classId: string) => {
    const back = location.pathname;
    navigate(`${location.pathname.replace(/\/exams.*/, "/exams")}/class-report?examId=${examId}&classId=${classId}&ayId=${ayId}&back=${encodeURIComponent(back)}`);
  };

  const [exams, setExams]     = useState<ExamRecord[]>([]);
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  // Filters
  const [selectedTab, setSelectedTab] = useState<TabFilter>("ALL");
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Per-exam details
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

  // Mark entry panel
  const [markEntryOpen, setMarkEntryOpen]   = useState<string | null>(null);
  const [markEntry, setMarkEntry]           = useState<MarkEntryState>({
    classId: "", subjectId: "", students: [], subjects: [], scores: {},
    loading: false, saving: false, saved: false, error: null,
  });

  // Action Drawer State
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<"create" | "edit">("create");
  const [form, setForm] = useState<ExamForm>(EMPTY_FORM);
  const [formSubjects, setFormSubjects] = useState<SubjectRecord[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [activeDotsMenuId, setActiveDotsMenuId] = useState<string | null>(null);

  // Deletion modals state
  const [showDeleteExamConfirm, setShowDeleteExamConfirm] = useState(false);
  const [deleteExamTarget, setDeleteExamTarget] = useState<ExamRecord | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [showDeleteResultConfirm, setShowDeleteResultConfirm] = useState(false);
  const [deleteResultTarget, setDeleteResultTarget] = useState<{ id: string; name: string; subject: string; score: number; examId: string } | null>(null);

  // ── Load ───────────────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    if (!cid || !token) return;
    setPageError(null);
    setLoading(true);
    try {
      const [examData, classData] = await Promise.all([
        getExams(cid, token, { limit: 100 }),
        getAllClasses(cid, token),
      ]);
      setExams(examData.data ?? []);
      setClasses(classData);
    } catch (e) { setPageError((e as Error).message); }
    finally { setLoading(false); }
  }, [cid, token]);

  useEffect(() => { loadData(); }, [loadData]);

  // Load subjects for Class Level exams in create/edit form
  useEffect(() => {
    if (form.classId) {
      getSubjects(cid, token, { classId: form.classId, limit: 100 })
        .then((res) => {
          const subs = res.data ?? [];
          setFormSubjects(subs);
          if (!subs.some((s) => s.id === form.subjectId)) {
            setForm((f) => ({ ...f, subjectId: subs[0]?.id ?? "" }));
          }
        })
        .catch(() => setFormSubjects([]));
    } else {
      setFormSubjects([]);
    }
  }, [form.classId, form.type, cid, token]);

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

  // ── Form Actions ────────────────────────────────────────────────────────────

  const openCreateDrawer = () => {
    setForm(EMPTY_FORM);
    setDrawerMode("create");
    setDrawerOpen(true);
    setActiveDotsMenuId(null);
  };

  const openEditDrawer = (exam: ExamRecord) => {
    setForm({
      name: exam.name,
      type: exam.type ?? "TERM_EXAM",
      classId: exam.classId ?? "",
      subjectId: exam.subjectId ?? "",
      startDate: exam.startDate ? new Date(exam.startDate).toISOString().split("T")[0] : "",
      endDate: exam.endDate ? new Date(exam.endDate).toISOString().split("T")[0] : "",
      markEntryLastDate: exam.markEntryLastDate ? new Date(exam.markEntryLastDate).toISOString().split("T")[0] : "",
      publishedDate: exam.publishedDate ? new Date(exam.publishedDate).toISOString().split("T")[0] : "",
      examStatus: exam.examStatus,
      maxMarks: exam.maxMarks ?? 100,
      passMarks: exam.passMarks ?? 36,
    });
    setDrawerMode("edit");
    setDrawerOpen(true);
    // Load subjects if classId exists
    if (exam.classId) {
      getSubjects(cid, token, { classId: exam.classId, limit: 100 })
        .then((res) => setFormSubjects(res.data ?? []))
        .catch(() => setFormSubjects([]));
    }
    setExpandedId(exam.id);
    setActiveDotsMenuId(null);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !cid || !token) return;
    setSubmitting(true);
    setPageError(null);

    const payload = {
      name: form.name,
      type: form.type,
      classId: form.type !== "TERM_EXAM" ? form.classId : undefined,
      subjectId: form.type !== "TERM_EXAM" ? form.subjectId : undefined,
      startDate: form.startDate || undefined,
      endDate: form.endDate || undefined,
      markEntryLastDate: form.markEntryLastDate || undefined,
      publishedDate: form.publishedDate || undefined,
      examStatus: form.examStatus,
      maxMarks: Number(form.maxMarks) || 100,
      passMarks: Number(form.passMarks) || undefined,
      accademicYearId: ayId || "",
    };

    try {
      if (drawerMode === "create") {
        const res = await createExam(cid, token, payload);
        setExams((prev) => [res, ...prev]);
      } else {
        if (!expandedId) return;
        const res = await updateExam(cid, token, expandedId, payload);
        setExams((prev) => prev.map((ex) => (ex.id === expandedId ? { ...ex, ...res } : ex)));
      }
      setDrawerOpen(false);
      setForm(EMPTY_FORM);
    } catch (e: any) {
      setPageError(e.message ?? "Action failed");
    } finally {
      setSubmitting(false);
    }
  };

  const startDeleteExam = (exam: ExamRecord) => {
    setDeleteExamTarget(exam);
    setShowDeleteExamConfirm(true);
    setActiveDotsMenuId(null);
  };

  const handleDeleteExam = async () => {
    if (!deleteExamTarget || !cid || !token) return;
    setDeletingId(deleteExamTarget.id);
    try {
      await deleteExam(cid, token, deleteExamTarget.id);
      setExams((prev) => prev.filter((e) => e.id !== deleteExamTarget.id));
      setShowDeleteExamConfirm(false);
      setDeleteExamTarget(null);
    } catch (e: any) {
      alert(e.message ?? "Delete failed");
    } finally {
      setDeletingId(null);
    }
  };

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
    } catch (e: any) {
      alert(e.message ?? "Edit failed");
      if (prev) setResultsMap((m) => ({ ...m, [examId]: (m[examId] ?? []).map((r) => r.id === resultId ? prev : r) }));
    } finally { setSavingCell(null); setEditCell(null); }
  };

  const handleDeleteResult = async () => {
    if (!deleteResultTarget) return;
    const { id: resultId, examId } = deleteResultTarget;
    setDeletingResultId(resultId);
    try {
      await deleteResult(cid, token, resultId);
      setResultsMap((m) => ({
        ...m,
        [examId]: (m[examId] ?? []).filter((r) => r.id !== resultId),
      }));
      setRankStaleFor((s) => new Set([...s, examId]));
      setShowDeleteResultConfirm(false);
      setDeleteResultTarget(null);
    } catch (e: any) { alert(e.message ?? "Delete failed"); }
    finally { setDeletingResultId(null); }
  };

  // ── Generate ranks ─────────────────────────────────────────────────────────

  const handleGenerateRanks = async (examId: string) => {
    setRankingId(examId);
    try {
      const r = await generateRanks(cid, token, examId);
      await loadResults(examId, filterClassId || undefined);
      alert(`Ranks generated: ${r.ranked} results across ${r.classes} class${r.classes !== 1 ? "es" : ""}.`);
    } catch (e: any) { alert(e.message ?? "Failed to generate ranks"); }
    finally { setRankingId(null); }
  };

  // ── Mark entry (admin) ─────────────────────────────────────────────────────

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
    } catch (e: any) {
      setMarkEntry((p) => ({ ...p, loading: false, error: e.message }));
    }
  };

  const loadMarkEntrySubject = async (examId: string, subjectId: string) => {
    setMarkEntry((p) => ({ ...p, subjectId, scores: {}, loading: true, error: null }));
    try {
      const data = await getResults(cid, token, { examId, classId: markEntry.classId, limit: 500 });
      const rows = data.data ?? [];
      const scoreMap: Record<string, string> = {};
      markEntry.students.forEach((s) => {
        const r = rows.find((r) => r.student?.id === s.id && r.subject?.id === subjectId);
        scoreMap[s.id] = r != null ? String(r.score) : "";
      });
      setMarkEntry((p) => ({ ...p, scores: scoreMap, loading: false }));
    } catch (e: any) {
      setMarkEntry((p) => ({ ...p, loading: false, error: e.message }));
    }
  };

  const handleMarkEntrySave = async (examId: string) => {
    if (!markEntry.classId || !markEntry.subjectId) return;
    setMarkEntry((p) => ({ ...p, saving: true, error: null, saved: false }));
    try {
      const items = markEntry.students
        .filter((s) => markEntry.scores[s.id] !== "" && markEntry.scores[s.id] !== undefined)
        .map((s) => ({
          subjectId:  markEntry.subjectId,
          studentId:  s.id,
          score:      Number(markEntry.scores[s.id]),
          totalMarks: 100,
        }));

      if (!items.length) {
        setMarkEntry((p) => ({ ...p, saving: false, error: "No scores entered" }));
        return;
      }

      await updateResult(cid, token, examId, { score: 100 }); // compat trigger
      // Call proper bulk results upsert
      await bulkUpsertResults(cid, token, {
        examId,
        classId: markEntry.classId,
        accademicYearId: ayId,
        results: items,
      });

      setMarkEntry((p) => ({ ...p, saving: false, saved: true }));
      setTimeout(() => setMarkEntry((p) => ({ ...p, saved: false })), 2000);
      await loadResults(examId, filterClassId || undefined);
    } catch (e: any) {
      setMarkEntry((p) => ({ ...p, saving: false, error: e.message }));
    }
  };

  // ── Filtering logic ─────────────────────────────────────────────────────────

  const filteredExams = exams.filter((exam) => {
    // 1. Search text filter
    if (searchText && !exam.name.toLowerCase().includes(searchText.toLowerCase())) {
      return false;
    }
    // 2. Status dropdown filter
    if (statusFilter !== "ALL" && exam.examStatus !== statusFilter) {
      return false;
    }
    // 3. Tab filter
    const isClassLevel = exam.classId !== null || exam.type !== "TERM_EXAM";
    switch (selectedTab) {
      case "MADRASA":
        return !isClassLevel;
      case "CLASS":
        return isClassLevel;
      case "DRAFT":
        return exam.examStatus === "DRAFT";
      case "MARK_ENTRY":
        return exam.examStatus === "MARK_ENTRY";
      case "PUBLISHED":
        return exam.examStatus === "PUBLISHED";
      case "ARCHIVED":
        return exam.examStatus === "CANCELLED";
      case "ALL":
      default:
        return true;
    }
  });

  return (
    <DashboardLayout>
      <div className="px-4 py-3 lg:px-8 lg:py-6 space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Exams</h1>
            <p className="text-sm text-gray-500 mt-1">Manage all madrasa and class level examinations</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={openCreateDrawer}
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm px-4 py-2.5 rounded-xl transition-all shadow-sm shadow-emerald-100 hover:scale-[1.01]"
            >
              <Plus className="w-4 h-4" /> Create Exam
            </button>
          </div>
        </div>

        {/* Global errors */}
        {pageError && (
          <div className="bg-rose-50 border border-rose-100 text-rose-600 text-sm px-4 py-3 rounded-2xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" /> {pageError}
            <button onClick={() => setPageError(null)} className="ml-auto p-1 text-rose-400 hover:text-rose-600"><X className="w-4 h-4" /></button>
          </div>
        )}

        {/* Filters and Tabs */}
        <div className="space-y-4">
          {/* Tab lists */}
          <div className="border-b border-gray-100 flex gap-1 overflow-x-auto no-scrollbar py-0.5">
            {(["ALL", "MADRASA", "CLASS", "DRAFT", "MARK_ENTRY", "PUBLISHED", "ARCHIVED"] as const).map((t) => {
              const labels: Record<TabFilter, string> = {
                ALL: "All Exams",
                MADRASA: "Madrasa Level",
                CLASS: "Class Level",
                DRAFT: "Draft",
                MARK_ENTRY: "Mark Entry Open",
                PUBLISHED: "Published",
                ARCHIVED: "Archived",
              };
              return (
                <button
                  key={t}
                  onClick={() => setSelectedTab(t)}
                  className={cn(
                    "px-4 py-2 text-xs lg:text-sm font-semibold rounded-t-xl transition-colors shrink-0 border-b-2 -mb-px",
                    selectedTab === t
                      ? "border-emerald-600 text-emerald-600 font-bold"
                      : "border-transparent text-gray-500 hover:text-gray-900"
                  )}
                >
                  {labels[t]}
                </button>
              );
            })}
          </div>

          {/* Search + Dropdown Bar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search exam..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/20 focus:border-emerald-500 transition-all"
              />
            </div>
            <div className="relative w-full sm:w-48 shrink-0">
              <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/20 focus:border-emerald-500 transition-all appearance-none"
              >
                <option value="ALL">All Status</option>
                <option value="DRAFT">Draft</option>
                <option value="MARK_ENTRY">Mark Entry Open</option>
                <option value="PUBLISHED">Published</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
              <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Main Exam List */}
        {loading ? (
          <div className="flex items-center justify-center py-24 text-gray-400">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
          </div>
        ) : filteredExams.length === 0 ? (
          <div className="text-center py-20 bg-white border border-gray-100 rounded-3xl p-6">
            <GraduationCap className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-sm font-semibold text-gray-900">No exams found</p>
            <p className="text-xs text-gray-400 mt-1">Try broadening your search or filter tab settings.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredExams.map((exam) => {
              const results    = resultsMap[exam.id] ?? [];
              const students   = groupByStudent(results);
              const isStale    = rankStaleFor.has(exam.id);
              const isExpanded = expandedId === exam.id;
              const isRanking  = rankingId === exam.id;
              const resultError = resultErrorMap[exam.id];
              const isMarkEntryOpen = markEntryOpen === exam.id;
              const isClassLevel = exam.classId !== null || exam.type !== "TERM_EXAM";

              // Smart status override for UI
              let statusLabel = STATUS_LABELS[exam.examStatus];
              if (exam.examStatus === "DRAFT" && exam.startDate && new Date(exam.startDate) > new Date()) {
                statusLabel = "Scheduled";
              }

              // Dynamic circular icons
              const IconComponent = exam.type === "TERM_EXAM" ? GraduationCap : exam.type === "CLASS_TEST" ? BookOpen : ClipboardCheck;
              const iconCircleColor = exam.type === "TERM_EXAM"
                ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                : exam.type === "CLASS_TEST"
                  ? "bg-blue-50 text-blue-600 border border-blue-100"
                  : "bg-indigo-50 text-indigo-600 border border-indigo-100";

              return (
                <div key={exam.id} className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md/50 transition-shadow">
                  
                  {/* Card Header Section */}
                  <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-4 min-w-0">
                      {/* styled circle icon */}
                      <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-inner", iconCircleColor)}>
                        <IconComponent className="w-5.5 h-5.5" />
                      </div>
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-gray-900 text-base leading-tight truncate">{exam.name}</h3>
                          <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0", STATUS_COLORS[exam.examStatus])}>
                            {statusLabel}
                          </span>
                          <span className={cn("text-[10px] font-bold px-2.5 py-0.5 rounded-full", isClassLevel ? "bg-blue-50 text-blue-700 border border-blue-100" : "bg-emerald-50 text-emerald-700 border border-emerald-100")}>
                            {isClassLevel ? "Class Level" : "Madrasa Level"}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 mt-1">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-gray-400" />
                            Exam: {fmt(exam.startDate)} – {fmt(exam.endDate)}
                          </span>
                          <span className="flex items-center gap-1">
                            <PenLine className="w-3.5 h-3.5 text-gray-400" />
                            Mark Entry: {exam.endDate ? fmt(new Date(new Date(exam.endDate).getTime() + 86400000).toISOString()) : "—"} – {fmt(exam.markEntryLastDate)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Award className="w-3.5 h-3.5 text-gray-400" />
                            Publish: {fmt(exam.publishedDate)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Quick actions & Dots Menu */}
                    <div className="flex items-center justify-end gap-2 shrink-0 border-t md:border-none pt-3 md:pt-0 border-gray-50">
                      {exam.examStatus === "PUBLISHED" ? (
                        <button
                          onClick={() => goToClassReport(exam.id, exam.classId || classes[0]?.id || "")}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm shadow-indigo-100 transition-colors inline-flex items-center gap-1.5"
                        >
                          <BarChart2 className="w-3.5 h-3.5" /> Results
                        </button>
                      ) : (
                        <button
                          onClick={() => openEditDrawer(exam)}
                          className="px-4 py-2 border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold text-xs rounded-xl transition-colors inline-flex items-center gap-1.5"
                        >
                          <Edit2 className="w-3.5 h-3.5" /> Edit
                        </button>
                      )}
                      
                      <button
                        onClick={() => toggleExpand(exam.id)}
                        className="px-3 py-2 border border-gray-200 hover:bg-gray-50 text-gray-600 font-bold text-xs rounded-xl transition-colors inline-flex items-center gap-1"
                      >
                        View {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>

                      {/* Dropdown Menu Toggle */}
                      <div className="relative">
                        <button
                          onClick={() => setActiveDotsMenuId(activeDotsMenuId === exam.id ? null : exam.id)}
                          className="p-2 border border-gray-200 hover:bg-gray-50 text-gray-500 rounded-xl transition-colors"
                          type="button"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        {activeDotsMenuId === exam.id && (
                          <div className="absolute right-0 top-full mt-1.5 bg-white border border-gray-100 rounded-2xl shadow-xl z-30 py-1.5 min-w-[150px]">
                            <button
                              onClick={() => handleGenerateRanks(exam.id)}
                              disabled={isRanking}
                              className="w-full text-left px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 flex items-center gap-1.5 disabled:opacity-50"
                              type="button"
                            >
                              <Trophy className="w-3.5 h-3.5" /> Generate Ranks
                            </button>
                            <button
                              onClick={() => startDeleteExam(exam)}
                              className="w-full text-left px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-1.5"
                              type="button"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Delete Exam
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded details list */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-gray-50 bg-gray-50/20"
                      >
                        <div className="p-5 space-y-4">
                          
                          {/* Inner filter options */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <select
                              value={filterClassId}
                              onChange={async (e) => { setFilterClassId(e.target.value); await loadResults(exam.id, e.target.value || undefined); }}
                              className="px-3 py-1.5 border border-gray-200 rounded-xl text-xs bg-white focus:outline-none"
                            >
                              <option value="">All classes</option>
                              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                            <button
                              onClick={() => loadResults(exam.id, filterClassId || undefined)}
                              className="p-1.5 rounded-xl border border-gray-200 text-gray-400 hover:text-gray-700 transition-colors bg-white"
                              title="Refresh"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                            </button>
                            {filterClassId && (
                              <button
                                onClick={() => goToClassReport(exam.id, filterClassId)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
                              >
                                <BarChart2 className="w-3.5 h-3.5" /> View Report
                              </button>
                            )}
                            <button
                              onClick={() => {
                                if (isMarkEntryOpen) setMarkEntryOpen(null);
                                else openMarkEntry(exam.id);
                              }}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
                            >
                              <PenLine className="w-3.5 h-3.5" />
                              {isMarkEntryOpen ? "Close Entry" : "Enter Marks"}
                            </button>
                          </div>

                          {/* ── Mark Entry Accordion Section ── */}
                          {isMarkEntryOpen && (
                            <div className="bg-white rounded-2xl border border-emerald-100 p-4 space-y-3 shadow-inner">
                              <p className="text-xs font-bold text-emerald-700 uppercase tracking-wide">Enter / Edit Marks</p>
                              {markEntry.error && (
                                <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 px-3 py-2 rounded-xl">
                                  <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {markEntry.error}
                                </div>
                              )}
                              <div className="flex gap-2 flex-wrap">
                                <select
                                  value={markEntry.classId}
                                  onChange={(e) => loadMarkEntryClass(exam.id, e.target.value)}
                                  className="flex-1 min-w-[120px] px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none"
                                >
                                  <option value="">Select class</option>
                                  {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                                <select
                                  value={markEntry.subjectId}
                                  onChange={(e) => loadMarkEntrySubject(exam.id, e.target.value)}
                                  disabled={!markEntry.classId || markEntry.subjects.length === 0}
                                  className="flex-1 min-w-[120px] px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none disabled:opacity-50"
                                >
                                  <option value="">Select subject</option>
                                  {markEntry.subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                              </div>

                              {markEntry.loading ? (
                                <div className="flex items-center justify-center py-6 text-gray-400">
                                  <Loader2 className="w-5 h-5 animate-spin" />
                                </div>
                              ) : markEntry.students.length === 0 ? (
                                <p className="text-xs text-gray-400 text-center py-4">Select a class to see students</p>
                              ) : !markEntry.subjectId ? (
                                <p className="text-xs text-gray-400 text-center py-4">Select a subject to enter marks</p>
                              ) : (
                                <>
                                  <div className="rounded-2xl border border-gray-100 overflow-hidden bg-gray-50/10">
                                    <div className="px-4 py-2 bg-gray-50 flex justify-between text-[10px] font-bold text-gray-400 uppercase">
                                      <span>Student</span>
                                      <span>Score / 100</span>
                                    </div>
                                    <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
                                      {markEntry.students.map((s) => {
                                        const score = markEntry.scores[s.id] ?? "";
                                        const chip  = score !== "" ? gradeChip(Number(score)) : null;
                                        return (
                                          <div key={s.id} className="flex items-center justify-between px-4 py-2.5 bg-white">
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
                                                className="w-16 text-center px-2 py-1.5 border border-gray-200 rounded-xl text-sm font-bold focus:outline-none focus:border-emerald-400"
                                              />
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => handleMarkEntrySave(exam.id)}
                                    disabled={markEntry.saving}
                                    className={cn(
                                      "w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all",
                                      markEntry.saved ? "bg-emerald-100 text-emerald-700" : "bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm"
                                    )}
                                  >
                                    {markEntry.saving ? <Loader2 className="w-4 h-4 animate-spin" /> : markEntry.saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                                    {markEntry.saving ? "Saving..." : markEntry.saved ? "Saved" : "Save Marks"}
                                  </button>
                                </>
                              )}
                            </div>
                          )}

                          {isStale && (
                            <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-100 rounded-xl text-xs text-amber-700">
                              <AlertTriangle className="w-4 h-4 shrink-0" />
                              Scores updated. Click Generate Ranks to refresh.
                            </div>
                          )}

                          {resultError && (
                            <div className="flex items-center gap-2 px-3 py-2 bg-rose-50 border border-rose-100 rounded-xl text-xs text-rose-600">
                              <AlertCircle className="w-4 h-4 shrink-0" /> Failed: {resultError}
                            </div>
                          )}

                          {/* Student summary metrics */}
                          {students.length > 0 && (
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                              {[
                                { label: "Students", value: students.length },
                                { label: "Subjects",  value: new Set(results.map((r) => r.subject?.id)).size },
                                { label: "Pass Rate", value: students.length ? `${Math.round(students.filter((s) => calcGrade(s.totalScore, s.maxScore) !== "F").length / students.length * 100)}%` : "—" },
                                { label: "Average", value: students.length ? `${Math.round(students.reduce((s, st) => s + st.pct, 0) / students.length)}%` : "—" },
                              ].map((s) => (
                                <div key={s.label} className="bg-white rounded-2xl p-3 text-center border border-gray-100 shadow-sm">
                                  <p className="text-lg font-bold text-gray-900 leading-tight">{s.value}</p>
                                  <p className="text-[10px] text-gray-400 mt-1 uppercase font-bold tracking-wider">{s.label}</p>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Individual student results list */}
                          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                            {students.map((st, idx) => {
                              const overall = gradeChip(st.totalScore, st.maxScore);
                              return (
                                <div key={st.studentId} className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                                  <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50/80 border-b border-gray-100">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <span className="text-xs font-black text-amber-500 w-6">#{st.rank ?? "—"}</span>
                                      <div className="truncate leading-tight">
                                        <p className="text-sm font-bold text-gray-900 truncate">{st.name}</p>
                                        <p className="text-[10px] text-gray-400 font-mono mt-0.5">{st.adno} · {st.className}</p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-3 shrink-0">
                                      <div className="text-right">
                                        <p className="text-sm font-bold text-gray-900">{st.totalScore}<span className="text-[10px] text-gray-400 font-normal">/{st.maxScore}</span></p>
                                        <p className="text-[10px] text-gray-400 font-medium">{st.pct}%</p>
                                      </div>
                                      <span className={cn("text-xs font-black px-2 py-0.5 rounded border text-center shrink-0 w-10", overall.cls)}>
                                        {overall.label}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Subject breakdown rows */}
                                  <div className="divide-y divide-gray-50">
                                    {st.subjects.map((r) => {
                                      const isEditingCell = editCell?.resultId === r.id;
                                      const isSavingCell  = savingCell === r.id;
                                      const isDeletingR   = deletingResultId === r.id;
                                      const chip = gradeChip(r.score, r.totalMarks);

                                      return (
                                        <div key={r.id} className="flex items-center justify-between px-4 py-2.5">
                                          <p className="text-xs text-gray-600 truncate mr-2">{r.subject?.name ?? "Subject"}</p>
                                          <div className="flex items-center gap-2">
                                            <span className={cn("text-[10px] font-bold px-1.5 py-0.2 rounded border text-center shrink-0 w-8", chip.cls)}>
                                              {chip.label}
                                            </span>
                                            {isEditingCell ? (
                                              <input
                                                autoFocus
                                                type="number"
                                                min={0}
                                                max={r.totalMarks}
                                                value={editCell!.score}
                                                onChange={(e) => setEditCell({ ...editCell!, score: e.target.value })}
                                                onBlur={commitEdit}
                                                onKeyDown={(e) => { if (e.key === "Enter") commitEdit(); if (e.key === "Escape") setEditCell(null); }}
                                                className="w-16 text-center border-2 border-emerald-400 rounded-lg text-xs font-bold focus:outline-none"
                                              />
                                            ) : (
                                              <button
                                                onClick={() => setEditCell({ resultId: r.id, examId: exam.id, score: String(r.score) })}
                                                className="text-xs font-bold text-gray-700 hover:text-emerald-600 hover:bg-emerald-50 px-2 py-1 rounded transition-colors"
                                              >
                                                {isSavingCell ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : `${r.score}/${r.totalMarks}`}
                                              </button>
                                            )}
                                            <button
                                              onClick={() => {
                                                setDeleteResultTarget({ id: r.id, name: st.name, subject: r.subject?.name ?? "Subject", score: r.score, examId: exam.id });
                                                setShowDeleteResultConfirm(true);
                                              }}
                                              disabled={isDeletingR}
                                              className="p-1 text-gray-300 hover:text-rose-600 rounded"
                                            >
                                              <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
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
      </div>

      {/* ── Sliding Side Drawer Form ── */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            {/* Drawer Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.3 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawerOpen(false)}
              className="fixed inset-0 bg-black z-40 backdrop-blur-xs pointer-events-auto"
            />
            {/* Drawer Panel */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "tween", duration: 0.3 }}
              className="fixed top-0 right-0 h-full w-full max-w-md bg-white border-l border-gray-100 shadow-2xl z-50 overflow-y-auto pointer-events-auto flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-5 border-b border-gray-100">
                <div>
                  <h2 className="text-lg font-black text-gray-900 tracking-tight">{drawerMode === "create" ? "Create New Exam" : "Edit Exam"}</h2>
                  <p className="text-xs text-gray-400 mt-1">Define dates and config for marking & results</p>
                </div>
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="p-1.5 hover:bg-gray-100 rounded-xl transition-colors text-gray-400"
                >
                  <X className="w-5.5 h-5.5" />
                </button>
              </div>

              {/* Form Content */}
              <form onSubmit={handleFormSubmit} className="p-5 flex-1 space-y-5">
                
                {/* Basic info */}
                <div className="space-y-4">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                    <GraduationCap className="w-4 h-4 text-emerald-600" /> Basic Information
                  </p>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">Exam Name *</label>
                    <input
                      type="text"
                      required
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      placeholder="e.g. First Term Exam 2026"
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/20 focus:border-emerald-500 transition-all bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">Exam Type *</label>
                    <select
                      value={form.type}
                      onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as ExamType, classId: "", subjectId: "" }))}
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/20 focus:border-emerald-500 transition-all bg-white"
                    >
                      <option value="TERM_EXAM">Madrasa Level (School Wide)</option>
                      <option value="CLASS_TEST">Class Level (Class Test)</option>
                      <option value="UNIT_TEST">Class Level (Unit Test)</option>
                    </select>
                  </div>

                  {/* Class Level selective options */}
                  {form.type !== "TERM_EXAM" && (
                    <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 rounded-2xl border border-gray-100">
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1.5">Select Class *</label>
                        <select
                          required
                          value={form.classId}
                          onChange={(e) => setForm((f) => ({ ...f, classId: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs bg-white focus:outline-none"
                        >
                          <option value="">Choose Class</option>
                          {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1.5">Select Subject *</label>
                        <select
                          required
                          value={form.subjectId}
                          onChange={(e) => setForm((f) => ({ ...f, subjectId: e.target.value }))}
                          disabled={!form.classId || formSubjects.length === 0}
                          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs bg-white focus:outline-none disabled:opacity-50"
                        >
                          <option value="">Choose Subject</option>
                          {formSubjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">Academic Year *</label>
                    <select
                      disabled
                      value={ayId}
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 text-gray-400 focus:outline-none cursor-not-allowed"
                    >
                      <option value={ayId}>Active Academic Year</option>
                    </select>
                  </div>
                </div>

                {/* Exam Period */}
                <div className="space-y-4">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5 border-t pt-4">
                    <Calendar className="w-4 h-4 text-emerald-600" /> Exam Period
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1.5">Exam Start Date *</label>
                      <input
                        type="date"
                        required
                        value={form.startDate}
                        onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/20 focus:border-emerald-500 transition-all bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1.5">Exam End Date *</label>
                      <input
                        type="date"
                        required
                        value={form.endDate}
                        onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/20 focus:border-emerald-500 transition-all bg-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Mark entry period */}
                <div className="space-y-4">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5 border-t pt-4">
                    <PenLine className="w-4 h-4 text-emerald-600" /> Mark Entry Period
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1.5">Mark Entry Opens On *</label>
                      <input
                        type="date"
                        required
                        value={form.endDate ? new Date(new Date(form.endDate).getTime() + 86400000).toISOString().split("T")[0] : ""}
                        disabled
                        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 text-gray-400 cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1.5">Mark Entry Closes On *</label>
                      <input
                        type="date"
                        required
                        value={form.markEntryLastDate}
                        onChange={(e) => setForm((f) => ({ ...f, markEntryLastDate: e.target.value }))}
                        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/20 focus:border-emerald-500 transition-all bg-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Result Publication */}
                <div className="space-y-4">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5 border-t pt-4">
                    <Award className="w-4 h-4 text-emerald-600" /> Result Publication
                  </p>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">Result Publish Date *</label>
                    <input
                      type="date"
                      required
                      value={form.publishedDate}
                      onChange={(e) => setForm((f) => ({ ...f, publishedDate: e.target.value }))}
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/20 focus:border-emerald-500 transition-all bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">Initial Status</label>
                    <select
                      value={form.examStatus}
                      onChange={(e) => setForm((f) => ({ ...f, examStatus: e.target.value as ExamStatus }))}
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/20 focus:border-emerald-500 transition-all bg-white"
                    >
                      <option value="DRAFT">Draft</option>
                      <option value="MARK_ENTRY">Mark Entry Open</option>
                      <option value="PUBLISHED">Published</option>
                      <option value="CANCELLED">Cancelled</option>
                    </select>
                  </div>
                </div>

                {/* Submit Actions */}
                <div className="flex gap-3 mt-6 pt-5 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setDrawerOpen(false)}
                    className="flex-1 py-3 border border-gray-200 hover:bg-gray-50 text-gray-600 rounded-xl text-sm font-bold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold disabled:opacity-60 flex items-center justify-center gap-2 transition-colors shadow-sm shadow-emerald-100"
                  >
                    {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    {drawerMode === "create" ? "Create Exam" : "Save Changes"}
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Delete Exam Confirm Dialog */}
      <AnimatePresence>
        {showDeleteExamConfirm && deleteExamTarget && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => !deletingId && setShowDeleteExamConfirm(false)}
              className="fixed inset-0 bg-black z-50 backdrop-blur-xs pointer-events-auto"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-[60] bg-white rounded-3xl p-6 max-w-sm mx-auto shadow-2xl pointer-events-auto"
            >
              <div className="text-center space-y-3">
                <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
                  <Trash2 className="w-6 h-6 animate-bounce" />
                </div>
                <h3 className="font-bold text-gray-900 text-base">Delete Exam?</h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Are you sure you want to delete exam <strong>{deleteExamTarget.name}</strong>? This action cannot be undone.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-6">
                <button
                  onClick={() => setShowDeleteExamConfirm(false)}
                  disabled={deletingId !== null}
                  className="py-2.5 rounded-xl border border-gray-200 text-gray-600 font-bold text-xs hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteExam}
                  disabled={deletingId !== null}
                  className="py-2.5 rounded-xl bg-rose-600 text-white font-bold text-xs hover:bg-rose-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-1"
                >
                  {deletingId !== null && <Loader2 className="w-3 h-3 animate-spin" />}
                  {deletingId !== null ? "Deleting…" : "Delete"}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Delete Result Confirm Dialog */}
      <AnimatePresence>
        {showDeleteResultConfirm && deleteResultTarget && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => !deletingResultId && setShowDeleteResultConfirm(false)}
              className="fixed inset-0 bg-black z-50 backdrop-blur-xs pointer-events-auto"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-[60] bg-white rounded-3xl p-6 max-w-sm mx-auto shadow-2xl pointer-events-auto"
            >
              <div className="text-center space-y-3">
                <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
                  <Trash2 className="w-6 h-6 animate-bounce" />
                </div>
                <h3 className="font-bold text-gray-900 text-base">Delete Result?</h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Are you sure you want to delete result of <strong>{deleteResultTarget.name}</strong> for subject <strong>{deleteResultTarget.subject}</strong> (Score: {deleteResultTarget.score})?
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-6">
                <button
                  onClick={() => setShowDeleteResultConfirm(false)}
                  disabled={deletingResultId !== null}
                  className="py-2.5 rounded-xl border border-gray-200 text-gray-600 font-bold text-xs hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteResult}
                  disabled={deletingResultId !== null}
                  className="py-2.5 rounded-xl bg-rose-600 text-white font-bold text-xs hover:bg-rose-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-1"
                >
                  {deletingResultId !== null && <Loader2 className="w-3 h-3 animate-spin" />}
                  {deletingResultId !== null ? "Deleting…" : "Delete"}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}
