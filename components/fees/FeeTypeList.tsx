import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { FeeTypeProgress } from "@/components/fees/FeeStats";
import type { FeeType } from "@/lib/fees-api";
import { t, type Lang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export interface FeeTypeListItem {
  feeType: FeeType;
  collected: number;
  total: number;
}

function frequencyLabel(frequency: string | null, lang: Lang): string | null {
  if (!frequency) return null;
  switch (frequency.toUpperCase()) {
    case "WEEKLY": return t("teacherPages", "feeFrequencyWeekly", lang);
    case "MONTHLY": return t("parentPages", "frequencyMonthly", lang);
    case "QUARTERLY": return t("parentPages", "frequencyQuarterly", lang);
    case "YEARLY": return t("parentPages", "frequencyYearly", lang);
    default: return frequency.charAt(0).toUpperCase() + frequency.slice(1).toLowerCase();
  }
}

export function FeeTypeList({ items, lang, selectedId, onSelect, title, action }: {
  items: FeeTypeListItem[];
  lang: Lang;
  selectedId: string | null;
  onSelect: (id: string) => void;
  title?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="">
      <div className={cn("mb-2 px-1", action && "flex items-center justify-between gap-3")}>
        <h2 className="text-sm font-semibold text-gray-700">{title ?? t("teacherPages", "allFeeTypes", lang)}</h2>
        {action}
      </div>
      <div data-ui-style="classic" className="card divide-y divide-gray-100 overflow-hidden rounded-2xl bg-white p-0! shadow-none">
        {items.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">{t("teacherPages", "noFeeTypes", lang)}</p>
        ) : items.map(({ feeType, collected, total }) => {
          const kind = feeType.kind === "ONE_TIME"
            ? t("parentPages", "frequencyOneTime", lang)
            : t("teacherPages", "feeTypeRecurring", lang);
          const frequency = feeType.kind === "RECURRING"
            ? frequencyLabel(feeType.frequency, lang)
            : null;
          const expanded = selectedId === feeType.id;

          return (
            <button
              key={feeType.id}
              type="button"
              aria-haspopup="dialog"
              onClick={() => onSelect(feeType.id)}
              className={cn(
                "flex w-full items-center gap-2 px-4 py-4 text-left transition-colors hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary-500 sm:gap-4",
                expanded && "bg-primary-50/50",
              )}
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-gray-950 sm:text-base">{feeType.name}</span>
                <span className="mt-1 block text-xs text-gray-500">
                  {kind}{frequency ? ` · ${frequency}` : ""} ·{" "}
                  <span className="font-semibold tabular-nums text-gray-800">
                    {feeType.isDonation
                      ? t("teacherPages", "feeTypeDonation", lang)
                      : `₹${Number(feeType.amount).toLocaleString("en-IN")}`}
                  </span>
                </span>
              </span>
              <span className="  text-right text-xs font-semibold leading-tight   sm:text-2xl">
                <span className="block text-primary-700">₹{collected.toLocaleString("en-IN")}</span>
                <span className="block text-gray-500">/ ₹{total.toLocaleString("en-IN")}</span>
              </span>
              <FeeTypeProgress collected={collected} total={total} />
              <ChevronRight className="ml-1 text-gray-400" />
            </button>
          );
        })}
      </div>
    </section>
  );
}
