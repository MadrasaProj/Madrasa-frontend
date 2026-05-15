import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { getClientConfig, updateClientConfig, type ClientConfig } from "@/lib/config-api";
import { useAuthStore } from "@/store/auth";
import { Settings, Save, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";

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
  const { user, accessToken, activeClientId } = useAuthStore();
  const cid   = activeClientId ?? "";
  const token = accessToken ?? "";

  const [config, setConfig]     = useState<Partial<ClientConfig>>({});
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const [error, setError]       = useState("");

  useEffect(() => {
    if (!cid || !token) return;
    getClientConfig(cid, token)
      .then((data) => setConfig(data))
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
