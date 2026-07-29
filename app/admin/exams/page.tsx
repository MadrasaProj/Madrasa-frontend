import { useState, useEffect, useCallback, useMemo } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { ApiErrorBanner } from "@/components/ui/ApiErrorBanner";
import { DataTable, type Column, type SortDir } from "@/components/ui/DataTable";
import {
  getExams,
  createExam,
  updateExam,
  deleteExam,
  type ExamRecord,
  type ExamStatus,
} from "@/lib/exams-api";
import { getResults, bulkUpsertResults } from "@/lib/results-api";
import { type ClassRecord } from "@/lib/classes-api";
import { useClasses } from "@/lib/queries";
import { getSubjects, type SubjectRecord } from "@/lib/subjects-api";
import { getStudents } from "@/lib/students-api";
import { useAuthStore } from "@/store/auth";
import { cn } from "@/lib/utils";
import {
  Plus,
  Loader2,
  Trash2,
  Search,
  X,
  Calendar,
  Edit2,
  AlertCircle,
  PenLine,
  Save,
  CheckCircle2,
  BarChart2,
  GraduationCap,
  Award,
  Clock,
  ClipboardCheck,
  Trophy,
  RefreshCw,
  FileSpreadsheet,
  FileText,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ExamStatusBadge,
  getExamStatusInfo,
} from "@/components/exam/ExamStatusBadge";
import { MarkEntryGrid } from "@/components/exam/MarkEntryGrid";
import { ClassResultTable } from "@/components/exam/ClassResultTable";
import { RankPoster } from "@/components/exam/RankPoster";
import { MarklistPoster } from "@/components/exam/MarklistPoster";
import { ResultAnnouncementPoster } from "@/components/exam/ResultAnnouncementPoster";
import { ExcelImportModal } from "@/components/exam/ExcelImportModal";
import { useExamColumns } from "@/components/exam/ExamColumns";
import { ExamMobileCard } from "@/components/exam/ExamMobileCard";
import { ExamStatsCards } from "@/components/exam/ExamStatsCards";
import { fmt, shortDate, getExamCategories, PAGE_SIZE_OPTIONS } from "@/lib/exam-utils";
import {
  getClassReport, computeSummary, setFinalStatus,
  type ClassReport, type ClassReportRow, type ResultStatus, type TotalGrade,
  TOTAL_GRADE_LABELS,
} from "@/lib/results-api";

interface ExamForm {
  name: string;
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
  startDate: "",
  endDate: "",
  markEntryLastDate: "",
  publishedDate: "",
  examStatus: "DRAFT",
  maxMarks: 100,
  passMarks: 36,
};

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

type ReportTab = "table" | "marklist" | "status" | "posters";

const TOTAL_GRADE_OPTIONS: { value: TotalGrade; label: string }[] = [
  { value: "DISTINCTION", label: "Distinction" },
  { value: "FIRST_CLASS", label: "First Class" },
  { value: "SECOND_CLASS", label: "Second Class" },
  { value: "THIRD_CLASS", label: "Third Class" },
  { value: "TOP_PLUS", label: "Top Plus" },
  { value: "FAILED", label: "Failed" },
];

const DEFAULT_PAGE_SIZE = 10;

export default function AdminExamsPage() {
  const { user, accessToken, activeClientId } = useAuthStore();
  const cid = activeClientId ?? "";
  const token = accessToken ?? "";
  const ayId = user?.defaultAcademicYearId ?? "";

  const [exams, setExams] = useState<ExamRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  const [searchText, setSearchText] = useState("");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [sortBy, setSortBy] = useState<string | undefined>("startDate");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const [classDrawerExamId, setClassDrawerExamId] = useState<string | null>(
    null,
  );
  const [selectedClassTab, setSelectedClassTab] = useState<string | null>(null);

  const [markEntryOpen, setMarkEntryOpen] = useState<string | null>(null);
  const [markEntry, setMarkEntry] = useState<MarkEntryState>({
    classId: "",
    subjectId: "",
    students: [],
    subjects: [],
    scores: {},
    loading: false,
    saving: false,
    saved: false,
    error: null,
  });

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<"create" | "edit">("create");
  const [form, setForm] = useState<ExamForm>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [editTargetId, setEditTargetId] = useState<string | null>(null);

  const [contentTab, setContentTab] = useState<"markentry" | "report">("markentry");
  const [reportData, setReportData] = useState<ClassReport | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [computing, setComputing] = useState(false);
  const [computeMsg, setComputeMsg] = useState<string | null>(null);

  // Report sub-tabs (inside the drawer)
  const [reportTab, setReportTab] = useState<ReportTab>("table");
  const [marklistStudId, setMarklistStudId] = useState<string | null>(null);
  const [statusMap, setStatusMap] = useState<Record<string, { finalStatus: ResultStatus; totalGrade?: TotalGrade | null }>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [savingAll, setSavingAll] = useState(false);
  const [posterStudentId, setPosterStudentId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const [showDeleteExamConfirm, setShowDeleteExamConfirm] = useState(false);
  const [deleteExamTarget, setDeleteExamTarget] =
    useState<ExamRecord | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Load classes using cached query hook
  const { data: classesData } = useClasses({ clientId: cid, token });
  const classes = classesData ?? [];

  // ── Load ───────────────────────────────────────────────────────────────────

  const loadData = useCallback(async (signal?: AbortSignal) => {
    if (!cid || !token) return;
    setPageError(null);
    setLoading(true);
    try {
      const examData = await getExams(cid, token, { limit: 200, signal });
      const termExams = (examData.data ?? []).filter(
        (e) => e.type === "TERM_EXAM" || !e.type,
      );
      setExams(termExams);
    } catch (e: any) {
      if (e.name === "AbortError") return;
      setPageError(e.message ?? "Load failed");
    } finally {
      setLoading(false);
    }
  }, [cid, token]);

  useEffect(() => {
    const ac = new AbortController();
    loadData(ac.signal);
    return () => ac.abort();
  }, [loadData]);

  // ── Form Actions ────────────────────────────────────────────────────────────

  const openCreateDrawer = () => {
    setForm(EMPTY_FORM);
    setDrawerMode("create");
    setEditTargetId(null);
    setDrawerOpen(true);
  };

  const openEditDrawer = (exam: ExamRecord) => {
    setForm({
      name: exam.name,
      startDate: exam.startDate
        ? new Date(exam.startDate).toISOString().split("T")[0]
        : "",
      endDate: exam.endDate
        ? new Date(exam.endDate).toISOString().split("T")[0]
        : "",
      markEntryLastDate: exam.markEntryLastDate
        ? new Date(exam.markEntryLastDate).toISOString().split("T")[0]
        : "",
      publishedDate: exam.publishedDate
        ? new Date(exam.publishedDate).toISOString().split("T")[0]
        : "",
      examStatus: exam.examStatus,
      maxMarks: exam.maxMarks ?? 100,
      passMarks: exam.passMarks ?? 36,
    });
    setDrawerMode("edit");
    setEditTargetId(exam.id);
    setDrawerOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !cid || !token) return;
    setSubmitting(true);
    setPageError(null);

    const payload = {
      name: form.name,
      type: "TERM_EXAM" as const,
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
        if (!editTargetId) return;
        const res = await updateExam(cid, token, editTargetId, payload);
        setExams((prev) =>
          prev.map((ex) => (ex.id === editTargetId ? { ...ex, ...res } : ex)),
        );
      }
      setDrawerOpen(false);
      setForm(EMPTY_FORM);
      setEditTargetId(null);
    } catch (e: any) {
      setPageError(e.message ?? "Action failed");
    } finally {
      setSubmitting(false);
    }
  };

  const startDeleteExam = (exam: ExamRecord) => {
    setDeleteExamTarget(exam);
    setShowDeleteExamConfirm(true);
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

  // ── Class drawer ──────────────────────────────────────────────────────────

  const openClassDrawer = (examId: string) => {
    const firstId = classes[0]?.id ?? null;
    setClassDrawerExamId(examId);
    setMarkEntryOpen(firstId);
    setSelectedClassTab(firstId);
    setMarkEntry({
      classId: "",
      subjectId: "",
      students: [],
      subjects: [],
      scores: {},
      loading: false,
      saving: false,
      saved: false,
      error: null,
    });
    if (firstId) {
      loadMarkEntryClass(examId, firstId);
    }
  };

  const closeClassDrawer = () => {
    setClassDrawerExamId(null);
    setMarkEntryOpen(null);
    setSelectedClassTab(null);
    setContentTab("markentry");
    setReportData(null);
    setReportError(null);
    setComputeMsg(null);
    setReportTab("table");
    setMarklistStudId(null);
    setStatusMap({});
    setStatusMsg(null);
    setPosterStudentId(null);
    setImportOpen(false);
  };

  const selectClassTab = (classId: string) => {
    setSelectedClassTab(classId);
    setContentTab("markentry");
    setReportData(null);
    setReportError(null);
    setComputeMsg(null);
    setReportTab("table");
    setMarklistStudId(null);
    setStatusMap({});
    setStatusMsg(null);
    setPosterStudentId(null);
    setImportOpen(false);
    setMarkEntry((p) => ({
      ...p,
      classId: "",
      subjectId: "",
      scores: {},
      error: null,
      saved: false,
    }));
    if (classDrawerExamId) {
      setMarkEntryOpen(classId);
      loadMarkEntryClass(classDrawerExamId, classId);
    }
  };

  const classDrawerExam = useMemo(
    () => exams.find((e) => e.id === classDrawerExamId) ?? null,
    [exams, classDrawerExamId],
  );

  const selectedClass = useMemo(
    () => classes.find((c) => c.id === selectedClassTab) ?? null,
    [classes, selectedClassTab],
  );

  // ── Mark entry (admin) ─────────────────────────────────────────────────────

  const openMarkEntry = async (examId: string, classId: string) => {
    setMarkEntryOpen(classId);
    await loadMarkEntryClass(examId, classId);
  };

  const loadMarkEntryClass = async (examId: string, classId: string) => {
    setMarkEntry((p) => ({
      ...p,
      classId,
      subjectId: "",
      students: [],
      subjects: [],
      scores: {},
      loading: true,
      error: null,
    }));
    try {
      const [subData, stuData] = await Promise.all([
        getSubjects(cid, token, { classId, limit: 200 }),
        getStudents(cid, token, { classId, limit: 500 }),
      ]);
      const subs = subData.data ?? [];
      const stus = stuData.data ?? [];
      setMarkEntry((p) => ({
        ...p,
        classId,
        students: stus,
        subjects: subs,
        subjectId: subs[0]?.id ?? "",
        scores: {},
        loading: false,
      }));
    } catch (e: any) {
      setMarkEntry((p) => ({ ...p, loading: false, error: e.message }));
    }
  };

  const loadMarkEntrySubject = async (examId: string, subjectId: string) => {
    setMarkEntry((p) => ({
      ...p,
      subjectId,
      scores: {},
      loading: true,
      error: null,
    }));
    try {
      const data = await getResults(cid, token, {
        examId,
        classId: markEntry.classId,
        limit: 500,
      });
      const rows = data.data ?? [];
      const scoreMap: Record<string, string> = {};
      markEntry.students.forEach((s) => {
        const r = rows.find(
          (r) => r.student?.id === s.id && r.subject?.id === subjectId,
        );
        scoreMap[s.id] = r != null ? String(r.score) : "";
      });
      setMarkEntry((p) => ({ ...p, scores: scoreMap, loading: false }));
    } catch (e: any) {
      setMarkEntry((p) => ({ ...p, loading: false, error: e.message }));
    }
  };

  useEffect(() => {
    if(classDrawerExamId && markEntry.subjectId){
      
      loadMarkEntrySubject(classDrawerExamId, markEntry.subjectId);
    }
  },[classDrawerExamId, markEntry.subjectId])

  const handleMarkEntrySave = async (examId: string) => {
    if (!markEntry.classId || !markEntry.subjectId) return;
    setMarkEntry((p) => ({ ...p, saving: true, error: null, saved: false }));
    try {
      const currentSubject = markEntry.subjects.find((s) => s.id === markEntry.subjectId);
      const subjectMaxMarks = currentSubject?.classSubject?.maxMarks ?? classDrawerExam?.maxMarks ?? 50;
      const items = markEntry.students
        .filter(
          (s) =>
            markEntry.scores[s.id] !== "" &&
            markEntry.scores[s.id] !== undefined,
        )
        .map((s) => ({
          subjectId: markEntry.subjectId,
          studentId: s.id,
          score: Number(markEntry.scores[s.id]),
          totalMarks: subjectMaxMarks,
        }));

      if (!items.length) {
        setMarkEntry((p) => ({
          ...p,
          saving: false,
          error: "No scores entered",
        }));
        return;
      }

      await bulkUpsertResults(cid, token, {
        examId,
        classId: markEntry.classId,
        accademicYearId: ayId,
        results: items,
      });

      setMarkEntry((p) => ({ ...p, saving: false, saved: true }));
      setTimeout(() => setMarkEntry((p) => ({ ...p, saved: false })), 2000);
    } catch (e: any) {
      setMarkEntry((p) => ({ ...p, saving: false, error: e.message }));
    }
  };

  // ── Class Report Load ──────────────────────────────────────────────────────

  const loadClassReport = useCallback(async () => {
    if (!cid || !token || !classDrawerExamId || !selectedClassTab) return;
    setReportLoading(true);
    setReportError(null);
    try {
      const rep = await getClassReport(cid, token, {
        examId: classDrawerExamId,
        classId: selectedClassTab,
      });
      setReportData(rep);
    } catch (e: any) {
      setReportError(e.message ?? "Failed to load report");
    } finally {
      setReportLoading(false);
    }
  }, [cid, token, classDrawerExamId, selectedClassTab]);

  const handleCompute = async () => {
    if (!classDrawerExamId || !selectedClassTab || computing) return;
    setComputing(true);
    setComputeMsg(null);
    try {
      const res = await computeSummary(cid, token, {
        examId: classDrawerExamId,
        classId: selectedClassTab,
        accademicYearId: ayId || undefined,
      });
      setComputeMsg(`Computed ${res.computed} results · ${res.ranked} students ranked`);
      await loadClassReport();
    } catch (e: any) {
      setComputeMsg(`Error: ${e.message}`);
    } finally {
      setComputing(false);
    }
  };

  useEffect(() => {
    if (contentTab === "report" && classDrawerExamId && selectedClassTab) {
      loadClassReport();
    }
  }, [contentTab, classDrawerExamId, selectedClassTab, loadClassReport]);

  useEffect(() => {
    if (reportData) {
      const map: Record<string, { finalStatus: ResultStatus; totalGrade?: TotalGrade | null }> = {};
      for (const r of reportData.students) {
        if (r.summary.finalStatus) {
          map[r.student.id] = {
            finalStatus: r.summary.finalStatus,
            totalGrade: r.summary.totalGrade ?? null,
          };
        }
      }
      setStatusMap(map);
    }
  }, [reportData]);

  const handleSaveAll = async () => {
    if (!reportData || savingAll || !classDrawerExamId) return;
    setSavingAll(true);
    setStatusMsg(null);
    let saved = 0;
    try {
      for (const row of reportData.students) {
        const entry = statusMap[row.student.id];
        if (!entry?.finalStatus) continue;
        await setFinalStatus(cid, token, row.student.id, classDrawerExamId, {
          finalStatus: entry.finalStatus,
          totalGrade: entry.totalGrade ?? null,
        });
        saved++;
      }
      setStatusMsg(`Saved status for ${saved} student${saved !== 1 ? "s" : ""}`);
      await loadClassReport();
    } catch (e: any) {
      setStatusMsg(`Error: ${e.message}`);
    } finally {
      setSavingAll(false);
    }
  };

  const handleSaveStatus = async (row: ClassReportRow) => {
    const entry = statusMap[row.student.id];
    if (!entry?.finalStatus || !classDrawerExamId) return;
    setSavingId(row.student.id);
    setStatusMsg(null);
    try {
      await setFinalStatus(cid, token, row.student.id, classDrawerExamId, {
        finalStatus: entry.finalStatus,
        totalGrade: entry.totalGrade ?? null,
      });
      setStatusMsg(`Status saved for ${row.student.name}`);
      await loadClassReport();
    } catch (e: any) {
      setStatusMsg(`Error: ${e.message}`);
    } finally {
      setSavingId(null);
    }
  };

  // ── Filtering / sort / pagination ──────────────────────────────────────────

  const filteredExams = useMemo(() => {
    const q = searchText.toLowerCase();
    return exams.filter((exam) => {
      if (q && !exam.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [exams, searchText]);

  const sortedExams = useMemo(() => {
    if (!sortBy) return filteredExams;
    const arr = [...filteredExams];
    arr.sort((a, b) => {
      const av = (a as any)[sortBy];
      const bv = (b as any)[sortBy];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return arr;
  }, [filteredExams, sortBy, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sortedExams.length / pageSize));
  const pagedExams = useMemo(
    () => sortedExams.slice((page - 1) * pageSize, page * pageSize),
    [sortedExams, page, pageSize],
  );

  useEffect(() => {
    setPage(1);
  }, [searchText, pageSize]);

  const { upcoming: upcomingExams, markEntryOpen: markEntryOpenExams, completed: completedExams, published: publishedExams } = getExamCategories(exams);

  const columns = useExamColumns({
    showActions: true,
    onEdit: openEditDrawer,
    onClasses: (exam) => openClassDrawer(exam.id),
    onDelete: startDeleteExam,
  });

  return (
    <DashboardLayout>
      <div className="py-3 lg:px-8 lg:py-6 space-y-6">
        <PageHeader
          title="Exams"
          subtitle="Manage term examinations"
          icon={GraduationCap}
          action={
            <button
              onClick={openCreateDrawer}
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm px-4 py-2.5 rounded-xl transition-all shadow-sm hover:scale-[1.01]"
            >
              <Plus className="w-4 h-4" /> Create Exam
            </button>
          }
        />

        <ExamStatsCards
          stats={[
            {
              label: "Upcoming Exams",
              value: upcomingExams.length,
              color: "bg-emerald-50 text-emerald-600 border border-emerald-100",
              icon: Clock,
            },
            {
              label: "Mark Entry Open",
              value: markEntryOpenExams.length,
              color: "bg-amber-50 text-amber-600 border border-amber-100",
              icon: PenLine,
            },
            {
              label: "Completed",
              value: completedExams.length,
              color: "bg-purple-50 text-purple-700 border border-purple-100",
              icon: ClipboardCheck,
            },
            {
              label: "Results Published",
              value: publishedExams.length,
              color: "bg-teal-50 text-teal-600 border border-teal-100",
              icon: Trophy,
            },
          ]}
        />

        {pageError && (
          <ApiErrorBanner
            message={pageError}
            onRetry={() => {
              setPageError(null);
              loadData();
            }}
          />
        )}

        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search exam by name..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/20 focus:border-emerald-500 transition-all"
          />
        </div>

        <DataTable
          columns={columns}
          data={pagedExams}
          keyExtractor={(e) => e.id}
          loading={loading}
          error={null}
          emptyIcon={GraduationCap}
          emptyMessage="No term exams found"
          onSort={(key, dir) => {
            setSortBy(key);
            setSortDir(dir);
          }}
          sortKey={sortBy}
          sortDir={sortDir}
          pagination={{
            page,
            totalPages,
            total: sortedExams.length,
            pageSize,
            pageSizeOptions: PAGE_SIZE_OPTIONS,
            onPageChange: setPage,
            onPageSizeChange: (sz) => {
              setPageSize(sz);
              setPage(1);
            },
          }}
          mobileRender={(exam) => (
            <ExamMobileCard
              exam={exam}
              onEdit={openEditDrawer}
              onClasses={(e) => openClassDrawer(e.id)}
              onDelete={startDeleteExam}
            />
          )}
        />
      </div>

      {/* ── Class Drawer (View Classes + Mark Entry) ── */}
      <AnimatePresence>
        {classDrawerExam && (
          <>
            <motion.div
              key="class-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.3 }}
              exit={{ opacity: 0 }}
              onClick={closeClassDrawer}
              className="fixed inset-0 bg-black z-40 backdrop-blur-xs pointer-events-auto"
            />
            <motion.div
                            className="fixed top-0 right-0 h-full w-full   bg-white border-l border-gray-100 shadow-2xl z-50 pointer-events-auto flex flex-col"
            >
              <div className="flex items-center justify-between p-5 border-b border-gray-100">
                <div className="min-w-0">
                  <h2 className="text-lg font-extrabold text-gray-900 tracking-tight">
                    Class Reports &amp; Entry
                  </h2>
                  <p className="text-xs text-gray-400 mt-1 truncate">
                    {classDrawerExam.name}
                  </p>
                </div>
                <button
                  onClick={closeClassDrawer}
                  className="p-1.5 hover:bg-gray-100 rounded-xl transition-colors text-gray-400 shrink-0"
                >
                  <X className="w-5.5 h-5.5" />
                </button>
              </div>

              <div className="flex flex-1 overflow-hidden">
                {/* Side tabs — desktop */}
                <div className="hidden md:flex w-[200px] flex-col gap-1 pt-5 overflow-y-auto shrink-0 border-r border-b border-gray-100">
                  {classes.map((cls) => (
                    <button
                      key={cls.id}
                      onClick={() => {
                        if (classDrawerExamId) {
                          selectClassTab(cls.id);
                        }
                      }}
                      className={cn(
                        "px-6 py-3 text-base font-semibold text-left whitespace-nowrap transition-all border-r-[3px] -mr-px",
                        selectedClassTab === cls.id
                          ? "border-emerald-600 text-emerald-700 bg-emerald-50/60"
                          : "border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300",
                      )}
                    >
                      {cls.name}
                    </button>
                  ))}
                </div>

                <div className="flex-1 flex flex-col min-w-0 min-h-0 md:pl-4">
                  {/* Top tabs — mobile */}
                  <div className="flex overflow-x-auto gap-3 px-5 border-b border-gray-100 md:hidden">
                    {classes.map((cls) => (
                      <button
                        key={cls.id}
                        onClick={() => {
                          if (classDrawerExamId) {
                            selectClassTab(cls.id);
                          }
                        }}
                        className={cn(
                          "px-5 py-3 text-base font-semibold whitespace-nowrap shrink-0 transition-all border-b-[3px] -mb-px",
                          selectedClassTab === cls.id
                            ? "border-emerald-600 text-emerald-700"
                            : "border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300",
                        )}
                      >
                        {cls.name}
                      </button>
                    ))}
                  </div>

                  {selectedClass ? (
                    <div className="flex-1 flex flex-col min-h-0">
                      <div className="px-5 pt-4 pb-2 shrink-0">
                        <h4 className="font-bold text-gray-900 text-base">
                          {selectedClass.name}
                        </h4>
                        {selectedClass.classTeacher?.name && (
                          <p className="text-xs text-gray-400 mt-0.5">
                            {selectedClass.classTeacher.name}
                          </p>
                        )}
                      </div>

                      {/* Contained tabs */}
                      <div className="px-5 shrink-0">
                        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
                          <button
                            onClick={() => setContentTab("markentry")}
                            className={cn(
                              "px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-1.5",
                              contentTab === "markentry"
                                ? "bg-white text-emerald-700 shadow-sm"
                                : "text-gray-500 hover:text-gray-700",
                            )}
                          >
                            <PenLine className="w-4 h-4" />
                            Mark Entry
                          </button>
                          <button
                            onClick={() => setContentTab("report")}
                            className={cn(
                              "px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-1.5",
                              contentTab === "report"
                                ? "bg-white text-emerald-700 shadow-sm"
                                : "text-gray-500 hover:text-gray-700",
                            )}
                          >
                            <BarChart2 className="w-4 h-4" />
                            Report
                          </button>
                        </div>
                      </div>

                      <div className="flex-1 overflow-y-auto overflow-x-hidden">
                        <div className="px-5 pt-4 pb-4">
                          {contentTab === "markentry" && (
                            <MarkEntryGrid
                              exams={classDrawerExam ? [classDrawerExam] : []}
                              classes={selectedClass ? [selectedClass] : []}
                              subjects={markEntry.subjects}
                              students={markEntry.students}
                              examId={classDrawerExam?.id ?? ""}
                              classId={markEntry.classId}
                              subjectId={markEntry.subjectId}
                              scores={markEntry.scores}
                              isLocked={false}
                              saving={markEntry.saving}
                              saved={markEntry.saved}
                              error={markEntry.error}
                              loading={markEntry.loading}
                              activeExam={classDrawerExam}
                              onExamChange={() => {}}
                              onClassChange={() => {}}
                              onSubjectChange={(val) =>
                                loadMarkEntrySubject(classDrawerExam.id, val)
                              }
                              onScoreChange={(sid, val) =>
                                setMarkEntry((p) => ({
                                  ...p,
                                  scores: { ...p.scores, [sid]: val },
                                }))
                              }
                              onSave={() => handleMarkEntrySave(classDrawerExam.id)}
                              showExamSelector={false}
                              showClassSelector={false}
                              showRemarks={false}
                              showExcelImport={false}
                              showDraftButton={false}
                              showResetButton={false}
                              showLockPeriod={false}
                            />
                          )}

                          {contentTab === "report" && (
                            <div className="space-y-4">
                              {/* Compute feedback */}
                              {computeMsg && (
                                <div className={cn(
                                  "flex items-center gap-2 px-4 py-3 rounded-xl text-sm",
                                  computeMsg.startsWith("Error")
                                    ? "bg-red-50 text-red-700 border border-red-100"
                                    : "bg-emerald-50 text-emerald-700 border border-emerald-100",
                                )}>
                                  {computeMsg.startsWith("Error")
                                    ? <AlertCircle className="w-4 h-4" />
                                    : <CheckCircle2 className="w-4 h-4" />}
                                  {computeMsg}
                                </div>
                              )}

                              {/* Actions */}
                              <div className="flex items-center gap-2 flex-wrap">
                                <button
                                  onClick={handleCompute}
                                  disabled={computing}
                                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold disabled:opacity-50 transition-all shadow-sm"
                                >
                                  {computing
                                    ? <Loader2 className="w-4 h-4 animate-spin" />
                                    : <RefreshCw className="w-4 h-4" />}
                                  Compute Grades
                                </button>
                                <button
                                  onClick={() => setImportOpen(true)}
                                  className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 bg-white hover:bg-gray-50 transition-colors shadow-xs"
                                >
                                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                                  Import Excel
                                </button>
                              </div>

                              {/* Report content */}
                              {reportLoading ? (
                                <div className="flex items-center justify-center py-12 text-gray-400">
                                  <Loader2 className="w-6 h-6 animate-spin" />
                                </div>
                              ) : reportError ? (
                                <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm bg-red-50 text-red-700 border border-red-100">
                                  <AlertCircle className="w-4 h-4" />
                                  {reportError}
                                </div>
                              ) : reportData ? (
                                <div className="space-y-4">
                                  {/* Stats cards */}
                                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                                    {[
                                      { label: "Total Students", value: reportData.stats.totalStudents, color: "text-gray-800", bg: "bg-gray-50" },
                                      { label: "Passed", value: reportData.stats.passedCount, color: "text-emerald-700", bg: "bg-emerald-50" },
                                      { label: "Failed", value: reportData.stats.failedCount, color: "text-red-700", bg: "bg-red-50" },
                                      { label: "Ranked", value: reportData.stats.rankedCount, color: "text-emerald-700", bg: "bg-emerald-50" },
                                      { label: "Class Average", value: `${reportData.stats.classAverage.toFixed(1)}%`, color: "text-teal-700", bg: "bg-teal-50" },
                                    ].map(({ label, value, color, bg }) => (
                                      <div key={label} className={cn("rounded-xl p-4 text-center", bg)}>
                                        <div className={cn("text-2xl font-bold", color)}>{value}</div>
                                        <div className="text-xs text-gray-500 mt-0.5">{label}</div>
                                      </div>
                                    ))}
                                  </div>

                                  {/* Report sub-tabs */}
                                  <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
                                    {([
                                      { key: "table" as ReportTab, label: "Result Sheet" },
                                      { key: "marklist" as ReportTab, label: "Mark Cards" },
                                      { key: "status" as ReportTab, label: "Final Status" },
                                      { key: "posters" as ReportTab, label: "Rank Posters" },
                                    ]).map(({ key, label }) => (
                                      <button key={key} onClick={() => { setReportTab(key); setMarklistStudId(null); setPosterStudentId(null); }}
                                        className={cn(
                                          "px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap",
                                          reportTab === key
                                            ? "text-emerald-600 border-emerald-600"
                                            : "text-gray-500 border-transparent hover:text-gray-700",
                                        )}>
                                        {label}
                                      </button>
                                    ))}
                                  </div>

                                  {/* Tab content */}
                                  {reportTab === "table" && (
                                    <ClassResultTable report={reportData} madrasaName={reportData.clientName ?? ""} />
                                  )}

                                  {reportTab === "marklist" && (
                                    <ReportMarklistTab
                                      report={reportData}
                                      marklistStudId={marklistStudId}
                                      setMarklistStudId={setMarklistStudId}
                                      madrasaName={reportData.clientName ?? ""}
                                      madrasaLogo={reportData.clientLogo ?? null}
                                      studentPhotoMap={{}}
                                    />
                                  )}

                                  {reportTab === "status" && (
                                    <ReportStatusTab
                                      report={reportData}
                                      statusMap={statusMap}
                                      setStatusMap={setStatusMap}
                                      savingId={savingId}
                                      savingAll={savingAll}
                                      statusMsg={statusMsg}
                                      onSave={handleSaveStatus}
                                      onSaveAll={handleSaveAll}
                                    />
                                  )}

                                  {reportTab === "posters" && (
                                    <ReportPostersTab
                                      report={reportData}
                                      posterStudentId={posterStudentId}
                                      setPosterStudentId={setPosterStudentId}
                                      madrasaName={reportData.clientName ?? ""}
                                      madrasaLogo={reportData.clientLogo ?? null}
                                      studentPhotoMap={{}}
                                    />
                                  )}
                                </div>
                              ) : (
                                <div className="flex flex-col items-center justify-center py-12 text-gray-400 gap-2">
                                  <FileText className="w-8 h-8 opacity-30" />
                                  <p className="text-sm font-semibold">
                                    No report data loaded
                                  </p>
                                  <p className="text-xs">
                                    Click "Compute Grades" to generate the report
                                  </p>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Excel Import Modal */}
                          {importOpen && reportData && (
                            <ExcelImportModal
                              clientId={cid}
                              token={token}
                              examId={classDrawerExamId ?? ""}
                              classId={selectedClassTab ?? ""}
                              accademicYearId={ayId}
                              subjects={reportData.subjects}
                              students={reportData.students.map((r) => ({ id: r.student.id, name: r.student.name, adno: r.student.adno }))}
                              onClose={() => setImportOpen(false)}
                              onSuccess={async () => {
                                setImportOpen(false);
                                await loadClassReport();
                              }}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-gray-400">
                      <div className="text-center">
                        <GraduationCap className="w-10 h-10 mx-auto mb-2 opacity-30" />
                        <p className="text-sm font-semibold">No classes found</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Sliding Side Drawer Form (Create / Edit) ── */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.3 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawerOpen(false)}
              className="fixed inset-0 bg-black z-40 backdrop-blur-xs pointer-events-auto"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "tween", duration: 0.3 }}
              className="fixed top-0 right-0 h-full w-full max-w-md bg-white border-l border-gray-100 shadow-2xl z-50 overflow-y-auto pointer-events-auto flex flex-col"
            >
              <div className="flex items-center justify-between p-5 border-b border-gray-100">
                <div>
                  <h2 className="text-lg font-extrabold text-gray-900 tracking-tight">
                    {drawerMode === "create" ? "Create New Exam" : "Edit Exam"}
                  </h2>
                  <p className="text-xs text-gray-400 mt-1">
                    Define dates and configuration for term exams
                  </p>
                </div>
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="p-1.5 hover:bg-gray-100 rounded-xl transition-colors text-gray-400"
                >
                  <X className="w-5.5 h-5.5" />
                </button>
              </div>

              <form
                onSubmit={handleFormSubmit}
                className="p-5 flex-1 space-y-5"
              >
                <div className="space-y-4">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                    <GraduationCap className="w-4 h-4 text-emerald-600" />{" "}
                    Basic Information
                  </p>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                      Exam Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={form.name}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, name: e.target.value }))
                      }
                      placeholder="e.g. First Term Exam 2026"
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/20 focus:border-emerald-500 transition-all bg-white"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5 border-t pt-4">
                    <Calendar className="w-4 h-4 text-emerald-600" /> Exam
                    Period
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                        Exam Start Date *
                      </label>
                      <input
                        type="date"
                        required
                        value={form.startDate}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, startDate: e.target.value }))
                        }
                        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/20 focus:border-emerald-500 transition-all bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                        Exam End Date *
                      </label>
                      <input
                        type="date"
                        required
                        value={form.endDate}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, endDate: e.target.value }))
                        }
                        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/20 focus:border-emerald-500 transition-all bg-white"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5 border-t pt-4">
                    <PenLine className="w-4 h-4 text-emerald-600" /> Mark Entry
                    Period
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                        Mark Entry Opens On *
                      </label>
                      <input
                        type="date"
                        required
                        value={
                          form.endDate
                            ? new Date(
                                new Date(form.endDate).getTime() + 86400000,
                              )
                                .toISOString()
                                .split("T")[0]
                            : ""
                        }
                        disabled
                        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 text-gray-400 cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                        Mark Entry Closes On *
                      </label>
                      <input
                        type="date"
                        required
                        value={form.markEntryLastDate}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            markEntryLastDate: e.target.value,
                          }))
                        }
                        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/20 focus:border-emerald-500 transition-all bg-white"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5 border-t pt-4">
                    <Award className="w-4 h-4 text-emerald-600" /> Result
                    Publication
                  </p>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                      Result Publish Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={form.publishedDate}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          publishedDate: e.target.value,
                        }))
                      }
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/20 focus:border-emerald-500 transition-all bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                      Initial Status
                    </label>
                    <select
                      value={form.examStatus}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          examStatus: e.target.value as ExamStatus,
                        }))
                      }
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/20 focus:border-emerald-500 transition-all bg-white"
                    >
                      <option value="DRAFT">Draft</option>
                      <option value="MARK_ENTRY">Mark Entry Open</option>
                      <option value="PUBLISHED">Published</option>
                      <option value="CANCELLED">Cancelled</option>
                    </select>
                  </div>
                </div>

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
                    className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold disabled:opacity-60 flex items-center justify-center gap-2 transition-colors shadow-sm"
                  >
                    {submitting && (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    )}
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
                <h3 className="font-bold text-gray-900 text-base">
                  Delete Exam?
                </h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Are you sure you want to delete exam{" "}
                  <strong>{deleteExamTarget.name}</strong>? This action cannot
                  be undone.
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
                  {deletingId !== null && (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  )}
                  {deletingId !== null ? "Deleting…" : "Delete"}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}

// ── Report sub-tab: Mark Cards ──────────────────────────────────────────────

function ReportMarklistTab({ report, marklistStudId, setMarklistStudId, madrasaName, madrasaLogo, studentPhotoMap }: {
  report: ClassReport;
  marklistStudId: string | null;
  setMarklistStudId: (id: string | null) => void;
  madrasaName: string;
  madrasaLogo?: string | null;
  studentPhotoMap?: Record<string, string | null>;
}) {
  const { students } = report;
  const activeRow = marklistStudId ? students.find((s) => s.student.id === marklistStudId) : null;

  return (
    <div className="space-y-6">
      <div className="flex gap-2 flex-wrap">
        {students.map((r) => (
          <button key={r.student.id}
            onClick={() => setMarklistStudId(r.student.id === marklistStudId ? null : r.student.id)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-sm font-medium border transition-all",
              marklistStudId === r.student.id
                ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                : "border-gray-200 bg-white text-gray-700 hover:border-emerald-300",
            )}
          >
            {r.summary.rank === 1 ? "🥇 " : r.summary.rank === 2 ? "🥈 " : r.summary.rank === 3 ? "🥉 " : ""}
            {r.student.name}
          </button>
        ))}
      </div>

      {activeRow ? (
        <motion.div
          key={activeRow.student.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-sm mx-auto"
        >
          <MarklistPoster row={activeRow} report={report} madrasaName={madrasaName} madrasaLogo={madrasaLogo} studentPhotoMap={studentPhotoMap} />
        </motion.div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-3">
          <span className="text-5xl">📋</span>
          <p className="text-sm">Select a student above to view their mark card</p>
        </div>
      )}
    </div>
  );
}

// ── Report sub-tab: Final Status ────────────────────────────────────────────

function ReportStatusTab({ report, statusMap, setStatusMap, savingId, savingAll, statusMsg, onSave, onSaveAll }: {
  report: ClassReport;
  statusMap: Record<string, { finalStatus: ResultStatus; totalGrade?: TotalGrade | null }>;
  setStatusMap: React.Dispatch<React.SetStateAction<typeof statusMap>>;
  savingId: string | null;
  savingAll: boolean;
  statusMsg: string | null;
  onSave: (row: ClassReportRow) => void;
  onSaveAll: () => void;
}) {
  const { config } = report;

  const statusOpts = [
    { value: "PASSED", label: config.passedLabel },
    { value: "FAILED", label: config.failedLabel },
    { value: "PROMOTED", label: config.promotedLabel },
    { value: "WITHHELD", label: config.withheldLabel },
  ] as const;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-sm text-gray-500">Set final result status for each student. Grade is optional.</p>
        <button
          onClick={onSaveAll}
          disabled={savingAll || !report.students.some((r) => statusMap[r.student.id]?.finalStatus)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold disabled:opacity-40 transition-colors"
        >
          {savingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
          Save All
        </button>
      </div>
      {statusMsg && (
        <div className={cn(
          "px-4 py-3 rounded-xl text-sm flex items-center gap-2",
          statusMsg.startsWith("Error") ? "bg-red-50 text-red-700 border border-red-100" : "bg-emerald-50 text-emerald-700 border border-emerald-100",
        )}>
          {statusMsg.startsWith("Error") ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
          {statusMsg}
        </div>
      )}
      <div className="rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Student</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Score</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Rank</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Final Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Total Grade</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {report.students.map((row) => {
              const entry = statusMap[row.student.id];
              const isSaving = savingId === row.student.id;
              return (
                <tr key={row.student.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{row.student.name}</div>
                    <div className="text-xs text-gray-400 font-mono">{row.student.adno}</div>
                  </td>
                  <td className="px-4 py-3 text-center text-sm text-gray-700">
                    {row.summary.totalPercentage != null ? `${row.summary.totalPercentage.toFixed(1)}%` : "—"}
                  </td>
                  <td className="px-4 py-3 text-center font-bold text-gray-700">
                    {row.summary.rank ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={entry?.finalStatus ?? ""}
                      onChange={(e) => setStatusMap((m) => ({
                        ...m,
                        [row.student.id]: { ...(m[row.student.id] ?? {}), finalStatus: e.target.value as ResultStatus },
                      }))}
                      className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 w-full max-w-36"
                    >
                      <option value="">— Select —</option>
                      {statusOpts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={entry?.totalGrade ?? ""}
                      onChange={(e) => setStatusMap((m) => ({
                        ...m,
                        [row.student.id]: { ...(m[row.student.id] ?? {}), totalGrade: (e.target.value || null) as TotalGrade | null },
                      }))}
                      className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 w-full max-w-40"
                    >
                      <option value="">— Optional —</option>
                      {TOTAL_GRADE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => onSave(row)}
                      disabled={!entry?.finalStatus || isSaving}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium disabled:opacity-40 transition-colors"
                    >
                      {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                      Save
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Report sub-tab: Rank Posters ────────────────────────────────────────────

function ReportPostersTab({ report, posterStudentId, setPosterStudentId, madrasaName, madrasaLogo, studentPhotoMap }: {
  report: ClassReport;
  posterStudentId: string | null;
  setPosterStudentId: (id: string | null) => void;
  madrasaName: string;
  madrasaLogo?: string | null;
  studentPhotoMap?: Record<string, string | null>;
}) {
  const rankedStudents = report.students.filter((r) => r.summary.rank !== null && r.summary.rank <= 3);
  const posterRow = posterStudentId ? report.students.find((r) => r.student.id === posterStudentId) : null;
  const totalStudents = report.stats?.totalStudents ?? report.students.length;
  const passCount = report.stats?.passedCount ?? undefined;

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Result Announcement Poster
        </h3>
        <div className="max-w-sm mx-auto">
          <ResultAnnouncementPoster
            exam={report.exam}
            madrasaName={madrasaName}
            madrasaLogo={madrasaLogo}
            stats={{
              totalStudents,
              passCount: passCount > 0 ? passCount : undefined,
              className: report.class.name,
            }}
          />
        </div>
      </div>

      {rankedStudents.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Rank Posters
          </h3>
          <div className="flex gap-2 flex-wrap mb-4">
            {rankedStudents.map((r) => (
              <button key={r.student.id}
                onClick={() => setPosterStudentId(r.student.id === posterStudentId ? null : r.student.id)}
                className={cn(
                  "px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-all",
                  posterStudentId === r.student.id
                    ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                    : "border-gray-200 bg-white text-gray-700 hover:border-emerald-300",
                )}
              >
                {r.summary.rank === 1 ? "🥇" : r.summary.rank === 2 ? "🥈" : "🥉"} {r.student.name}
              </button>
            ))}
          </div>

          {posterRow && (
            <motion.div
              key={posterRow.student.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-sm mx-auto"
            >
              <RankPoster row={posterRow} report={report} madrasaName={madrasaName} madrasaLogo={madrasaLogo} studentPhotoMap={studentPhotoMap} />
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
}
