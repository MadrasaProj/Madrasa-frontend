import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Building2,
  Check,
  Copy,
  Loader2,
  RefreshCw,
  Send,
  Sparkles,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { ResponsivePopover } from "@/components/ui/responsivePopover";
import { cn } from "@/lib/utils";
import {
  createMadrasaFromLead,
  pullLeadData,
  type CreateMadrasaFromLeadResponse,
  type LeadDetail,
  type PullLeadDataResponse,
  type PulledParentData,
} from "@/lib/crm-api";

interface CreateMadrasaPopoverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: LeadDetail;
  token: string;
  onCreated?: (result: CreateMadrasaFromLeadResponse) => void;
}

const inputCls =
  "w-full min-h-[40px] px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-300";
const labelCls = "text-[11px] text-gray-500 mb-1 block font-semibold uppercase tracking-wide";

const PASSWORD_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

function generatePassword(prefix: string) {
  let suffix = "";
  for (let i = 0; i < 6; i += 1) {
    suffix += PASSWORD_CHARS[Math.floor(Math.random() * PASSWORD_CHARS.length)];
  }
  return `${prefix}@${suffix}`;
}

function slugify(value: string) {
  return (value || "")
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

function normaliseWhatsAppPhone(phone?: string) {
  const digits = (phone || "").replace(/[^0-9]/g, "");
  if (!digits) return "";
  return digits.length === 10 ? `91${digits}` : digits;
}

export function CreateMadrasaPopover({
  open,
  onOpenChange,
  lead,
  token,
  onCreated,
}: CreateMadrasaPopoverProps) {
  const primaryContact = useMemo(
    () => lead.contacts?.find((c) => c.isPrimary) || lead.contacts?.[0],
    [lead.contacts],
  );

  const [step, setStep] = useState<"form" | "success">("form");
  const [pulling, setPulling] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pulled, setPulled] = useState<PullLeadDataResponse | null>(null);
  const [result, setResult] = useState<CreateMadrasaFromLeadResponse | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const [form, setForm] = useState({
    name: lead.name || "",
    slug: slugify(lead.name || ""),
    arabicName: "",
    city: lead.place || "",
    state: lead.district || "",
    attendanceMode: "CLASS_BASED" as "CLASS_BASED" | "PERIOD_BASED",
    status: "ACTIVE" as "ACTIVE" | "TRIAL" | "SUSPENDED" | "CANCELLED",
    isLoginEnabled: true,
    adminName: primaryContact?.name || "",
    adminIdentifier: primaryContact?.phone || primaryContact?.email || "",
    adminPassword: "",
    committieUsername: "",
    committiePassword: "",
  });

  const [parentData, setParentData] = useState<PulledParentData[]>([]);

  const set = useCallback(
    (key: keyof typeof form, value: string | boolean) => {
      setForm((current) => {
        const next = { ...current, [key]: value };
        if (key === "name") {
          const nextSlug = slugify(String(value));
          next.slug = nextSlug;
          if (!current.committieUsername || current.committieUsername.startsWith("committee.")) {
            next.committieUsername = `committee.${nextSlug || "madrasa"}`;
          }
        }
        return next;
      });
    },
    [],
  );

  const reset = useCallback(() => {
    const slug = slugify(lead.name || "");
    setStep("form");
    setError("");
    setCopied(false);
    setResult(null);
    setPulled(null);
    setParentData([]);
    setForm({
      name: lead.name || "",
      slug,
      arabicName: "",
      city: lead.place || "",
      state: lead.district || "",
      attendanceMode: "CLASS_BASED",
      status: "ACTIVE",
      isLoginEnabled: true,
      adminName: primaryContact?.name || "",
      adminIdentifier: primaryContact?.phone || primaryContact?.email || "",
      adminPassword: generatePassword("Admin"),
      committieUsername: `committee.${slug || "madrasa"}`,
      committiePassword: generatePassword("Committee"),
    });
  }, [lead.name, lead.place, lead.district, primaryContact]);

  const loadPullData = useCallback(async () => {
    if (!token) return;
    setPulling(true);
    setError("");
    try {
      const data = await pullLeadData(lead.id, token);
      setPulled(data);
      setParentData(data.parentData || []);
      setForm((current) => ({
        ...current,
        name: current.name || data.madrasa.name,
        slug: current.slug || data.madrasa.slug,
        city: current.city || data.madrasa.city || "",
        state: current.state || data.madrasa.state || "",
        adminName: current.adminName || data.admin.name || "",
        adminIdentifier: current.adminIdentifier || data.admin.identifier || data.admin.phone || "",
        adminPassword: current.adminPassword || data.admin.password || generatePassword("Admin"),
        committieUsername:
          current.committieUsername ||
          data.committee.username ||
          `committee.${data.madrasa.slug}`,
        committiePassword:
          current.committiePassword ||
          data.committee.password ||
          generatePassword("Committee"),
      }));
    } catch (err: any) {
      setError(err?.message || "Unable to pull parent data.");
    } finally {
      setPulling(false);
    }
  }, [lead.id, token]);

  useEffect(() => {
    if (!open) return;
    reset();
    void loadPullData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, lead.id]);

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      setError("Madrasa name is required.");
      return;
    }
    if (!form.slug.trim()) {
      setError("Portal slug is required.");
      return;
    }
    if (!form.adminIdentifier.trim()) {
      setError("Admin phone number or email is required.");
      return;
    }
    if (!form.adminPassword.trim()) {
      setError("Admin password is required.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const response = await createMadrasaFromLead(
        lead.id,
        {
          name: form.name.trim(),
          slug: form.slug.trim(),
          arabicName: form.arabicName.trim() || undefined,
          city: form.city.trim() || undefined,
          state: form.state.trim() || undefined,
          attendanceMode: form.attendanceMode,
          status: form.status,
          isLoginEnabled: form.isLoginEnabled,
          adminName: form.adminName.trim() || undefined,
          adminIdentifier: form.adminIdentifier.trim(),
          adminPassword: form.adminPassword,
          committieUsername: form.committieUsername.trim() || undefined,
          committiePassword: form.committiePassword || undefined,
          parentData,
        },
        token,
      );
      setResult(response);
      setStep("success");
      onCreated?.(response);
      toast.success("Madrasa created successfully.");
    } catch (err: any) {
      setError(err?.message || "Failed to create madrasa.");
    } finally {
      setSubmitting(false);
    }
  };

  const copyMessage = async () => {
    if (!result?.whatsappMessage) return;
    await navigator.clipboard.writeText(result.whatsappMessage);
    setCopied(true);
    toast.success("WhatsApp message copied.");
    setTimeout(() => setCopied(false), 2000);
  };

  const whatsappPhone = normaliseWhatsAppPhone(
    pulled?.admin?.phone || primaryContact?.phone,
  );
  const whatsappHref = result
    ? `https://wa.me/${whatsappPhone || ""}?text=${encodeURIComponent(result.whatsappMessage)}`
    : "#";

  const footer =
    step === "success" ? (
      <div className="border-t border-gray-100 bg-white p-4 space-y-2">
        <a
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full min-h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
        >
          <Send className="w-4 h-4" />
          Share on WhatsApp
        </a>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={copyMessage}
            className="min-h-10 rounded-xl border border-gray-200 bg-gray-50 text-xs font-bold text-gray-700 flex items-center justify-center gap-1.5"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Copied" : "Copy message"}
          </button>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="min-h-10 rounded-xl border border-gray-200 bg-white text-xs font-bold text-gray-700"
          >
            Done
          </button>
        </div>
      </div>
    ) : (
      <div className="border-t border-gray-100 bg-white p-4">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || pulling}
          className="w-full min-h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Building2 className="w-4 h-4" />}
          {submitting ? "Creating..." : "Create Madrasa"}
        </button>
      </div>
    );

  return (
    <ResponsivePopover
      open={open}
      onOpenChange={onOpenChange}
      fullHeight
      fullHeightWidth="620px"
      title={step === "success" ? "Madrasa created" : "Create Madrasa"}
      description={
        step === "success"
          ? "Share the login credentials with the madrasa admin."
          : `Prefilled from lead "${lead.name}". Review the details before creating.`
      }
      headerAction={
        step === "form" ? (
          <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-1">
            {pulling ? "Pulling data" : pulled?.source || "Lead"}
          </span>
        ) : undefined
      }
      footer={footer}
    >
      {step === "success" && result ? (
        <div className="space-y-4 p-5">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                <Check className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-emerald-900">
                  {result.client.name} is ready
                </p>
                <p className="text-xs text-emerald-800/80 mt-1 break-all">
                  {result.client.subdomain || result.client.slug}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-4 space-y-2.5">
            <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500">Admin</p>
            <CredentialRow label="Username" value={result.credentials.admin.identifier} />
            <CredentialRow label="Password" value={result.credentials.admin.password} />
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-4 space-y-2.5">
            <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500">Committee</p>
            <CredentialRow label="Username" value={result.credentials.committee.username} />
            <CredentialRow label="Password" value={result.credentials.committee.password} />
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-4 space-y-2.5">
            <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500">
              Parents ({result.credentials.parents.length})
            </p>
            {result.credentials.parents.length === 0 ? (
              <p className="text-xs text-gray-500">No parent records were pulled.</p>
            ) : (
              result.credentials.parents.map((parent) => (
                <div
                  key={`${parent.parentPhone}-${parent.studentName}`}
                  className="rounded-xl bg-gray-50 border border-gray-100 p-2.5"
                >
                  <p className="text-xs font-semibold text-gray-800">
                    {parent.parentName} · {parent.studentName}
                  </p>
                  <p className="text-[11px] font-mono text-gray-600 mt-1 break-all">
                    {parent.parentPhone} / {parent.password}
                  </p>
                </div>
              ))
            )}
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <div className="flex items-center justify-between gap-2 mb-2">
              <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500">
                WhatsApp message
              </p>
              <button
                type="button"
                onClick={copyMessage}
                className="text-[11px] font-bold text-emerald-700 flex items-center gap-1"
              >
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <pre className="whitespace-pre-wrap break-words text-[11px] leading-relaxed text-gray-700 font-sans">
              {result.whatsappMessage}
            </pre>
          </div>
        </div>
      ) : (
        <div className="space-y-4 p-4 pb-6">
          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 flex items-start justify-between gap-2">
              <span>{error}</span>
              <button type="button" onClick={() => setError("")} aria-label="Dismiss error">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <section className="rounded-2xl border border-gray-200 bg-white p-4 space-y-3">
            <SectionHeading icon={<Building2 className="w-3.5 h-3.5" />} title="Madrasa info" />
            <div>
              <label className={labelCls}>Name *</label>
              <input
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                className={inputCls}
                placeholder="e.g. Smart Madrasa"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Portal slug *</label>
                <input
                  value={form.slug}
                  onChange={(e) => set("slug", slugify(e.target.value))}
                  className={cn(inputCls, "font-mono")}
                  placeholder="smart-madrasa"
                />
              </div>
              <div>
                <label className={labelCls}>Arabic name</label>
                <input
                  value={form.arabicName}
                  onChange={(e) => set("arabicName", e.target.value)}
                  className={inputCls}
                  placeholder="Optional"
                  dir="rtl"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>City</label>
                <input
                  value={form.city}
                  onChange={(e) => set("city", e.target.value)}
                  className={inputCls}
                  placeholder="Optional"
                />
              </div>
              <div>
                <label className={labelCls}>State / District</label>
                <input
                  value={form.state}
                  onChange={(e) => set("state", e.target.value)}
                  className={inputCls}
                  placeholder="Optional"
                />
              </div>
            </div>
            <div>
              <label className={labelCls}>Attendance mode</label>
              <div className="flex gap-2">
                {(["CLASS_BASED", "PERIOD_BASED"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => set("attendanceMode", mode)}
                    className={cn(
                      "flex-1 min-h-9 rounded-xl border text-xs font-bold transition-all",
                      form.attendanceMode === mode
                        ? "bg-emerald-600 border-emerald-600 text-white"
                        : "bg-gray-50 border-gray-200 text-gray-600",
                    )}
                  >
                    {mode === "CLASS_BASED" ? "Class based" : "Period based"}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Account status</label>
                <select
                  value={form.status}
                  onChange={(e) => set("status", e.target.value)}
                  className={inputCls}
                >
                  {(["ACTIVE", "TRIAL", "SUSPENDED", "CANCELLED"] as const).map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 min-h-10">
                  <input
                    type="checkbox"
                    checked={form.isLoginEnabled}
                    onChange={(e) => set("isLoginEnabled", e.target.checked)}
                    className="size-4 accent-emerald-600"
                  />
                  Login access enabled
                </label>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-4 space-y-3">
            <SectionHeading icon={<UserRound className="w-3.5 h-3.5" />} title="Admin account" />
            <div>
              <label className={labelCls}>Admin name</label>
              <input
                value={form.adminName}
                onChange={(e) => set("adminName", e.target.value)}
                className={inputCls}
                placeholder="e.g. Muhammad Ali"
              />
            </div>
            <div>
              <label className={labelCls}>Admin phone / email *</label>
              <input
                value={form.adminIdentifier}
                onChange={(e) => set("adminIdentifier", e.target.value)}
                className={inputCls}
                placeholder="e.g. 9876543210"
              />
            </div>
            <PasswordField
              label="Admin password *"
              value={form.adminPassword}
              onChange={(e) => set("adminPassword", e.target.value)}
              onRegenerate={() => set("adminPassword", generatePassword("Admin"))}
            />
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-4 space-y-3">
            <SectionHeading icon={<Users className="w-3.5 h-3.5" />} title="Committee account" />
            <div>
              <label className={labelCls}>Committee username</label>
              <input
                value={form.committieUsername}
                onChange={(e) => set("committieUsername", e.target.value)}
                className={inputCls}
                placeholder="committee.madrasa"
              />
            </div>
            <PasswordField
              label="Committee password"
              value={form.committiePassword}
              onChange={(e) => set("committiePassword", e.target.value)}
              onRegenerate={() => set("committiePassword", generatePassword("Committee"))}
            />
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <SectionHeading
                icon={<Sparkles className="w-3.5 h-3.5" />}
                title={`Parent data (${parentData.length})`}
              />
              <button
                type="button"
                onClick={() => void loadPullData()}
                disabled={pulling}
                className="min-h-8 px-2.5 rounded-lg border border-gray-200 bg-gray-50 text-[11px] font-bold text-gray-700 flex items-center gap-1.5 disabled:opacity-50"
              >
                <RefreshCw className={cn("w-3 h-3", pulling && "animate-spin")} />
                Pull data
              </button>
            </div>
            <p className="text-[11px] text-gray-500 leading-relaxed">
              Parent records and generated passwords come from the sample
              <span className="font-mono"> pullData </span>
              endpoint until the real collection API is connected.
            </p>
            {pulling ? (
              <div className="py-6 flex items-center justify-center gap-2 text-xs font-semibold text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                Pulling parent data...
              </div>
            ) : parentData.length === 0 ? (
              <p className="py-4 text-center text-xs text-gray-500">
                No parent data available.
              </p>
            ) : (
              <div className="space-y-2">
                {parentData.map((parent, index) => (
                  <div
                    key={`${parent.parentPhone}-${index}`}
                    className="rounded-xl border border-gray-100 bg-gray-50 p-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-gray-800 truncate">
                          {parent.parentName || "Parent"}
                          {parent.studentName ? ` · ${parent.studentName}` : ""}
                        </p>
                        <p className="text-[11px] text-gray-600 font-mono mt-0.5">
                          {parent.parentPhone}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-[10px] font-mono font-bold text-gray-600 bg-white border border-gray-200 rounded-md px-1.5 py-1">
                          {parent.password || "—"}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setParentData((current) =>
                              current.map((item, i) =>
                                i === index
                                  ? { ...item, password: generatePassword("Parent") }
                                  : item,
                              ),
                            )
                          }
                          className="p-1 rounded-md text-gray-500 hover:bg-gray-100"
                          title="Regenerate parent password"
                        >
                          <RefreshCw className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </ResponsivePopover>
  );
}

function SectionHeading({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-gray-500">
      <span className="text-emerald-600">{icon}</span>
      <span>{title}</span>
    </div>
  );
}

function CredentialRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-gray-50 border border-gray-100 px-2.5 py-2">
      <span className="text-[11px] font-semibold text-gray-500">{label}</span>
      <span className="text-xs font-mono font-bold text-gray-800 break-all text-right">{value}</span>
    </div>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  onRegenerate,
}: {
  label: string;
  value: string;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
  onRegenerate: () => void;
}) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      <div className="flex items-center gap-2">
        <input
          value={value}
          onChange={onChange}
          className={cn(inputCls, "font-mono")}
          autoComplete="new-password"
          placeholder="Min 8 characters"
        />
        <button
          type="button"
          onClick={onRegenerate}
          className="min-h-10 min-w-10 rounded-xl border border-gray-200 bg-gray-50 text-gray-600 flex items-center justify-center hover:bg-gray-100"
          title="Regenerate password"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
