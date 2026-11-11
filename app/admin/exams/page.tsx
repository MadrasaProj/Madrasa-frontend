import { Skeleton, SkeletonGrid, TableSkeleton } from "@/components/ui/Skeleton";
import { useState, useEffect, useCallback, useMemo } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { IllustratedEmptyState } from "@/components/ui/IllustratedEmptyState";
import { ApiErrorBanner } from "@/components/ui/ApiErrorBanner";
import { DataTable, type SortDir } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { ResponsivePopover } from "@/components/ui/responsivePopover";
import { DrawerSelector } from "@/components/DrawerSelector";
import { DatePickerDrawer } from "@/components/DatePickerDrawer";
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
import { getClient } from "@/lib/super-admin-api";
import { getClientCurrentAcademicYearId } from "@/lib/client-academic-year-api";
import { useAuthStore } from "@/store/auth";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
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
  Clock,
  ClipboardCheck,
  Trophy,
  RefreshCw,
  FileSpreadsheet,
  FileText,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
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

type ExamDateField = "startDate" | "endDate" | "markEntryLastDate" | "publishedDate";

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
  const isSuperAdmin = user?.actorType === "SUPER_ADMIN";
  const sessionAcademicYearId = user?.defaultAcademicYearId ?? "";
  const [selectedClientAcademicYearId, setSelectedClientAcademicYearId] = useState("");
  const [missingAcademicYear, setMissingAcademicYear] = useState(false);
  const ayId = isSuperAdmin
    ? selectedClientAcademicYearId
    : sessionAcademicYearId || selectedClientAcademicYearId;

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
  const [formError, setFormError] = useState<string | null>(null);
  const [activeDateField, setActiveDateField] = useState<ExamDateField | null>(null);
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
      setMissingAcademicYear(false);
      setSelectedClientAcademicYearId("");
      let academicYearId = sessionAcademicYearId.trim();
      if (isSuperAdmin) {
        const client = await getClient(cid, token);
        if (signal?.aborted) return;
        academicYearId = client.currentAcademicYear?.id ?? client.currentAcademicYearId ?? "";
        setSelectedClientAcademicYearId(academicYearId);
      } else if (!academicYearId) {
        academicYearId = await getClientCurrentAcademicYearId(cid, token, signal);
        if (signal?.aborted) return;
        setSelectedClientAcademicYearId(academicYearId);
      }
      if (!academicYearId) {
        setExams([]);
        setMissingAcademicYear(true);
        return;
      }
      const examData = await getExams(cid, token, {
        accademicYearId: academicYearId,
        type: "TERM_EXAM",
        limit: 200,
        signal,
      });
      const termExams = (examData.data ?? []).filter(
        (e) => e.type === "TERM_EXAM" || !e.type,
      );
      setExams(termExams);
    } catch (e: any) {
      if (signal?.aborted || e.name === "AbortError") return;
      setPageError(e.message ?? "Load failed");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [cid, token, sessionAcademicYearId, isSuperAdmin]);

  useEffect(() => {
    const ac = new AbortController();
    loadData(ac.signal);
    return () => ac.abort();
  }, [loadData]);

  // ── Form Actions ────────────────────────────────────────────────────────────

  const openCreateDrawer = () => {
    setForm(EMPTY_FORM);
    setFormError(null);
    setDrawerMode("create");
    setEditTargetId(null);
    setDrawerOpen(true);
  };

  const openEditDrawer = (exam: ExamRecord) => {
    setFormError(null);
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
    if (!cid || !token) return;
    if (!form.name.trim() || !form.startDate || !form.endDate || !form.markEntryLastDate || !form.publishedDate) {
      setFormError("Enter the exam name and all required dates.");
      toast.error("Enter the exam name and all required dates.");
      return;
    }
    const academicYearId = ayId.trim();
    if (drawerMode === "create" && !academicYearId) {
      const message = "Set a default academic year before creating an exam.";
      setFormError(message);
      toast.error(message);
      return;
    }
    setSubmitting(true);
    setFormError(null);
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
      accademicYearId: academicYearId,
    };

    try {
      if (drawerMode === "create") {
        const res = await createExam(cid, token, payload);
        setExams((prev) => [res, ...prev]);
        toast.success("Exam created successfully");
      } else {
        if (!editTargetId) return;
        const res = await updateExam(cid, token, editTargetId, payload);
        setExams((prev) =>
          prev.map((ex) => (ex.id === editTargetId ? { ...ex, ...res } : ex)),
        );
        toast.success("Exam updated successfully");
      }
      setDrawerOpen(false);
      setForm(EMPTY_FORM);
      setEditTargetId(null);
    } catch (e: any) {
      setPageError(e.message ?? "Action failed");
      toast.error(e.message ?? "Action failed");
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
      toast.success("Exam deleted successfully");
      setShowDeleteExamConfirm(false);
      setDeleteExamTarget(null);
    } catch (e: any) {
      toast.error(e.message ?? "Delete failed");
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
        getStudents(cid, token, { classId, status: "ACTIVE", limit: 500 }),
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
      toast.success("Marks saved successfully");
      setTimeout(() => setMarkEntry((p) => ({ ...p, saved: false })), 2000);
    } catch (e: any) {
      setMarkEntry((p) => ({ ...p, saving: false, error: e.message }));
      toast.error(e.message ?? "Failed to save marks");
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
  const examSummary = [
    { label: "Upcoming", value: upcomingExams.length, icon: Clock, color: "text-primary-700" },
    { label: "Mark entry", value: markEntryOpenExams.length, icon: PenLine, color: "text-primary-700" },
    { label: "Completed", value: completedExams.length, icon: ClipboardCheck, color: "text-blue-700" },
    { label: "Published", value: publishedExams.length, icon: Trophy, color: "text-amber-700" },
  ];

  const columns = useExamColumns({
    showActions: true,
    onEdit: openEditDrawer,
    onClasses: (exam) => openClassDrawer(exam.id),
    onDelete: startDeleteExam,
  });
  const showExamList = loading || exams.length > 0;

  return (
    <DashboardLayout>
      <div className="p-0! pb-24! lg:pb-8!">
        <PageHeader
          title="Exams"
          action={showExamList ? (
            <Button
              type="button"
              onClick={openCreateDrawer}
              className="hidden rounded-full md:inline-flex"
            >
              <Plus className="h-4 w-4" /> Create Exam
            </Button>
          ) : undefined}
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

        {!showExamList && !pageError && (
          <IllustratedEmptyState
            image="/images/teacher/exams-empty.webp"
            title={missingAcademicYear ? "No default academic year" : "No term exams yet"}
            description={missingAcademicYear
              ? "Set a default academic year in madrasa settings to view or create exams."
              : "Create an exam to get started."}
            action={!missingAcademicYear ? (
              <Button type="button" size="lg" onClick={openCreateDrawer} className="rounded-full">
                <Plus className="h-5 w-5" /> Create Exam
              </Button>
            ) : undefined}
          />
        )}

        {showExamList && (
          <>
            <div className="px-3 pb-2 pt-6">
              <div className="mx-auto flex w-full max-w-md items-center gap-2">
                <InputGroup className="h-10 min-w-0 flex-1 rounded-lg bg-white">
                  <InputGroupInput
                    type="search"
                    aria-label="Search exams by name"
                    placeholder="Search exam by name..."
                    value={searchText}
                    onChange={(event) => setSearchText(event.target.value)}
                    className="h-full text-sm"
                  />
                  <InputGroupAddon align="inline-start">
                    <Search className="h-4 w-4 text-gray-400" />
                  </InputGroupAddon>
                </InputGroup>
                <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600">
                  <SlidersHorizontal aria-hidden="true" className="h-4 w-4" />
                  <select
                    aria-label="Sort exams"
                    value={`${sortBy ?? "startDate"}:${sortDir}`}
                    onChange={(event) => {
                      const [key, direction] = event.target.value.split(":");
                      setSortBy(key);
                      setSortDir(direction as SortDir);
                      setPage(1);
                    }}
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  >
                    <option value="startDate:desc">Newest first</option>
                    <option value="startDate:asc">Oldest first</option>
                    <option value="name:asc">Name A–Z</option>
                    <option value="name:desc">Name Z–A</option>
                    <option value="examStatus:asc">Status A–Z</option>
                    <option value="examStatus:desc">Status Z–A</option>
                    <option value="markEntryLastDate:asc">Mark entry: earliest</option>
                    <option value="markEntryLastDate:desc">Mark entry: latest</option>
                    <option value="publishedDate:asc">Published: earliest</option>
                    <option value="publishedDate:desc">Published: latest</option>
                  </select>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="mx-3 mb-3 overflow-hidden rounded-2xl bg-white">
                <Skeleton className="h-20 rounded-none" />
                <div className="grid grid-cols-2 gap-px bg-gray-100 sm:grid-cols-4">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <Skeleton key={index} className="h-20 rounded-none" />
                  ))}
                </div>
              </div>
            ) : (
              <section className="mx-3 mb-3 overflow-hidden rounded-2xl bg-gradient-to-br from-white to-sky-50">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-3 py-2.5">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xl font-semibold tabular-nums text-gray-950">{exams.length}</span>
                    <span className="text-xs font-medium text-gray-600">Total exams</span>
                  </div>
                  <span className="rounded-full border border-primary-100 bg-primary-50 px-2.5 py-1 text-xs font-medium text-primary-700">
                    <strong className="tabular-nums">{sortedExams.length}</strong> shown
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-px bg-gray-100 sm:grid-cols-4">
                  {examSummary.map((stat) => {
                    const Icon = stat.icon;
                    return (
                      <div key={stat.label} className="min-w-0 bg-white/90 p-2.5 sm:p-3">
                        <div className="flex items-center gap-1.5 text-[11px] font-medium text-gray-600">
                          <Icon aria-hidden="true" className={`h-3.5 w-3.5 shrink-0 ${stat.color}`} />
                          <span>{stat.label}</span>
                        </div>
                        <div className="mt-1 text-lg font-semibold tabular-nums text-gray-950">{stat.value}</div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            <DataTable
              className="mx-3 hidden md:block md:w-auto"
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
            />
            <section className="card mx-3 divide-y divide-gray-100 overflow-hidden rounded-2xl bg-white p-0! shadow-none md:hidden" data-ui-style="classic" aria-label="Exams">
              {loading ? (
                Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="space-y-2 p-3">
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-3 w-3/4" />
                  </div>
                ))
              ) : pagedExams.length === 0 ? (
                <div className="flex flex-col items-center px-3 py-8 text-center">
                  <img src="/icons/exams/empty.webp" alt="" className="mb-3 h-28 w-28 object-contain" />
                  <p className="text-sm text-gray-500">{searchText ? "No matching exams found" : "No term exams found"}</p>
                </div>
              ) : pagedExams.map((exam) => {
                const status = getExamStatusInfo(exam);
                return (
                  <div key={exam.id} className="p-3">
                    <button
                      type="button"
                      onClick={() => openClassDrawer(exam.id)}
                      className="w-full text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
                    >
                      <span className="flex items-start justify-between gap-3">
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-gray-900">{exam.name}</span>
                          <span className="mt-0.5 block text-xs text-gray-500">{status.description || "—"}</span>
                        </span>
                        <ExamStatusBadge exam={exam} className="rounded-full border px-2.5 py-1 text-xs font-medium normal-case tracking-normal" />
                      </span>
                      <span className="mt-2 flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
                        <span className="text-xs text-gray-500">Exam period</span>
                        <span className="text-xs font-medium text-gray-700">{shortDate(exam.startDate)} – {shortDate(exam.endDate)}</span>
                      </span>
                    </button>
                    <div className="mt-3 flex items-center gap-2 border-t border-gray-100 pt-2">
                      <button type="button" onClick={() => openClassDrawer(exam.id)} className="rounded-lg bg-primary-50 px-3 py-1.5 text-xs font-medium text-primary-700 hover:bg-primary-100">Classes</button>
                      <button type="button" onClick={() => openEditDrawer(exam)} className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200">Edit</button>
                      <button type="button" onClick={() => startDeleteExam(exam)} className="ml-auto rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100">Delete</button>
                    </div>
                  </div>
                );
              })}
            </section>
            {!loading && sortedExams.length > 0 && (
              <div className="mx-3 mt-3 flex flex-wrap items-center justify-center gap-3 text-sm text-gray-500 md:hidden">
                <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)} className="rounded-xl">
                  <ChevronLeft className="h-4 w-4" /> Previous
                </Button>
                <span className="tabular-nums">{(page - 1) * pageSize + 1}–{Math.min(page * pageSize, sortedExams.length)} of {sortedExams.length}</span>
                <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(page + 1)} className="rounded-xl">
                  Next <ChevronRight className="h-4 w-4" />
                </Button>
                <select
                  aria-label="Exams per page"
                  value={pageSize}
                  onChange={(event) => setPageSize(Number(event.target.value))}
                  className="h-8 rounded-lg border border-gray-200 bg-white px-2 text-xs text-gray-600"
                >
                  {PAGE_SIZE_OPTIONS.map((size) => <option key={size} value={size}>{size} per page</option>)}
                </select>
              </div>
            )}
          </>
        )}
      </div>

      {showExamList && !drawerOpen && !classDrawerExamId && (
        <Button
          type="button"
          size="lg"
          onClick={openCreateDrawer}
          className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] left-1/2 z-30 max-w-[calc(100vw-1.5rem)] -translate-x-1/2 rounded-full shadow-lg shadow-primary-900/20 md:hidden"
        >
          <Plus className="h-5 w-5" /> Create Exam
        </Button>
      )}

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
                          ? "border-primary-600 text-primary-700 bg-primary-50/60"
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
                            ? "border-primary-600 text-primary-700"
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
                                ? "bg-white text-primary-700 shadow-sm"
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
                                ? "bg-white text-primary-700 shadow-sm"
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
                                    : "bg-primary-50 text-primary-700 border border-primary-100",
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
                                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold disabled:opacity-50 transition-all shadow-sm"
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
                                  <FileSpreadsheet className="w-4 h-4 text-primary-600" />
                                  Import Excel
                                </button>
                              </div>

                              {/* Report content */}
                              {reportLoading ? (
                                <><SkeletonGrid count={4} className="mb-4 sm:grid-cols-4" /><TableSkeleton /></>
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
                                      { label: "Passed", value: reportData.stats.passedCount, color: "text-primary-700", bg: "bg-primary-50" },
                                      { label: "Failed", value: reportData.stats.failedCount, color: "text-red-700", bg: "bg-red-50" },
                                      { label: "Ranked", value: reportData.stats.rankedCount, color: "text-primary-700", bg: "bg-primary-50" },
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
                                            ? "text-primary-600 border-primary-600"
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

      {/* Create / Edit Exam */}
      <ResponsivePopover
        open={drawerOpen}
        onOpenChange={(open) => {
          if (submitting) return;
          setDrawerOpen(open);
          if (!open) setActiveDateField(null);
        }}
        side="bottom"
        drawerOnDesktop
        title={drawerMode === "create" ? "Create New Exam" : "Edit Exam"}
        description="Define dates and configuration for term exams"
        className="mx-auto w-full max-w-xl rounded-t-2xl"
        showCloseButton={!submitting}
        footer={
          <div className="flex justify-end gap-2 border-t border-gray-100 bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <Button type="button" variant="outline" size="lg" className="rounded-xl" disabled={submitting} onClick={() => setDrawerOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="admin-exam-form" size="lg" className="rounded-xl" disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {drawerMode === "create" ? "Create Exam" : "Save Changes"}
            </Button>
          </div>
        }
      >
        <form id="admin-exam-form" onSubmit={handleFormSubmit} className="space-y-5 p-4">
          {formError && <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{formError}</p>}

          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">Basic Information</h3>
            <div>
              <label htmlFor="admin-exam-name" className="mb-1.5 block text-sm font-medium text-gray-700">Exam Name *</label>
              <Input
                id="admin-exam-name"
                type="text"
                size="lg"
                required
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="e.g. First Term Exam 2026"
              />
            </div>
          </section>

          <section className="space-y-3 border-t border-gray-100 pt-4">
            <h3 className="text-sm font-semibold text-gray-700">Exam Period</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="mb-1.5 text-sm font-medium text-gray-700">Exam Start Date *</p>
                <Button type="button" variant="outline" size="lg" aria-haspopup="dialog" aria-expanded={activeDateField === "startDate"} aria-label={`Exam Start Date: ${form.startDate ? fmt(form.startDate) : "Select date"}`} onClick={() => setActiveDateField("startDate")} className="w-full justify-start gap-2 overflow-hidden px-3 font-normal shadow-none!">
                  <Calendar className="h-4 w-4 shrink-0 text-gray-500" />
                  <span className="truncate">{form.startDate ? fmt(form.startDate) : "Select date"}</span>
                </Button>
              </div>
              <div>
                <p className="mb-1.5 text-sm font-medium text-gray-700">Exam End Date *</p>
                <Button type="button" variant="outline" size="lg" aria-haspopup="dialog" aria-expanded={activeDateField === "endDate"} aria-label={`Exam End Date: ${form.endDate ? fmt(form.endDate) : "Select date"}`} onClick={() => setActiveDateField("endDate")} className="w-full justify-start gap-2 overflow-hidden px-3 font-normal shadow-none!">
                  <Calendar className="h-4 w-4 shrink-0 text-gray-500" />
                  <span className="truncate">{form.endDate ? fmt(form.endDate) : "Select date"}</span>
                </Button>
              </div>
            </div>
          </section>

          <section className="space-y-3 border-t border-gray-100 pt-4">
            <h3 className="text-sm font-semibold text-gray-700">Mark Entry Period</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="admin-exam-mark-entry-opens" className="mb-1.5 block text-sm font-medium text-gray-700">Mark Entry Opens On *</label>
                <Input
                  id="admin-exam-mark-entry-opens"
                  type="text"
                  size="lg"
                  disabled
                  value={form.endDate ? fmt(new Date(new Date(`${form.endDate}T00:00:00`).getTime() + 86400000).toISOString()) : ""}
                  placeholder="After exam ends"
                />
              </div>
              <div>
                <p className="mb-1.5 text-sm font-medium text-gray-700">Mark Entry Closes On *</p>
                <Button type="button" variant="outline" size="lg" aria-haspopup="dialog" aria-expanded={activeDateField === "markEntryLastDate"} aria-label={`Mark Entry Closes On: ${form.markEntryLastDate ? fmt(form.markEntryLastDate) : "Select date"}`} onClick={() => setActiveDateField("markEntryLastDate")} className="w-full justify-start gap-2 overflow-hidden px-3 font-normal shadow-none!">
                  <Calendar className="h-4 w-4 shrink-0 text-gray-500" />
                  <span className="truncate">{form.markEntryLastDate ? fmt(form.markEntryLastDate) : "Select date"}</span>
                </Button>
              </div>
            </div>
          </section>

          <section className="space-y-3 border-t border-gray-100 pt-4">
            <h3 className="text-sm font-semibold text-gray-700">Result Publication</h3>
            <div>
              <p className="mb-1.5 text-sm font-medium text-gray-700">Result Publish Date *</p>
              <Button type="button" variant="outline" size="lg" aria-haspopup="dialog" aria-expanded={activeDateField === "publishedDate"} aria-label={`Result Publish Date: ${form.publishedDate ? fmt(form.publishedDate) : "Select date"}`} onClick={() => setActiveDateField("publishedDate")} className="w-full justify-start gap-2 px-3 font-normal shadow-none!">
                <Calendar className="h-4 w-4 text-gray-500" />
                {form.publishedDate ? fmt(form.publishedDate) : "Select date"}
              </Button>
            </div>
            <div>
              <p className="mb-1.5 text-sm font-medium text-gray-700">Initial Status</p>
              <DrawerSelector
                title="Initial Status"
                options={[
                  { value: "DRAFT", label: "Draft" },
                  { value: "MARK_ENTRY", label: "Mark Entry Open" },
                  { value: "PUBLISHED", label: "Published" },
                  { value: "CANCELLED", label: "Cancelled" },
                ]}
                value={form.examStatus}
                onChange={(value) => setForm((current) => ({ ...current, examStatus: value as ExamStatus }))}
              />
            </div>
          </section>
          <DatePickerDrawer
            open={drawerOpen && activeDateField !== null}
            onOpenChange={(open) => { if (!open) setActiveDateField(null); }}
            date={activeDateField ? form[activeDateField] : ""}
            onDateChange={(date) => {
              if (activeDateField) setForm((current) => ({ ...current, [activeDateField]: date }));
              setFormError(null);
            }}
            title={activeDateField === "startDate" ? "Exam Start Date" : activeDateField === "endDate" ? "Exam End Date" : activeDateField === "markEntryLastDate" ? "Mark Entry Closes On" : "Result Publish Date"}
            disableFuture={false}
          />
        </form>
      </ResponsivePopover>

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
                ? "border-primary-600 bg-primary-50 text-primary-700"
                : "border-gray-200 bg-white text-gray-700 hover:border-primary-300",
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
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold disabled:opacity-40 transition-colors"
        >
          {savingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
          Save All
        </button>
      </div>
      {statusMsg && (
        <div className={cn(
          "px-4 py-3 rounded-xl text-sm flex items-center gap-2",
          statusMsg.startsWith("Error") ? "bg-red-50 text-red-700 border border-red-100" : "bg-primary-50 text-primary-700 border border-primary-100",
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
                      className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 w-full max-w-36"
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
                      className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 w-full max-w-40"
                    >
                      <option value="">— Optional —</option>
                      {TOTAL_GRADE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => onSave(row)}
                      disabled={!entry?.finalStatus || isSaving}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-xs font-medium disabled:opacity-40 transition-colors"
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
          <span className="w-1.5 h-1.5 rounded-full bg-primary-500" />
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
                    ? "border-primary-600 bg-primary-50 text-primary-700"
                    : "border-gray-200 bg-white text-gray-700 hover:border-primary-300",
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
