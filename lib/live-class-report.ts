import { getClassReport, getResults, type ClassReport, type ClassReportRow, type SubjectMeta } from "@/lib/results-api";
import { getStudents } from "@/lib/students-api";
import { getSubjects } from "@/lib/subjects-api";

interface LiveClassReportOptions {
  clientId: string;
  token: string;
  examId: string;
  examName: string;
  examType: string;
  classId: string;
  className: string;
  subjectId?: string;
}

async function getActiveClassStudents(clientId: string, token: string, classId: string) {
  const limit = 200;
  const firstPage = await getStudents(clientId, token, { classId, status: "ACTIVE", page: 1, limit });
  const pageCount = Math.ceil(firstPage.total / (firstPage.limit || limit));
  if (pageCount <= 1) return firstPage.data;
  const remainingPages = await Promise.all(
    Array.from({ length: pageCount - 1 }, (_, index) =>
      getStudents(clientId, token, { classId, status: "ACTIVE", page: index + 2, limit }),
    ),
  );
  return [firstPage, ...remainingPages].flatMap((page) => page.data);
}

export async function loadLiveClassReport({
  clientId, token, examId, examName, examType, classId, className, subjectId,
}: LiveClassReportOptions): Promise<{ report: ClassReport; computedReport: ClassReport | null }> {
  // A computed summary can omit students without marks, so build the result sheet from the roster.
  const [computedReport, classStudents, resultResponse, subjectResponse] = await Promise.all([
    getClassReport(clientId, token, { examId, classId }).catch(() => null),
    getActiveClassStudents(clientId, token, classId),
    getResults(clientId, token, { examId, classId, limit: 2000 }),
    getSubjects(clientId, token, { classId }),
  ]);
  const subjects: SubjectMeta[] = (computedReport?.subjects.length
    ? computedReport.subjects
    : subjectResponse.data.map((subject) => ({
        id: subject.id,
        name: subject.name,
        maxMarks: subject.classSubject?.maxMarks ?? 50,
        passMarks: subject.classSubject?.passMarks ?? null,
        gradeConfig: subject.classSubject?.gradeConfig ?? null,
      })))
    .filter((subject) => !subjectId || subject.id === subjectId);

  const resultsByStudent = new Map<string, typeof resultResponse.data>();
  for (const result of resultResponse.data) {
    if (!result.student?.id) continue;
    const current = resultsByStudent.get(result.student.id) ?? [];
    current.push(result);
    resultsByStudent.set(result.student.id, current);
  }
  const rows: ClassReportRow[] = classStudents.map((student) => {
    const results = resultsByStudent.get(student.id) ?? [];
    const marks: ClassReportRow["marks"] = {};
    for (const subject of subjects) {
      const result = results.find((entry) => entry.subject?.id === subject.id);
      marks[subject.id] = {
        score: result?.score ?? 0,
        maxMarks: result?.totalMarks || subject.maxMarks,
        grade: result?.grade ?? null,
        isPassed: result?.isPassed ?? null,
        percentage: result?.percentage ?? null,
      };
    }
    const totalScore = subjects.length ? Object.values(marks).reduce((sum, mark) => sum + mark.score, 0) : null;
    const totalMaxMarks = subjects.length ? Object.values(marks).reduce((sum, mark) => sum + mark.maxMarks, 0) : null;
    return {
      student: { id: student.id, name: student.name, adno: student.adno, gender: student.gender ?? "" },
      marks,
      summary: {
        totalScore,
        totalMaxMarks,
        totalPercentage: totalScore !== null && totalMaxMarks ? totalScore / totalMaxMarks * 100 : null,
        rank: null,
        finalStatus: null,
        totalGrade: null,
      },
    };
  });
  const completedRows = rows.filter((row) => row.summary.totalPercentage !== null);
  const classAverage = completedRows.length
    ? completedRows.reduce((sum, row) => sum + (row.summary.totalPercentage ?? 0), 0) / completedRows.length
    : 0;
  return {
    computedReport,
    report: {
      exam: computedReport?.exam ?? { id: examId, name: examName, type: examType, examStatus: "MARK_ENTRY" },
      class: computedReport?.class ?? { id: classId, name: className },
      clientName: computedReport?.clientName,
      clientLogo: computedReport?.clientLogo,
      subjects,
      config: computedReport?.config ?? {
        hideMarks: false,
        passedLabel: "Passed",
        failedLabel: "Failed",
        promotedLabel: "Promoted",
        withheldLabel: "Withheld",
      },
      students: rows,
      stats: { totalStudents: rows.length, passedCount: 0, failedCount: 0, rankedCount: 0, classAverage },
    },
  };
}
