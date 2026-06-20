import { useState, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { ApiErrorBanner } from "@/components/ui/ApiErrorBanner";
import { PageHeader } from "@/components/ui/PageHeader";
import { ClassResultTable } from "@/components/exam/ClassResultTable";
import { RankPoster } from "@/components/exam/RankPoster";
import { MarklistPoster } from "@/components/exam/MarklistPoster";
import { ResultAnnouncementPoster } from "@/components/exam/ResultAnnouncementPoster";
import { ExcelImportModal } from "@/components/exam/ExcelImportModal";
import {
  useClassReport, useComputeSummary, useSetFinalStatus, useStudents,
} from "@/lib/api-hooks";
import {
  type ClassReport, type ClassReportRow, type ResultStatus, type TotalGrade,
  TOTAL_GRADE_LABELS,
} from "@/lib/results-api";
import { useAuthStore } from "@/store/auth";
import { cn } from "@/lib/utils";
import {
  RefreshCw, Loader2, Trophy, FileSpreadsheet,
  CheckCircle2, AlertCircle, GraduationCap
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { PageSkeleton } from "@/components/ui/Skeleton";

type Tab = "table" | "marklist" | "status" | "posters";

const TOTAL_GRADE_OPTIONS: { value: TotalGrade; label: string }[] = [
  { value: "DISTINCTION",  label: "Distinction"  },
  { value: "FIRST_CLASS",  label: "First Class"  },
  { value: "SECOND_CLASS", label: "Second Class" },
  { value: "THIRD_CLASS",  label: "Third Class"  },
  { value: "TOP_PLUS",     label: "Top Plus"     },
  { value: "FAILED",       label: "Failed"       },
];

// ── Helper ────────────────────────────────────────────────────────────────────

function fmt(d?: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ClassReportPage() {
  const [params]   = useSearchParams();
  const navigate   = useNavigate();
  const examId   = params.get("examId") ?? "";
  const classId  = params.get("classId") ?? "";
  const ayId     = params.get("ayId") ?? "";
  const backPath = params.get("back");

  const { user, activeClientId, accessToken } = useAuthStore();
  const cid = activeClientId ?? "";
  const token = accessToken ?? "";
  const isAdmin      = user?.actorType === "SUPER_ADMIN" || user?.actorType === "CLIENT_ADMIN";
  const isTeacher    = user?.actorType === "TEACHER";
  const canCompute   = isAdmin || isTeacher;

  const { data: report, isLoading: loading, error } = useClassReport({ examId, classId });
  const { data: studentsData } = useStudents({ classId, limit: 500 });
  const students = studentsData?.data ?? [];

  const [tab,            setTab]            = useState<Tab>("table");
  const [marklistStudId, setMarklistStudId] = useState<string | null>(null);

  // Compute
  const computeMutation = useComputeSummary();
  const [computeMsg, setComputeMsg] = useState<string | null>(null);

  // Import modal
  const [importOpen, setImportOpen] = useState(false);

  // Status editing
  const [statusMap,  setStatusMap]  = useState<Record<string, { finalStatus: ResultStatus; totalGrade?: TotalGrade | null }>>({});
  const [statusInit, setStatusInit] = useState(false);
  const setFinalStatusMutation = useSetFinalStatus();
  const [savingId,   setSavingId]   = useState<string | null>(null);
  const [statusMsg,  setStatusMsg]  = useState<string | null>(null);

  // Rank posters
  const [posterStudentId, setPosterStudentId] = useState<string | null>(null);

  // Save-all status
  const [savingAll, setSavingAll] = useState(false);

  // Pre-populate status map from loaded data (once)
  if (report && !statusInit) {
    const map: typeof statusMap = {};
    for (const r of report.students) {
      if (r.summary.finalStatus) {
        map[r.student.id] = {
          finalStatus: r.summary.finalStatus,
          totalGrade:  r.summary.totalGrade ?? null,
        };
      }
    }
    setStatusMap(map);
    setStatusInit(true);
  }

  // ── Compute grades ─────────────────────────────────────────────────────────

  const handleCompute = () => {
    if (!report) return;
    setComputeMsg(null);
    computeMutation.mutate(
      { examId, classId, accademicYearId: ayId || undefined },
      {
        onSuccess: (res: any) => {
          setComputeMsg(`Computed ${res.computed} results · ${res.ranked} students ranked`);
        },
        onError: (e: any) => {
          setComputeMsg(`Error: ${e.message}`);
        },
      },
    );
  };

  // ── Set final status ───────────────────────────────────────────────────────

  const handleSaveAll = () => {
    if (!report || savingAll) return;
    setSavingAll(true);
    setStatusMsg(null);
    let saved = 0;
    const rows = report.students.filter((r) => statusMap[r.student.id]?.finalStatus);
    if (rows.length === 0) { setSavingAll(false); return; }

    const saveNext = (idx: number) => {
      if (idx >= rows.length) {
        setStatusMsg(`Saved status for ${saved} student${saved !== 1 ? "s" : ""}`);
        setSavingAll(false);
        return;
      }
      const row = rows[idx];
      const entry = statusMap[row.student.id];
      setFinalStatusMutation.mutate(
        { studentId: row.student.id, examId, data: { finalStatus: entry!.finalStatus, totalGrade: entry!.totalGrade ?? null } },
        {
          onSuccess: () => { saved++; saveNext(idx + 1); },
          onError: (e: any) => { setStatusMsg(`Error: ${e.message}`); setSavingAll(false); },
        },
      );
    };
    saveNext(0);
  };

  const handleSaveStatus = useCallback((row: ClassReportRow) => {
    const entry = statusMap[row.student.id];
    if (!entry?.finalStatus) return;
    setSavingId(row.student.id);
    setStatusMsg(null);
    setFinalStatusMutation.mutate(
      { studentId: row.student.id, examId, data: { finalStatus: entry.finalStatus, totalGrade: entry.totalGrade ?? null } },
      {
        onSuccess: () => {
          setStatusMsg(`Status saved for ${row.student.name}`);
          setSavingId(null);
        },
        onError: (e: any) => {
          setStatusMsg(`Error: ${e.message}`);
          setSavingId(null);
        },
      },
    );
  }, [examId, statusMap, setFinalStatusMutation]);

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <DashboardLayout>
        <PageSkeleton />
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <ApiErrorBanner message={error.message} />
      </DashboardLayout>
    );
  }

  if (!report) return null;

  const { exam, class: cls, subjects, stats } = report;
  const rankedStudents = report.students.filter((r) => r.summary.rank !== null && r.summary.rank <= 3);
  const posterRow      = posterStudentId ? report.students.find((r) => r.student.id === posterStudentId) : null;
  const madrasaName    = report.clientName ?? "Al Madrasa";
  const madrasaLogo    = report.clientLogo ?? null;

  return (
    <DashboardLayout>
      <div className="max-w-[1400px] mx-auto px-4 py-6 space-y-6">

        <PageHeader
          title={`${cls.name} — ${exam.name}`}
          subtitle={
            cls.classTeacher
              ? `Class Teacher: ${cls.classTeacher.name} · ${exam.publishedDate ? `Published: ${fmt(exam.publishedDate)}` : exam.examStatus}`
              : exam.publishedDate ? `Published: ${fmt(exam.publishedDate)}` : exam.examStatus
          }
          icon={GraduationCap}
          back
          backHref={backPath || undefined}
          action={
            canCompute && (
              <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                <button onClick={() => setImportOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 bg-white hover:bg-gray-50 transition-colors shadow-xs">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  Import Excel
                </button>
                <button onClick={handleCompute} disabled={computeMutation.isPending}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold disabled:opacity-50 transition-all shadow-sm shadow-emerald-100 hover:scale-[1.01]">
                  {computeMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  Compute Grades
                </button>
              </div>
            )
          }
        />

        {/* Compute feedback */}
        <AnimatePresence>
          {computeMsg && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={cn(
                "flex items-center gap-2 px-4 py-3 rounded-xl text-sm",
                computeMsg.startsWith("Error")
                  ? "bg-red-50 text-red-700 border border-red-100"
                  : "bg-emerald-50 text-emerald-700 border border-emerald-100",
              )}
            >
              {computeMsg.startsWith("Error") ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
              {computeMsg}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stats cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: "Total Students", value: stats.totalStudents, color: "text-gray-800",    bg: "bg-gray-50" },
            { label: "Passed",         value: stats.passedCount,   color: "text-emerald-700", bg: "bg-emerald-50" },
            { label: "Failed",         value: stats.failedCount,   color: "text-red-700",     bg: "bg-red-50" },
            { label: "Ranked",         value: stats.rankedCount,   color: "text-emerald-700", bg: "bg-emerald-50" },
            { label: "Class Average",  value: `${stats.classAverage.toFixed(1)}%`, color: "text-teal-700", bg: "bg-teal-50" },
          ].map(({ label, value, color, bg }) => (
            <div key={label} className={cn("rounded-xl p-4 text-center", bg)}>
              <div className={cn("text-2xl font-bold", color)}>{value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
          {([
            { key: "table",    label: "Result Sheet"  },
            { key: "marklist", label: "Mark Cards"    },
            { key: "status",   label: "Final Status"  },
            { key: "posters",  label: "Rank Posters"  },
          ] as { key: Tab; label: string }[]).map(({ key, label }) => (
            <button key={key} onClick={() => setTab(key)}
              className={cn(
                "px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap",
                tab === key
                  ? "text-emerald-600 border-emerald-600"
                  : "text-gray-500 border-transparent hover:text-gray-700",
              )}>
              {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === "table" && (
          <ClassResultTable report={report} madrasaName={madrasaName} />
        )}

        {tab === "marklist" && (
          <MarklistTab
            report={report}
            marklistStudId={marklistStudId}
            setMarklistStudId={setMarklistStudId}
            madrasaName={madrasaName}
            madrasaLogo={madrasaLogo}
          />
        )}

        {tab === "status" && (
          <StatusTab
            report={report}
            statusMap={statusMap}
            setStatusMap={setStatusMap}
            savingId={savingId}
            savingAll={savingAll}
            statusMsg={statusMsg}
            onSave={handleSaveStatus}
            onSaveAll={handleSaveAll}
          />
        )}

        {tab === "posters" && (
          <PostersTab
            rankedStudents={rankedStudents}
            report={report}
            posterStudentId={posterStudentId}
            setPosterStudentId={setPosterStudentId}
            posterRow={posterRow ?? null}
            madrasaName={madrasaName}
            madrasaLogo={madrasaLogo}
          />
        )}
      </div>

      {/* Excel import modal */}
      {importOpen && (
        <ExcelImportModal
          clientId={cid}
          token={token}
          examId={examId}
          classId={classId}
          accademicYearId={ayId}
          subjects={subjects}
          students={students.map((s) => ({ id: s.id, name: s.name, adno: s.adno }))}
          onClose={() => setImportOpen(false)}
          onSuccess={() => {
            setImportOpen(false);
          }}
        />
      )}
    </DashboardLayout>
  );
}

// ── Marklist tab ──────────────────────────────────────────────────────────────

function MarklistTab({ report, marklistStudId, setMarklistStudId, madrasaName, madrasaLogo }: {
  report: ClassReport;
  marklistStudId: string | null;
  setMarklistStudId: (id: string | null) => void;
  madrasaName: string;
  madrasaLogo?: string | null;
}) {
  const { students } = report;
  const activeRow = marklistStudId ? students.find((s) => s.student.id === marklistStudId) : null;

  return (
    <div className="space-y-6">
      {/* Student selector */}
      <div className="flex gap-2 flex-wrap">
        {students.map((r) => (
          <button key={r.student.id}
            onClick={() => setMarklistStudId(r.student.id === marklistStudId ? null : r.student.id)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-sm font-medium border transition-all",
              marklistStudId === r.student.id
                ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                : "border-gray-200 bg-white text-gray-700 hover:border-emerald-300",
            )}
          >
            {r.summary.rank === 1 ? "🥇 " : r.summary.rank === 2 ? "🥈 " : r.summary.rank === 3 ? "🥉 " : ""}
            {r.student.name}
          </button>
        ))}
      </div>

      {activeRow ? (
        <motion.div
          key={activeRow.student.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-sm mx-auto"
        >
          <MarklistPoster row={activeRow} report={report} madrasaName={madrasaName} madrasaLogo={madrasaLogo} />
        </motion.div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-3">
          <span className="text-5xl">📋</span>
          <p className="text-sm">Select a student above to view their mark card</p>
        </div>
      )}
    </div>
  );
}

// ── Status tab ────────────────────────────────────────────────────────────────

function StatusTab({ report, statusMap, setStatusMap, savingId, savingAll, statusMsg, onSave, onSaveAll }: {
  report: ClassReport;
  statusMap: Record<string, { finalStatus: ResultStatus; totalGrade?: TotalGrade | null }>;
  setStatusMap: React.Dispatch<React.SetStateAction<typeof statusMap>>;
  savingId: string | null;
  savingAll: boolean;
  statusMsg: string | null;
  onSave: (row: ClassReportRow) => void;
  onSaveAll: () => void;
}) {
  const { config } = report;

  const statusOpts = [
    { value: "PASSED",   label: config.passedLabel },
    { value: "FAILED",   label: config.failedLabel },
    { value: "PROMOTED", label: config.promotedLabel },
    { value: "WITHHELD", label: config.withheldLabel },
  ] as const;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-sm text-gray-500">Set final result status for each student. Grade is optional.</p>
        <button
          onClick={onSaveAll}
          disabled={savingAll || !report.students.some((r) => statusMap[r.student.id]?.finalStatus)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold disabled:opacity-40 transition-colors"
        >
          {savingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
          Save All
        </button>
      </div>
      {statusMsg && (
        <div className={cn(
          "px-4 py-3 rounded-xl text-sm flex items-center gap-2",
          statusMsg.startsWith("Error") ? "bg-red-50 text-red-700 border border-red-100" : "bg-emerald-50 text-emerald-700 border border-emerald-100",
        )}>
          {statusMsg.startsWith("Error") ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
          {statusMsg}
        </div>
      )}
      <div className="rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Student</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Score</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Rank</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Final Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Total Grade</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {report.students.map((row) => {
              const entry = statusMap[row.student.id];
              const isSaving = savingId === row.student.id;
              return (
                <tr key={row.student.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{row.student.name}</div>
                    <div className="text-xs text-gray-400 font-mono">{row.student.adno}</div>
                  </td>
                  <td className="px-4 py-3 text-center text-sm text-gray-700">
                    {row.summary.totalPercentage != null ? `${row.summary.totalPercentage.toFixed(1)}%` : "—"}
                  </td>
                  <td className="px-4 py-3 text-center font-bold text-gray-700">
                    {row.summary.rank ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={entry?.finalStatus ?? ""}
                      onChange={(e) => setStatusMap((m) => ({
                        ...m,
                        [row.student.id]: { ...(m[row.student.id] ?? {}), finalStatus: e.target.value as ResultStatus },
                      }))}
                      className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 w-full max-w-36"
                    >
                      <option value="">— Select —</option>
                      {statusOpts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={entry?.totalGrade ?? ""}
                      onChange={(e) => setStatusMap((m) => ({
                        ...m,
                        [row.student.id]: { ...(m[row.student.id] ?? {}), totalGrade: (e.target.value || null) as TotalGrade | null },
                      }))}
                      className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 w-full max-w-40"
                    >
                      <option value="">— Optional —</option>
                      {TOTAL_GRADE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => onSave(row)}
                      disabled={!entry?.finalStatus || isSaving}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium disabled:opacity-40 transition-colors"
                    >
                      {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                      Save
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Posters tab ───────────────────────────────────────────────────────────────

function PostersTab({ rankedStudents, report, posterStudentId, setPosterStudentId, posterRow, madrasaName, madrasaLogo }: {
  rankedStudents: ClassReportRow[];
  report: ClassReport;
  posterStudentId: string | null;
  setPosterStudentId: (id: string | null) => void;
  posterRow: ClassReportRow | null;
  madrasaName: string;
  madrasaLogo?: string | null;
}) {
  const totalStudents = report.stats?.totalStudents ?? report.students.length;
  const passCount     = report.stats?.passedCount ?? undefined;

  return (
    <div className="space-y-8">

      {/* ── Announcement poster ── */}
      <div>
        <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Result Announcement Poster
        </h3>
        <div className="max-w-sm mx-auto">
          <ResultAnnouncementPoster
            exam={report.exam}
            madrasaName={madrasaName}
            madrasaLogo={madrasaLogo}
            stats={{
              totalStudents,
              passCount: passCount > 0 ? passCount : undefined,
              className: report.class.name,
            }}
          />
        </div>
      </div>

      {/* ── Rank posters ── */}
      {rankedStudents.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Rank Posters
          </h3>
          {/* Selector */}
          <div className="flex gap-2 flex-wrap mb-4">
            {rankedStudents.map((r) => (
              <button key={r.student.id}
                onClick={() => setPosterStudentId(r.student.id === posterStudentId ? null : r.student.id)}
                className={cn(
                  "px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-all",
                  posterStudentId === r.student.id
                    ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                    : "border-gray-200 bg-white text-gray-700 hover:border-emerald-300",
                )}
              >
                {r.summary.rank === 1 ? "🥇" : r.summary.rank === 2 ? "🥈" : "🥉"} {r.student.name}
              </button>
            ))}
          </div>

          {posterRow && (
            <motion.div
              key={posterRow.student.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-sm mx-auto"
            >
              <RankPoster row={posterRow} report={report} madrasaName={madrasaName} madrasaLogo={madrasaLogo} />
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
}
