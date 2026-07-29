import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { ApiErrorBanner } from "@/components/ui/ApiErrorBanner";
import { DataTable, type Column, type SortDir } from "@/components/ui/DataTable";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  getExams,
  createExam,
  updateExam,
  deleteExam,
  type ExamRecord,
  type ExamStatus,
} from "@/lib/exams-api";
import {
  getResults,
  bulkUpsertResults,
  type ResultRecord,
} from "@/lib/results-api";
import { getMyClasses, type ClassRecord } from "@/lib/classes-api";
import { getSubjects, type SubjectRecord } from "@/lib/subjects-api";
import { getStudents, type StudentRecord } from "@/lib/students-api";
import { useAuthStore } from "@/store/auth";
import { useLanguageStore } from "@/store/language";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import {
  GraduationCap,
  Plus,
  Loader2,
  Trash2,
  Pencil,
  X,
  CheckCircle2,
  PenLine,
  Calendar,
  Clock,
  Trophy,
  Search,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ExamStatusBadge, STATUS_LABELS } from "@/components/exam/ExamStatusBadge";
import { useExamColumns } from "@/components/exam/ExamColumns";
import { ExamMobileCard } from "@/components/exam/ExamMobileCard";
import { GradeCard } from "@/components/exam/GradeCard";
import { fmt, getExamCategories } from "@/lib/exam-utils";

export default function TeacherClassTestsPage() {
  const { user, accessToken, activeClientId } = useAuthStore();
  const { lang } = useLanguageStore();
  const navigate = useNavigate();
  const location = useLocation();
  const cid = activeClientId ?? "";
  const token = accessToken ?? "";
  const ayId = user?.defaultAcademicYearId ?? "";

  const [isMobile, setIsMobile] = useState(true);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ExamRecord | null>(null);
  const isAdmin =
    user?.actorType === "SUPER_ADMIN" || user?.actorType === "CLIENT_ADMIN";

  const canEditExam = (exam: ExamRecord) => {
    if (isAdmin) return true;
    const cls = classes.find((c) => c.id === exam.classId);
    if (!cls) return false;
    if (cls.classTeacherId === user?.id) return true;
    if (user?.attendanceMode === "PERIOD_BASED" && exam.subjectId) {
      const sub = subjects.find((s) => s.id === exam.subjectId);
      if (sub?.teacherId === user?.id) return true;
    }
    return false;
  };

  const [exams, setExams] = useState<ExamRecord[]>([]);
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [subjects, setSubjects] = useState<SubjectRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterClassId, setFilterClassId] = useState("");

  const [results, setResults] = useState<ResultRecord[]>([]);

  const [showDrawer, setShowDrawer] = useState(false);
  const [editTarget, setEditTarget] = useState<ExamRecord | null>(null);
  const [formName, setFormName] = useState("");
  const [formClassId, setFormClassId] = useState("");
  const [formSubjectId, setFormSubjectId] = useState("");
  const [formStartDate, setFormStartDate] = useState("");
  const [formEndDate, setFormEndDate] = useState("");
  const [formStatus, setFormStatus] = useState<ExamStatus>("MARK_ENTRY");
  const [formMaxMarks, setFormMaxMarks] = useState("100");
  const [formPassMarks, setFormPassMarks] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);

  const [meStudents, setMeStudents] = useState<StudentRecord[]>([]);
  const [meSubjects, setMeSubjects] = useState<SubjectRecord[]>([]);
  const [meSubjectId, setMeSubjectId] = useState("");
  const [meScores, setMeScores] = useState<Record<string, string>>({});
  const [meSaving, setMeSaving] = useState(false);
  const [meSaved, setMeSaved] = useState(false);
  const [showMarkEntry, setShowMarkEntry] = useState(false);
  const [markEntryExam, setMarkEntryExam] = useState<ExamRecord | null>(null);
  const [markEntryTab, setMarkEntryTab] = useState<"marks" | "grades">("marks");

  const [searchText, setSearchText] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState<string | undefined>("startDate");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const isPeriodBased = user?.attendanceMode === "PERIOD_BASED";
  const teacherId = user?.id ?? "";

  const myClassIds = new Set(
    subjects.filter((s) => s.teacherId === teacherId).map((s) => s.classId),
  );
  const teacherClasses = isPeriodBased
    ? classes.filter(
        (c) => myClassIds.has(c.id) || c.classTeacherId === teacherId,
      )
    : classes.filter((c) => c.classTeacherId === teacherId);

  const { upcoming: upcomingExams, markEntryOpen: markEntryOpenExams, completed: completedExams, published: publishedExams } = getExamCategories(exams);

  const searchFiltered = useMemo(() => {
    const q = searchText.toLowerCase();
    return exams.filter((exam) => {
      if (q && !exam.name.toLowerCase().includes(q)) return false;
      if (filterClassId && exam.classId !== filterClassId) return false;
      return true;
    });
  }, [exams, searchText, filterClassId]);

  const sortedExams = useMemo(() => {
    if (!sortBy) return searchFiltered;
    const arr = [...searchFiltered];
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
  }, [searchFiltered, sortBy, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sortedExams.length / pageSize));
  const pagedExams = useMemo(
    () => sortedExams.slice((page - 1) * pageSize, page * pageSize),
    [sortedExams, page, pageSize],
  );

  useEffect(() => {
    setPage(1);
  }, [searchText, pageSize, filterClassId]);

  const openMarkEntry = async (exam: ExamRecord) => {
    setMarkEntryExam(exam);
    setShowMarkEntry(true);
    setMarkEntryTab("marks");
    setMeSaving(false);
    setMeSaved(false);
    try {
      const clsId = exam.classId ?? "";
      const [stuData, subData] = await Promise.all([
        getStudents(cid, token, { classId: clsId, limit: 500 }),
        getSubjects(cid, token, { classId: clsId, limit: 200 }),
      ]);
      const existing = results.filter((r) =>
        subData.data?.some((s) => s.id === r.subject?.id),
      );
      const scoreMap: Record<string, string> = {};
      for (const s of stuData.data ?? []) {
        const found = existing.find((r) => r.student?.id === s.id);
        if (found) scoreMap[s.id] = String(found.score);
      }
      setMeStudents(stuData.data ?? []);
      setMeSubjects(subData.data ?? []);
      setMeSubjectId(exam.subjectId || subData.data?.[0]?.id || "");
      setMeScores(scoreMap);
    } catch {
      setMeStudents([]);
      setMeSubjects([]);
      setMeSubjectId("");
      setMeScores({});
    }
  };

  const columns = useExamColumns({
    onEnterMarks: (exam) => openMarkEntry(exam),
    onViewResults: (exam) => openMarkEntry(exam),
    onEdit: (exam) => openEdit(exam),
    onDelete: isAdmin ? (exam) => { setDeleteTarget(exam); setShowDeleteConfirm(true); } : undefined,
  });

  const load = useCallback(
    async (clsId?: string) => {
      if (!cid || !token) return;
      setLoading(true);
      setError(null);
      try {
        const [examData, clsData, subData] = await Promise.all([
          getExams(cid, token, {
            type: "CLASS_TEST",
            limit: 100,
            classId: clsId || undefined,
          }),
          getMyClasses(cid, token),
          getSubjects(cid, token, {}),
        ]);
        setExams(examData.data ?? []);
        setClasses(clsData);
        setSubjects(subData.data ?? []);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    },
    [cid, token],
  );

  useEffect(() => {
    load(filterClassId);
  }, [load]);

  const openAdd = () => {
    setEditTarget(null);
    setFormName("");
    setFormClassId("");
    setFormSubjectId("");
    setFormStartDate("");
    setFormEndDate("");
    setFormStatus("MARK_ENTRY");
    setFormMaxMarks("100");
    setFormPassMarks("");
    setSaveError("");
    setShowDrawer(true);
  };

  const openEdit = (exam: ExamRecord) => {
    setEditTarget(exam);
    setFormName(exam.name);
    setFormClassId(exam.classId ?? "");
    setFormSubjectId(exam.subjectId ?? "");
    setFormStartDate(exam.startDate?.slice(0, 10) ?? "");
    setFormEndDate(exam.endDate?.slice(0, 10) ?? "");
    setFormStatus(
      exam.examStatus === "MARK_ENTRY" || exam.examStatus === "PUBLISHED"
        ? exam.examStatus
        : "MARK_ENTRY"
    );
    setFormMaxMarks(String(exam.maxMarks ?? 100));
    setFormPassMarks(exam.passMarks != null ? String(exam.passMarks) : "");
    setSaveError("");
    setShowDrawer(true);
  };

  const handleSubjectChange = (subjectId: string) => {
    setFormSubjectId(subjectId);
    if (subjectId) {
      const subject = subjects.find((s) => s.id === subjectId);
      const classSubjectData = subject?.classSubject;
      if (classSubjectData) {
        if (classSubjectData.maxMarks != null) {
          setFormMaxMarks(String(classSubjectData.maxMarks));
        }
        if (classSubjectData.passMarks != null) {
          setFormPassMarks(String(classSubjectData.passMarks));
        }
      }
    }
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      setSaveError("Name is required");
      return;
    }
    if (!formClassId) {
      setSaveError("Class is required");
      return;
    }
    if (!formSubjectId) {
      setSaveError("Subject is required");
      return;
    }
    const maxMarks = Number(formMaxMarks) || 100;
    const passMarks = formPassMarks ? Number(formPassMarks) : undefined;
    setSaving(true);
    setSaveError("");
    try {
      if (editTarget) {
        const updated = await updateExam(cid, token, editTarget.id, {
          name: formName.trim(),
          startDate: formStartDate || null,
          endDate: formEndDate || null,
          examStatus: formStatus,
          maxMarks,
          passMarks,
        });
        setExams((prev) =>
          prev.map((e) => (e.id === updated.id ? { ...e, ...updated } : e)),
        );
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
          maxMarks,
          passMarks,
        });
        setExams((prev) => [...prev, created]);
      }
      setShowDrawer(false);
    } catch (e) {
      setSaveError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    setDeleting(id);
    try {
      await deleteExam(cid, token, id);
      setExams((prev) => prev.filter((e) => e.id !== id));
      setShowDeleteConfirm(false);
      setDeleteTarget(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setDeleting(null);
    }
  };

  const handlePublish = async (exam: ExamRecord) => {
    if (
      !window.confirm(
        t("teacherPages", "publishConfirmMsg", lang).replace("{name}", exam.name),
      )
    )
      return;
    try {
      const updated = await updateExam(cid, token, exam.id, {
        examStatus: "PUBLISHED",
        publishedDate: new Date().toISOString(),
      });
      setExams((prev) =>
        prev.map((e) => (e.id === updated.id ? { ...e, ...updated } : e)),
      );
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const loadMeStudents = async (examId: string, classId: string) => {
    setMeSaving(false);
    setMeSaved(false);
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
      setMeSubjects(subData.data ?? []);
      setMeSubjectId(subData.data?.[0]?.id ?? "");
      setMeScores(scoreMap);
    } catch {
      /* ignore */
    }
  };

  const handleMeSave = async (examId: string) => {
    if (!meSubjectId) return;
    const exam = exams.find((e) => e.id === examId);
    const currentSubject = meSubjects.find((s) => s.id === meSubjectId);
    const subjectMaxMarks = currentSubject?.classSubject?.maxMarks ?? exam?.maxMarks ?? 50;
    const items = meStudents
      .filter((s) => meScores[s.id] !== "" && meScores[s.id] !== undefined)
      .map((s) => ({
        subjectId: meSubjectId,
        studentId: s.id,
        score: Number(meScores[s.id]),
        totalMarks: subjectMaxMarks,
      }));
    if (!items.length) return;
    setMeSaving(true);
    try {
      await bulkUpsertResults(cid, token, {
        examId,
        classId:
          filterClassId || (exams.find((e) => e.id === examId)?.classId ?? ""),
        accademicYearId: ayId,
        results: items,
      });
      setMeSaved(true);
      setTimeout(() => setMeSaved(false), 3000);
      const data = await getResults(cid, token, { examId, limit: 2000 });
      setResults(data.data ?? []);
    } catch {
      /* ignore */
    } finally {
      setMeSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className=" py-3 lg:px-8 lg:py-6 space-y-6">

        <PageHeader
          title={t("nav", "classTests", lang)}
          subtitle="Manage class tests and enter marks"
          icon={GraduationCap}
          action={
            <button
              onClick={openAdd}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors"
            >
              <Plus className="w-4 h-4" /> {t("teacherPages", "newClassTestBtn", lang)}
            </button>
          }
        />

        {loading ? (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-3xl" />
              ))}
            </div>
            <div className="flex gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-24 rounded-t-xl" />
              ))}
            </div>
            <div className="grid grid-cols-1 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-32 rounded-3xl" />
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  label: t("teacherPages", "totalTestsLabel", lang),
                  value: exams.length,
                  color: "bg-blue-50 text-blue-600 border border-blue-100",
                  icon: GraduationCap,
                },
                {
                  label: t("teacherPages", "markEntryOpen", lang),
                  value: markEntryOpenExams.length,
                  color: "bg-amber-50 text-amber-600 border border-amber-100",
                  icon: PenLine,
                },
                {
                  label: t("teacherPages", "completedLabel", lang),
                  value: completedExams.length,
                  color: "bg-purple-50 text-purple-700 border border-purple-100",
                  icon: Clock,
                },
                {
                  label: t("teacherPages", "resultsPublishedLabel", lang),
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

            {error && (
              <ApiErrorBanner
                message={error}
                onRetry={() => {
                  setError(null);
                  load(filterClassId);
                }}
              />
            )}

            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search class test by name..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/20 focus:border-emerald-500 transition-all"
                />
                {searchText && (
                  <button
                    onClick={() => setSearchText("")}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <select
                value={filterClassId}
                onChange={(e) => {
                  setFilterClassId(e.target.value);
                }}
                className="px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">{t("adminPages", "allClasses", lang)}</option>
                {teacherClasses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <DataTable
              columns={columns}
              data={pagedExams}
              keyExtractor={(e) => e.id}
              loading={loading}
              error={null}
              emptyIcon={GraduationCap}
              emptyMessage="No class tests found"
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
                pageSizeOptions: [10, 20, 50, 100],
                onPageChange: setPage,
                onPageSizeChange: (sz) => {
                  setPageSize(sz);
                  setPage(1);
                },
              }}
              mobileRender={(exam) => (
                <ExamMobileCard
                  exam={exam}
                  onEdit={canEditExam(exam) ? (e) => openEdit(e) : undefined}
                  onDelete={isAdmin ? (e) => { setDeleteTarget(e); setShowDeleteConfirm(true); } : undefined}
                  onEnterMarks={(e) => openMarkEntry(e)}
                  onViewResults={(e) => openMarkEntry(e)}
                />
              )}
            />
          </>
        )}

      </div>

      {/* Add/Edit Drawer */}
      <AnimatePresence>
        {showDrawer && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !saving && setShowDrawer(false)}
              className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
            />
            <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center pointer-events-none md:p-4">
              <motion.div
                initial={isMobile ? { y: "100%" } : { opacity: 0, scale: 0.95 }}
                animate={isMobile ? { y: 0 } : { opacity: 1, scale: 1 }}
                exit={isMobile ? { y: "100%" } : { opacity: 0, scale: 0.95 }}
                transition={
                  isMobile
                    ? { type: "spring", damping: 30, stiffness: 300 }
                    : { duration: 0.2 }
                }
                className={cn(
                  "w-full bg-white flex flex-col pointer-events-auto shadow-2xl relative",
                  isMobile
                    ? "rounded-t-3xl max-h-[90dvh]"
                    : "rounded-3xl max-w-xl max-h-[85dvh]",
                )}
              >
                {/* Handle */}
                <div className="flex justify-center pt-3 pb-1 shrink-0 md:hidden">
                  <div className="w-10 h-1 bg-gray-300 rounded-full" />
                </div>
                <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 shrink-0">
                  <h2 className="font-bold text-gray-900 text-lg">
                    {editTarget ? t("teacherPages", "editClassTestTitle", lang) : t("teacherPages", "newClassTestTitle", lang)}
                  </h2>
                  <button
                    onClick={() => !saving && setShowDrawer(false)}
                    disabled={saving}
                    className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4 pb-8">
                  {saveError && (
                    <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl">
                      {saveError}
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                      {t("teacherPages", "testNameRequired", lang)} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder={t("teacherPages", "testNamePlaceholder", lang)}
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-emerald-400 focus:bg-white transition-colors"
                    />
                  </div>

                  {!editTarget && (
                    <>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                          {t("teacherPages", "classRequired", lang)} <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={formClassId}
                          onChange={(e) => {
                            setFormClassId(e.target.value);
                            setFormSubjectId("");
                          }}
                          className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-emerald-400 focus:bg-white transition-colors"
                        >
                          <option value="">{t("teacherPages", "selectClassOpt", lang)}</option>
                          {teacherClasses.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                          {t("teacherPages", "subjectRequired", lang)} <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={formSubjectId}
                          onChange={(e) => handleSubjectChange(e.target.value)}
                          disabled={!formClassId}
                          className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-emerald-400 focus:bg-white transition-colors disabled:opacity-50"
                        >
                          <option value="">{t("teacherPages", "selectSubjectOpt", lang)}</option>
                          {subjects
                            .filter((s) => s.classId === formClassId)
                            .filter(
                              (s) =>
                                !isPeriodBased || s.teacherId === teacherId,
                            )
                            .map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.name}
                              </option>
                            ))}
                        </select>
                      </div>
                    </>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                        {t("teacherPages", "startDateLabel", lang)}
                      </label>
                      <input
                        type="date"
                        value={formStartDate}
                        onChange={(e) => setFormStartDate(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-emerald-400 focus:bg-white transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                        {t("teacherPages", "endDateLabel", lang)}
                      </label>
                      <input
                        type="date"
                        value={formEndDate}
                        onChange={(e) => setFormEndDate(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-emerald-400 focus:bg-white transition-colors"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                        {t("teacherPages", "maxMarksLabel", lang)}
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={9999}
                        value={formMaxMarks}
                        onChange={(e) => setFormMaxMarks(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-emerald-400 focus:bg-white transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                        {t("teacherPages", "passMarksLabel", lang)}
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={9999}
                        value={formPassMarks}
                        onChange={(e) => setFormPassMarks(e.target.value)}
                        placeholder="Optional"
                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-emerald-400 focus:bg-white transition-colors"
                      />
                    </div>
                  </div>

                  {editTarget && (
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                        {t("common", "status", lang)}
                      </label>
                      <select
                        value={formStatus}
                        onChange={(e) =>
                          setFormStatus(e.target.value as ExamStatus)
                        }
                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-emerald-400 focus:bg-white transition-colors"
                      >
                        {(["MARK_ENTRY", "PUBLISHED"] as ExamStatus[]).map(
                          (s) => (
                            <option key={s} value={s}>
                              {STATUS_LABELS[s]}
                            </option>
                          ),
                        )}
                      </select>
                    </div>
                  )}
                </div>
                <div className="px-5 py-4 border-t border-gray-100 flex gap-3 shrink-0">
                  <button
                    onClick={() => !saving && setShowDrawer(false)}
                    disabled={saving}
                    className="flex-1 px-4 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 disabled:opacity-50"
                  >
                    {t("common", "cancel", lang)}
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                    {editTarget ? t("teacherPages", "saveChangesBtn", lang) : t("teacherPages", "createTestBtn", lang)}
                  </button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* Mark Entry Drawer */}
      <AnimatePresence>
        {showMarkEntry && markEntryExam && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !meSaving && setShowMarkEntry(false)}
              className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
            />
            <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center pointer-events-none md:p-4">
              <motion.div
                initial={isMobile ? { y: "100%" } : { opacity: 0, scale: 0.95 }}
                animate={isMobile ? { y: 0 } : { opacity: 1, scale: 1 }}
                exit={isMobile ? { y: "100%" } : { opacity: 0, scale: 0.95 }}
                transition={
                  isMobile
                    ? { type: "spring", damping: 30, stiffness: 300 }
                    : { duration: 0.2 }
                }
                className={cn(
                  "w-full bg-white flex flex-col pointer-events-auto shadow-2xl relative",
                  isMobile
                    ? "rounded-t-3xl max-h-[90dvh]"
                    : "rounded-3xl max-w-xl max-h-[85dvh]",
                )}
              >
                <div className="flex justify-center pt-3 pb-1 shrink-0 md:hidden">
                  <div className="w-10 h-1 bg-gray-300 rounded-full" />
                </div>
                <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 shrink-0">
                  <div>
                    <h2 className="font-bold text-gray-900 text-lg">
                      {t("teacherPages", "enterMarksTab", lang)}
                    </h2>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {markEntryExam.name} — {markEntryExam.class?.name ?? ""}
                    </p>
                  </div>
                  <button
                    onClick={() => !meSaving && setShowMarkEntry(false)}
                    disabled={meSaving}
                    className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Tabs */}
                {meStudents.length > 0 && meSubjectId && (
                  <div className="flex border-b border-gray-100 shrink-0">
                    <button
                      onClick={() => setMarkEntryTab("marks")}
                      className={cn(
                        "flex-1 px-4 py-2.5 text-xs font-semibold transition-colors border-b-2",
                        markEntryTab === "marks"
                          ? "text-emerald-600 border-emerald-600"
                          : "text-gray-400 border-transparent hover:text-gray-600"
                      )}
                    >
                      {t("teacherPages", "enterMarksTab", lang)}
                    </button>
                    <button
                      onClick={() => setMarkEntryTab("grades")}
                      className={cn(
                        "flex-1 px-4 py-2.5 text-xs font-semibold transition-colors border-b-2",
                        markEntryTab === "grades"
                          ? "text-emerald-600 border-emerald-600"
                          : "text-gray-400 border-transparent hover:text-gray-600"
                      )}
                    >
                      {t("teacherPages", "gradeCardTab", lang)}
                    </button>
                  </div>
                )}

                <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4 pb-8">
                  {/* Marks Tab */}
                  {markEntryTab === "marks" && (
                    <>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50 text-gray-700">
                          {meSubjects.find((s) => s.id === meSubjectId)?.name ?? "—"}
                        </div>
                        {canEditExam(markEntryExam) &&
                          markEntryExam._count?.results &&
                          markEntryExam._count.results > 0 && (
                            <button
                              onClick={() => handlePublish(markEntryExam)}
                              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shrink-0"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              {t("teacherPages", "publishBtn", lang)}
                            </button>
                          )}
                      </div>

                      {meStudents.length === 0 ? (
                        <p className="text-xs text-gray-400 text-center py-8">
                          {t("teacherPages", "loadingStudentsMsg", lang)}
                        </p>
                      ) : (
                        <div className="rounded-xl border border-gray-100 overflow-hidden bg-white">
                          <div className="px-3 py-2 bg-gray-50 flex justify-between text-[10px] font-bold text-gray-400 uppercase border-b">
                            <span>{t("teacherPages", "studentHeader", lang)}</span>
                            <span>{t("teacherPages", "scoreMaxLabel", lang).replace("{max}", String((() => {
                              const currentSubject = meSubjects.find((s) => s.id === meSubjectId);
                              return currentSubject?.classSubject?.maxMarks ?? markEntryExam.maxMarks ?? 50;
                            })()))}</span>
                          </div>
                          <div className="divide-y divide-gray-50 max-h-[50dvh] overflow-y-auto">
                            {meStudents.map((s) => (
                              <div
                                key={s.id}
                                className="flex items-center gap-3 px-3 py-2"
                              >
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-gray-900 truncate">
                                    {s.name}
                                  </p>
                                  <p className="text-xs text-gray-400">
                                    {s.adno}
                                  </p>
                                </div>
                                <input
                                  type="number"
                                  min={0}
                                  max={(() => {
                                    const currentSubject = meSubjects.find((s) => s.id === meSubjectId);
                                    return currentSubject?.classSubject?.maxMarks ?? markEntryExam.maxMarks ?? 50;
                                  })()}
                                  value={meScores[s.id] ?? ""}
                                  onChange={(e) =>
                                    setMeScores((m) => ({
                                      ...m,
                                      [s.id]: e.target.value,
                                    }))
                                  }
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

                  {/* Grades Tab */}
                  {markEntryTab === "grades" && meStudents.length > 0 && meSubjectId && (
                    <GradeCard
                      students={meStudents}
                      subjects={meSubjects}
                      subjectId={meSubjectId}
                      scores={meScores}
                      examMaxMarks={markEntryExam.maxMarks ?? undefined}
                      examName={markEntryExam.name}
                    />
                  )}
                </div>
                <div className="px-5 py-4 border-t border-gray-100 flex gap-3 shrink-0">
                  <button
                    onClick={() => !meSaving && setShowMarkEntry(false)}
                    disabled={meSaving}
                    className="flex-1 px-4 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 disabled:opacity-50"
                  >
                    {t("common", "close", lang)}
                  </button>
                  <button
                    onClick={() => handleMeSave(markEntryExam.id)}
                    disabled={meSaving || !meSubjectId}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl transition-colors",
                      meSaved
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50",
                    )}
                  >
                    {meSaving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : meSaved ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <PenLine className="w-4 h-4" />
                    )}
                    {meSaved ? "Saved" : t("teacherPages", "saveMarksBtn", lang)}
                  </button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* Standalone Delete Confirm Dialog */}
      <AnimatePresence>
        {showDeleteConfirm && deleteTarget && (
          <>
            <motion.div
              key="del-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !deleting && setShowDeleteConfirm(false)}
              className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm pointer-events-auto"
            />
            <motion.div
              key="del-dialog"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 bg-white rounded-3xl p-6 max-w-sm mx-auto shadow-2xl pointer-events-auto"
            >
              <div className="text-center space-y-3">
                <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto animate-bounce">
                  <Trash2 className="w-7 h-7 text-red-600" />
                </div>
                <h3 className="font-bold text-gray-900 text-lg">
                  {t("teacherPages", "deleteClassTestTitle", lang)}
                </h3>
                <p className="text-sm text-gray-500">
                  Are you sure you want to delete the class test{" "}
                  <strong>{deleteTarget.name}</strong>? All scores entered for
                  this test will be lost.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-6">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleting !== null}
                  className="py-3 rounded-2xl border border-gray-200 text-gray-700 font-semibold text-sm hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  {t("common", "cancel", lang)}
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting !== null}
                  className="py-3 rounded-2xl bg-red-600 text-white font-bold text-sm hover:bg-red-700 transition-colors disabled:opacity-60"
                >
                  {deleting !== null ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" /> Deleting…
                    </span>
                  ) : (
                    t("common", "delete", lang)
                  )}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}
