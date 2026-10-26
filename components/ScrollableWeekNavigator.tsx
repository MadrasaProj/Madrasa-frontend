import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays } from "lucide-react";
import { DatePickerDrawer } from "@/components/DatePickerDrawer";
import { cn } from "@/lib/utils";
import { useLanguageStore } from "@/store/language";

function localISO(date: Date) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
}

interface ScrollableWeekNavigatorProps {
  date: string;
  onDateChange: (date: string) => void;
  pickerTitle: string;
  disabled?: boolean;
  hideCalendarButton?: boolean;
}

export function ScrollableWeekNavigator({
  date,
  onDateChange,
  pickerTitle,
  disabled = false,
  hideCalendarButton = false,
}: ScrollableWeekNavigatorProps) {
  const { lang } = useLanguageStore();
  const locale = lang === "ml" ? "ml-IN" : "en-GB";
  const [pickerOpen, setPickerOpen] = useState(false);
  const stripRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);
  const today = localISO(new Date());

  // Each card represents the same seven-day period used by the weekly report.
  const weeks = useMemo(() => {
    const selectedEnd = new Date(`${date}T00:00:00`);
    return Array.from({ length: 25 }, (_, index) => {
      const end = new Date(selectedEnd);
      end.setDate(end.getDate() + (index - 12) * 7);
      const start = new Date(end);
      start.setDate(start.getDate() - 6);
      return { start, end, value: localISO(end) };
    });
  }, [date]);

  useEffect(() => {
    const strip = stripRef.current;
    const selected = selectedRef.current;
    if (!strip || !selected) return;
    strip.scrollTo({
      left: selected.offsetLeft - strip.offsetLeft - (strip.clientWidth - selected.offsetWidth) / 2,
      behavior: "instant",
    });
  }, [date, hideCalendarButton]);

  return (
    <>
      <div className={cn("relative min-w-0 flex-1", !hideCalendarButton && "pl-12")}>
        {!hideCalendarButton && (
          <button
            type="button"
            aria-label={pickerTitle}
            title={pickerTitle}
            aria-haspopup="dialog"
            aria-expanded={pickerOpen}
            disabled={disabled}
            onClick={() => setPickerOpen(true)}
            className="absolute left-0 top-1/2 z-10 flex h-14 w-12 -translate-y-1/2 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-900 transition-colors hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500 disabled:cursor-not-allowed disabled:opacity-35"
          >
            <CalendarDays aria-hidden="true" className="h-5 w-5" />
          </button>
        )}
        <div
          ref={stripRef}
          role="group"
          aria-label={pickerTitle}
          className="flex gap-1.5 overflow-x-auto overscroll-x-contain px-1 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {weeks.map(({ start, end, value }) => {
            const selected = value === date;
            const startMonth = start.toLocaleDateString(locale, { month: "short" });
            const endMonth = end.toLocaleDateString(locale, { month: "short" });
            return (
              <button
                key={value}
                ref={selected ? selectedRef : undefined}
                type="button"
                aria-label={`${start.toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" })} – ${end.toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" })}`}
                aria-pressed={selected}
                disabled={disabled || value > today}
                onClick={() => onDateChange(value)}
                className={cn(
                  "flex h-14 w-20 shrink-0 flex-col items-center justify-center gap-0.5 rounded-lg border py-1 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500 disabled:cursor-not-allowed disabled:opacity-35",
                  selected ? "border-gray-950 bg-gray-950 text-white" : "border-gray-300 bg-white text-gray-900 hover:bg-gray-50",
                )}
              >
                <span className={cn("text-xs font-medium", selected ? "text-gray-200" : "text-gray-500")}>
                  {startMonth === endMonth ? startMonth : `${startMonth}–${endMonth}`}
                </span>
                <span className="font-bold">{start.getDate()}–{end.getDate()}</span>
              </button>
            );
          })}
        </div>
      </div>
      <DatePickerDrawer
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        date={date}
        onDateChange={(nextDate) => { if (!disabled) onDateChange(nextDate); }}
        title={pickerTitle}
      />
    </>
  );
}
