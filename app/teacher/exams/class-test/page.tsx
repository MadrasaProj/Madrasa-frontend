import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { ApiErrorBanner } from "@/components/ui/ApiErrorBanner";
import { DataTable, type SortDir } from "@/components/ui/DataTable";
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
import { useLanguageStore } from "@/store/language";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import {
  Plus,
  Loader2,
  Trash2,
  X,
  CheckCircle2,
  Check,
  Search,
  School,
  ChevronRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ExamStatusBadge, getExamStatusInfo, STATUS_LABELS } from "@/components/exam/ExamStatusBadge";
import { useExamColumns } from "@/components/exam/ExamColumns";
import { TeacherMarkEntryView } from "@/components/exam/TeacherMarkEntryView";
import { fmt } from "@/lib/exam-utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { ResponsivePopover } from "@/components/ui/responsivePopover";
import { DrawerSelector } from "@/components/DrawerSelector";
import { DatePickerInput } from "@/components/DatePickerInput";

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
  const [filterClassId, setFilterClassId] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);

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

  const myClassIds = new Set(
    subjects.filter((s) => s.teacherId === teacherId).map((s) => s.classId),
  );
  const teacherClasses = isPeriodBased
    ? classes.filter(
        (c) => myClassIds.has(c.id) || c.classTeacherId === teacherId,
      )
    : classes.filter((c) => c.classTeacherId === teacherId);
  const selectedClassName = teacherClasses.find((cls) => cls.id === filterClassId)?.name
    ?? t("adminPages", "allClasses", lang);

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

  const columns = useExamColumns({
    showActions: false,
    showAllColumns: true,
    showExamIcon: false,
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

  return (
    <DashboardLayout>
      <div className="">

        <PageHeader
          title={t("nav", "classTests", lang)}
          action={
            <Button onClick={openAdd} size="sm">
              <Plus className="h-4 w-4" />
              {t("teacherPages", "newClassTestBtn", lang)}
            </Button>
          }
        />

        <div className="sticky top-12 z-30 -mx-4 mb-4 flex h-10 gap-2 bg-white px-4 shadow-lg shadow-gray-400/10 lg:top-[125px] *:my-auto">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              type="search"
              aria-label="Search class tests by name"
              placeholder="Search class test by name..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="h-8 border-0 bg-transparent pl-9 pr-2 shadow-none focus-visible:ring-0"
            />
          </div>
          {searchText && (
            <Button variant="ghost" size="icon" aria-label={t("common", "clearSearch", lang)} onClick={() => setSearchText("")}>
              <X className="h-4 w-4" />
            </Button>
          )}
          <button
            type="button"
            aria-label={`Choose class: ${selectedClassName}`}
            onClick={() => setFiltersOpen(true)}
            className="flex min-w-0 max-w-[55vw] items-center gap-2 text-gray-700"
          >
            <School className="h-4 w-4 shrink-0 text-emerald-700" />
            <span className="max-w-36 truncate text-sm font-semibold">{selectedClassName}</span>
            <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" />
          </button>
        </div>

        <ResponsivePopover
          open={filtersOpen}
          onOpenChange={setFiltersOpen}
          side="bottom"
          drawerOnDesktop
          title="Filter class tests"
          className="mx-auto w-full max-w-2xl rounded-t-2xl"
        >
          <div className="p-5">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-400">Classes</p>
            <div className="divide-y divide-gray-100 rounded-lg border border-gray-100 px-2">
              {[
                { id: "", name: t("adminPages", "allClasses", lang) },
                ...teacherClasses,
              ].map((cls) => (
                <button
                  key={cls.id || "all"}
                  type="button"
                  aria-pressed={filterClassId === cls.id}
                  onClick={() => {
                    setFilterClassId(cls.id);
                    setFiltersOpen(false);
                  }}
                  className={cn(
                    "flex w-full min-w-0 items-center gap-3 py-3 text-left text-sm",
                    filterClassId === cls.id ? "font-medium text-emerald-700" : "text-gray-700",
                  )}
                >
                  <span className="truncate">{cls.name}</span>
                  {filterClassId === cls.id && <Check className="ml-auto h-4 w-4 shrink-0" />}
                </button>
              ))}
            </div>
          </div>
        </ResponsivePopover>

        {error && <ApiErrorBanner message={error} onRetry={() => { setError(null); load(filterClassId); }} />}

        {loading || sortedExams.length > 0 ? (
          <DataTable
            alwaysTable
            columns={columns}
            data={pagedExams}
            keyExtractor={(exam) => exam.id}
            onRowClick={(exam) => setSelectedExamId(exam.id)}
            loading={loading}
            error={null}
            onSort={(key, dir) => { setSortBy(key); setSortDir(dir); }}
            sortKey={sortBy}
            sortDir={sortDir}
            pagination={{
              page,
              totalPages,
              total: sortedExams.length,
              pageSize,
              pageSizeOptions: [10, 20, 50, 100],
              onPageChange: setPage,
              onPageSizeChange: (size) => { setPageSize(size); setPage(1); },
            }}
          />
        ) : (
          <div className="flex min-h-[calc(100dvh-13rem)] flex-col items-center justify-center py-8 text-center text-gray-400 lg:min-h-[calc(100dvh-20rem)]">
            <img src="/icons/exams/empty.webp" alt="" className="mx-auto mb-3 h-28 w-28 object-contain" />
            <p className="font-semibold">
              {searchText ? t("common", "noResults", lang) : "No class tests found"}
            </p>
          </div>
        )}

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
            <div className="space-y-5 p-5 pt-0">
              <div className="space-y-2">
                <ExamStatusBadge exam={selectedExam} />
                <p className="mt-1 text-sm text-gray-500">{getExamStatusInfo(selectedExam).description}</p>
              </div>
              <dl className="divide-y divide-gray-100 rounded-xl border border-gray-200 px-4">
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
                  <div key={label} className="flex items-start justify-between gap-4 py-3 text-sm">
                    <dt className="text-gray-500">{label}</dt>
                    <dd className="text-right font-medium text-gray-900">{value}</dd>
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
              <ButtonGroup className="w-full justify-end">
                <Button type="button" variant="outline" size="lg" disabled={isLocked || !meSubjectId} onClick={() => setImportOpen(true)}>Import</Button>
                <Button type="button" variant="outline" size="lg" disabled={meSaving || meStudents.length === 0} onClick={resetScores}>Reset</Button>
                <Button type="button" variant="outline" size="lg" disabled={meSaving || isLocked || hasInvalidMarks || meStudents.length === 0} onClick={() => handleMeSave(false)}>Save as Draft</Button>
                <Button type="button" size="lg" disabled={meSaving || isLocked || hasInvalidMarks || meStudents.length === 0} onClick={() => handleMeSave(true)}>
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
          <div className="flex gap-3 border-t border-gray-100 bg-white px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] w-max ml-auto">
            <Button type="button" variant="outline" size={"lg"} className="flex-1" disabled={saving} onClick={() => setShowDrawer(false)}>
              {t("common", "cancel", lang)}
            </Button>
            <Button type="submit" form="class-test-form" size={"lg"} className="flex-1" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {editTarget ? t("teacherPages", "saveChangesBtn", lang) : t("teacherPages", "createTestBtn", lang)}
            </Button>
          </div>
        }
      >
        <form
          id="class-test-form"
          className="space-y-4 p-5"
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
                  {t("teacherPages", "classRequired", lang)}
                </p>
                <DrawerSelector
                  title={t("teacherPages", "classRequired", lang)}
                  options={teacherClasses.map((cls) => ({ value: cls.id, label: cls.name }))}
                  value={formClassId}
                  onChange={(value) => {
                    setFormClassId(value);
                    setFormSubjectId("");
                  }}
                  placeholder={t("teacherPages", "selectClassOpt", lang)}
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
