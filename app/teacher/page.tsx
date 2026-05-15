import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { ActionCard } from "@/components/ui/Cards";
import { SectionHeader } from "@/components/ui/PageHeader";
import { listHomework } from "@/lib/homework-api";
import { getAttendanceSummary } from "@/lib/reports-api";
import { getUnreadCount } from "@/lib/notifications-api";
import { useAuthStore } from "@/store/auth";
import { useNavigate } from "react-router-dom";
import {
  ClipboardList, BookOpen, FileText, Moon, GraduationCap,
  Star, Bell, Users, TrendingUp, Loader2,
} from "lucide-react";
import { motion } from "framer-motion";

export default function TeacherDashboard() {
  const { user, accessToken } = useAuthStore();
  const navigate = useNavigate();
  const cid   = user?.clientId ?? "";
  const token = accessToken ?? "";

  const [stats, setStats]   = useState({ hw: 0, att: 0, unread: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!cid || !token) return;
    Promise.all([
      listHomework(cid, token).catch(() => [] as any[]),
      getAttendanceSummary(cid, token).catch(() => null),
      getUnreadCount(cid, token).catch(() => ({ count: 0 })),
    ]).then(([hw, att, notif]) => {
      setStats({
        hw: hw.length,
        att: att?.rate ?? 0,
        unread: notif.count,
      });
    }).finally(() => setLoading(false));
  }, [cid, token]);

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
        <div className="bg-gradient-to-r from-blue-700 to-indigo-600 rounded-3xl p-5 text-white">
          <p className="text-blue-200 text-xs font-semibold uppercase tracking-widest mb-1">Teacher Portal</p>
          <h1 className="text-xl font-bold">{user?.name ?? "Teacher"}</h1>
          <p className="text-blue-200 text-sm mt-1">{today}</p>
          {!loading && (
            <div className="grid grid-cols-3 gap-2 mt-4">
              {[
                { label: "HW Active",  value: stats.hw },
                { label: "Att. Rate",  value: `${stats.att}%` },
                { label: "Unread",     value: stats.unread },
              ].map((s) => (
                <div key={s.label} className="bg-white/15 rounded-2xl p-2.5 text-center">
                  <p className="text-lg font-black">{s.value}</p>
                  <p className="text-[10px] text-blue-200">{s.label}</p>
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
