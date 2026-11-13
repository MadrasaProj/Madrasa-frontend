import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { IllustratedEmptyState } from "@/components/ui/IllustratedEmptyState";
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
import { getResults, bulkUpsertResults, type ResultRecord } from "@/lib/results-api";
import { getAllClasses, type ClassRecord } from "@/lib/classes-api";
import { getSubjects, type SubjectRecord } from "@/lib/subjects-api";
import { getStudents, type StudentRecord } from "@/lib/students-api";
import { useAuthStore } from "@/store/auth";
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
  ArrowUpDown,
  FileText,
} from "lucide-react";
import { ExamStatusBadge, getExamStatusInfo, STATUS_LABELS } from "@/components/exam/ExamStatusBadge";
import { TeacherMarkEntryView } from "@/components/exam/TeacherMarkEntryView";
import { ClassResultTable } from "@/components/exam/ClassResultTable";
import { loadLiveClassReport } from "@/lib/live-class-report";
import type { ClassReport } from "@/lib/results-api";
import { fmt } from "@/lib/exam-utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
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
import { DatePickerDrawer } from "@/components/DatePickerDrawer";

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

const PAGE_SIZE = 10;
type ClassTestSortField = "startDate" | "name" | "examStatus";
type ClassTestSortDirection = "asc" | "desc";

async function getAllClassTests(clientId: string, token: string): Promise<ExamRecord[]> {
  const pageSize = 200;
  const exams: ExamRecord[] = [];

  for (let page = 1; ; page += 1) {
    const response = await getExams(clientId, token, {
      type: "CLASS_TEST",
      page,
      limit: pageSize,
    });
    const batch = response.data ?? [];
    exams.push(...batch);
    if (batch.length < pageSize || (response.total != null && exams.length >= response.total)) break;
  }

  return exams;
}

export default function AdminClassTestsPage() {
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
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);

  const [showDrawer, setShowDrawer] = useState(false);
  const [editTarget, setEditTarget] = useState<ExamRecord | null>(null);
  const [formName, setFormName] = useState("");
  const [formClassId, setFormClassId] = useState("");
  const [formSubjectId, setFormSubjectId] = useState("");
  const [formStartDate, setFormStartDate] = useState("");
  const [formEndDate, setFormEndDate] = useState("");
  const [activeDateField, setActiveDateField] = useState<"start" | "end" | null>(null);
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
  const [reportOpen, setReportOpen] = useState(false);
  const [reportData, setReportData] = useState<ClassReport | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [reportRequest, setReportRequest] = useState(0);
  const [reportControlsContainer, setReportControlsContainer] = useState<HTMLDivElement | null>(null);
  const isMarkEntryView = searchParams.get("view") === "mark-entry";
  const markEntryExam = exams.find((exam) => exam.id === searchParams.get("examId"));
  const selectedExam = exams.find((exam) => exam.id === selectedExamId);

  const [searchText, setSearchText] = useState("");
  const [selectedClassId, setSelectedClassId] = useState("");
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<ClassTestSortField>("startDate");
  const [sortDir, setSortDir] = useState<ClassTestSortDirection>("desc");

  const isPeriodBased = user?.attendanceMode === "PERIOD_BASED";
  const teacherId = user?.id ?? "";

  const searchFiltered = useMemo(() => {
    const q = searchText.toLowerCase();
    return exams.filter((exam) => {
      if (q && !exam.name.toLowerCase().includes(q)) return false;
      if (selectedClassId && exam.classId !== selectedClassId) return false;
      return true;
    });
  }, [exams, searchText, selectedClassId]);

  const sortedExams = useMemo(() => {
    const arr = [...searchFiltered];
    arr.sort((a, b) => {
      const av = a[sortBy];
      const bv = b[sortBy];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      const comparison = String(av).localeCompare(String(bv), undefined, {
        numeric: true,
        sensitivity: "base",
      });
      return sortDir === "asc" ? comparison : -comparison;
    });
    return arr;
  }, [searchFiltered, sortBy, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sortedExams.length / PAGE_SIZE));
  const pagedExams = useMemo(
    () => sortedExams.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [sortedExams, page],
  );

  useEffect(() => {
    setPage(1);
  }, [searchText, selectedClassId, sortBy, sortDir]);

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
        getStudents(cid, token, { classId: clsId, status: "ACTIVE", limit: 500 }),
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
    async () => {
      if (!cid || !token) { setExams([]); setLoading(false); return; }
      setLoading(true);
      setError(null);
      try {
        const [examData, clsData, subData] = await Promise.all([
          getAllClassTests(cid, token),
          getAllClasses(cid, token),
          getSubjects(cid, token, {}),
        ]);
        setExams(examData);
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
    load();
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

  const handleClassChange = (classId: string) => {
    setFormClassId(classId);
    setFormSubjectId("");
    setFormMaxMarks("100");
    setFormPassMarks("");
    setSaveError("");
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

  const handleMeSave = async (submit = false): Promise<boolean> => {
    if (!markEntryExam || !meSubjectId || markEntryExam.examStatus !== "MARK_ENTRY") return false;
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
      return false;
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
      return true;
    } catch (e) {
      setMeError((e as Error).message);
      return false;
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
  const hasUnsavedScores = meStudents.some((student) => {
    const saved = meResults.find((result) => result.student?.id === student.id);
    return meScores[student.id] !== (saved ? String(saved.score) : "");
  });

  const openReport = async () => {
    if (!markEntryExam || !meSubjectId || meSaving || hasInvalidMarks) return;
    if (!isLocked && hasUnsavedScores && !(await handleMeSave(false))) return;
    setReportOpen(true);
  };

  useEffect(() => {
    if (!reportOpen || !markEntryExam || !cid || !token || !markEntryExam.classId) return;
    let active = true;
    setReportData(null);
    setReportError(null);
    setReportLoading(true);
    void loadLiveClassReport({
      clientId: cid,
      token,
      examId: markEntryExam.id,
      examName: markEntryExam.name,
      examType: "CLASS_TEST",
      classId: markEntryExam.classId,
      className: markEntryExam.class?.name ?? classes.find((cls) => cls.id === markEntryExam.classId)?.name ?? "Class",
      subjectId: meSubjectId,
    }).then(({ report }) => {
      if (active) setReportData(report);
    }).catch((cause) => {
      if (active) setReportError(cause instanceof Error ? cause.message : "Could not load the class report.");
    }).finally(() => {
      if (active) setReportLoading(false);
    });
    return () => { active = false; };
  }, [reportOpen, reportRequest, markEntryExam?.id, cid, token, meSubjectId]);
  const testSummary = [
    { label: "Tests", value: searchFiltered.length, icon: GraduationCap },
    { label: "Mark entry", value: searchFiltered.filter((exam) => exam.examStatus === "MARK_ENTRY").length, icon: ClipboardCheck },
    { label: "Published", value: searchFiltered.filter((exam) => exam.examStatus === "PUBLISHED").length, icon: CalendarDays },
    { label: "Draft", value: searchFiltered.filter((exam) => exam.examStatus === "DRAFT").length, icon: Clock3 },
  ];

  return (
    <DashboardLayout>
      <div className="p-0! pb-24! lg:pb-8!">
        <PageHeader title={t("nav", "classTests", lang)} />

        {!loading && exams.length === 0 && !error ? (
          <IllustratedEmptyState
            image="/images/teacher/class-test-empty.webp"
            title={t("teacherPages", "noClassTestsHeading", lang)}
            description={t("teacherPages", "noClassTestsDescription", lang)}
            action={
              <Button type="button" size="lg" onClick={openAdd} className="hidden rounded-full sm:inline-flex">
                <Plus className="h-5 w-5" />
                {t("teacherPages", "createTestBtn", lang)}
              </Button>
            }
          />
        ) : (
          <>

        <div className="px-3 pb-3 pt-4">
          <div className="flex w-full flex-wrap items-center gap-2">
            <div className="relative min-w-48 flex-1">
              <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                type="search"
                aria-label="Search class tests by name"
                placeholder="Search class test by name..."
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                className="h-10 rounded-lg bg-white pl-9 text-sm"
              />
            </div>
            <DrawerSelector
              title="Sort class tests"
              options={[
                { value: "startDate:desc", label: "Newest first" },
                { value: "startDate:asc", label: "Oldest first" },
                { value: "name:asc", label: "Name A–Z" },
                { value: "name:desc", label: "Name Z–A" },
                { value: "examStatus:asc", label: "Status A–Z" },
                { value: "examStatus:desc", label: "Status Z–A" },
              ]}
              value={`${sortBy}:${sortDir}`}
              onChange={(value) => {
                const [field, direction] = value.split(":");
                setSortBy(field as ClassTestSortField);
                setSortDir(direction as ClassTestSortDirection);
              }}
              triggerIcon={<ArrowUpDown className="size-4" />}
              className="size-11 shadow-none"
            />
            <DrawerSelector
              title="Filter by class"
              options={[
                { value: "", label: "All classes" },
                ...[...classes].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" })).map((cls) => ({ value: cls.id, label: cls.name })),
              ]}
              value={selectedClassId}
              onChange={setSelectedClassId}
              className="w-44 shadow-none"
            />
            <Button type="button" onClick={openAdd} className="hidden shadow-none sm:inline-flex">
              <Plus className="size-4" /> {t("teacherPages", "newClassTestBtn", lang)}
            </Button>
          </div>
        </div>

        {error && <ApiErrorBanner message={error} onRetry={() => { setError(null); load(); }} />}

        {loading ? (
          <>
            <div className="mx-3 mb-3 grid grid-cols-2 overflow-hidden rounded-2xl bg-white">
              {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-20 rounded-none" />)}
            </div>
            <div className="mx-3 divide-y divide-gray-100 overflow-hidden rounded-2xl bg-white">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="space-y-2 px-4 py-4">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <section className="mx-3 mb-3 grid grid-cols-2 overflow-hidden rounded-2xl bg-gradient-to-br from-primary-50/60 via-white to-sky-50/60" aria-label="Class test statistics">
              {testSummary.map(({ label, value, icon: Icon }, index) => (
                <div key={label} className={`min-w-0 p-2.5 sm:p-3 ${index % 2 === 0 ? "border-r border-gray-100" : ""} ${index < 2 ? "border-b border-gray-100" : ""}`}>
                  <div className="flex items-center gap-1.5 text-sm font-medium leading-4 text-gray-700">
                    <Icon aria-hidden="true" className="size-3.5 shrink-0" />
                    <span>{label}</span>
                  </div>
                  <span className="mt-1.5 block text-[22px] font-medium leading-none tabular-nums text-gray-950">{value}</span>
                </div>
              ))}
            </section>

            <section className="mx-3 divide-y divide-gray-100 overflow-hidden rounded-2xl bg-white" aria-label="Class tests">
              {pagedExams.length === 0 ? (
                <div className="flex flex-col items-center px-3 py-8 text-center">
                  <img src="/icons/exams/empty.webp" alt="" className="mb-3 h-28 w-28 object-contain" />
                  <p className="text-sm text-gray-500">{searchText ? t("common", "noResults", lang) : "No class tests found"}</p>
                </div>
              ) : pagedExams.map((exam) => (
                <Button
                  key={exam.id}
                  type="button"
                  variant="ghost"
                  onClick={() => setSelectedExamId(exam.id)}
                  aria-haspopup="dialog"
                  className="h-auto w-full justify-start rounded-none px-4 py-4 text-left whitespace-normal shadow-none hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary-500"
                >
                  <span className="flex items-start justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-gray-900">{exam.name}</span>
                      <span className="mt-1 block truncate text-xs text-gray-500">
                        {exam.class?.name ?? classes.find((cls) => cls.id === exam.classId)?.name ?? "—"} · {exam.subject?.name ?? "—"}
                      </span>
                    </span>
                    <ExamStatusBadge exam={exam} className="rounded-full border px-2.5 py-1 text-xs font-medium normal-case tracking-normal" />
                  </span>
                </Button>
              ))}
            </section>

            {totalPages > 1 && (
              <Pagination className="mx-auto mt-3" aria-label="Class test pages">
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
                    <PaginationItem key={item === "ellipsis" ? `ellipsis-${index}` : item}>
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
          </>
        )}

          </>
        )}

        <ResponsivePopover
          open={!!selectedExam}
          onOpenChange={(open) => { if (!open) setSelectedExamId(null); }}
          side="bottom"
          className="mx-auto w-full max-w-2xl rounded-t-2xl shadow-none"
          title={selectedExam?.name}
          showCloseButton
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
              <ButtonGroup aria-label="Class test actions" className="max-w-full overflow-x-auto">
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
              </ButtonGroup>
            </div>
          )}
        </ResponsivePopover>

        <ResponsivePopover
          open={isMarkEntryView}
          onOpenChange={(open) => { if (!open) closeMarkEntry(); }}
          side="bottom"
          title={markEntryExam?.name ?? t("teacherPages", "enterMarksBreadcrumb", lang)}
          description={t("teacherPages", "enterMarksBreadcrumb", lang)}
          className="mx-auto w-full max-w-6xl rounded-t-2xl shadow-none"
          
          footer={isMarkEntryView && (
            <div className="border-t border-gray-200 bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6">
              <ButtonGroup aria-label="Mark entry actions" className="ml-auto max-w-full overflow-x-auto">
                <Button type="button" variant="outline" size="lg" className="shrink-0 shadow-none" disabled={!meSubjectId || meLoading || meSaving || hasInvalidMarks} onClick={() => { void openReport(); }}>
                  <FileText aria-hidden="true" className="size-4" /> {t("teacherPages", "report", lang)}
                </Button>
                <Button type="button" variant="outline" size="lg" className="shrink-0 shadow-none" disabled={isLocked || !meSubjectId} onClick={() => setImportOpen(true)}>Import</Button>
                <Button type="button" variant="outline" size="lg" className="shrink-0 shadow-none" disabled={meSaving || meStudents.length === 0} onClick={resetScores}>Reset</Button>
                <Button type="button" variant="outline" size="lg" className="shrink-0 shadow-none" disabled={meSaving || isLocked || hasInvalidMarks || meStudents.length === 0} onClick={() => handleMeSave(false)}>Save as Draft</Button>
                <Button type="button" size="lg" className="shrink-0 shadow-none" disabled={meSaving || isLocked || hasInvalidMarks || meStudents.length === 0} onClick={() => handleMeSave(true)}>
                  {meSaving ? "Saving…" : meSaved ? "Saved" : "Save"}
                </Button>
              </ButtonGroup>
            </div>
          )}
        >
          {isMarkEntryView && markEntryExam && (
            <TeacherMarkEntryView
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

        <ResponsivePopover
          open={reportOpen}
          onOpenChange={setReportOpen}
          fullHeight
          onBack={() => setReportOpen(false)}
          title={`${markEntryExam?.name ?? "Class test"} · ${t("teacherPages", "report", lang)}`}
          footer={reportData && !reportLoading ? (
            <div ref={setReportControlsContainer} className="flex justify-end border-t border-gray-100 bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6" />
          ) : undefined}
          className="z-[60] md:max-w-none"
        >
          <div className="mx-auto w-full max-w-[1400px] px-4 py-5 sm:px-6">
            {reportLoading ? (
              <div role="status" className="flex items-center justify-center gap-2 py-16 text-sm text-gray-500">
                <Loader2 aria-hidden="true" className="size-5 animate-spin" />
                {t("common", "loading", lang)}
              </div>
            ) : reportError ? (
              <div role="alert" className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
                <p>{reportError}</p>
                <Button type="button" variant="outline" className="mt-3" onClick={() => setReportRequest((value) => value + 1)}>Retry</Button>
              </div>
            ) : reportData ? (
              <ClassResultTable report={reportData} madrasaName={reportData.clientName ?? ""} teacherView teacherControlsContainer={reportControlsContainer} />
            ) : null}
          </div>
        </ResponsivePopover>
      </div>

      {!loading && !error && (
        <Button
          type="button"
          size="lg"
          onClick={openAdd}
          className="fixed bottom-[92px] left-1/2 z-40 -translate-x-1/2 rounded-full px-5 shadow-lg sm:hidden"
        >
          <Plus className="size-5" /> {t("teacherPages", "newClassTestBtn", lang)}
        </Button>
      )}

      {/* Add/Edit Class Test */}
      <ResponsivePopover
        open={showDrawer}
        onOpenChange={(open) => { if (!saving) { setShowDrawer(open); if (!open) setActiveDateField(null); } }}
        side="bottom"
        desktopView="right-drawer"
        title={editTarget ? t("teacherPages", "editClassTestTitle", lang) : t("teacherPages", "newClassTestTitle", lang)}
        className="mx-auto w-full max-w-xl rounded-t-2xl shadow-none"
        showCloseButton={!saving}
        footer={
          <div className="flex w-full justify-end border-t border-gray-100 bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <ButtonGroup aria-label="Class test form actions">
              <Button type="button" variant="outline" size="lg" className="shadow-none" disabled={saving} onClick={() => setShowDrawer(false)}>
                {t("common", "cancel", lang)}
              </Button>
              <Button type="submit" form="class-test-form" size="lg" className="shadow-none" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editTarget ? t("teacherPages", "saveChangesBtn", lang) : t("teacherPages", "createTestBtn", lang)}
              </Button>
            </ButtonGroup>
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
                <p className="mb-1.5 text-sm font-medium text-gray-700">Class *</p>
                <DrawerSelector
                  title="Class"
                  options={classes
                    .filter((cls) => cls.status === "ACTIVE")
                    .map((cls) => ({ value: cls.id, label: cls.name, icon: <School className="h-4 w-4" /> }))}
                  value={formClassId}
                  onChange={handleClassChange}
                  placeholder="Select class"
                />
              </div>
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
              <p className="mb-1.5 block text-sm font-medium text-gray-700">
                {t("teacherPages", "startDateLabel", lang)}
              </p>
              <Button type="button" variant="outline" aria-haspopup="dialog" aria-expanded={activeDateField === "start"} onClick={() => setActiveDateField("start")} className="w-full justify-start shadow-none">
                <CalendarDays className="size-4" /> {formStartDate ? fmt(formStartDate) : "Select date"}
              </Button>
            </div>
            <div>
              <p className="mb-1.5 block text-sm font-medium text-gray-700">
                {t("teacherPages", "endDateLabel", lang)}
              </p>
              <Button type="button" variant="outline" aria-haspopup="dialog" aria-expanded={activeDateField === "end"} onClick={() => setActiveDateField("end")} className="w-full justify-start shadow-none">
                <CalendarDays className="size-4" /> {formEndDate ? fmt(formEndDate) : "Select date"}
              </Button>
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

      <DatePickerDrawer open={activeDateField === "start"} onOpenChange={(open) => { if (!open) setActiveDateField(null); }} date={formStartDate} onDateChange={setFormStartDate} title={t("teacherPages", "startDateLabel", lang)} disableFuture={false} allowClear />
      <DatePickerDrawer open={activeDateField === "end"} onOpenChange={(open) => { if (!open) setActiveDateField(null); }} date={formEndDate} onDateChange={setFormEndDate} title={t("teacherPages", "endDateLabel", lang)} disableFuture={false} allowClear />

      <ResponsivePopover
        open={showDeleteConfirm && deleteTarget !== null}
        onOpenChange={(open) => { if (!open && deleting === null) setShowDeleteConfirm(false); }}
        title={t("teacherPages", "deleteClassTestTitle", lang)}
        description={deleteTarget ? "All scores entered for " + deleteTarget.name + " will be lost." : undefined}
        side="bottom"
        desktopView="right-drawer"
        className="shadow-none"
        
        footer={
          <div className="border-t border-gray-100 bg-white px-5 py-4">
            <ButtonGroup aria-label="Delete class test actions" className="w-full">
              <Button type="button" variant="outline" disabled={deleting !== null} onClick={() => setShowDeleteConfirm(false)} className="flex-1 shadow-none">
                {t("common", "cancel", lang)}
              </Button>
              <Button type="button" variant="destructive" disabled={deleting !== null} onClick={handleDelete} className="flex-1 shadow-none">
                {deleting !== null && <Loader2 className="size-4 animate-spin" />}
                {t("common", "delete", lang)}
              </Button>
            </ButtonGroup>
          </div>
        }
      >
        <p className="text-sm text-gray-600">Delete <strong>{deleteTarget?.name}</strong>?</p>
      </ResponsivePopover>
    </DashboardLayout>
  );
}
