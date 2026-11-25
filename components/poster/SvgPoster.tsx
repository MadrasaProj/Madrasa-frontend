import { useEffect, useRef, type ReactNode } from 'react';
import { PosterExportButton } from './PosterExportButton';
import resultAnnounceSvg from './_posterSvgs/resultannounce.svg?raw';
import rankPosterSvg from './_posterSvgs/rankposter.svg?raw';
import rankIndividualSvg from './_posterSvgs/rankPosterIndividual.svg?raw';
import ibadaPerformanceSvg from './_posterSvgs/ibadaPerformance Poster.svg?raw';

// Make the source SVGs responsive and namespace defs ids so multiple inlined
// templates on the same page don't reference each other's clip paths/gradients.
const inlineSvgMarkup = (markup: string, prefix: string) =>
  markup
    .replace('<svg ', '<svg style="display:block;width:100%;height:auto" ')
    .replace(
      /(clip-path-|linear-gradient-)(\d)/g,
      (_match, name: string, index: string) => `${prefix}-${name}${index}`,
    );
const resultAnnounceMarkup = inlineSvgMarkup(resultAnnounceSvg, 'announce');
const rankPosterMarkup = inlineSvgMarkup(rankPosterSvg, 'group');
const rankIndividualMarkup = inlineSvgMarkup(rankIndividualSvg, 'individual');
const ibadaPerformanceMarkup = inlineSvgMarkup(ibadaPerformanceSvg, 'ibada');

const IBADA_SAMPLE_PHOTO_ID = 'Gemini_Generated_Image_f5hcyqf5hcyqf5hc-removebg-preview.png';

type SvgAttrMap = {
  id: string;
  attr: string;
  value: string;
};

type SvgPosterProps = {
  svg: ReactNode;
  maps?: SvgAttrMap | SvgAttrMap[];
  defaultMaps?: SvgAttrMap[];
};

/** Renders an inline SVG and applies id-based attribute/text updates to it. */
export function SvgPoster({ svg, maps, defaultMaps = [] }: SvgPosterProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    const appliedUpdates = new Map<string, { attr: string; value: string }>();

    for (const item of defaultMaps) {
      appliedUpdates.set(`${item.id}:${item.attr}`, {
        attr: item.attr,
        value: item.value,
      });
    }

    const activeMaps = Array.isArray(maps) ? maps : maps ? [maps] : [];
    for (const item of activeMaps) {
      appliedUpdates.set(`${item.id}:${item.attr}`, {
        attr: item.attr,
        value: item.value,
      });
    }

    for (const [key, { attr, value }] of appliedUpdates.entries()) {
      const id = key.slice(0, key.indexOf(':'));
      const target = root.querySelector<SVGElement>(`#${CSS.escape(id)}`);
      if (!target) continue;
      if (attr === 'textContent' || attr === 'text') {
        target.textContent = value;
      } else if (attr === 'xlink:href') {
        target.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', value);
      } else {
        target.setAttribute(attr, value);
      }
    }
  }, [svg, maps, defaultMaps]);

  return <div ref={containerRef}>{svg}</div>;
}

// ── Result announcement poster (SVG template) ────────────────────────────────

export interface ResultAnnouncementSvgPosterProps {
  examName: string;
  madrasaName: string;
  /** Whole-number percentage shown on the poster. */
  passRate?: number | null;
  /** Date shown in the "results available on" badge (DD.MM.YYYY). Defaults to today. */
  publishedDate?: string | null;
  className?: string;
}

function formatPosterDate(value?: string | null): string {
  const parsed = value ? new Date(value) : new Date();
  const date = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  return `${dd}.${mm}.${date.getFullYear()}`;
}

/** The pre-designed result-announcement SVG, filled in with live report data. */
export function ResultAnnouncementSvgPoster({
  examName,
  madrasaName,
  passRate,
  publishedDate,
  className,
}: ResultAnnouncementSvgPosterProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  const maps: SvgAttrMap[] = [
    { id: 'poster-exam-name', attr: 'textContent', value: examName },
    { id: 'poster-madrasa-name', attr: 'textContent', value: madrasaName },
    { id: 'poster-pass-rate', attr: 'textContent', value: `${Math.round(passRate ?? 0)}% Pass Rate` },
    { id: 'poster-result-date', attr: 'textContent', value: `at ${formatPosterDate(publishedDate)}` },
  ];

  return (
    <div className={className ?? 'space-y-3'}>
      <div className="flex items-center gap-2 flex-wrap">
        <PosterExportButton
          getElement={() => rootRef.current}
          stem={`result-announcement-${examName}`.replace(/\s+/g, '-')}
        />
      </div>
      <div ref={rootRef} className="mx-auto w-full max-w-[500px] overflow-hidden">
        <SvgPoster
          svg={<div dangerouslySetInnerHTML={{ __html: resultAnnounceMarkup }} />}
          maps={maps}
        />
      </div>
    </div>
  );
}

// ── Rank poster (SVG template) ───────────────────────────────────────────────

export interface RankTopper {
  rank: number;
  name: string;
  percentage?: number | null;
  /** When present, replaces the template's placeholder avatar. */
  avatarUrl?: string | null;
}

export interface RankSvgPosterProps {
  examName: string;
  madrasaName: string;
  /** Class name shown in the dark pill under "TOPPERS". */
  classNameLabel: string;
  /** Up to three rank holders in podium order. `rank` is the real rank, so ties keep their number. */
  toppers: RankTopper[];
  className?: string;
}

interface RankableRow {
  summary: { rank?: number | null; totalPercentage?: number | null };
}

/** First three ranked rows by rank, then percentage — ties (e.g. two firsts) are kept. */
export function getTopRankers<T extends RankableRow>(rows: T[], limit = 3): T[] {
  return rows
    .filter((row) => row.summary.rank != null && row.summary.rank > 0)
    .slice()
    .sort((a, b) =>
      (a.summary.rank! - b.summary.rank!) ||
      ((b.summary.totalPercentage ?? 0) - (a.summary.totalPercentage ?? 0)),
    )
    .slice(0, limit);
}

const PODIUM_SLOTS = [1, 2, 3] as const;

/** Medal / position-badge colours keyed by the real rank (gold, silver, bronze). */
const MEDAL_THEME: Record<number, {
  medalFill: string;
  medalStroke: string;
  ring: string;
  ribbonLeft: string;
  ribbonRight: string;
  badgeFill: string;
}> = {
  1: { medalFill: 'url(#medal-gold)', medalStroke: '#fff3b0', ring: '#fffbeb', ribbonLeft: '#b4690e', ribbonRight: '#d98a16', badgeFill: '#78350f' },
  2: { medalFill: 'url(#medal-silver)', medalStroke: '#f9fafb', ring: '#ffffff', ribbonLeft: '#4b5563', ribbonRight: '#6b7280', badgeFill: '#1f2937' },
  3: { medalFill: 'url(#medal-bronze)', medalStroke: '#ffedd5', ring: '#fff7ed', ribbonLeft: '#7c2d12', ribbonRight: '#9a3412', badgeFill: '#431407' },
};

const medalMaps = (idPrefix: string, rank: number): SvgAttrMap[] => {
  const theme = MEDAL_THEME[rank] ?? MEDAL_THEME[3];
  return [
    { id: `${idPrefix}-medal`, attr: 'fill', value: theme.medalFill },
    { id: `${idPrefix}-medal`, attr: 'stroke', value: theme.medalStroke },
    { id: `${idPrefix}-ring`, attr: 'stroke', value: theme.ring },
    { id: `${idPrefix}-ribbon-left`, attr: 'fill', value: theme.ribbonLeft },
    { id: `${idPrefix}-ribbon-right`, attr: 'fill', value: theme.ribbonRight },
    { id: `${idPrefix}-badge`, attr: 'fill', value: theme.badgeFill },
  ];
};

/** The pre-designed topper-rank SVG, filled in with live report data. */
export function RankSvgPoster({
  examName,
  madrasaName,
  classNameLabel,
  toppers,
  className,
}: RankSvgPosterProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  // Reset every podium slot first so stale data/photos never linger between updates.
  const defaultMaps: SvgAttrMap[] = PODIUM_SLOTS.flatMap((slot) => [
    { id: `topper-${slot}`, attr: 'display', value: 'none' },
    { id: `rank-poster-${slot}-badge`, attr: 'textContent', value: String(slot) },
    { id: `rank-poster-${slot}-name`, attr: 'textContent', value: '' },
    { id: `rank-poster-${slot}-percent`, attr: 'textContent', value: '—' },
    { id: `rank-poster-${slot}-avatar`, attr: 'display', value: 'none' },
    { id: `rank-poster-${slot}-avatar`, attr: 'href', value: '' },
    { id: `rank-poster-${slot}-avatar`, attr: 'xlink:href', value: '' },
    ...medalMaps(`rank-poster-${slot}`, slot),
  ]);

  const maps: SvgAttrMap[] = [
    { id: 'rank-poster-madrasa-name', attr: 'textContent', value: madrasaName },
    { id: 'rank-poster-exam-name', attr: 'textContent', value: examName },
    { id: 'rank-poster-class-name', attr: 'textContent', value: classNameLabel },
  ];

  toppers.slice(0, 3).forEach((topper, index) => {
    const slot = PODIUM_SLOTS[index];
    maps.push(
      { id: `topper-${slot}`, attr: 'display', value: 'inline' },
      { id: `rank-poster-${slot}-badge`, attr: 'textContent', value: String(topper.rank) },
      { id: `rank-poster-${slot}-name`, attr: 'textContent', value: topper.name },
      {
        id: `rank-poster-${slot}-percent`,
        attr: 'textContent',
        value: topper.percentage != null ? `${topper.percentage.toFixed(2)}%` : '—',
      },
      ...medalMaps(`rank-poster-${slot}`, topper.rank),
    );

    if (topper.avatarUrl) {
      maps.push(
        { id: `rank-poster-${slot}-avatar`, attr: 'href', value: topper.avatarUrl },
        { id: `rank-poster-${slot}-avatar`, attr: 'xlink:href', value: topper.avatarUrl },
        { id: `rank-poster-${slot}-avatar`, attr: 'display', value: 'inline' },
      );
    }
  });

  return (
    <div className={className ?? 'space-y-3'}>
      <div className="flex items-center gap-2 flex-wrap">
        <PosterExportButton
          getElement={() => rootRef.current}
          stem={`rank-poster-${examName}`.replace(/\s+/g, '-')}
        />
      </div>
      <div ref={rootRef} className="mx-auto w-full max-w-[500px] overflow-hidden">
        <SvgPoster
          svg={<div dangerouslySetInnerHTML={{ __html: rankPosterMarkup }} />}
          maps={maps}
          defaultMaps={defaultMaps}
        />
      </div>
    </div>
  );
}

// ── Best-performance poster (SVG template) ───────────────────────────────────

const escapeSvgText = (value: string) =>
  value.replace(/[&<>"']/g, (char) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[char] ?? char
  ));

function ordinalPlace(rank: number): string {
  const mod100 = rank % 100;
  const suffix = mod100 >= 11 && mod100 <= 13
    ? 'TH'
    : (['TH', 'ST', 'ND', 'RD'][rank % 10] ?? 'TH');
  return `${rank}${suffix}`;
}

/** Pick the largest font size that keeps the given text inside `maxWidth`. */
function fitFontSize(text: string, base: number, maxWidth: number, widthPerEm: number): number {
  const estimated = text.length * widthPerEm * base;
  return estimated > maxWidth ? Math.max(26, (maxWidth / (text.length * widthPerEm))) : base;
}

export interface PerformanceSvgPosterProps {
  /** Student's name as it should appear on the poster. */
  studentName: string;
  /** Real rank used for the "2nd place" line. */
  rank: number;
  madrasaName: string;
  /** Which ranking the student placed in. */
  category?: 'total' | 'ibadah';
  /** Replaces the template's sample portrait when present. */
  photoUrl?: string | null;
  className?: string;
}

/** The pre-designed performance SVG, filled in with live student data. */
export function PerformanceSvgPoster({
  studentName,
  rank,
  madrasaName,
  category = 'ibadah',
  photoUrl,
  className,
}: PerformanceSvgPosterProps) {
  const name = studentName.trim().toUpperCase() || 'STUDENT NAME';
  const placeLine = `${ordinalPlace(rank)} PLACE IN ${category === 'total' ? 'OVERALL' : 'IBADA'}`;

  // The template stores the placeholder name/place as vector paths, so drop that
  // group and draw live text in the same spots instead.
  let markup = ibadaPerformanceMarkup.replace(
    /<g role="img" aria-label="[^"]*">[\s\S]*?<\/g>/,
    '',
  );

  const escapedName = escapeSvgText(madrasaName.trim() || 'Madrasa Name');
  markup = markup.replace(
    /<tspan x="0" y="0">Madrasa Name<\/tspan>/,
    `<tspan x="0" y="0">${escapedName}</tspan>`,
  );

  const photoTag = new RegExp(`<image id="${IBADA_SAMPLE_PHOTO_ID.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*/>`);
  if (photoUrl) {
    markup = markup.replace(photoTag, (tag) =>
      tag
        .replace(/xlink:href="[^"]*"/, `xlink:href="${escapeSvgText(photoUrl)}"`)
        .replace(/preserveAspectRatio="none"/, 'preserveAspectRatio="xMidYMid slice"'),
    );
  }

  const nameSize = fitFontSize(name, 71, 730, 0.74);
  const nameText = `<text x="100.9" y="974.8" fill="url(#ibada-linear-gradient-1)" font-family="Geist, Inter, Arial, sans-serif" font-size="${nameSize.toFixed(1)}" font-weight="800" letter-spacing="0.5">${escapeSvgText(name)}</text>`;
  const placeText = `<text fill="url(#ibada-linear-gradient-1)" font-family="Geist, Inter, Arial, sans-serif" font-size="47" font-weight="800"><tspan x="100.2" y="1036">${escapeSvgText(placeLine)}</tspan><tspan x="100.7" y="1082.6">PERFORMANCE</tspan></text>`;

  markup = markup.replace(/<\/g><\/svg>$/, `${nameText}${placeText}</g></svg>`);

  return (
    <div className={className ?? 'mx-auto w-full max-w-[500px] overflow-hidden'}>
      <SvgPoster svg={<div dangerouslySetInnerHTML={{ __html: markup }} />} />
    </div>
  );
}

// ── Individual rank-holder poster (SVG template) ─────────────────────────────

export interface RankIndividualSvgPosterProps {
  examName: string;
  madrasaName: string;
  classNameLabel: string;
  topper: RankTopper;
  className?: string;
}

/** The per-holder topper poster, coloured by the holder's real rank. */
export function RankIndividualSvgPoster({
  examName,
  madrasaName,
  classNameLabel,
  topper,
  className,
}: RankIndividualSvgPosterProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  const defaultMaps: SvgAttrMap[] = [
    { id: 'individual-badge', attr: 'textContent', value: String(topper.rank) },
    { id: 'individual-name', attr: 'textContent', value: '' },
    { id: 'individual-percent', attr: 'textContent', value: '—' },
    { id: 'individual-guardian', attr: 'display', value: 'none' },
    { id: 'individual-avatar', attr: 'display', value: 'none' },
    { id: 'individual-avatar', attr: 'href', value: '' },
    { id: 'individual-avatar', attr: 'xlink:href', value: '' },
    ...medalMaps('individual', topper.rank),
  ];

  const maps: SvgAttrMap[] = [
    { id: 'individual-madrasa-name', attr: 'textContent', value: madrasaName },
    { id: 'individual-exam-name', attr: 'textContent', value: examName },
    { id: 'individual-class-name', attr: 'textContent', value: classNameLabel },
    { id: 'individual-badge', attr: 'textContent', value: String(topper.rank) },
    { id: 'individual-name', attr: 'textContent', value: topper.name },
    {
      id: 'individual-percent',
      attr: 'textContent',
      value: topper.percentage != null ? `${topper.percentage.toFixed(2)}%` : '—',
    },
  ];

  if (topper.avatarUrl) {
    maps.push(
      { id: 'individual-avatar', attr: 'href', value: topper.avatarUrl },
      { id: 'individual-avatar', attr: 'xlink:href', value: topper.avatarUrl },
      { id: 'individual-avatar', attr: 'display', value: 'inline' },
    );
  }

  return (
    <div className={className ?? 'space-y-3'}>
      <div className="flex items-center gap-2 flex-wrap">
        <PosterExportButton
          getElement={() => rootRef.current}
          stem={`rank-${topper.rank}-${topper.name}`.replace(/\s+/g, '-')}
        />
      </div>
      <div ref={rootRef} className="mx-auto w-full max-w-[500px] overflow-hidden">
        <SvgPoster
          svg={<div dangerouslySetInnerHTML={{ __html: rankIndividualMarkup }} />}
          maps={maps}
          defaultMaps={defaultMaps}
        />
      </div>
    </div>
  );
}
