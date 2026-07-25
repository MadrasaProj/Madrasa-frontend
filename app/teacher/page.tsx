import { DashboardLayout } from "@/components/DashboardLayout";
import { ActionCard } from "@/components/ui/Cards";
import { SectionHeader } from "@/components/ui/PageHeader";
import { useAuthStore } from "@/store/auth";
import { useLanguageStore } from "@/store/language";
import { t } from "@/lib/i18n";
import { useNavigate } from "react-router-dom";
import {
  ClipboardList, BookOpen, FileText, Moon, GraduationCap,
  Star, Bell, Users, TrendingUp,
} from "lucide-react";
import { motion } from "framer-motion";
import { useHomeworkList, useAttendanceSummary, useUnreadCount } from "@/lib/queries";

export default function TeacherDashboard() {
  const { user, accessToken } = useAuthStore();
  const { lang } = useLanguageStore();
  const navigate = useNavigate();
  const cid   = user?.clientId ?? "";
  const token = accessToken ?? "";

  const { data: hwData, isLoading: loadingHw } = useHomeworkList({ clientId: cid, token });
  const { data: attData, isLoading: loadingAtt } = useAttendanceSummary({ clientId: cid, token });
  const { data: unreadData, isLoading: loadingUnread } = useUnreadCount({ clientId: cid, token });

  const stats = {
    hw: hwData?.length ?? 0,
    att: attData?.rate ?? 0,
    unread: unreadData?.count ?? 0,
  };
  const loading = loadingHw || loadingAtt || loadingUnread;

  const today = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });

  const actions = [
    { title: t("teacherPages", "markAttendanceBtn", lang), icon: ClipboardList, href: "/teacher/attendance", desc: t("teacherPages", "markAttendanceDesc", lang) },
    { title: t("common", "present", lang),                 icon: Users,         href: "/teacher/present",    desc: t("teacherPages", "presentActionDesc", lang) },
    { title: t("common", "absent", lang),                  icon: TrendingUp,    href: "/teacher/absent",     desc: t("teacherPages", "absentActionDesc", lang) },
    { title: t("nav", "homework", lang),                   icon: BookOpen,      href: "/teacher/homework",   desc: t("teacherDash", "assignTrack", lang) },
    { title: t("teacherPages", "hwOverviewAction", lang),  icon: FileText,      href: "/teacher/homework-list", desc: t("teacherPages", "hwOverviewDesc", lang) },
    { title: t("nav", "ibadah", lang),                     icon: Moon,          href: "/teacher/ibadah",     desc: t("teacherDash", "trackPrayers", lang) },
    { title: t("nav", "exams", lang),                      icon: GraduationCap, href: "/teacher/exams",      desc: t("teacherDash", "examMarks", lang) },
    { title: t("nav", "performance", lang),                icon: Star,          href: "/teacher/performance", desc: t("teacherPages", "classAnalytics", lang) },
    { title: t("nav", "diary", lang),                      icon: FileText,      href: "/teacher/diary",      desc: t("teacherPages", "classDiary", lang) },
    { title: t("nav", "notifications", lang),              icon: Bell,          href: "/teacher/notifications", desc: stats.unread > 0 ? t("teacherPages", "unreadAction", lang).replace("{n}", String(stats.unread)) : t("teacherPages", "inboxLabel", lang) },
  ];

  return (
    <DashboardLayout>
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-5">
        <div className="bg-gradient-to-r from-emerald-700 to-green-600 rounded-3xl p-5 text-white">
          <p className="text-emerald-200 text-xs font-semibold uppercase tracking-widest mb-1">{t("teacherPages", "teacherPortal", lang)}</p>
          <h1 className="text-xl font-bold">{user?.name ?? "Teacher"}</h1>
          <p className="text-emerald-200 text-sm mt-1">{today}</p>
          {!loading && (
            <div className="grid grid-cols-3 gap-2 mt-4">
              {[
                { label: t("teacherPages", "hwActive", lang),  value: stats.hw },
                { label: t("teacherPages", "attRate", lang),  value: `${stats.att}%` },
                { label: t("teacherPages", "unreadLabel", lang),     value: stats.unread },
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

      <SectionHeader title={t("teacherPages", "quickActions", lang)} className="mb-3" />
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
