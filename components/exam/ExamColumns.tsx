import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import type { ExamRecord } from "@/lib/exams-api";
import type { Column } from "@/components/ui/DataTable";
import { GraduationCap, Eye, PenLine, Lock, Edit2, BarChart2, Trash2 } from "lucide-react";
import { ExamStatusBadge, getExamStatusInfo } from "@/components/exam/ExamStatusBadge";
import { fmt, shortDate } from "@/lib/exam-utils";

interface UseExamColumnsOptions {
  showActions?: boolean;
  onEnterMarks?: (exam: ExamRecord) => void;
  onViewResults?: (exam: ExamRecord) => void;
  onEdit?: (exam: ExamRecord) => void;
  onClasses?: (exam: ExamRecord) => void;
  onDelete?: (exam: ExamRecord) => void;
}

export function useExamColumns(options: UseExamColumnsOptions = {}) {
  const { showActions = true, onEnterMarks, onViewResults, onEdit, onClasses, onDelete } = options;

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
      ...(showActions
        ? [
            {
              key: "actions",
              header: "",
              render: (exam: ExamRecord) => (
                <div className="flex items-center gap-1.5 justify-end">
                  {onEdit && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(exam);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors text-xs font-semibold"
                      title="Edit"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Edit</span>
                    </button>
                  )}
                  {exam.examStatus === "PUBLISHED" && onViewResults ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewResults(exam);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-700 transition-colors text-xs font-semibold"
                      title="View Results"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span className="hidden md:inline">Results</span>
                    </button>
                  ) : exam.examStatus === "MARK_ENTRY" &&
                    (!exam.markEntryLastDate ||
                      new Date(exam.markEntryLastDate) >= new Date()) &&
                    onEnterMarks ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEnterMarks(exam);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors text-xs font-semibold"
                      title="Enter Marks"
                    >
                      <PenLine className="w-3.5 h-3.5" />
                      <span className="hidden md:inline">Enter</span>
                    </button>
                  ) : onClasses ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onClasses(exam);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors text-xs font-semibold"
                      title="View Classes & Enter Marks"
                    >
                      <BarChart2 className="w-3.5 h-3.5" />
                      <span className="hidden md:inline">Classes</span>
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
                  {onDelete && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(exam);
                      }}
                      className="p-1.5 rounded-lg text-red-400 bg-red-50 hover:bg-red-100 hover:text-red-500 transition-colors"
                      title="Delete Exam"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ),
              className: "text-right",
            },
          ]
        : []),
    ],
    [showActions, onEnterMarks, onViewResults, onEdit, onClasses, onDelete],
  );

  return columns;
}
