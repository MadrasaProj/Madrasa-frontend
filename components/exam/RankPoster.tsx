import { useRef, useState, useEffect } from "react";
import { Download, Share2, Loader2, Upload, X, Crown, Trophy, Medal } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ClassReportRow, ClassReport } from "@/lib/results-api";
import { downloadTransparentJPG, shareTransparentJPG } from "@/lib/poster-utils";

// ── Constants ─────────────────────────────────────────────────────────────────

const RANK_CONFIG: Record<number, {
  bg: string; ring: string; badge: string; text: string; statBg: string; Icon: React.ComponentType<{ className?: string }>;
}> = {
  1: {
    bg:     "from-yellow-300 via-amber-400 to-yellow-500",
    ring:   "ring-yellow-200",
    badge:  "bg-yellow-700",
    text:   "text-yellow-950",
    statBg: "bg-yellow-600/30",
    Icon:   Crown,
  },
  2: {
    bg:     "from-slate-300 via-gray-200 to-slate-400",
    ring:   "ring-slate-300",
    badge:  "bg-slate-600",
    text:   "text-slate-900",
    statBg: "bg-slate-500/25",
    Icon:   Trophy,
  },
  3: {
    bg:     "from-amber-500 via-orange-400 to-amber-600",
    ring:   "ring-amber-300",
    badge:  "bg-amber-800",
    text:   "text-amber-950",
    statBg: "bg-amber-700/30",
    Icon:   Medal,
  },
};

const RANK_LABELS: Record<number, string> = { 1: "1st Place", 2: "2nd Place", 3: "3rd Place" };
const RANK_MEDALS = ["🥇", "🥈", "🥉"];

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  row: ClassReportRow;
  report: ClassReport;
  madrasaName: string;
  madrasaLogo?: string | null;
  studentPhotoMap?: Record<string, string | null>;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function RankPoster({ row, report, madrasaName, madrasaLogo, studentPhotoMap }: Props) {
  const { student, summary } = row;
  const rank = summary.rank ?? 0;
  const cfg  = RANK_CONFIG[rank] ?? RANK_CONFIG[3];
  const { Icon } = cfg;

  const posterRef                  = useRef<HTMLDivElement>(null);
  const [photo, setPhoto]          = useState<string | null>(() => studentPhotoMap?.[student.id] ?? null);
  const [exporting, setExporting]  = useState<"jpg" | "share" | null>(null);

  useEffect(() => {
    if (!photo && studentPhotoMap?.[student.id]) {
      setPhoto(studentPhotoMap[student.id]);
    }
  }, [student.id, studentPhotoMap]);

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setPhoto(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const stem = `rank-${rank}-${student.name}`.replace(/\s+/g, "-");

  const run = async (type: "jpg" | "share") => {
    if (!posterRef.current) return;
    setExporting(type);
    try {
      if (type === "jpg") {
        await downloadTransparentJPG(posterRef.current, stem);
      } else {
        await shareTransparentJPG(
          posterRef.current, `${stem}.jpg`,
          `Congratulations ${student.name}!`,
          `${student.name} secured ${RANK_LABELS[rank]} in ${report.exam.name} · ${madrasaName}`,
        );
      }
    } catch (err) {
      console.error("Rank poster export failed", err);
    } finally {
      setExporting(null);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-3">

      {/* ── Toolbar ── */}
      <div className="flex items-center gap-2 flex-wrap">
        <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 cursor-pointer transition-colors">
          <Upload className="w-4 h-4" />
          {photo ? "Change Photo" : "Upload Photo"}
          <input type="file" accept="image/*" className="sr-only" onChange={handlePhoto} />
        </label>
        {photo && (
          <button onClick={() => setPhoto(null)}
            className="p-1.5 rounded-lg border border-gray-200 hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
            <X className="w-4 h-4" />
          </button>
        )}
        <button onClick={() => run("jpg")} disabled={!!exporting}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 disabled:opacity-50 transition-colors">
          {exporting === "jpg" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          Download JPG
        </button>
        <button onClick={() => run("share")} disabled={!!exporting}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 transition-colors">
          {exporting === "share" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
          Share
        </button>
      </div>

      {/* ── Poster ── */}
      <div
        ref={posterRef}
        className={cn(
          "relative w-full max-w-xs mx-auto rounded-3xl overflow-hidden shadow-2xl",
          "bg-gradient-to-b", cfg.bg,
        )}
        style={{ fontFamily: "Arial, Helvetica, sans-serif" }}
      >
        {/* Decorative circles */}
        <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-white/10 pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-36 h-36 rounded-full bg-white/10 pointer-events-none" />
        <div className="absolute top-1/2 -right-8 w-24 h-24 rounded-full bg-white/5 pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center px-7 py-8 gap-5">

          {/* Madrasa branding */}
          <div className="flex flex-col items-center gap-1">
            {madrasaLogo ? (
              <img src={madrasaLogo} alt="" className="h-10 w-auto object-contain"
                crossOrigin="anonymous"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
            ) : (
              <div className="w-10 h-10 bg-white/25 rounded-full flex items-center justify-center font-black text-lg text-white">
                {madrasaName.charAt(0)}
              </div>
            )}
            <p className={cn("text-[10px] font-bold uppercase tracking-[0.18em] opacity-75", cfg.text)}>
              {madrasaName}
            </p>
          </div>

          {/* Icon + medal */}
          <div className="flex flex-col items-center gap-1.5">
            <div className="w-16 h-16 bg-white/25 rounded-full flex items-center justify-center shadow-inner">
              <Icon className={cn("w-9 h-9", cfg.text)} />
            </div>
            <span className="text-4xl leading-none mt-1">{RANK_MEDALS[rank - 1]}</span>
            <span className={cn("px-5 py-1 rounded-full text-sm font-extrabold tracking-wider uppercase text-white shadow-md", cfg.badge)}>
              {RANK_LABELS[rank]}
            </span>
          </div>

          {/* Photo */}
          <div className={cn(
            "w-28 h-28 rounded-full overflow-hidden bg-white/30 border-4 border-white shadow-xl flex items-center justify-center ring-4",
            cfg.ring,
          )}>
            {photo ? (
              <img src={photo} alt={student.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-5xl">{student.gender === "FEMALE" ? "👩" : "👨"}</span>
            )}
          </div>

          {/* Name + class */}
          <div className="text-center">
            <p className={cn("text-xl font-extrabold leading-tight", cfg.text)}>{student.name}</p>
            <p className={cn("text-xs opacity-70 mt-1", cfg.text)}>
              {report.class.name} &nbsp;·&nbsp; Reg: {student.adno}
            </p>
          </div>

          {/* Exam + stats */}
          <div className={cn("w-full rounded-2xl px-4 py-3 text-center backdrop-blur-sm", cfg.statBg)}>
            <p className={cn("text-[10px] font-bold uppercase tracking-widest mb-3 opacity-65", cfg.text)}>
              {report.exam.name}
            </p>
            <div className="flex justify-around">
              {[
                { label: "Score", value: summary.totalPercentage != null ? `${summary.totalPercentage.toFixed(1)}%` : "—" },
                { label: "Rank",  value: `#${rank}` },
                { label: "Total", value: summary.totalScore != null
                    ? `${summary.totalScore.toFixed(0)}/${summary.totalMaxMarks?.toFixed(0)}`
                    : "—" },
              ].map(({ label, value }) => (
                <div key={label} className="flex flex-col items-center">
                  <p className={cn("text-lg font-extrabold leading-tight", cfg.text)}>{value}</p>
                  <p className={cn("text-[10px] opacity-55 mt-0.5 uppercase tracking-wide", cfg.text)}>{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Congrats */}
          <p className={cn("text-center text-sm font-bold italic opacity-80", cfg.text)}>
            Congratulations on this achievement!
          </p>

          {/* Footer watermark */}
          <p className={cn("text-[9px] opacity-40 font-semibold uppercase tracking-widest", cfg.text)}>
            Smart Madrasa · {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </div>
  );
}
