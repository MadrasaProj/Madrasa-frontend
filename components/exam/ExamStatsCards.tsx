import { cn } from "@/lib/utils";

interface StatItem {
  label: string;
  value: number;
  color: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface ExamStatsCardsProps {
  stats: StatItem[];
}

export function ExamStatsCards({ stats }: ExamStatsCardsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((st, i) => (
        <div
          key={i}
          className="bg-white rounded-3xl border border-gray-100 p-5 flex flex-col items-center text-center sm:flex-row sm:items-center sm:text-left sm:gap-4 gap-2 shadow-xs"
        >
          <div
            className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-inner",
              st.color,
            )}
          >
            <st.icon className="w-5.5 h-5.5" />
          </div>
          <div>
            <p className="text-2xl font-extrabold text-gray-900 leading-none">
              {st.value}
            </p>
            <p className="text-[10px] text-gray-400 mt-1.5 uppercase font-bold tracking-wider">
              {st.label}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
