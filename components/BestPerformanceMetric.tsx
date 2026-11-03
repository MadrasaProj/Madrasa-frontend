import type { LucideIcon } from "lucide-react";

export function BestPerformanceMetric({ icon: Icon, iconClassName, label, value }: {
  icon: LucideIcon;
  iconClassName: string;
  label: string;
  value: string | number;
}) {
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap">
      <Icon className={`size-3.5 shrink-0 ${iconClassName}`} aria-hidden="true" />
      <span className="sr-only">{label}: </span>
      <span className="tabular-nums">{value}</span>
    </span>
  );
}
