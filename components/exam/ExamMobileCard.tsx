import type { ExamRecord } from "@/lib/exams-api";
import { GraduationCap, Eye, PenLine, Lock, Edit2, BarChart2, Trash2 } from "lucide-react";
import { ExamStatusBadge, getExamStatusInfo } from "@/components/exam/ExamStatusBadge";
import { fmt, shortDate } from "@/lib/exam-utils";

interface ExamMobileCardProps {
  exam: ExamRecord;
  onEnterMarks?: (exam: ExamRecord) => void;
  onViewResults?: (exam: ExamRecord) => void;
  onEdit?: (exam: ExamRecord) => void;
  onClasses?: (exam: ExamRecord) => void;
  onDelete?: (exam: ExamRecord) => void;
}

export function ExamMobileCard({
  exam,
  onEnterMarks,
  onViewResults,
  onEdit,
  onClasses,
  onDelete,
}: ExamMobileCardProps) {
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
        {onEdit && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(exam);
            }}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors text-xs font-bold"
          >
            <Edit2 className="w-3.5 h-3.5" /> Edit
          </button>
        )}
        {exam.examStatus === "PUBLISHED" && onViewResults ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onViewResults(exam);
            }}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-700 transition-colors text-xs font-bold"
          >
            <Eye className="w-3.5 h-3.5" /> View Results
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
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors text-xs font-bold"
          >
            <PenLine className="w-3.5 h-3.5" /> Enter Marks
          </button>
        ) : onClasses ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClasses(exam);
            }}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors text-xs font-bold"
          >
            <BarChart2 className="w-3.5 h-3.5" /> Classes
          </button>
        ) : (
          <button
            disabled
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-gray-50 text-gray-400 cursor-not-allowed transition-colors text-xs font-bold"
          >
            <Lock className="w-3.5 h-3.5" /> No Action
          </button>
        )}
        {onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(exam);
            }}
            className="p-2.5 rounded-xl text-red-400 bg-red-50 hover:bg-red-100 hover:text-red-500 transition-colors"
            title="Delete Exam"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
