import { useState, useCallback, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { useExams, useCreateExam, useUpdateExam, useDeleteExam, useClasses, useSubjects, useStudents, useResults, useBulkUpsertResults } from "@/lib/api-hooks";
import { type ExamRecord, type ExamStatus } from "@/lib/exams-api";
import { type SubjectRecord } from "@/lib/subjects-api";
import { useAuthStore } from "@/store/auth";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  Plus, Loader2, Trash2, ChevronDown, ChevronUp, Search,
  X, Calendar, Edit2, RefreshCw,
  AlertCircle, PenLine, Save, CheckCircle2, BarChart2,
  GraduationCap, Award, Clock, ClipboardCheck, Trophy
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ExamStatusBadge, getExamStatusInfo } from "@/components/exam/ExamStatusBadge";

type TabFilter = "ALL" | "DRAFT" | "MARK_ENTRY" | "PUBLISHED" | "CANCELLED";

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
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
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
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const ayId    = user?.defaultAcademicYearId ?? "";

  const goToClassReport = (examId: string, classId: string) => {
    const back = location.pathname;
    navigate(`${location.pathname.replace(/\/exams.*/, "/exams")}/class-report?examId=${examId}&classId=${classId}&ayId=${ayId}&back=${encodeURIComponent(back)}`);
  };

  const { data: examData, isLoading: loading, error: pageError } = useExams({ limit: 100 });
  const exams = (examData?.data ?? []).filter((e) => e.type === "TERM_EXAM" || !e.type);

  const { data: classesData = [] } = useClasses();
  const classes = classesData;

  // Filters
  const [selectedTab, setSelectedTab] = useState<TabFilter>("ALL");
  const [searchText, setSearchText] = useState("");

  // Expanded card state
  const [expandedId, setExpandedId]         = useState<string | null>(null);

  // Mark entry panel
  const [markEntryOpen, setMarkEntryOpen]   = useState<string | null>(null);
  const [expandedEntryClassId, setExpandedEntryClassId] = useState<string | null>(null);

  // Mutation hooks
  const createExamMutation = useCreateExam();
  const updateExamMutation = useUpdateExam();
  const deleteExamMutation = useDeleteExam();
  const bulkUpsertMutation = useBulkUpsertResults();

  // Action Drawer State
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<"create" | "edit">("create");
  const [form, setForm] = useState<ExamForm>(EMPTY_FORM);

  // Deletion modals state
  const [showDeleteExamConfirm, setShowDeleteExamConfirm] = useState(false);
  const [deleteExamTarget, setDeleteExamTarget] = useState<ExamRecord | null>(null);

  const toggleExpand = useCallback((examId: string) => {
    if (expandedId === examId) { setExpandedId(null); setMarkEntryOpen(null); return; }
    setExpandedId(examId);
  }, [expandedId]);

  // ── Form Actions ────────────────────────────────────────────────────────────

  const openCreateDrawer = () => {
    setForm(EMPTY_FORM);
    setDrawerMode("create");
    setDrawerOpen(true);
  };

  const openEditDrawer = (exam: ExamRecord) => {
    setForm({
      name: exam.name,
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
    setExpandedId(exam.id);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) return;

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

    if (drawerMode === "create") {
      createExamMutation.mutate(payload, {
        onSuccess: () => { setDrawerOpen(false); setForm(EMPTY_FORM); },
      });
    } else {
      if (!expandedId) return;
      updateExamMutation.mutate({ id: expandedId, data: payload }, {
        onSuccess: () => { setDrawerOpen(false); setForm(EMPTY_FORM); },
      });
    }
  };

  const startDeleteExam = (exam: ExamRecord) => {
    setDeleteExamTarget(exam);
    setShowDeleteExamConfirm(true);
  };

  const handleDeleteExam = () => {
    if (!deleteExamTarget) return;
    deleteExamMutation.mutate(deleteExamTarget.id, {
      onSuccess: () => {
        setShowDeleteExamConfirm(false);
        setDeleteExamTarget(null);
      },
      onError: (e: any) => {
        alert(e.message ?? "Delete failed");
      },
    });
  };

  // ── Mark entry (admin) ─────────────────────────────────────────────────────

  const openMarkEntry = (examId: string, classId: string) => {
    setMarkEntryOpen(examId);
    setExpandedEntryClassId(classId);
  };

  // ── Filtering logic ─────────────────────────────────────────────────────────

  const filteredExams = exams.filter((exam) => {
    // 1. Search text filter
    if (searchText && !exam.name.toLowerCase().includes(searchText.toLowerCase())) {
      return false;
    }
    // 2. Tab filter
    switch (selectedTab) {
      case "DRAFT":
        return exam.examStatus === "DRAFT";
      case "MARK_ENTRY":
        return exam.examStatus === "MARK_ENTRY";
      case "PUBLISHED":
        return exam.examStatus === "PUBLISHED";
      case "CANCELLED":
        return exam.examStatus === "CANCELLED";
      case "ALL":
      default:
        return true;
    }
  });

  const upcomingExams = exams.filter((e) => e.startDate && new Date(e.startDate) > new Date());
  const markEntryOpenExams = exams.filter((e) => e.examStatus === "MARK_ENTRY" && (!e.markEntryLastDate || new Date(e.markEntryLastDate) >= new Date()));
  const completedExams = exams.filter((e) => {
    if (e.examStatus === "PUBLISHED") return false;
    if (e.markEntryLastDate && new Date(e.markEntryLastDate) < new Date()) return true;
    return false;
  });
  const publishedExams = exams.filter((e) => e.examStatus === "PUBLISHED");

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
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm px-4 py-2.5 rounded-xl transition-all shadow-sm shadow-emerald-100 hover:scale-[1.01]"
            >
              <Plus className="w-4 h-4" /> Create Exam
            </button>
          }
        />

        {/* Stat Cards Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Upcoming Exams", value: upcomingExams.length, color: "bg-emerald-50 text-emerald-600 border border-emerald-100", icon: Clock },
            { label: "Mark Entry Open", value: markEntryOpenExams.length, color: "bg-amber-50 text-amber-600 border border-amber-100", icon: PenLine },
            { label: "Completed", value: completedExams.length, color: "bg-purple-50 text-purple-600 border border-purple-100", icon: ClipboardCheck },
            { label: "Results Published", value: publishedExams.length, color: "bg-teal-50 text-teal-600 border border-teal-100", icon: Trophy }
          ].map((st, i) => (
            <div key={i} className="bg-white rounded-3xl border border-gray-100 p-5 flex items-center gap-4 shadow-xs">
              <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-inner", st.color)}>
                <st.icon className="w-5.5 h-5.5" />
              </div>
              <div>
                <p className="text-2xl font-extrabold text-gray-900 leading-none">{st.value}</p>
                <p className="text-[10px] text-gray-400 mt-1.5 uppercase font-bold tracking-wider">{st.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Global errors */}
        {pageError && (
          <div className="bg-rose-50 border border-rose-100 text-rose-600 text-sm px-4 py-3 rounded-2xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" /> {pageError.message}
          </div>
        )}
        {createExamMutation.error && (
          <div className="bg-rose-50 border border-rose-100 text-rose-600 text-sm px-4 py-3 rounded-2xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" /> {createExamMutation.error.message}
          </div>
        )}
        {updateExamMutation.error && (
          <div className="bg-rose-50 border border-rose-100 text-rose-600 text-sm px-4 py-3 rounded-2xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" /> {updateExamMutation.error.message}
          </div>
        )}

        {/* Filters and Tabs */}
        <div className="space-y-4">
          {/* Tab lists */}
          <div className="border-b border-gray-100 flex gap-1 overflow-x-auto no-scrollbar py-0.5">
            {(["ALL", "DRAFT", "MARK_ENTRY", "PUBLISHED", "CANCELLED"] as const).map((t) => {
              const labels: Record<TabFilter, string> = {
                ALL: "All Term Exams",
                DRAFT: "Draft",
                MARK_ENTRY: "Mark Entry Open",
                PUBLISHED: "Published",
                CANCELLED: "Cancelled",
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

          {/* Search bar */}
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
        </div>

        {/* Main Exam List */}
        {loading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-28 rounded-3xl" />
              ))}
            </div>
            <Skeleton className="h-10 w-80 rounded-xl" />
            <Skeleton className="h-4 w-32 rounded-lg" />
            <Skeleton className="h-12 rounded-xl" />
            <div className="space-y-4">
              {Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-40 rounded-3xl" />
              ))}
            </div>
          </div>
        ) : filteredExams.length === 0 ? (
          <div className="text-center py-20 bg-white border border-gray-100 rounded-3xl p-6">
            <GraduationCap className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-sm font-semibold text-gray-900">No term exams found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredExams.map((exam) => {
              const isExpanded = expandedId === exam.id;
              const { description } = getExamStatusInfo(exam);

              return (
                <div key={exam.id} className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md/50 transition-shadow">
                  
                  {/* Card Header Section */}
                  <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-4 min-w-0">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0 shadow-inner">
                        <GraduationCap className="w-6 h-6" />
                      </div>
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-gray-900 text-base leading-tight truncate">{exam.name}</h3>
                          <ExamStatusBadge exam={exam} />
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

                    {/* Quick actions & Subtext */}
                    <div className="flex flex-col sm:flex-row md:flex-col sm:items-center md:items-end justify-between md:justify-center gap-3 shrink-0 border-t md:border-none pt-3 md:pt-0 border-gray-50">
                      {description && (
                        <p className="text-xs text-gray-500">{description}</p>
                      )}
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditDrawer(exam)}
                          className="px-4 py-2 border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold text-xs rounded-xl transition-colors inline-flex items-center gap-1.5"
                        >
                          <Edit2 className="w-3.5 h-3.5" /> Edit
                        </button>
                        
                        <button
                          onClick={() => toggleExpand(exam.id)}
                          className="px-3 py-2 border border-gray-200 hover:bg-gray-50 text-gray-600 font-bold text-xs rounded-xl transition-colors inline-flex items-center gap-1"
                        >
                          View Classes {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>

                        {/* Direct Delete button */}
                        <button
                          onClick={() => startDeleteExam(exam)}
                          className="p-2 border border-gray-200 hover:bg-rose-50 hover:text-rose-600 text-gray-500 rounded-xl transition-colors"
                          type="button"
                          title="Delete Exam"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Expanded class-wise list details */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-gray-50 bg-gray-50/30"
                      >
                        <div className="p-5 space-y-4">
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Class Wise Reports &amp; Entry</p>

                          {/* List of classes grid */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {classes.map((cls) => (
                              <div key={cls.id} className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center justify-between shadow-xs">
                                <div>
                                  <h4 className="font-bold text-gray-900 text-sm">{cls.name}</h4>
                                  <p className="text-[10px] text-gray-400 mt-0.5">Teacher: {cls.classTeacher?.name ?? "Not Assigned"}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => goToClassReport(exam.id, cls.id)}
                                    className="p-2 border border-gray-200 hover:bg-emerald-50 hover:text-emerald-600 rounded-xl text-gray-500 transition-colors"
                                    title="View Class Report"
                                  >
                                    <BarChart2 className="w-4.5 h-4.5" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      if (markEntryOpen === exam.id && expandedEntryClassId === cls.id) {
                                        setMarkEntryOpen(null);
                                      } else {
                                        openMarkEntry(exam.id, cls.id);
                                      }
                                    }}
                                    className="p-2 border border-gray-200 hover:bg-emerald-50 hover:text-emerald-600 rounded-xl text-gray-500 transition-colors"
                                    title="Enter Marks"
                                  >
                                    <PenLine className="w-4.5 h-4.5" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Inline Mark Entry (if open for a class) */}
                          {markEntryOpen === exam.id && (
                            <MarkEntryInline
                              examId={exam.id}
                              classId={expandedEntryClassId!}
                              ayId={ayId}
                              classLabel={classes.find((c) => c.id === expandedEntryClassId)?.name ?? ""}
                              onClose={() => { setMarkEntryOpen(null); setExpandedEntryClassId(null); }}
                            />
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
                  <h2 className="text-lg font-extrabold text-gray-900 tracking-tight">{drawerMode === "create" ? "Create New Exam" : "Edit Exam"}</h2>
                  <p className="text-xs text-gray-400 mt-1">Define dates and configuration for term exams</p>
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
                    disabled={createExamMutation.isPending || updateExamMutation.isPending}
                    className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold disabled:opacity-60 flex items-center justify-center gap-2 transition-colors shadow-sm shadow-emerald-100"
                  >
                    {(createExamMutation.isPending || updateExamMutation.isPending) && <Loader2 className="w-4 h-4 animate-spin" />}
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
              onClick={() => !deleteExamMutation.isPending && setShowDeleteExamConfirm(false)}
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
                  disabled={deleteExamMutation.isPending}
                  className="py-2.5 rounded-xl border border-gray-200 text-gray-600 font-bold text-xs hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteExam}
                  disabled={deleteExamMutation.isPending}
                  className="py-2.5 rounded-xl bg-rose-600 text-white font-bold text-xs hover:bg-rose-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-1"
                >
                  {deleteExamMutation.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                  {deleteExamMutation.isPending ? "Deleting…" : "Delete"}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}

// ── Mark Entry Inline Component ──────────────────────────────────────────────

function MarkEntryInline({
  examId, classId, ayId, classLabel, onClose,
}: {
  examId: string;
  classId: string;
  ayId: string;
  classLabel: string;
  onClose: () => void;
}) {
  const [subjectId, setSubjectId] = useState("");

  const { data: subData, isLoading: subsLoading } = useSubjects({ classId, limit: 200 });
  const { data: stuData, isLoading: stusLoading } = useStudents({ classId, limit: 500 });
  const resultsQuery = useResults(
    subjectId ? { examId, classId, limit: 500 } : { examId: "", classId: "", limit: 0 },
  );

  const bulkUpsertMutation = useBulkUpsertResults();

  const subjects = subData?.data ?? [];
  const students = stuData?.data ?? [];

  const [scores, setScores] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Pre-populate scores when subject or results change
  useEffect(() => {
    if (!resultsQuery.data || !subjectId) return;
    const rows = resultsQuery.data.data ?? [];
    const scoreMap: Record<string, string> = {};
    students.forEach((s) => {
      const r = rows.find((r: any) => r.student?.id === s.id && r.subject?.id === subjectId);
      scoreMap[s.id] = r != null ? String(r.score) : "";
    });
    setScores(scoreMap);
  }, [resultsQuery.data, subjectId, students]);

  const loading = subsLoading || stusLoading;

  const handleSave = () => {
    const items = students
      .filter((s) => scores[s.id] !== "" && scores[s.id] !== undefined)
      .map((s) => ({
        subjectId: subjectId,
        studentId: s.id,
        score: Number(scores[s.id]),
        totalMarks: 100,
      }));

    if (!items.length) return;

    setSaving(true);
    bulkUpsertMutation.mutate(
      {
        examId,
        classId,
        accademicYearId: ayId,
        results: items,
      },
      {
        onSuccess: () => {
          setSaving(false);
          setSaved(true);
          setTimeout(() => setSaved(false), 2000);
        },
        onError: () => {
          setSaving(false);
        },
      },
    );
  };

  return (
    <div className="bg-white rounded-3xl border border-emerald-100 p-5 space-y-4 shadow-sm">
      <div className="flex items-center justify-between border-b pb-2">
        <p className="text-xs font-bold text-emerald-700 uppercase tracking-wide">
          Mark Entry · {classLabel}
        </p>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X className="w-4.5 h-4.5" />
        </button>
      </div>

      {bulkUpsertMutation.error && (
        <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 px-3 py-2 rounded-xl">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {bulkUpsertMutation.error.message}
        </div>
      )}

      <div>
        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5">Select Subject</label>
        <select
          value={subjectId}
          onChange={(e) => setSubjectId(e.target.value)}
          disabled={subjects.length === 0}
          className="w-full sm:w-64 px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none disabled:opacity-50"
        >
          <option value="">Select subject</option>
          {subjects.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-6 text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      ) : students.length === 0 ? (
        <p className="text-xs text-gray-400 text-center py-4">No students in this class</p>
      ) : !subjectId ? (
        <p className="text-xs text-gray-400 text-center py-4">Select a subject to enter marks</p>
      ) : (
        <>
          <div className="rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-4 py-2 bg-gray-50 flex justify-between text-[10px] font-bold text-gray-400 uppercase">
              <span>Student</span>
              <span>Score / 100</span>
            </div>
            <div className="divide-y divide-gray-50 max-h-60 overflow-y-auto">
              {students.map((s: any) => {
                const score = scores[s.id] ?? "";
                return (
                  <div key={s.id} className="flex items-center justify-between px-4 py-2 bg-white">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{s.name}</p>
                      <p className="text-xs text-gray-400">{s.adno}</p>
                    </div>
                    <input
                      type="number" min={0} max={100} value={score}
                      onChange={(e) => setScores((p) => ({ ...p, [s.id]: e.target.value }))}
                      placeholder="—"
                      className="w-16 text-center px-2 py-1.5 border border-gray-200 rounded-xl text-sm font-bold focus:outline-none focus:border-emerald-400"
                    />
                  </div>
                );
              })}
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className={cn(
              "w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all",
              saved ? "bg-emerald-100 text-emerald-700" : "bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm"
            )}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {saving ? "Saving..." : saved ? "Saved" : "Save Marks"}
          </button>
        </>
      )}
    </div>
  );
}
