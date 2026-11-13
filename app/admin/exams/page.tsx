import { Skeleton, SkeletonGrid, TableSkeleton } from "@/components/ui/Skeleton";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { IllustratedEmptyState } from "@/components/ui/IllustratedEmptyState";
import { ApiErrorBanner } from "@/components/ui/ApiErrorBanner";
import type { SortDir } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { ScrollableTabs } from "@/components/ui/ScrollableTabs";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
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
import { loadLiveClassReport } from "@/lib/live-class-report";
import { useAuthStore } from "@/store/auth";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Plus,
  Loader2,
  Trash2,
  Search,
  Calendar,
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
  ArrowUpDown,
  ChevronRight,
} from "lucide-react";
import { ExamStatusBadge } from "@/components/exam/ExamStatusBadge";
import { MarkEntryGrid } from "@/components/exam/MarkEntryGrid";
import { ClassResultTable } from "@/components/exam/ClassResultTable";
import { ReportMarklistTab, ReportStatusTab, ReportPostersTab } from "@/components/exam/AdminExamReportTabs";
import { ExcelImportModal } from "@/components/exam/ExcelImportModal";
import { useExamColumns } from "@/components/exam/ExamColumns";
import { fmt, shortDate, getExamCategories } from "@/lib/exam-utils";
import {
  computeSummary, setFinalStatus,
  type ClassReport, type ClassReportRow, type ResultStatus, type TotalGrade,
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

const DEFAULT_PAGE_SIZE = 10;

function paginationItems(current: number, total: number): Array<number | "ellipsis"> {
  const pages = [...new Set([1, total, current - 1, current, current + 1])]
    .filter((value) => value >= 1 && value <= total)
    .sort((a, b) => a - b);
  const items: Array<number | "ellipsis"> = [];
  pages.forEach((value, index) => {
    const previous = pages[index - 1];
    if (previous && value - previous === 2) items.push(previous + 1);
    if (previous && value - previous > 2) items.push("ellipsis");
    items.push(value);
  });
  return items;
}

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
  const [sortBy, setSortBy] = useState<string | undefined>("startDate");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const [classDrawerExamId, setClassDrawerExamId] = useState<string | null>(
    null,
  );
  const [selectedClassTab, setSelectedClassTab] = useState<string | null>(null);

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
  const [marksDirty, setMarksDirty] = useState(false);
  const classRequestRef = useRef(0);
  const subjectRequestRef = useRef(0);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<"create" | "edit">("create");
  const [form, setForm] = useState<ExamForm>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [activeDateField, setActiveDateField] = useState<ExamDateField | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [editTargetId, setEditTargetId] = useState<string | null>(null);

  const [contentTab, setContentTab] = useState<"markentry" | "report">("markentry");
  const [reportData, setReportData] = useState<ClassReport | null>(null);
  const [resultSheetData, setResultSheetData] = useState<ClassReport | null>(null);
  const [reportControlsContainer, setReportControlsContainer] = useState<HTMLDivElement | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const reportRequestRef = useRef(0);
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
    classRequestRef.current += 1;
    subjectRequestRef.current += 1;
    setClassDrawerExamId(examId);
    setSelectedClassTab(firstId);
    setContentTab("markentry");
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
    setMarksDirty(false);
    if (firstId) {
      loadMarkEntryClass(examId, firstId);
    }
  };

  const closeClassDrawer = () => {
    classRequestRef.current += 1;
    subjectRequestRef.current += 1;
    reportRequestRef.current += 1;
    setClassDrawerExamId(null);
    setSelectedClassTab(null);
    setContentTab("markentry");
    setReportData(null);
    setResultSheetData(null);
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
    if (classId === selectedClassTab) return;
    reportRequestRef.current += 1;
    setSelectedClassTab(classId);
    setMarksDirty(false);
    setReportData(null);
    setResultSheetData(null);
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
  const selectedSubject = markEntry.subjects.find((subject) => subject.id === markEntry.subjectId);
  const maxSubjectMarks = selectedSubject?.classSubject?.maxMarks ?? classDrawerExam?.maxMarks ?? 50;
  const hasEnteredScores = Object.values(markEntry.scores).some((score) => score !== "");
  const hasInvalidScores = Object.values(markEntry.scores).some(
    (score) => score !== "" && (Number(score) < 0 || Number(score) > maxSubjectMarks),
  );

  // ── Mark entry (admin) ─────────────────────────────────────────────────────

  const loadMarkEntryClass = async (examId: string, classId: string) => {
    const request = ++classRequestRef.current;
    subjectRequestRef.current += 1;
    setMarksDirty(false);
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
      if (request !== classRequestRef.current) return;
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
      if (request !== classRequestRef.current) return;
      setMarkEntry((p) => ({ ...p, loading: false, error: e.message }));
    }
  };

  useEffect(() => {
    if (!classDrawerExamId || selectedClassTab || !classesData?.length) return;
    const firstClassId = classesData[0].id;
    setSelectedClassTab(firstClassId);
    void loadMarkEntryClass(classDrawerExamId, firstClassId);
  }, [classDrawerExamId, selectedClassTab, classesData]);

  const loadMarkEntrySubject = async (examId: string, classId: string, subjectId: string, students: MarkEntryState["students"]) => {
    const request = ++subjectRequestRef.current;
    setMarksDirty(false);
    setMarkEntry((p) => ({
      ...p,
      scores: {},
      loading: true,
      error: null,
    }));
    try {
      const data = await getResults(cid, token, {
        examId,
        classId,
        limit: 500,
      });
      const rows = data.data ?? [];
      const scoreMap: Record<string, string> = {};
      students.forEach((s) => {
        const r = rows.find(
          (r) => r.student?.id === s.id && r.subject?.id === subjectId,
        );
        scoreMap[s.id] = r != null ? String(r.score) : "";
      });
      if (request !== subjectRequestRef.current) return;
      setMarkEntry((p) => ({ ...p, scores: scoreMap, loading: false }));
    } catch (e: any) {
      if (request !== subjectRequestRef.current) return;
      setMarkEntry((p) => ({ ...p, loading: false, error: e.message }));
    }
  };

  useEffect(() => {
    if (classDrawerExamId && markEntry.classId && markEntry.subjectId) {
      void loadMarkEntrySubject(classDrawerExamId, markEntry.classId, markEntry.subjectId, markEntry.students);
    }
  }, [classDrawerExamId, markEntry.classId, markEntry.subjectId, markEntry.students]);

  const handleMarkEntrySave = async (examId: string): Promise<boolean> => {
    if (!markEntry.classId || !markEntry.subjectId) return false;
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
        return false;
      }

      await bulkUpsertResults(cid, token, {
        examId,
        classId: markEntry.classId,
        accademicYearId: ayId,
        results: items,
      });

      setMarkEntry((p) => ({ ...p, saving: false, saved: true }));
      setMarksDirty(false);
      toast.success("Marks saved successfully");
      setTimeout(() => setMarkEntry((p) => ({ ...p, saved: false })), 2000);
      return true;
    } catch (e: any) {
      setMarkEntry((p) => ({ ...p, saving: false, error: e.message }));
      toast.error(e.message ?? "Failed to save marks");
      return false;
    }
  };

  const openClassReport = async () => {
    if (!classDrawerExamId || !selectedClassTab || markEntry.loading || markEntry.saving) return;
    if (marksDirty && !(await handleMarkEntrySave(classDrawerExamId))) return;
    setContentTab("report");
  };

  // ── Class Report Load ──────────────────────────────────────────────────────

  const loadClassReport = useCallback(async () => {
    if (!cid || !token || !classDrawerExamId || !selectedClassTab) return;
    const request = ++reportRequestRef.current;
    setReportLoading(true);
    setReportError(null);
    try {
      const { report, computedReport } = await loadLiveClassReport({
        clientId: cid,
        token,
        examId: classDrawerExamId,
        examName: classDrawerExam?.name ?? "Exam",
        examType: classDrawerExam?.type ?? "TERM_EXAM",
        classId: selectedClassTab,
        className: selectedClass?.name ?? "Class",
      });
      if (request !== reportRequestRef.current) return;
      setResultSheetData(report);
      setReportData(computedReport ?? report);
    } catch (e: any) {
      if (request !== reportRequestRef.current) return;
      setReportError(e.message ?? "Failed to load report");
    } finally {
      if (request === reportRequestRef.current) setReportLoading(false);
    }
  }, [cid, token, classDrawerExamId, classDrawerExam?.name, classDrawerExam?.type, selectedClassTab, selectedClass?.name]);

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

  const totalPages = Math.max(1, Math.ceil(sortedExams.length / DEFAULT_PAGE_SIZE));
  const pagedExams = useMemo(
    () => sortedExams.slice((page - 1) * DEFAULT_PAGE_SIZE, page * DEFAULT_PAGE_SIZE),
    [sortedExams, page],
  );

  useEffect(() => {
    setPage(1);
  }, [searchText]);

  const { upcoming: upcomingExams, markEntryOpen: markEntryOpenExams, completed: completedExams, published: publishedExams } = getExamCategories(exams);
  const examSummary = [
    { label: "Upcoming", value: upcomingExams.length, icon: Clock },
    { label: "Mark entry", value: markEntryOpenExams.length, icon: PenLine },
    { label: "Completed", value: completedExams.length, icon: ClipboardCheck },
    { label: "Published", value: publishedExams.length, icon: Trophy },
  ];
  const showExamList = loading || exams.length > 0;

  return (
    <DashboardLayout>
      <div className="p-0! pb-24! lg:pb-8!">
        <PageHeader title="Exams" />

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
              <Button type="button" size="lg" onClick={openCreateDrawer} className="hidden rounded-full sm:inline-flex">
                <Plus className="h-5 w-5" /> Create Exam
              </Button>
            ) : undefined}
          />
        )}

        {showExamList && (
          <>
            <div className="px-3 pb-3 pt-4">
              <div className="flex w-full flex-wrap items-center gap-2">
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
                <DrawerSelector
                  title="Sort exams"
                  options={[
                    { value: "startDate:desc", label: "Newest first" },
                    { value: "startDate:asc", label: "Oldest first" },
                    { value: "name:asc", label: "Name A–Z" },
                    { value: "name:desc", label: "Name Z–A" },
                    { value: "examStatus:asc", label: "Status A–Z" },
                    { value: "examStatus:desc", label: "Status Z–A" },
                    { value: "markEntryLastDate:asc", label: "Mark entry: earliest" },
                    { value: "markEntryLastDate:desc", label: "Mark entry: latest" },
                    { value: "publishedDate:asc", label: "Published: earliest" },
                    { value: "publishedDate:desc", label: "Published: latest" },
                  ]}
                  value={`${sortBy ?? "startDate"}:${sortDir}`}
                  onChange={(value) => {
                    const [key, direction] = value.split(":");
                    setSortBy(key);
                    setSortDir(direction as SortDir);
                    setPage(1);
                  }}
                  triggerIcon={<ArrowUpDown className="size-4" />}
                  className="size-11 shadow-none"
                />
                <Button type="button" onClick={openCreateDrawer} className="hidden shadow-none sm:inline-flex">
                  <Plus className="size-4" /> Create Exam
                </Button>
              </div>
            </div>

            {loading ? (
              <div className="mx-3 mb-3 grid grid-cols-2 overflow-hidden rounded-2xl bg-white">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-20 rounded-none" />
                ))}
              </div>
            ) : (
              <section className="mx-3 mb-3 grid grid-cols-2 overflow-hidden rounded-2xl bg-gradient-to-br from-primary-50/60 via-white to-sky-50/60" aria-label="Exam statistics">
                {examSummary.map(({ label, value, icon: Icon }, index) => (
                  <div key={label} className={`min-w-0 p-2.5 sm:p-3 ${index % 2 === 0 ? "border-r border-gray-100" : ""} ${index < 2 ? "border-b border-gray-100" : ""}`}>
                    <div className="flex items-center gap-1.5 text-sm font-medium leading-4 text-gray-700">
                      <Icon aria-hidden="true" className="size-3.5 shrink-0" />
                      <span>{label}</span>
                    </div>
                    <span className="mt-1.5 block text-[22px] font-medium leading-none tabular-nums text-gray-950">{value}</span>
                  </div>
                ))}
              </section>
            )}

            <section className="mx-3" aria-labelledby="admin-exams-list-title">
              <h2 id="admin-exams-list-title" className="mb-2 px-1 text-sm font-semibold text-gray-700">
                All exams · {sortedExams.length} shown
              </h2>
              <div className="divide-y divide-gray-100 overflow-hidden rounded-2xl bg-white">
                {loading ? Array.from({ length: 4 }, (_, index) => (
                  <div key={index} className="space-y-2 px-4 py-4">
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-3 w-3/4" />
                  </div>
                )) : pagedExams.length === 0 ? (
                  <p className="px-4 py-10 text-center text-sm text-gray-500">
                    {searchText ? "No matching exams found" : "No term exams found"}
                  </p>
                ) : pagedExams.map((exam) => (
                  <Button
                    key={exam.id}
                    type="button"
                    variant="ghost"
                    aria-haspopup="dialog"
                    onClick={() => openClassDrawer(exam.id)}
                    className="h-auto w-full justify-start gap-3 rounded-none px-4 py-4 text-left whitespace-normal shadow-none hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary-500"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-gray-950 sm:text-base">{exam.name}</span>
                      <span className="mt-1 block text-xs text-gray-500">{shortDate(exam.startDate)} – {shortDate(exam.endDate)}</span>
                    </span>
                    <ExamStatusBadge exam={exam} className="shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium normal-case tracking-normal" />
                    <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-gray-400" />
                  </Button>
                ))}
              </div>
            </section>
            {!loading && totalPages > 1 && (
              <Pagination className="mx-auto mt-3" aria-label="Exam pages">
                <PaginationContent className="gap-1">
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      aria-label="Previous exam page"
                      aria-disabled={page <= 1}
                      tabIndex={page <= 1 ? -1 : undefined}
                      className={cn("rounded-lg", page <= 1 && "pointer-events-none opacity-40")}
                      onClick={(event) => { event.preventDefault(); if (page > 1) setPage(page - 1); }}
                    />
                  </PaginationItem>
                  {paginationItems(page, totalPages).map((item, index) => (
                    <PaginationItem key={item === "ellipsis" ? `ellipsis-${index}` : item}>
                      {item === "ellipsis" ? <PaginationEllipsis /> : (
                        <PaginationLink
                          href="#"
                          isActive={item === page}
                          aria-label={`Go to exam page ${item}`}
                          className="rounded-lg"
                          onClick={(event) => { event.preventDefault(); setPage(item); }}
                        >
                          {item}
                        </PaginationLink>
                      )}
                    </PaginationItem>
                  ))}
                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      aria-label="Next exam page"
                      aria-disabled={page >= totalPages}
                      tabIndex={page >= totalPages ? -1 : undefined}
                      className={cn("rounded-lg", page >= totalPages && "pointer-events-none opacity-40")}
                      onClick={(event) => { event.preventDefault(); if (page < totalPages) setPage(page + 1); }}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
          </>
        )}
      </div>

      {!loading && !missingAcademicYear && !pageError && (
        <Button
          type="button"
          size="lg"
          onClick={openCreateDrawer}
          className="fixed bottom-[92px] left-1/2 z-40 -translate-x-1/2 rounded-full px-5 shadow-lg sm:hidden"
        >
          <Plus className="size-5" /> Create Exam
        </Button>
      )}

      <ResponsivePopover
        open={classDrawerExam !== null}
        onOpenChange={(open) => { if (!open) closeClassDrawer(); }}
        fullHeight
        showBackButton={contentTab === "report"}
        onBack={() => setContentTab("markentry")}
        title={contentTab === "report" ? `${classDrawerExam?.name ?? "Exam"} · Report` : classDrawerExam?.name ?? "Exam details"}
        description={classDrawerExam?.name}
        className="shadow-none md:max-w-none"
        
        footer={classDrawerExam && selectedClass && contentTab === "markentry" ? (
          <div className="border-t border-gray-100 bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6">
            <ButtonGroup aria-label="Mark entry actions" className="ml-auto w-full sm:w-auto">
              <Button type="button" variant="outline" size="lg" className="flex-1 shadow-none sm:flex-none" disabled={markEntry.loading || markEntry.saving || hasInvalidScores} onClick={() => { void openClassReport(); }}>
                <FileText aria-hidden="true" /> Report
              </Button>
              <Button type="button" size="lg" className="flex-1 shadow-none sm:flex-none" disabled={markEntry.loading || markEntry.saving || !markEntry.subjectId || !hasEnteredScores || hasInvalidScores} onClick={() => { void handleMarkEntrySave(classDrawerExam.id); }}>
                {markEntry.saving ? <Loader2 aria-hidden="true" className="animate-spin" /> : <Save aria-hidden="true" />}
                {markEntry.saving ? "Saving…" : markEntry.saved ? "Saved" : "Save marks"}
              </Button>
            </ButtonGroup>
          </div>
        ) : contentTab === "report" && reportTab === "table" && resultSheetData && !reportLoading ? (
          <div ref={setReportControlsContainer} className="flex justify-end border-t border-gray-100 bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6" />
        ) : undefined}
      >
        {classDrawerExam && (
          <>
            <div className="flex shrink-0 justify-end border-b border-gray-100 px-4 py-3 sm:px-6">
              <ButtonGroup aria-label="Exam actions">
                <Button type="button" variant="outline" className="shadow-none" onClick={() => { closeClassDrawer(); openEditDrawer(classDrawerExam); }}>Edit exam</Button>
                <Button type="button" variant="destructive" className="shadow-none" onClick={() => { closeClassDrawer(); startDeleteExam(classDrawerExam); }}>Delete exam</Button>
              </ButtonGroup>
            </div>
              <div className="flex flex-1 overflow-hidden">
                <div className="flex-1 flex flex-col min-w-0 min-h-0">
                  <div className="shrink-0 border-b border-gray-100 px-4 py-3 sm:px-6">
                    <h3 className="mb-1 text-xs font-semibold text-gray-500">Class</h3>
                    <ScrollableTabs
                      ariaLabel="Choose class"
                      options={classes.map((cls) => ({ value: cls.id, label: cls.name }))}
                      value={selectedClassTab ?? ""}
                      onValueChange={selectClassTab}
                    />
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

                      {contentTab === "markentry" && (
                        <div className="shrink-0 px-4 pt-2 sm:px-6">
                          <h3 className="mb-1 text-xs font-semibold text-gray-500">Subject</h3>
                          {markEntry.subjects.length > 0 ? (
                            <ScrollableTabs
                              ariaLabel="Choose subject"
                              options={markEntry.subjects.map((subject) => ({ value: subject.id, label: subject.name }))}
                              value={markEntry.subjectId}
                              onValueChange={(subjectId) => {
                                if (subjectId === markEntry.subjectId) return;
                                subjectRequestRef.current += 1;
                                setMarksDirty(false);
                                setMarkEntry((previous) => ({ ...previous, subjectId, scores: {}, saved: false }));
                              }}
                              disabled={markEntry.loading || markEntry.saving}
                            />
                          ) : (
                            <p className="px-1 py-3 text-sm text-gray-500">{markEntry.loading ? "Loading subjects…" : "No subjects available"}</p>
                          )}
                        </div>
                      )}

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
                              onSubjectChange={() => {}}
                              onScoreChange={(sid, val) => {
                                setMarksDirty(true);
                                setMarkEntry((p) => ({
                                  ...p,
                                  scores: { ...p.scores, [sid]: val },
                                }));
                              }}
                              onSave={() => { void handleMarkEntrySave(classDrawerExam.id); }}
                              showExamSelector={false}
                              showClassSelector={false}
                              showSubjectSelector={false}
                              showRemarks={false}
                              showExcelImport={false}
                              showDraftButton={false}
                              showResetButton={false}
                              showLockPeriod={false}
                              showActionButtons={false}
                              compactStudentRows
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
                              <div className="flex flex-wrap items-center gap-2">
                                <Button type="button"
                                  onClick={handleCompute}
                                  disabled={computing}
                                  className="shadow-none"
                                >
                                  {computing
                                    ? <Loader2 className="size-4 animate-spin" />
                                    : <RefreshCw className="size-4" />}
                                  Compute Grades
                                </Button>
                                <Button type="button" variant="outline"
                                  onClick={() => setImportOpen(true)}
                                  disabled={!reportData || reportLoading}
                                  className="shadow-none"
                                >
                                  <FileSpreadsheet className="size-4" />
                                  Import Excel
                                </Button>
                              </div>

                              {/* Report content */}
                              {reportLoading ? (
                                <><SkeletonGrid count={4} className="mb-4 sm:grid-cols-2" /><TableSkeleton /></>
                              ) : reportError ? (
                                <ApiErrorBanner message={reportError} onRetry={() => { void loadClassReport(); }} />
                              ) : reportData ? (
                                <div className="space-y-4">
                                  {reportTab !== "table" && <div className="grid grid-cols-2 overflow-hidden rounded-2xl bg-gradient-to-br from-primary-50/60 via-white to-sky-50/60">
                                    {[
                                      { label: "Total students", value: reportData.stats.totalStudents, icon: GraduationCap },
                                      { label: "Passed", value: reportData.stats.passedCount, icon: CheckCircle2 },
                                      { label: "Failed", value: reportData.stats.failedCount, icon: AlertCircle },
                                      { label: "Class average", value: `${reportData.stats.classAverage.toFixed(1)}%`, icon: BarChart2 },
                                    ].map(({ label, value, icon: Icon }, index) => (
                                      <div key={label} className={cn("min-w-0 p-2.5 sm:p-3", index % 2 === 0 && "border-r border-gray-100", index < 2 && "border-b border-gray-100")}>
                                        <div className="flex items-center gap-1.5 text-sm font-medium leading-4 text-gray-700"><Icon aria-hidden="true" className="size-3.5 shrink-0" />{label}</div>
                                        <span className="mt-1.5 block text-[22px] font-medium leading-none tabular-nums text-gray-950">{value}</span>
                                      </div>
                                    ))}
                                  </div>}

                                  {/* Report sub-tabs */}
                                  <ScrollableTabs
                                    ariaLabel="Report sections"
                                    options={[
                                      { value: "table", label: "Result Sheet" },
                                      { value: "marklist", label: "Mark Cards" },
                                      { value: "status", label: "Final Status" },
                                      { value: "posters", label: "Rank Posters" },
                                    ]}
                                    value={reportTab}
                                    onValueChange={(value) => { setReportTab(value as ReportTab); setMarklistStudId(null); setPosterStudentId(null); }}
                                  />

                                  {/* Tab content */}
                                  {reportTab === "table" && resultSheetData && (
                                    <ClassResultTable report={resultSheetData} madrasaName={resultSheetData.clientName ?? ""} teacherView teacherControlsContainer={reportControlsContainer} />
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
                                if (classDrawerExamId && markEntry.classId && markEntry.subjectId) {
                                  await loadMarkEntrySubject(classDrawerExamId, markEntry.classId, markEntry.subjectId, markEntry.students);
                                }
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
          </>
        )}
      </ResponsivePopover>

      {/* Create / Edit Exam */}
      <ResponsivePopover
        open={drawerOpen}
        onOpenChange={(open) => {
          if (submitting) return;
          setDrawerOpen(open);
          if (!open) setActiveDateField(null);
        }}
        side="bottom"
        desktopView="right-drawer"
        title={drawerMode === "create" ? "Create New Exam" : "Edit Exam"}
        description="Define dates and configuration for term exams"
        className="mx-auto w-full max-w-xl rounded-t-2xl shadow-none"
        showCloseButton={!submitting}
        footer={
          <div className="flex justify-end gap-2 border-t border-gray-100 bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <Button type="button" variant="outline" size="lg" className="rounded-xl shadow-none" disabled={submitting} onClick={() => setDrawerOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="admin-exam-form" size="lg" className="rounded-xl shadow-none" disabled={submitting}>
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

      <ResponsivePopover
        open={showDeleteExamConfirm && deleteExamTarget !== null}
        onOpenChange={(open) => { if (!open && deletingId === null) setShowDeleteExamConfirm(false); }}
        title="Delete exam?"
        description={deleteExamTarget ? "Deleting " + deleteExamTarget.name + " cannot be undone." : undefined}
        side="bottom"
        desktopView="right-drawer"
        className="shadow-none"
        
        footer={
          <div className="flex gap-3 border-t border-gray-100 bg-white px-5 py-4">
            <Button type="button" variant="outline" disabled={deletingId !== null} onClick={() => setShowDeleteExamConfirm(false)} className="flex-1 shadow-none">Cancel</Button>
            <Button type="button" variant="destructive" disabled={deletingId !== null} onClick={handleDeleteExam} className="flex-1 shadow-none">
              {deletingId !== null && <Loader2 className="size-4 animate-spin" />} Delete
            </Button>
          </div>
        }
      >
        <p className="text-sm text-gray-600">Delete <strong>{deleteExamTarget?.name}</strong>?</p>
      </ResponsivePopover>
    </DashboardLayout>
  );
}
