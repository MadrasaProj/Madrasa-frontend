import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays } from "lucide-react";
import { DatePickerDrawer } from "@/components/DatePickerDrawer";
import { cn } from "@/lib/utils";
import { useLanguageStore } from "@/store/language";

function localISO(date: Date) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
}

interface ScrollableDateNavigatorProps {
  date: string;
  onDateChange: (date: string) => void;
  pickerTitle: string;
  disabled?: boolean;
  hideCalendarButton?: boolean;
  visibleDates?: string[];
  largeText?: boolean;
}

export function ScrollableDateNavigator({
  date,
  onDateChange,
  pickerTitle,
  disabled = false,
  hideCalendarButton = false,
  visibleDates,
  largeText = false,
}: ScrollableDateNavigatorProps) {
  const { lang } = useLanguageStore();
  const locale = lang === "ml" ? "ml-IN" : "en-GB";
  const [pickerOpen, setPickerOpen] = useState(false);
  const stripRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);
  const month = date.slice(0, 7);
  const today = localISO(new Date());

  // Keep the surrounding months available to swipe through. Picking a distant
  // date in the calendar moves this window and brings that date into view.
  const dates = useMemo(() => {
    if (visibleDates) {
      return visibleDates.map((value) => new Date(`${value}T00:00:00`));
    }
    const [year, monthNumber] = month.split("-").map(Number);
    const cursor = new Date(year, monthNumber - 2, 1);
    const end = new Date(year, monthNumber + 1, 0);
    const result: Date[] = [];
    while (cursor <= end) {
      result.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    return result;
  }, [month, visibleDates]);

  useEffect(() => {
    const strip = stripRef.current;
    const selected = selectedRef.current;
    if (!strip || !selected) return;
    // Scroll only the strip, so selecting a date never moves the page itself.
    strip.scrollTo({
      left: selected.offsetLeft - strip.offsetLeft - (strip.clientWidth - selected.offsetWidth) / 2,
      behavior: "instant",
    });
  }, [date, hideCalendarButton]);

  return (
    <>
      <div className={cn("relative min-w-0 flex-1", !hideCalendarButton && "pl-12")}>
        {!hideCalendarButton && <button
          type="button"
          aria-label={pickerTitle}
          title={pickerTitle}
          aria-haspopup="dialog"
          aria-expanded={pickerOpen}
          disabled={disabled}
          onClick={() => setPickerOpen(true)}
          className="absolute left-0 top-1/2 z-10 flex h-14 w-12 -translate-y-1/2 items-center justify-center rounded-lg border border-gray-300 bg-white py-1 text-gray-900 transition-colors hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500 disabled:cursor-not-allowed disabled:opacity-35"
        >
          <CalendarDays aria-hidden="true" className="h-5 w-5" />
        </button>}
        <div
          ref={stripRef}
          role="group"
          aria-label={pickerTitle}
          className="flex gap-1.5 overflow-x-auto overscroll-x-contain px-1 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {dates.map((day) => {
            const value = localISO(day);
            const selected = value === date;
            const isToday = value === today;
            return (
              <button
                key={value}
                ref={selected ? selectedRef : undefined}
                type="button"
                aria-label={day.toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                aria-pressed={selected}
                aria-current={isToday ? "date" : undefined}
                disabled={disabled || value > today}
                onClick={() => onDateChange(value)}
                className={cn(
                  "relative flex h-14 w-12 shrink-0 flex-col items-center justify-center gap-0.5 rounded-lg border py-1 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500 disabled:cursor-not-allowed disabled:opacity-35",
                  largeText ? "text-base" : "text-sm",
                  selected ? "border-gray-950 bg-gray-950 text-white" : "border-gray-300 bg-white text-gray-900 hover:bg-gray-50",
                )}
              >
                <span aria-hidden="true" className={cn("absolute right-1 top-1 h-1.5 w-1.5 rounded-full", selected ? "bg-white" : isToday ? "bg-gray-900" : "bg-transparent")} />
                <span className={cn(largeText ? "text-base" : "text-xs", "font-medium", selected ? "text-gray-200" : "text-gray-500")}>
                  {day.toLocaleDateString(locale, { weekday: "short" })}
                </span>
                <span className="font-bold">{day.getDate()}</span>
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
        largeText={largeText}
      />
    </>
  );
}
