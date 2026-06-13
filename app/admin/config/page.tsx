import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { getClientConfig, updateClientConfig, type ClientConfig } from "@/lib/config-api";
import { useAuthStore } from "@/store/auth";
import { Settings, Save, CheckCircle2, Loader2, AlertCircle, CalendarCheck, Eye, EyeOff } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

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
      { key: "name",          label: "Madrasa Name",    placeholder: "e.g. Darul Huda Madrasa" },
      { key: "arabicName",    label: "Arabic Name",     placeholder: "دار الهدى" },
      { key: "phone",         label: "Phone",           placeholder: "+91 9876543210", type: "tel" },
      { key: "email",         label: "Email",           placeholder: "info@madrasa.com", type: "email" },
      { key: "website",       label: "Website",         placeholder: "https://madrasa.com", type: "url" },
      { key: "establishedYear", label: "Established Year", placeholder: "1995", type: "number" },
    ],
  },
  {
    title: "Address",
    fields: [
      { key: "address",  label: "Address",   placeholder: "Street address" },
      { key: "city",     label: "City",      placeholder: "Kozhikode" },
      { key: "state",    label: "State",     placeholder: "Kerala" },
      { key: "country",  label: "Country",   placeholder: "India" },
      { key: "pincode",  label: "Pincode",   placeholder: "673001" },
    ],
  },
  {
    title: "Principal / Management",
    fields: [
      { key: "principalName",  label: "Principal Name",  placeholder: "Dr. Abdul Rahman" },
      { key: "principalPhone", label: "Principal Phone", placeholder: "+91 9876543210", type: "tel" },
      { key: "principalEmail", label: "Principal Email", placeholder: "principal@madrasa.com", type: "email" },
    ],
  },
  {
    title: "Settings",
    fields: [
      { key: "timezone",  label: "Timezone",  placeholder: "Asia/Kolkata" },
      { key: "language",  label: "Language",  placeholder: "en" },
      { key: "currency",  label: "Currency",  placeholder: "INR" },
      { key: "logo",      label: "Logo URL",  placeholder: "https://..." },
    ],
  },
];

export default function AdminConfigPage() {
  const { user, accessToken, activeClientId, setAttendanceMode } = useAuthStore();
  const cid   = activeClientId ?? "";
  const token = accessToken ?? "";

  const [config, setConfig]           = useState<Partial<ClientConfig>>({});
  const [loading, setLoading]         = useState(true);
  const [saving, setSaving]           = useState(false);
  const [saved, setSaved]             = useState(false);
  const [error, setError]             = useState("");
  const [attMode, setAttMode]         = useState<"CLASS_BASED" | "PERIOD_BASED">("CLASS_BASED");
  const [savingAtt, setSavingAtt]     = useState(false);
  const [savedAtt, setSavedAtt]       = useState(false);
  const [attError, setAttError]       = useState("");
  const [showCommAtt, setShowCommAtt] = useState(true);
  const [savingCommAtt, setSavingCommAtt] = useState(false);
  const [savedCommAtt, setSavedCommAtt]   = useState(false);
  const [showCommTC, setShowCommTC]       = useState(true);
  const [savingCommTC, setSavingCommTC]   = useState(false);
  const [savedCommTC, setSavedCommTC]     = useState(false);

  useEffect(() => {
    if (!cid || !token) return;
    getClientConfig(cid, token)
      .then((data) => {
        setConfig(data);
        if (data.attendanceMode) setAttMode(data.attendanceMode);
        if (data.showCommitteeAttendance !== undefined) setShowCommAtt(data.showCommitteeAttendance);
        if (data.showCommitteeTeacherCheckin !== undefined) setShowCommTC(data.showCommitteeTeacherCheckin);
      })
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, [cid, token]);

  const handleChange = (key: keyof ClientConfig, value: string) => {
    setConfig((prev) => ({ ...prev, [key]: value || null }));
  };

  const handleSave = async () => {
    if (!cid || !token) return;
    setSaving(true); setError("");
    try {
      const updated = await updateClientConfig(cid, token, {
        name:            config.name,
        arabicName:      config.arabicName,
        phone:           config.phone,
        email:           config.email,
        website:         config.website,
        establishedYear: config.establishedYear ? Number(config.establishedYear) : undefined,
        address:         config.address,
        city:            config.city,
        state:           config.state,
        country:         config.country,
        pincode:         config.pincode,
        principalName:   config.principalName,
        principalPhone:  config.principalPhone,
        principalEmail:  config.principalEmail,
        timezone:        config.timezone,
        language:        config.language,
        currency:        config.currency,
        logo:            config.logo,
      });
      setConfig(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) { setError((e as Error).message); }
    finally { setSaving(false); }
  };

  const handleSaveAttendanceMode = async () => {
    if (!cid || !token) return;
    setSavingAtt(true); setAttError("");
    try {
      await updateClientConfig(cid, token, { attendanceMode: attMode });
      setAttendanceMode(attMode);
      setSavedAtt(true);
      setTimeout(() => setSavedAtt(false), 3000);
    } catch (e) { setAttError((e as Error).message); }
    finally { setSavingAtt(false); }
  };

  const handleSaveCommitteeAttendance = async () => {
    if (!cid || !token) return;
    setSavingCommAtt(true);
    try {
      await updateClientConfig(cid, token, { showCommitteeAttendance: showCommAtt });
      setConfig((prev) => ({ ...prev, showCommitteeAttendance: showCommAtt }));
      setSavedCommAtt(true);
      setTimeout(() => setSavedCommAtt(false), 3000);
    } catch (e) { /* ignore */ }
    finally { setSavingCommAtt(false); }
  };

  const handleSaveCommitteeTeacherCheckin = async () => {
    if (!cid || !token) return;
    setSavingCommTC(true);
    try {
      await updateClientConfig(cid, token, { showCommitteeTeacherCheckin: showCommTC });
      setConfig((prev) => ({ ...prev, showCommitteeTeacherCheckin: showCommTC }));
      setSavedCommTC(true);
      setTimeout(() => setSavedCommTC(false), 3000);
    } catch (e) { /* ignore */ }
    finally { setSavingCommTC(false); }
  };

  return (
    <DashboardLayout>
      <PageHeader title="Configuration" subtitle="Madrasa settings" icon={Settings} />

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      ) : (
        <div className="space-y-5 max-w-2xl pb-28">
          {error && (
            <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-2xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}

          {/* Slug (read-only) */}
          <div className="bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3 text-sm">
            <p className="text-xs text-amber-600 font-semibold mb-0.5">Madrasa Slug (read-only)</p>
            <p className="font-mono font-bold text-amber-800">{config.slug}</p>
          </div>

          {SECTIONS.map((section) => (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl border border-gray-100 p-5"
            >
              <p className="text-xs font-bold text-emerald-600 uppercase tracking-wide mb-4">{section.title}</p>
              <div className="space-y-4">
                {section.fields.map(({ key, label, placeholder, type = "text" }) => (
                  <div key={key}>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">{label}</label>
                    <input
                      type={type}
                      value={String(config[key] ?? "")}
                      onChange={(e) => handleChange(key, e.target.value)}
                      placeholder={placeholder}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                ))}
              </div>
            </motion.div>
          ))}

          {/* Attendance Mode */}
          <motion.div
            initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-gray-100 p-5"
          >
            <div className="flex items-center gap-2 mb-4">
              <CalendarCheck className="w-4 h-4 text-emerald-600" />
              <p className="text-xs font-bold text-emerald-600 uppercase tracking-wide">Attendance Mode</p>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {(["CLASS_BASED", "PERIOD_BASED"] as const).map((mode) => (
                <label key={mode}
                  className={cn(
                    "flex flex-col p-4 rounded-2xl border-2 cursor-pointer transition-all",
                    attMode === mode ? "border-emerald-500 bg-emerald-50" : "border-gray-200 bg-gray-50",
                  )}
                >
                  <input type="radio" name="attendanceMode" value={mode}
                    checked={attMode === mode}
                    onChange={() => setAttMode(mode)}
                    className="sr-only"
                  />
                  <span className={cn("text-sm font-bold mb-1",
                    attMode === mode ? "text-emerald-700" : "text-gray-700")}>
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
              <div className="bg-red-50 text-red-600 text-xs px-3 py-2 rounded-xl mb-3">{attError}</div>
            )}
            <button
              onClick={handleSaveAttendanceMode}
              disabled={savingAtt || attMode === config.attendanceMode}
              className={cn(
                "flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-bold transition-colors",
                savedAtt ? "bg-emerald-100 text-emerald-700" : "bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60",
              )}
            >
              {savingAtt ? <Loader2 className="w-4 h-4 animate-spin" /> :
               savedAtt  ? <><CheckCircle2 className="w-4 h-4" /> Saved!</> :
                           <><Save className="w-4 h-4" /> Save Attendance Mode</>}
            </button>
          </motion.div>

          {/* Committee Attendance Toggle */}
          <motion.div
            initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-gray-100 p-5"
          >
            <div className="flex items-center gap-2 mb-4">
              {showCommAtt
                ? <Eye className="w-4 h-4 text-emerald-600" />
                : <EyeOff className="w-4 h-4 text-gray-400" />}
              <p className="text-xs font-bold text-emerald-600 uppercase tracking-wide">Committee View</p>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-800">Show Attendance to Committee</p>
                <p className="text-xs text-gray-500 mt-0.5">Toggle visibility of student &amp; teacher attendance on the committee dashboard</p>
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
              disabled={savingCommAtt || showCommAtt === config.showCommitteeAttendance}
              className={cn(
                "flex items-center justify-center gap-2 w-full py-3 mt-4 rounded-xl text-sm font-bold transition-colors",
                savedCommAtt ? "bg-emerald-100 text-emerald-700" : "bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60",
              )}
            >
              {savingCommAtt ? <Loader2 className="w-4 h-4 animate-spin" /> :
               savedCommAtt  ? <><CheckCircle2 className="w-4 h-4" /> Saved!</> :
                               <><Save className="w-4 h-4" /> Save</>}
            </button>
          </motion.div>

          {/* Committee Teacher Checkin Toggle */}
          <motion.div
            initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-gray-100 p-5"
          >
            <div className="flex items-center gap-2 mb-4">
              {showCommTC
                ? <Eye className="w-4 h-4 text-emerald-600" />
                : <EyeOff className="w-4 h-4 text-gray-400" />}
              <p className="text-xs font-bold text-emerald-600 uppercase tracking-wide">Committee View</p>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-800">Show Teacher Check-in to Committee</p>
                <p className="text-xs text-gray-500 mt-0.5">Toggle visibility of teacher check-in/check-out details on the committee dashboard</p>
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
              disabled={savingCommTC || showCommTC === config.showCommitteeTeacherCheckin}
              className={cn(
                "flex items-center justify-center gap-2 w-full py-3 mt-4 rounded-xl text-sm font-bold transition-colors",
                savedCommTC ? "bg-emerald-100 text-emerald-700" : "bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60",
              )}
            >
              {savingCommTC ? <Loader2 className="w-4 h-4 animate-spin" /> :
               savedCommTC  ? <><CheckCircle2 className="w-4 h-4" /> Saved!</> :
                               <><Save className="w-4 h-4" /> Save</>}
            </button>
          </motion.div>

          {/* Sticky save */}
          <div className="sticky bottom-20 lg:bottom-6">
            <button
              onClick={handleSave}
              disabled={saving}
              className={`w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl font-bold text-sm transition-all shadow-lg ${
                saved ? "bg-emerald-100 text-emerald-700" : "bg-emerald-600 text-white hover:bg-emerald-700"
              }`}
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> :
               saved  ? <><CheckCircle2 className="w-5 h-5" /> Saved!</> :
                        <><Save className="w-5 h-5" /> Save Configuration</>}
            </button>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
