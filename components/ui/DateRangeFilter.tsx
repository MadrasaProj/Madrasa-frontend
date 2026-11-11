import { useEffect, useState } from "react";
import { Calendar, ChevronRight } from "lucide-react";
import { DatePickerDrawer } from "@/components/DatePickerDrawer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type DatePreset = "ALL" | "TODAY" | "THIS_WEEK" | "THIS_MONTH" | "LAST_MONTH" | "CUSTOM";

export interface DateRangeFilterProps {
  from: string;
  to: string;
  onChange: (range: { from: string; to: string; preset: DatePreset }) => void;
  preset?: DatePreset;
  presets?: readonly DatePreset[];
  initialPreset?: DatePreset;
  allowAllTime?: boolean;
  className?: string;
  compact?: boolean;
}

function fmt(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function computePresetRange(preset: DatePreset): { from: string; to: string } {
  const now = new Date();
  const today = fmt(now);

  if (preset === "ALL") {
    return { from: "ALL", to: "ALL" };
  }
  if (preset === "TODAY") {
    return { from: today, to: today };
  }
  if (preset === "THIS_WEEK") {
    const d = new Date(now);
    d.setDate(d.getDate() - 6);
    return { from: fmt(d), to: today };
  }
  if (preset === "THIS_MONTH") {
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: fmt(firstDay), to: today };
  }
  if (preset === "LAST_MONTH") {
    const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
    return { from: fmt(firstDay), to: fmt(lastDay) };
  }
  return { from: today, to: today };
}

export function DateRangeFilter({
  from,
  to,
  onChange,
  preset,
  presets = ["ALL", "TODAY", "THIS_WEEK", "THIS_MONTH", "LAST_MONTH", "CUSTOM"],
  initialPreset = "THIS_MONTH",
  allowAllTime = true,
  className,
  compact = false,
}: DateRangeFilterProps) {
  const [selectedPreset, setSelectedPreset] = useState<DatePreset>(initialPreset);
  const activePreset = preset ?? selectedPreset;
  const [customFrom, setCustomFrom] = useState(from && from !== "ALL" ? from : fmt(new Date()));
  const [customTo, setCustomTo] = useState(to && to !== "ALL" ? to : fmt(new Date()));
  const [fromPickerOpen, setFromPickerOpen] = useState(false);
  const [toPickerOpen, setToPickerOpen] = useState(false);

  useEffect(() => {
    if (from && from !== "ALL") setCustomFrom(from);
    if (to && to !== "ALL") setCustomTo(to);
  }, [from, to]);

  const presetLabels: Record<DatePreset, string> = {
    ALL: "All Time",
    TODAY: "Today",
    THIS_WEEK: "This Week",
    THIS_MONTH: "This Month",
    LAST_MONTH: "Last Month",
    CUSTOM: "Custom Range",
  };

  const handlePresetClick = (p: DatePreset) => {
    setSelectedPreset(p);
    if (p === "CUSTOM") {
      onChange({ from: customFrom, to: customTo, preset: "CUSTOM" });
    } else {
      const range = computePresetRange(p);
      if (p !== "ALL") {
        setCustomFrom(range.from || fmt(new Date()));
        setCustomTo(range.to || fmt(new Date()));
      }
      onChange({ ...range, preset: p });
    }
  };

  const handleCustomFromChange = (newFrom: string) => {
    const newTo = newFrom > customTo ? newFrom : customTo;
    setCustomFrom(newFrom);
    setCustomTo(newTo);
    setSelectedPreset("CUSTOM");
    onChange({ from: newFrom, to: newTo, preset: "CUSTOM" });
  };

  const handleCustomToChange = (newTo: string) => {
    const newFrom = newTo < customFrom ? newTo : customFrom;
    setCustomFrom(newFrom);
    setCustomTo(newTo);
    setSelectedPreset("CUSTOM");
    onChange({ from: newFrom, to: newTo, preset: "CUSTOM" });
  };

  return (
    <div className={cn("space-y-3 rounded-2xl border border-gray-100 bg-white p-3 shadow-none sm:p-4", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
          <Calendar className="w-4 h-4 text-emerald-600" />
          <span>Date Filter</span>
          {activePreset !== "CUSTOM" && activePreset !== "ALL" && (
            <span className="text-[11px] font-normal normal-case text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-100">
              {from} to {to}
            </span>
          )}
        </div>

        {/* Preset chips */}
        <div className="flex flex-wrap gap-1.5">
          {presets.filter((p) => allowAllTime || p !== "ALL").map((p) => {
            const isActive = activePreset === p;
            return (
              <Button
                key={p}
                type="button"
                variant={isActive ? "default" : "outline"}
                size="xs"
                aria-pressed={isActive}
                onClick={() => handlePresetClick(p)}
                className={cn(
                  "h-auto rounded-xl px-2.5 py-1 text-xs shadow-none",
                  isActive
                    ? "bg-primary-600 font-semibold text-white"
                    : "border-gray-100 bg-gray-50 text-gray-600 hover:bg-gray-100"
                )}
              >
                {presetLabels[p]}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Custom range date inputs */}
      {activePreset === "CUSTOM" && (
        <div className={cn("flex flex-wrap items-center gap-2 border-t border-gray-100 pt-2", compact && "gap-1.5")}>
          <Button type="button" variant="outline" size="sm" onClick={() => setFromPickerOpen(true)} className="h-9 shadow-none" aria-label={`From date: ${customFrom}`}>
            From: {customFrom}
          </Button>
          <ChevronRight className="hidden size-3.5 text-gray-400 sm:block" aria-hidden="true" />
          <Button type="button" variant="outline" size="sm" onClick={() => setToPickerOpen(true)} className="h-9 shadow-none" aria-label={`To date: ${customTo}`}>
            To: {customTo}
          </Button>
          <DatePickerDrawer open={fromPickerOpen} onOpenChange={setFromPickerOpen} date={customFrom} onDateChange={handleCustomFromChange} title="From date" />
          <DatePickerDrawer open={toPickerOpen} onOpenChange={setToPickerOpen} date={customTo} onDateChange={handleCustomToChange} title="To date" minDate={customFrom} />
        </div>
      )}
    </div>
  );
}
