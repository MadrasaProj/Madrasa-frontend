import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { DrawerSelector } from "@/components/DrawerSelector";
import {
  getClientConfig,
  updateClientConfig,
  updateAdminUsername,
  type ClientConfig,
} from "@/lib/config-api";
import { triggerIbadahReminder } from "@/lib/ibadah-api";
import { useAuthStore } from "@/store/auth";
import {
  Save,
  CheckCircle2,
  Loader2,
  AlertCircle,
  CalendarCheck,
  Eye,
  EyeOff,
  Building2,
  UserCog,
  Radio,
  ShieldCheck,
  KeyRound,
  Moon,
  Bell,
  Send,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { motion } from "framer-motion";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { toast } from "sonner";

type Field = {
  key: keyof ClientConfig;
  label: string;
  placeholder?: string;
  type?: string;
};

const SECTIONS: { title: string; fields: Field[] }[] = [
  {
    title: "Basic Information",
    fields: [
      { key: "name", label: "Madrasa Name", placeholder: "e.g. Smart Madrasa" },
      { key: "arabicName", label: "Arabic Name", placeholder: "دار الهدى" },
      {
        key: "phone",
        label: "Phone",
        placeholder: "+91 9876543210",
        type: "tel",
      },
      {
        key: "email",
        label: "Email",
        placeholder: "info@madrasa.com",
        type: "email",
      },
      {
        key: "website",
        label: "Website",
        placeholder: "https://madrasa.com",
        type: "url",
      },
      {
        key: "establishedYear",
        label: "Established Year",
        placeholder: "1995",
        type: "number",
      },
    ],
  },
  {
    title: "Address",
    fields: [
      { key: "address", label: "Address", placeholder: "Street address" },
      { key: "city", label: "City", placeholder: "Kozhikode" },
      { key: "state", label: "State", placeholder: "Kerala" },
      { key: "country", label: "Country", placeholder: "India" },
      { key: "pincode", label: "Pincode", placeholder: "673001" },
    ],
  },
  {
    title: "Sadr Muallim (Head master) / Management",
    fields: [
      {
        key: "principalName",
        label: "Sadr Muallim (Head master) Name",
        placeholder: "Dr. Abdul Rahman",
      },
      {
        key: "principalPhone",
        label: "Sadr Muallim (Head master) Phone",
        placeholder: "+91 9876543210",
        type: "tel",
      },
      {
        key: "principalEmail",
        label: "Sadr Muallim (Head master) Email",
        placeholder: "principal@madrasa.com",
        type: "email",
      },
    ],
  },
  {
    title: "Settings",
    fields: [
      { key: "timezone", label: "Timezone", placeholder: "Asia/Kolkata" },
      { key: "language", label: "Language", placeholder: "en" },
      { key: "currency", label: "Currency", placeholder: "INR" },
      { key: "logo", label: "Logo URL", placeholder: "https://..." },
    ],
  },
];

const TABS = [
  { value: "general", label: "General", icon: Building2 },
  { value: "management", label: "Management", icon: UserCog },
  { value: "attendance", label: "Attendance", icon: Radio },
  { value: "ibadah", label: "Ibadah Alert", icon: Moon },
  { value: "parent-modules", label: "Parent Modules", icon: ShieldCheck },
  { value: "admin-account", label: "Admin Account", icon: KeyRound },
];

export default function AdminConfigPage() {
  const { slug } = useParams<{ slug: string }>();
  const { accessToken, activeClientId, setAttendanceMode } =
    useAuthStore();
  const cid = activeClientId ?? "";
  const token = accessToken ?? "";

  const [config, setConfig] = useState<Partial<ClientConfig>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [attMode, setAttMode] = useState<"CLASS_BASED" | "PERIOD_BASED">(
    "CLASS_BASED",
  );
  const [savingAtt, setSavingAtt] = useState(false);
  const [savedAtt, setSavedAtt] = useState(false);
  const [attError, setAttError] = useState("");
  const [showCommAtt, setShowCommAtt] = useState(true);
  const [savingCommAtt, setSavingCommAtt] = useState(false);
  const [savedCommAtt, setSavedCommAtt] = useState(false);
  const [showCommTC, setShowCommTC] = useState(true);
  const [savingCommTC, setSavingCommTC] = useState(false);
  const [savedCommTC, setSavedCommTC] = useState(false);

  const PARENT_MODULES = [
    { key: "attendance", label: "Attendance", desc: "Let parents view their child's attendance records" },
    { key: "leaveRequests", label: "Leave Requests", desc: "Let parents submit leave requests for their children" },
    { key: "homework", label: "Homework", desc: "Let parents view homework assignments" },
    { key: "diary", label: "Diary", desc: "Let parents view daily diary entries" },
    { key: "ibadah", label: "Ibadah", desc: "Let parents view ibadah tracking" },
    { key: "fees", label: "Fees", desc: "Let parents view and pay fees" },
    { key: "socialFrames", label: "Social Frames", desc: "Let parents view social frames" },
    { key: "results", label: "Results", desc: "Let parents view exam results" },
    { key: "notifications", label: "Notifications", desc: "Let parents receive and view notifications" },
  ];

  const [disabledModules, setDisabledModules] = useState<string[]>([]);
  const [savingParentToggles, setSavingParentToggles] = useState(false);
  const [savedParentToggles, setSavedParentToggles] = useState(false);

  const [newUsername, setNewUsername] = useState("");
  const [savingUsername, setSavingUsername] = useState(false);
  const [savedUsername, setSavedUsername] = useState(false);
  const [usernameError, setUsernameError] = useState("");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [savedPassword, setSavedPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  const [ibadahEnabled, setIbadahEnabled] = useState(true);
  const [ibadahTitle, setIbadahTitle] = useState("");
  const [ibadahBody, setIbadahBody] = useState("");
  const [ibadahTime, setIbadahTime] = useState("19:00");
  const [savingIbadah, setSavingIbadah] = useState(false);
  const [savedIbadah, setSavedIbadah] = useState(false);
  const [triggeringReminder, setTriggeringReminder] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("general");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const paramTab = new URLSearchParams(window.location.search).get("tab");
      if (paramTab && TABS.some((t) => t.value === paramTab)) {
        setActiveTab(paramTab);
      }
    }
  }, []);

  useEffect(() => {
    if (!cid || !token) return;
    getClientConfig(cid, token)
      .then((data) => {
        setConfig(data);
        if (data.attendanceMode) setAttMode(data.attendanceMode);
        if (data.showCommitteeAttendance !== undefined) setShowCommAtt(data.showCommitteeAttendance);
        if (data.showCommitteeTeacherCheckin !== undefined) setShowCommTC(data.showCommitteeTeacherCheckin);
        setDisabledModules(data.disabledParentModules ?? []);
        if (data.ibadahReminderEnabled !== undefined) setIbadahEnabled(data.ibadahReminderEnabled);
        if (data.ibadahReminderTitle) setIbadahTitle(data.ibadahReminderTitle);
        if (data.ibadahReminderBody) setIbadahBody(data.ibadahReminderBody);
        if (data.ibadahReminderTime) setIbadahTime(data.ibadahReminderTime);
      })
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, [cid, token]);

  const handleChange = (key: keyof ClientConfig, value: string) => {
    setConfig((prev) => ({ ...prev, [key]: value || null }));
  };

  const handleSave = async () => {
    if (!cid || !token) return;
    setSaving(true);
    setError("");
    try {
      const updated = await updateClientConfig(cid, token, {
        name: config.name,
        arabicName: config.arabicName,
        phone: config.phone,
        email: config.email,
        website: config.website,
        establishedYear: config.establishedYear
          ? Number(config.establishedYear)
          : undefined,
        address: config.address,
        city: config.city,
        state: config.state,
        country: config.country,
        pincode: config.pincode,
        principalName: config.principalName,
        principalPhone: config.principalPhone,
        principalEmail: config.principalEmail,
        timezone: config.timezone,
        language: config.language,
        currency: config.currency,
        logo: config.logo,
      });
      setConfig(updated);
      setSaved(true);
      toast.success("Settings saved successfully");
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setError((e as Error).message);
      toast.error((e as Error).message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAttendanceMode = async () => {
    if (!cid || !token) return;
    setSavingAtt(true);
    setAttError("");
    try {
      await updateClientConfig(cid, token, { attendanceMode: attMode });
      setConfig((prev) => ({ ...prev, attendanceMode: attMode }));
      setAttendanceMode(attMode);
      setSavedAtt(true);
      toast.success("Attendance mode updated successfully");
      setTimeout(() => setSavedAtt(false), 3000);
    } catch (e) {
      setAttError((e as Error).message);
      toast.error((e as Error).message || "Failed to update attendance mode");
    } finally {
      setSavingAtt(false);
    }
  };

  const handleSaveCommitteeAttendance = async () => {
    if (!cid || !token) return;
    setSavingCommAtt(true);
    try {
      await updateClientConfig(cid, token, {
        showCommitteeAttendance: showCommAtt,
      });
      setConfig((prev) => ({ ...prev, showCommitteeAttendance: showCommAtt }));
      setSavedCommAtt(true);
      setTimeout(() => setSavedCommAtt(false), 3000);
    } catch (e) {
      /* ignore */
    } finally {
      setSavingCommAtt(false);
    }
  };

  const handleSaveParentModules = async () => {
    if (!cid || !token) return;
    setSavingParentToggles(true);
    try {
      await updateClientConfig(cid, token, { disabledParentModules: disabledModules });
      setSavedParentToggles(true);
      setTimeout(() => setSavedParentToggles(false), 3000);
    } catch (e) { /* ignore */ }
    finally { setSavingParentToggles(false); }
  };

  const handleSaveCommitteeTeacherCheckin = async () => {
    if (!cid || !token) return;
    setSavingCommTC(true);
    try {
      await updateClientConfig(cid, token, {
        showCommitteeTeacherCheckin: showCommTC,
      });
      setConfig((prev) => ({
        ...prev,
        showCommitteeTeacherCheckin: showCommTC,
      }));
      setSavedCommTC(true);
      setTimeout(() => setSavedCommTC(false), 3000);
    } catch (e) {
      /* ignore */
    } finally {
      setSavingCommTC(false);
    }
  };

  const handleSaveUsername = async () => {
    if (!cid || !token || !newUsername.trim()) return;
    setSavingUsername(true);
    setUsernameError("");
    try {
      await updateAdminUsername(cid, token, newUsername.trim());
      setConfig((prev) => {
        const isEmail = newUsername.includes("@");
        return { ...prev, loginEmail: isEmail ? newUsername : null, loginPhone: isEmail ? null : newUsername };
      });
      setSavedUsername(true);
      toast.success("Admin username updated successfully");
      setTimeout(() => setSavedUsername(false), 3000);
    } catch (e) {
      setUsernameError((e as Error).message);
      toast.error((e as Error).message || "Failed to update admin username");
    } finally {
      setSavingUsername(false);
    }
  };

  const handleSavePassword = async () => {
    if (!cid || !token) return;
    setSavingPassword(true);
    setPasswordError("");
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match");
      toast.error("Passwords do not match");
      setSavingPassword(false);
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters");
      toast.error("Password must be at least 6 characters");
      setSavingPassword(false);
      return;
    }
    try {
      await updateClientConfig(cid, token, { password: newPassword });
      setSavedPassword(true);
      toast.success("Admin password changed successfully");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setSavedPassword(false), 3000);
    } catch (e) {
      setPasswordError((e as Error).message);
      toast.error((e as Error).message || "Failed to update password");
    } finally {
      setSavingPassword(false);
    }
  };

  const handleSaveIbadahReminder = async () => {
    if (!cid || !token) return;
    setSavingIbadah(true);
    try {
      const updated = await updateClientConfig(cid, token, {
        ibadahReminderEnabled: ibadahEnabled,
        ibadahReminderTitle: ibadahTitle || null,
        ibadahReminderBody: ibadahBody || null,
        ibadahReminderTime: ibadahTime || "19:00",
      });
      setConfig((prev) => ({
        ...prev,
        ibadahReminderEnabled: updated.ibadahReminderEnabled,
        ibadahReminderTitle: updated.ibadahReminderTitle,
        ibadahReminderBody: updated.ibadahReminderBody,
        ibadahReminderTime: updated.ibadahReminderTime,
      }));
      setSavedIbadah(true);
      toast.success("Ibadah alert settings saved successfully");
      setTimeout(() => setSavedIbadah(false), 3000);
    } catch (e) {
      toast.error((e as Error).message || "Failed to save ibadah settings");
    } finally {
      setSavingIbadah(false);
    }
  };

  const handleTestTriggerReminder = async (dryRun = false) => {
    if (!cid || !token) return;
    setTriggeringReminder(true);
    try {
      const res = await triggerIbadahReminder(cid, token, { dryRun, notifyAll: true });
      if (dryRun) {
        toast.info(
          `Dry Run: ${res.totalParentsNotified} parents eligible for notification today.`,
          { duration: 5000 }
        );
      } else {
        toast.success(
          `Alert triggered! ${res.totalParentsNotified} parent reminders processed.`
        );
      }
    } catch (e) {
      toast.error((e as Error).message || "Failed to trigger reminder");
    } finally {
      setTriggeringReminder(false);
    }
  };

  return (
    <DashboardLayout>
      <PageHeader title="Configuration" />

      {loading ? (
        <PageSkeleton />
      ) : (
        <>
          {error && (
            <div className="mb-5 flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
              <AlertCircle className="h-4 w-4 shrink-0" /> {error}
            </div>
          )}
          <div className="pb-28">
            <Tabs value={activeTab} onValueChange={setActiveTab} orientation="vertical">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
                <div className="w-full lg:sticky lg:top-24 lg:w-60 lg:shrink-0">
                  <TabsList>
                    {TABS.map((tab) => {
                      const Icon = tab.icon;
                      return (
                        <TabsTrigger key={tab.value} value={tab.value}>
                          <Icon className="w-4 h-4 shrink-0" />
                          {tab.label}
                        </TabsTrigger>
                      );
                    })}
                  </TabsList>
                </div>

                <div className="min-w-0 w-full max-w-2xl flex-1">
          {/* ── General Tab ── */}
          <TabsContent value="general">
            <div className="space-y-5">
            <div>
              <h2 className="text-lg font-bold text-gray-900">General Information</h2>
              <p className="text-sm text-gray-500 mt-1">Basic details and address of the madrasa</p>
            </div>
            <div className="bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3 text-sm">
              <p className="text-xs text-amber-600 font-semibold mb-0.5">
                Madrasa Slug (read-only)
              </p>
              <p className="font-mono font-bold text-amber-800">{config.slug}</p>
            </div>

            {SECTIONS.slice(0, 2).map((section) => (
              <motion.div
                key={section.title}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl border border-gray-100 p-5"
              >
                <p className="text-xs font-bold text-primary-600 uppercase tracking-wide mb-4">
                  {section.title}
                </p>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {section.fields.map(
                    ({ key, label, placeholder, type = "text" }) => (
                      <div key={key}>
                        <label htmlFor={key} className="block text-xs font-semibold text-gray-500 mb-1.5">
                          {label}
                        </label>
                        <Input
                          size="lg"
                          id={key}
                          type={type}
                          value={String(config[key] ?? "")}
                          onChange={(e) => handleChange(key, e.target.value)}
                          placeholder={placeholder}
                        />
                      </div>
                    ),
                  )}
                </div>
              </motion.div>
            ))}

            <StickySaveButton
              saving={saving}
              saved={saved}
              onSave={handleSave}
            />
            </div>
          </TabsContent>

          {/* ── Management Tab ── */}

          <TabsContent value="management">
            <div className="space-y-5">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Management &amp; Settings</h2>
              <p className="text-sm text-gray-500 mt-1">Head master details and madrasa preferences</p>
            </div>
            {SECTIONS.slice(2).map((section) => (
              <motion.div
                key={section.title}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl border border-gray-100 p-5"
              >
                <p className="text-xs font-bold text-primary-600 uppercase tracking-wide mb-4">
                  {section.title}
                </p>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {section.fields.map(
                    ({ key, label, placeholder, type = "text" }) => (
                      <div key={key}>
                        <label htmlFor={key} className="block text-xs font-semibold text-gray-500 mb-1.5">
                          {label}
                        </label>
                        <Input
                          size="lg"
                          id={key}
                          type={type}
                          value={String(config[key] ?? "")}
                          onChange={(e) => handleChange(key, e.target.value)}
                          placeholder={placeholder}
                        />
                      </div>
                    ),
                  )}
                </div>
              </motion.div>
            ))}

            <StickySaveButton
              saving={saving}
              saved={saved}
              onSave={handleSave}
            />
            </div>
          </TabsContent>

          {/* ── Attendance Tab ── */}
          <TabsContent value="attendance">
            <div className="space-y-5">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Attendance &amp; Visibility</h2>
              <p className="text-sm text-gray-500 mt-1">Attendance mode and committee dashboard visibility</p>
            </div>
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl border border-gray-100 p-5"
            >
              <div className="flex items-center gap-2 mb-4">
                <CalendarCheck className="w-4 h-4 text-primary-600" />
                <p className="text-xs font-bold text-primary-600 uppercase tracking-wide">
                  Attendance Mode
                </p>
              </div>
              <div className="mb-4">
                <DrawerSelector
                  title="Attendance Mode"
                  value={attMode}
                  onChange={(value) => setAttMode(value as "CLASS_BASED" | "PERIOD_BASED")}
                  options={[
                    { value: "CLASS_BASED", label: "Class Based" },
                    { value: "PERIOD_BASED", label: "Period Based" },
                  ]}
                />
                <p className="mt-2 text-xs text-gray-500">
                  {attMode === "CLASS_BASED"
                    ? "Class teacher marks whole class once per day"
                    : "Each subject teacher marks attendance per period"}
                </p>
              </div>
              {attError && (
                <div className="bg-red-50 text-red-600 text-xs px-3 py-2 rounded-xl mb-3">
                  {attError}
                </div>
              )}
              <div className="mt-4">
                <Button
                  variant={savedAtt ? "secondary" : "default"}
                  onClick={handleSaveAttendanceMode}
                  disabled={savingAtt || attMode === config.attendanceMode}
                >
                  {savingAtt ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : savedAtt ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" /> Saved!
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" /> Save Attendance Mode
                    </>
                  )}
                </Button>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl border border-gray-100 p-5"
            >
              <div className="flex items-center gap-2 mb-4">
                {showCommAtt ? (
                  <Eye className="w-4 h-4 text-primary-600" />
                ) : (
                  <EyeOff className="w-4 h-4 text-gray-400" />
                )}
                <p className="text-xs font-bold text-primary-600 uppercase tracking-wide">
                  Committee View
                </p>
              </div>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <label htmlFor="committee-attendance" className="text-sm font-semibold text-gray-800">
                    Show Attendance to Committee
                  </label>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Toggle visibility of student &amp; teacher attendance on the
                    committee dashboard
                  </p>
                </div>
                <Switch id="committee-attendance" checked={showCommAtt} onCheckedChange={setShowCommAtt} aria-label="Show attendance to committee" />
              </div>
              <div className="mt-4">
                <Button
                  variant={savedCommAtt ? "secondary" : "default"}
                  onClick={handleSaveCommitteeAttendance}
                  disabled={
                    savingCommAtt || showCommAtt === config.showCommitteeAttendance
                  }
                >
                  {savingCommAtt ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : savedCommAtt ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" /> Saved!
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" /> Save
                    </>
                  )}
                </Button>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl border border-gray-100 p-5"
            >
              <div className="flex items-center gap-2 mb-4">
                {showCommTC ? (
                  <Eye className="w-4 h-4 text-primary-600" />
                ) : (
                  <EyeOff className="w-4 h-4 text-gray-400" />
                )}
                <p className="text-xs font-bold text-primary-600 uppercase tracking-wide">
                  Committee View
                </p>
              </div>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <label htmlFor="committee-checkin" className="text-sm font-semibold text-gray-800">
                    Show Teacher Check-in to Committee
                  </label>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Toggle visibility of teacher check-in/check-out details on the
                    committee dashboard
                  </p>
                </div>
                <Switch id="committee-checkin" checked={showCommTC} onCheckedChange={setShowCommTC} aria-label="Show teacher check-in to committee" />
              </div>
              <div className="mt-4">
                <Button
                  variant={savedCommTC ? "secondary" : "default"}
                  onClick={handleSaveCommitteeTeacherCheckin}
                  disabled={
                    savingCommTC ||
                    showCommTC === config.showCommitteeTeacherCheckin
                  }
                >
                  {savingCommTC ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : savedCommTC ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" /> Saved!
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" /> Save
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
            </div>
          </TabsContent>

          {/* ── Ibadah Alert Tab ── */}
          <TabsContent value="ibadah">
            <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Daily Night Ibadah Alert</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Configure automated nightly push notifications sent to parents to remind them to record daily prayers and deeds.
                </p>
              </div>
              <Link
                to={slug ? `/m/${slug}/admin/ibadah-config` : "/admin/ibadah-config"}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-3 py-2 rounded-xl shrink-0 border border-emerald-100"
              >
                <span>Edit Scoring Rules</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Toggle & Schedule Card */}
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl border border-gray-100 p-5"
            >
              <div className="flex items-center gap-2 mb-4">
                <Moon className="w-4 h-4 text-emerald-600" />
                <p className="text-xs font-bold text-emerald-600 uppercase tracking-wide">
                  Notification Status &amp; Schedule
                </p>
              </div>

              <div className="flex items-center justify-between gap-4 pb-4 border-b border-gray-100">
                <div>
                  <label htmlFor="ibadah-reminder" className="text-sm font-semibold text-gray-800">
                    Enable Nightly Ibadah Reminder
                  </label>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Automatically send a push notification to all parents every evening
                  </p>
                </div>
                <Switch id="ibadah-reminder" checked={ibadahEnabled} onCheckedChange={setIbadahEnabled} aria-label="Enable nightly Ibadah reminder" />
              </div>

              {/* Schedule time selector */}
              <div className="pt-4">
                <label className="mb-1.5 block text-xs font-semibold text-gray-700">
                  Scheduled Alert Time (IST)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                  <DrawerSelector
                    title="Scheduled Alert Time (IST)"
                    value={ibadahTime}
                    onChange={setIbadahTime}
                    options={[
                      { value: "18:00", label: "06:00 PM (18:00)" },
                      { value: "18:30", label: "06:30 PM (18:30)" },
                      { value: "19:00", label: "07:00 PM (19:00) — Recommended" },
                      { value: "19:30", label: "07:30 PM (19:30)" },
                      { value: "20:00", label: "08:00 PM (20:00)" },
                      { value: "20:30", label: "08:30 PM (20:30)" },
                      { value: "21:00", label: "09:00 PM (21:00)" },
                      { value: "21:30", label: "09:30 PM (21:30)" },
                      { value: "22:00", label: "10:00 PM (22:00)" },
                    ]}
                  />
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Evaluated every 15 minutes between 18:00 and 23:00 IST. Sent once daily per madrasa.
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Notification content card */}
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4"
            >
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-emerald-600" />
                <p className="text-xs font-bold text-emerald-600 uppercase tracking-wide">
                  Notification Content
                </p>
              </div>

              <div>
                <label htmlFor="ibadah-title" className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Notification Title
                </label>
                <Input
                  size="lg"
                  id="ibadah-title"
                  type="text"
                  value={ibadahTitle}
                  onChange={(e) => setIbadahTitle(e.target.value)}
                  placeholder="Daily Ibadah Reminder (Default)"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Default: <span className="text-gray-600 font-medium">Daily Ibadah Reminder</span>
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="ibadah-body" className="block text-xs font-semibold text-gray-700">
                    Notification Message Body
                  </label>
                  <span className="text-[11px] bg-emerald-50 text-emerald-700 font-mono px-2 py-0.5 rounded-md border border-emerald-100">
                    {"{madrasaName}"} supported
                  </span>
                </div>
                <Textarea
                  id="ibadah-body"
                  rows={3}
                  value={ibadahBody}
                  onChange={(e) => setIbadahBody(e.target.value)}
                  placeholder="Assalamu Alaikum. Please remember to record today's prayers and good deeds for your children in {madrasaName}."
                />
                <p className="text-xs text-gray-400 mt-1">
                  Tip: Use <code className="bg-gray-100 px-1 py-0.5 rounded text-gray-700">{"{madrasaName}"}</code> to dynamically insert this madrasa&apos;s name.
                </p>
              </div>
            </motion.div>

            {/* Live Mobile Notification Preview */}
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl border border-gray-100 p-5"
            >
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <p className="text-xs font-bold text-emerald-600 uppercase tracking-wide">
                  Live Parent Phone Preview
                </p>
              </div>
              <div className="bg-gray-50 border border-gray-200/80 rounded-2xl p-4 max-w-md">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-md bg-emerald-600 flex items-center justify-center text-white text-[10px] font-bold">
                      M
                    </div>
                    <span className="text-xs font-semibold text-gray-700 truncate">
                      {config.name || "Madrasa App"}
                    </span>
                  </div>
                  <span className="text-[11px] text-gray-400 shrink-0">Just now</span>
                </div>
                <h4 className="text-xs font-bold text-gray-900 leading-snug">
                  {ibadahTitle.trim() || "Daily Ibadah Reminder"}
                </h4>
                <p className="text-xs text-gray-600 mt-1 line-clamp-3 leading-relaxed">
                  {(ibadahBody.trim() || "Assalamu Alaikum. Please remember to record today's prayers and good deeds for your children in {madrasaName}.").replace(
                    /\{madrasaName\}/g,
                    config.name || "our Madrasa"
                  )}
                </p>
              </div>
            </motion.div>

            {/* Buttons: Save & Test */}
            <div className="space-y-3">
              <Button
                type="button"
                variant={savedIbadah ? "secondary" : "default"}
                onClick={handleSaveIbadahReminder}
                disabled={savingIbadah}
              >
                {savingIbadah ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : savedIbadah ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" /> Settings Saved!
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" /> Save Ibadah Alert Settings
                  </>
                )}
              </Button>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleTestTriggerReminder(true)}
                  disabled={triggeringReminder}
                >
                  <Eye className="w-3.5 h-3.5 text-gray-500" />
                  Preview Audience (Dry Run)
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleTestTriggerReminder(false)}
                  disabled={triggeringReminder}
                >
                  {triggeringReminder ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5 text-emerald-600" />
                  )}
                  Send Test Alert Now
                </Button>
              </div>
            </div>
            </div>
          </TabsContent>

          {/* ── Admin Account Tab ── */}
          <TabsContent value="admin-account">
            <div className="space-y-5">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Admin Account</h2>
              <p className="text-sm text-gray-500 mt-1">Update your admin login credentials</p>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl border border-gray-100 p-5"
            >
              <div className="flex items-center gap-2 mb-4">
                <KeyRound className="w-4 h-4 text-primary-600" />
                <p className="text-xs font-bold text-primary-600 uppercase tracking-wide">
                  Username
                </p>
              </div>
              <div className="mb-4">
                <p className="text-xs text-gray-500 mb-1">Current username</p>
                <p className="text-sm font-semibold text-gray-800 bg-gray-50 px-3 py-2 rounded-xl border border-gray-200">
                  {config.loginEmail ?? config.loginPhone ?? "—"}
                </p>
              </div>
              <div>
                <label htmlFor="new-username" className="block text-xs font-semibold text-gray-500 mb-1.5">
                  New username (email or phone)
                </label>
                <Input
                  size="lg"
                  id="new-username"
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="admin@madrasa.com or +91 9876543210"
                />
              </div>
              {usernameError && (
                <div className="bg-red-50 text-red-600 text-xs px-3 py-2 rounded-xl mt-3">
                  {usernameError}
                </div>
              )}
              <div className="mt-4">
                <Button
                  variant={savedUsername ? "secondary" : "default"}
                  onClick={handleSaveUsername}
                  disabled={savingUsername || !newUsername.trim()}
                >
                  {savingUsername ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : savedUsername ? (
                    <><CheckCircle2 className="w-4 h-4" /> Saved!</>
                  ) : (
                    <><Save className="w-4 h-4" /> Update Username</>
                  )}
                </Button>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl border border-gray-100 p-5"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-primary-600" />
                  <p className="text-xs font-bold text-primary-600 uppercase tracking-wide">
                    Password
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={showPasswords ? "Hide passwords" : "Show passwords"}
                  onClick={() => setShowPasswords((v) => !v)}
                >
                  {showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
              {/* Browser autofill decoy trap to prevent Chrome from auto-injecting credentials */}
              <div style={{ position: "absolute", opacity: 0, height: 0, width: 0, overflow: "hidden", zIndex: -1 }}>
                <input type="text" name="fake_username_trap" tabIndex={-1} autoComplete="username" />
                <input type="password" name="fake_password_trap" tabIndex={-1} autoComplete="current-password" />
              </div>

              <div className="space-y-4">
                <div>
                  <label htmlFor="new-password" className="block text-xs font-semibold text-gray-500 mb-1.5">
                    New password
                  </label>
                  <Input
                    size="lg"
                    id="new-password"
                    type={showPasswords ? "text" : "password"}
                    name="client_admin_new_pwd_custom"
                    autoComplete="new-password"
                    readOnly
                    onFocus={(e) => e.target.removeAttribute("readOnly")}
                    onMouseDown={(e) => (e.target as HTMLInputElement).removeAttribute("readOnly")}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                  />
                </div>
                <div>
                  <label htmlFor="confirm-password" className="block text-xs font-semibold text-gray-500 mb-1.5">
                    Confirm new password
                  </label>
                  <Input
                    size="lg"
                    id="confirm-password"
                    type={showPasswords ? "text" : "password"}
                    name="client_admin_confirm_pwd_custom"
                    autoComplete="new-password"
                    readOnly
                    onFocus={(e) => e.target.removeAttribute("readOnly")}
                    onMouseDown={(e) => (e.target as HTMLInputElement).removeAttribute("readOnly")}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                  />
                </div>
              </div>
              {passwordError && (
                <div className="bg-red-50 text-red-600 text-xs px-3 py-2 rounded-xl mt-3">
                  {passwordError}
                </div>
              )}
              <div className="mt-4">
                <Button
                  variant={savedPassword ? "secondary" : "default"}
                  onClick={handleSavePassword}
                  disabled={savingPassword || !newPassword || !confirmPassword}
                >
                  {savingPassword ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : savedPassword ? (
                    <><CheckCircle2 className="w-4 h-4" /> Saved!</>
                  ) : (
                    <><Save className="w-4 h-4" /> Change Password</>
                  )}
                </Button>
              </div>
            </motion.div>
            </div>
          </TabsContent>

          {/* ── Parent Modules Tab ── */}
          <TabsContent value="parent-modules">
            <div className="space-y-5">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Parent Module Access</h2>
              <p className="text-sm text-gray-500 mt-1">Enable or disable modules visible to parents in their dashboard</p>
            </div>
            <div className="divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-none">
              {PARENT_MODULES.map((mod) => {
                const enabled = !disabledModules.includes(mod.key);
                return (
                  <div key={mod.key} className="flex w-full items-center justify-between gap-4 px-4 py-4 transition-colors hover:bg-gray-50 focus-within:bg-gray-50">
                    <div className="min-w-0 pr-2">
                      <p className="text-sm font-semibold text-gray-800">{mod.label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{mod.desc}</p>
                    </div>
                    <Switch
                      checked={enabled}
                      aria-label={`${mod.label} for parents`}
                      onCheckedChange={() =>
                        setDisabledModules((prev) =>
                          enabled ? [...prev, mod.key] : prev.filter((k) => k !== mod.key)
                        )
                      }
                    />
                  </div>
                );
              })}
            </div>
            <div className="mt-4">
              <Button
                variant={savedParentToggles ? "secondary" : "default"}
                onClick={handleSaveParentModules}
                disabled={savingParentToggles}
              >
                {savingParentToggles ? <Loader2 className="w-4 h-4 animate-spin" /> :
                 savedParentToggles ? <><CheckCircle2 className="w-4 h-4" /> Saved!</> :
                 <><Save className="w-4 h-4" /> Save Module Settings</>}
              </Button>
            </div>
            </div>
          </TabsContent>
                </div>
              </div>
            </Tabs>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}

function StickySaveButton({
  saving,
  saved,
  onSave,
}: {
  saving: boolean;
  saved: boolean;
  onSave: () => void;
}) {
  return (
    <div className="sticky bottom-20 lg:bottom-6">
      <Button
        variant={saved ? "secondary" : "default"}
        onClick={onSave}
        disabled={saving}
      >
        {saving ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : saved ? (
          <>
            <CheckCircle2 className="w-5 h-5" /> Saved!
          </>
        ) : (
          <>
            <Save className="w-5 h-5" /> Save Configuration
          </>
        )}
      </Button>
    </div>
  );
}
