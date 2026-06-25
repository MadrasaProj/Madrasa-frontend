import { useRef, useState } from "react";
import { Download, Share2, Loader2, Megaphone, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { downloadAsJPG, shareAsJPG } from "@/lib/poster-utils";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ExamMeta {
  id: string;
  name: string;
  publishedDate?: string | null;
  endDate?: string | null;
}

interface Stats {
  totalStudents?: number;
  passCount?: number;
  className?: string;
}

interface Props {
  exam: ExamMeta;
  madrasaName: string;
  madrasaLogo?: string | null;
  stats?: Stats;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(d?: string | null) {
  if (!d) return new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ResultAnnouncementPoster({ exam, madrasaName, madrasaLogo, stats }: Props) {
  const posterRef                  = useRef<HTMLDivElement>(null);
  const [exporting, setExporting]  = useState<"jpg" | "share" | null>(null);

  const stem = `result-announcement-${exam.name}`.replace(/\s+/g, "-");
  const publishDate = fmtDate(exam.publishedDate ?? exam.endDate);
  const passRate = stats?.totalStudents && stats.passCount != null
    ? Math.round((stats.passCount / stats.totalStudents) * 100)
    : null;

  const run = async (type: "jpg" | "share") => {
    if (!posterRef.current) return;
    setExporting(type);
    try {
      if (type === "jpg") {
        await downloadAsJPG(posterRef.current, stem);
      } else {
        await shareAsJPG(
          posterRef.current, `${stem}.jpg`,
          `Results Published — ${exam.name}`,
          `${exam.name} results are now available · ${madrasaName}`,
        );
      }
    } catch (err) {
      console.error("Announcement poster export failed", err);
    } finally {
      setExporting(null);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-3">

      {/* ── Toolbar ── */}
      <div className="flex items-center gap-2 flex-wrap">
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
        className="w-full max-w-sm mx-auto rounded-3xl overflow-hidden shadow-2xl select-none"
        style={{ fontFamily: "Arial, Helvetica, sans-serif", background: "#0f172a" }}
      >
        {/* Top gradient band */}
        <div className="relative bg-gradient-to-br from-emerald-600 via-teal-500 to-cyan-600 px-7 pt-8 pb-10 overflow-hidden text-center">
          {/* Decorative circles */}
          <div className="absolute -top-12 -right-12 w-44 h-44 rounded-full bg-white/10 pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-36 h-36 rounded-full bg-white/10 pointer-events-none" />
          <div className="absolute top-6 left-6 w-10 h-10 rounded-full bg-white/10 pointer-events-none" />

          <div className="relative z-10 space-y-2">
            {/* Madrasa logo + name */}
            {madrasaLogo ? (
              <img src={madrasaLogo} alt="" className="h-12 w-auto mx-auto object-contain"
                crossOrigin="anonymous"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
            ) : (
              <div className="w-12 h-12 bg-white/20 rounded-full mx-auto flex items-center justify-center text-2xl font-black text-white">
                {madrasaName.charAt(0)}
              </div>
            )}
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/80">{madrasaName}</p>

            {/* Megaphone icon */}
            <div className="pt-2 pb-1 flex justify-center">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                <Megaphone className="w-9 h-9 text-white" />
              </div>
            </div>

            <p className="text-[11px] font-bold uppercase tracking-widest text-white/70">Results Are Out!</p>
            <p className="text-2xl font-extrabold text-white leading-tight">{exam.name}</p>
            {stats?.className && (
              <p className="text-xs text-white/60 font-medium">{stats.className}</p>
            )}
          </div>
        </div>

        {/* Dark body */}
        <div className="px-7 py-6 space-y-5" style={{ background: "#0f172a" }}>

          {/* Date pill */}
          <div className="flex justify-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/15">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="text-white/80 text-xs font-semibold">{publishDate}</span>
            </div>
          </div>

          {/* Stats row */}
          {(stats?.totalStudents != null || passRate != null) && (
            <div className="grid grid-cols-2 gap-3">
              {stats?.totalStudents != null && (
                <div className="bg-white/8 rounded-2xl px-4 py-4 text-center border border-white/10">
                  <p className="text-2xl font-black text-white">{stats.totalStudents}</p>
                  <p className="text-[10px] text-white/50 uppercase tracking-wide mt-1 font-semibold">Students</p>
                </div>
              )}
              {passRate != null && (
                <div className="bg-white/8 rounded-2xl px-4 py-4 text-center border border-white/10">
                  <p className={cn("text-2xl font-black", passRate >= 80 ? "text-emerald-400" : passRate >= 60 ? "text-amber-400" : "text-red-400")}>
                    {passRate}%
                  </p>
                  <p className="text-[10px] text-white/50 uppercase tracking-wide mt-1 font-semibold">Pass Rate</p>
                </div>
              )}
            </div>
          )}

          {/* CTA message */}
          <div className="bg-gradient-to-r from-emerald-900/50 to-teal-900/50 rounded-2xl px-5 py-4 text-center border border-emerald-700/30">
            <div className="flex justify-center gap-1 mb-2">
              {[...Array(3)].map((_, i) => (
                <Star key={i} className="w-4 h-4 text-emerald-400 fill-emerald-400" />
              ))}
            </div>
            <p className="text-white text-sm font-semibold leading-snug">
              Check your result now!
            </p>
            <p className="text-white/50 text-xs mt-1 font-medium">
              Results available on the student portal
            </p>
          </div>

          {/* Footer watermark */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-[9px] text-white/25 uppercase tracking-widest font-semibold">Smart Madrasa</span>
            <span className="text-[9px] text-white/25">{new Date().getFullYear()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
