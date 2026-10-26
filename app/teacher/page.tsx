import { DashboardLayout } from "@/components/DashboardLayout";
import { ActionCard } from "@/components/ui/Cards";
import { SectionHeader } from "@/components/ui/PageHeader";
import { useAuthStore } from "@/store/auth";
import { useLanguageStore } from "@/store/language";
import { t } from "@/lib/i18n";
import { useNavigate } from "react-router-dom";
import {
  ClipboardList, BookOpen, FileText, Moon, GraduationCap,
  Star, Bell, Users, TrendingUp, FilePen, Trophy, CheckCircle2, XCircle,
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  useHomeworkList,
  useAttendanceSummary,
  useUnreadCount,
  usePendingLeaveRequests,
  useReviewLeaveRequest,
} from "@/lib/queries";
import PwaInstallButton from "@/components/PwaInstallButton";

export default function TeacherDashboard() {
  const { user, accessToken } = useAuthStore();
  const { lang } = useLanguageStore();
  const navigate = useNavigate();
  const cid   = user?.clientId ?? "";
  const token = accessToken ?? "";

  const { data: hwData, isLoading: loadingHw } = useHomeworkList({ clientId: cid, token });
  const { data: attData, isLoading: loadingAtt } = useAttendanceSummary({ clientId: cid, token });
  const { data: unreadData, isLoading: loadingUnread } = useUnreadCount({ clientId: cid, token });
  const { data: leaveData } = usePendingLeaveRequests({ clientId: cid, token }, { status: "PENDING" });
  const reviewMutation = useReviewLeaveRequest({ clientId: cid, token });

  const stats = {
    hw: hwData?.length ?? 0,
    att: attData?.rate ?? 0,
    unread: unreadData?.count ?? 0,
    pendingLeaves: leaveData?.total ?? 0,
  };
  const loading = loadingHw || loadingAtt || loadingUnread;

  const today = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });

  const handleQuickReview = async (id: string, status: "APPROVED" | "REJECTED", e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await reviewMutation.mutateAsync({ id, payload: { status } });
      toast.success(
        status === "APPROVED"
          ? (lang === "ml" ? "ലീവ് അപേക്ഷ അംഗീകരിച്ചു" : "Leave request approved")
          : (lang === "ml" ? "ലീവ് അപേക്ഷ നിരസിച്ചു" : "Leave request rejected")
      );
    } catch (err: any) {
      toast.error(err?.message || "Failed to update leave request");
    }
  };

  const actions = [
    { title: t("teacherPages", "markAttendanceBtn", lang), icon: ClipboardList, href: "/teacher/attendance", desc: t("teacherPages", "markAttendanceDesc", lang) },
    {
      title: t("teacherPages", "leaveRequests", lang),
      icon: FilePen,
      href: "/teacher/leave-requests",
      desc: stats.pendingLeaves > 0
        ? `${stats.pendingLeaves} ${lang === "ml" ? "അപേക്ഷകൾ കാത്തിരിക്കുന്നു" : "pending review"}`
        : t("teacherPages", "leaveRequestsSub", lang),
    },
    {
      title: lang === "ml" ? "റാങ്ക് ലിസ്റ്റ്" : "Class Rankings",
      icon: Trophy,
      href: "/teacher/best-performance?category=ibadah",
      desc: lang === "ml" ? "ഇബാദത്ത് & മികച്ച വിദ്യാർത്ഥി റാങ്കിംഗ്" : "Ibada & best student rankings",
    },
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
            <div className={cn("grid gap-2 mt-4", stats.pendingLeaves > 0 ? "grid-cols-4" : "grid-cols-3")}>
              {[
                { label: t("teacherPages", "hwActive", lang),  value: stats.hw },
                { label: t("teacherPages", "attRate", lang),  value: `${stats.att}%` },
                ...(stats.pendingLeaves > 0 ? [{ label: t("teacherPages", "leaveRequests", lang), value: stats.pendingLeaves }] : []),
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

      {/* PWA Install Banner */}
      <PwaInstallButton variant="banner" className="mb-5" />

      {stats.pendingLeaves > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-5 space-y-2.5"
        >
          <div
            onClick={() => navigate("/teacher/leave-requests")}
            className="flex items-center justify-between p-3.5 bg-amber-50 border border-amber-200 rounded-2xl cursor-pointer hover:bg-amber-100/70 transition-all shadow-xs"
          >
            <div className="flex items-center gap-2.5 text-amber-800 text-sm font-semibold">
              <FilePen className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                {stats.pendingLeaves} {lang === "ml" ? "ലീവ് അപേക്ഷകൾ അവലോകനത്തിനായി കാത്തിരിക്കുന്നു" : "pending leave request(s) waiting for your review"}
              </span>
            </div>
            <span className="text-xs font-bold text-amber-700 underline shrink-0 ml-2">
              {lang === "ml" ? "എല്ലാം കാണുക" : "View All"} &rarr;
            </span>
          </div>

          {/* Quick review list for recent pending leaves */}
          {leaveData?.requests && leaveData.requests.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-3 shadow-xs space-y-2">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider px-1">
                {lang === "ml" ? "പുതിയ അപേക്ഷകൾ" : "Recent Requests"}
              </p>
              {leaveData.requests.slice(0, 3).map((r) => {
                const isSick = r.reasonType === "SICK";
                const dateDisplay = r.endDate && r.endDate !== r.startDate
                  ? `${r.startDate.slice(0, 10)} - ${r.endDate.slice(0, 10)}`
                  : r.startDate.slice(0, 10);
                return (
                  <div
                    key={r.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-2.5 rounded-xl bg-gray-50/70 border border-gray-100 hover:border-gray-200 transition-all"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-gray-900 truncate">{r.student.name}</span>
                        <span className="text-[10px] text-gray-400">({r.student.adno})</span>
                        {r.student.class?.name && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-600">
                            {r.student.class.name}
                          </span>
                        )}
                        <span className={cn(
                          "text-[10px] font-bold px-1.5 py-0.5 rounded-md",
                          isSick ? "bg-orange-100 text-orange-700" : "bg-amber-100 text-amber-700"
                        )}>
                          {isSick ? (lang === "ml" ? "അസുഖം" : "Sick") : (lang === "ml" ? "ലീവ്" : "Leave")}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 truncate">
                        <span className="font-medium text-gray-700">{dateDisplay}</span>
                        {r.description ? ` · "${r.description}"` : ""}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={(e) => handleQuickReview(r.id, "APPROVED", e)}
                        className="flex items-center gap-1 text-[11px] font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-lg border border-emerald-200 transition-colors cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{lang === "ml" ? "അംഗീകരിക്കുക" : "Approve"}</span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleQuickReview(r.id, "REJECTED", e)}
                        className="flex items-center gap-1 text-[11px] font-bold bg-red-50 hover:bg-red-100 text-red-700 px-2.5 py-1 rounded-lg border border-red-200 transition-colors cursor-pointer"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>{lang === "ml" ? "നിരസിക്കുക" : "Reject"}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
      )}

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
