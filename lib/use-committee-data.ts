"use client";
import { useState, useEffect } from "react";
import { getStudentStats } from "@/lib/reports-api";
import { getFeeSummary } from "@/lib/reports-api";
import { getAttendanceSummary } from "@/lib/reports-api";
import { getNotifications } from "@/lib/notifications-api";
import { useAuthStore } from "@/store/auth";

export interface CommitteeData {
  loading: boolean;
  overview: {
    totalStudents: number;
    activeStudents: number;
    maleCount: number;
    femaleCount: number;
    totalTeachers: number;
    totalClasses: number;
  };
  fees: {
    totalCollected: number;
    totalPending: number;
    collectionPct: number;
    collectedSoFar: number;
    pendingAmount: number;
    paidStudents: number;
    unpaidStudents: number;
    totalAnnualTarget: number;
    byStatus: { status: string; count: number; amount: number }[];
    monthlyTrend: {
      month: string;
      month_ml?: string;
      collected: number;
      pending: number;
      target?: number;
    }[];
    byType: { name: string; collected: number; pending: number }[];
  };
  attendance: {
    overallPct: number;
    presentCount: number;
    absentCount: number;
    todayPresent: number;
    todayAbsent: number;
    total: number;
    weeklyTrend: {
      day: string;
      day_ml?: string;
      present: number;
      absent: number;
    }[];
    lowAttendanceStudents: number;
    byClass: { name: string; pct: number; present: number; total: number }[];
    staff: {
      presentToday: number;
      totalStaff: number;
      presentPct: number;
      weeklyTrend: {
        day: string;
        day_ml?: string;
        present: number;
        absent: number;
      }[];
      overallPct?: number;
      absentToday?: number;
      onLeaveToday?: number;
      staffList?: {
        id: string;
        name: string;
        todayStatus: string;
        attendancePct: number;
        subject?: string;
        subject_ml?: string;
        role?: string;
        role_ml?: string;
      }[];
    };
  };
  students: {
    total: number;
    active: number;
    inactive: number;
    maleCount: number;
    femaleCount: number;
    byStatus: { status: string; count: number }[];
    classBreakdown: {
      name: string;
      count: number;
      male: number;
      female: number;
    }[];
    topStudents: { name: string; adno: string; score: number }[];
  };
  madrasa?: {
    name?: string;
    session?: string;
    logo?: string;
    slug?: string;
    location?: string;
    established?: string;
    name_ml?: string;
  };
  announcements: {
    id: string;
    title: string;
    title_ml: string;
    body: string;
    type: string;
    priority: "high" | "medium" | "low";
    createdAt: string;
    date: string;
    madrasa?: { session: string };
  }[];
  academic: {
    passRate: number;
    avgScore: number;
    lastExamAvgScore?: number;
    topStudents?: any[];
    classStats?: {
      name: string;
      passRate: number;
      avgScore: number;
      attendancePct?: number;
      className?: string;
      students?: number;
      hwCompletion?: number;
    }[];
  };
  ibadah: {
    quranCompletionPct: number;
    fajrPct: number;
    fullPrayerPct: number;
    prayerTrackedStudents?: any[];
    ibadahChampions?: any[];
  };
  elections: {
    activeCount: number;
    completedCount: number;
    pendingNominations: number;
    totalVoters: number;
    totalVotesCast: number;
    results: any[];
    sksbvUnionMembers: any[];
  };
  expenses: {
    totalBudget: number;
    totalSpent: number;
    totalPending: number;
    categories: any[];
    recentItems: any[];
    recentExpenses: any[];
    monthlyTrend: any[];
    annualBudget: number;
  };
}

const EMPTY: CommitteeData = {
  loading: true,
  overview: {
    totalStudents: 0,
    activeStudents: 0,
    maleCount: 0,
    femaleCount: 0,
    totalTeachers: 0,
    totalClasses: 0,
  },
  fees: {
    totalCollected: 0,
    totalPending: 0,
    collectionPct: 0,
    collectedSoFar: 0,
    pendingAmount: 0,
    paidStudents: 0,
    unpaidStudents: 0,
    totalAnnualTarget: 0,
    byStatus: [],
    monthlyTrend: [],
    byType: [],
  },
  attendance: {
    overallPct: 0,
    presentCount: 0,
    absentCount: 0,
    todayPresent: 0,
    todayAbsent: 0,
    total: 0,
    weeklyTrend: [],
    lowAttendanceStudents: 0,
    byClass: [],
    staff: {
      presentToday: 0,
      totalStaff: 0,
      presentPct: 0,
      weeklyTrend: [],
      overallPct: 0,
      absentToday: 0,
      onLeaveToday: 0,
      staffList: [],
    },
  },
  students: {
    total: 0,
    active: 0,
    inactive: 0,
    maleCount: 0,
    femaleCount: 0,
    byStatus: [],
    classBreakdown: [],
    topStudents: [],
  },
  announcements: [],
  academic: { passRate: 0, avgScore: 0, classStats: [] },
  ibadah: { quranCompletionPct: 0, fajrPct: 0, fullPrayerPct: 0 },
  elections: {
    activeCount: 0,
    completedCount: 0,
    pendingNominations: 0,
    totalVoters: 0,
    totalVotesCast: 0,
    results: [],
    sksbvUnionMembers: [],
  },
  expenses: {
    totalBudget: 0,
    totalSpent: 0,
    totalPending: 0,
    categories: [],
    recentItems: [],
    recentExpenses: [],
    monthlyTrend: [],
    annualBudget: 0,
  },
};

export function useCommitteeData(): CommitteeData {
  const { user, accessToken } = useAuthStore();
  const [data, setData] = useState<CommitteeData>(EMPTY);

  const cid = user?.clientId ?? "";
  const token = accessToken ?? "";
  const ayId = user?.defaultAcademicYearId ?? "";

  useEffect(() => {
    if (!cid || !token) return;
    let cancelled = false;

    Promise.all([
      getStudentStats(cid, token).catch(() => null),
      getFeeSummary(cid, token, ayId || undefined).catch(() => null),
      getAttendanceSummary(cid, token).catch(() => null),
      getNotifications(cid, token, { take: 20 }).catch(() => null),
    ]).then(([stu, fee, att, notif]) => {
      if (cancelled) return;

      const totalStudents = stu?.total ?? 0;
      const activeStudents =
        stu?.byStatus.find((s) => s.status === "ACTIVE")?._count.id ?? 0;
      const maleCount =
        stu?.byGender.find((g) => g.gender === "MALE")?._count.id ?? 0;
      const femaleCount =
        stu?.byGender.find((g) => g.gender === "FEMALE")?._count.id ?? 0;

      const collected = Number(fee?.totalCollected ?? 0);
      const pending = Number(fee?.totalPending ?? 0);
      const totalTarget = collected + pending;
      const collPct =
        totalTarget > 0 ? Math.round((collected / totalTarget) * 100) : 0;
      const paidCount =
        fee?.byStatus.find((s) => s.status === "PAID")?._count.id ?? 0;
      const unpaidCount =
        (fee?.byStatus.reduce((s, r) => s + r._count.id, 0) ?? 0) - paidCount;

      const attPresent = att?.present ?? 0;
      const attTotal = att?.total ?? 0;
      const attRate = att?.rate ?? 0;

      const notifList = (notif?.notifications ?? []).map((n) => ({
        id: n.id,
        title: n.title,
        title_ml: n.title,
        body: n.body,
        type: n.type,
        priority: (n.type === "FEE_REMINDER" || n.type === "ATTENDANCE_ALERT"
          ? "high"
          : "medium") as "high" | "medium" | "low",
        createdAt: n.createdAt,
        date: new Date(n.createdAt).toLocaleDateString("en-GB"),
      }));

      setData({
        loading: false,
        overview: {
          totalStudents,
          activeStudents,
          maleCount,
          femaleCount,
          totalTeachers: 0,
          totalClasses: 0,
        },
        fees: {
          totalCollected: collected,
          totalPending: pending,
          collectionPct: collPct,
          collectedSoFar: collected,
          pendingAmount: pending,
          paidStudents: paidCount,
          unpaidStudents: unpaidCount,
          totalAnnualTarget: totalTarget,
          byStatus: (fee?.byStatus ?? []).map((s) => ({
            status: s.status,
            count: s._count.id,
            amount: Number(s._sum.paidAmount ?? s._sum.dueAmount ?? 0),
          })),
          monthlyTrend: [],
          byType: [],
        },
        attendance: {
          overallPct: attRate,
          presentCount: attPresent,
          absentCount: attTotal - attPresent,
          todayPresent: attPresent,
          todayAbsent: attTotal - attPresent,
          total: attTotal,
          weeklyTrend: [],
          lowAttendanceStudents: 0,
          byClass: [],
          staff: {
            presentToday: 0,
            totalStaff: 0,
            presentPct: 0,
            weeklyTrend: [],
            overallPct: 0,
            absentToday: 0,
            onLeaveToday: 0,
            staffList: [],
          },
        },
        students: {
          total: totalStudents,
          active: activeStudents,
          inactive: totalStudents - activeStudents,
          maleCount,
          femaleCount,
          byStatus: (stu?.byStatus ?? []).map((s) => ({
            status: s.status,
            count: s._count.id,
          })),
          classBreakdown: [],
          topStudents: [],
        },
        announcements: notifList,
        academic: { passRate: 0, avgScore: 0, classStats: [] },
        ibadah: { quranCompletionPct: 0, fajrPct: 0, fullPrayerPct: 0 },
        elections: {
          activeCount: 0,
          completedCount: 0,
          pendingNominations: 0,
          totalVoters: 0,
          totalVotesCast: 0,
          results: [],
          sksbvUnionMembers: [],
        },
        expenses: {
          totalBudget: 0,
          totalSpent: 0,
          totalPending: 0,
          categories: [],
          recentItems: [],
          recentExpenses: [],
          monthlyTrend: [],
          annualBudget: 0,
        },
      });
    });

    return () => {
      cancelled = true;
    };
  }, [cid, token, ayId]);

  return data;
}
