import { useState } from "react";
import "@fontsource/bebas-neue/latin-400.css";
import "@fontsource/allura/latin-400.css";
import "./best-performance-poster.css";

export type PosterStudent = {
  name: string;
  photoUrl?: string | null;
  rank: number;
  scorePercentage: number;
};

type BestPerformancePosterProps = {
  student: PosterStudent;
  category: "total" | "ibadah";
  className: string;
  madrasaName: string;
  madrasaLogo?: string | null;
  dateRange: string;
};

export function BestPerformancePoster({ student, category, className, madrasaName, madrasaLogo, dateRange }: BestPerformancePosterProps) {
  const [photoFailed, setPhotoFailed] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);
  const initials = student.name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  const nameSize = student.name.length > 25 ? "small" : student.name.length > 17 ? "medium" : "large";
  const place = ["1st", "2nd", "3rd"][student.rank - 1] ?? `${student.rank}th`;
  const achievement = category === "total" ? "overall performance" : "ibadah performance";

  return (
    <article className="performance-poster" aria-label={`${student.name}, ${place} place ${achievement} poster`}>
      <div className="performance-poster__ribbon performance-poster__ribbon--left" />
      <div className="performance-poster__ribbon performance-poster__ribbon--right" />
      <header className="performance-poster__brand">
        {madrasaLogo && !logoFailed && <img src={madrasaLogo} alt="" onError={() => setLogoFailed(true)} />}
        <span>{madrasaName}</span>
      </header>

      <div className="performance-poster__portrait-back" />
      <div className="performance-poster__portrait">
        <span className="performance-poster__initials" aria-hidden="true">{initials || "★"}</span>
        {student.photoUrl && !photoFailed && <img src={student.photoUrl} alt="" onError={() => setPhotoFailed(true)} />}
      </div>
      <span className="performance-poster__sparkle performance-poster__sparkle--one">✦</span>
      <span className="performance-poster__sparkle performance-poster__sparkle--two">✦</span>

      <div className="performance-poster__message">
        <p className="performance-poster__eyebrow">CELEBRATING EXCELLENCE</p>
        <h2 className={`performance-poster__name performance-poster__name--${nameSize}`}>{student.name}</h2>
        <p className="performance-poster__body">For securing <strong>{place} place</strong> in<br /><strong>{achievement}</strong></p>
        <p className="performance-poster__details">{className} <span>•</span> {Number.isFinite(student.scorePercentage) ? Math.round(student.scorePercentage) : 0}% score</p>
      </div>

      <p className="performance-poster__congrats">Congratulations</p>
      <footer className="performance-poster__footer">
        <span className="performance-poster__footer-rule" />
        <strong>{madrasaName}</strong>
        <span>{dateRange}</span>
      </footer>
    </article>
  );
}
