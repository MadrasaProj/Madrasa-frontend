import { DashboardLayout } from "@/components/DashboardLayout";
import { ActionCard } from "@/components/ui/Cards";
import { SectionHeader } from "@/components/ui/PageHeader";
import { useHomework, useAttendanceSummary, useUnreadCount } from "@/lib/api-hooks";
import { useAuthStore } from "@/store/auth";
import { useNavigate } from "react-router-dom";
import {
  ClipboardList, BookOpen, FileText, Moon, GraduationCap,
  Star, Bell, Users, TrendingUp,
} from "lucide-react";
import { motion } from "framer-motion";

export default function TeacherDashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const { data: hw = [], isLoading: hwLoading } = useHomework();
  const { data: attSummary, isLoading: attLoading } = useAttendanceSummary();
  const { data: unreadData, isLoading: unreadLoading } = useUnreadCount();

  const loading = hwLoading || attLoading || unreadLoading;
  const stats = {
    hw: hw?.length ?? 0,
    att: attSummary?.rate ?? 0,
    unread: unreadData?.count ?? 0,
  };

  const today = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });

  const actions = [
    { title: "Mark Attendance", icon: ClipboardList, href: "/teacher/attendance", desc: "Take today's roll call" },
    { title: "Present",         icon: Users,         href: "/teacher/present",    desc: "Today's present students" },
    { title: "Absent",          icon: TrendingUp,    href: "/teacher/absent",     desc: "Today's absent list" },
    { title: "Homework",        icon: BookOpen,      href: "/teacher/homework",   desc: "Assign & check homework" },
    { title: "HW Overview",     icon: FileText,      href: "/teacher/homework-list", desc: "Pending assignments" },
    { title: "Ibadah",          icon: Moon,          href: "/teacher/ibadah",     desc: "Prayer tracking" },
    { title: "Exams",           icon: GraduationCap, href: "/teacher/exams",      desc: "Enter marks" },
    { title: "Performance",     icon: Star,          href: "/teacher/performance", desc: "Class analytics" },
    { title: "Diary",           icon: FileText,      href: "/teacher/diary",      desc: "Class diary" },
    { title: "Notifications",   icon: Bell,          href: "/teacher/notifications", desc: `${stats.unread > 0 ? `${stats.unread} unread` : "Inbox"}` },
  ];

  return (
    <DashboardLayout>
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-5">
        <div className="bg-gradient-to-r from-emerald-700 to-green-600 rounded-3xl p-5 text-white">
          <p className="text-emerald-200 text-xs font-semibold uppercase tracking-widest mb-1">Teacher Portal</p>
          <h1 className="text-xl font-bold">{user?.name ?? "Teacher"}</h1>
          <p className="text-emerald-200 text-sm mt-1">{today}</p>
          {!loading && (
            <div className="grid grid-cols-3 gap-2 mt-4">
              {[
                { label: "HW Active",  value: stats.hw },
                { label: "Att. Rate",  value: `${stats.att}%` },
                { label: "Unread",     value: stats.unread },
              ].map((s) => (
                <div key={s.label} className="bg-white/15 rounded-2xl p-2.5 text-center">
                  <p className="text-lg font-black">{s.value}</p>
                  <p className="text-[10px] text-emerald-200">{s.label}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>

      <SectionHeader title="Quick Actions" className="mb-3" />
      <div className="grid grid-cols-2 gap-3 pb-20">
        {actions.map((a, i) => (
          <motion.div key={a.title} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
            <ActionCard title={a.title} description={a.desc} icon={a.icon} onClick={() => navigate(a.href)} />
          </motion.div>
        ))}
      </div>
    </DashboardLayout>
  );
}
