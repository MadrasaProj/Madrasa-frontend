import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { ActionCard } from "@/components/ui/Cards";
import { SectionHeader } from "@/components/ui/PageHeader";
import { useAuthStore } from "@/store/auth";
import { useNavigate } from "react-router-dom";
import { getUnreadCount } from "@/lib/notifications-api";
import { useLanguageStore } from "@/store/language";
import { t } from "@/lib/i18n";
import {
  ClipboardList,
  BookOpen,
  CreditCard,
  GraduationCap,
  Bell,
  Moon,
  User,
} from "lucide-react";
import { motion } from "framer-motion";

export default function ParentDashboard() {
  const { user, accessToken } = useAuthStore();
  const { lang } = useLanguageStore();
  const navigate = useNavigate();
  const cid = user?.clientId ?? "";
  const token = accessToken ?? "";

  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!cid || !token) {
      setLoading(false);
      return;
    }
    getUnreadCount(cid, token)
      .then((r) => setUnread(r.count))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [cid, token]);

  const childCount = user?.accessibleStudentIds?.length ?? 0;

  const actions = [
    {
      title: "Student Profile",
      icon: User,
      href: "/parent/students",
      desc: "View profile details",
    },
    {
      title: t("parentPages", "attendanceTitle", lang),
      icon: ClipboardList,
      href: "/parent/attendance",
      desc: t("parentPages", "attendanceSub", lang),
    },
    {
      title: t("parentPages", "homeworkTitle", lang),
      icon: BookOpen,
      href: "/parent/homework",
      desc: t("parentPages", "homeworkSub", lang),
    },
    {
      title: t("parentPages", "feesTitle", lang),
      icon: CreditCard,
      href: "/parent/fees",
      desc: t("parentPages", "feesSub", lang),
    },
    {
      title: t("parentPages", "resultsTitle", lang),
      icon: GraduationCap,
      href: "/parent/results",
      desc: t("parentPages", "resultsSub", lang),
    },
    {
      title: t("parentPages", "ibadahTitle", lang),
      icon: Moon,
      href: "/parent/ibadah",
      desc: t("parentPages", "ibadahSub", lang),
    },
    {
      title: t("parentPages", "notifTitle", lang),
      icon: Bell,
      href: "/parent/notifications",
      desc:
        unread > 0 ? `${unread} unread` : t("parentPages", "notifSub", lang),
    },
  ];

  return (
    <DashboardLayout>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-5"
      >
        <div className="bg-gradient-to-r from-emerald-700 to-teal-600 rounded-3xl p-5 text-white">
          <p className="text-emerald-200 text-xs font-semibold uppercase tracking-widest mb-1">
            {lang === "ml" ? "രക്ഷിതാവ് പോർട്ടൽ" : "Parent Portal"}
          </p>
          <h1 className="text-xl font-bold">
            {lang === "ml" ? "സ്വാഗതം" : "Welcome"}{user?.name ? `, ${user.name}` : ""}
          </h1>
          <div className="flex items-center gap-3 mt-3">
            <div className="bg-white/15 rounded-2xl px-4 py-2 text-center">
              <p className="text-2xl font-black">{childCount}</p>
              <p className="text-[10px] text-emerald-200">
                {lang === "ml" ? "കുട്ടികൾ" : "Children"}
              </p>
            </div>
            {unread > 0 && (
              <div className="bg-amber-500/90 rounded-2xl px-4 py-2 text-center">
                <p className="text-2xl font-black">{unread}</p>
                <p className="text-[10px] text-amber-100">
                  {lang === "ml" ? "പുതിയ" : "Unread"}
                </p>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      <SectionHeader
        title={lang === "ml" ? "ദ്രുത പ്രവേശം" : "Quick Access"}
        className="mb-3"
      />
      <div className="grid grid-cols-2 gap-3 pb-20">
        {actions.map((a, i) => (
          <motion.div
            key={a.href}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <ActionCard
              title={a.title}
              description={a.desc}
              icon={a.icon}
              onClick={() => navigate(a.href)}
            />
          </motion.div>
        ))}
      </div>
    </DashboardLayout>
  );
}
