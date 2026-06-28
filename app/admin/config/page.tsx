import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import * as Tabs from "@radix-ui/react-tabs";
import {
  getClientConfig,
  updateClientConfig,
  type ClientConfig,
} from "@/lib/config-api";
import { useAuthStore } from "@/store/auth";
import {
  Settings,
  Save,
  CheckCircle2,
  Loader2,
  AlertCircle,
  CalendarCheck,
  Eye,
  EyeOff,
  Users,
  Building2,
  UserCog,
  Radio,
  ShieldCheck,
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { PageSkeleton } from "@/components/ui/Skeleton";

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
  { value: "parent-modules", label: "Parent Modules", icon: ShieldCheck },
];

export default function AdminConfigPage() {
  const { user, accessToken, activeClientId, setAttendanceMode } =
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

  useEffect(() => {
    if (!cid || !token) return;
    getClientConfig(cid, token)
      .then((data) => {
        setConfig(data);
        if (data.attendanceMode) setAttMode(data.attendanceMode);
        if (data.showCommitteeAttendance !== undefined) setShowCommAtt(data.showCommitteeAttendance);
        if (data.showCommitteeTeacherCheckin !== undefined) setShowCommTC(data.showCommitteeTeacherCheckin);
        setDisabledModules(data.disabledParentModules ?? []);
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
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setError((e as Error).message);
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
      setAttendanceMode(attMode);
      setSavedAtt(true);
      setTimeout(() => setSavedAtt(false), 3000);
    } catch (e) {
      setAttError((e as Error).message);
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

  return (
    <DashboardLayout>
      <PageHeader
        title="Configuration"
        subtitle="Madrasa settings"
        icon={Settings}
      />

      {loading ? (
        <PageSkeleton />
      ) : (
        <Tabs.Root defaultValue="general" className="lg:flex lg:gap-6 lg:items-start pb-28">
          {error && (
            <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-2xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}

          <Tabs.List className="flex gap-6 overflow-x-auto border-b border-gray-200 scrollbar-none lg:flex-col lg:border-b-0 lg:border-r lg:border-gray-200 lg:shrink-0 lg:w-60 lg:gap-0.5 lg:sticky lg:top-24">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <Tabs.Trigger
                  key={tab.value}
                  value={tab.value}
                  className="data-[state=active]:text-emerald-600 data-[state=active]:bg-emerald-50 px-4 py-3 text-gray-500 border-b-2 border-transparent hover:text-emerald-600 hover:border-b-emerald-300 flex items-center gap-2 px-1 py-3 text-sm font-semibold transition-all whitespace-nowrap -mb-px lg:w-full lg:px-3 lg:py-2.5 lg:-mb-0 lg:border-b-0 lg:border-r-0 lg:data-[state=active]:border-b-0 lg:data-[state=active]:border-r-emerald-600 lg:hover:border-r-emerald-300 lg:hover:border-b-transparent"
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {tab.label}
                </Tabs.Trigger>
              );
            })}
          </Tabs.List>

          <div className="min-w-0 flex-1 space-y-5 lg:max-w-2xl">
          {/* ── General Tab ── */}
          <Tabs.Content value="general" className="space-y-5">
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
                <p className="text-xs font-bold text-emerald-600 uppercase tracking-wide mb-4">
                  {section.title}
                </p>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {section.fields.map(
                    ({ key, label, placeholder, type = "text" }) => (
                      <div key={key}>
                        <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                          {label}
                        </label>
                        <input
                          type={type}
                          value={String(config[key] ?? "")}
                          onChange={(e) => handleChange(key, e.target.value)}
                          placeholder={placeholder}
                          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
          </Tabs.Content>

          {/* ── Management Tab ── */}

          <div className="mt-10"></div>
          <Tabs.Content value="management" className="space-y-5">
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
                <p className="text-xs font-bold text-emerald-600 uppercase tracking-wide mb-4">
                  {section.title}
                </p>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {section.fields.map(
                    ({ key, label, placeholder, type = "text" }) => (
                      <div key={key}>
                        <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                          {label}
                        </label>
                        <input
                          type={type}
                          value={String(config[key] ?? "")}
                          onChange={(e) => handleChange(key, e.target.value)}
                          placeholder={placeholder}
                          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
          </Tabs.Content>

          {/* ── Attendance Tab ── */}
          <Tabs.Content value="attendance" className="space-y-5">
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
                <CalendarCheck className="w-4 h-4 text-emerald-600" />
                <p className="text-xs font-bold text-emerald-600 uppercase tracking-wide">
                  Attendance Mode
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                {(["CLASS_BASED", "PERIOD_BASED"] as const).map((mode) => (
                  <label
                    key={mode}
                    className={cn(
                      "flex flex-col p-4 rounded-2xl border-2 cursor-pointer transition-all",
                      attMode === mode
                        ? "border-emerald-500 bg-emerald-50"
                        : "border-gray-200 bg-gray-50",
                    )}
                  >
                    <input
                      type="radio"
                      name="attendanceMode"
                      value={mode}
                      checked={attMode === mode}
                      onChange={() => setAttMode(mode)}
                      className="sr-only"
                    />
                    <span
                      className={cn(
                        "text-sm font-bold mb-1",
                        attMode === mode ? "text-emerald-700" : "text-gray-700",
                      )}
                    >
                      {mode === "CLASS_BASED" ? "Class Based" : "Period Based"}
                    </span>
                    <span className="text-xs text-gray-500">
                      {mode === "CLASS_BASED"
                        ? "Class teacher marks whole class once per day"
                        : "Each subject teacher marks attendance per period"}
                    </span>
                  </label>
                ))}
              </div>
              {attError && (
                <div className="bg-red-50 text-red-600 text-xs px-3 py-2 rounded-xl mb-3">
                  {attError}
                </div>
              )}
              <button
                onClick={handleSaveAttendanceMode}
                disabled={savingAtt || attMode === config.attendanceMode}
                className={cn(
                  "flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-bold transition-colors",
                  savedAtt
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60",
                )}
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
              </button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl border border-gray-100 p-5"
            >
              <div className="flex items-center gap-2 mb-4">
                {showCommAtt ? (
                  <Eye className="w-4 h-4 text-emerald-600" />
                ) : (
                  <EyeOff className="w-4 h-4 text-gray-400" />
                )}
                <p className="text-xs font-bold text-emerald-600 uppercase tracking-wide">
                  Committee View
                </p>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-800">
                    Show Attendance to Committee
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Toggle visibility of student &amp; teacher attendance on the
                    committee dashboard
                  </p>
                </div>
                <button
                  onClick={() => setShowCommAtt((v) => !v)}
                  className={`relative w-12 h-6 rounded-full transition-colors duration-200 shrink-0 ${
                    showCommAtt ? "bg-emerald-500" : "bg-gray-300"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                      showCommAtt ? "translate-x-6" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
              <button
                onClick={handleSaveCommitteeAttendance}
                disabled={
                  savingCommAtt || showCommAtt === config.showCommitteeAttendance
                }
                className={cn(
                  "flex items-center justify-center gap-2 w-full py-3 mt-4 rounded-xl text-sm font-bold transition-colors",
                  savedCommAtt
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60",
                )}
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
              </button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl border border-gray-100 p-5"
            >
              <div className="flex items-center gap-2 mb-4">
                {showCommTC ? (
                  <Eye className="w-4 h-4 text-emerald-600" />
                ) : (
                  <EyeOff className="w-4 h-4 text-gray-400" />
                )}
                <p className="text-xs font-bold text-emerald-600 uppercase tracking-wide">
                  Committee View
                </p>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-800">
                    Show Teacher Check-in to Committee
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Toggle visibility of teacher check-in/check-out details on the
                    committee dashboard
                  </p>
                </div>
                <button
                  onClick={() => setShowCommTC((v) => !v)}
                  className={`relative w-12 h-6 rounded-full transition-colors duration-200 shrink-0 ${
                    showCommTC ? "bg-emerald-500" : "bg-gray-300"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                      showCommTC ? "translate-x-6" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
              <button
                onClick={handleSaveCommitteeTeacherCheckin}
                disabled={
                  savingCommTC ||
                  showCommTC === config.showCommitteeTeacherCheckin
                }
                className={cn(
                  "flex items-center justify-center gap-2 w-full py-3 mt-4 rounded-xl text-sm font-bold transition-colors",
                  savedCommTC
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60",
                )}
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
              </button>
            </motion.div>
          </Tabs.Content>

          {/* ── Parent Modules Tab ── */}
          <Tabs.Content value="parent-modules" className="space-y-5">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Parent Module Access</h2>
              <p className="text-sm text-gray-500 mt-1">Enable or disable modules visible to parents in their dashboard</p>
            </div>
            <motion.div
              initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl border border-gray-100 p-5"
            >
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-4 h-4 text-emerald-600" />
                <p className="text-xs font-bold text-emerald-600 uppercase tracking-wide">Parent Modules</p>
              </div>
              <div className="space-y-3">
                {PARENT_MODULES.map((mod) => {
                  const enabled = !disabledModules.includes(mod.key);
                  return (
                    <div key={mod.key} className="flex items-center justify-between py-2">
                      <div className="pr-4">
                        <p className="text-sm font-semibold text-gray-800">{mod.label}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{mod.desc}</p>
                      </div>
                      <button
                        onClick={() =>
                          setDisabledModules((prev) =>
                            enabled ? [...prev, mod.key] : prev.filter((k) => k !== mod.key)
                          )
                        }
                        className={`relative w-12 h-6 rounded-full transition-colors duration-200 shrink-0 ${
                          enabled ? "bg-emerald-500" : "bg-gray-300"
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                            enabled ? "translate-x-6" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>
                  );
                })}
              </div>
              <button
                onClick={handleSaveParentModules}
                disabled={savingParentToggles}
                className={cn(
                  "flex items-center justify-center gap-2 w-full py-3 mt-4 rounded-xl text-sm font-bold transition-colors",
                  savedParentToggles ? "bg-emerald-100 text-emerald-700" : "bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60",
                )}
              >
                {savingParentToggles ? <Loader2 className="w-4 h-4 animate-spin" /> :
                 savedParentToggles  ? <><CheckCircle2 className="w-4 h-4" /> Saved!</> :
                                        <><Save className="w-4 h-4" /> Save Module Settings</>}
              </button>
            </motion.div>
          </Tabs.Content>
          </div>
        </Tabs.Root>
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
      <button
        onClick={onSave}
        disabled={saving}
        className={`w-full lg:w-auto lg:px-10 flex items-center justify-center gap-2.5 py-4 rounded-2xl font-bold text-sm transition-all shadow-lg ${
          saved
            ? "bg-emerald-100 text-emerald-700"
            : "bg-emerald-600 text-white hover:bg-emerald-700"
        }`}
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
      </button>
    </div>
  );
}
