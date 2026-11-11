import { Cell, Pie, PieChart, PolarAngleAxis, RadialBar, RadialBarChart } from "recharts";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";

const attendanceChartConfig = {
  present: { color: "#059669" },
  absent: { color: "#dc2626" },
  other: { color: "#f59e0b" },
} satisfies ChartConfig;

export function AttendanceSemiCircle({
  segments,
  value,
  label,
  description,
}: {
  segments: { key: keyof typeof attendanceChartConfig; value: number }[];
  value: string;
  label: string;
  description: string;
}) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  const chartData = total > 0 ? segments : [{ key: "empty" as const, value: 1 }];

  return (
    <div role="img" aria-label={description} className="relative mx-auto w-full max-w-56">
      <ChartContainer config={attendanceChartConfig} className="!aspect-auto h-28 w-full" aria-hidden="true">
        <PieChart>
          <Pie data={chartData} dataKey="value" nameKey="key" startAngle={180} endAngle={0} cx="50%" cy="95%" innerRadius={68} outerRadius={88} cornerRadius={3} strokeWidth={0} isAnimationActive={false}>
            {chartData.map((entry) => (
              <Cell key={entry.key} fill={entry.key === "empty" ? "#e5e7eb" : `var(--color-${entry.key})`} />
            ))}
          </Pie>
        </PieChart>
      </ChartContainer>
      <span className="pointer-events-none absolute inset-x-0 top-14 text-2xl font-semibold tabular-nums text-gray-950">{value}</span>
      <span className="-mt-7 block text-sm font-medium text-gray-500">{label}</span>
    </div>
  );
}

const studentProgressChartConfig = {
  attendance: { color: "#059669" },
} satisfies ChartConfig;

export function StudentAttendanceRadial({ rate, description }: { rate: number | null; description: string }) {
  const value = rate === null ? 0 : Math.max(0, Math.min(100, rate));

  return (
    <div className="relative h-9 w-14 shrink-0" role="img" aria-label={description}>
      <ChartContainer config={studentProgressChartConfig} initialDimension={{ width: 56, height: 36 }} className="!aspect-auto h-9 w-14" aria-hidden="true">
        <RadialBarChart data={[{ value, fill: rate !== null && rate < 75 ? "#dc2626" : "#059669" }]} startAngle={180} endAngle={0} cx="50%" cy="95%" innerRadius={19} outerRadius={24}>
          <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
          <RadialBar dataKey="value" background={{ fill: "#e5e7eb" }} cornerRadius={4} isAnimationActive={false} />
        </RadialBarChart>
      </ChartContainer>
      <span className="pointer-events-none absolute inset-x-0 bottom-0 text-center text-xs font-semibold tabular-nums text-gray-900">
        {rate === null ? "—" : `${rate}%`}
      </span>
    </div>
  );
}
