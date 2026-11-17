import { cn } from "@/lib/utils";
import { type ExamRecord } from "@/lib/exams-api";

export const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Active",
  INACTIVE: "Inactive",
  UPCOMING: "Upcoming",
  MARK_ENTRY: "Mark Entry",
  COMPLETED: "Completed",
  PUBLISHED: "Published",
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
  const now = new Date();
  let statusLabel: string;
  let statusStyle: string;
  let description: string;

  if (exam.status === "INACTIVE") {
    statusLabel = "Inactive";
    statusStyle = "bg-gray-100 text-gray-700 border-gray-200";
    description = "Exam is inactive";
  } else if (exam.publishedDate && new Date(exam.publishedDate) <= now) {
    statusLabel = "Published";
    statusStyle = "bg-primary-50 text-primary-700 border-primary-200";
    description = `Results Published On ${fmt(exam.publishedDate)}`;
  } else if (exam.startDate && new Date(exam.startDate) > now) {
    statusLabel = "Upcoming";
    statusStyle = "bg-amber-50 text-amber-700 border-amber-200";
    description = `Exam Starts On ${fmt(exam.startDate)}`;
  } else if (exam.markEntryLastDate && new Date(exam.markEntryLastDate) < now) {
    statusLabel = "Completed";
    statusStyle = "bg-purple-50 text-purple-700 border-purple-200";
    description = `Mark Entry Closed On ${fmt(exam.markEntryLastDate)}`;
  } else if (exam.startDate) {
    statusLabel = "Mark Entry";
    statusStyle = "bg-primary-50 text-primary-700 border-primary-100";
    description = exam.markEntryLastDate
      ? `Mark Entry Closes On ${fmt(exam.markEntryLastDate)}`
      : "Mark entry is open";
  } else {
    statusLabel = "Active";
    statusStyle = "bg-primary-50 text-primary-700 border-primary-200";
    description = "Exam is active";
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
    <span className={cn("text-[10px] font-bold  py-0.5  shrink-0 uppercase tracking-wider", statusStyle, className)}>
      {statusLabel}
    </span>
  );
}
