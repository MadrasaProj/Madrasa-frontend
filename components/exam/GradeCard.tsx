import { useRef, useState, useCallback, useMemo } from "react";
import { Trophy, TrendingUp, Users, BarChart2, Download, FileImage, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StudentRecord } from "@/lib/students-api";
import type { SubjectRecord } from "@/lib/subjects-api";
import { calcGradeFromConfig, GRADE_COLORS } from "@/lib/results-api";

interface GradeCardProps {
  students: StudentRecord[];
  subjects: SubjectRecord[];
  subjectId: string;
  scores: Record<string, string>;
  examMaxMarks?: number;
  examName?: string;
  className?: string;
}

interface StudentGrade {
  student: StudentRecord;
  score: number;
  maxMarks: number;
  percentage: number;
  grade: string;
  isPassed: boolean;
}

function GradeChip({ grade }: { grade: string }) {
  const cls = GRADE_COLORS[grade] ?? "text-gray-600 bg-gray-50 border-gray-200";
  return (
    <span className={cn("inline-block px-1.5 py-0.5 rounded text-[10px] font-bold border", cls)}>
      {grade}
    </span>
  );
}

async function exportAsImage(el: HTMLElement, filename: string, format: "png" | "jpeg" = "png") {
  const html2canvas = (await import("html2canvas-pro")).default;
  const canvas = await html2canvas(el, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#ffffff",
    logging: false,
  });
  const blob = await new Promise<Blob | null>((res) =>
    canvas.toBlob(res, format === "jpeg" ? "image/jpeg" : "image/png", 0.95),
  );
  if (!blob) return;
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.${format}`;
  link.click();
  URL.revokeObjectURL(url);
}

async function exportAsPDF(el: HTMLElement, filename: string) {
  const [html2canvas, { jsPDF }] = await Promise.all([
    import("html2canvas-pro").then((m) => m.default),
    import("jspdf"),
  ]);
  const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: "#ffffff", logging: false });
  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pW = pdf.internal.pageSize.getWidth();
  const pH = pdf.internal.pageSize.getHeight();
  const ratio = canvas.width / canvas.height;
  const h = Math.min(pH, pW / ratio);
  pdf.addImage(imgData, "PNG", 0, 0, pW, h);
  pdf.save(`${filename}.pdf`);
}

export function GradeCard({ students, subjects, subjectId, scores, examMaxMarks, examName, className }: GradeCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState<"png" | "pdf" | null>(null);

  const currentSubject = subjects.find((s) => s.id === subjectId);
  const maxMarks = currentSubject?.classSubject?.maxMarks ?? examMaxMarks ?? 50;
  const gradeConfig = currentSubject?.classSubject?.gradeConfig ?? null;
  const subjectName = currentSubject?.name ?? "Subject";
  const filename = `${examName ? examName + " - " : ""}${subjectName} - Grades`;

  const studentGrades = useMemo<StudentGrade[]>(() => {
    return students
      .filter((s) => scores[s.id] !== "" && scores[s.id] !== undefined)
      .map((s) => {
        const score = Number(scores[s.id]);
        const percentage = maxMarks > 0 ? (score / maxMarks) * 100 : 0;
        const grade = calcGradeFromConfig(score, maxMarks, gradeConfig);
        const isPassed = grade !== "D";
        return { student: s, score, maxMarks, percentage, grade, isPassed };
      })
      .sort((a, b) => b.score - a.score);
  }, [students, scores, maxMarks, gradeConfig]);

  const stats = useMemo(() => {
    if (studentGrades.length === 0) return null;
    const scores = studentGrades.map((g) => g.score);
    const total = scores.reduce((a, b) => a + b, 0);
    const avg = total / scores.length;
    const highest = Math.max(...scores);
    const lowest = Math.min(...scores);
    const passed = studentGrades.filter((g) => g.isPassed).length;
    const passRate = (passed / studentGrades.length) * 100;

    const gradeDistribution: Record<string, number> = {};
    studentGrades.forEach((g) => {
      gradeDistribution[g.grade] = (gradeDistribution[g.grade] || 0) + 1;
    });

    return { avg, highest, lowest, passed, passRate, total: scores.length, gradeDistribution };
  }, [studentGrades]);

  const doExport = useCallback(async (type: "png" | "pdf") => {
    if (!cardRef.current) return;
    setExporting(type);
    try {
      if (type === "pdf") {
        await exportAsPDF(cardRef.current, filename);
      } else {
        await exportAsImage(cardRef.current, filename, "png");
      }
    } finally {
      setExporting(null);
    }
  }, [filename]);

  if (studentGrades.length === 0) return null;

  return (
    <div className={cn("space-y-3", className)}>
      {/* Export buttons */}
      <div className="flex items-center gap-2 justify-end">
        <button
          onClick={() => doExport("png")}
          disabled={!!exporting}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 disabled:opacity-50 transition-colors"
        >
          {exporting === "png" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileImage className="w-3.5 h-3.5" />}
          PNG
        </button>
        <button
          onClick={() => doExport("pdf")}
          disabled={!!exporting}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 disabled:opacity-50 transition-colors"
        >
          {exporting === "pdf" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
          PDF
        </button>
      </div>

      {/* Printable area */}
      <div ref={cardRef} className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-900 to-emerald-700 text-white px-5 py-4 text-center">
          <p className="text-emerald-200 text-[10px] font-bold uppercase tracking-widest mb-1">Grade Report</p>
          <h3 className="text-lg font-extrabold tracking-tight">{examName ?? "Class Test"}</h3>
          <p className="text-emerald-100/80 text-xs mt-1">
            Subject: <strong className="text-white font-bold">{subjectName}</strong>
            {stats && <> · Students: <strong className="text-white font-bold">{stats.total}</strong></>}
          </p>
        </div>

        {/* Stats Grid */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-gray-100 border-b border-gray-100">
            <div className="p-3 text-center">
              <div className="flex items-center justify-center gap-1 text-emerald-600 mb-0.5">
                <TrendingUp className="w-3.5 h-3.5" />
                <span className="text-[9px] font-bold uppercase tracking-wider">Average</span>
              </div>
              <p className="text-xl font-extrabold text-emerald-700">{stats.avg.toFixed(1)}</p>
              <p className="text-[9px] text-emerald-600/70">out of {maxMarks}</p>
            </div>
            <div className="p-3 text-center">
              <div className="flex items-center justify-center gap-1 text-teal-600 mb-0.5">
                <Trophy className="w-3.5 h-3.5" />
                <span className="text-[9px] font-bold uppercase tracking-wider">Highest</span>
              </div>
              <p className="text-xl font-extrabold text-teal-700">{stats.highest}</p>
              <p className="text-[9px] text-teal-600/70">out of {maxMarks}</p>
            </div>
            <div className="p-3 text-center">
              <div className="flex items-center justify-center gap-1 text-amber-600 mb-0.5">
                <BarChart2 className="w-3.5 h-3.5" />
                <span className="text-[9px] font-bold uppercase tracking-wider">Lowest</span>
              </div>
              <p className="text-xl font-extrabold text-amber-700">{stats.lowest}</p>
              <p className="text-[9px] text-amber-600/70">out of {maxMarks}</p>
            </div>
            <div className="p-3 text-center">
              <div className="flex items-center justify-center gap-1 text-blue-600 mb-0.5">
                <Users className="w-3.5 h-3.5" />
                <span className="text-[9px] font-bold uppercase tracking-wider">Pass Rate</span>
              </div>
              <p className="text-xl font-extrabold text-blue-700">{stats.passRate.toFixed(0)}%</p>
              <p className="text-[9px] text-blue-600/70">{stats.passed}/{stats.total} passed</p>
            </div>
          </div>
        )}

        {/* Grade Distribution */}
        {stats && Object.keys(stats.gradeDistribution).length > 0 && (
          <div className="px-5 py-3 border-b border-gray-100">
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Grade Distribution</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.gradeDistribution)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([grade, count]) => (
                  <div key={grade} className="flex items-center gap-1.5">
                    <GradeChip grade={grade} />
                    <span className="text-xs font-semibold text-gray-600">{count}</span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Student Grade Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                <th className="px-4 py-2.5 text-center w-10">#</th>
                <th className="px-4 py-2.5 text-left">Name</th>
                <th className="px-4 py-2.5 text-center w-20">Score</th>
                <th className="px-4 py-2.5 text-center w-16">%</th>
                <th className="px-4 py-2.5 text-center w-16">Grade</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {studentGrades.map((g, idx) => (
                <tr
                  key={g.student.id}
                  className={cn(
                    "hover:bg-emerald-50/15 transition-colors",
                    !g.isPassed && "bg-red-50/30"
                  )}
                >
                  <td className="px-4 py-2 text-center text-xs text-gray-500">{idx + 1}</td>
                  <td className="px-4 py-2">
                    <p className="font-semibold text-gray-900 text-sm">{g.student.name}</p>
                    <p className="text-[10px] text-gray-400">{g.student.adno}</p>
                  </td>
                  <td className="px-4 py-2 text-center">
                    <span className={cn("font-bold", g.isPassed ? "text-gray-800" : "text-red-600")}>
                      {g.score}
                    </span>
                    <span className="text-[10px] text-gray-400">/{maxMarks}</span>
                  </td>
                  <td className="px-4 py-2 text-center">
                    <span className={cn(
                      "text-xs font-extrabold",
                      g.percentage >= 80 ? "text-emerald-600" :
                      g.percentage >= 60 ? "text-teal-600" :
                      g.percentage >= 40 ? "text-amber-600" : "text-red-600"
                    )}>
                      {g.percentage.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-4 py-2 text-center">
                    <GradeChip grade={g.grade} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-100 text-center text-[10px] text-gray-400">
          Generated on {new Date().toLocaleString("en-IN")}
        </div>
      </div>
    </div>
  );
}
