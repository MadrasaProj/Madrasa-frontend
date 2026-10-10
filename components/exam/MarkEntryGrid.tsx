import { useState } from "react";
import type { ExamRecord } from "@/lib/exams-api";
import type { ClassRecord } from "@/lib/classes-api";
import type { SubjectRecord } from "@/lib/subjects-api";
import { cn } from "@/lib/utils";
import { ResponsivePopover } from "@/components/ui/responsivePopover";
import {
  GraduationCap,
  Save,
  Loader2,
  CheckCircle2,
  Calendar,
  AlertCircle,
  RotateCcw,
  FileSpreadsheet,
  MoreHorizontal,
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
  showSubjectSelector?: boolean;
  showRemarks?: boolean;
  showExcelImport?: boolean;
  showDraftButton?: boolean;
  showResetButton?: boolean;
  showLockPeriod?: boolean;
  showActionButtons?: boolean;
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
  showSubjectSelector = true,
  showRemarks = true,
  showExcelImport = false,
  showDraftButton = false,
  showResetButton = true,
  showLockPeriod = true,
  showActionButtons = true,
}: MarkEntryGridProps) {
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const selectedStudent = students.find((student) => student.id === selectedStudentId);
  const selectedStudentIndex = students.findIndex((student) => student.id === selectedStudentId);
  const filled = Object.values(scores).filter((v) => v !== "").length;
  const currentSubject = subjects.find((s) => s.id === subjectId);
  const effectiveMaxMarks = currentSubject?.classSubject?.maxMarks ?? 50;
  const hasInvalidMarks = Object.values(scores).some(
    (v) => v !== "" && (Number(v) > effectiveMaxMarks || Number(v) < 0),
  );

  return (
    <div className="space-y-6">
       {/* Selectors grid */}
      {(showExamSelector || showClassSelector || (showSubjectSelector && subjects.length > 0)) && (
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
          {showSubjectSelector && subjects.length > 0 && (
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
        <div className="bg-white border-y border-gray-100 sm:border sm:rounded-2xl sm:shadow-sm flex flex-col">
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
                  const invalid =
                    score !== "" &&
                    (Number(score) > effectiveMaxMarks || Number(score) < 0);
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
                        {effectiveMaxMarks}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <input
                          type="number"
                          min={0}
                          max={effectiveMaxMarks}
                          disabled={isLocked || saving}
                          value={score}
                          onChange={(e) => onScoreChange(s.id, e.target.value)}
                          placeholder="—"
                          className={cn(
                            "w-24 text-center px-3 py-2 border rounded-xl text-sm font-bold focus:outline-none transition-all",
                            isLocked
                              ? "bg-gray-50 border-gray-100 text-gray-300 cursor-not-allowed"
                              : invalid
                                ? "border-red-400 bg-red-50 text-red-700 focus:border-red-500 focus:ring-2 focus:ring-red-400/20"
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

          {/* Mobile student list */}
          <div className="block sm:hidden divide-y divide-gray-100">
            {students.map((s) => {
              const score = scores[s.id] ?? "";
              const invalid =
                score !== "" &&
                (Number(score) > effectiveMaxMarks || Number(score) < 0);
              return (
                <div key={s.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-gray-900">{s.name}</p>
                    <p className="mt-0.5 truncate text-xs text-gray-500">AdNo: {s.adno}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        max={effectiveMaxMarks}
                        disabled={isLocked || saving}
                        value={score}
                        onChange={(e) => onScoreChange(s.id, e.target.value)}
                        placeholder="—"
                        aria-label={`Mark for ${s.name}`}
                        className={cn(
                          "w-16 border-b px-1 py-1.5 text-right text-sm font-bold focus:outline-none transition-colors",
                          isLocked
                            ? "border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed"
                            : invalid
                              ? "border-red-400 bg-red-50 text-red-700 focus:border-red-500"
                              : "border-gray-200 focus:border-emerald-500",
                        )}
                      />
                      <button
                        type="button"
                        onClick={() => setSelectedStudentId(s.id)}
                        aria-label={`Details and remark for ${s.name}`}
                        className="flex h-9 w-9 items-center justify-center text-gray-500 hover:text-gray-900 focus-visible:outline-2 focus-visible:outline-emerald-500"
                      >
                        <MoreHorizontal className="h-5 w-5" />
                      </button>
                  </div>
                </div>
              );
            })}
          </div>

          <ResponsivePopover
            open={!!selectedStudent}
            onOpenChange={(open) => { if (!open) setSelectedStudentId(null); }}
            side="bottom"
            drawerOnDesktop
            title={selectedStudent?.name}
            description={selectedStudent ? `Admission No: ${selectedStudent.adno}` : undefined}
            contentClassName="px-5 pb-6"
          >
            {selectedStudent && (
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-x-4 gap-y-3 border-b border-gray-100 pb-5 text-sm">
                  <div><p className="text-xs text-gray-500">Student No.</p><p className="font-semibold text-gray-900">{selectedStudentIndex + 1}</p></div>
                  <div><p className="text-xs text-gray-500">Gender</p><p className="font-semibold text-gray-900">{selectedStudent.gender ?? "—"}</p></div>
                  <div><p className="text-xs text-gray-500">Class</p><p className="font-semibold text-gray-900">{classes.find((item) => item.id === classId)?.name ?? "—"}</p></div>
                  <div><p className="text-xs text-gray-500">Subject</p><p className="font-semibold text-gray-900">{currentSubject?.name ?? "—"}</p></div>
                  <div><p className="text-xs text-gray-500">Exam</p><p className="font-semibold text-gray-900">{activeExam?.name ?? exams.find((item) => item.id === examId)?.name ?? "—"}</p></div>
                  <div><p className="text-xs text-gray-500">Full Mark</p><p className="font-semibold text-gray-900">{effectiveMaxMarks}</p></div>
                </div>
                <div>
                  <label htmlFor="student-drawer-mark" className="mb-1.5 block text-sm font-semibold text-gray-900">Obtained mark</label>
                  <input
                    id="student-drawer-mark"
                    type="number"
                    min={0}
                    max={effectiveMaxMarks}
                    disabled={isLocked || saving}
                    value={scores[selectedStudent.id] ?? ""}
                    onChange={(e) => onScoreChange(selectedStudent.id, e.target.value)}
                    placeholder={`Out of ${effectiveMaxMarks}`}
                    className={cn(
                      "w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2",
                      (scores[selectedStudent.id] ?? "") !== "" && (Number(scores[selectedStudent.id]) > effectiveMaxMarks || Number(scores[selectedStudent.id]) < 0)
                        ? "border-red-400 bg-red-50 text-red-700 focus:ring-red-400/20"
                        : "border-gray-200 focus:border-emerald-500 focus:ring-emerald-400/20",
                    )}
                  />
                </div>
                {showRemarks && (
                  <div>
                    <label htmlFor="student-drawer-remark" className="mb-1.5 block text-sm font-semibold text-gray-900">Remark</label>
                    <textarea
                      id="student-drawer-remark"
                      rows={4}
                      disabled={isLocked || saving}
                      value={remarks[selectedStudent.id] ?? ""}
                      onChange={(e) => onRemarkChange?.(selectedStudent.id, e.target.value)}
                      placeholder="Add a remark..."
                      className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-400/20"
                    />
                  </div>
                )}
              </div>
            )}
          </ResponsivePopover>

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
            {showActionButtons && <div className="flex items-center gap-2">
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
                  disabled={saving || isLocked || hasInvalidMarks}
                  className="inline-flex items-center gap-1.5 border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs px-4 py-2.5 rounded-xl transition-colors shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
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
                disabled={saving || isLocked || hasInvalidMarks}
                className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all shadow-sm hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
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
            </div>}
          </div>
        </div>
      )}
    </div>
  );
}
