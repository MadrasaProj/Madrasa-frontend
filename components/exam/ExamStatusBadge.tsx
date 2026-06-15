import { cn } from "@/lib/utils";
import { type ExamRecord } from "@/lib/exams-api";

export const STATUS_LABELS: Record<string, string> = {
  DRAFT:      "Draft",
  MARK_ENTRY: "Mark Entry",
  PUBLISHED:  "Published",
  CANCELLED:  "Cancelled",
};

export function getDaysRemaining(targetDateStr: string | null | undefined): number | null {
  if (!targetDateStr) return null;
  const diffTime = new Date(targetDateStr).getTime() - new Date().getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

export function fmt(d?: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export interface ExamStatusInfo {
  statusLabel: string;
  statusStyle: string;
  description: string;
}

export function getExamStatusInfo(exam: ExamRecord): ExamStatusInfo {
  let statusLabel = STATUS_LABELS[exam.examStatus] || exam.examStatus;
  let statusStyle = "bg-gray-100 text-gray-700 border-gray-200";
  let description = "";

  if (exam.examStatus === "PUBLISHED") {
    statusStyle = "bg-emerald-50 text-emerald-700 border-emerald-200";
    description = exam.publishedDate 
      ? `Results Published On ${fmt(exam.publishedDate)}` 
      : `Results Published`;
  } else if (exam.examStatus === "CANCELLED") {
    statusStyle = "bg-rose-50 text-rose-700 border-rose-200";
    statusLabel = "Cancelled";
    description = "Exam has been cancelled";
  } else if (exam.examStatus === "MARK_ENTRY") {
    const days = getDaysRemaining(exam.markEntryLastDate);
    if (days !== null && days >= 0) {
      statusStyle = "bg-emerald-50 text-emerald-700 border-emerald-100";
      description = `Mark Entry Closes In ${days} Days (${fmt(exam.markEntryLastDate)})`;
    } else {
      statusStyle = "bg-purple-50 text-purple-700 border-purple-200";
      statusLabel = "Completed";
      description = `Mark Entry Closed On ${fmt(exam.markEntryLastDate)}`;
    }
  } else {
    // Draft/Upcoming
    const days = getDaysRemaining(exam.startDate);
    if (days !== null && days > 0) {
      statusStyle = "bg-amber-50 text-amber-700 border-amber-200";
      statusLabel = "Upcoming";
      description = `Exam Starts In ${days} Days (${fmt(exam.startDate)})`;
    } else {
      statusStyle = "bg-gray-100 text-gray-700 border-gray-200";
      statusLabel = "Draft";
      description = `Created Draft`;
    }
  }

  return { statusLabel, statusStyle, description };
}

interface ExamStatusBadgeProps {
  exam: ExamRecord;
  className?: string;
}

export function ExamStatusBadge({ exam, className }: ExamStatusBadgeProps) {
  const { statusLabel, statusStyle } = getExamStatusInfo(exam);
  return (
    <span className={cn("text-[10px] font-bold px-2.5 py-0.5 rounded-full border shrink-0 uppercase tracking-wider", statusStyle, className)}>
      {statusLabel}
    </span>
  );
}
