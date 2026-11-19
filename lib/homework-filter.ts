import type { DateRange } from "react-day-picker";
import type { Lang } from "@/lib/i18n";

export type DueDatePreset =
  | "all"
  | "today"
  | "yesterday"
  | "thisWeek"
  | "lastWeek"
  | "thisMonth"
  | "lastMonth"
  | "custom";

export interface DateBounds {
  from: Date;
  to: Date;
}

/** The due-date presets shown in the ScrollableTabs, paired with their i18n keys. */
export const DUE_DATE_PRESETS = [
  { value: "all", key: "all" },
  { value: "today", key: "today" },
  { value: "yesterday", key: "yesterday" },
  { value: "thisWeek", key: "thisWeek" },
  { value: "lastWeek", key: "lastWeek" },
  { value: "thisMonth", key: "thisMonth" },
  { value: "lastMonth", key: "lastMonth" },
] as const satisfies ReadonlyArray<{ value: DueDatePreset; key: string }>;

function atMidnight(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

/** Resolve a preset into an inclusive local-date range. */
export function getPresetBounds(
  preset: Exclude<DueDatePreset, "all" | "custom">,
  now = new Date(),
): DateBounds {
  const today = atMidnight(now);

  switch (preset) {
    case "today":
      return { from: today, to: today };
    case "yesterday": {
      const yesterday = addDays(today, -1);
      return { from: yesterday, to: yesterday };
    }
    case "thisWeek": {
      const daysSinceMonday = (today.getDay() + 6) % 7;
      const monday = addDays(today, -daysSinceMonday);
      return { from: monday, to: addDays(monday, 6) };
    }
    case "lastWeek": {
      const daysSinceMonday = (today.getDay() + 6) % 7;
      const monday = addDays(today, -daysSinceMonday - 7);
      return { from: monday, to: addDays(monday, 6) };
    }
    case "thisMonth":
      return {
        from: new Date(today.getFullYear(), today.getMonth(), 1),
        to: new Date(today.getFullYear(), today.getMonth() + 1, 0),
      };
    case "lastMonth":
      return {
        from: new Date(today.getFullYear(), today.getMonth() - 1, 1),
        to: new Date(today.getFullYear(), today.getMonth(), 0),
      };
  }
}

/** Parse an API due date (ISO string or YYYY-MM-DD) as a local calendar date. */
function parseDueDate(iso: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) return null;
  const due = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(due.getTime()) ? null : due;
}

/** Whether a homework due date falls inside the active preset / custom range. */
export function isWithinDueDateFilter(
  iso: string,
  preset: DueDatePreset,
  customRange?: DateRange,
  now = new Date(),
): boolean {
  if (preset === "all") return true;

  let bounds: DateBounds;
  if (preset === "custom") {
    // A preset of "custom" with no picked dates means "no date filter yet".
    if (!customRange?.from) return true;
    bounds = {
      from: atMidnight(customRange.from),
      to: atMidnight(customRange.to ?? customRange.from),
    };
  } else {
    bounds = getPresetBounds(preset, now);
  }

  const due = parseDueDate(iso);
  if (!due) return false;
  return due >= bounds.from && due <= bounds.to;
}

/** Human-readable label for the picked custom range. */
export function formatCustomRange(range: DateRange | undefined, lang: Lang): string {
  if (!range?.from) return "";
  const format = (date: Date) =>
    date.toLocaleDateString(lang === "ml" ? "ml-IN" : "en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  return range.to
    ? `${format(range.from)} – ${format(range.to)}`
    : format(range.from);
}
