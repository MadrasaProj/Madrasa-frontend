import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { IllustratedEmptyState } from "@/components/ui/IllustratedEmptyState";
import { ApiErrorBanner } from "@/components/ui/ApiErrorBanner";
import type { SortDir } from "@/components/ui/DataTable";
import { getExams, type ExamRecord } from "@/lib/exams-api";
import {
  getResults,
  bulkUpsertResults,
  type ResultRecord,
} from "@/lib/results-api";
import { getSubjects, type SubjectRecord } from "@/lib/subjects-api";
import { getStudents, type StudentRecord } from "@/lib/students-api";
import { useAuthStore } from "@/store/auth";
import { useActiveClass } from "@/store/activeClass";
import { useLanguageStore } from "@/store/language";
import { t } from "@/lib/i18n";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  GraduationCap,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Button } from "@/components/ui/button";
import { ResponsivePopover } from "@/components/ui/responsivePopover";
import { ExamStatusBadge, getExamStatusInfo } from "@/components/exam/ExamStatusBadge";
import { TeacherMarkEntryView } from "@/components/exam/TeacherMarkEntryView";
import { TeacherMarkEntryActions } from "@/components/exam/TeacherMarkEntryActions";
import { fmt, shortDate } from "@/lib/exam-utils";

export default function TeacherExamsPage() {
  const { user, accessToken } = useAuthStore();
  const { lang } = useLanguageStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const cid = user?.clientId ?? "";
  const token = accessToken ?? "";
  const ayId = user?.defaultAcademicYearId ?? "";
  const teacherId = user?.id ?? "";

  // Mark entry drawer state is kept in the URL for direct links.
  const isMarkEntryView = searchParams.get("view") === "mark-entry";

  // Selection states (from query params or fallback)
  const queryExamId = searchParams.get("examId") ?? "";
  // React Router recreates this setter when the URL changes; the exam list fetch should not restart.
  const setSearchParamsRef = useRef(setSearchParams);
  useEffect(() => { setSearchParamsRef.current = setSearchParams; }, [setSearchParams]);
  const { classes: teacherClasses, activeClassId } = useActiveClass();
  const queryClassId = activeClassId;
  const querySubjectId = searchParams.get("subjectId") ?? "";

  // Data
  const [mySubjects, setMySubjects] = useState<SubjectRecord[]>([]);
  const [exams, setExams] = useState<ExamRecord[]>([]);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [existingResults, setExistingResults] = useState<ResultRecord[]>([]);
  const [scores, setScores] = useState<Record<string, string>>({});
  const [remarks, setRemarks] = useState<Record<string, string>>({});

  // UI state
  const [loading, setLoading] = useState(true);
  const [entryLoading, setEntryLoading] = useState(false);
  const [subjectLoading, setSubjectLoading] = useState(false);
  const [entryError, setEntryError] = useState<string | null>(null);
  const entryRequestRef = useRef(0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [classSubjects, setClassSubjects] = useState<SubjectRecord[]>([]);

  const [searchText, setSearchText] = useState("");
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState<string | undefined>("startDate");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // Derived arrays
  const activeExam = exams.find((e) => e.id === queryExamId);
  const selectedExam = exams.find((e) => e.id === selectedExamId);
  const isLocked =
    !activeExam ||
    activeExam.examStatus !== "MARK_ENTRY" ||
    (!!activeExam.markEntryLastDate &&
      new Date() > new Date(activeExam.markEntryLastDate));
  const currentSubject = classSubjects.find((subject) => subject.id === querySubjectId);
  const maxMarks = currentSubject?.classSubject?.maxMarks ?? 50;
  const hasInvalidMarks = Object.values(scores).some(
    (value) => value !== "" && (Number(value) < 0 || Number(value) > maxMarks),
  );

  const goToClassReport = (examId: string, classId: string) => {
    const back = location.pathname + location.search;
    navigate(
      `/teacher/exams/class-report?examId=${examId}&classId=${classId}&ayId=${ayId}&back=${encodeURIComponent(back)}`,
    );
  };

  const openMarkEntry = (exam: ExamRecord) => {
    setSelectedExamId(null);
    setEntryLoading(true);
    setEntryError(null);
    setSearchParams((prev) => {
      prev.set("view", "mark-entry");
      prev.set("examId", exam.id);
      const firstCls = queryClassId || teacherClasses[0]?.id || "";
      if (firstCls) prev.set("classId", firstCls);
      return prev;
    });
  };

  const closeMarkEntry = () => {
    entryRequestRef.current += 1;
    setImportOpen(false);
    setEntryLoading(false);
    setSearchParams((prev) => {
      prev.delete("view");
      return prev;
    });
  };

  const resetScores = () => {
    if (!window.confirm(t("teacherPages", "confirmResetMarks", lang))) return;
    const scoreMap: Record<string, string> = {};
    const remarkMap: Record<string, string> = {};
    students.forEach((student) => {
      const result = existingResults.find(
        (item) => item.student?.id === student.id && item.subject?.id === querySubjectId,
      );
      scoreMap[student.id] = result != null ? String(result.score) : "";
      remarkMap[student.id] = result?.remarks ?? "";
    });
    setScores(scoreMap);
    setRemarks(remarkMap);
  };

  // ── Initial load ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!cid || !token || !teacherId) return;
    setLoading(true);

    Promise.all([
      getSubjects(cid, token, { teacherId, limit: 500 }),
      getExams(cid, token, { accademicYearId: ayId || undefined, type: "TERM_EXAM", limit: 50 }),
    ])
      .then(([subs, examData]) => {
        setMySubjects(subs.data ?? []);
        const loadedExams = (examData.data ?? []).filter(
          (e) => e.type === "TERM_EXAM" || !e.type,
        );
        setExams(loadedExams);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [cid, token, teacherId, ayId]);

  useEffect(() => {
    if (loading || exams.length === 0 || exams.some((exam) => exam.id === queryExamId)) return;
    setSearchParamsRef.current((prev) => {
      prev.set("examId", exams[0].id);
      return prev;
    });
  }, [loading, exams, queryExamId]);

  // ── Load subjects for selected class ─────────────────────────────────────────

  useEffect(() => {
    if (!cid || !token || !queryClassId) {
      setSubjectLoading(false);
      setEntryLoading(false);
      return;
    }
    let cancelled = false;
    const cls = teacherClasses.find((c) => c.id === queryClassId);
    const isOwn = cls?.classTeacherId === teacherId;
    setClassSubjects([]);
    setSubjectLoading(isOwn);

    if (isOwn) {
      getSubjects(cid, token, { classId: queryClassId, limit: 200 })
        .then((r) => {
          if (cancelled) return;
          const subs = r.data ?? [];
          setClassSubjects(subs);
          if (subs.length === 0) setEntryLoading(false);
          setSearchParamsRef.current((prev) => {
            if (subs.length > 0 && !subs.some((s) => s.id === prev.get("subjectId"))) {
              prev.set("subjectId", subs[0].id);
            } else if (subs.length === 0) prev.delete("subjectId");
            return prev;
          });
        })
        .catch((e: Error) => { if (!cancelled) { setEntryError(e.message); setEntryLoading(false); } })
        .finally(() => { if (!cancelled) setSubjectLoading(false); });
    } else {
      const mine = mySubjects.filter((s) => s.classId === queryClassId);
      setClassSubjects(mine);
      if (mine.length === 0) setEntryLoading(false);
      setSearchParamsRef.current((prev) => {
        if (mine.length > 0 && !mine.some((s) => s.id === prev.get("subjectId"))) {
          prev.set("subjectId", mine[0].id);
        } else if (mine.length === 0) prev.delete("subjectId");
        return prev;
      });
    }
    return () => { cancelled = true; };
  }, [
    queryClassId,
    teacherClasses,
    mySubjects,
    teacherId,
    cid,
    token,
  ]);

  // ── Load students + results when exam/class/subject changes ──────────────────

  const loadExamData = useCallback(async () => {
    if (!cid || !token || !queryClassId || !queryExamId || !querySubjectId) return;
    const requestId = ++entryRequestRef.current;
    setEntryLoading(true);
    setEntryError(null);
    setStudents([]);
    setExistingResults([]);
    try {
      const [stuData, resData] = await Promise.all([
        getStudents(cid, token, { classId: queryClassId, status: "ACTIVE", limit: 200 }),
        getResults(cid, token, { examId: queryExamId, classId: queryClassId, limit: 500 }),
      ]);
      if (requestId !== entryRequestRef.current) return;
      const stuList = stuData.data ?? [];
      const resList = resData.data ?? [];
      setStudents(stuList);
      setExistingResults(resList);

      const scoreMap: Record<string, string> = {};
      const remarkMap: Record<string, string> = {};
      stuList.forEach((s) => {
        const r = resList.find(
          (r) => r.student?.id === s.id && r.subject?.id === querySubjectId,
        );
        scoreMap[s.id] = r != null ? String(r.score) : "";
        remarkMap[s.id] = r?.remarks ?? "";
      });
      setScores(scoreMap);
      setRemarks(remarkMap);
    } catch (e: any) {
      if (requestId === entryRequestRef.current) setEntryError(e.message ?? "Could not load marks.");
    } finally {
      if (requestId === entryRequestRef.current) setEntryLoading(false);
    }
  }, [cid, token, queryClassId, queryExamId, querySubjectId]);

  useEffect(() => {
    if (isMarkEntryView && querySubjectId && classSubjects.some((subject) => subject.id === querySubjectId)) {
      loadExamData();
    }
  }, [isMarkEntryView, querySubjectId, classSubjects, loadExamData]);

  // ── Save Marks ───────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!queryExamId || !querySubjectId || !queryClassId || isLocked) return false;
    setSaving(true);
    setEntryError(null);
    try {
      const currentSubject = classSubjects.find((s) => s.id === querySubjectId);
      const subjectMaxMarks =
        currentSubject?.classSubject?.maxMarks ?? activeExam?.maxMarks ?? 50;
      const items = students
        .filter((s) => scores[s.id] !== "" && scores[s.id] !== undefined)
        .map((s) => ({
          subjectId: querySubjectId,
          studentId: s.id,
          score: Number(scores[s.id]),
          totalMarks: subjectMaxMarks,
          remarks: remarks[s.id] ?? "",
        }));

      if (!items.length) {
        setEntryError(t("teacherPages", "noScoresEntered", lang));
        return false;
      }

      await bulkUpsertResults(cid, token, {
        examId: queryExamId,
        classId: queryClassId,
        accademicYearId: ayId,
        results: items,
      });

      await loadExamData();
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
      return true;
    } catch (e: any) {
      setEntryError(e.message ?? t("teacherPages", "saveFailedMsg", lang));
      return false;
    } finally {
      setSaving(false);
    }
  };

  // ── Search ─────────────────────────────────────────────────────────────────

  const searchFiltered = useMemo(() => {
    const q = searchText.toLowerCase();
    return exams.filter((exam) => exam.name.toLowerCase().includes(q));
  }, [exams, searchText]);

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
  }, [searchText, pageSize]);

  const examSummary = [
    { label: "Total exams", value: searchFiltered.length, icon: GraduationCap, color: "text-primary-700" },
    { label: "Mark entry", value: searchFiltered.filter((exam) => exam.examStatus === "MARK_ENTRY").length, icon: ClipboardCheck, color: "text-primary-700" },
    { label: "Published", value: searchFiltered.filter((exam) => exam.examStatus === "PUBLISHED").length, icon: CalendarDays, color: "text-blue-700" },
    { label: "Draft", value: searchFiltered.filter((exam) => exam.examStatus === "DRAFT").length, icon: Clock3, color: "text-amber-700" },
  ];

  // ── Render Loading ───────────────────────────────────────────────────────────

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-0!">
          <PageHeader title={t("teacherPages", "examsLoadingTitle", lang)} />
          <div className="px-3 pb-2 pt-2">
            <Skeleton className="mx-auto h-10 w-full max-w-md rounded-lg" />
          </div>
          <div className="mx-3 mb-3 overflow-hidden rounded-2xl bg-white">
            <Skeleton className="h-20 rounded-none" />
            <div className="grid grid-cols-2 gap-px bg-gray-100 sm:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-20 rounded-none" />
              ))}
            </div>
          </div>
          <div className="mx-3 overflow-hidden rounded-2xl bg-white">
            <div className="divide-y divide-gray-100">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-2 p-3">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (exams.length === 0) {
    return (
      <DashboardLayout>
        <div className="p-0! pb-6!">
          <PageHeader title={t("teacherPages", "examsLoadingTitle", lang)} />
          <IllustratedEmptyState
            image="/images/teacher/exams-empty.webp"
            title={t("teacherPages", "noTermExamsHeading", lang)}
            description={t("teacherPages", "noTermExamsDescription", lang)}
          />
        </div>
      </DashboardLayout>
    );
  }

  // ── Render Dashboard Exams List View ─────────────────────────────────────────

  return (
    <DashboardLayout>
      <div className="p-0! pb-6!">
        <PageHeader title={t("teacherPages", "examsLoadingTitle", lang)} />

        <div className="px-3 pb-2 pt-6">
          <div className="mx-auto flex w-full max-w-md items-center gap-2">
            <InputGroup className="h-10 min-w-0 flex-1 rounded-lg bg-white">
              <InputGroupInput
                type="search"
                aria-label={t("teacherPages", "searchExamByName", lang)}
                placeholder={t("teacherPages", "searchExamByName", lang)}
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

        {error && (
          <ApiErrorBanner
            message={error}
            onRetry={() => {
              setError(null);
              window.location.reload();
            }}
          />
        )}

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

        <section className="card mx-3 divide-y divide-gray-100 overflow-hidden rounded-2xl bg-white p-0! shadow-none" data-ui-style="classic" aria-label="Exams">
          {pagedExams.length === 0 ? (
            <div className="flex flex-col items-center px-3 py-8 text-center">
              <img src="/icons/exams/empty.webp" alt="" className="mb-3 h-28 w-28 object-contain" />
              <p className="text-sm text-gray-500">
                {searchText ? t("common", "noResults", lang) : t("teacherPages", "noTermExams", lang)}
              </p>
            </div>
          ) : pagedExams.map((exam) => {
            const status = getExamStatusInfo(exam);
            return (
              <button
                key={exam.id}
                type="button"
                onClick={() => setSelectedExamId(exam.id)}
                className="w-full rounded-none p-3 text-left transition-colors hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary-500"
              >
                <span className="flex items-start justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-gray-900">{exam.name}</span>
                    <span className="mt-0.5 block text-xs text-gray-500">{status.description || "—"}</span>
                  </span>
                  <ExamStatusBadge exam={exam} className="rounded-full border px-2.5 py-1 text-xs font-medium normal-case tracking-normal" />
                </span>
                <span className="mt-2 flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
                  <span className="min-w-0">
                    <span className="block text-xs text-gray-500">{t("teacherPages", "classDetail", lang)}</span>
                    <span className="block text-sm font-semibold text-gray-900">{exam.class?.name ?? "—"}</span>
                  </span>
                  <span className="text-right text-xs text-gray-500">
                    <span className="block">{t("teacherPages", "examStartDetail", lang)} – {t("teacherPages", "examEndDetail", lang)}</span>
                    <span className="block font-medium text-gray-700">{shortDate(exam.startDate)} – {shortDate(exam.endDate)}</span>
                  </span>
                </span>
              </button>
            );
          })}
        </section>

        {sortedExams.length > 0 && (
          <div className="mx-3 mt-3 flex flex-wrap items-center justify-center gap-3 text-sm text-gray-500">
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
              {[10, 20, 50, 100].map((size) => <option key={size} value={size}>{size} per page</option>)}
            </select>
          </div>
        )}

        <ResponsivePopover
          open={!!selectedExam}
          onOpenChange={(open) => {
            if (!open) setSelectedExamId(null);
          }}
          side="bottom"
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

              {selectedExam.examStatus === "PUBLISHED" ? (
                <Button className="w-full" onClick={() => {
                  setSelectedExamId(null);
                  goToClassReport(selectedExam.id, teacherClasses[0]?.id || "");
                }}>
                  {t("teacherPages", "viewResultsDetail", lang)}
                </Button>
              ) : null}
            </div>
          )}
        </ResponsivePopover>

        <ResponsivePopover
          open={isMarkEntryView}
          onOpenChange={(open) => {
            if (!open) closeMarkEntry();
          }}
          fullHeight
          onBack={closeMarkEntry}
          title={activeExam?.name ?? t("teacherPages", "enterMarksBreadcrumb", lang)}
          description={t("teacherPages", "enterMarksBreadcrumb", lang)}
          footer={isMarkEntryView && (
            <TeacherMarkEntryActions
              clientId={cid}
              token={token}
              examId={queryExamId}
              examName={activeExam?.name ?? "Exam"}
              examType={activeExam?.type ?? "TERM_EXAM"}
              classId={queryClassId}
              className={teacherClasses.find((cls) => cls.id === queryClassId)?.name ?? "Class"}
              lang={lang}
              saving={saving}
              saved={saved}
              isLocked={isLocked}
              hasEnteredScores={students.some((student) => scores[student.id] !== "" && scores[student.id] !== undefined)}
              saveDisabled={entryLoading || subjectLoading || saving || isLocked || hasInvalidMarks || students.length === 0}
              importDisabled={entryLoading || subjectLoading || !queryExamId || !queryClassId || !querySubjectId}
              resetDisabled={entryLoading || subjectLoading || saving || students.length === 0}
              onSave={handleSave}
              onImport={() => setImportOpen(true)}
              onReset={resetScores}
            />
          )}
          className="md:max-w-none"
          contentClassName="min-w-0"
        >
          {isMarkEntryView && (
            <div className="mx-auto w-full max-w-6xl py-4">
            <TeacherMarkEntryView
              gridProps={{
                exams,
                classes: teacherClasses,
                subjects: classSubjects,
                students,
                examId: queryExamId,
                classId: queryClassId,
                subjectId: querySubjectId,
                scores,
                remarks,
                isLocked,
                saving,
                saved,
                loading: entryLoading || subjectLoading,
                error: entryError,
                activeExam,
                onExamChange: (value) => setSearchParams((prev) => {
                  prev.set("examId", value);
                  return prev;
                }),
                onClassChange: () => {},
                onSubjectChange: (value) => {
                  setEntryLoading(true);
                  setSearchParams((prev) => {
                    prev.set("subjectId", value);
                    return prev;
                  });
                },
                onScoreChange: (studentId, value) => setScores((prev) => ({ ...prev, [studentId]: value })),
                onRemarkChange: (studentId, value) => setRemarks((prev) => ({ ...prev, [studentId]: value })),
                onSave: handleSave,
                showRemarks: true,
                compactStudentRows: true,
                showLockPeriod: true,
              }}
              clientId={cid}
              token={token}
              academicYearId={ayId}
              importOpen={importOpen}
              onImportOpenChange={setImportOpen}
              onReload={loadExamData}
            />
            </div>
          )}
        </ResponsivePopover>
      </div>
    </DashboardLayout>
  );
}
