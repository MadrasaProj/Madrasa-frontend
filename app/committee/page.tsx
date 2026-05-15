import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { motion } from "framer-motion";
import { useLanguageStore } from "@/store/language";
import { useCommitteeData } from "@/lib/use-committee-data";
import {
  Users, GraduationCap, CreditCard, TrendingUp,
  CheckCircle2, AlertCircle, Bell, BarChart3,
  IndianRupee, ClipboardList, BookOpen, Loader2,
} from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

function ProgressBar({ value, color = "bg-emerald-500" }: { value: number; color?: string }) {
  const safe = Math.min(100, Math.max(0, value || 0));
  return (
    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
      <div className={`h-full ${color} rounded-full transition-all duration-700`} style={{ width: `${safe}%` }} />
    </div>
  );
}

export default function CommitteeDashboard() {
  const { lang } = useLanguageStore();
  const d = useCommitteeData();
  const ml = lang === "ml";

  const quickStats = [
    {
      label: ml ? "വിദ്യാർത്ഥികൾ" : "Students",
      value: d.overview.totalStudents,
      sub:   `${d.overview.activeStudents} ${ml ? "സജീവം" : "active"}`,
      icon: GraduationCap, color: "text-blue-600", bg: "bg-blue-100",
    },
    {
      label: ml ? "ഹാജർ നിരക്ക്" : "Attendance Rate",
      value: `${d.attendance.overallPct}%`,
      sub:   `${d.attendance.presentCount} ${ml ? "ഇന്ന്" : "today"}`,
      icon: ClipboardList,
      color: d.attendance.overallPct >= 75 ? "text-emerald-600" : "text-amber-600",
      bg:    d.attendance.overallPct >= 75 ? "bg-emerald-100"   : "bg-amber-100",
    },
    {
      label: ml ? "ഫീസ് ശേഖരണം" : "Fee Collection",
      value: `${d.fees.collectionPct}%`,
      sub:   `₹${(d.fees.totalCollected / 1000).toFixed(0)}K ${ml ? "ശേഖരിച്ചു" : "collected"}`,
      icon: IndianRupee,
      color: d.fees.collectionPct >= 70 ? "text-emerald-600" : "text-amber-600",
      bg:    d.fees.collectionPct >= 70 ? "bg-emerald-100"   : "bg-amber-100",
    },
    {
      label: ml ? "അറിയിപ്പുകൾ" : "Notifications",
      value: d.announcements.length,
      sub:   `${d.announcements.filter((a) => a.priority === "high").length} ${ml ? "ഉടൻ" : "urgent"}`,
      icon: Bell, color: "text-purple-600", bg: "bg-purple-100",
    },
  ];

  const navLinks = [
    { href: "/committee/attendance", label: ml ? "ഹാജർ"        : "Attendance",     icon: ClipboardList, color: "from-teal-600 to-cyan-600" },
    { href: "/committee/finance",    label: ml ? "ഫിനാൻസ്"      : "Finance",        icon: IndianRupee,   color: "from-emerald-600 to-teal-600" },
    { href: "/committee/students",   label: ml ? "വിദ്യാർത്ഥി"   : "Students",       icon: Users,         color: "from-blue-600 to-indigo-600" },
    { href: "/committee/reports",    label: ml ? "റിപ്പോർട്ട്"   : "Reports",        icon: BarChart3,     color: "from-violet-600 to-purple-600" },
    { href: "/committee/announcements", label: ml ? "അറിയിപ്പ്" : "Announcements",  icon: Bell,          color: "from-rose-600 to-pink-600" },
  ];

  return (
    <DashboardLayout>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-5">
        <div className="bg-gradient-to-r from-emerald-700 to-teal-600 rounded-3xl p-5 text-white">
          <p className="text-emerald-200 text-xs font-semibold uppercase tracking-widest mb-1">
            {ml ? "മാനേജ്‌മെന്റ് കമ്മിറ്റി" : "Management Committee"}
          </p>
          <h1 className="text-xl font-bold">{ml ? "ഡാഷ്ബോർഡ്" : "Dashboard"}</h1>
          <div className="grid grid-cols-4 gap-2 mt-4">
            {quickStats.map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.label} className="bg-white/15 rounded-2xl p-2.5 text-center">
                  <p className="text-lg font-black">{s.value}</p>
                  <p className="text-[10px] text-emerald-200 leading-tight">{s.label}</p>
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>

      {d.loading && (
        <div className="flex items-center justify-center gap-2 py-6 text-gray-400">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">{ml ? "ലോഡ് ചെയ്യുന്നു..." : "Loading..."}</span>
        </div>
      )}

      {/* Key metrics */}
      <div className="grid grid-cols-1 gap-3 mb-5">
        {/* Fee collection */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-bold text-gray-800">{ml ? "ഫീസ് ശേഖരണ പ്രോഗ്രസ്" : "Fee Collection Progress"}</p>
            <span className="text-lg font-black text-teal-700">{d.fees.collectionPct}%</span>
          </div>
          <ProgressBar value={d.fees.collectionPct} color="bg-teal-500" />
          <div className="flex justify-between mt-2 text-xs text-gray-500">
            <span>{d.fees.paidStudents} {ml ? "പേർ അടച്ചു" : "paid"}</span>
            <span>{d.fees.unpaidStudents} {ml ? "ബാക്കി" : "pending"}</span>
          </div>
        </div>

        {/* Attendance */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-bold text-gray-800">{ml ? "ഹാജർ നിലവാരം" : "Attendance Rate"}</p>
            <span className={cn("text-lg font-black", d.attendance.overallPct >= 75 ? "text-emerald-700" : "text-amber-600")}>
              {d.attendance.overallPct}%
            </span>
          </div>
          <ProgressBar
            value={d.attendance.overallPct}
            color={d.attendance.overallPct >= 75 ? "bg-emerald-500" : "bg-amber-400"}
          />
          <div className="flex justify-between mt-2 text-xs text-gray-500">
            <span>{d.attendance.presentCount} {ml ? "ഹാജർ" : "present"}</span>
            <span>{d.attendance.absentCount} {ml ? "ഗൈർഹാജർ" : "absent"}</span>
          </div>
        </div>

        {/* Student breakdown */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <p className="text-sm font-bold text-gray-800 mb-3">{ml ? "വിദ്യാർത്ഥി സ്ഥിതി" : "Student Breakdown"}</p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: ml ? "മൊത്തം" : "Total",    value: d.students.total,    color: "text-gray-900" },
              { label: ml ? "ആൺ"    : "Male",      value: d.students.maleCount,  color: "text-blue-600" },
              { label: ml ? "പെൺ"   : "Female",    value: d.students.femaleCount, color: "text-pink-600" },
            ].map((s) => (
              <div key={s.label} className="bg-gray-50 rounded-xl p-3 text-center">
                <p className={cn("text-xl font-black", s.color)}>{s.value}</p>
                <p className="text-[10px] text-gray-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Urgent announcements */}
      {d.announcements.filter((a) => a.priority === "high").length > 0 && (
        <div className="mb-5 space-y-2">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">
            {ml ? "ഉടൻ ശ്രദ്ധ" : "Urgent"}
          </p>
          {d.announcements.filter((a) => a.priority === "high").slice(0, 3).map((a) => (
            <div key={a.id} className="bg-red-50 border border-red-100 rounded-2xl p-3.5 flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-gray-900">{a.title}</p>
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{a.body}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Nav links */}
      <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">{ml ? "ഡാഷ്ബോർഡ്" : "Navigate"}</p>
      <div className="grid grid-cols-2 gap-3 pb-20">
        {navLinks.map((link) => {
          const Icon = link.icon;
          return (
            <Link key={link.href} to={link.href}>
              <motion.div
                whileTap={{ scale: 0.97 }}
                className={cn("bg-gradient-to-br rounded-2xl p-4 text-white", link.color)}
              >
                <Icon className="w-6 h-6 mb-2 opacity-90" />
                <p className="font-bold text-sm">{link.label}</p>
              </motion.div>
            </Link>
          );
        })}
      </div>
    </DashboardLayout>
  );
}
