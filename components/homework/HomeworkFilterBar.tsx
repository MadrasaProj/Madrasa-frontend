"use client";

import { useState } from "react";
import type { DateRange } from "react-day-picker";
import { CalendarRange, Filter, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { ResponsivePopover } from "@/components/ui/responsivePopover";
import { ScrollableTabs } from "@/components/ui/ScrollableTabs";
import { formatCustomRange, DUE_DATE_PRESETS, type DueDatePreset } from "@/lib/homework-filter";
import { t, type Lang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export interface HomeworkSubjectOption {
  id: string;
  name: string;
}

interface HomeworkFilterBarProps {
  lang: Lang;
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  searchAriaLabel?: string;
  dueDatePreset: DueDatePreset;
  onDueDatePresetChange: (preset: DueDatePreset) => void;
  customRange: DateRange | undefined;
  onCustomRangeChange: (range: DateRange | undefined) => void;
  subjects: HomeworkSubjectOption[];
  subjectId: string;
  onSubjectChange: (subjectId: string) => void;
}

const pillClass = (active: boolean) =>
  cn(
    "min-h-9 shrink-0 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500",
    active
      ? "border-gray-950 bg-gray-950 text-white"
      : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50",
  );

/** Search field plus a filter popover holding due-date presets, a custom range picker and a subject filter. */
export function HomeworkFilterBar({
  lang,
  search,
  onSearchChange,
  searchPlaceholder,
  searchAriaLabel,
  dueDatePreset,
  onDueDatePresetChange,
  customRange,
  onCustomRangeChange,
  subjects,
  subjectId,
  onSubjectChange,
}: HomeworkFilterBarProps) {
  const [filterOpen, setFilterOpen] = useState(false);
  const [rangeOpen, setRangeOpen] = useState(false);

  const activeCount =
    (dueDatePreset !== "all" ? 1 : 0) + (subjectId !== "all" ? 1 : 0);

  const resetFilters = () => {
    onDueDatePresetChange("all");
    onCustomRangeChange(undefined);
    onSubjectChange("all");
  };

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
        <input
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={searchPlaceholder}
          aria-label={searchAriaLabel ?? searchPlaceholder}
          className="w-full rounded-xl border border-gray-200 py-2.5 pl-10 pr-4 text-sm transition-all focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/30"
        />
      </div>

      <ResponsivePopover
        open={filterOpen}
        onOpenChange={setFilterOpen}
        side="bottom"
        title={t("hwFilter", "title", lang)}
        className="md:w-[28rem]"
      >
        <div className="space-y-5 px-4 pb-4 pt-2 md:px-2">
          <section className="space-y-2">
            <h3 className="px-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
              {t("hwFilter", "dueDate", lang)}
            </h3>
            <div className="flex items-center gap-2">
              <ScrollableTabs
                ariaLabel={t("hwFilter", "dueDate", lang)}
                options={DUE_DATE_PRESETS.map((preset) => ({
                  value: preset.value,
                  label: t("hwFilter", preset.key, lang),
                }))}
                value={dueDatePreset}
                onValueChange={(value) => onDueDatePresetChange(value as DueDatePreset)}
              />
              <Button
                type="button"
                size="icon"
                variant={dueDatePreset === "custom" ? "default" : "outline"}
                aria-label={t("hwFilter", "customRange", lang)}
                title={t("hwFilter", "customRange", lang)}
                onClick={() => setRangeOpen(true)}
                className={cn("shrink-0", customRange?.from && dueDatePreset !== "custom" && "border-primary-500 text-primary-600")}
              >
                <CalendarRange aria-hidden="true" />
              </Button>
            </div>
            {dueDatePreset === "custom" && (
              <p className="px-1 text-xs text-gray-500">
                {customRange?.from
                  ? formatCustomRange(customRange, lang)
                  : t("hwFilter", "noRange", lang)}
              </p>
            )}
            <DateRangePicker
              open={rangeOpen}
              onOpenChange={setRangeOpen}
              value={customRange}
              title={t("hwFilter", "customRange", lang)}
              onApply={(range) => {
                onCustomRangeChange(range);
                onDueDatePresetChange(range?.from ? "custom" : "all");
              }}
            />
          </section>

          <section className="space-y-2">
            <h3 className="px-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
              {t("hwFilter", "subject", lang)}
            </h3>
            <div className="flex flex-wrap gap-2 px-1">
              <button
                type="button"
                aria-pressed={subjectId === "all"}
                onClick={() => onSubjectChange("all")}
                className={pillClass(subjectId === "all")}
              >
                {t("hwFilter", "all", lang)}
              </button>
              {subjects.map((subject) => (
                <button
                  key={subject.id}
                  type="button"
                  aria-pressed={subjectId === subject.id}
                  onClick={() => onSubjectChange(subject.id)}
                  className={pillClass(subjectId === subject.id)}
                >
                  {subject.name}
                </button>
              ))}
            </div>
          </section>

          <div className="flex justify-end border-t border-gray-100 px-1 pt-3">
            <Button type="button" variant="ghost" size="sm" onClick={resetFilters}>
              {t("hwFilter", "reset", lang)}
            </Button>
          </div>
        </div>
      </ResponsivePopover>

      <Button variant="outline" className="shrink-0" onClick={() => setFilterOpen(true)}>
        <Filter aria-hidden="true" />
        {t("hwFilter", "filter", lang)}
        {activeCount > 0 && (
          <span className="ml-0.5 inline-flex size-5 items-center justify-center rounded-full bg-primary-600 text-[11px] font-semibold text-white">
            {activeCount}
          </span>
        )}
      </Button>
    </div>
  );
}
