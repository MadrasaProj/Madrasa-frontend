import type { Dispatch, SetStateAction } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DrawerSelector } from "@/components/DrawerSelector";
import { ScrollableTabs } from "@/components/ui/ScrollableTabs";
import { ResultCardPoster } from "@/components/poster/ResultCardPoster";
import { getTopRankers, RankIndividualSvgPoster, RankSvgPoster } from "@/components/poster/SvgPoster";
import {
  type ClassReport, type ClassReportRow, type ResultStatus, type TotalGrade,
} from "@/lib/results-api";

const TOTAL_GRADE_OPTIONS: { value: TotalGrade; label: string }[] = [
  { value: "DISTINCTION", label: "Distinction" },
  { value: "FIRST_CLASS", label: "First Class" },
  { value: "SECOND_CLASS", label: "Second Class" },
  { value: "THIRD_CLASS", label: "Third Class" },
  { value: "TOP_PLUS", label: "Top Plus" },
  { value: "FAILED", label: "Failed" },
];

// ── Report sub-tab: Mark Cards ──────────────────────────────────────────────

export function ReportMarklistTab({ report, marklistStudId, setMarklistStudId, madrasaName, madrasaLogo, studentPhotoMap }: {
  report: ClassReport;
  marklistStudId: string | null;
  setMarklistStudId: (id: string | null) => void;
  madrasaName: string;
  madrasaLogo?: string | null;
  studentPhotoMap?: Record<string, string | null>;
}) {
  const { students } = report;
  const activeRow = marklistStudId ? students.find((s) => s.student.id === marklistStudId) : null;

  return (
    <div className="space-y-6">
      <ScrollableTabs
        ariaLabel="Choose student mark card"
        options={students.map((row) => ({
          value: row.student.id,
          label: `${row.summary.rank === 1 ? "🥇 " : row.summary.rank === 2 ? "🥈 " : row.summary.rank === 3 ? "🥉 " : ""}${row.student.name}`,
        }))}
        value={marklistStudId ?? ""}
        onValueChange={(value) => setMarklistStudId(value === marklistStudId ? null : value)}
      />

      {activeRow ? (
        <motion.div
          key={activeRow.student.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-sm mx-auto"
        >
          <ResultCardPoster row={activeRow} report={report} madrasaName={madrasaName} madrasaLogo={madrasaLogo} studentPhotoMap={studentPhotoMap} />
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

// ── Report sub-tab: Final Status ────────────────────────────────────────────

export function ReportStatusTab({ report, statusMap, setStatusMap, savingId, savingAll, onSave, onSaveAll }: {
  report: ClassReport;
  statusMap: Record<string, { finalStatus: ResultStatus; totalGrade?: TotalGrade | null }>;
  setStatusMap: Dispatch<SetStateAction<typeof statusMap>>;
  savingId: string | null;
  savingAll: boolean;
  onSave: (row: ClassReportRow) => void;
  onSaveAll: () => void;
}) {
  const { config } = report;

  const statusOpts = [
    { value: "PASSED", label: config.passedLabel },
    { value: "FAILED", label: config.failedLabel },
    { value: "PROMOTED", label: config.promotedLabel },
    { value: "WITHHELD", label: config.withheldLabel },
  ] as const;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-sm text-gray-500">Set final result status for each student. Grade is optional.</p>
        <Button type="button"
          onClick={onSaveAll}
          disabled={savingAll || !report.students.some((r) => statusMap[r.student.id]?.finalStatus)}
          className="shadow-none"
        >
          {savingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
          Save All
        </Button>
      </div>
      <div className="rounded-xl border border-gray-200 overflow-x-auto">
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
                    <DrawerSelector
                      title={`Final status for ${row.student.name}`}
                      options={[{ value: "", label: "— Select —" }, ...statusOpts]}
                      value={entry?.finalStatus ?? ""}
                      onChange={(value) => setStatusMap((m) => ({
                        ...m,
                        [row.student.id]: { ...(m[row.student.id] ?? {}), finalStatus: value as ResultStatus },
                      }))}
                      className="w-36"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <DrawerSelector
                      title={`Total grade for ${row.student.name}`}
                      options={[{ value: "", label: "— Optional —" }, ...TOTAL_GRADE_OPTIONS]}
                      value={entry?.totalGrade ?? ""}
                      onChange={(value) => setStatusMap((m) => ({
                        ...m,
                        [row.student.id]: { ...(m[row.student.id] ?? {}), totalGrade: (value || null) as TotalGrade | null },
                      }))}
                      className="w-40"
                    />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Button type="button" size="sm"
                      onClick={() => onSave(row)}
                      disabled={!entry?.finalStatus || isSaving}
                      className="shadow-none"
                    >
                      {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                      Save
                    </Button>
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

// ── Report sub-tab: Rank Posters ────────────────────────────────────────────

export function ReportPostersTab({ report, posterStudentId, setPosterStudentId, madrasaName, madrasaLogo, studentPhotoMap }: {
  report: ClassReport;
  posterStudentId: string | null;
  setPosterStudentId: (id: string | null) => void;
  madrasaName: string;
  madrasaLogo?: string | null;
  studentPhotoMap?: Record<string, string | null>;
}) {
  const rankedStudents = getTopRankers(report.students);
  const posterRow = posterStudentId ? rankedStudents.find((r) => r.student.id === posterStudentId) : null;

  return (
    <div className="space-y-8">
      {rankedStudents.length > 0 ? (
        <div>
          <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Rank Posters
          </h3>
          <RankSvgPoster
            examName={report.exam.name}
            madrasaName={madrasaName}
            classNameLabel={report.class.name}
            toppers={rankedStudents.map((row) => ({
              rank: row.summary.rank ?? 0,
              name: row.student.name,
              percentage: row.summary.totalPercentage,
              avatarUrl: studentPhotoMap?.[row.student.id] ?? null,
            }))}
          />
          <ScrollableTabs
            ariaLabel="Choose rank poster"
            options={rankedStudents.map((row) => ({
              value: row.student.id,
              label: `${row.summary.rank === 1 ? "🥇" : row.summary.rank === 2 ? "🥈" : "🥉"} ${row.student.name}`,
            }))}
            value={posterStudentId ?? ""}
            onValueChange={(value) => setPosterStudentId(value === posterStudentId ? null : value)}
            className="mb-4"
          />

          {posterRow && (
            <motion.div
              key={posterRow.student.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-sm mx-auto"
            >
              <RankIndividualSvgPoster
                examName={report.exam.name}
                madrasaName={madrasaName}
                classNameLabel={report.class.name}
                topper={{
                  rank: posterRow.summary.rank ?? 0,
                  name: posterRow.student.name,
                  percentage: posterRow.summary.totalPercentage,
                  avatarUrl: studentPhotoMap?.[posterRow.student.id] ?? null,
                }}
              />
            </motion.div>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-3">
          <span className="text-5xl">🏆</span>
          <p className="text-sm">No ranked students to show rank posters</p>
        </div>
      )}
    </div>
  );
}
