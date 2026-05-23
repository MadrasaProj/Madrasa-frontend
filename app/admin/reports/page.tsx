import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { ApiErrorBanner } from "@/components/ui/ApiErrorBanner";
import {
  getStudentStats, getFeeSummary, getAttendanceSummary, getHomeworkSummary,
  type StudentStats, type FeeSummary, type AttendanceSummary, type HomeworkSummary,
} from "@/lib/reports-api";
import { useAuthStore } from "@/store/auth";
import { cn } from "@/lib/utils";
import {
  BarChart3, Users, IndianRupee, ClipboardList, BookOpen,
  Loader2, RefreshCw, TrendingUp,
} from "lucide-react";
import { motion } from "framer-motion";
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

const GENDER_COLORS = { MALE: "#3b82f6", FEMALE: "#f472b6", OTHER: "#a78bfa" };
const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "#10b981", INACTIVE: "#f59e0b", GRADUATED: "#3b82f6",
  TRANSFERRED: "#8b5cf6", DROPPED_OUT: "#ef4444",
};
const FEE_COLORS: Record<string, string> = {
  PAID: "#10b981", PENDING: "#f59e0b", PARTIAL: "#3b82f6",
  OVERDUE: "#ef4444", WAIVED: "#9ca3af",
};
const ATT_COLORS: Record<string, string> = {
  PRESENT: "#10b981", ABSENT: "#ef4444", LATE: "#f59e0b", EXCUSED: "#3b82f6",
};

export default function AdminReportsPage() {
  const { user, accessToken, activeClientId } = useAuthStore();
  const cid   = activeClientId ?? "";
  const token = accessToken ?? "";
  const ayId  = user?.defaultAcademicYearId ?? "";

  const [students, setStudents]     = useState<StudentStats | null>(null);
  const [fees, setFees]             = useState<FeeSummary | null>(null);
  const [attendance, setAttendance] = useState<AttendanceSummary | null>(null);
  const [homework, setHomework]     = useState<HomeworkSummary | null>(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!cid || !token) return;
    setError(null); setLoading(true);
    try {
      const [s, f, a, h] = await Promise.all([
        getStudentStats(cid, token).catch((e) => { setError((e as Error).message); return null; }),
        getFeeSummary(cid, token, ayId || undefined).catch((e) => { setError((e as Error).message); return null; }),
        getAttendanceSummary(cid, token).catch((e) => { setError((e as Error).message); return null; }),
        getHomeworkSummary(cid, token).catch((e) => { setError((e as Error).message); return null; }),
      ]);
      setStudents(s);
      setFees(f);
      setAttendance(a);
      setHomework(h);
    } finally {
      setLoading(false);
    }
  }, [cid, token, ayId]);

  useEffect(() => { load(); }, [load]);

  const genderData = students?.byGender.map((g) => ({
    name: g.gender,
    value: g._count.id,
    fill: (GENDER_COLORS as any)[g.gender] ?? "#9ca3af",
  })) ?? [];

  const feeData = fees?.byStatus.map((s) => ({
    name: s.status,
    amount: Number(s._sum.paidAmount ?? 0),
    fill: FEE_COLORS[s.status] ?? "#9ca3af",
  })) ?? [];

  const attData = attendance?.byStatus.map((s) => ({
    name: s.status,
    count: s._count.id,
    fill: ATT_COLORS[s.status] ?? "#9ca3af",
  })) ?? [];

  const hwData = homework?.byStatus.map((s) => ({
    name: s.status.replace("_", " "),
    count: s._count.id,
    fill: s.status === "CHECKED" ? "#10b981" : s.status === "SUBMITTED" ? "#f59e0b" : "#ef4444",
  })) ?? [];

  return (
    <DashboardLayout>
      <PageHeader
        title="Reports & Analytics"
        icon={BarChart3}
        action={
          <button onClick={load} className="p-2 rounded-xl bg-gray-100 text-gray-600">
            <RefreshCw className="w-4 h-4" />
          </button>
        }
      />

      {error && <ApiErrorBanner message={error} onRetry={load} />}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      ) : (
        <div className="space-y-5 pb-20">

          {/* ── Student Stats ── */}
          {students && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Users className="w-4 h-4 text-blue-600" />
                </div>
                <p className="font-bold text-gray-900">Students</p>
                <span className="ml-auto text-2xl font-bold text-gray-900">{students.total}</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {/* By status */}
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase mb-2">By Status</p>
                  <div className="space-y-1.5">
                    {students.byStatus.map((s) => {
                      const pct = students.total > 0 ? (s._count.id / students.total) * 100 : 0;
                      return (
                        <div key={s.status}>
                          <div className="flex justify-between text-xs mb-0.5">
                            <span className="text-gray-600">{s.status}</span>
                            <span className="font-bold text-gray-900">{s._count.id}</span>
                          </div>
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${pct}%`, backgroundColor: STATUS_COLORS[s.status] ?? "#9ca3af" }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                {/* By gender */}
                <div className="flex flex-col items-center justify-center">
                  {genderData.length > 0 && (
                    <ResponsiveContainer width="100%" height={120}>
                      <PieChart>
                        <Pie data={genderData} cx="50%" cy="50%" innerRadius={30} outerRadius={50} dataKey="value">
                          {genderData.map((entry, index) => (
                            <Cell key={index} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v) => [v, ""]} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                  <div className="flex gap-3 text-xs mt-1">
                    {genderData.map((g) => (
                      <div key={g.name} className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: g.fill }} />
                        <span className="text-gray-600">{g.name}: {g.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Fee Summary ── */}
          {fees && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-emerald-100 rounded-xl flex items-center justify-center">
                  <IndianRupee className="w-4 h-4 text-emerald-600" />
                </div>
                <p className="font-bold text-gray-900">Fees</p>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-emerald-50 rounded-2xl p-3 border border-emerald-100">
                  <p className="text-xs text-emerald-600 mb-1">Collected</p>
                  <p className="text-xl font-bold text-emerald-700">₹{Number(fees.totalCollected).toLocaleString()}</p>
                </div>
                <div className="bg-red-50 rounded-2xl p-3 border border-red-100">
                  <p className="text-xs text-red-500 mb-1">Pending</p>
                  <p className="text-xl font-bold text-red-600">₹{Number(fees.totalPending).toLocaleString()}</p>
                </div>
              </div>
              {feeData.length > 0 && (
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={feeData} barSize={32}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v) => [`₹${Number(v).toLocaleString()}`, "Amount"]} />
                    <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                      {feeData.map((entry, index) => (
                        <Cell key={index} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          )}

          {/* ── Attendance + Homework in grid ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Attendance */}
            {attendance && (
              <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-orange-100 rounded-xl flex items-center justify-center">
                    <ClipboardList className="w-4 h-4 text-orange-600" />
                  </div>
                  <p className="font-bold text-gray-900 text-sm">Attendance</p>
                  <span className={cn("ml-auto text-sm font-bold", attendance.rate >= 75 ? "text-emerald-600" : "text-red-500")}>
                    {attendance.rate}%
                  </span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-3">
                  <div
                    className="h-full rounded-full bg-emerald-500"
                    style={{ width: `${attendance.rate}%` }}
                  />
                </div>
                <div className="space-y-1.5">
                  {attendance.byStatus.map((s) => (
                    <div key={s.status} className="flex justify-between text-xs">
                      <span className="text-gray-600">{s.status}</span>
                      <span className="font-bold" style={{ color: ATT_COLORS[s.status] ?? "#9ca3af" }}>
                        {s._count.id}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Homework */}
            {homework && (
              <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-xl flex items-center justify-center">
                    <BookOpen className="w-4 h-4 text-blue-600" />
                  </div>
                  <p className="font-bold text-gray-900 text-sm">Homework</p>
                  <span className={cn("ml-auto text-sm font-bold", homework.completionRate >= 60 ? "text-emerald-600" : "text-amber-600")}>
                    {homework.completionRate}%
                  </span>
                </div>
                <p className="text-xs text-gray-400 mb-3">{homework.totalAssignments} active assignments</p>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-3">
                  <div
                    className="h-full rounded-full bg-blue-500"
                    style={{ width: `${homework.completionRate}%` }}
                  />
                </div>
                {hwData.length > 0 && (
                  <ResponsiveContainer width="100%" height={80}>
                    <BarChart data={hwData} barSize={24}>
                      <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                      <Tooltip />
                      <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                        {hwData.map((entry, index) => (
                          <Cell key={index} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
