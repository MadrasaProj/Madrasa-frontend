import { ChevronRight, School } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/Skeleton";
import type { ClassRecord } from "@/lib/classes-api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export interface ClassProgress {
  classId: string;
  completed: number;
  total: number;
  metrics: { label: string; value: number | string }[];
}

const chartConfig = {
  progress: { label: "Progress", color: "var(--primary)" },
};

function ProgressRing({
  completed,
  total,
  label,
}: {
  completed: number;
  total: number;
  label: string;
}) {
  const rate = total ? Math.round((completed / total) * 100) : null;
  return (
    <div
      className="relative size-24 shrink-0"
      role="img"
      aria-label={`${label}: ${rate === null ? "No progress data" : `${rate}%`}`}
    >
      <ChartContainer
        config={chartConfig}
        initialDimension={{ width: 96, height: 96 }}
        className="!aspect-square size-24"
        aria-hidden="true"
      >
        <PieChart accessibilityLayer={false}>
          <Pie
            data={[
              { value: completed },
              { value: Math.max(0, total - completed) || (total ? 0 : 1) },
            ]}
            dataKey="value"
            startAngle={90}
            endAngle={-270}
            innerRadius={34}
            outerRadius={43}
            strokeWidth={0}
            isAnimationActive={false}
          >
            <Cell fill="var(--primary)" />
            <Cell fill="var(--color-primary-100)" />
          </Pie>
        </PieChart>
      </ChartContainer>
      <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-lg font-bold tabular-nums text-gray-900">
        {rate === null ? "—" : `${rate}%`}
      </span>
    </div>
  );
}

export function ClassProgressOverview({
  classes,
  progress,
  loading,
  title,
  progressLabel,
  description,
  summary,
  onClassChange,
}: {
  classes: ClassRecord[];
  progress: ClassProgress[];
  loading: boolean;
  title: string;
  progressLabel: string;
  description: string;
  summary: { label: string; value: number | string }[];
  onClassChange: (classId: string) => void;
}) {
  const sorted = [...classes].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, {
      numeric: true,
      sensitivity: "base",
    }),
  );
  const byClass = new Map(progress.map((item) => [item.classId, item]));
  const completed = progress.reduce((sum, item) => sum + item.completed, 0);
  const total = progress.reduce((sum, item) => sum + item.total, 0);
  const chartData = sorted.map((cls) => {
    const item = byClass.get(cls.id);
    return {
      name: cls.name,
      progress: item?.total
        ? Math.round((item.completed / item.total) * 100)
        : null,
    };
  });

  if (loading)
    return (
      <div
        className="space-y-4"
        aria-busy="true"
        aria-label={`Loading ${title.toLowerCase()}`}
      >
        <Skeleton className="h-80 w-full rounded-2xl" />
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-48 rounded-2xl" />
          ))}
        </div>
      </div>
    );

  if (!classes.length)
    return (
      <p className="rounded-2xl bg-white p-8 text-center text-sm text-gray-500">
        No classes found.
      </p>
    );

  return (
    <div className="space-y-6">
      <Card
        className="gap-0 rounded-2xl border-0 py-0 ring-0"
        role="region"
        aria-label={title}
      >
        <CardHeader className="flex flex-wrap items-center justify-between gap-4 border-b border-primary-100/40 bg-gradient-to-br from-primary-50/60 via-white to-primary-50/30 p-4 sm:p-5">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary-700">
              All classes
            </p>
            <CardTitle
              className="mt-1 text-lg font-bold text-gray-900"
              role="heading"
              aria-level={2}
            >
              {title}
            </CardTitle>
            <CardDescription className="mt-1 max-w-xl text-sm text-gray-500">
              {description}
            </CardDescription>
          </div>
          <div className="text-center">
            <ProgressRing
              completed={completed}
              total={total}
              label={progressLabel}
            />
            <p className="text-xs font-medium text-gray-500">{progressLabel}</p>
          </div>
        </CardHeader>
        <CardContent className="px-0">
          <dl className="grid grid-cols-2 overflow-hidden bg-gradient-to-br from-primary-50/60 via-white to-primary-50/30 sm:grid-cols-4">
            {summary.map((metric) => (
              <div
                key={metric.label}
                className="border-b border-r border-primary-100/40 p-2.5 last:border-r-0 sm:p-3"
              >
                <dt className="text-sm font-medium text-gray-700">
                  {metric.label}
                </dt>
                <dd className="mt-1.5 text-[22px] font-medium leading-none tabular-nums text-gray-950">
                  {metric.value}
                </dd>
              </div>
            ))}
          </dl>
        </CardContent>
        <CardContent className="p-4 sm:p-5">
          <h3 className="mb-4 text-sm font-semibold text-gray-700">
            {progressLabel} by class
          </h3>
          <div className="overflow-x-auto">
            <ChartContainer
              config={chartConfig}
              className="!aspect-auto h-52 w-full"
              style={{ minWidth: Math.max(280, classes.length * 64) }}
              aria-label={`${progressLabel} comparison across classes`}
            >
              <BarChart
                data={chartData}
                accessibilityLayer
                margin={{ left: -20, right: 8 }}
              >
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  interval={0}
                  tickMargin={8}
                  fontSize={12}
                />
                <YAxis
                  domain={[0, 100]}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${value}%`}
                  fontSize={11}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent formatter={(value) => `${value}%`} />
                  }
                />
                <Bar
                  dataKey="progress"
                  fill="var(--color-progress)"
                  radius={[5, 5, 0, 0]}
                  maxBarSize={48}
                  isAnimationActive={false}
                />
              </BarChart>
            </ChartContainer>
          </div>
        </CardContent>
      </Card>

      <section aria-label="Class summaries">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-base font-semibold text-gray-900">
            Classes{" "}
            <span className="ml-1 text-sm font-normal text-gray-400">
              {classes.length}
            </span>
          </h2>
          <p className="text-xs text-gray-500">
            Select a class to view details
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sorted.map((cls) => {
            const item = byClass.get(cls.id);
            return (
              <Card
                key={cls.id}
                className="rounded-2xl border-0 bg-white py-0 ring-0"
              >
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => onClassChange(cls.id)}
                  className="block h-auto w-full whitespace-normal rounded-2xl p-4 text-left hover:bg-primary-50/40"
                >
                  <div className="flex items-center gap-3">
                    <span className="rounded-xl bg-primary-50 p-2 text-primary-600">
                      <School className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-semibold text-gray-900">
                        {cls.name}
                      </h3>
                      <p className="truncate text-xs text-gray-500">
                        {cls.studentCount} students
                        {cls.classTeacher ? ` · ${cls.classTeacher.name}` : ""}
                      </p>
                    </div>
                    <ChevronRight className="size-4 shrink-0 text-gray-400" />
                  </div>
                  <div className="mt-3 flex items-center gap-4">
                    <ProgressRing
                      completed={item?.completed ?? 0}
                      total={item?.total ?? 0}
                      label={`${cls.name} ${progressLabel}`}
                    />
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <p className="text-xs font-medium text-gray-500">
                        {progressLabel}
                      </p>
                      {item?.metrics.map((metric) => (
                        <div
                          key={metric.label}
                          className="flex justify-between gap-2 text-xs"
                        >
                          <span className="text-gray-500">{metric.label}</span>
                          <span className="font-semibold tabular-nums text-gray-800">
                            {metric.value}
                          </span>
                        </div>
                      ))}
                      {!item?.total && (
                        <p className="text-xs text-gray-400">
                          No progress data in this period
                        </p>
                      )}
                    </div>
                  </div>
                </Button>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}
