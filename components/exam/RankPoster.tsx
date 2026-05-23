import { useRef, useState } from "react";
import { Download, Share2, Loader2, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ClassReportRow, ClassReport } from "@/lib/results-api";

const RANK_GRADIENTS: Record<number, { bg: string; badge: string; text: string; accent: string }> = {
  1: { bg: "from-yellow-400 via-amber-300 to-yellow-500", badge: "bg-yellow-600", text: "text-yellow-900", accent: "#92400e" },
  2: { bg: "from-slate-400 via-gray-300 to-slate-500",   badge: "bg-slate-600",  text: "text-slate-900",  accent: "#1e293b" },
  3: { bg: "from-amber-600 via-orange-400 to-amber-700", badge: "bg-amber-800",  text: "text-amber-900",  accent: "#7c2d12" },
};

const RANK_MEDALS = ["🥇", "🥈", "🥉"];
const RANK_LABELS = ["1st Place", "2nd Place", "3rd Place"];

interface Props {
  row: ClassReportRow;
  report: ClassReport;
  madrasaName: string;
  madrasaLogo?: string | null;
}

export function RankPoster({ row, report, madrasaName, madrasaLogo }: Props) {
  const { student, summary } = row;
  const rank = summary.rank ?? 0;
  const g    = RANK_GRADIENTS[rank] ?? RANK_GRADIENTS[3];

  const posterRef = useRef<HTMLDivElement>(null);
  const [photo, setPhoto]         = useState<string | null>(null);
  const [exporting, setExporting] = useState<"jpg" | "share" | null>(null);

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setPhoto(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const exportJPG = async () => {
    if (!posterRef.current) return;
    setExporting("jpg");
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(posterRef.current, {
        scale: 3, useCORS: true, backgroundColor: null, logging: false,
      });
      const link = document.createElement("a");
      link.download = `${rank === 1 ? "1st" : rank === 2 ? "2nd" : "3rd"}-${student.name.replace(/\s+/g, "-")}.jpg`;
      link.href = canvas.toDataURL("image/jpeg", 0.95);
      link.click();
    } finally {
      setExporting(null);
    }
  };

  const shareJPG = async () => {
    if (!posterRef.current) return;
    setExporting("share");
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(posterRef.current, {
        scale: 3, useCORS: true, backgroundColor: null, logging: false,
      });
      const blob = await new Promise<Blob | null>((res) =>
        canvas.toBlob(res, "image/jpeg", 0.95),
      );
      if (!blob) return;
      const file = new File([blob], `rank-${rank}-${student.name}.jpg`, { type: "image/jpeg" });
      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `🎉 Congratulations ${student.name}!`,
          text: `${student.name} secured ${RANK_LABELS[rank - 1]} in ${report.exam.name} · ${madrasaName}`,
        });
      } else {
        // Fallback: download
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url; link.download = `rank-${rank}-${student.name}.jpg`; link.click();
        URL.revokeObjectURL(url);
      }
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="space-y-3">
      {/* Controls */}
      <div className="flex items-center gap-2 flex-wrap">
        <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 cursor-pointer transition-colors">
          <Upload className="w-4 h-4" />
          {photo ? "Change Photo" : "Upload Photo"}
          <input type="file" accept="image/*" className="sr-only" onChange={handlePhoto} />
        </label>
        {photo && (
          <button onClick={() => setPhoto(null)} className="p-1.5 rounded-lg border border-gray-200 hover:bg-red-50 text-gray-400 hover:text-red-500">
            <X className="w-4 h-4" />
          </button>
        )}
        <button onClick={exportJPG} disabled={!!exporting}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 disabled:opacity-50">
          {exporting === "jpg" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          Download JPG
        </button>
        <button onClick={shareJPG} disabled={!!exporting}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50">
          {exporting === "share" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
          Share
        </button>
      </div>

      {/* Poster */}
      <div
        ref={posterRef}
        className={cn(
          "relative w-full max-w-sm mx-auto rounded-2xl overflow-hidden shadow-2xl",
          "bg-gradient-to-b", g.bg,
        )}
        style={{ fontFamily: "Arial, sans-serif" }}
      >
        {/* Decorative circles */}
        <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-white/10" />
        <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-white/10" />

        <div className="relative z-10 flex flex-col items-center px-8 py-8 gap-4">
          {/* Madrasa */}
          <div className="flex flex-col items-center gap-1">
            {madrasaLogo && (
              <img src={madrasaLogo} alt="logo" className="h-10 w-auto object-contain" crossOrigin="anonymous" />
            )}
            <p className={cn("text-xs font-semibold uppercase tracking-widest opacity-80", g.text)}>
              {madrasaName}
            </p>
          </div>

          {/* Rank medal */}
          <div className="flex flex-col items-center">
            <span className="text-6xl leading-none">{RANK_MEDALS[rank - 1]}</span>
            <span className={cn(
              "mt-2 px-4 py-1 rounded-full text-sm font-bold tracking-wider uppercase text-white shadow",
              g.badge,
            )}>
              {RANK_LABELS[rank - 1]}
            </span>
          </div>

          {/* Photo */}
          <div className="w-28 h-28 rounded-full border-4 border-white shadow-lg overflow-hidden bg-white/30 flex items-center justify-center">
            {photo ? (
              <img src={photo} alt={student.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-5xl">{student.gender === "FEMALE" ? "👩‍🎓" : "👨‍🎓"}</span>
            )}
          </div>

          {/* Name */}
          <div className="text-center">
            <p className={cn("text-xl font-extrabold leading-tight", g.text)}>{student.name}</p>
            <p className={cn("text-sm opacity-75 mt-0.5", g.text)}>{report.class.name} · Reg: {student.adno}</p>
          </div>

          {/* Exam + stats */}
          <div className="w-full bg-white/30 rounded-xl px-4 py-3 text-center backdrop-blur-sm">
            <p className={cn("text-xs font-semibold uppercase tracking-wide mb-2 opacity-70", g.text)}>
              {report.exam.name}
            </p>
            <div className="flex justify-around">
              {[
                { label: "Score", value: summary.totalPercentage != null ? `${summary.totalPercentage.toFixed(1)}%` : "—" },
                { label: "Rank",  value: `#${rank}` },
                { label: "Total", value: summary.totalScore != null ? `${summary.totalScore.toFixed(0)}/${summary.totalMaxMarks?.toFixed(0)}` : "—" },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className={cn("text-lg font-extrabold", g.text)}>{value}</p>
                  <p className={cn("text-xs opacity-60", g.text)}>{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Congrats */}
          <p className={cn("text-center text-sm font-semibold italic opacity-80", g.text)}>
            🎉 Congratulations on this achievement!
          </p>

          {/* Platform label */}
          <p className="text-xs text-white/60 font-medium mt-1">Powered by Al Madrasa Platform</p>
        </div>
      </div>
    </div>
  );
}
