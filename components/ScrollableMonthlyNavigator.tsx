import { ScrollableStrip } from "@/components/ui/ScrollableStrip";
import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays } from "lucide-react";
import { DatePickerDrawer } from "@/components/DatePickerDrawer";
import { cn } from "@/lib/utils";
import { useLanguageStore } from "@/store/language";

function localISO(date: Date) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
}

interface ScrollableMonthlyNavigatorProps {
  date: string;
  onDateChange: (date: string) => void;
  pickerTitle: string;
  disabled?: boolean;
  hideCalendarButton?: boolean;
}

export function ScrollableMonthlyNavigator({
  date,
  onDateChange,
  pickerTitle,
  disabled = false,
  hideCalendarButton = false,
}: ScrollableMonthlyNavigatorProps) {
  const { lang } = useLanguageStore();
  const locale = lang === "ml" ? "ml-IN" : "en-GB";
  const [pickerOpen, setPickerOpen] = useState(false);
  const stripRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);
  const today = localISO(new Date());
  const selectedMonth = date.slice(0, 7);

  const months = useMemo(() => {
    const [year, month] = selectedMonth.split("-").map(Number);
    return Array.from({ length: 25 }, (_, index) => new Date(year, month - 1 + index - 12, 1));
  }, [selectedMonth]);

  useEffect(() => {
    const strip = stripRef.current;
    const selected = selectedRef.current;
    if (!strip || !selected) return;
    strip.scrollTo({
      left: selected.offsetLeft - strip.offsetLeft - (strip.clientWidth - selected.offsetWidth) / 2,
      behavior: "instant",
    });
  }, [selectedMonth, hideCalendarButton]);

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
        <ScrollableStrip
          stripRef={stripRef}
          disabled={disabled}
          role="group"
          aria-label={pickerTitle}
          className="flex gap-1.5 overflow-x-auto overscroll-x-contain px-1 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {months.map((month) => {
            const value = localISO(month);
            const selected = value.slice(0, 7) === selectedMonth;
            return (
              <button
                key={value}
                ref={selected ? selectedRef : undefined}
                type="button"
                aria-label={month.toLocaleDateString(locale, { month: "long", year: "numeric" })}
                aria-pressed={selected}
                disabled={disabled || value > today}
                onClick={() => onDateChange(value)}
                className={cn(
                  "flex h-14 w-20 shrink-0 flex-col items-center justify-center gap-0.5 rounded-lg border py-1 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500 disabled:cursor-not-allowed disabled:opacity-35",
                  selected ? "border-gray-950 bg-gray-950 text-white" : "border-gray-300 bg-white text-gray-900 hover:bg-gray-50",
                )}
              >
                <span className={cn("text-xs font-medium", selected ? "text-gray-200" : "text-gray-500")}>
                  {month.toLocaleDateString(locale, { month: "short" })}
                </span>
                <span className="font-bold">{month.getFullYear()}</span>
              </button>
            );
          })}
        </ScrollableStrip>
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
