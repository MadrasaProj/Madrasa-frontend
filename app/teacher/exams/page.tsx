import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { ApiErrorBanner } from "@/components/ui/ApiErrorBanner";
import { DataTable, type Column, type SortDir } from "@/components/ui/DataTable";
import { getExams, type ExamRecord, type ExamStatus } from "@/lib/exams-api";
import { getResults, bulkUpsertResults, type ResultRecord } from "@/lib/results-api";
import { getMyClasses, type ClassRecord } from "@/lib/classes-api";
import { getSubjects, type SubjectRecord } from "@/lib/subjects-api";
import { getStudents, type StudentRecord } from "@/lib/students-api";
import { useAuthStore } from "@/store/auth";
import { cn } from "@/lib/utils";
import {
  GraduationCap, Save, Loader2, CheckCircle2, Lock, Calendar, AlertCircle,
  Clock, Award, ArrowLeft, RotateCcw, PenLine, FileSpreadsheet, Eye,
  ClipboardCheck, Trophy, Search, X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Skeleton } from "@/components/ui/Skeleton";
import { ExamStatusBadge, getExamStatusInfo } from "@/components/exam/ExamStatusBadge";
import { ExcelImportModal } from "@/components/exam/ExcelImportModal";



function fmt(d?: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function shortDate(d?: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
  });
}

export default function TeacherExamsPage() {
 const { user, accessToken } = useAuthStore();
 const navigate = useNavigate();
 const location = useLocation();
 const [searchParams, setSearchParams] = useSearchParams();
 const cid = user?.clientId ?? "";
 const token = accessToken ?? "";
 const ayId = user?.defaultAcademicYearId ?? "";
 const teacherId = user?.id ?? "";

  // UI Mode (list vs mark-entry)
  const isMarkEntryView = searchParams.get("view") === "mark-entry";

 // Selection states (from query params or fallback)
 const queryExamId = searchParams.get("examId") ?? "";
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
	const [importOpen, setImportOpen] = useState(false);

	const [classSubjects, setClassSubjects] = useState<SubjectRecord[]>([]);

	const [searchText, setSearchText] = useState("");
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(10);
	const [sortBy, setSortBy] = useState<string | undefined>("startDate");
	const [sortDir, setSortDir] = useState<SortDir>("desc");

 // Derived arrays
 const myClassIds = new Set(mySubjects.map((s) => s.classId));
 const teacherClasses = allClasses.filter((c) => myClassIds.has(c.id) || c.classTeacherId === teacherId);

 const activeExam = exams.find((e) => e.id === queryExamId);
 const isLocked = !activeExam
 || activeExam.examStatus !== "MARK_ENTRY"
 || (!!activeExam.markEntryLastDate && new Date() > new Date(activeExam.markEntryLastDate));

 const goToClassReport = (examId: string, classId: string) => {
 const back = location.pathname + location.search;
 navigate(`/teacher/exams/class-report?examId=${examId}&classId=${classId}&ayId=${ayId}&back=${encodeURIComponent(back)}`);
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
 const loadedExams = (examData.data ?? []).filter((e) => e.type === "TERM_EXAM" || !e.type);
 setExams(loadedExams);

 // Auto-initialize query params if not set
 if (!queryExamId && loadedExams[0]) {
 const firstClass = cls.find((c) => c.classTeacherId === teacherId) || cls[0];
 const mine = (subs.data ?? []).filter((s) => s.classId === firstClass?.id);
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
 }, [cid, token, teacherId, ayId, queryExamId, setSearchParams]);

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
 setSearchParams((prev) => { prev.set("subjectId", subs[0].id); return prev; });
 }
 })
 .catch((e: Error) => setError(e.message));
 } else {
 const mine = mySubjects.filter((s) => s.classId === queryClassId);
 setClassSubjects(mine);
 if (mine.length > 0 && !mine.some((s) => s.id === querySubjectId)) {
 setSearchParams((prev) => { prev.set("subjectId", mine[0].id); return prev; });
 }
 }
 }, [queryClassId, allClasses, mySubjects, teacherId, cid, token, querySubjectId, setSearchParams]);

 // ── Load students + results when exam/class/subject changes ──────────────────

 const loadExamData = useCallback(async () => {
 if (!cid || !token || !queryClassId || !queryExamId) return;

 const [stuData, resData] = await Promise.all([
 getStudents(cid, token, { classId: queryClassId, limit: 200 }).catch(() => ({ data: [] as StudentRecord[] })),
 querySubjectId
 ? getResults(cid, token, { examId: queryExamId, classId: queryClassId, limit: 500 }).catch(() => ({ data: [] as ResultRecord[] }))
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
 const r = resList.find((r) => r.student?.id === s.id && r.subject?.id === querySubjectId);
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
 const items = students
 .filter((s) => scores[s.id] !== "" && scores[s.id] !== undefined)
 .map((s) => ({
 subjectId: querySubjectId,
 studentId: s.id,
 score: Number(scores[s.id]),
 totalMarks: 100,
 }));

 if (!items.length) {
 setError("No scores entered");
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
 // Redirect back to list on submit
 setSearchParams((prev) => {
 prev.delete("view");
 return prev;
 });
 }
 }, 1500);
 } catch (e: any) {
 setError(e.message ?? "Save failed");
 } finally {
 setSaving(false);
 }
 };



 // ── Derived Stats & Filtering ──────────────────────────────────────────────

 const upcomingExams = exams.filter((e) => e.startDate && new Date(e.startDate) > new Date());
 const markEntryOpenExams = exams.filter((e) => e.examStatus === "MARK_ENTRY" && (!e.markEntryLastDate || new Date(e.markEntryLastDate) >= new Date()));
 const completedExams = exams.filter((e) => {
 if (e.examStatus === "PUBLISHED") return false;
 if (e.markEntryLastDate && new Date(e.markEntryLastDate) < new Date()) return true;
 return false;
 });
 const publishedExams = exams.filter((e) => e.examStatus === "PUBLISHED");

  const searchFiltered = useMemo(() => {
    const q = searchText.toLowerCase();
    return exams.filter((exam) => {
      if (q && !exam.name.toLowerCase().includes(q)) return false;
      return true;
    });
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

  const filled = Object.values(scores).filter((v) => v !== "").length;
  const avg = filled > 0
    ? Math.round(Object.values(scores).filter((v) => v !== "").reduce((s, v) => s + Number(v), 0) / filled)
    : 0;

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
            {exam.examStatus === "PUBLISHED" ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  goToClassReport(exam.id, teacherClasses[0]?.id || "");
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-700 transition-colors text-xs font-semibold"
                title="View Results"
              >
                <Eye className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Results</span>
              </button>
            ) : exam.examStatus === "MARK_ENTRY" && (!exam.markEntryLastDate || new Date(exam.markEntryLastDate) >= new Date()) ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSearchParams((prev) => {
                    prev.set("view", "mark-entry");
                    prev.set("examId", exam.id);
                    const firstCls = teacherClasses[0]?.id || "";
                    if (firstCls) prev.set("classId", firstCls);
                    return prev;
                  });
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors text-xs font-semibold"
                title="Enter Marks"
              >
                <PenLine className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Enter</span>
              </button>
            ) : (
              <button
                disabled
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-gray-50 text-gray-400 cursor-not-allowed transition-colors text-xs font-semibold"
                title="No action available"
              >
                <Lock className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Locked</span>
              </button>
            )}
          </div>
        ),
        className: "text-right",
      },
    ],
    [],
  );

  // ── Render Loading ───────────────────────────────────────────────────────────

 if (loading) {
 return (
 <DashboardLayout>
 <div className="px-4 py-3 lg:px-8 lg:py-6 space-y-6">
 <PageHeader
 title="Exams"
 subtitle="View exam schedule and enter marks"
 icon={GraduationCap}
 />
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
 </div>
 </DashboardLayout>
 );
 }

 // ── Render Mark Entry Grid View ──────────────────────────────────────────────

 if (isMarkEntryView) {
 return (
 <DashboardLayout>
 <div className="px-4 py-3 lg:px-8 lg:py-6 space-y-6">
 
 {/* Breadcrumb Header */}
 <div className="flex items-center gap-3">
 <button
 onClick={() => setSearchParams((prev) => { prev.delete("view"); return prev; })}
 className="p-2 border border-gray-200 hover:bg-gray-50 rounded-xl transition-colors text-gray-600"
 >
 <ArrowLeft className="w-4 h-4" />
 </button>
 <div>
 <div className="flex items-center gap-2 text-xs text-gray-400 font-bold uppercase tracking-wider">
 <span>Exams</span>
 <span>/</span>
 <span>Mark Entry</span>
 </div>
 <h1 className="text-xl font-extrabold text-gray-900 tracking-tight mt-0.5">Enter Marks</h1>
 </div>
 </div>

 {/* Error notice */}
 {error && (
 <div className="bg-rose-50 border border-rose-100 text-rose-600 text-sm px-4 py-3 rounded-2xl flex items-center gap-2">
 <AlertCircle className="w-4 h-4 shrink-0" /> {error}
 </div>
 )}

 {/* Selectors grid */}
 <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white p-4 rounded-3xl border border-gray-100 shadow-sm">
 <div>
 <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5">Select Exam</label>
 <select
 value={queryExamId}
 onChange={(e) => setSearchParams((prev) => { prev.set("examId", e.target.value); return prev; })}
 className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/20 bg-white"
 >
 {exams.map((ex) => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
 </select>
 </div>
 <div>
 <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5">Select Class</label>
 <select
 value={queryClassId}
 onChange={(e) => setSearchParams((prev) => { prev.set("classId", e.target.value); return prev; })}
 className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/20 bg-white"
 >
 {teacherClasses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
 </select>
 </div>
 <div>
 <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5">Select Subject</label>
 <select
 value={querySubjectId}
 onChange={(e) => setSearchParams((prev) => { prev.set("subjectId", e.target.value); return prev; })}
 disabled={classSubjects.length === 0}
 className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/20 bg-white disabled:opacity-50"
 >
 {classSubjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
 </select>
 </div>
 </div>

 {/* Mark entry period box & download template button */}
 {activeExam && (
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-emerald-50/40 border border-emerald-100 rounded-3xl">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded-2xl bg-emerald-100/50 flex items-center justify-center shrink-0 text-emerald-700">
 <Calendar className="w-5 h-5" />
 </div>
 <div>
 <p className="text-xs font-bold text-emerald-800 flex items-center gap-2">
 Mark Entry Period
 <span className={cn("px-2 py-0.5 rounded-full text-[9px] border font-extrabold uppercase", isLocked ? "bg-rose-50 text-rose-700 border-rose-100" : "bg-emerald-50 text-emerald-700 border-emerald-100")}>
 {isLocked ? "Closed" : "Open"}
 </span>
 </p>
 <p className="text-xs text-gray-500 mt-0.5">
 {activeExam.endDate ? fmt(new Date(new Date(activeExam.endDate).getTime() + 86400000).toISOString()) : "—"} – {fmt(activeExam.markEntryLastDate)}
 </p>
 </div>
 </div>
 <div className="flex items-center gap-2">
 <button
 onClick={() => setImportOpen(true)}
 className="inline-flex items-center gap-2 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-sm hover:scale-[1.01]"
 >
 <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Import / Export Excel
 </button>
 </div>
 </div>
 )}

 {/* Student list grid table */}
 {students.length === 0 ? (
 <div className="text-center py-20 bg-white border border-gray-100 rounded-3xl p-6">
 <GraduationCap className="w-12 h-12 text-gray-200 mx-auto mb-3" />
 <p className="text-sm font-semibold text-gray-900">No students in this class</p>
 <p className="text-xs text-gray-400 mt-1">Make sure you have students registered in this class.</p>
 </div>
 ) : (
 <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden flex flex-col">
 {/* Desktop Table View */}
 <div className="hidden sm:block overflow-x-auto">
 <table className="w-full text-left border-collapse text-sm">
 <thead>
 <tr className="bg-gray-50 border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
 <th className="px-6 py-4 w-12 text-center">#</th>
 <th className="px-4 py-4">Student Name</th>
 <th className="px-4 py-4 w-40">Admission No</th>
 <th className="px-4 py-4 w-32 text-center">Full Mark</th>
 <th className="px-4 py-4 w-44 text-center">Obtained Mark *</th>
 <th className="px-6 py-4">Remarks (Optional)</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-50">
 {students.map((s, idx) => {
 const score = scores[s.id] ?? "";
 const remark = remarks[s.id] ?? "";
 return (
 <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">
 <td className="px-6 py-3.5 text-center text-gray-400 font-medium">{idx + 1}</td>
 <td className="px-4 py-3.5">
 <p className="font-bold text-gray-900 leading-tight">{s.name}</p>
 <span className="text-[10px] text-gray-400 uppercase font-semibold">{s.gender ?? "Male"}</span>
 </td>
 <td className="px-4 py-3.5 font-mono text-xs font-semibold text-gray-700">{s.adno}</td>
 <td className="px-4 py-3.5 text-center text-gray-500 font-bold">100</td>
 <td className="px-4 py-3.5 text-center">
 <input
 type="number"
 min={0}
 max={100}
 disabled={isLocked || saving}
 value={score}
 onChange={(e) => setScores((prev) => ({ ...prev, [s.id]: e.target.value }))}
 placeholder="—"
 className={cn(
 "w-24 text-center px-3 py-2 border rounded-xl text-sm font-bold focus:outline-none transition-all",
 isLocked
 ? "bg-gray-50 border-gray-100 text-gray-300 cursor-not-allowed"
 : "border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-400/20"
 )}
 />
 </td>
 <td className="px-6 py-3.5">
 <input
 type="text"
 disabled={isLocked || saving}
 value={remark}
 onChange={(e) => setRemarks((prev) => ({ ...prev, [s.id]: e.target.value }))}
 placeholder="Good progress, excellent..."
 className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500 transition-all bg-white"
 />
 </td>
 </tr>
 );
 })}
 </tbody>
 </table>
 </div>

 {/* Mobile Card-Based List View */}
 <div className="block sm:hidden divide-y divide-gray-100 max-h-[60vh] overflow-y-auto">
 {students.map((s, idx) => {
 const score = scores[s.id] ?? "";
 const remark = remarks[s.id] ?? "";
 return (
 <div key={s.id} className="p-4 space-y-3">
 <div className="flex items-start justify-between gap-3">
 <div className="min-w-0">
 <div className="flex items-center gap-1.5">
 <span className="text-xs text-gray-400 font-bold">#{idx + 1}</span>
 <p className="font-bold text-gray-900 text-sm leading-snug truncate">{s.name}</p>
 </div>
 <p className="text-[11px] text-gray-400 mt-0.5">
 AdNo: <span className="font-semibold font-mono text-gray-600">{s.adno}</span> · {s.gender ?? "Male"}
 </p>
 </div>
 <div className="flex items-center gap-1.5 shrink-0">
 <span className="text-xs text-gray-400 font-medium mr-1">/100</span>
 <input
 type="number"
 min={0}
 max={100}
 disabled={isLocked || saving}
 value={score}
 onChange={(e) => setScores((prev) => ({ ...prev, [s.id]: e.target.value }))}
 placeholder="—"
 className={cn(
 "w-16 text-center py-1.5 px-2 border rounded-xl text-sm font-bold focus:outline-none transition-all",
 isLocked
 ? "bg-gray-50 border-gray-100 text-gray-300 cursor-not-allowed"
 : "border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-400/20"
 )}
 />
 </div>
 </div>
 <div>
 <input
 type="text"
 disabled={isLocked || saving}
 value={remark}
 onChange={(e) => setRemarks((prev) => ({ ...prev, [s.id]: e.target.value }))}
 placeholder="Add remark..."
 className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500 transition-all bg-white"
 />
 </div>
 </div>
 );
 })}
 </div>

 {/* Bottom statistics bar */}
 <div className="bg-gray-50 px-6 py-4 flex flex-wrap items-center justify-between border-t border-gray-100 gap-4">
 <div className="flex items-center gap-6">
 <div className="text-xs">
 <span className="text-gray-400">Total Students:</span> <strong className="text-gray-900 font-bold ml-1">{students.length}</strong>
 </div>
 <div className="text-xs">
 <span className="text-emerald-500 font-semibold">Entered:</span> <strong className="text-emerald-700 font-extrabold ml-1">{filled}</strong>
 </div>
 <div className="text-xs">
 <span className="text-amber-500 font-semibold font-mono">Remaining:</span> <strong className="text-amber-700 font-extrabold ml-1">{students.length - filled}</strong>
 </div>
 </div>
 <div className="flex items-center gap-2">
 <button
 onClick={() => {
 if (confirm("Reset entered marks?")) {
 const scoreMap: Record<string, string> = {};
 students.forEach((s) => {
 const r = existingResults.find((r) => r.student?.id === s.id && r.subject?.id === querySubjectId);
 scoreMap[s.id] = r != null ? String(r.score) : "";
 });
 setScores(scoreMap);
 }
 }}
 className="inline-flex items-center gap-1.5 border border-gray-200 hover:bg-gray-100 text-gray-600 font-bold text-xs px-4 py-2.5 rounded-xl transition-colors bg-white shadow-xs"
 >
 <RotateCcw className="w-3.5 h-3.5" /> Reset
 </button>
 <button
 onClick={() => handleSave(false)}
 disabled={saving || isLocked}
 className="inline-flex items-center gap-1.5 border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs px-4 py-2.5 rounded-xl transition-colors shadow-xs"
 >
 {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
 Save as Draft
 </button>
 <button
 onClick={() => handleSave(true)}
 disabled={saving || isLocked}
 className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all shadow-sm hover:scale-[1.01]"
 >
 {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
 Save &amp; Submit
 </button>
 </div>
 </div>
 </div>
 )}

 {importOpen && queryExamId && queryClassId && querySubjectId && (
 <ExcelImportModal
 clientId={cid}
 token={token}
 examId={queryExamId}
 classId={queryClassId}
 accademicYearId={ayId}
 subjects={classSubjects.find((s) => s.id === querySubjectId) ? [{
 id: querySubjectId,
 name: classSubjects.find((s) => s.id === querySubjectId)!.name,
 maxMarks: activeExam?.maxMarks ?? 100
 }] : []}
 students={students.map((s) => ({ id: s.id, name: s.name, adno: s.adno }))}
 onClose={() => setImportOpen(false)}
 onSuccess={async () => {
 setImportOpen(false);
 await loadExamData();
 }}
 />
 )}

 </div>
 </DashboardLayout>
 );
 }



  // ── Render Dashboard Exams List View ─────────────────────────────────────────

  return (
    <DashboardLayout>
      <div className="px-4 py-3 lg:px-8 lg:py-6 space-y-6">

        <PageHeader
          title="Exams"
          subtitle="View exam schedule and enter marks"
          icon={GraduationCap}
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

        {error && (
          <ApiErrorBanner
            message={error}
            onRetry={() => {
              setError(null);
              window.location.reload();
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
          {searchText && (
            <button
              onClick={() => setSearchText("")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
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
            pageSizeOptions: [10, 20, 50, 100],
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
                  {exam.examStatus === "PUBLISHED" ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        goToClassReport(exam.id, teacherClasses[0]?.id || "");
                      }}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-700 transition-colors text-xs font-bold"
                    >
                      <Eye className="w-3.5 h-3.5" /> View Results
                    </button>
                  ) : exam.examStatus === "MARK_ENTRY" && (!exam.markEntryLastDate || new Date(exam.markEntryLastDate) >= new Date()) ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSearchParams((prev) => {
                          prev.set("view", "mark-entry");
                          prev.set("examId", exam.id);
                          const firstCls = teacherClasses[0]?.id || "";
                          if (firstCls) prev.set("classId", firstCls);
                          return prev;
                        });
                      }}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors text-xs font-bold"
                    >
                      <PenLine className="w-3.5 h-3.5" /> Enter Marks
                    </button>
                  ) : (
                    <button
                      disabled
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-gray-50 text-gray-400 cursor-not-allowed transition-colors text-xs font-bold"
                    >
                      <Lock className="w-3.5 h-3.5" /> No Action
                    </button>
                  )}
                </div>
              </div>
            );
          }}
        />
      </div>
    </DashboardLayout>
  );
}
