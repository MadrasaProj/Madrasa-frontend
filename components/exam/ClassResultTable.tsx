import { useRef, useState, useCallback } from "react";
import {
  Download, FileImage, Printer, Trophy,
  CheckCircle2, XCircle, Clock, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  ClassReport, ClassReportRow, ClassReportConfig, SubjectMeta,
  ResultStatus, TotalGrade,
} from "@/lib/results-api";
import { GRADE_COLORS, TOTAL_GRADE_LABELS } from "@/lib/results-api";

// ── Grade chip ────────────────────────────────────────────────────────────────

function GradeChip({ grade, isPassed }: { grade: string | null; isPassed: boolean | null }) {
  if (!grade) return <span className="text-gray-400 text-xs">—</span>;
  const cls = GRADE_COLORS[grade] ?? "text-gray-600 bg-gray-50 border-gray-200";
  return (
    <span className={cn("inline-block px-1.5 py-0.5 rounded text-xs font-semibold border", cls)}>
      {grade}
    </span>
  );
}

// ── Status chip ───────────────────────────────────────────────────────────────

const STATUS_ICONS: Record<string, React.ReactNode> = {
  PASSED:   <CheckCircle2 className="w-3 h-3" />,
  FAILED:   <XCircle className="w-3 h-3" />,
  PROMOTED: <Trophy className="w-3 h-3" />,
  WITHHELD: <Clock className="w-3 h-3" />,
};

function StatusChip({ status, labels }: {
  status: ResultStatus | null;
  labels: { passedLabel: string; failedLabel: string; promotedLabel: string; withheldLabel: string };
}) {
  if (!status) return <span className="text-gray-400 text-xs">—</span>;
  const labelMap: Record<ResultStatus, string> = {
    PASSED:   labels.passedLabel,
    FAILED:   labels.failedLabel,
    PROMOTED: labels.promotedLabel,
    WITHHELD: labels.withheldLabel,
  };
  const colorMap: Record<ResultStatus, string> = {
    PASSED:   "text-emerald-700 bg-emerald-50",
    FAILED:   "text-red-700 bg-red-50",
    PROMOTED: "text-blue-700 bg-blue-50",
    WITHHELD: "text-amber-700 bg-amber-50",
  };
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold", colorMap[status])}>
      {STATUS_ICONS[status]}
      {labelMap[status]}
    </span>
  );
}

// ── Rank badge ────────────────────────────────────────────────────────────────

function RankBadge({ rank }: { rank: number | null }) {
  if (!rank) return <span className="text-gray-400 text-xs">—</span>;
  const medal =
    rank === 1 ? "🥇" :
    rank === 2 ? "🥈" :
    rank === 3 ? "🥉" : null;
  return (
    <span className="inline-flex items-center gap-1 text-sm font-bold text-gray-700">
      {medal && <span>{medal}</span>}
      {rank}
    </span>
  );
}

// ── PDF / image export ────────────────────────────────────────────────────────

async function exportAsImage(el: HTMLElement, filename: string, format: "png" | "jpeg" = "png") {
  const html2canvas = (await import("html2canvas")).default;
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
  const url  = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href  = url;
  link.download = `${filename}.${format}`;
  link.click();
  URL.revokeObjectURL(url);
}

async function exportAsPDF(el: HTMLElement, filename: string) {
  const [html2canvas, { jsPDF }] = await Promise.all([
    import("html2canvas").then((m) => m.default),
    import("jspdf"),
  ]);
  const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: "#ffffff", logging: false });
  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pW = pdf.internal.pageSize.getWidth();
  const pH = pdf.internal.pageSize.getHeight();
  const ratio = canvas.width / canvas.height;
  const h = Math.min(pH, pW / ratio);
  pdf.addImage(imgData, "PNG", 0, 0, pW, h);
  pdf.save(`${filename}.pdf`);
}

// ── Print (system dialog — best quality for A4) ───────────────────────────────

function printTable(el: HTMLElement, title: string) {
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(`<!DOCTYPE html><html><head>
    <title>${title}</title>
    <style>
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0 }
      body { font-family: Arial, sans-serif; font-size: 11px; color: #111; background: #fff }
      h1 { font-size: 15px; text-align: center; margin-bottom: 2px }
      h2 { font-size: 12px; text-align: center; color: #555; margin-bottom: 8px }
      .stats { display: flex; gap: 16px; justify-content: center; margin-bottom: 10px; font-size: 11px; color: #444 }
      table { width: 100%; border-collapse: collapse; page-break-inside: auto }
      thead { background: #1e40af; color: #fff }
      th, td { border: 1px solid #d1d5db; padding: 4px 6px; text-align: center; vertical-align: middle }
      th { font-weight: 700; font-size: 10px }
      td:nth-child(2), td:nth-child(3) { text-align: left }
      tr:nth-child(even) td { background: #f8fafc }
      .pass { color: #15803d } .fail { color: #b91c1c }
      .rank1 { background: #fef9c3 !important } .rank2 { background: #f1f5f9 !important } .rank3 { background: #fef3c7 !important }
      .foot { text-align: center; margin-top: 12px; font-size: 10px; color: #6b7280 }
      @media print { @page { margin: 10mm } }
    </style></head><body>`);
  win.document.body.appendChild(el.cloneNode(true));
  win.document.write(`<div class="foot">Powered by Al Madrasa Platform • ${new Date().toLocaleDateString()}</div></body></html>`);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); win.close(); }, 300);
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  report: ClassReport;
  madrasaName?: string;
}

export function ClassResultTable({ report, madrasaName }: Props) {
  const { exam, class: cls, subjects, config, students, stats } = report;
  const tableRef  = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState<"pdf" | "jpg" | "print" | null>(null);

  const filename = `${madrasaName ? madrasaName + " - " : ""}${cls.name} - ${exam.name}`;

  const doExport = useCallback(async (type: "pdf" | "jpg" | "print") => {
    if (!tableRef.current) return;
    setExporting(type);
    try {
      if (type === "print") {
        printTable(tableRef.current, filename);
      } else if (type === "pdf") {
        await exportAsPDF(tableRef.current, filename);
      } else {
        await exportAsImage(tableRef.current, filename, "jpeg");
      }
    } finally {
      setExporting(null);
    }
  }, [filename]);

  const fmt = (d?: string | null) =>
    d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

  return (
    <div className="space-y-4">
      {/* Export toolbar */}
      <div className="flex items-center gap-2 justify-end flex-wrap">
        {(["print", "pdf", "jpg"] as const).map((type) => (
          <button
            key={type}
            onClick={() => doExport(type)}
            disabled={!!exporting}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
              "border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 disabled:opacity-50",
            )}
          >
            {exporting === type
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : type === "print"
                ? <Printer className="w-4 h-4" />
                : type === "pdf"
                  ? <Download className="w-4 h-4" />
                  : <FileImage className="w-4 h-4" />
            }
            {type === "print" ? "Print" : type.toUpperCase()}
          </button>
        ))}
      </div>

      {/* ── Printable area ──────────────────────────────────────────────────── */}
      <div ref={tableRef} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-900 to-blue-700 text-white px-6 py-4 text-center">
          {madrasaName && <p className="text-blue-200 text-sm font-medium uppercase tracking-widest mb-1">{madrasaName}</p>}
          <h1 className="text-xl font-bold">{exam.name} — Result Sheet</h1>
          <p className="text-blue-200 text-sm mt-1">
            Class: <strong className="text-white">{cls.name}</strong>
            {cls.classTeacher && <> · Class Teacher: <strong className="text-white">{cls.classTeacher.name}</strong></>}
            {exam.publishedDate && <> · Published: <strong className="text-white">{fmt(exam.publishedDate)}</strong></>}
          </p>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-2 sm:grid-cols-5 divide-x divide-y sm:divide-y-0 divide-gray-100 border-b border-gray-100 text-center text-sm">
          {[
            { label: "Students",    value: stats.totalStudents },
            { label: "Passed",      value: stats.passedCount,  color: "text-emerald-600" },
            { label: "Failed",      value: stats.failedCount,  color: "text-red-600" },
            { label: "Ranked",      value: stats.rankedCount,  color: "text-blue-600" },
            { label: "Class Avg",   value: `${stats.classAverage.toFixed(1)}%`, color: "text-purple-600" },
          ].map(({ label, value, color }) => (
            <div key={label} className="py-3 px-4">
              <div className={cn("text-xl font-bold", color ?? "text-gray-800")}>{value}</div>
              <div className="text-xs text-gray-500">{label}</div>
            </div>
          ))}
        </div>

        {/* Table — horizontal scroll on small screens */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-10">#</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Reg No</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide min-w-36">Name</th>
                {subjects.map((s) => (
                  <th key={s.id} className="px-2 py-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide min-w-28">
                    <div>{s.name}</div>
                    {!config.hideMarks && <div className="text-gray-400 font-normal normal-case">(/{s.maxMarks})</div>}
                  </th>
                ))}
                <th className="px-2 py-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Total</th>
                <th className="px-2 py-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">%</th>
                <th className="px-2 py-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Rank</th>
                <th className="px-2 py-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="px-2 py-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Grade</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {students.map((row, idx) => (
                <StudentRow
                  key={row.student.id}
                  row={row}
                  idx={idx}
                  subjects={subjects}
                  config={config}
                />
              ))}

              {students.length === 0 && (
                <tr>
                  <td colSpan={subjects.length + 8} className="py-12 text-center text-gray-400 text-sm">
                    No results computed yet. Run "Compute Grades" first.
                  </td>
                </tr>
              )}
            </tbody>

            {/* Class average footer */}
            {students.length > 0 && !config.hideMarks && (
              <tfoot>
                <tr className="bg-blue-50 border-t-2 border-blue-100 font-semibold">
                  <td colSpan={3} className="px-3 py-2 text-xs text-blue-700 font-bold">Class Average</td>
                  {subjects.map((s) => {
                    const vals = students
                      .map((r) => r.marks[s.id]?.score ?? null)
                      .filter((v): v is number => v !== null);
                    const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
                    return (
                      <td key={s.id} className="px-2 py-2 text-center text-xs text-blue-700">
                        {avg !== null ? avg.toFixed(1) : "—"}
                      </td>
                    );
                  })}
                  <td className="px-2 py-2 text-center text-xs text-blue-700">
                    {stats.classAverage > 0
                      ? ((stats.classAverage / 100) * (students[0]?.summary.totalMaxMarks ?? 0)).toFixed(1)
                      : "—"}
                  </td>
                  <td className="px-2 py-2 text-center text-xs text-blue-700">
                    {stats.classAverage.toFixed(1)}%
                  </td>
                  <td colSpan={3} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-100 text-center text-xs text-gray-400">
          Powered by <span className="font-semibold text-blue-600">Al Madrasa Platform</span> · Generated {new Date().toLocaleString("en-IN")}
        </div>
      </div>
    </div>
  );
}

// ── Student row ───────────────────────────────────────────────────────────────

function StudentRow({ row, idx, subjects, config }: {
  row: ClassReportRow;
  idx: number;
  subjects: SubjectMeta[];
  config: ClassReportConfig;
}) {
  const { summary, student, marks } = row;
  const rankHighlight =
    summary.rank === 1 ? "bg-yellow-50" :
    summary.rank === 2 ? "bg-gray-50" :
    summary.rank === 3 ? "bg-amber-50" : "";

  return (
    <tr className={cn("hover:bg-blue-50/30 transition-colors", rankHighlight)}>
      <td className="px-3 py-2.5 text-center text-xs text-gray-500">{idx + 1}</td>
      <td className="px-3 py-2.5 text-xs font-mono text-gray-600">{student.adno}</td>
      <td className="px-3 py-2.5 font-medium text-gray-900 text-sm">{student.name}</td>

      {subjects.map((s) => {
        const m = marks[s.id];
        return (
          <td key={s.id} className="px-2 py-2.5 text-center">
            {m ? (
              <div className="flex flex-col items-center gap-0.5">
                {!config.hideMarks && (
                  <span className={cn("text-sm font-semibold", m.isPassed === false ? "text-red-600" : "text-gray-800")}>
                    {m.score}
                  </span>
                )}
                <GradeChip grade={m.grade} isPassed={m.isPassed} />
                {m.percentage !== null && (
                  <span className="text-xs text-gray-400">{m.percentage.toFixed(0)}%</span>
                )}
              </div>
            ) : (
              <span className="text-gray-300 text-xs">—</span>
            )}
          </td>
        );
      })}

      <td className="px-2 py-2.5 text-center">
        {!config.hideMarks && summary.totalScore !== null ? (
          <span className="font-semibold text-sm text-gray-800">
            {summary.totalScore.toFixed(0)}
            <span className="text-xs text-gray-400 font-normal">/{summary.totalMaxMarks?.toFixed(0)}</span>
          </span>
        ) : "—"}
      </td>

      <td className="px-2 py-2.5 text-center">
        {summary.totalPercentage !== null ? (
          <span className={cn(
            "text-sm font-bold",
            summary.totalPercentage >= 80 ? "text-emerald-600" :
            summary.totalPercentage >= 60 ? "text-blue-600" :
            summary.totalPercentage >= 40 ? "text-amber-600" : "text-red-600",
          )}>
            {summary.totalPercentage.toFixed(1)}%
          </span>
        ) : "—"}
      </td>

      <td className="px-2 py-2.5 text-center">
        <RankBadge rank={summary.rank} />
      </td>

      <td className="px-2 py-2.5 text-center">
        <StatusChip
          status={summary.finalStatus}
          labels={{ passedLabel: config.passedLabel, failedLabel: config.failedLabel, promotedLabel: config.promotedLabel, withheldLabel: config.withheldLabel }}
        />
      </td>

      <td className="px-2 py-2.5 text-center text-xs text-gray-600">
        {summary.totalGrade ? TOTAL_GRADE_LABELS[summary.totalGrade] ?? summary.totalGrade : "—"}
      </td>
    </tr>
  );
}

