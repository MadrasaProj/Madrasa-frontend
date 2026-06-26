import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { ApiErrorBanner } from "@/components/ui/ApiErrorBanner";
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
import { cn } from "@/lib/utils";
import {
  GraduationCap,
  Plus,
  Loader2,
  Trash2,
  ChevronDown,
  ChevronUp,
  Pencil,
  X,
  Save,
  CheckCircle2,
  AlertCircle,
  PenLine,
  Calendar,
  Lock,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ExamStatusBadge, STATUS_LABELS } from "@/components/exam/ExamStatusBadge";

function fmt(d?: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
  });
}

export default function TeacherClassTestsPage() {
  const { user, accessToken, activeClientId } = useAuthStore();
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

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [results, setResults] = useState<ResultRecord[]>([]);
  const [loadingResults, setLoadingResults] = useState(false);

  const [showDrawer, setShowDrawer] = useState(false);
  const [editTarget, setEditTarget] = useState<ExamRecord | null>(null);
  const [formName, setFormName] = useState("");
  const [formClassId, setFormClassId] = useState("");
  const [formSubjectId, setFormSubjectId] = useState("");
  const [formStartDate, setFormStartDate] = useState("");
  const [formEndDate, setFormEndDate] = useState("");
  const [formStatus, setFormStatus] = useState<ExamStatus>("DRAFT");
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
    setFormStatus("DRAFT");
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
    setFormStatus(exam.examStatus);
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
        `Publish "${exam.name}"? Parents will be able to see results.`,
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

  const toggleExpand = async (examId: string) => {
    if (expandedId === examId) {
      setExpandedId(null);
      return;
    }
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
        const [students, subData] = await Promise.all([
          getStudents(cid, token, { classId: clsId, limit: 500 }),
          getSubjects(cid, token, { classId: clsId, limit: 200 }),
        ]);
        setMeStudents(students.data ?? []);
        setMeSubjects(subData.data ?? []);
        setMeSubjectId(subId || subData.data?.[0]?.id || "");
        const scoreMap: Record<string, string> = {};
        for (const s of students.data ?? []) {
          const found = r.find((res) => res.student?.id === s.id);
          if (found) scoreMap[s.id] = String(found.score);
        }
        setMeScores(scoreMap);
      } else {
        setMeStudents([]);
        setMeSubjects([]);
        setMeSubjectId("");
        setMeScores({});
      }
    } catch {
      setResults([]);
    } finally {
      setLoadingResults(false);
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
      <PageHeader
        title="Class Tests"
        icon={GraduationCap}
        subtitle={`${exams.length} tests`}
        action={
          <button
            onClick={openAdd}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors"
          >
            <Plus className="w-4 h-4" /> New Class Test
          </button>
        }
      />

      {error && (
        <ApiErrorBanner message={error} onRetry={() => load(filterClassId)} />
      )}

      <div className="flex gap-3 mb-4">
        <select
          value={filterClassId}
          onChange={(e) => {
            setFilterClassId(e.target.value);
            load(e.target.value);
          }}
          className="w-full max-w-xs px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="">All Classes</option>
          {teacherClasses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="space-y-3 pb-24">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-1/2" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
                <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
              </div>
            </div>
          ))}
        </div>
      ) : exams.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">
          No class tests yet. Create one to get started.
        </div>
      ) : (
        <div className="space-y-3 pb-24">
          {exams.map((exam) => {
            const isExpanded = expandedId === exam.id;
            const isDeleting = deleting === exam.id;
            return (
              <div
                key={exam.id}
                className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm"
              >
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <div
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => toggleExpand(exam.id)}
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-gray-900 text-sm">
                          {exam.name}
                        </p>
                        <ExamStatusBadge exam={exam} />
                      </div>
                      <div className="flex gap-3 mt-1 flex-wrap text-xs text-gray-500">
                        <span>{exam.class?.name ?? "—"}</span>
                        {exam.subject && <span>· {exam.subject.name}</span>}
                        {exam.startDate && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />{" "}
                            {fmt(exam.startDate)} – {fmt(exam.endDate)}
                          </span>
                        )}
                        {(exam._count?.results ?? 0) > 0 && (
                          <span className="text-emerald-600 font-medium">
                            {exam._count!.results} results
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {canEditExam(exam) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openEdit(exam);
                          }}
                          className="p-1.5 rounded-lg text-gray-300 hover:text-emerald-600 transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      )}
                      {isAdmin && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteTarget(exam);
                            setShowDeleteConfirm(true);
                          }}
                          disabled={isDeleting}
                          className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 transition-colors"
                          title="Delete"
                        >
                          {isDeleting ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}
                      <button
                        onClick={() => toggleExpand(exam.id)}
                        className="p-1.5 text-gray-400"
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="border-t border-gray-100 bg-gray-50/50 px-4 py-3 space-y-3">
                        {loadingResults ? (
                          <div className="flex justify-center py-6">
                            <Loader2 className="w-4 h-4 animate-spin" />
                          </div>
                        ) : exam.examStatus === "PUBLISHED" ? (
                          <div className="rounded-2xl px-4 py-2.5 flex items-center gap-2 text-sm bg-emerald-50 text-emerald-600">
                            <CheckCircle2 className="w-4 h-4 shrink-0" />
                            <span>
                              Published
                              {exam.publishedDate
                                ? ` on ${fmt(exam.publishedDate)}`
                                : ""}{" "}
                              — parents can view results
                            </span>
                          </div>
                        ) : exam.examStatus === "CANCELLED" ? (
                          <div className="rounded-2xl px-4 py-2.5 flex items-center gap-2 text-sm bg-red-50 text-red-600">
                            <Lock className="w-4 h-4 shrink-0" />
                            <span>This exam has been cancelled</span>
                          </div>
                        ) : exam.examStatus !== "MARK_ENTRY" ? (
                          <div className="rounded-2xl px-4 py-2.5 flex items-center justify-between gap-2 text-sm bg-amber-50 text-amber-700">
                            <div className="flex items-center gap-2">
                              <Lock className="w-4 h-4 shrink-0" />
                              <span>
                                Exam is <strong>draft</strong> — mark entry not
                                open yet
                              </span>
                            </div>
                            {canEditExam(exam) && (
                              <button
                                onClick={() => handlePublish(exam)}
                                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shrink-0"
                              >
                                Publish
                              </button>
                            )}
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-2">
                              <select
                                value={exam.classId ?? ""}
                                onChange={(e) =>
                                  loadMeStudents(exam.id, e.target.value)
                                }
                                className="flex-1 px-3 py-1.5 border border-gray-200 rounded-xl text-xs bg-white focus:outline-none"
                              >
                                <option value={exam.classId ?? ""}>
                                  {exam.class?.name ?? "Select class"}
                                </option>
                              </select>
                              <select
                                value={meSubjectId}
                                onChange={(e) => setMeSubjectId(e.target.value)}
                                className="flex-1 px-3 py-1.5 border border-gray-200 rounded-xl text-xs bg-white focus:outline-none"
                              >
                                <option value="">Select subject</option>
                                {meSubjects.map((s) => (
                                  <option key={s.id} value={s.id}>
                                    {s.name}
                                  </option>
                                ))}
                              </select>
                              {canEditExam(exam) &&
                                exam._count?.results &&
                                exam._count.results > 0 && (
                                  <button
                                    onClick={() => handlePublish(exam)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shrink-0"
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    Publish
                                  </button>
                                )}
                              <button
                                onClick={() => handleMeSave(exam.id)}
                                disabled={meSaving || !meSubjectId}
                                className={cn(
                                  "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors",
                                  meSaved
                                    ? "bg-emerald-100 text-emerald-700"
                                    : "bg-emerald-600 text-white hover:bg-emerald-700",
                                )}
                              >
                                {meSaving ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : meSaved ? (
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                ) : (
                                  <PenLine className="w-3.5 h-3.5" />
                                )}
                                {meSaved ? "Saved" : "Save Marks"}
                              </button>
                            </div>

                            {meStudents.length === 0 ? (
                              <p className="text-xs text-gray-400 text-center py-4">
                                Select a class to enter marks
                              </p>
                            ) : (
                              <div className="rounded-xl border border-gray-100 overflow-hidden bg-white">
                                <div className="px-3 py-2 bg-gray-50 flex justify-between text-[10px] font-bold text-gray-400 uppercase border-b">
                                  <span>Student</span>
                                  <span>Score / {(() => {
                                    const currentSubject = meSubjects.find((s) => s.id === meSubjectId);
                                    return currentSubject?.classSubject?.maxMarks ?? exam.maxMarks ?? 50;
                                  })()}</span>
                                </div>
                                <div className="divide-y divide-gray-50 max-h-72 overflow-y-auto">
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
                                          return currentSubject?.classSubject?.maxMarks ?? exam.maxMarks ?? 50;
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
                    {editTarget ? "Edit Class Test" : "New Class Test"}
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
                      Test Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="e.g. Chapter 3 Quiz"
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-emerald-400 focus:bg-white transition-colors"
                    />
                  </div>

                  {!editTarget && (
                    <>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                          Class <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={formClassId}
                          onChange={(e) => {
                            setFormClassId(e.target.value);
                            setFormSubjectId("");
                          }}
                          className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-emerald-400 focus:bg-white transition-colors"
                        >
                          <option value="">Select class</option>
                          {teacherClasses.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                          Subject <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={formSubjectId}
                          onChange={(e) => handleSubjectChange(e.target.value)}
                          disabled={!formClassId}
                          className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-emerald-400 focus:bg-white transition-colors disabled:opacity-50"
                        >
                          <option value="">Select subject</option>
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
                        Start Date
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
                        End Date
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
                        Max Marks
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
                        Pass Marks
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
                        Status
                      </label>
                      <select
                        value={formStatus}
                        onChange={(e) =>
                          setFormStatus(e.target.value as ExamStatus)
                        }
                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-emerald-400 focus:bg-white transition-colors"
                      >
                        {(Object.keys(STATUS_LABELS) as ExamStatus[]).map(
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
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                    {editTarget ? "Save Changes" : "Create Test"}
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
                  Delete Class Test?
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
                  Cancel
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
                    "Delete"
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
