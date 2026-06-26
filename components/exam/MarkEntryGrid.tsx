import type { ExamRecord } from "@/lib/exams-api";
import type { ClassRecord } from "@/lib/classes-api";
import type { SubjectRecord } from "@/lib/subjects-api";
import { cn } from "@/lib/utils";
import {
  GraduationCap,
  Save,
  Loader2,
  CheckCircle2,
  Calendar,
  AlertCircle,
  RotateCcw,
  FileSpreadsheet,
} from "lucide-react";

function fmt(d?: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export interface MarkEntryStudent {
  id: string;
  name: string;
  adno: string;
  gender?: string | null;
}

export interface MarkEntryGridProps {
  exams: ExamRecord[];
  classes: ClassRecord[];
  subjects: SubjectRecord[];
  students: MarkEntryStudent[];
  examId: string;
  classId: string;
  subjectId: string;
  scores: Record<string, string>;
  remarks?: Record<string, string>;
  isLocked: boolean;
  saving: boolean;
  saved: boolean;
  error: string | null;
  loading?: boolean;
  activeExam?: ExamRecord | null;

  onExamChange: (examId: string) => void;
  onClassChange: (classId: string) => void;
  onSubjectChange: (subjectId: string) => void;
  onScoreChange: (studentId: string, value: string) => void;
  onRemarkChange?: (studentId: string, value: string) => void;
  onSave: (submit?: boolean) => void;
  onReset?: () => void;
  onImportOpen?: () => void;

  showExamSelector?: boolean;
  showClassSelector?: boolean;
  showRemarks?: boolean;
  showExcelImport?: boolean;
  showDraftButton?: boolean;
  showResetButton?: boolean;
  showLockPeriod?: boolean;
}

export function MarkEntryGrid({
  exams,
  classes,
  subjects,
  students,
  examId,
  classId,
  subjectId,
  scores,
  remarks = {},
  isLocked,
  saving,
  saved,
  error,
  loading = false,
  activeExam,
  onExamChange,
  onClassChange,
  onSubjectChange,
  onScoreChange,
  onRemarkChange,
  onSave,
  onReset,
  onImportOpen,
  showExamSelector = true,
  showClassSelector = true,
  showRemarks = true,
  showExcelImport = false,
  showDraftButton = false,
  showResetButton = true,
  showLockPeriod = true,
}: MarkEntryGridProps) {
  const filled = Object.values(scores).filter((v) => v !== "").length;

  return (
    <div className="space-y-6">
      {/* Selectors grid */}
      {(showExamSelector || showClassSelector || subjects.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white p-4 rounded-3xl border border-gray-100 shadow-sm">
          {showExamSelector && (
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5">
                Select Exam
              </label>
              <select
                value={examId}
                onChange={(e) => onExamChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/20 bg-white"
              >
                {exams.map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          {showClassSelector && (
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5">
                Select Class
              </label>
              <select
                value={classId}
                onChange={(e) => onClassChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/20 bg-white"
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          {subjects.length > 0 && (
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5">
                Select Subject
              </label>
              <select
                value={subjectId}
                onChange={(e) => onSubjectChange(e.target.value)}
                disabled={subjects.length === 0}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/20 bg-white disabled:opacity-50"
              >
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {/* Mark entry period box & import button */}
      {showLockPeriod && activeExam && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-emerald-50/40 border border-emerald-100 rounded-3xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100/50 flex items-center justify-center shrink-0 text-emerald-700">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-emerald-800 flex items-center gap-2">
                Mark Entry Period
                <span
                  className={cn(
                    "px-2 py-0.5 rounded-full text-[9px] border font-extrabold uppercase",
                    isLocked
                      ? "bg-rose-50 text-rose-700 border-rose-100"
                      : "bg-emerald-50 text-emerald-700 border-emerald-100",
                  )}
                >
                  {isLocked ? "Closed" : "Open"}
                </span>
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {activeExam.endDate
                  ? fmt(
                      new Date(
                        new Date(activeExam.endDate).getTime() + 86400000,
                      ).toISOString(),
                    )
                  : "—"}{" "}
                – {fmt(activeExam.markEntryLastDate)}
              </p>
            </div>
          </div>
          {showExcelImport && onImportOpen && (
            <div className="flex items-center gap-2">
              <button
                onClick={onImportOpen}
                className="inline-flex items-center gap-2 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-sm hover:scale-[1.01]"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />{" "}
                Import / Export Excel
              </button>
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-rose-50 border border-rose-100 text-rose-600 text-sm px-4 py-3 rounded-2xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {/* Student list */}
      {loading ? (
        <div className="flex items-center justify-center py-12 text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : students.length === 0 ? (
        <div className="text-center py-20 bg-white border border-gray-100 rounded-3xl p-6">
          <GraduationCap className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-sm font-semibold text-gray-900">
            No students in this class
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Make sure you have students registered in this class.
          </p>
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
                  <th className="px-4 py-4 w-44 text-center">
                    Obtained Mark *
                  </th>
                  {showRemarks && (
                    <th className="px-6 py-4">Remarks (Optional)</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {students.map((s, idx) => {
                  const score = scores[s.id] ?? "";
                  const remark = remarks[s.id] ?? "";
                  return (
                    <tr
                      key={s.id}
                      className="hover:bg-gray-50/50 transition-colors"
                    >
                      <td className="px-6 py-3.5 text-center text-gray-400 font-medium">
                        {idx + 1}
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="font-bold text-gray-900 leading-tight">
                          {s.name}
                        </p>
                        <span className="text-[10px] text-gray-400 uppercase font-semibold">
                          {s.gender ?? "Male"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-xs font-semibold text-gray-700">
                        {s.adno}
                      </td>
                      <td className="px-4 py-3.5 text-center text-gray-500 font-bold">
                        100
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          disabled={isLocked || saving}
                          value={score}
                          onChange={(e) => onScoreChange(s.id, e.target.value)}
                          placeholder="—"
                          className={cn(
                            "w-24 text-center px-3 py-2 border rounded-xl text-sm font-bold focus:outline-none transition-all",
                            isLocked
                              ? "bg-gray-50 border-gray-100 text-gray-300 cursor-not-allowed"
                              : "border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-400/20",
                          )}
                        />
                      </td>
                      {showRemarks && (
                        <td className="px-6 py-3.5">
                          <input
                            type="text"
                            disabled={isLocked || saving}
                            value={remark}
                            onChange={(e) =>
                              onRemarkChange?.(s.id, e.target.value)
                            }
                            placeholder="Good progress, excellent..."
                            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500 transition-all bg-white"
                          />
                        </td>
                      )}
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
                        <span className="text-xs text-gray-400 font-bold">
                          #{idx + 1}
                        </span>
                        <p className="font-bold text-gray-900 text-sm leading-snug truncate">
                          {s.name}
                        </p>
                      </div>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        AdNo:{" "}
                        <span className="font-semibold font-mono text-gray-600">
                          {s.adno}
                        </span>{" "}
                        · {s.gender ?? "Male"}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-xs text-gray-400 font-medium mr-1">
                        /100
                      </span>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        disabled={isLocked || saving}
                        value={score}
                        onChange={(e) => onScoreChange(s.id, e.target.value)}
                        placeholder="—"
                        className={cn(
                          "w-16 text-center py-1.5 px-2 border rounded-xl text-sm font-bold focus:outline-none transition-all",
                          isLocked
                            ? "bg-gray-50 border-gray-100 text-gray-300 cursor-not-allowed"
                            : "border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-400/20",
                        )}
                      />
                    </div>
                  </div>
                  {showRemarks && (
                    <div>
                      <input
                        type="text"
                        disabled={isLocked || saving}
                        value={remark}
                        onChange={(e) =>
                          onRemarkChange?.(s.id, e.target.value)
                        }
                        placeholder="Add remark..."
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500 transition-all bg-white"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Bottom statistics bar */}
          <div className="bg-gray-50 px-6 py-4 flex flex-wrap items-center justify-between border-t border-gray-100 gap-4">
            <div className="flex items-center gap-6">
              <div className="text-xs">
                <span className="text-gray-400">Total Students:</span>{" "}
                <strong className="text-gray-900 font-bold ml-1">
                  {students.length}
                </strong>
              </div>
              <div className="text-xs">
                <span className="text-emerald-500 font-semibold">Entered:</span>{" "}
                <strong className="text-emerald-700 font-extrabold ml-1">
                  {filled}
                </strong>
              </div>
              <div className="text-xs">
                <span className="text-amber-500 font-semibold font-mono">
                  Remaining:
                </span>{" "}
                <strong className="text-amber-700 font-extrabold ml-1">
                  {students.length - filled}
                </strong>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {showResetButton && onReset && (
                <button
                  onClick={onReset}
                  className="inline-flex items-center gap-1.5 border border-gray-200 hover:bg-gray-100 text-gray-600 font-bold text-xs px-4 py-2.5 rounded-xl transition-colors bg-white shadow-xs"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Reset
                </button>
              )}
              {showDraftButton && (
                <button
                  onClick={() => onSave(false)}
                  disabled={saving || isLocked}
                  className="inline-flex items-center gap-1.5 border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs px-4 py-2.5 rounded-xl transition-colors shadow-xs"
                >
                  {saving ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}{" "}
                  Save as Draft
                </button>
              )}
              <button
                onClick={() => onSave(true)}
                disabled={saving || isLocked}
                className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all shadow-sm hover:scale-[1.01]"
              >
                {saving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : saved ? (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                {saved ? "Saved" : "Save Marks"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
