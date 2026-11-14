import { useState } from "react";
import { useQueries } from "@tanstack/react-query";
import {
  ClassProgressOverview,
  type ClassProgress,
} from "@/components/admin/ClassProgressOverview";
import {
  ScrollableRangeNavigator,
  formatRangeDate,
} from "@/components/ScrollableRangeNavigator";
import { ApiErrorBanner } from "@/components/ui/ApiErrorBanner";
import type { ClassRecord } from "@/lib/classes-api";
import { getClassIbadah } from "@/lib/ibadah-api";
import { queryKeys } from "@/lib/queryKeys";
import { ScrollableDateNavigator } from "@/components/ScrollableDateNavigator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const prayers = [
  ["fajr", "enableFajr"],
  ["dhuhr", "enableDhuhr"],
  ["asr", "enableAsr"],
  ["maghrib", "enableMaghrib"],
  ["isha", "enableIsha"],
] as const;

export function IbadahOverview({
  classes,
  clientId,
  token,
  academicYearId,
  date,
  onDateChange,
  onClassChange,
}: {
  classes: ClassRecord[];
  clientId: string;
  token: string;
  academicYearId?: string | null;
  date: string;
  onDateChange: (date: string) => void;
  onClassChange: (classId: string) => void;
}) {
  const [view, setView] = useState("overview");
  const [range, setRange] = useState(() => {
    const now = new Date();
    return {
      from: formatRangeDate(new Date(now.getFullYear(), now.getMonth(), 1)),
      to: formatRangeDate(now),
    };
  });
  const queries = useQueries({
    queries: classes.map((cls) => ({
      queryKey: [
        ...queryKeys.ibadah.all,
        "admin-overview",
        clientId,
        cls.id,
        academicYearId,
        view === "daily" ? date : range,
      ],
      enabled: !!clientId && !!token,
      staleTime: 60_000,
      queryFn: async () => {
        const { logs, config } = await getClassIbadah(clientId, token, {
          classId: cls.id,
          ...(view === "daily" ? { date } : range.from === "ALL" ? {} : range),
          ...(academicYearId ? { academicYearId } : {}),
        });
        const activePrayers = prayers.filter(
          ([, configKey]) => config[configKey] !== false,
        );
        let completed = 0;
        let excused = 0;
        let quranPages = 0;
        const days = new Set<string>();
        const students = new Set<string>();
        for (const log of logs) {
          days.add(log.date.slice(0, 10));
          students.add(log.studentId);
          if (config.enableQuranPages !== false)
            quranPages += log.quranPages ?? 0;
          for (const [key] of activePrayers) {
            if (log[key] === "NOT_PRAYABLE") excused++;
            else if (
              log[key] === "JAMA" ||
              log[key] === "ADA" ||
              log[key] === "QALA"
            )
              completed++;
          }
        }
        return {
          completed,
          total: logs.length * activePrayers.length - excused,
          quranPages,
          days: days.size,
          students: students.size,
          logs: logs.length,
        };
      },
    })),
  });
  const failed = queries.filter((query) => query.isError);
  const progress: ClassProgress[] = queries.flatMap((query, index) =>
    query.data
      ? [
          {
            classId: classes[index].id,
            completed: query.data.completed,
            total: query.data.total,
            metrics: [
              {
                label: "Prayers completed",
                value: `${query.data.completed}/${query.data.total}`,
              },
              {
                label: "Students reporting",
                value: `${query.data.students}/${classes[index].studentCount}`,
              },
              { label: "Days reported", value: query.data.days },
              { label: "Quran pages", value: query.data.quranPages },
            ],
          },
        ]
      : [],
  );
  return (
    <Tabs value={view} onValueChange={setView}>
      <TabsList className="mb-4 grid w-max grid-cols-2">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="daily">Daily</TabsTrigger>
      </TabsList>
      <div className="mb-4">
        {view === "daily" ? (
          <ScrollableDateNavigator
            date={date}
            onDateChange={onDateChange}
            pickerTitle="Choose ibadah date"
          />
        ) : (
          <ScrollableRangeNavigator
            from={range.from}
            to={range.to}
            onChange={setRange}
            allowAllTime
            title="Ibadah overview date range"
          />
        )}
      </div>
      <TabsContent value={view}>
        {failed.length ? (
          <ApiErrorBanner
            message={
              failed[0].error?.message ?? "Could not load ibadah overview"
            }
            onRetry={() => {
              failed.forEach((query) => {
                void query.refetch();
              });
            }}
          />
        ) : (
          <ClassProgressOverview
            classes={classes}
            progress={progress}
            loading={queries.some((query) => query.isPending)}
            title={view === "daily" ? "Daily ibadah" : "Ibadah overview"}
            progressLabel="Prayer completion"
            description="Completed prayers, including made-up prayers, across submitted daily logs. Excused prayers are excluded; days without a log are not included."
            summary={[
              { label: "Classes", value: classes.length },
              {
                label: "Students",
                value: classes.reduce((sum, cls) => sum + cls.studentCount, 0),
              },
              {
                label: "Daily logs",
                value: queries.reduce(
                  (sum, query) => sum + (query.data?.logs ?? 0),
                  0,
                ),
              },
              {
                label: "Quran pages",
                value: queries.reduce(
                  (sum, query) => sum + (query.data?.quranPages ?? 0),
                  0,
                ),
              },
            ]}
            onClassChange={onClassChange}
          />
        )}
      </TabsContent>
    </Tabs>
  );
}
