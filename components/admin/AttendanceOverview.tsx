import { useQueries } from "@tanstack/react-query";
import {
  ClassProgressOverview,
  type ClassProgress,
} from "@/components/admin/ClassProgressOverview";
import { ApiErrorBanner } from "@/components/ui/ApiErrorBanner";
import { getClassAttendance } from "@/lib/attendance-api";
import type { ClassRecord } from "@/lib/classes-api";
import { queryKeys } from "@/lib/queryKeys";

export function AttendanceOverview({
  classes,
  clientId,
  token,
  academicYearId,
  range,
  date,
  onClassChange,
}: {
  classes: ClassRecord[];
  clientId: string;
  token: string;
  academicYearId?: string | null;
  range: { from: string; to: string };
  date?: string;
  onClassChange: (classId: string) => void;
}) {
  const queries = useQueries({
    queries: classes.map((cls) => ({
      queryKey: [
        ...queryKeys.attendance.all,
        "admin-overview",
        clientId,
        cls.id,
        academicYearId,
        date ?? range,
      ],
      enabled: !!clientId && !!token,
      staleTime: 60_000,
      queryFn: async ({ signal }: { signal: AbortSignal }) => {
        let skip = 0;
        let present = 0;
        let absent = 0;
        let other = 0;
        const days = new Set<string>();
        while (true) {
          const page = await getClassAttendance(
            clientId,
            token,
            {
              ...(date ? { date } : range.from === "ALL" ? {} : range),
              classId: cls.id,
              ...(academicYearId ? { academicYearId } : {}),
              skip,
              take: 1000,
            },
            signal,
          );
          for (const record of page.records) {
            days.add(record.date.slice(0, 10));
            if (record.status === "PRESENT") present++;
            else if (record.status === "ABSENT") absent++;
            else other++;
          }
          skip += page.records.length;
          if (!page.records.length || skip >= page.total) break;
        }
        return { present, absent, other, days: [...days] };
      },
    })),
  });
  const failed = queries.filter((query) => query.isError);
  if (failed.length)
    return (
      <ApiErrorBanner
        message={
          failed[0].error?.message ?? "Could not load attendance overview"
        }
        onRetry={() => {
          failed.forEach((query) => {
            void query.refetch();
          });
        }}
      />
    );
  const progress: ClassProgress[] = queries.flatMap((query, index) =>
    query.data
      ? [
          {
            classId: classes[index].id,
            completed: query.data.present,
            total: query.data.present + query.data.absent + query.data.other,
            metrics: [
              { label: "Present", value: query.data.present },
              { label: "Absent", value: query.data.absent },
              { label: "Other statuses", value: query.data.other },
              { label: "Days recorded", value: query.data.days.length },
            ],
          },
        ]
      : [],
  );
  const allDays = new Set(queries.flatMap((query) => query.data?.days ?? []));
  return (
    <ClassProgressOverview
      classes={classes}
      progress={progress}
      loading={queries.some((query) => query.isPending)}
      title={date ? "Daily attendance" : "Attendance overview"}
      progressLabel="Attendance rate"
      description={
        date
          ? "Saved attendance across all classes for the selected day. Select a class to see its students and edit attendance."
          : "Present records as a share of all saved attendance in this period. Select a class below to see its students and daily attendance."
      }
      summary={[
        { label: "Classes", value: classes.length },
        {
          label: "Students",
          value: classes.reduce((sum, cls) => sum + cls.studentCount, 0),
        },
        {
          label: "Attendance records",
          value: progress.reduce((sum, item) => sum + item.total, 0),
        },
        { label: "Days recorded", value: allDays.size },
      ]}
      onClassChange={onClassChange}
    />
  );
}
