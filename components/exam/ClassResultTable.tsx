import { useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { Download, Printer, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { jsPDF } from "jspdf";
import { cn } from "@/lib/utils";
import type {
  ClassReport, ClassReportRow, SubjectMeta, ClassReportConfig,
} from "@/lib/results-api";
import { calcGradeFromConfig, GRADE_COLORS, TOTAL_GRADE_LABELS } from "@/lib/results-api";

function fmt(d?: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function drawPdfText(
  pdf: jsPDF,
  value: string,
  x: number,
  y: number,
  maxWidth: number,
  align: "left" | "center" | "right" = "left",
  bold = false,
  fontSize = 8,
) {
  const text = value || "-";
  pdf.setFont("helvetica", bold ? "bold" : "normal");
  pdf.setFontSize(fontSize);

  // jsPDF's built-in font cannot shape Malayalam. Rasterize only those text runs.
  if (/[^\x00-\x7F]/.test(text)) {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) return;
    const height = 44;
    const renderedHeight = fontSize * 0.43;
    context.font = `${bold ? 700 : 400} 32px 'Noto Sans Malayalam', sans-serif`;
    canvas.width = Math.ceil(Math.min(context.measureText(text).width + 4, maxWidth * height / renderedHeight));
    canvas.height = height;
    context.font = `${bold ? 700 : 400} 32px 'Noto Sans Malayalam', sans-serif`;
    context.fillStyle = pdf.getTextColor();
    context.textBaseline = "middle";
    context.fillText(text, 2, height / 2, canvas.width - 4);
    const width = canvas.width * renderedHeight / height;
    const left = align === "center" ? x - width / 2 : align === "right" ? x - width : x;
    pdf.addImage(canvas.toDataURL("image/png"), "PNG", left, y - renderedHeight * 0.8, width, renderedHeight);
    return;
  }

  let fitted = text;
  if (pdf.getTextWidth(fitted) > maxWidth) {
    let length = text.length;
    do {
      length -= 1;
      fitted = `${text.slice(0, Math.max(0, length))}...`;
    } while (length > 0 && pdf.getTextWidth(fitted) > maxWidth);
  }
  pdf.text(fitted, x, y, { align });
}

function createReportPdf(report: ClassReport, teacherView: boolean, madrasaName: string) {
  const { subjects, students, config, stats } = report;
  const teacherRanks = teacherView
    ? new Map(getTeacherRows(report).map(({ row, rank }) => [row.student.id, rank]))
    : null;
  const rows = students.map((row, index) => {
    const outcome = teacherView ? getTeacherOutcome(row, subjects) : null;
    const status = teacherView ? outcome?.status ?? "-" : row.summary.finalStatus
      ? row.summary.finalStatus === "PASSED" ? config.passedLabel
        : row.summary.finalStatus === "FAILED" ? config.failedLabel
          : row.summary.finalStatus === "PROMOTED" ? config.promotedLabel : config.withheldLabel
      : "-";
    return {
      number: String(index + 1),
      registration: row.student.adno || "-",
      name: row.student.name,
      marks: subjects.map((subject) => {
        const mark = row.marks[subject.id];
        if (!mark) return teacherView ? "0" : "-";
        return !teacherView && config.hideMarks ? mark.grade || "-" : String(mark.score);
      }),
      total: teacherView
        ? outcome ? `${outcome.totalScore}/${outcome.totalMaxMarks}` : "-"
        : !config.hideMarks && row.summary.totalScore != null ? `${row.summary.totalScore}/${row.summary.totalMaxMarks ?? 0}` : "-",
      percentage: teacherView ? outcome?.percentage ?? null : row.summary.totalPercentage,
      rank: teacherView ? teacherRanks?.get(row.student.id)?.toString() ?? "-" : row.summary.rank?.toString() ?? "-",
      status,
      grade: teacherView ? outcome?.grade ?? "-" : row.summary.totalGrade ? TOTAL_GRADE_LABELS[row.summary.totalGrade] : "-",
    };
  });
  const completed = rows.filter((row) => row.percentage !== null);
  const passed = teacherView ? rows.filter((row) => row.status === "Passed").length : stats.passedCount;
  const failed = teacherView ? rows.filter((row) => row.status === "Failed").length : stats.failedCount;
  const average = teacherView
    ? completed.length ? completed.reduce((sum, row) => sum + (row.percentage ?? 0), 0) / completed.length : null
    : stats.classAverage;
  const statistics = teacherView
    ? [["Students", String(students.length)], ["Passed", String(passed)], ["Failed", String(failed)], ["Class avg", average === null ? "-" : `${average.toFixed(1)}%`]]
    : [["Students", String(stats.totalStudents)], ["Passed", String(passed)], ["Failed", String(failed)], ["Ranked", String(stats.rankedCount)], ["Class avg", `${stats.classAverage.toFixed(1)}%`]];

  const columns = [
    { label: "#", width: 8, align: "center" as const },
    { label: "Reg No", width: 23, align: "left" as const },
    { label: "Name", width: 48, align: "left" as const },
    ...subjects.map((subject) => ({ label: subject.name, width: 21, align: "center" as const })),
    { label: "Total", width: 24, align: "center" as const },
    { label: "%", width: 23, align: "center" as const },
    { label: "Rank", width: 14, align: "center" as const },
    { label: "Status", width: 25, align: "center" as const },
    { label: "Grade", width: 25, align: "center" as const },
  ];
  const tableWidth = columns.reduce((sum, column) => sum + column.width, 0);
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: [Math.max(297, tableWidth + 20), 210] });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const tableX = (pageWidth - tableWidth) / 2;
  const rowHeight = 8;
  const columnXs = columns.map((_, index) => tableX + columns.slice(0, index).reduce((sum, column) => sum + column.width, 0));

  const drawPageHeader = (withStats: boolean) => {
    pdf.setTextColor(17, 24, 39);
    drawPdfText(pdf, report.exam.name, tableX, 15, tableWidth, "left", true, 14);
    pdf.setTextColor(75, 85, 99);
    drawPdfText(pdf, `${report.class.name}${madrasaName ? ` | ${madrasaName}` : ""}`, tableX, 21, tableWidth, "left", false, 8);
    if (withStats) {
      const cardWidth = tableWidth / statistics.length;
      statistics.forEach(([label, value], index) => {
        const x = tableX + index * cardWidth;
        pdf.setFillColor(5 + index * 7, 150 + index * 7, 105 + index * 5);
        pdf.rect(x, 26, cardWidth, 16, "F");
        pdf.setTextColor(220, 255, 238);
        drawPdfText(pdf, label, x + 3, 31, cardWidth - 6, "left", false, 7);
        pdf.setTextColor(255, 255, 255);
        drawPdfText(pdf, value, x + 3, 38, cardWidth - 6, "left", true, 13);
      });
    }
    const headerY = withStats ? 47 : 27;
    pdf.setFillColor(248, 250, 252);
    pdf.rect(tableX, headerY, tableWidth, 9, "F");
    pdf.setTextColor(75, 85, 99);
    columns.forEach((column, index) => {
      const x = column.align === "center" ? columnXs[index] + column.width / 2 : columnXs[index] + 2;
      drawPdfText(pdf, column.label, x, headerY + 5.8, column.width - 3, column.align, true, 7.5);
    });
    pdf.setDrawColor(226, 232, 240);
    pdf.line(tableX, headerY + 9, tableX + tableWidth, headerY + 9);
    return headerY + 9;
  };

  let y = drawPageHeader(true);
  for (const row of rows) {
    if (y + rowHeight > pageHeight - 12) {
      pdf.addPage();
      y = drawPageHeader(false);
    }
    if (Number(row.number) % 2 === 0) {
      pdf.setFillColor(250, 251, 252);
      pdf.rect(tableX, y, tableWidth, rowHeight, "F");
    }
    pdf.setTextColor(31, 41, 55);
    const values = [row.number, row.registration, row.name, ...row.marks, row.total, row.percentage === null ? "-" : `${row.percentage.toFixed(1)}%`, row.rank, row.status, row.grade];
    values.forEach((value, index) => {
      const column = columns[index];
      const x = column.align === "center" ? columnXs[index] + column.width / 2 : columnXs[index] + 2;
      if (index === subjects.length + 4 && row.percentage !== null) {
        const ringX = columnXs[index] + 4;
        const ringY = y + rowHeight / 2;
        const radius = 1.7;
        const fraction = Math.max(0, Math.min(1, row.percentage / 100));
        pdf.setLineWidth(0.6);
        pdf.setDrawColor(209, 250, 229);
        pdf.circle(ringX, ringY, radius, "S");
        pdf.setDrawColor(5, 150, 105);
        const steps = Math.ceil(fraction * 24);
        for (let step = 1; step <= steps; step += 1) {
          const start = (step - 1) / 24 * Math.PI * 2 - Math.PI / 2;
          const end = Math.min(step / 24, fraction) * Math.PI * 2 - Math.PI / 2;
          pdf.line(ringX + Math.cos(start) * radius, ringY + Math.sin(start) * radius, ringX + Math.cos(end) * radius, ringY + Math.sin(end) * radius);
        }
        drawPdfText(pdf, value, columnXs[index] + 7, y + 5.2, column.width - 8, "left", false, 7.5);
        return;
      }
      if (index === columns.length - 1 && value !== "-") {
        pdf.setTextColor(value === "D" || value === "Failed" ? 185 : 5, value === "D" || value === "Failed" ? 28 : 120, value === "D" || value === "Failed" ? 28 : 84);
      }
      drawPdfText(pdf, value, x, y + 5.2, column.width - 3, column.align, index === 2 || index === columns.length - 1, 7.5);
      pdf.setTextColor(31, 41, 55);
    });
    pdf.setDrawColor(238, 240, 242);
    pdf.line(tableX, y + rowHeight, tableX + tableWidth, y + rowHeight);
    y += rowHeight;
  }
  if (rows.length === 0) {
    pdf.setTextColor(107, 114, 128);
    drawPdfText(pdf, "No students found", pageWidth / 2, y + 10, tableWidth, "center", false, 9);
  }
  for (let page = 1; page <= pdf.getNumberOfPages(); page += 1) {
    pdf.setPage(page);
    pdf.setTextColor(107, 114, 128);
    drawPdfText(pdf, `Page ${page} of ${pdf.getNumberOfPages()}`, pageWidth - tableX, pageHeight - 6, 30, "right", false, 7);
  }
  return pdf;
}

async function downloadPdfAsPng(pdf: Awaited<ReturnType<typeof createReportPdf>>, filename: string) {
  const pdfjs = await import("pdfjs-dist");
  const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
  const source = new Uint8Array(pdf.output("arraybuffer"));
  const documentTask = pdfjs.getDocument({ data: source });
  const pdfDocument = await documentTask.promise;

  try {
    const firstPage = await pdfDocument.getPage(1);
    const scale = Math.min(2, 16000 / (pdfDocument.numPages * firstPage.getViewport({ scale: 1 }).height));
    const pageViewport = firstPage.getViewport({ scale });
    const image = document.createElement("canvas");
    image.width = Math.ceil(pageViewport.width);
    image.height = Math.ceil(pageViewport.height) * pdfDocument.numPages;
    const imageContext = image.getContext("2d");
    if (!imageContext) throw new Error("Could not prepare the report PNG.");
    imageContext.fillStyle = "#ffffff";
    imageContext.fillRect(0, 0, image.width, image.height);

    for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) {
      const page = pageNumber === 1 ? firstPage : await pdfDocument.getPage(pageNumber);
      const viewport = page.getViewport({ scale });
      const pageCanvas = document.createElement("canvas");
      pageCanvas.width = Math.ceil(viewport.width);
      pageCanvas.height = Math.ceil(viewport.height);
      await page.render({ canvas: pageCanvas, viewport }).promise;
      imageContext.drawImage(pageCanvas, 0, (pageNumber - 1) * Math.ceil(pageViewport.height));
    }

    const blob = await new Promise<Blob | null>((resolve) => image.toBlob(resolve, "image/png"));
    if (!blob) throw new Error("Could not save the report PNG.");
    downloadBlob(blob, `${filename}.png`);
  } finally {
    await documentTask.destroy();
  }
}

function printTable(el: HTMLElement, title: string, head: string, simple = false) {
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(`<!DOCTYPE html><html><head>
    <title>${title}</title>
     <style>
      * { box-sizing: border-box; margin: 0; padding: 0 }
      body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; color: #111; background: #fff; padding: 30px 40px; }
      .header { text-align: center; margin-bottom: 20px; padding-bottom: 12px; border-bottom: 3px double #047857; }
      .header h1 { font-size: 18px; color: #047857; margin-bottom: 4px; letter-spacing: 1px; }
      .header .sub { font-size: 13px; color: #444; }
      .header .meta { font-size: 10px; color: #777; margin-top: 4px; }
      .stats { display: flex; justify-content: center; gap: 24px; margin-bottom: 16px; flex-wrap: wrap; }
      .stats div { text-align: center; padding: 6px 14px; background: #f0fdf4; border-radius: 6px; border: 1px solid #bbf7d0; }
      .stats .label { font-size: 9px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; }
      .stats .value { font-size: 16px; font-weight: 800; color: #047857; }
      table { width: 100%; max-width: 100%; border-collapse: collapse; margin-bottom: 16px; }
      thead { background: #047857; color: #fff; }
      th, td { border: 1px solid #d1d5db; padding: 5px 7px; text-align: center; vertical-align: middle; font-size: 10px; overflow-wrap: anywhere; }
      th { font-weight: 700; font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; }
      td:nth-child(2), td:nth-child(3) { text-align: left; }
      tr:nth-child(even) td { background: #f8fafc; }
      .rank-1 td { background: #fef9c3 !important; } .rank-2 td { background: #f1f5f9 !important; } .rank-3 td { background: #fef3c7 !important; }
      tfoot td { background: #f0fdf4 !important; font-weight: 700; border-top: 2px solid #047857; }
      .footer { text-align: center; font-size: 9px; color: #999; border-top: 1px solid #e5e7eb; padding-top: 10px; margin-top: 4px; }
      .footer span { color: #047857; font-weight: 700; }
      ${simple ? "thead { background: #f0fdf9; color: #4b5563; } th, td { border: 0; border-bottom: 1px solid #e5e7eb; } tr:nth-child(even) td { background: transparent; }" : ""}
      @page { size: A4 landscape; margin: 15mm; }
      @media print { body { padding: 0; } table { table-layout: fixed; } }
    </style></head><body>`);
  win.document.write(head);
  win.document.write(el.innerHTML);
  win.addEventListener("load", () => {
    win.focus();
    win.print();
  }, { once: true });
  win.document.close();
}

interface Props {
  report: ClassReport;
  madrasaName?: string;
  hideReportHeader?: boolean;
  teacherView?: boolean;
  teacherControlsContainer?: HTMLElement | null;
}

function getTeacherOutcome(row: ClassReportRow, subjects: SubjectMeta[]) {
  if (!subjects.length) return null;

  const totalScore = subjects.reduce((sum, subject) => sum + (row.marks[subject.id]?.score ?? 0), 0);
  const totalMaxMarks = subjects.reduce((sum, subject) => sum + (row.marks[subject.id]?.maxMarks ?? subject.maxMarks), 0);
  const failed = subjects.some((subject) => {
    const mark = row.marks[subject.id];
    const score = mark?.score ?? 0;
    const maxMarks = mark?.maxMarks ?? subject.maxMarks;
    return subject.passMarks != null
      ? score < subject.passMarks
      : calcGradeFromConfig(score, maxMarks, subject.gradeConfig) === "D";
  });
  return {
    totalScore,
    totalMaxMarks,
    percentage: totalMaxMarks > 0 ? totalScore / totalMaxMarks * 100 : 0,
    status: failed ? "Failed" : "Passed",
    grade: failed ? "D" : calcGradeFromConfig(totalScore, totalMaxMarks, subjects.length === 1 ? subjects[0].gradeConfig : null),
  };
}

function getTeacherRows(report: ClassReport) {
  const rows = report.students.map((row) => ({ row, outcome: getTeacherOutcome(row, report.subjects) }));
  const ranked = rows
    .filter((item) => item.outcome !== null)
    .sort((a, b) => (b.outcome?.percentage ?? 0) - (a.outcome?.percentage ?? 0));
  const ranks = new Map<string, number>();

  ranked.forEach((item, index) => {
    const previous = ranked[index - 1];
    const tied = previous && Math.abs((previous.outcome?.percentage ?? 0) - (item.outcome?.percentage ?? 0)) < 1e-9;
    ranks.set(item.row.student.id, tied ? ranks.get(previous.row.student.id)! : index + 1);
  });

  return rows.map((item) => ({ ...item, rank: ranks.get(item.row.student.id) ?? null }));
}

export function ClassResultTable({ report, madrasaName, hideReportHeader = false, teacherView = false, teacherControlsContainer }: Props) {
  const { exam, class: cls, subjects, config, students, stats } = report;
  const tableRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState<"pdf" | "png" | "print" | null>(null);

  const filename = `${madrasaName ? madrasaName + " - " : ""}${cls.name} - ${exam.name}`;
  const doExport = useCallback(async (type: "pdf" | "png" | "print") => {
    if (!tableRef.current) return;
    setExporting(type);
    try {
      if (type === "print") {
        printTable(tableRef.current, filename, document.head.innerHTML, teacherView);
      } else {
        const pdf = createReportPdf(report, teacherView, madrasaName ?? "");
        if (type === "pdf") pdf.save(`${filename}.pdf`);
        else await downloadPdfAsPng(pdf, filename);
      }
    } finally {
      setExporting(null);
    }
  }, [filename, teacherView, report, madrasaName]);

  const teacherControls = (
    <ButtonGroup aria-label="Report export controls" className="w-full sm:w-auto [&>button]:flex-1">
      {(["print", "pdf", "png"] as const).map((type) => (
        <Button key={type} type="button" variant="outline" size="sm" onClick={() => { void doExport(type); }} disabled={!!exporting}>
          {exporting === type
            ? <Loader2 className="size-4 animate-spin" />
            : type === "print" ? <Printer className="size-4" /> : <Download className="size-4" />
          }
          {type === "print" ? "Print" : type.toUpperCase()}
        </Button>
      ))}
    </ButtonGroup>
  );

  return (
    <div className="space-y-3">
      {!teacherView && (
        <div className="flex items-center justify-end gap-2 flex-wrap">
          {(["print", "pdf", "png"] as const).map((type) => (
            <button key={type} onClick={() => { void doExport(type); }} disabled={!!exporting}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              {exporting === type
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : type === "print" ? <Printer className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />
              }
              {type === "print" ? "Print" : type.toUpperCase()}
            </button>
          ))}
        </div>
      )}

      <div ref={tableRef} className={teacherView ? "space-y-3 bg-transparent" : "bg-white rounded-xl border border-gray-200 overflow-hidden"} style={{ fontFamily: "'Segoe UI', Arial, sans-serif" }}>
        {teacherView ? <TeacherReportTable report={report} /> : <>
        {!hideReportHeader && <div className="text-center px-6 pt-6 pb-4 border-b-4 border-primary-700">
          <div className="w-16 h-0.5 bg-primary-300 mx-auto mb-3" />
          {madrasaName && (
            <p className="text-primary-700 text-xs font-bold uppercase tracking-[0.2em] mb-1">{madrasaName}</p>
          )}
          <h1 className="text-lg font-extrabold text-gray-900 tracking-tight">{exam.name}</h1>
          <p className="text-sm text-gray-600 mt-1">
            {cls.name}{cls.classTeacher ? <> · Class Teacher: {cls.classTeacher.name}</> : ""}
          </p>
          {exam.publishedDate && (
            <p className="text-[10px] text-gray-400 mt-0.5">Published: {fmt(exam.publishedDate)}</p>
          )}
          <div className="w-12 h-0.5 bg-primary-300 mx-auto mt-3" />
        </div>}

        {/* Stats bar */}
        <div className="grid grid-cols-5 divide-x divide-gray-100 border-b border-gray-100 text-center bg-primary-50/30">
          {[
            { label: "Students", value: stats.totalStudents },
            { label: "Passed", value: stats.passedCount, color: "text-primary-700" },
            { label: "Failed", value: stats.failedCount, color: "text-red-600" },
            { label: "Ranked", value: stats.rankedCount, color: "text-primary-700" },
            { label: "Class Avg", value: `${stats.classAverage.toFixed(1)}%`, color: "text-teal-700" },
          ].map(({ label, value, color }) => (
            <div key={label} className="py-3 px-2">
              <div className={cn("text-lg font-extrabold", color ?? "text-gray-800")}>{value}</div>
              <div className="text-[9px] text-gray-500 uppercase tracking-wider mt-0.5">{label}</div>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-primary-700 text-white text-[10px] font-bold uppercase tracking-wide">
                <th className="px-3 py-2.5 text-center w-10">#</th>
                <th className="px-3 py-2.5 text-left">Reg No</th>
                <th className="px-3 py-2.5 text-left">Name</th>
                {subjects.map((s) => (
                  <th key={s.id} className="px-2 py-2.5 text-center min-w-24">
                    <div>{s.name}</div>
                    {!config.hideMarks && <div className="text-[9px] text-primary-200 font-normal normal-case">/{s.maxMarks}</div>}
                  </th>
                ))}
                <th className="px-2 py-2.5 text-center">Total</th>
                <th className="px-2 py-2.5 text-center">%</th>
                <th className="px-2 py-2.5 text-center">Rank</th>
                <th className="px-2 py-2.5 text-center">Status</th>
                <th className="px-2 py-2.5 text-center">Grade</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {students.map((row, idx) => (
                <StudentRow key={row.student.id} row={row} idx={idx} subjects={subjects} config={config} />
              ))}
              {students.length === 0 && (
                <tr>
                  <td colSpan={subjects.length + 8} className="py-12 text-center text-sm text-gray-400">
                    No results computed yet. Run "Compute Grades" first.
                  </td>
                </tr>
              )}
            </tbody>
            {students.length > 0 && !config.hideMarks && (
              <tfoot>
                <tr className="bg-primary-50 border-t-2 border-primary-600 text-xs font-bold text-primary-900">
                  <td colSpan={3} className="px-3 py-2.5">Class Average</td>
                  {subjects.map((s) => {
                    const vals = students
                      .map((r) => r.marks[s.id]?.score ?? null)
                      .filter((v): v is number => v !== null);
                    const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
                    return <td key={s.id} className="px-2 py-2.5 text-center">{avg !== null ? avg.toFixed(1) : "—"}</td>;
                  })}
                  <td className="px-2 py-2.5 text-center">
                    {stats.classAverage > 0
                      ? ((stats.classAverage / 100) * (students[0]?.summary.totalMaxMarks ?? 0)).toFixed(1)
                      : "—"}
                  </td>
                  <td className="px-2 py-2.5 text-center">{stats.classAverage.toFixed(1)}%</td>
                  <td colSpan={3} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {!hideReportHeader && <div className="text-center py-3 border-t border-gray-100 text-[9px] text-gray-400">
          Generated by <span className="font-semibold text-primary-600">Smart Madrasa</span> · {new Date().toLocaleString("en-IN")}
        </div>}
        </>}
      </div>
      {teacherView && (teacherControlsContainer ? createPortal(teacherControls, teacherControlsContainer) : teacherControls)}
    </div>
  );
}

function PercentageRing({ percentage }: { percentage: number }) {
  const value = Math.max(0, Math.min(100, percentage));
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" className="h-5 w-5 shrink-0" aria-hidden="true">
      <circle cx="10" cy="10" r="8" fill="none" stroke="#d1fae5" strokeWidth="3" />
      <circle cx="10" cy="10" r="8" fill="none" stroke="#059669" strokeWidth="3" pathLength="100" strokeDasharray={`${value} 100`} transform="rotate(-90 10 10)" />
    </svg>
  );
}

function TeacherReportTable({ report }: { report: ClassReport }) {
  const { students, subjects } = report;
  const rows = getTeacherRows(report);
  const completed = rows.filter((item) => item.outcome !== null);
  const passed = completed.filter((item) => item.outcome?.status === "Passed").length;
  const failed = completed.length - passed;
  const average = completed.length
    ? completed.reduce((sum, item) => sum + (item.outcome?.percentage ?? 0), 0) / completed.length
    : null;

  return (
    <>
      <div className="grid grid-cols-4 overflow-hidden rounded-lg">
        {[
          { label: "Students", value: students.length },
          { label: "Passed", value: passed },
          { label: "Failed", value: failed },
          { label: "Class avg", value: average === null ? "—" : `${average.toFixed(1)}%` },
        ].map((stat, index) => (
          <div key={stat.label} className={cn("relative min-w-0 bg-gradient-to-br from-primary to-primary-400 px-2 py-2.5 sm:px-3", index > 0 && "shadow-[-2px_0_5px_-3px_rgba(15,23,42,0.1)]")}>
            <span className="block truncate text-[11px] font-medium leading-tight text-white/80 sm:text-xs">{stat.label}</span>
            <span className="mt-1 block text-lg font-bold leading-none tabular-nums text-white sm:text-xl">{stat.value}</span>
          </div>
        ))}
      </div>
      <div className="overflow-x-auto rounded-2xl bg-white">
        <table className="w-full min-w-max border-collapse text-sm">
          <thead className="border-b border-gray-100 bg-gray-50/50 text-gray-600">
            <tr>
              <th scope="col" className="px-3 py-2 text-left font-medium">#</th>
              <th scope="col" className="px-3 py-2 text-left font-medium">Reg No</th>
              <th scope="col" className="px-3 py-2 text-left font-medium">Name</th>
              {subjects.map((subject) => (
                <th key={subject.id} scope="col" className="px-3 py-2 text-center font-medium">{subject.name}</th>
              ))}
              <th scope="col" className="px-3 py-2 text-center font-medium">Total</th>
              <th scope="col" className="px-3 py-2 text-center font-medium">%</th>
              <th scope="col" className="px-3 py-2 text-center font-medium">Rank</th>
              <th scope="col" className="px-3 py-2 text-center font-medium">Status</th>
              <th scope="col" className="px-3 py-2 text-center font-medium">Grade</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map(({ row, outcome, rank }, index) => (
              <tr key={row.student.id}>
                <td className="px-3 py-2 text-gray-500">{index + 1}</td>
                <td className="px-3 py-2 text-gray-600">{row.student.adno || "—"}</td>
                <td className="px-3 py-2 font-medium text-gray-900">{row.student.name}</td>
                {subjects.map((subject) => (
                  <td key={subject.id} className="px-3 py-2 text-center text-gray-700">
                    {row.marks[subject.id]?.score ?? 0}
                  </td>
                ))}
                <td className="px-3 py-2 text-center text-gray-700">
                  {outcome ? `${outcome.totalScore}/${outcome.totalMaxMarks}` : "—"}
                </td>
                <td className="px-3 py-2 text-center text-gray-700">
                  {outcome ? (
                    <span className="inline-flex items-center justify-center gap-1.5 tabular-nums">
                      <PercentageRing percentage={outcome.percentage} />
                      {outcome.percentage.toFixed(1)}%
                    </span>
                  ) : "—"}
                </td>
                <td className="px-3 py-2 text-center text-gray-700">{rank ?? "—"}</td>
                <td className="px-3 py-2 text-center text-gray-700">{outcome?.status ?? "—"}</td>
                <td className="px-3 py-2 text-center">
                  {outcome ? (
                    <span className={cn("inline-block min-w-8 rounded border px-1.5 py-0.5 text-xs font-semibold", GRADE_COLORS[outcome.grade] ?? "border-gray-200 bg-gray-50 text-gray-700")}>
                      {outcome.grade}
                    </span>
                  ) : "—"}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={subjects.length + 8} className="px-3 py-8 text-center text-gray-500">No students found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

function StudentRow({ row, idx, subjects, config }: {
  row: ClassReportRow;
  idx: number;
  subjects: SubjectMeta[];
  config: ClassReportConfig;
}) {
  const { summary, student, marks } = row;
  const status = summary.finalStatus;
  const grade = summary.totalGrade ? (TOTAL_GRADE_LABELS[summary.totalGrade] ?? summary.totalGrade) : null;
  const rankClass = summary.rank === 1 ? "bg-yellow-50/50" : summary.rank === 2 ? "bg-slate-50/60" : summary.rank === 3 ? "bg-amber-50/40" : "";

  return (
    <tr className={cn("hover:bg-gray-50 transition-colors", rankClass)}>
      <td className="px-3 py-2.5 text-center text-xs text-gray-500">{idx + 1}</td>
      <td className="px-3 py-2.5 text-xs font-mono text-gray-600">{student.adno}</td>
      <td className="px-3 py-2.5 font-medium text-gray-900">{student.name}</td>
      {subjects.map((s) => {
        const m = marks[s.id];
        return (
          <td key={s.id} className="px-2 py-2.5 text-center">
            {m ? (
              <div className="flex items-center justify-center gap-1.5">
                {!config.hideMarks && (
                  <span className={cn("text-sm font-semibold", m.isPassed === false ? "text-red-600" : "text-gray-800")}>
                    {m.score}
                  </span>
                )}
                {m.grade && (
                  <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded", GRADE_COLORS[m.grade] ?? "text-gray-600 bg-gray-100")}>
                    {m.grade}
                  </span>
                )}
              </div>
            ) : (
              <span className="text-gray-300">—</span>
            )}
          </td>
        );
      })}
      <td className="px-2 py-2.5 text-center">
        {!config.hideMarks && summary.totalScore !== null ? (
          <span className="font-semibold text-gray-800">
            {summary.totalScore.toFixed(0)}
            <span className="text-xs text-gray-400 font-normal">/{summary.totalMaxMarks?.toFixed(0)}</span>
          </span>
        ) : "—"}
      </td>
      <td className="px-2 py-2.5 text-center font-semibold">
        {summary.totalPercentage !== null ? `${summary.totalPercentage.toFixed(1)}%` : "—"}
      </td>
      <td className="px-2 py-2.5 text-center font-bold text-gray-700">
        {summary.rank ?? "—"}
      </td>
      <td className="px-2 py-2.5 text-center">
        {status ? (
          <span className={cn(
            "text-xs font-semibold px-2 py-0.5 rounded",
            status === "PASSED" || status === "PROMOTED"
              ? "bg-primary-100 text-primary-700"
              : "bg-red-100 text-red-700",
          )}>
            {status === "PASSED" ? config.passedLabel
              : status === "FAILED" ? config.failedLabel
              : status === "PROMOTED" ? config.promotedLabel
              : config.withheldLabel}
          </span>
        ) : "—"}
      </td>
      <td className="px-2 py-2.5 text-center text-xs text-gray-600 font-medium">
        {grade ?? "—"}
      </td>
    </tr>
  );
}
