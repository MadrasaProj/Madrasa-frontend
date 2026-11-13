import { ScrollableStrip } from "@/components/ui/ScrollableStrip";
import { useEffect, useRef, useState } from "react";
import { CalendarDays } from "lucide-react";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { cn } from "@/lib/utils";

export interface RangePreset {
  label: string;
  from: Date;
  to: Date;
}

export function formatRangeDate(date: Date): string {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
}

function displayRangeDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, "0");
  const month = date.toLocaleDateString("en-GB", { month: "short" });
  const year = String(date.getFullYear()).slice(-2);
  return `${day}-${month}-${year}`;
}

export function commonRangePreset(now = new Date()): RangePreset[] {
  const daysAgo = (days: number) => {
    const date = new Date(now);
    date.setDate(date.getDate() - days);
    return date;
  };
  return [
    { label: "Last 7 Days", from: daysAgo(6), to: now },
    { label: "This Month", from: new Date(now.getFullYear(), now.getMonth(), 1), to: now },
    { label: "Last Month", from: new Date(now.getFullYear(), now.getMonth() - 1, 1), to: new Date(now.getFullYear(), now.getMonth(), 0) },
    { label: "Last 90 Days", from: daysAgo(89), to: now },
  ];
}

interface ScrollableRangeNavigatorProps {
  from: string;
  to: string;
  onChange: (range: { from: string; to: string }) => void;
  presets?: RangePreset[];
  allowAllTime?: boolean;
  showPresetDescription?: boolean;
  showCustomPicker?: boolean;
  title?: string;
  disabled?: boolean;
  className?: string;
  actions?: React.ReactNode;
}

export function ScrollableRangeNavigator({
  from, to, onChange, presets = commonRangePreset(), allowAllTime = false, showCustomPicker = true,
  title = "Date range", disabled = false, className, actions,showPresetDescription = false
}: ScrollableRangeNavigatorProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const stripRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);
  const selectedIndex = presets.findIndex((preset) => formatRangeDate(preset.from) === from && formatRangeDate(preset.to) === to);
  const allTimeSelected = allowAllTime && from === "ALL" && to === "ALL";

  useEffect(() => {
    const strip = stripRef.current;
    const selected = selectedRef.current;
    if (!strip || !selected) return;
    strip.scrollTo({ left: selected.offsetLeft - strip.offsetLeft - (strip.clientWidth - selected.offsetWidth) / 2, behavior: "instant" });
  }, [selectedIndex, allTimeSelected]);

  return (
    <div className={cn("min-w-0   ", className)}>
      <div className="flex min-w-0 items-center gap-2">
        <ScrollableStrip stripRef={stripRef}
        disabled={disabled} role="group" aria-label={title} className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto overscroll-x-contain py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {allowAllTime && (
            <button
              ref={allTimeSelected ? selectedRef : undefined}
              type="button"
              aria-pressed={allTimeSelected}
              disabled={disabled}
              onClick={() => { setPickerOpen(false); onChange({ from: "ALL", to: "ALL" }); }}
              className={cn(showPresetDescription ? "h-14" : "h-10", "min-w-28 shrink-0 rounded-lg border px-3 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500 disabled:opacity-35", allTimeSelected ? "border-gray-950 bg-gray-950 text-white" : "border-gray-300 bg-white text-gray-900 hover:bg-gray-50")}
            >
              All Time
            </button>
          )}
          {presets.map((preset, index) => {
            const selected = index === selectedIndex;
            const start = formatRangeDate(preset.from);
            const end = formatRangeDate(preset.to);
            return (
              <button key={`${preset.label}-${start}-${end}`} ref={selected ? selectedRef : undefined} type="button"
                aria-label={`${preset.label}: ${displayRangeDate(preset.from)} to ${displayRangeDate(preset.to)}`} aria-pressed={selected} disabled={disabled}
                onClick={() => { setPickerOpen(false); onChange({ from: start, to: end }); }}
                className={cn(showPresetDescription?"h-14":"h-10","flex  min-w-28 shrink-0 flex-col items-center justify-center rounded-lg border px-3 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500 disabled:opacity-35", selected ? "border-gray-950 bg-gray-950 text-white" : "border-gray-300 bg-white text-gray-900 hover:bg-gray-50")}
              >
                <span className="font-semibold">{preset.label}</span>
                {showPresetDescription&&<span className={cn("text-[11px]", selected ? "text-gray-200" : "text-gray-500")}>{displayRangeDate(preset.from)} – {displayRangeDate(preset.to)}</span>
             } </button>
            );
          })}
        </ScrollableStrip>
        {showCustomPicker && (
          <button type="button" aria-label="Custom date range" title="Custom date range" aria-expanded={pickerOpen} disabled={disabled}
            onClick={() => setPickerOpen((open) => !open)}
            className={cn(showPresetDescription?"h-14 w-12":"h-10 w-10","flex   shrink-0 items-center justify-center rounded-lg border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500 disabled:opacity-35", pickerOpen || (selectedIndex === -1 && !allTimeSelected) ? "border-gray-950 bg-gray-950 text-white" : "border-gray-300 bg-white text-gray-900 hover:bg-gray-50")}
          ><CalendarDays aria-hidden="true" className="h-5 w-5" /></button>
        )}
        {actions}
      </div>
      {showCustomPicker && (
        <DateRangePicker
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          value={{
            from: from && from !== "ALL" ? new Date(`${from}T00:00:00`) : undefined,
            to: to && to !== "ALL" ? new Date(`${to}T00:00:00`) : undefined,
          }}
          onApply={(range) => {
            if (range?.from && range.to) {
              onChange({ from: formatRangeDate(range.from), to: formatRangeDate(range.to) });
            }
          }}
          title={title}
        />
      )}
    </div>
  );
}
