import { getClassAttendance, type ClassAttendanceRecord } from "@/lib/attendance-api";
import type { ClassRecord } from "@/lib/classes-api";
import { getStudents, type StudentRecord } from "@/lib/students-api";

const PAGE_SIZE = 500;
const STATUSES = ["PRESENT", "ABSENT", "LEAVE", "SICK", "LATE", "EXCUSED"] as const;

async function getAllStudents(clientId: string, token: string, classId: string) {
  const students: StudentRecord[] = [];
  let page = 1;
  while (true) {
    const response = await getStudents(clientId, token, {
      classId,
      status: "ACTIVE",
      page,
      limit: PAGE_SIZE,
    });
    students.push(...response.data);
    if (response.data.length === 0 || students.length >= response.total) return students;
    page++;
  }
}

async function getAllAttendance(
  clientId: string,
  token: string,
  classId: string,
  date: string,
  academicYearId?: string | null,
) {
  const records: ClassAttendanceRecord[] = [];
  while (true) {
    const response = await getClassAttendance(clientId, token, {
      classId,
      date,
      ...(academicYearId ? { academicYearId } : {}),
      skip: records.length,
      take: PAGE_SIZE,
    });
    records.push(...response.records);
    if (response.records.length === 0 || records.length >= response.total) return records;
  }
}

export async function downloadDailyAttendanceReport({
  clientId,
  token,
  date,
  classes,
  academicYearId,
  scope,
}: {
  clientId: string;
  token: string;
  date: string;
  classes: ClassRecord[];
  academicYearId?: string | null;
  scope: "collective" | "class";
}) {
  if (!clientId || !token || classes.length === 0) throw new Error("No classes available for this report");

  const summaryRows: (string | number)[][] = [];
  const studentRows: (string | number)[][] = [];
  const totals: Record<string, number> = {
    students: 0,
    marked: 0,
    unmarked: 0,
    ...Object.fromEntries(STATUSES.map((status) => [status, 0])),
  };

  for (const cls of classes) {
    const [students, records] = await Promise.all([
      getAllStudents(clientId, token, cls.id),
      getAllAttendance(clientId, token, cls.id, date, academicYearId),
    ]);
    const recordsByStudent = new Map(records.map((record) => [record.student.id, record]));
    const studentById = new Map<string, Pick<StudentRecord, "id" | "name" | "adno">>(
      students.map((student) => [student.id, student]),
    );
    const counts: Record<string, number> = { students: 0, marked: 0, unmarked: 0 };
    for (const status of STATUSES) counts[status] = 0;

    // Include currently active students without records and historical students
    // who have a saved record for the selected date.
    for (const record of records) {
      if (!studentById.has(record.student.id)) {
        studentById.set(record.student.id, {
          id: record.student.id,
          name: record.student.name,
          adno: record.student.adno,
        });
      }
    }

    for (const student of [...studentById.values()].sort((a, b) => a.name.localeCompare(b.name))) {
      const record = recordsByStudent.get(student.id);
      const status = record?.status ?? "UNMARKED";
      counts.students++;
      counts[status] = (counts[status] ?? 0) + 1;
      if (record) counts.marked++;
      studentRows.push([
        cls.name,
        student.adno,
        student.name,
        status,
        record?.lateComing ? "Yes" : "No",
        record?.lateComingTime ?? "",
        record?.notes ?? "",
      ]);
    }

    for (const key of Object.keys(totals)) totals[key] += counts[key] ?? 0;
    summaryRows.push([
      cls.name,
      counts.students,
      counts.marked,
      counts.unmarked,
      ...STATUSES.map((status) => counts[status]),
    ]);
  }

  const XLSX = await import("xlsx");
  const workbook = XLSX.utils.book_new();
  const summary = XLSX.utils.aoa_to_sheet([
    ["Daily attendance report"],
    ["Date", date],
    ["Scope", scope === "collective" ? "All classes" : classes[0].name],
    [],
    ["Class", "Students", "Marked", "Unmarked", ...STATUSES.map((status) => status[0] + status.slice(1).toLowerCase())],
    ...summaryRows,
    ["Total", totals.students, totals.marked, totals.unmarked, ...STATUSES.map((status) => totals[status])],
  ]);
  summary["!cols"] = [{ wch: 24 }, ...Array(9).fill({ wch: 13 })];
  XLSX.utils.book_append_sheet(workbook, summary, "Summary");

  const details = XLSX.utils.aoa_to_sheet([
    ["Class", "Admission No", "Student", "Status", "Late coming", "Arrival time", "Notes"],
    ...studentRows,
  ]);
  details["!cols"] = [{ wch: 24 }, { wch: 16 }, { wch: 28 }, { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(workbook, details, "Students");

  const classSuffix = scope === "class"
    ? `-${classes[0].name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "class"}`
    : "-all-classes";
  XLSX.writeFile(workbook, `attendance-${date}${classSuffix}.xlsx`);
}
