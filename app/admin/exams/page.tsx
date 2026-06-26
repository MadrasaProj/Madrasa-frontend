import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
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
import { getAllClasses, type ClassRecord } from "@/lib/classes-api";
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
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ExamStatusBadge,
  getExamStatusInfo,
} from "@/components/exam/ExamStatusBadge";
import { MarkEntryGrid } from "@/components/exam/MarkEntryGrid";

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

function fmt(d?: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function shortDate(d?: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
  });
}

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

const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export default function AdminExamsPage() {
  const { user, accessToken, activeClientId } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const cid = activeClientId ?? "";
  const token = accessToken ?? "";
  const ayId = user?.defaultAcademicYearId ?? "";

  const goToClassReport = (examId: string, classId: string) => {
    const back = location.pathname;
    navigate(
      `${location.pathname.replace(/\/exams.*/, "/exams")}/class-report?examId=${examId}&classId=${classId}&ayId=${ayId}&back=${encodeURIComponent(back)}`,
    );
  };

  const [exams, setExams] = useState<ExamRecord[]>([]);
  const [classes, setClasses] = useState<ClassRecord[]>([]);
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

  const [showDeleteExamConfirm, setShowDeleteExamConfirm] = useState(false);
  const [deleteExamTarget, setDeleteExamTarget] =
    useState<ExamRecord | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ── Load ───────────────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    if (!cid || !token) return;
    setPageError(null);
    setLoading(true);
    try {
      const [examData, classData] = await Promise.all([
        getExams(cid, token, { limit: 200 }),
        getAllClasses(cid, token),
      ]);
      const termExams = (examData.data ?? []).filter(
        (e) => e.type === "TERM_EXAM" || !e.type,
      );
      setExams(termExams);
      setClasses(classData);
    } catch (e: any) {
      setPageError(e.message ?? "Load failed");
    } finally {
      setLoading(false);
    }
  }, [cid, token]);

  useEffect(() => {
    loadData();
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
  };

  const selectClassTab = (classId: string) => {
    setSelectedClassTab(classId);
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
          totalMarks: 100,
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

  const upcomingExams = exams.filter(
    (e) => e.startDate && new Date(e.startDate) > new Date(),
  );
  const markEntryOpenExams = exams.filter(
    (e) =>
      e.examStatus === "MARK_ENTRY" &&
      (!e.markEntryLastDate || new Date(e.markEntryLastDate) >= new Date()),
  );
  const completedExams = exams.filter((e) => {
    if (e.examStatus === "PUBLISHED") return false;
    if (e.markEntryLastDate && new Date(e.markEntryLastDate) < new Date())
      return true;
    return false;
  });
  const publishedExams = exams.filter((e) => e.examStatus === "PUBLISHED");

  // ── Columns ────────────────────────────────────────────────────────────────

  const columns = useMemo<Column<ExamRecord>[]>(
    () => [
      {
        key: "name",
        header: "Exam",
        sortable: true,
        render: (exam) => (
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 text-sm truncate">
                {exam.name}
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5 truncate">
                {getExamStatusInfo(exam).description || "—"}
              </p>
            </div>
          </div>
        ),
      },
      {
        key: "examStatus",
        header: "Status",
        sortable: true,
        render: (exam) => <ExamStatusBadge exam={exam} />,
        className: "hidden sm:table-cell",
        headerClass: "hidden sm:table-cell",
      },
      {
        key: "startDate",
        header: "Exam Period",
        sortable: true,
        render: (exam) => (
          <div className="text-xs leading-tight">
            <p className="text-gray-800 font-semibold whitespace-nowrap">
              {shortDate(exam.startDate)} – {shortDate(exam.endDate)}
            </p>
            <p className="text-[10px] text-gray-400 mt-0.5">
              {fmt(exam.startDate)}
            </p>
          </div>
        ),
        className: "hidden md:table-cell",
        headerClass: "hidden md:table-cell",
      },
      {
        key: "markEntryLastDate",
        header: "Mark Entry",
        sortable: true,
        render: (exam) => (
          <span className="text-xs text-gray-700 font-medium whitespace-nowrap">
            {fmt(exam.markEntryLastDate)}
          </span>
        ),
        className: "hidden lg:table-cell",
        headerClass: "hidden lg:table-cell",
      },
      {
        key: "publishedDate",
        header: "Publish",
        sortable: true,
        render: (exam) => (
          <span className="text-xs text-gray-700 font-medium whitespace-nowrap">
            {fmt(exam.publishedDate)}
          </span>
        ),
        className: "hidden lg:table-cell",
        headerClass: "hidden lg:table-cell",
      },
      {
        key: "actions",
        header: "",
        render: (exam) => (
          <div className="flex items-center gap-1.5 justify-end">
            <button
              onClick={(e) => {
                e.stopPropagation();
                openEditDrawer(exam);
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors text-xs font-semibold"
              title="Edit"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Edit</span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                openClassDrawer(exam.id);
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors text-xs font-semibold"
              title="View Classes & Enter Marks"
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Classes</span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                startDeleteExam(exam);
              }}
              className="p-1.5 rounded-lg text-red-400 bg-red-50 hover:bg-red-100 hover:text-red-500 transition-colors"
              title="Delete Exam"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ),
        className: "text-right",
      },
    ],
    [],
  );

  return (
    <DashboardLayout>
      <div className="px-4 py-3 lg:px-8 lg:py-6 space-y-6">
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

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label: "Upcoming Exams",
              value: upcomingExams.length,
              color:
                "bg-emerald-50 text-emerald-600 border border-emerald-100",
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
          ].map((st, i) => (
            <div
              key={i}
              className="bg-white rounded-3xl border border-gray-100 p-5 flex items-center gap-4 shadow-xs"
            >
              <div
                className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-inner",
                  st.color,
                )}
              >
                <st.icon className="w-5.5 h-5.5" />
              </div>
              <div>
                <p className="text-2xl font-extrabold text-gray-900 leading-none">
                  {st.value}
                </p>
                <p className="text-[10px] text-gray-400 mt-1.5 uppercase font-bold tracking-wider">
                  {st.label}
                </p>
              </div>
            </div>
          ))}
        </div>

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
          mobileRender={(exam) => {
            const { description } = getExamStatusInfo(exam);
            return (
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0 shadow-inner">
                      <GraduationCap className="w-5.5 h-5.5" />
                    </div>
                    <div className="min-w-0 pt-0.5">
                      <p className="font-bold text-gray-900 text-sm leading-snug">
                        {exam.name}
                      </p>
                      {description && (
                        <p className="text-[10px] text-gray-400 mt-1 leading-relaxed">
                          {description}
                        </p>
                      )}
                    </div>
                  </div>
                  <ExamStatusBadge exam={exam} />
                </div>
                <div className="grid grid-cols-3 gap-3 text-[10px]">
                  <div className="bg-gray-50 rounded-xl p-2.5">
                    <p className="text-gray-400 uppercase font-bold tracking-wider">Exam Period</p>
                    <p className="text-gray-800 font-bold mt-1 leading-tight">
                      {shortDate(exam.startDate)} – {shortDate(exam.endDate)}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-2.5">
                    <p className="text-gray-400 uppercase font-bold tracking-wider">Mark Entry</p>
                    <p className="text-gray-800 font-bold mt-1 leading-tight">
                      {fmt(exam.markEntryLastDate)}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-2.5">
                    <p className="text-gray-400 uppercase font-bold tracking-wider">Publish</p>
                    <p className="text-gray-800 font-bold mt-1 leading-tight">
                      {fmt(exam.publishedDate)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditDrawer(exam);
                    }}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors text-xs font-bold"
                  >
                    <Edit2 className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openClassDrawer(exam.id);
                    }}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors text-xs font-bold"
                  >
                    <BarChart2 className="w-3.5 h-3.5" /> Classes
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      startDeleteExam(exam);
                    }}
                    className="p-2.5 rounded-xl text-red-400 bg-red-50 hover:bg-red-100 hover:text-red-500 transition-colors"
                    title="Delete Exam"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          }}
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
                            className="fixed top-0 right-0 h-full w-full max-w-2xl bg-white border-l border-gray-100 shadow-2xl z-50 pointer-events-auto flex flex-col"
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
                <div className="hidden md:flex flex-col gap-1 pt-5 overflow-y-auto shrink-0 border-r border-b border-gray-100">
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
                    <>
                      <div className="flex-1 overflow-y-auto overflow-x-hidden">
                        <div className="px-5 space-y-6 pt-5 pb-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-bold text-gray-900 text-base">
                                {selectedClass.name}
                              </h4>
                              {selectedClass.classTeacher?.name && (
                                <p className="text-xs text-gray-400 mt-0.5">
                                  {selectedClass.classTeacher.name}
                                </p>
                              )}
                            </div>
                            <button
                              onClick={() => {
                                goToClassReport(
                                  classDrawerExam.id,
                                  selectedClass.id,
                                );
                                closeClassDrawer();
                              }}
                              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors text-xs font-bold"
                            >
                              <BarChart2 className="w-4 h-4" /> Report
                            </button>
                          </div>

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
                        </div>
                      </div>

                    </>
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
