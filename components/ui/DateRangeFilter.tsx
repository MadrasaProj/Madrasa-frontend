import { useState, useEffect } from "react";
import { Calendar, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type DatePreset = "ALL" | "TODAY" | "THIS_WEEK" | "THIS_MONTH" | "LAST_MONTH" | "CUSTOM";

export interface DateRangeFilterProps {
  from: string;
  to: string;
  onChange: (range: { from: string; to: string; preset: DatePreset }) => void;
  initialPreset?: DatePreset;
  allowAllTime?: boolean;
  className?: string;
  compact?: boolean;
}

function fmt(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function computePresetRange(preset: DatePreset): { from: string; to: string } {
  const now = new Date();
  const today = fmt(now);

  if (preset === "ALL") {
    return { from: "", to: "" };
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
  initialPreset = "THIS_MONTH",
  allowAllTime = true,
  className,
  compact = false,
}: DateRangeFilterProps) {
  const [activePreset, setActivePreset] = useState<DatePreset>(initialPreset);
  const [customFrom, setCustomFrom] = useState(from || fmt(new Date()));
  const [customTo, setCustomTo] = useState(to || fmt(new Date()));

  const presets: { id: DatePreset; label: string }[] = [
    ...(allowAllTime ? [{ id: "ALL" as DatePreset, label: "All Time" }] : []),
    { id: "TODAY", label: "Today" },
    { id: "THIS_WEEK", label: "This Week" },
    { id: "THIS_MONTH", label: "This Month" },
    { id: "LAST_MONTH", label: "Last Month" },
    { id: "CUSTOM", label: "Custom Range" },
  ];

  const handlePresetClick = (p: DatePreset) => {
    setActivePreset(p);
    if (p === "CUSTOM") {
      onChange({ from: customFrom, to: customTo, preset: "CUSTOM" });
    } else {
      const range = computePresetRange(p);
      setCustomFrom(range.from || fmt(new Date()));
      setCustomTo(range.to || fmt(new Date()));
      onChange({ ...range, preset: p });
    }
  };

  const handleCustomFromChange = (newFrom: string) => {
    setCustomFrom(newFrom);
    setActivePreset("CUSTOM");
    onChange({ from: newFrom, to: customTo, preset: "CUSTOM" });
  };

  const handleCustomToChange = (newTo: string) => {
    setCustomTo(newTo);
    setActivePreset("CUSTOM");
    onChange({ from: customFrom, to: newTo, preset: "CUSTOM" });
  };

  return (
    <div className={cn("bg-white rounded-2xl border border-gray-100 p-3 sm:p-4 shadow-sm space-y-3", className)}>
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
          {presets.map((p) => {
            const isActive = activePreset === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => handlePresetClick(p.id)}
                className={cn(
                  "px-2.5 py-1 rounded-xl text-xs font-medium transition-all",
                  isActive
                    ? "bg-emerald-600 text-white shadow-sm font-semibold"
                    : "bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-100"
                )}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom range date inputs */}
      {activePreset === "CUSTOM" && (
        <div className="pt-2 border-t border-gray-100 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 font-medium">From:</span>
            <input
              type="date"
              value={customFrom}
              onChange={(e) => handleCustomFromChange(e.target.value)}
              className="text-xs px-3 py-1.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-emerald-500 focus:outline-none transition-all"
            />
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-gray-400 hidden sm:block" />
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 font-medium">To:</span>
            <input
              type="date"
              value={customTo}
              onChange={(e) => handleCustomToChange(e.target.value)}
              className="text-xs px-3 py-1.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-emerald-500 focus:outline-none transition-all"
            />
          </div>
        </div>
      )}
    </div>
  );
}
