import { getExam, getExams, type ExamRecord } from "@/lib/exams-api";
import { getClassReport, type ClassReport, type ClassReportRow, type SubjectMeta } from "@/lib/results-api";

export interface PreviousResultComparison {
  examName: string;
  percentages: Record<string, number>;
}

export function examTimestamp(exam: { startDate?: string | null; publishedDate?: string | null }) {
  for (const date of [exam.startDate, exam.publishedDate]) {
    if (!date) continue;
    const timestamp = new Date(date).getTime();
    if (Number.isFinite(timestamp)) return timestamp;
  }
  return null;
}

export function reportPercentage(row: ClassReportRow, subjects: SubjectMeta[]) {
  if (!Object.keys(row.marks).length) return null;
  const score = subjects.reduce((sum, subject) => sum + (row.marks[subject.id]?.score ?? 0), 0);
  const maximum = subjects.reduce((sum, subject) => sum + (row.marks[subject.id]?.maxMarks ?? subject.maxMarks), 0);
  return maximum > 0 ? score / maximum * 100 : null;
}

export function percentagePointChange(current: number, previous: number) {
  return Math.round((current - previous) * 10) / 10;
}

export async function loadPreviousResultComparison(
  clientId: string, token: string, report: ClassReport,
): Promise<PreviousResultComparison | null> {
  if (report.exam.type === "CLASS_TEST") return null;
  const currentExam = examTimestamp(report.exam) != null
    ? report.exam : await getExam(clientId, token, report.exam.id);
  const currentTimestamp = examTimestamp(currentExam);
  if (currentTimestamp == null) return null;

  const history: ExamRecord[] = [];
  for (let page = 1; ; page++) {
    const response = await getExams(clientId, token, { limit: 100, page });
    history.push(...response.data);
    if (response.data.length < 100 || (response.total != null && history.length >= response.total)) break;
  }
  const earlierExams = history.filter((exam) => {
    const timestamp = examTimestamp(exam);
    return exam.id !== report.exam.id && exam.status === "ACTIVE" && !!exam.publishedDate && new Date(exam.publishedDate) <= new Date() && exam.type !== "CLASS_TEST"
      && timestamp != null && timestamp < currentTimestamp;
  }).sort((a, b) => examTimestamp(b)! - examTimestamp(a)! || a.id.localeCompare(b.id));

  const studentIds = new Set(report.students.map((row) => row.student.id));
  for (const exam of earlierExams) {
    const previousReport = await getClassReport(clientId, token, { examId: exam.id, classId: report.class.id });
    const percentages: Record<string, number> = {};
    for (const row of previousReport.students) {
      if (!studentIds.has(row.student.id)) continue;
      const percentage = reportPercentage(row, previousReport.subjects);
      if (percentage != null) percentages[row.student.id] = percentage;
    }
    if (Object.keys(percentages).length) return { examName: exam.name, percentages };
  }
  return null;
}
