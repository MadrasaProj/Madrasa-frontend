import { ChevronLeft, ChevronRight } from "lucide-react";
import { DatePickerDrawer } from "@/components/DatePickerDrawer";
import { t } from "@/lib/i18n";
import { useLanguageStore } from "@/store/language";
import { useState } from "react";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function DateNavigator({
  date,
  onDateChange,
  pickerTitle,
  inline = false,
}: {
  date: string;
  onDateChange: (date: string) => void;
  pickerTitle: string;
  inline?: boolean;
}) {
  const { lang } = useLanguageStore();
  const [dateDrawerOpen, setDateDrawerOpen] = useState(false);

  const changeDate = (days: number) => {
    const next = new Date(`${date}T00:00:00`);
    next.setDate(next.getDate() + days);
    onDateChange(
      [next.getFullYear(), String(next.getMonth() + 1).padStart(2, "0"), String(next.getDate()).padStart(2, "0")].join("-"),
    );
  };

  return (
    <>
      <div className={inline ? "" : "h-[54px]"}>
        <div className={inline ? "bg-white" : "fixed inset-x-0   top-[40px] z-30 bg-white/95 px-4 shadow-lg shadow-gray-100 backdrop-blur-sm lg:left-64 lg:px-8"}>
          <div className={inline ? "flex w-full items-center justify-between gap-5 border-y border-gray-100 py-2" : "mx-auto flex w-full items-center justify-between gap-5 py-1 pt-3"}>
            <button
              type="button"
              onClick={() => changeDate(-1)}
              aria-label="Previous date"
              className="flex h-9 w-9 items-center justify-center rounded-xl text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => setDateDrawerOpen(true)}
              className="flex min-w-40 items-center gap-3 text-center transition-colors hover:text-emerald-700"
            >
              <span className="text-sm font-semibold text-gray-800">
                {new Date(`${date}T00:00:00`).toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </span>
              <span className="text-xs text-gray-500">
                {new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
                  weekday: "long",
                })}
                {date === todayISO() && (
                  <span className="ml-1 font-semibold text-emerald-700">
                    · {t("teacherPages", "todayBadge", lang)}
                  </span>
                )}
              </span>
            </button>
            <button
              type="button"
              onClick={() => changeDate(1)}
              disabled={date >= todayISO()}
              aria-label="Next date"
              className="flex h-9 w-9 items-center justify-center rounded-xl text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800 disabled:opacity-30"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
      <DatePickerDrawer
        open={dateDrawerOpen}
        onOpenChange={setDateDrawerOpen}
        date={date}
        onDateChange={onDateChange}
        title={pickerTitle}
      />
    </>
  );
}
