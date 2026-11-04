import type { BestPerformer, OverallBestPerformer } from "@/lib/best-performance-api";

type ReportOptions = {
  category: "total" | "ibadah";
  className: string;
  from: string;
  to: string;
  overall: OverallBestPerformer[];
  ibadah: BestPerformer[];
};

const pageWidth = 1240;
const pageHeight = 1754;
const margin = 64;
const rowHeight = 62;
const firstPageRows = 17;
const continuationPageRows = 25;

export async function downloadBestPerformanceReport({ category, className, from, to, overall, ibadah }: ReportOptions) {
  const { jsPDF } = await import("jspdf");
  const isOverall = category === "total";
  const students = isOverall ? overall : ibadah;
  if (students.length === 0) return;

  const percentages = students.map((student) => isOverall
    ? (student as OverallBestPerformer).totalPercentage
    : (student as BestPerformer).scorePercentage);
  const average = Math.round(percentages.reduce((sum, value) => sum + (Number.isFinite(value) ? value : 0), 0) / students.length);
  const top = Math.round(Math.max(...percentages.filter(Number.isFinite)) || 0);
  const totalPages = students.length <= firstPageRows
    ? 1
    : 1 + Math.ceil((students.length - firstPageRows) / continuationPageRows);
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const labels = isOverall ? ["ATTENDANCE", "HOMEWORK", "EXAMS", "IBADAH"] : ["PRAYERS", "QURAN PAGES", "STREAK", "CONSISTENCY"];
  const metricX = [530, 664, 798, 932];
  const lastColumnX = 1166;
  const themePrimary = getComputedStyle(document.documentElement).getPropertyValue("--primary").trim();
  const fit = (ctx: CanvasRenderingContext2D, value: string, maxWidth: number) => {
    if (ctx.measureText(value).width <= maxWidth) return value;
    let text = value;
    while (text && ctx.measureText(`${text}…`).width > maxWidth) text = text.slice(0, -1);
    return `${text}…`;
  };

  for (let page = 0; page < totalPages; page++) {
    const canvas = document.createElement("canvas");
    canvas.width = pageWidth;
    canvas.height = pageHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Unable to create report canvas");
    ctx.fillStyle = "#51ab10"; // Fallback for browsers without OKLCH canvas support.
    if (themePrimary) ctx.fillStyle = themePrimary;
    const primary = ctx.fillStyle;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, pageWidth, pageHeight);
    if (page === 0) {
      ctx.fillStyle = primary;
      ctx.fillRect(0, 0, pageWidth, 242);
      ctx.fillStyle = "#ffffff";
      ctx.font = "700 47px Arial, sans-serif";
      ctx.fillText(isOverall ? "Overall performance" : "Ibadah performance", margin, 91);
      ctx.fillStyle = "#f2fbe9";
      ctx.font = "28px Arial, sans-serif";
      ctx.fillText(fit(ctx, className, pageWidth - margin * 2), margin, 143);
      ctx.font = "23px Arial, sans-serif";
      ctx.fillText(`${from}  –  ${to}`, margin, 190);

      const cards = [
        { label: "RANKED STUDENTS", value: String(students.length) },
        { label: "CLASS AVERAGE", value: `${average}%` },
        { label: "TOP RESULT", value: `${top}%` },
      ];
      cards.forEach((card, index) => {
        const x = margin + index * 378;
        ctx.fillStyle = "#f3faef";
        ctx.beginPath(); ctx.roundRect(x, 278, 354, 134, 18); ctx.fill();
        ctx.fillStyle = primary;
        ctx.fillRect(x, 278, 7, 134);
        ctx.fillStyle = "#62616d";
        ctx.font = "700 20px Arial, sans-serif";
        ctx.fillText(card.label, x + 27, 324);
        ctx.fillStyle = "#25242a";
        ctx.font = "700 46px Arial, sans-serif";
        ctx.fillText(card.value, x + 27, 384);
      });

      ctx.fillStyle = "#25242a";
      ctx.font = "700 30px Arial, sans-serif";
      ctx.fillText("Student rankings", margin, 479);
      ctx.fillStyle = "#686771";
      ctx.font = "21px Arial, sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(`Page 1 of ${totalPages}`, pageWidth - margin, 479);
      ctx.textAlign = "left";

      ctx.fillStyle = "#eaf5e2";
      ctx.beginPath(); ctx.roundRect(margin, 507, pageWidth - margin * 2, 51, 10); ctx.fill();
      ctx.fillStyle = "#5a5864";
      ctx.font = "700 18px Arial, sans-serif";
      ctx.fillText("#", margin + 18, 540);
      ctx.fillText("STUDENT / ADM. NO.", margin + 80, 540);
      labels.forEach((label, index) => ctx.fillText(label, metricX[index], 540));
      ctx.textAlign = "right";
      ctx.fillText("SCORE", lastColumnX, 540);
      ctx.textAlign = "left";
    }

    const startIndex = page === 0 ? 0 : firstPageRows + (page - 1) * continuationPageRows;
    const rowsOnPage = page === 0 ? firstPageRows : continuationPageRows;
    const firstRowY = page === 0 ? 565 : 90;
    students.slice(startIndex, startIndex + rowsOnPage).forEach((student, index) => {
      const y = firstRowY + index * rowHeight;
      const rank = isOverall ? (student as OverallBestPerformer).rank : startIndex + index + 1;
      const topThree = rank >= 1 && rank <= 3;
      if (topThree || (startIndex + index) % 2 === 0) {
        ctx.fillStyle = topThree ? ["#e7f4dc", "#edf7e6", "#f3faee"][rank - 1] : "#f9fcf7";
        ctx.fillRect(margin, y, pageWidth - margin * 2, rowHeight);
      }
      if (topThree) {
        ctx.fillStyle = primary;
        ctx.fillRect(margin, y, 7, rowHeight);
        ctx.beginPath(); ctx.roundRect(margin + 14, y + 11, 42, 40, 9); ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.font = "700 24px Arial, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(String(rank), margin + 35, y + 38);
        ctx.textAlign = "left";
      } else {
        ctx.fillStyle = primary;
        ctx.font = "700 24px Arial, sans-serif";
        ctx.fillText(String(rank).padStart(2, "0"), margin + 16, y + 37);
      }
      ctx.fillStyle = "#25242a";
      ctx.font = '600 23px "Noto Sans Malayalam", Arial, sans-serif';
      ctx.fillText(fit(ctx, student.name, 370), margin + 80, y + 27);
      ctx.fillStyle = "#777580";
      ctx.font = "19px Arial, sans-serif";
      ctx.fillText(fit(ctx, student.adno || "—", 350), margin + 80, y + 51);

      const metrics = isOverall ? [
        `${(student as OverallBestPerformer).attendance.score}/${(student as OverallBestPerformer).attendance.maxScore}`,
        `${(student as OverallBestPerformer).homework.score}/${(student as OverallBestPerformer).homework.maxScore}`,
        `${(student as OverallBestPerformer).exam.score}/${(student as OverallBestPerformer).exam.maxScore}`,
        `${(student as OverallBestPerformer).ibadah.score}/${(student as OverallBestPerformer).ibadah.maxScore}`,
      ] : [
        String((student as BestPerformer).totalPrayers),
        String((student as BestPerformer).totalQuranPages),
        `${(student as BestPerformer).streak}d`,
        `${(student as BestPerformer).consistency}%`,
      ];
      ctx.fillStyle = "#514f5b";
      ctx.font = "22px Arial, sans-serif";
      metrics.forEach((value, metricIndex) => ctx.fillText(fit(ctx, value, 125), metricX[metricIndex], y + 38));
      ctx.fillStyle = "#25242a";
      ctx.font = "700 23px Arial, sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(isOverall
        ? `${(student as OverallBestPerformer).totalScore}/${(student as OverallBestPerformer).attendance.maxScore + (student as OverallBestPerformer).homework.maxScore + (student as OverallBestPerformer).exam.maxScore + (student as OverallBestPerformer).ibadah.maxScore}`
        : String((student as BestPerformer).score), lastColumnX, y + 27);
      ctx.fillStyle = "#777580";
      ctx.font = "18px Arial, sans-serif";
      ctx.fillText(`${Math.round(isOverall ? (student as OverallBestPerformer).totalPercentage : (student as BestPerformer).scorePercentage)}%`, lastColumnX, y + 51);
      ctx.textAlign = "left";
    });

    ctx.fillStyle = "#aaa8b1";
    ctx.fillRect(margin, pageHeight - 78, pageWidth - margin * 2, 1);
    ctx.fillStyle = "#777580";
    ctx.font = "20px Arial, sans-serif";
    ctx.fillText("Smart Madrasa  •  Best performance report", margin, pageHeight - 40);
    ctx.textAlign = "right";
    ctx.fillText(page === 0 ? new Date().toLocaleDateString("en-GB") : `Page ${page + 1} of ${totalPages}`, pageWidth - margin, pageHeight - 40);
    ctx.textAlign = "left";

    if (page > 0) pdf.addPage();
    pdf.addImage(canvas.toDataURL("image/jpeg", 0.88), "JPEG", 0, 0, 210, 297);
  }

  const safeClass = className.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "class";
  pdf.save(`best-performance-${category}-${safeClass}-${from}-to-${to}.pdf`);
}
