import { useState, useEffect } from "react"; // eslint-disable-line @typescript-eslint/no-unused-vars
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  type ClassAttendanceRecord,
} from "@/lib/attendance-api";
import { useClassAttendance } from "@/lib/api-hooks";
import { useAuthStore } from "@/store/auth";
import { useLanguageStore } from "@/store/language";
import { t } from "@/lib/i18n";
import { UserCheck, RefreshCw } from "lucide-react";
import { SkeletonList } from "@/components/ui/Skeleton";

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export default function AdminPresentPage() {
  const { lang } = useLanguageStore();
  const { user } = useAuthStore();

  const today = todayISO();

  const { data: attendanceData, isLoading: loading, error: attendanceError, refetch } = useClassAttendance({
    date: today,
    take: 500,
    ...(user?.defaultAcademicYearId
      ? { academicYearId: user.defaultAcademicYearId }
      : {}),
  });

  const records = attendanceData?.records ?? [];
  const present = records.filter((r) => r.status === "PRESENT");

  // Group by class name
  const byClass = present.reduce<Record<string, ClassAttendanceRecord[]>>(
    (acc, r) => {
      const name = r.class?.name ?? "Unknown";
      (acc[name] ??= []).push(r);
      return acc;
    },
    {},
  );

  return (
    <DashboardLayout>
      <PageHeader
        title={t("adminPages", "presentTitle", lang)}
        subtitle={fmtDate(today)}
        icon={UserCheck}
        back
        backHref="/admin"
      />

      {!loading && !attendanceError && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-emerald-700">
              {present.length}
            </span>
            <span className="text-sm text-gray-500">
              {t("common", "present", lang)} today
            </span>
          </div>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600"
          >
            <RefreshCw className="w-3 h-3" /> Refresh
          </button>
        </div>
      )}

      {loading ? (
        <SkeletonList count={4} />
      ) : attendanceError ? (
        <div className="px-4 py-4 text-sm text-red-600 bg-red-50 rounded-2xl">
          {attendanceError.message}
        </div>
      ) : present.length === 0 ? (
        <div className="py-12 text-center text-sm text-gray-400">
          No attendance marked yet for today
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(byClass)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([className, students]) => (
              <div
                key={className}
                className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
              >
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
                  <p className="font-bold text-gray-800 text-sm">{className}</p>
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg">
                    {students.length} {t("common", "present", lang)}
                  </span>
                </div>
                <div className="divide-y divide-gray-50">
                  {students.map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center gap-3 px-4 py-2.5"
                    >
                      <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold shrink-0">
                        {r.student.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {r.student.name}
                        </p>
                        <p className="text-xs text-gray-400">
                          {r.student.adno}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}
    </DashboardLayout>
  );
}
