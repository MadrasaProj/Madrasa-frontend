import { ChevronLeft, ChevronRight, Download } from "lucide-react";

interface WeekNavigatorProps {
  weekDates: string[];
  date: string;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onDownloadReport?: () => void;
  downloadDisabled?: boolean;
  fmtShort?: (iso: string) => string;
}

function defaultFmtShort(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function fmt(d: Date) {
  return d.toISOString().split("T")[0];
}

export function WeekNavigator({
  weekDates,
  date,
  onPrevWeek,
  onNextWeek,
  onDownloadReport,
  downloadDisabled = false,
  fmtShort = defaultFmtShort,
}: WeekNavigatorProps) {
  return (
    <div className="mb-5">
      <div className="flex items-center justify-between gap-5 border-y border-gray-100 py-2">
        <button
          type="button"
          onClick={onPrevWeek}
          aria-label="Previous week"
          className="flex h-9 w-9 items-center justify-center rounded-xl text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <p className="flex-1 text-center text-sm font-semibold text-gray-800">
          {fmtShort(weekDates[0])} — {fmtShort(weekDates[6])}
        </p>
        {onDownloadReport && (
          <button
            type="button"
            onClick={onDownloadReport}
            disabled={downloadDisabled}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-40"
          >
            <Download className="h-3.5 w-3.5" /> Download PDF
          </button>
        )}
        <button
          type="button"
          onClick={onNextWeek}
          disabled={date >= fmt(new Date())}
          aria-label="Next week"
          className="flex h-9 w-9 items-center justify-center rounded-xl text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800 disabled:opacity-30"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
