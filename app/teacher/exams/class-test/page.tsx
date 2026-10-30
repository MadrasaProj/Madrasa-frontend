import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { ApiErrorBanner } from "@/components/ui/ApiErrorBanner";
import type { SortDir } from "@/components/ui/DataTable";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  getExams,
  createExam,
  updateExam,
  deleteExam,
  type ExamRecord,
  type ExamStatus,
} from "@/lib/exams-api";
import { getResults, bulkUpsertResults, type ResultRecord } from "@/lib/results-api";
import { getMyClasses, type ClassRecord } from "@/lib/classes-api";
import { getSubjects, type SubjectRecord } from "@/lib/subjects-api";
import { getStudents, type StudentRecord } from "@/lib/students-api";
import { useAuthStore } from "@/store/auth";
import { useActiveClass } from "@/store/activeClass";
import { useLanguageStore } from "@/store/language";
import { t } from "@/lib/i18n";
import {
  Plus,
  Loader2,
  Trash2,
  CalendarDays,
  ClipboardCheck,
  Clock3,
  GraduationCap,
  Search,
  School,
  SlidersHorizontal,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ExamStatusBadge, getExamStatusInfo, STATUS_LABELS } from "@/components/exam/ExamStatusBadge";
import { TeacherMarkEntryView } from "@/components/exam/TeacherMarkEntryView";
import { fmt } from "@/lib/exam-utils";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Button } from "@/components/ui/button";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { ResponsivePopover } from "@/components/ui/responsivePopover";
import { DrawerSelector } from "@/components/DrawerSelector";
import { DatePickerInput } from "@/components/DatePickerInput";

function classTestPageItems(current: number, total: number): Array<number | "ellipsis"> {
  const pages = [...new Set([1, total, current - 1, current, current + 1])]
    .filter((page) => page >= 1 && page <= total)
    .sort((a, b) => a - b);
  const items: Array<number | "ellipsis"> = [];

  pages.forEach((page, index) => {
    const previous = pages[index - 1];
    if (previous && page - previous === 2) items.push(previous + 1);
    if (previous && page - previous > 2) items.push("ellipsis");
    items.push(page);
  });

  return items;
}

export default function TeacherClassTestsPage() {
  const { user, accessToken, activeClientId } = useAuthStore();
  const { lang } = useLanguageStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const cid = activeClientId ?? "";
  const token = accessToken ?? "";
  const ayId = user?.defaultAcademicYearId ?? "";

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
  const { activeClassId: filterClassId, activeClass } = useActiveClass();
  const previousClassId = useRef(filterClassId);

  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);

  useEffect(() => {
    if (previousClassId.current && previousClassId.current !== filterClassId) {
      setShowDrawer(false);
      setSelectedExamId(null);
      setSearchParams((prev) => { prev.delete("view"); prev.delete("examId"); return prev; });
    }
    previousClassId.current = filterClassId;
    setFormClassId(filterClassId);
  }, [filterClassId, setSearchParams]);

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
  const [meResults, setMeResults] = useState<ResultRecord[]>([]);
  const [meError, setMeError] = useState<string | null>(null);
  const [meLoading, setMeLoading] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [meSaving, setMeSaving] = useState(false);
  const [meSaved, setMeSaved] = useState(false);
  const isMarkEntryView = searchParams.get("view") === "mark-entry";
  const markEntryExam = exams.find((exam) => exam.id === searchParams.get("examId"));
  const selectedExam = exams.find((exam) => exam.id === selectedExamId);

  const [searchText, setSearchText] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState<string | undefined>("startDate");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const isPeriodBased = user?.attendanceMode === "PERIOD_BASED";
  const teacherId = user?.id ?? "";

  const selectedClassName = activeClass?.name ?? t("teacherPages", "noClassesAssigned", lang);

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

  const openMarkEntry = (exam: ExamRecord) => {
    setSelectedExamId(null);
    setSearchParams((prev) => {
      prev.set("view", "mark-entry");
      prev.set("examId", exam.id);
      return prev;
    });
  };

  const closeMarkEntry = () => {
    setImportOpen(false);
    setSearchParams((prev) => {
      prev.delete("view");
      return prev;
    });
  };

  const loadMarkEntry = useCallback(async (exam: ExamRecord) => {
    setMeSaved(false);
    setMeLoading(true);
    setMeError(null);
    try {
      const clsId = exam.classId ?? "";
      const [stuData, subData, resultData] = await Promise.all([
        getStudents(cid, token, { classId: clsId, limit: 500 }),
        getSubjects(cid, token, { classId: clsId, limit: 200 }),
        getResults(cid, token, { examId: exam.id, classId: clsId, limit: 2000 }),
      ]);
      const subjectId = exam.subjectId || subData.data?.[0]?.id || "";
      const existing = (resultData.data ?? []).filter((r) => r.subject?.id === subjectId);
      const scoreMap: Record<string, string> = {};
      for (const s of stuData.data ?? []) {
        const found = existing.find((r) => r.student?.id === s.id);
        scoreMap[s.id] = found ? String(found.score) : "";
      }
      setMeStudents(stuData.data ?? []);
      setMeSubjects((subData.data ?? []).filter((subject) => subject.id === subjectId));
      setMeSubjectId(subjectId);
      setMeResults(existing);
      setMeScores(scoreMap);
      setExams((prev) => prev.map((item) => item.id === exam.id
        ? { ...item, _count: { results: resultData.data?.length ?? 0 } }
        : item));
    } catch (e) {
      setMeError((e as Error).message);
      setMeStudents([]);
      setMeSubjects([]);
      setMeSubjectId("");
      setMeResults([]);
      setMeScores({});
    } finally {
      setMeLoading(false);
    }
  }, [cid, token]);

  useEffect(() => {
    if (isMarkEntryView && markEntryExam) void loadMarkEntry(markEntryExam);
  }, [isMarkEntryView, markEntryExam?.id, loadMarkEntry]);

  const load = useCallback(
    async (clsId?: string) => {
      if (!cid || !token || !clsId) { setExams([]); setLoading(false); return; }
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
  }, [load, filterClassId]);

  const openAdd = () => {
    setEditTarget(null);
    setFormName("");
    setFormClassId(filterClassId);
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

  const resetScores = () => {
    if (!window.confirm(t("teacherPages", "confirmResetMarks", lang))) return;
    const scoreMap: Record<string, string> = {};
    for (const student of meStudents) {
      const result = meResults.find((item) => item.student?.id === student.id);
      scoreMap[student.id] = result ? String(result.score) : "";
    }
    setMeScores(scoreMap);
  };

  const handleMeSave = async (submit = false) => {
    if (!markEntryExam || !meSubjectId || markEntryExam.examStatus !== "MARK_ENTRY") return;
    const exam = markEntryExam;
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
    if (!items.length) {
      setMeError(t("teacherPages", "noScoresEntered", lang));
      return;
    }
    setMeSaving(true);
    setMeError(null);
    try {
      await bulkUpsertResults(cid, token, {
        examId: exam.id,
        classId: exam.classId ?? "",
        accademicYearId: ayId,
        results: items,
      });
      await loadMarkEntry(exam);
      setMeSaved(true);
      setTimeout(() => {
        setMeSaved(false);
        if (submit) closeMarkEntry();
      }, 1500);
    } catch (e) {
      setMeError((e as Error).message);
    } finally {
      setMeSaving(false);
    }
  };

  const maxMarks = meSubjects[0]?.classSubject?.maxMarks ?? markEntryExam?.maxMarks ?? 50;
  const hasInvalidMarks = Object.values(meScores).some((value) =>
    value !== "" && (!Number.isFinite(Number(value)) || Number(value) < 0 || Number(value) > maxMarks),
  );
  const isLocked = !markEntryExam || markEntryExam.examStatus !== "MARK_ENTRY" ||
    (!!markEntryExam.markEntryLastDate && new Date() > new Date(markEntryExam.markEntryLastDate));
  const testSummary = [
    { label: "Total tests", value: searchFiltered.length, icon: GraduationCap, color: "text-primary-700" },
    { label: "Mark entry", value: searchFiltered.filter((exam) => exam.examStatus === "MARK_ENTRY").length, icon: ClipboardCheck, color: "text-primary-700" },
    { label: "Published", value: searchFiltered.filter((exam) => exam.examStatus === "PUBLISHED").length, icon: CalendarDays, color: "text-blue-700" },
    { label: "Draft", value: searchFiltered.filter((exam) => exam.examStatus === "DRAFT").length, icon: Clock3, color: "text-amber-700" },
  ];

  if (!loading && exams.length === 0) {
    return (
      <DashboardLayout>
        <div className="p-0! pb-6!">
          <PageHeader title={t("nav", "classTests", lang)} />
          <div className="flex min-h-[70vh] flex-col items-center justify-center gap-3 px-4 text-center">
            <img
              src="/icons/exams/empty-islamic.webp"
              alt=""
              className="h-64 w-64 max-w-[80vw] object-contain"
            />
            <div className="max-w-sm space-y-1">
              <h2 className="text-lg font-semibold text-gray-900">
                {t("teacherPages", "noClassTestsHeading", lang)}
              </h2>
              <p className="text-sm leading-6 text-gray-500">
                {t("teacherPages", "noClassTestsDescription", lang)}
              </p>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-0! pb-8!">
        <PageHeader title={t("nav", "classTests", lang)} />

        <div className="px-3 pb-2 pt-6">
          <div className="mx-auto flex w-full max-w-md items-center gap-2">
            <InputGroup className="h-10 min-w-0 flex-1 rounded-lg bg-white">
              <InputGroupInput
              type="search"
              aria-label="Search class tests by name"
              placeholder="Search class test by name..."
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
                aria-label="Sort class tests"
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

        {error && <ApiErrorBanner message={error} onRetry={() => { setError(null); load(filterClassId); }} />}

        {loading ? (
          <>
            <div className="mx-3 mb-3 overflow-hidden rounded-2xl bg-white">
              <Skeleton className="h-20 rounded-none" />
              <div className="grid grid-cols-2 gap-px bg-gray-100 sm:grid-cols-4">
                {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-20 rounded-none" />)}
              </div>
            </div>
            <div className="mx-3 divide-y divide-gray-100 overflow-hidden rounded-2xl bg-white">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="space-y-2 p-3">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <section className="mx-3 mb-3 overflow-hidden rounded-2xl bg-gradient-to-br from-white to-sky-50">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-3 py-2.5">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-semibold tabular-nums text-gray-950">{exams.length}</span>
                  <span className="text-xs font-medium text-gray-600">Total tests</span>
                </div>
                <span className="rounded-full border border-primary-100 bg-primary-50 px-2.5 py-1 text-xs font-medium text-primary-700">
                  <strong className="tabular-nums">{sortedExams.length}</strong> shown
                </span>
                <span className="flex min-w-0 basis-full items-center gap-1.5 text-xs font-medium text-gray-600">
                  <School className="h-3.5 w-3.5 shrink-0 text-primary-700" />{selectedClassName}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-px bg-gray-100 sm:grid-cols-4">
                {testSummary.map((stat) => {
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

            <section className="card mx-3 divide-y divide-gray-100 overflow-hidden rounded-2xl bg-white p-0! shadow-none" data-ui-style="classic" aria-label="Class tests">
              {pagedExams.length === 0 ? (
                <div className="flex flex-col items-center px-3 py-8 text-center">
                  <img src="/icons/exams/empty.webp" alt="" className="mb-3 h-28 w-28 object-contain" />
                  <p className="text-sm text-gray-500">{searchText ? t("common", "noResults", lang) : "No class tests found"}</p>
                </div>
              ) : pagedExams.map((exam) => (
                <button
                  key={exam.id}
                  type="button"
                  onClick={() => setSelectedExamId(exam.id)}
                  className="w-full rounded-none p-3 text-left transition-colors hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary-500"
                >
                  <span className="flex items-start justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-gray-900">{exam.name}</span>
                      <span className="mt-1 block truncate text-xs text-gray-500">{exam.subject?.name ?? "—"}</span>
                    </span>
                    <ExamStatusBadge exam={exam} className="rounded-full border px-2.5 py-1 text-xs font-medium normal-case tracking-normal" />
                  </span>
                </button>
              ))}
            </section>

            {sortedExams.length > 0 && (
              <div className="mx-3 mt-3 rounded-2xl border border-gray-100 px-3 py-3">
                <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-gray-500">
                  <span className="tabular-nums">
                    {t("teacherPages", "pageOfTotal", lang)
                      .replace("{start}", String((page - 1) * pageSize + 1))
                      .replace("{end}", String(Math.min(page * pageSize, sortedExams.length)))
                      .replace("{total}", String(sortedExams.length))}
                  </span>
                  <select
                    aria-label="Class tests per page"
                    value={pageSize}
                    onChange={(event) => setPageSize(Number(event.target.value))}
                    className="h-8 rounded-lg border border-gray-200 bg-white px-2 text-xs text-gray-600"
                  >
                    {[10, 20, 50, 100].map((size) => <option key={size} value={size}>{size} per page</option>)}
                  </select>
                </div>
                {totalPages > 1 && (
                  <Pagination className="mt-2" aria-label="Class test pages">
                    <PaginationContent className="gap-1">
                      <PaginationItem>
                        <PaginationPrevious
                          href="#"
                          text={t("teacherPages", "prevBtn", lang)}
                          aria-label="Go to previous class test page"
                          aria-disabled={page === 1}
                          tabIndex={page === 1 ? -1 : undefined}
                          className={page === 1 ? "pointer-events-none rounded-lg opacity-40" : "rounded-lg"}
                          onClick={(event) => {
                            event.preventDefault();
                            if (page > 1) setPage(page - 1);
                          }}
                        />
                      </PaginationItem>
                      {classTestPageItems(page, totalPages).map((item, index) => (
                        <PaginationItem
                          key={item === "ellipsis" ? `ellipsis-${index}` : item}
                          className={item !== "ellipsis" && totalPages > 5 && item !== 1 && item !== page && item !== totalPages ? "hidden sm:block" : undefined}
                        >
                          {item === "ellipsis" ? (
                            <PaginationEllipsis />
                          ) : (
                            <PaginationLink
                              href="#"
                              isActive={item === page}
                              aria-label={`Go to class test page ${item}`}
                              className={item === page ? "rounded-lg border-primary-200 bg-primary-50 text-primary-700" : "rounded-lg"}
                              onClick={(event) => {
                                event.preventDefault();
                                setPage(item);
                              }}
                            >
                              {item}
                            </PaginationLink>
                          )}
                        </PaginationItem>
                      ))}
                      <PaginationItem>
                        <PaginationNext
                          href="#"
                          text={t("teacherPages", "nextBtn", lang)}
                          aria-label="Go to next class test page"
                          aria-disabled={page === totalPages}
                          tabIndex={page === totalPages ? -1 : undefined}
                          className={page === totalPages ? "pointer-events-none rounded-lg opacity-40" : "rounded-lg"}
                          onClick={(event) => {
                            event.preventDefault();
                            if (page < totalPages) setPage(page + 1);
                          }}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                )}
              </div>
            )}
          </>
        )}

        <Button
          type="button"
          size="lg"
          onClick={openAdd}
          className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] left-1/2 z-30 max-w-[calc(100vw-1.5rem)] -translate-x-1/2 rounded-full  shadow-lg shadow-primary-900/20 lg:bottom-6 lg:left-[calc(50%+8rem)]"
        >
          <Plus className="h-5 w-5" />
          {t("teacherPages", "newClassTestBtn", lang)}
        </Button>

        <ResponsivePopover
          open={!!selectedExam}
          onOpenChange={(open) => { if (!open) setSelectedExamId(null); }}
          side="bottom"
          drawerOnDesktop
          className="mx-auto w-full max-w-2xl rounded-t-2xl"
          title={selectedExam?.name}
          showCloseButton={false}
          headerAction={selectedExam?.examStatus === "MARK_ENTRY" &&
            (!selectedExam.markEntryLastDate || new Date(selectedExam.markEntryLastDate) >= new Date()) ? (
              <Button size="sm" onClick={() => openMarkEntry(selectedExam)}>
                {t("teacherPages", "markEntryBreadcrumb", lang)}
              </Button>
            ) : undefined}
        >
          {selectedExam && (
            <div className="space-y-4 p-4 pt-0">
              <div className="space-y-2 border-b border-gray-100 pb-3">
                <ExamStatusBadge exam={selectedExam} className="inline-flex rounded-full border px-2.5 py-1 text-xs font-medium normal-case tracking-normal" />
                <p className="text-sm text-gray-500">{getExamStatusInfo(selectedExam).description}</p>
              </div>
              <dl className="grid grid-cols-2 gap-x-3 gap-y-3 text-sm">
                {[
                  [t("teacherPages", "examTypeDetail", lang), selectedExam.type?.replace(/_/g, " ") ?? "—"],
                  [t("teacherPages", "academicYearDetail", lang), selectedExam.accademicYear?.name ?? "—"],
                  [t("teacherPages", "classDetail", lang), selectedExam.class?.name ?? "—"],
                  [t("teacherPages", "subjectDetail", lang), selectedExam.subject?.name ?? "—"],
                  [t("teacherPages", "examStartDetail", lang), fmt(selectedExam.startDate)],
                  [t("teacherPages", "examEndDetail", lang), fmt(selectedExam.endDate)],
                  [t("teacherPages", "markEntryDeadlineDetail", lang), fmt(selectedExam.markEntryLastDate)],
                  [t("teacherPages", "publishDateDetail", lang), fmt(selectedExam.publishedDate)],
                  [t("teacherPages", "maxMarksDetail", lang), selectedExam.maxMarks?.toString() ?? "—"],
                  [t("teacherPages", "passMarksDetail", lang), selectedExam.passMarks?.toString() ?? "—"],
                  ...(selectedExam._count ? [[t("teacherPages", "resultsCountDetail", lang), String(selectedExam._count.results)]] : []),
                ].map(([label, value]) => (
                  <div key={label} className="min-w-0">
                    <dt className="text-gray-500">{label}</dt>
                    <dd className="mt-1 break-words font-medium text-gray-900">{value}</dd>
                  </div>
                ))}
              </dl>
              <div className="flex flex-wrap gap-2">
                {canEditExam(selectedExam) && (
                  <Button variant="outline" onClick={() => { setSelectedExamId(null); openEdit(selectedExam); }}>
                    {t("teacherPages", "editClassTestTitle", lang)}
                  </Button>
                )}
                {isAdmin && (
                  <Button variant="outline" onClick={() => { setSelectedExamId(null); setDeleteTarget(selectedExam); setShowDeleteConfirm(true); }}>
                    {t("common", "delete", lang)}
                  </Button>
                )}
                {selectedExam.examStatus === "MARK_ENTRY" && (selectedExam._count?.results ?? 0) > 0 && canEditExam(selectedExam) && (
                  <Button onClick={() => handlePublish(selectedExam)}>{t("teacherPages", "publishBtn", lang)}</Button>
                )}
                {selectedExam.examStatus === "PUBLISHED" && (
                  <Button onClick={() => openMarkEntry(selectedExam)}>{t("teacherPages", "viewResultsDetail", lang)}</Button>
                )}
              </div>
            </div>
          )}
        </ResponsivePopover>

        <ResponsivePopover
          open={isMarkEntryView}
          onOpenChange={(open) => { if (!open) closeMarkEntry(); }}
          side="bottom"
          drawerOnDesktop
          title={markEntryExam?.name ?? t("teacherPages", "enterMarksBreadcrumb", lang)}
          description={t("teacherPages", "enterMarksBreadcrumb", lang)}
          className="mx-auto w-full max-w-6xl rounded-t-2xl"
          contentClassName="min-w-0"
          footer={isMarkEntryView && (
            <div className="border-t border-gray-200 bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6">
              <div className="flex w-full flex-wrap justify-end gap-2">
                <Button type="button" variant="outline" size="lg" className="rounded-xl" disabled={isLocked || !meSubjectId} onClick={() => setImportOpen(true)}>Import</Button>
                <Button type="button" variant="outline" size="lg" className="rounded-xl" disabled={meSaving || meStudents.length === 0} onClick={resetScores}>Reset</Button>
                <Button type="button" variant="outline" size="lg" className="rounded-xl" disabled={meSaving || isLocked || hasInvalidMarks || meStudents.length === 0} onClick={() => handleMeSave(false)}>Save as Draft</Button>
                <Button type="button" size="lg" className="rounded-xl" disabled={meSaving || isLocked || hasInvalidMarks || meStudents.length === 0} onClick={() => handleMeSave(true)}>
                  {meSaving ? "Saving…" : meSaved ? "Saved" : "Save"}
                </Button>
              </div>
            </div>
          )}
        >
          {isMarkEntryView && markEntryExam && (
            <TeacherMarkEntryView
              showClassSelector={false}
              gridProps={{
                exams: [markEntryExam],
                classes: classes.filter((cls) => cls.id === markEntryExam.classId),
                subjects: meSubjects,
                students: meStudents,
                examId: markEntryExam.id,
                classId: markEntryExam.classId ?? "",
                subjectId: meSubjectId,
                scores: meScores,
                isLocked,
                saving: meSaving,
                saved: meSaved,
                loading: meLoading,
                error: meError,
                activeExam: markEntryExam,
                onExamChange: () => {},
                onClassChange: () => {},
                onSubjectChange: () => {},
                onScoreChange: (studentId, value) => setMeScores((prev) => ({ ...prev, [studentId]: value })),
                onSave: handleMeSave,
                showRemarks: false,
                showLockPeriod: true,
              }}
              clientId={cid}
              token={token}
              academicYearId={ayId}
              showSelectors={false}
              importOpen={importOpen}
              onImportOpenChange={setImportOpen}
              onReload={() => loadMarkEntry(markEntryExam)}
            />
          )}
        </ResponsivePopover>
      </div>

      {/* Add/Edit Class Test */}
      <ResponsivePopover
        open={showDrawer}
        onOpenChange={(open) => { if (!saving) setShowDrawer(open); }}
        side="bottom"
        drawerOnDesktop
        title={editTarget ? t("teacherPages", "editClassTestTitle", lang) : t("teacherPages", "newClassTestTitle", lang)}
        className="mx-auto w-full max-w-xl rounded-t-2xl"
        showCloseButton={!saving}
        footer={
          <div className="flex w-full justify-end gap-2 border-t border-gray-100 bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <Button type="button" variant="outline" size="lg" className="rounded-xl" disabled={saving} onClick={() => setShowDrawer(false)}>
              {t("common", "cancel", lang)}
            </Button>
            <Button type="submit" form="class-test-form" size="lg" className="rounded-xl" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {editTarget ? t("teacherPages", "saveChangesBtn", lang) : t("teacherPages", "createTestBtn", lang)}
            </Button>
          </div>
        }
      >
        <form
          id="class-test-form"
          className="space-y-3 p-4"
          onSubmit={(event) => {
            event.preventDefault();
            void handleSave();
          }}
        >
          {saveError && (
            <div role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
              {saveError}
            </div>
          )}

          <div>
            <label htmlFor="class-test-name" className="mb-1.5 block text-sm font-medium text-gray-700">
              {t("teacherPages", "testNameRequired", lang)}
            </label>
            <Input
              id="class-test-name"
              size="lg"
              type="text"
              value={formName}
              onChange={(event) => setFormName(event.target.value)}
              placeholder={t("teacherPages", "testNamePlaceholder", lang)}
            />
          </div>

          {!editTarget && (
            <>
              <div>
                <p className="mb-1.5 text-sm font-medium text-gray-700">
                  {t("teacherPages", "subjectRequired", lang)}
                </p>
                <DrawerSelector
                  title={t("teacherPages", "subjectRequired", lang)}
                  options={subjects
                    .filter((subject) => subject.classId === formClassId)
                    .filter((subject) => !isPeriodBased || subject.teacherId === teacherId)
                    .map((subject) => ({ value: subject.id, label: subject.name }))}
                  value={formSubjectId}
                  onChange={handleSubjectChange}
                  disabled={!formClassId}
                  placeholder={t("teacherPages", "selectSubjectOpt", lang)}
                />
              </div>
            </>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="class-test-start" className="mb-1.5 block text-sm font-medium text-gray-700">
                {t("teacherPages", "startDateLabel", lang)}
              </label>
              <DatePickerInput
                id="class-test-start"
                title={t("teacherPages", "startDateLabel", lang)}
                value={formStartDate}
                onChange={setFormStartDate}
                disableFuture={false}
                allowClear
              />
            </div>
            <div>
              <label htmlFor="class-test-end" className="mb-1.5 block text-sm font-medium text-gray-700">
                {t("teacherPages", "endDateLabel", lang)}
              </label>
              <DatePickerInput
                id="class-test-end"
                title={t("teacherPages", "endDateLabel", lang)}
                value={formEndDate}
                onChange={setFormEndDate}
                disableFuture={false}
                allowClear
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="class-test-max" className="mb-1.5 block text-sm font-medium text-gray-700">
                {t("teacherPages", "maxMarksLabel", lang)}
              </label>
              <Input id="class-test-max" size="lg" type="number" min={1} max={9999} value={formMaxMarks} onChange={(event) => setFormMaxMarks(event.target.value)} />
            </div>
            <div>
              <label htmlFor="class-test-pass" className="mb-1.5 block text-sm font-medium text-gray-700">
                {t("teacherPages", "passMarksLabel", lang)}
              </label>
              <Input id="class-test-pass" size="lg" type="number" min={0} max={9999} value={formPassMarks} onChange={(event) => setFormPassMarks(event.target.value)} placeholder="Optional" />
            </div>
          </div>

          {editTarget && (
            <div>
              <p className="mb-1.5 text-sm font-medium text-gray-700">
                {t("common", "status", lang)}
              </p>
              <DrawerSelector
                title={t("common", "status", lang)}
                options={(["MARK_ENTRY", "PUBLISHED"] as ExamStatus[]).map((status) => ({
                  value: status,
                  label: STATUS_LABELS[status],
                }))}
                value={formStatus}
                onChange={(value) => setFormStatus(value as ExamStatus)}
              />
            </div>
          )}
        </form>
      </ResponsivePopover>

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
              className="pointer-events-auto fixed inset-x-4 top-1/2 z-50 mx-auto max-w-sm -translate-y-1/2 rounded-2xl bg-white p-4 shadow-2xl"
            >
              <div className="space-y-2 text-center">
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-red-100">
                  <Trash2 className="h-5 w-5 text-red-600" />
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
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleting !== null}
                  className="rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
                >
                  {t("common", "cancel", lang)}
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting !== null}
                  className="rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-60"
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
