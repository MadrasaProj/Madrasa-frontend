import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { ApiErrorBanner } from "@/components/ui/ApiErrorBanner";
import { DataTable, type SortDir } from "@/components/ui/DataTable";
import { getExams, type ExamRecord } from "@/lib/exams-api";
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
import {
  GraduationCap,
  Search,
  X,
} from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ResponsivePopover } from "@/components/ui/responsivePopover";
import { ExamStatusBadge, getExamStatusInfo } from "@/components/exam/ExamStatusBadge";
import { TeacherMarkEntryView } from "@/components/exam/TeacherMarkEntryView";
import { useExamColumns } from "@/components/exam/ExamColumns";
import { fmt } from "@/lib/exam-utils";
import { ButtonGroup } from "@/components/ui/button-group";

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
  const initialExamId = useRef(queryExamId);
  const queryClassId = searchParams.get("classId") ?? "";
  const querySubjectId = searchParams.get("subjectId") ?? "";

  // Data
  const [allClasses, setAllClasses] = useState<ClassRecord[]>([]);
  const [mySubjects, setMySubjects] = useState<SubjectRecord[]>([]);
  const [exams, setExams] = useState<ExamRecord[]>([]);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [existingResults, setExistingResults] = useState<ResultRecord[]>([]);
  const [scores, setScores] = useState<Record<string, string>>({});
  const [remarks, setRemarks] = useState<Record<string, string>>({});

  // UI state
  const [loading, setLoading] = useState(true);
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
  const myClassIds = new Set(mySubjects.map((s) => s.classId));
  const teacherClasses = allClasses.filter(
    (c) => myClassIds.has(c.id) || c.classTeacherId === teacherId,
  );

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
    setSearchParams((prev) => {
      prev.set("view", "mark-entry");
      prev.set("examId", exam.id);
      const firstCls = teacherClasses[0]?.id || "";
      if (firstCls) prev.set("classId", firstCls);
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

  const resetScores = () => {
    if (!window.confirm(t("teacherPages", "confirmResetMarks", lang))) return;
    const scoreMap: Record<string, string> = {};
    students.forEach((student) => {
      const result = existingResults.find(
        (item) => item.student?.id === student.id && item.subject?.id === querySubjectId,
      );
      scoreMap[student.id] = result != null ? String(result.score) : "";
    });
    setScores(scoreMap);
  };

  // ── Initial load ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!cid || !token || !teacherId) return;
    setLoading(true);

    Promise.all([
      getMyClasses(cid, token),
      getSubjects(cid, token, { teacherId, limit: 500 }),
      getExams(cid, token, { accademicYearId: ayId || undefined, limit: 50 }),
    ])
      .then(([cls, subs, examData]) => {
        setAllClasses(cls);
        setMySubjects(subs.data ?? []);
        const loadedExams = (examData.data ?? []).filter(
          (e) => e.type === "TERM_EXAM" || !e.type,
        );
        setExams(loadedExams);

        // Auto-initialize query params if not set
        if (!initialExamId.current && loadedExams[0]) {
          initialExamId.current = loadedExams[0].id;
          const firstClass =
            cls.find((c) => c.classTeacherId === teacherId) || cls[0];
          const mine = (subs.data ?? []).filter(
            (s) => s.classId === firstClass?.id,
          );
          setSearchParams((prev) => {
            prev.set("examId", loadedExams[0].id);
            if (firstClass) prev.set("classId", firstClass.id);
            if (mine[0]) prev.set("subjectId", mine[0].id);
            return prev;
          });
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [cid, token, teacherId, ayId, setSearchParams]);

  // ── Load subjects for selected class ─────────────────────────────────────────

  useEffect(() => {
    if (!cid || !token || !queryClassId) return;
    const cls = allClasses.find((c) => c.id === queryClassId);
    const isOwn = cls?.classTeacherId === teacherId;

    if (isOwn) {
      getSubjects(cid, token, { classId: queryClassId, limit: 200 })
        .then((r) => {
          const subs = r.data ?? [];
          setClassSubjects(subs);
          if (subs.length > 0 && !subs.some((s) => s.id === querySubjectId)) {
            setSearchParams((prev) => {
              prev.set("subjectId", subs[0].id);
              return prev;
            });
          }
        })
        .catch((e: Error) => setError(e.message));
    } else {
      const mine = mySubjects.filter((s) => s.classId === queryClassId);
      setClassSubjects(mine);
      if (mine.length > 0 && !mine.some((s) => s.id === querySubjectId)) {
        setSearchParams((prev) => {
          prev.set("subjectId", mine[0].id);
          return prev;
        });
      }
    }
  }, [
    queryClassId,
    allClasses,
    mySubjects,
    teacherId,
    cid,
    token,
    querySubjectId,
    setSearchParams,
  ]);

  // ── Load students + results when exam/class/subject changes ──────────────────

  const loadExamData = useCallback(async () => {
    if (!cid || !token || !queryClassId || !queryExamId) return;

    const [stuData, resData] = await Promise.all([
      getStudents(cid, token, { classId: queryClassId, limit: 200 }).catch(
        () => ({ data: [] as StudentRecord[] }),
      ),
      querySubjectId
        ? getResults(cid, token, {
            examId: queryExamId,
            classId: queryClassId,
            limit: 500,
          }).catch(() => ({ data: [] as ResultRecord[] }))
        : Promise.resolve({ data: [] as ResultRecord[] }),
    ]);

    const stuList = stuData.data ?? [];
    const resList = resData.data ?? [];
    setStudents(stuList);
    setExistingResults(resList);

    // Pre-fill scores for current subject only
    if (querySubjectId) {
      const scoreMap: Record<string, string> = {};
      const remarkMap: Record<string, string> = {};
      stuList.forEach((s) => {
        const r = resList.find(
          (r) => r.student?.id === s.id && r.subject?.id === querySubjectId,
        );
        scoreMap[s.id] = r != null ? String(r.score) : "";
        remarkMap[s.id] = ""; // remarks computed in state
      });
      setScores(scoreMap);
      setRemarks(remarkMap);
    }
  }, [cid, token, queryClassId, queryExamId, querySubjectId]);

  useEffect(() => {
    if (isMarkEntryView) {
      loadExamData();
    }
  }, [isMarkEntryView, loadExamData]);

  // ── Save Marks ───────────────────────────────────────────────────────────────

  const handleSave = async (submit = false) => {
    if (!queryExamId || !querySubjectId || !queryClassId || isLocked) return;
    setSaving(true);
    setError(null);
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
        }));

      if (!items.length) {
        setError(t("teacherPages", "noScoresEntered", lang));
        return;
      }

      await bulkUpsertResults(cid, token, {
        examId: queryExamId,
        classId: queryClassId,
        accademicYearId: ayId,
        results: items,
      });

      await loadExamData();
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        if (submit) {
          closeMarkEntry();
        }
      }, 1500);
    } catch (e: any) {
      setError(e.message ?? t("teacherPages", "saveFailedMsg", lang));
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

  // ── Columns ────────────────────────────────────────────────────────────────

  const columns = useExamColumns({
    showActions: false,
    showAllColumns: true,
    showExamIcon: false,
  });

  // ── Render Loading ───────────────────────────────────────────────────────────

  if (loading) {
    return (
      <DashboardLayout>
        <div className="  ">
          <PageHeader title={t("teacherPages", "examsLoadingTitle", lang)} />
          <Skeleton className="h-12 rounded-xl" />
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
        </div>
      </DashboardLayout>
    );
  }

  // ── Render Dashboard Exams List View ─────────────────────────────────────────

  return (
    <DashboardLayout>
      <div className="">
        <PageHeader title={t("teacherPages", "examsLoadingTitle", lang)} />

        <div className="sticky top-12 z-30 -mx-4 mb-4 flex h-10 gap-2 bg-white  px-4  *:my-auto shadow-lg shadow-gray-400/10">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              type="search"
              aria-label={t("teacherPages", "searchExamByName", lang)}
              placeholder={t("teacherPages", "searchExamByName", lang)}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="h-8 border-0 bg-transparent pl-9 pr-2 shadow-none focus-visible:ring-0"
            />
          </div>
          {searchText && (
            <Button
              variant="ghost"
              size="icon"
              aria-label={t("common", "clearSearch", lang)}
              onClick={() => setSearchText("")}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
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

        <DataTable
          alwaysTable
          columns={columns}
          data={pagedExams}
          keyExtractor={(e) => e.id}
          onRowClick={(exam) => setSelectedExamId(exam.id)}
          loading={loading}
          error={null}
          emptyImage="/icons/exams/empty.webp"
          emptyMessage={
            searchText
              ? t("common", "noResults", lang)
              : t("teacherPages", "noTermExams", lang)
          }
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
        />

        <ResponsivePopover
          open={!!selectedExam}
          onOpenChange={(open) => {
            if (!open) setSelectedExamId(null);
          }}
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
                <p className="text-sm mt-1 text-gray-500">{getExamStatusInfo(selectedExam).description}</p>
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
          side="bottom"
          drawerOnDesktop
          title={activeExam?.name ?? t("teacherPages", "enterMarksBreadcrumb", lang)}
          description={t("teacherPages", "enterMarksBreadcrumb", lang)}
          footer={
            isMarkEntryView && (
              <div className="border-t border-gray-200 bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6">
                   <ButtonGroup className="w-full justify-end">

                  <Button type="button" variant="outline" size="lg" className=" " disabled={!queryExamId || !queryClassId || !querySubjectId} onClick={() => setImportOpen(true)}>
                    Import
                  </Button>
                  <Button type="button" variant="outline" size="lg" className=" " disabled={saving || students.length === 0} onClick={resetScores}>
                    Reset
                  </Button>
                  <Button type="button" variant="outline" size="lg" className="" disabled={saving || isLocked || hasInvalidMarks || students.length === 0} onClick={() => handleSave(false)}>
                    Save as Draft
                  </Button>
                  <Button type="button" size="lg" className=" " disabled={saving || isLocked || hasInvalidMarks || students.length === 0} onClick={() => handleSave(true)}>
                    {saving ? "Saving…" : saved ? "Saved" : "Save"}
                  </Button>
                  </ButtonGroup>
               </div>
            )
          }
          className="mx-auto w-full max-w-6xl rounded-t-2xl"
          contentClassName="min-w-0"
        >
          {isMarkEntryView && (
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
                error,
                activeExam,
                onExamChange: (value) => setSearchParams((prev) => {
                  prev.set("examId", value);
                  return prev;
                }),
                onClassChange: (value) => setSearchParams((prev) => {
                  prev.set("classId", value);
                  return prev;
                }),
                onSubjectChange: (value) => setSearchParams((prev) => {
                  prev.set("subjectId", value);
                  return prev;
                }),
                onScoreChange: (studentId, value) => setScores((prev) => ({ ...prev, [studentId]: value })),
                onRemarkChange: (studentId, value) => setRemarks((prev) => ({ ...prev, [studentId]: value })),
                onSave: handleSave,
                showRemarks: true,
                showLockPeriod: true,
              }}
              clientId={cid}
              token={token}
              academicYearId={ayId}
              importOpen={importOpen}
              onImportOpenChange={setImportOpen}
              onReload={loadExamData}
            />
          )}
        </ResponsivePopover>
      </div>
    </DashboardLayout>
  );
}
