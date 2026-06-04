import { DashboardLayout } from "@/components/DashboardLayout";
import { motion } from "framer-motion";
import { useLanguageStore } from "@/store/language";
import { useCommitteeData } from "@/lib/use-committee-data";
import { useState } from "react";
import {
  ClipboardList,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  TrendingUp,
  Users,
  GraduationCap,
  UserCheck,
  UserX,
  CalendarOff,
} from "lucide-react";

function Bar({
  value,
  color = "bg-emerald-500",
  height = "h-2",
}: {
  value: number;
  color?: string;
  height?: string;
}) {
  const safe = Math.min(100, Math.max(0, value));
  return (
    <div
      className={`w-full ${height} bg-gray-100 rounded-full overflow-hidden`}
    >
      <div
        className={`${height} ${color} rounded-full transition-all duration-700`}
        style={{ width: `${safe}%` }}
      />
    </div>
  );
}

function attColor(v: number) {
  if (v >= 90)
    return {
      text: "text-emerald-600",
      bg: "bg-emerald-50",
      bar: "bg-emerald-500",
      border: "border-emerald-200",
    };
  if (v >= 75)
    return {
      text: "text-blue-600",
      bg: "bg-blue-50",
      bar: "bg-blue-500",
      border: "border-blue-200",
    };
  if (v >= 60)
    return {
      text: "text-amber-600",
      bg: "bg-amber-50",
      bar: "bg-amber-400",
      border: "border-amber-200",
    };
  return {
    text: "text-red-600",
    bg: "bg-red-50",
    bar: "bg-red-400",
    border: "border-red-200",
  };
}

const statusConfig = {
  present: {
    label_en: "Present",
    label_ml: "ഹാജർ",
    bg: "bg-emerald-100",
    text: "text-emerald-700",
    dot: "bg-emerald-500",
  },
  absent: {
    label_en: "Absent",
    label_ml: "ഗൈർഹാജർ",
    bg: "bg-red-100",
    text: "text-red-700",
    dot: "bg-red-500",
  },
  leave: {
    label_en: "Leave",
    label_ml: "ലീവ്",
    bg: "bg-amber-100",
    text: "text-amber-700",
    dot: "bg-amber-500",
  },
};

type Tab = "students" | "staff";

export default function CommitteeAttendancePage() {
  const { lang } = useLanguageStore();
  const d = useCommitteeData();
  const [activeTab, setActiveTab] = useState<Tab>("students");

  const s = d.attendance;
  const st = d.attendance.staff;

  // Student stats
  const totalToday = s.todayPresent + s.todayAbsent;
  const todayPct = Math.round((s.todayPresent / totalToday) * 100);
  const maxStudentWeek = Math.max(
    ...s.weeklyTrend.map((w) => w.present + w.absent),
  );

  // Staff stats
  const staffTodayPct = Math.round((st.presentToday / st.totalStaff) * 100);
  const maxStaffWeek = Math.max(
    ...st.weeklyTrend.map((w) => w.present + w.absent),
  );

  return (
    <DashboardLayout>
      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-5"
      >
        <div className="bg-linear-to-r from-teal-600 to-cyan-600 rounded-3xl p-5 lg:p-6 text-white">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-teal-200 text-xs font-semibold uppercase tracking-widest">
                {lang === "ml" ? "കമ്മിറ്റി" : "Management Committee"}
              </p>
              <h1 className="text-xl font-bold">
                {lang === "ml" ? "ഹാജർ നിരീക്ഷണം" : "Attendance Monitoring"}
              </h1>
            </div>
          </div>
          {/* Two mini summary boxes */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/15 rounded-2xl p-3">
              <div className="flex items-center gap-2 mb-2">
                <GraduationCap className="w-4 h-4 text-white/70" />
                <span className="text-xs text-teal-200 font-semibold">
                  {lang === "ml" ? "വിദ്യാർത്ഥികൾ" : "Students"}
                </span>
              </div>
              <div className="flex justify-between items-end mb-1.5">
                <span className="text-2xl font-black">
                  {s.todayPresent}/{totalToday}
                </span>
                <span className="text-sm font-bold text-emerald-300">
                  {todayPct}%
                </span>
              </div>
              <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-400 rounded-full"
                  style={{ width: `${todayPct}%` }}
                />
              </div>
            </div>
            <div className="bg-white/15 rounded-2xl p-3">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-white/70" />
                <span className="text-xs text-teal-200 font-semibold">
                  {lang === "ml" ? "സ്റ്റാഫ്" : "Staff"}
                </span>
              </div>
              <div className="flex justify-between items-end mb-1.5">
                <span className="text-2xl font-black">
                  {st.presentToday}/{st.totalStaff}
                </span>
                <span className="text-sm font-bold text-emerald-300">
                  {staffTodayPct}%
                </span>
              </div>
              <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-400 rounded-full"
                  style={{ width: `${staffTodayPct}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Tab switcher ── */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex gap-2 mb-5 bg-gray-100 rounded-2xl p-1"
      >
        {[
          {
            key: "students" as Tab,
            label_en: "Students Attendance",
            label_ml: "വിദ്യാർത്ഥി ഹാജർ",
            icon: GraduationCap,
          },
          {
            key: "staff" as Tab,
            label_en: "Staff Attendance",
            label_ml: "സ്റ്റാഫ് ഹാജർ",
            icon: Users,
          },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${
              activeTab === tab.key
                ? "bg-white text-teal-700 shadow-sm"
                : "text-gray-500"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {lang === "ml" ? tab.label_ml : tab.label_en}
          </button>
        ))}
      </motion.div>

      {/* ══════════════════════════════════
           STUDENTS TAB
      ══════════════════════════════════ */}
      {activeTab === "students" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          key="students"
        >
          {/* Student stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
            {[
              {
                label: lang === "ml" ? "ഒ. ഹാജർ %" : "Overall %",
                value: `${s.overallPct}%`,
                sub: lang === "ml" ? "ശ.ശ." : "Average",
                icon: TrendingUp,
                color: "text-teal-700",
                bg: "bg-teal-50",
                border: "border-teal-200",
              },
              {
                label: lang === "ml" ? "ഇന്ന് ഹാജർ" : "Present Today",
                value: `${s.todayPresent}`,
                sub: `${todayPct}%`,
                icon: CheckCircle2,
                color: "text-emerald-700",
                bg: "bg-emerald-50",
                border: "border-emerald-200",
              },
              {
                label: lang === "ml" ? "ഗൈർഹാജർ" : "Absent Today",
                value: `${s.todayAbsent}`,
                sub: `${100 - todayPct}%`,
                icon: XCircle,
                color: "text-red-700",
                bg: "bg-red-50",
                border: "border-red-200",
              },
              {
                label: lang === "ml" ? "ശ്രദ്ധ ആവ്." : "Low Attend.",
                value: `${s.lowAttendanceStudents}`,
                sub: lang === "ml" ? "വിദ്യാർ." : "students",
                icon: AlertTriangle,
                color: "text-orange-700",
                bg: "bg-orange-50",
                border: "border-orange-200",
              },
            ].map((c, i) => (
              <motion.div
                key={c.label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className={`bg-white rounded-2xl border ${c.border} p-4 shadow-sm`}
              >
                <div
                  className={`w-9 h-9 ${c.bg} rounded-xl flex items-center justify-center mb-3`}
                >
                  <c.icon className={`w-4 h-4 ${c.color}`} />
                </div>
                <p className="text-2xl font-black text-gray-900">{c.value}</p>
                <p className="text-xs font-semibold text-gray-700 mt-0.5">
                  {c.label}
                </p>
                <p className="text-[11px] text-gray-400 mt-0.5">{c.sub}</p>
              </motion.div>
            ))}
          </div>

          {/* Student weekly bar chart */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.28 }}
            className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm mb-5"
          >
            <div className="flex items-center gap-2 mb-5">
              <ClipboardList className="w-4.5 h-4.5 text-teal-700" />
              <p className="font-bold text-gray-800">
                {lang === "ml"
                  ? "ആഴ്ചവാരി വിദ്യാർത്ഥി ഹാജർ"
                  : "Weekly Student Attendance"}
              </p>
            </div>
            <div className="flex items-end gap-2 h-36">
              {s.weeklyTrend.map((w, i) => {
                const total = w.present + w.absent;
                const pH =
                  maxStudentWeek === 0
                    ? 0
                    : Math.round((w.present / maxStudentWeek) * 100);
                const aH =
                  maxStudentWeek === 0
                    ? 0
                    : Math.round((w.absent / maxStudentWeek) * 100);
                const pPct =
                  total === 0 ? 0 : Math.round((w.present / total) * 100);
                return (
                  <motion.div
                    key={w.day}
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: 1 }}
                    transition={{ delay: 0.3 + i * 0.07 }}
                    className="flex-1 flex flex-col items-center gap-0.5"
                  >
                    <div
                      className="w-full flex flex-col-reverse gap-0.5"
                      style={{ height: "100px" }}
                    >
                      <div
                        className="w-full bg-emerald-500 rounded-t"
                        style={{ height: `${pH}%` }}
                      />
                      <div
                        className="w-full bg-red-400 rounded-b"
                        style={{ height: `${aH}%` }}
                      />
                    </div>
                    <p className="text-[10px] font-bold text-gray-600">
                      {lang === "ml" ? w.day_ml : w.day}
                    </p>
                    <p className="text-[9px] text-gray-400">{pPct}%</p>
                  </motion.div>
                );
              })}
            </div>
            <div className="flex gap-5 mt-3 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-emerald-500" />
                <span className="text-gray-600 font-medium">
                  {lang === "ml" ? "ഹാജർ" : "Present"}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-red-400" />
                <span className="text-gray-600 font-medium">
                  {lang === "ml" ? "ഗൈർഹാജർ" : "Absent"}
                </span>
              </div>
            </div>
          </motion.div>

          {/* Class-wise attendance */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm mb-5"
          >
            <p className="font-bold text-gray-800 mb-4">
              {lang === "ml"
                ? "ക്ലാസ് തിരിച്ചുള്ള ഹാജർ"
                : "Class-wise Attendance"}
            </p>
            <div className="space-y-3">
              {(d.academic.classStats || []).map((cls, i) => {
                const c = attColor(cls.attendancePct ?? 0);
                return (
                  <motion.div
                    key={cls.className || `class-${i}`}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.36 + i * 0.05 }}
                  >
                    <div className="flex justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-gray-700">
                          {cls.className}
                        </span>
                        <span className="text-xs text-gray-400">
                          {cls.students ?? 0}{" "}
                          {lang === "ml" ? "വിദ്യാർ." : "students"}
                        </span>
                      </div>
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-full ${c.bg} ${c.text}`}
                      >
                        {cls.attendancePct ?? 0}%
                      </span>
                    </div>
                    <Bar
                      value={cls.attendancePct ?? 0}
                      color={c.bar}
                      height="h-2.5"
                    />
                  </motion.div>
                );
              })}
            </div>
          </motion.div>

          {/* Low attendance alert */}
          {s.lowAttendanceStudents > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="bg-orange-50 border border-orange-200 rounded-2xl p-4 flex items-start gap-3"
            >
              <AlertTriangle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-orange-800">
                  {lang === "ml"
                    ? `${s.lowAttendanceStudents} വിദ്യാർത്ഥികൾക്ക് കുറഞ്ഞ ഹാജർ`
                    : `${s.lowAttendanceStudents} students with low attendance`}
                </p>
                <p className="text-xs text-orange-600 mt-0.5">
                  {lang === "ml"
                    ? "രക്ഷിതാക്കളുമായി ഉടൻ ബന്ധപ്പെടേണ്ടതാണ്"
                    : "Parents should be contacted and followed up immediately"}
                </p>
              </div>
            </motion.div>
          )}
        </motion.div>
      )}

      {/* ══════════════════════════════════
           STAFF TAB
      ══════════════════════════════════ */}
      {activeTab === "staff" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          key="staff"
        >
          {/* Staff stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
            {[
              {
                label: lang === "ml" ? "ഒ. ഹാജർ %" : "Overall %",
                value: `${st.overallPct}%`,
                sub: lang === "ml" ? "ശ.ശ." : "Average",
                icon: TrendingUp,
                color: "text-violet-700",
                bg: "bg-violet-50",
                border: "border-violet-200",
              },
              {
                label: lang === "ml" ? "ഇന്ന് ഹാജർ" : "Present Today",
                value: `${st.presentToday}`,
                sub: `${staffTodayPct}%`,
                icon: UserCheck,
                color: "text-emerald-700",
                bg: "bg-emerald-50",
                border: "border-emerald-200",
              },
              {
                label: lang === "ml" ? "ഗൈർഹാജർ" : "Absent Today",
                value: `${st.absentToday}`,
                sub: lang === "ml" ? "ഇന്ന്" : "Today",
                icon: UserX,
                color: "text-red-700",
                bg: "bg-red-50",
                border: "border-red-200",
              },
              {
                label: lang === "ml" ? "ലീവിൽ" : "On Leave",
                value: `${st.onLeaveToday}`,
                sub: lang === "ml" ? "ഇന്ന്" : "Today",
                icon: CalendarOff,
                color: "text-amber-700",
                bg: "bg-amber-50",
                border: "border-amber-200",
              },
            ].map((c, i) => (
              <motion.div
                key={c.label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className={`bg-white rounded-2xl border ${c.border} p-4 shadow-sm`}
              >
                <div
                  className={`w-9 h-9 ${c.bg} rounded-xl flex items-center justify-center mb-3`}
                >
                  <c.icon className={`w-4 h-4 ${c.color}`} />
                </div>
                <p className="text-2xl font-black text-gray-900">{c.value}</p>
                <p className="text-xs font-semibold text-gray-700 mt-0.5">
                  {c.label}
                </p>
                <p className="text-[11px] text-gray-400 mt-0.5">{c.sub}</p>
              </motion.div>
            ))}
          </div>

          {/* Staff weekly bar chart */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm mb-5"
          >
            <div className="flex items-center gap-2 mb-5">
              <Users className="w-4.5 h-4.5 text-violet-700" />
              <p className="font-bold text-gray-800">
                {lang === "ml"
                  ? "ആഴ്ചവാരി സ്റ്റാഫ് ഹാജർ"
                  : "Weekly Staff Attendance"}
              </p>
            </div>
            <div className="flex items-end gap-3 h-28">
              {st.weeklyTrend.map((w, i) => {
                const total = w.present + w.absent;
                const pH =
                  maxStaffWeek === 0
                    ? 0
                    : Math.round((w.present / maxStaffWeek) * 100);
                const aH =
                  maxStaffWeek === 0
                    ? 0
                    : Math.round((w.absent / maxStaffWeek) * 100);
                const pPct =
                  total === 0 ? 0 : Math.round((w.present / total) * 100);
                return (
                  <motion.div
                    key={w.day}
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: 1 }}
                    transition={{ delay: 0.25 + i * 0.07 }}
                    className="flex-1 flex flex-col items-center gap-0.5"
                  >
                    <div
                      className="w-full flex flex-col-reverse gap-0.5"
                      style={{ height: "80px" }}
                    >
                      <div
                        className="w-full bg-violet-500 rounded-t"
                        style={{ height: `${pH}%` }}
                      />
                      <div
                        className="w-full bg-red-400 rounded-b"
                        style={{ height: `${aH}%` }}
                      />
                    </div>
                    <p className="text-[10px] font-bold text-gray-600">
                      {lang === "ml" ? w.day_ml : w.day}
                    </p>
                    <p className="text-[9px] text-gray-400">{pPct}%</p>
                  </motion.div>
                );
              })}
            </div>
            <div className="flex gap-5 mt-3 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-violet-500" />
                <span className="text-gray-600 font-medium">
                  {lang === "ml" ? "ഹാജർ" : "Present"}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-red-400" />
                <span className="text-gray-600 font-medium">
                  {lang === "ml" ? "ഗൈർഹാജർ" : "Absent"}
                </span>
              </div>
            </div>
          </motion.div>

          {/* Individual staff list */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm mb-5"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Users className="w-4.5 h-4.5 text-violet-700" />
                <p className="font-bold text-gray-800">
                  {lang === "ml"
                    ? "സ്റ്റാഫ് ഹാജർ വിശദാംശം"
                    : "Staff Attendance Details"}
                </p>
              </div>
              <span className="text-xs text-gray-400 font-medium">
                {lang === "ml" ? "ഇന്നത്തെ" : "Today's"}{" "}
                {new Date().toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "short",
                })}
              </span>
            </div>
            <div className="space-y-2.5">
              {(st.staffList || []).map((staff, i) => {
                const sc =
                  statusConfig[
                    staff.todayStatus as keyof typeof statusConfig
                  ] || statusConfig["present"];
                const ac = attColor(staff.attendancePct);
                return (
                  <motion.div
                    key={staff.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.32 + i * 0.06 }}
                    className={`flex items-center gap-3 rounded-2xl p-3 border ${
                      staff.todayStatus === "absent"
                        ? "bg-red-50 border-red-100"
                        : staff.todayStatus === "leave"
                          ? "bg-amber-50 border-amber-100"
                          : "bg-gray-50 border-gray-100"
                    }`}
                  >
                    {/* Avatar */}
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${sc.bg}`}
                    >
                      <span className={`text-sm font-black ${sc.text}`}>
                        {staff.name.split(" ").slice(-1)[0][0]}
                      </span>
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900 truncate">
                        {staff.name}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {lang === "ml" ? staff.subject_ml : staff.subject} —{" "}
                        {lang === "ml" ? staff.role_ml : staff.role}
                      </p>
                      {/* Attendance % bar */}
                      <div className="flex items-center gap-2 mt-1.5">
                        <div className="flex-1">
                          <Bar
                            value={staff.attendancePct}
                            color={ac.bar}
                            height="h-1.5"
                          />
                        </div>
                        <span className={`text-[10px] font-bold ${ac.text}`}>
                          {staff.attendancePct}%
                        </span>
                      </div>
                    </div>
                    {/* Status badge */}
                    <div className="shrink-0 flex flex-col items-end gap-1">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${sc.bg} ${sc.text}`}
                      >
                        {lang === "ml" ? sc.label_ml : sc.label_en}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {staff.id}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>

          {/* Per-staff attendance % bars */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm mb-5"
          >
            <p className="font-bold text-gray-800 mb-4">
              {lang === "ml"
                ? "ആകെ ഹാജർ %-ടെ ആ ടീച്ചർ"
                : "Individual Attendance Rate"}
            </p>
            <div className="space-y-3">
              {(st.staffList || [])
                .slice()
                .sort((a, b) => b.attendancePct - a.attendancePct)
                .map((staff, i) => {
                  const ac = attColor(staff.attendancePct);
                  return (
                    <motion.div
                      key={staff.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.46 + i * 0.05 }}
                    >
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-bold text-gray-700 truncate max-w-[65%]">
                          {staff.name}
                        </span>
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded-full ${ac.bg} ${ac.text}`}
                        >
                          {staff.attendancePct}%
                        </span>
                      </div>
                      <Bar
                        value={staff.attendancePct}
                        color={ac.bar}
                        height="h-2.5"
                      />
                    </motion.div>
                  );
                })}
            </div>
          </motion.div>

          {/* Alert for absent staff */}
          {(st.absentToday ?? 0) > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3"
            >
              <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-red-800">
                  {lang === "ml"
                    ? `${st.absentToday ?? 0} ടീച്ചർ ഇന്ന് ഗൈർഹാജർ`
                    : `${st.absentToday ?? 0} teacher${(st.absentToday ?? 0) > 1 ? "s" : ""} absent today`}
                </p>
                <p className="text-xs text-red-600 mt-0.5">
                  {lang === "ml"
                    ? "ക്ലാസ് ക്രമീകരണം ഉറപ്പ് വരുത്തേണ്ടതാണ്"
                    : "Ensure class arrangements are made for absent teachers"}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(st.staffList || [])
                    .filter((s) => s.todayStatus === "absent")
                    .map((s) => (
                      <span
                        key={s.id}
                        className="text-xs bg-red-100 text-red-700 font-semibold px-2 py-0.5 rounded-full"
                      >
                        {s.name}
                      </span>
                    ))}
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>
      )}
    </DashboardLayout>
  );
}
