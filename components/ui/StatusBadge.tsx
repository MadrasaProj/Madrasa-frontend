import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: "green" | "yellow" | "red" | "paid" | "pending" | "unpaid" | "present" | "absent" | "jama" | "individual" | "missed" | "returned";
  label?: string;
  size?: "sm" | "md";
}

const statusConfig = {
  green:      { bg: "bg-emerald-100", text: "text-emerald-700", dot: "bg-emerald-500", label: "Completed" },
  yellow:     { bg: "bg-amber-100",   text: "text-amber-700",   dot: "bg-amber-400",   label: "Pending" },
  red:        { bg: "bg-red-100",     text: "text-red-600",     dot: "bg-red-500",     label: "Missing" },
  paid:       { bg: "bg-emerald-100", text: "text-emerald-700", dot: "bg-emerald-500", label: "Paid" },
  pending:    { bg: "bg-amber-100",   text: "text-amber-700",   dot: "bg-amber-400",   label: "Pending" },
  unpaid:     { bg: "bg-red-100",     text: "text-red-600",     dot: "bg-red-500",     label: "Unpaid" },
  present:    { bg: "bg-emerald-100", text: "text-emerald-700", dot: "bg-emerald-500", label: "Present" },
  absent:     { bg: "bg-red-100",     text: "text-red-600",     dot: "bg-red-500",     label: "Absent" },
  jama:       { bg: "bg-emerald-100", text: "text-emerald-700", dot: "bg-emerald-500", label: "Jama'a" },
  individual: { bg: "bg-amber-100",   text: "text-amber-700",   dot: "bg-amber-400",   label: "Individual" },
  missed:     { bg: "bg-red-100",     text: "text-red-600",     dot: "bg-red-500",     label: "Missed" },
  returned:   { bg: "bg-blue-100",    text: "text-blue-700",    dot: "bg-blue-500",    label: "Returned" },
};

export function StatusBadge({ status, label, size = "md" }: StatusBadgeProps) {
  const config = statusConfig[status];
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 rounded-full font-medium",
      config.bg, config.text,
      size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm"
    )}>
      <span className={cn("rounded-full", config.dot, size === "sm" ? "w-1.5 h-1.5" : "w-2 h-2")} />
      {label ?? config.label}
    </span>
  );
}
