import { useEffect, useRef, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { ResponsivePopover } from "@/components/ui/responsivePopover";
import { ApiErrorBanner } from "@/components/ui/ApiErrorBanner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { adminProfileConfig, superAdminProfileConfig } from "@/components/profile/profileConfig";
import { updateProfile, uploadProfilePhoto, deleteProfilePhoto, type UpdateProfileDto } from "@/lib/super-admin-api";
import { useAuthStore } from "@/store/auth";
import { useLanguageStore } from "@/store/language";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import {
  AlertCircle, Building2, Camera, Check, CheckCircle2, ChevronRight, Circle,
  Copy, Eye, EyeOff, KeyRound, Loader2, Mail, MapPin, Pencil, Phone,
  Shield, Sparkles, User, X,
} from "lucide-react";

type Strength = 0 | 1 | 2 | 3 | 4;

function passwordStrength(password: string): Strength {
  if (!password) return 0;
  return Math.min(4, Number(password.length >= 8) + Number(/[A-Z]/.test(password)) + Number(/[0-9]/.test(password)) + Number(/[^A-Za-z0-9]/.test(password))) as Strength;
}

function passwordError(password: string, phone: string): string | null {
  if (password.length < 8) return "Password must be at least 8 characters long.";
  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
    return "Password must contain an uppercase letter, a lowercase letter, a number, and a special character.";
  }
  const common = ["password", "123456", "qwerty", "admin123", "madrasa", "welcome", "letmein", "school123", "changekey"];
  if (common.some((weak) => password.toLowerCase().includes(weak))) return "Password is too common or easy to guess.";
  const phoneDigits = phone.replace(/\D/g, "");
  if (phoneDigits.length >= 4 && password.includes(phoneDigits)) return "Password must not contain your phone number.";
  return null;
}

const strengthMeta = [
  { label: "—", color: "bg-gray-200", width: "w-0" },
  { label: "Weak", color: "bg-rose-500", width: "w-1/4" },
  { label: "Fair", color: "bg-amber-500", width: "w-2/4" },
  { label: "Good", color: "bg-sky-500", width: "w-3/4" },
  { label: "Strong", color: "bg-primary-500", width: "w-full" },
] as const;

export default function AdminProfilePage() {
  const { user, accessToken, updateUser } = useAuthStore();
  const { lang } = useLanguageStore();
  const config = user?.actorType === "SUPER_ADMIN" ? superAdminProfileConfig : adminProfileConfig;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<"account" | "security">("account");
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState(user?.phone ?? user?.parentPhone ?? "");
  const [address, setAddress] = useState(user?.address ?? "");
  const [picPreview, setPicPreview] = useState<string | null>(user?.photoUrl ?? user?.photo ?? null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCur, setShowCur] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showCon, setShowCon] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    setName(user?.name ?? "");
    setEmail(user?.email ?? "");
    setPhone(user?.phone ?? user?.parentPhone ?? "");
    setAddress(user?.address ?? "");
    setPicPreview(user?.photoUrl ?? user?.photo ?? null);
  }, [user]);

  const resetForm = () => {
    setName(user?.name ?? "");
    setEmail(user?.email ?? "");
    setPhone(user?.phone ?? user?.parentPhone ?? "");
    setAddress(user?.address ?? "");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setError(null);
  };

  const openDrawer = (tab: "account" | "security") => {
    resetForm();
    setSuccess(null);
    setDrawerTab(tab);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    resetForm();
  };

  const copyText = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(value);
      window.setTimeout(() => setCopiedField(null), 1500);
    } catch {
      setError("Could not copy to clipboard.");
    }
  };

  const handlePicFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !accessToken) return;
    if (file.size > 2 * 1024 * 1024) {
      event.target.value = "";
      setError("Profile image must be under 2MB.");
      return;
    }
    setUploadingPhoto(true);
    setError(null);
    try {
      const result = await uploadProfilePhoto(accessToken, file);
      updateUser({ photo: result.photo, photoUrl: result.photoUrl });
      setPicPreview(result.photoUrl);
      setSuccess("Profile picture updated successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload photo.");
    } finally {
      setUploadingPhoto(false);
      event.target.value = "";
    }
  };

  const handleRemovePhoto = async () => {
    if (!accessToken) return;
    setUploadingPhoto(true);
    setError(null);
    try {
      await deleteProfilePhoto(accessToken);
      updateUser({ photo: null, photoUrl: null });
      setPicPreview(null);
      setSuccess("Profile picture removed successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove photo.");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSave = async () => {
    if (!accessToken) return;
    setError(null);
    const dto: UpdateProfileDto = {};
    if (drawerTab === "account") {
      const cleanName = name.trim();
      const cleanEmail = email.trim();
      const cleanPhone = phone.trim().replace(/[\s\-()]/g, "");
      const cleanAddress = address.trim();
      if (!cleanName) return setError("Display name cannot be empty.");
      if (cleanEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) return setError("Please enter a valid email address.");
      if (cleanPhone && !/^\+?\d{7,15}$/.test(cleanPhone)) return setError("Please enter a valid phone number (7–15 digits).");
      if (cleanName !== user?.name) dto.name = cleanName;
      if (cleanEmail !== (user?.email ?? "")) dto.email = cleanEmail || undefined;
      if (cleanPhone !== (user?.phone ?? user?.parentPhone ?? "")) dto.phone = cleanPhone || undefined;
      if (cleanAddress !== (user?.address ?? "")) dto.address = cleanAddress || undefined;
    } else {
      if (!currentPassword) return setError("Current password is required.");
      if (!newPassword) return setError("New password is required.");
      const validationError = passwordError(newPassword, phone);
      if (validationError) return setError(validationError);
      if (newPassword !== confirmPassword) return setError("New passwords do not match.");
      dto.currentPassword = currentPassword;
      dto.newPassword = newPassword;
    }
    if (Object.keys(dto).length === 0) return setError("No changes to save.");
    setSaving(true);
    try {
      await updateProfile(accessToken, dto);
      if (dto.name !== undefined) updateUser({ name: dto.name });
      if (dto.email !== undefined) updateUser({ email: dto.email });
      if (dto.phone !== undefined) updateUser({ phone: dto.phone, parentPhone: dto.phone });
      if (dto.address !== undefined) updateUser({ address: dto.address });
      setSuccess(drawerTab === "security" ? "Password updated successfully." : t("parentPages", "profileUpdated", lang));
      closeDrawer();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  const strength = passwordStrength(newPassword);
  const pwMismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;
  const roleLabel = user?.actorType === "SUPER_ADMIN" ? "Super Admin" : "Madrasa Admin";
  const center = user?.madrasaName || user?.tenantSlug || (user?.actorType === "SUPER_ADMIN" ? "Smart Madrasa" : "—");
  const primaryPhone = user?.phone || user?.parentPhone || "";
  const today = new Date().toLocaleDateString(lang === "ml" ? "ml-IN" : "en-IN", {
    weekday: "short", day: "numeric", month: "short", year: "numeric",
  });
  const stats = [
    { label: t("common", "role", lang), value: roleLabel, icon: Shield },
    { label: t("common", "tenant", lang), value: center, icon: Building2 },
    { label: t("common", "phone", lang), value: primaryPhone || "—", icon: Phone },
    { label: t("common", "email", lang), value: user?.email || "—", icon: Mail },
  ];
  const details = [
    { label: t("common", "displayName", lang), value: user?.name || "—", icon: User },
    { label: t("common", "phone", lang), value: primaryPhone || t("common", "notSet", lang), icon: Phone, copy: primaryPhone },
    { label: t("common", "email", lang), value: user?.email || t("common", "notSet", lang), icon: Mail, copy: user?.email },
    { label: t("common", "role", lang), value: roleLabel, icon: Shield },
    { label: t("common", "tenant", lang), value: center, icon: Building2 },
    { label: t("common", "address", lang), value: user?.address || t("common", "notSet", lang), icon: MapPin, wrap: true },
  ];

  return (
    <DashboardLayout>
      <PageHeader title={t("nav", "profile", lang)} />
      <div className="space-y-6 pb-24 pt-6">
        {success && (
          <div role="status" className="flex items-center justify-between gap-2 rounded-2xl border border-primary-200 bg-primary-50 p-3 text-sm text-primary-800">
            <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 shrink-0" />{success}</span>
            <Button type="button" variant="ghost" size="icon-xs" aria-label="Dismiss message" onClick={() => setSuccess(null)}><X className="h-4 w-4" /></Button>
          </div>
        )}
        {error && !drawerOpen && <ApiErrorBanner message={error} onRetry={() => setError(null)} />}

        <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-white to-sky-50">
          <div className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div className="flex min-w-0 items-center gap-3.5 sm:gap-4">
              <div className="relative shrink-0">
                {user?.photoUrl ? (
                  <img src={user.photoUrl} alt={user.name} className="h-16 w-16 rounded-2xl object-cover ring-2 ring-white sm:h-20 sm:w-20" />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-600 text-2xl font-bold text-white ring-2 ring-white sm:h-20 sm:w-20 sm:text-3xl">{user?.name?.charAt(0)?.toUpperCase() ?? "A"}</div>
                )}
                <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-white"><CheckCircle2 className="h-3.5 w-3.5 text-white" /></span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate text-lg font-bold text-gray-950 sm:text-xl">{user?.name || roleLabel}</h2>
                  <span className="inline-flex items-center gap-1 rounded-full border border-primary-100 bg-primary-50 px-2.5 py-0.5 text-[11px] font-semibold text-primary-700"><Sparkles className="h-3 w-3" />{roleLabel}</span>
                </div>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">{center}</p>
                <span className="mt-2 inline-flex rounded-full bg-white px-2.5 py-0.5 text-[11px] text-gray-600 ring-1 ring-gray-200">{today}</span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:self-start">
              <Button type="button" variant="outline" size="sm" className="rounded-xl" onClick={() => openDrawer("security")}><KeyRound className="h-3.5 w-3.5" />{t("login", "password", lang)}</Button>
              <Button type="button" size="sm" className="rounded-xl shadow-none" onClick={() => openDrawer("account")}><Pencil className="h-3.5 w-3.5" />{t("common", "updateProfile", lang)}</Button>
            </div>
          </div>
        </section>

        <section aria-label="Profile summary" className="grid grid-cols-2 overflow-hidden rounded-2xl bg-gradient-to-br from-primary-50/60 via-white to-sky-50/60">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className={cn("min-w-0 p-2.5 sm:p-3", index < 2 && "border-b border-gray-100", index % 2 === 0 && "border-r border-gray-100")}>
                <div className="flex items-center gap-1.5 text-sm font-medium leading-4 text-gray-700"><Icon aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-gray-800" />{stat.label}</div>
                <p className="mt-1.5 truncate text-xl font-medium leading-none tabular-nums text-gray-950 sm:text-[22px]" title={stat.value}>{stat.value}</p>
              </div>
            );
          })}
        </section>

        <section>
          <div className="mb-2 flex items-center justify-between px-1">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500">{t("common", "accountDetails", lang)}</h2>
            <Button type="button" variant="ghost" size="xs" onClick={() => openDrawer("account")}><Pencil className="h-3 w-3" />{t("common", "updateProfile", lang)}</Button>
          </div>
          <div className="divide-y divide-gray-100 overflow-hidden rounded-2xl bg-white">
            {details.map((detail) => {
              const Icon = detail.icon;
              return (
                <div key={detail.label} className="flex items-center justify-between gap-3 px-4 py-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gray-50 text-gray-500"><Icon className="h-4 w-4" /></span>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">{detail.label}</p>
                      <p className={cn("text-sm font-semibold text-gray-900", detail.wrap ? "whitespace-pre-wrap break-words" : "truncate")} title={detail.wrap ? undefined : detail.value}>{detail.value}</p>
                    </div>
                  </div>
                  {detail.copy && <Button type="button" variant="ghost" size="icon-xs" aria-label={`Copy ${detail.label}`} onClick={() => copyText(detail.copy ?? "")}>{copiedField === detail.copy ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5 text-gray-400" />}</Button>}
                </div>
              );
            })}
          </div>
        </section>

        <section>
          <h2 className="mb-2 px-1 text-xs font-bold uppercase tracking-wider text-gray-500">{t("common", "quickLinks", lang)}</h2>
          <div className="divide-y divide-gray-100 overflow-hidden rounded-2xl bg-white">
            {config.quickLinks.map((item) => {
              const Icon = item.icon;
              return (
                <a key={item.href} href={item.href} className="flex w-full items-center justify-between gap-3 px-4 py-4 transition-colors hover:bg-primary-50/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500">
                  <span className="flex min-w-0 items-center gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gray-50 text-gray-500"><Icon className="h-4 w-4" /></span><span className="truncate text-sm font-semibold text-gray-900">{item.label}</span></span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" />
                </a>
              );
            })}
          </div>
        </section>
      </div>

      <ResponsivePopover
        fullHeight
        open={drawerOpen}
        onOpenChange={(open) => { if (!open) closeDrawer(); }}
        desktopView="right-drawer"
        side="bottom"
        title={drawerTab === "account" ? t("common", "updateProfile", lang) : t("common", "security", lang)}
        description={drawerTab === "account" ? "Manage your account information" : "Update your login password"}
        className="shadow-none"
        footer={(
          <div className="flex gap-2 border-t border-gray-100 bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <Button type="button" variant="outline" size="lg" className="flex-1" disabled={saving} onClick={closeDrawer}>{t("common", "cancel", lang)}</Button>
            <Button type="button" size="lg" className="flex-1 shadow-none" disabled={saving} onClick={handleSave}>{saving && <Loader2 className="h-4 w-4 animate-spin" />}{saving ? t("common", "updating", lang) : t("common", "updateProfile", lang)}</Button>
          </div>
        )}
      >
        <div className="space-y-4 p-5">
          <Tabs value={drawerTab} onValueChange={(value) => { setDrawerTab(value as "account" | "security"); setError(null); }}>
            <TabsList className="grid h-auto w-full grid-cols-2">
              <TabsTrigger value="account" className="px-2 py-2 text-xs">{t("common", "accountDetails", lang)}</TabsTrigger>
              <TabsTrigger value="security" className="px-2 py-2 text-xs">{t("common", "security", lang)}</TabsTrigger>
            </TabsList>
          </Tabs>
          {error && <ApiErrorBanner message={error} onRetry={() => setError(null)} />}
          {drawerTab === "account" ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4 rounded-xl border border-gray-100 bg-gray-50/70 p-3.5">
                {uploadingPhoto ? <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary-100"><Loader2 className="h-6 w-6 animate-spin text-primary-600" /></div>
                  : picPreview ? <img src={picPreview} alt={user?.name ?? "Admin"} className="h-16 w-16 shrink-0 rounded-2xl object-cover" />
                  : <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary-600 text-xl font-bold text-white">{user?.name?.charAt(0)?.toUpperCase() ?? "A"}</div>}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900">{t("common", "profilePicture", lang)}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{t("common", "photoHint", lang)}</p>
                  <Input ref={fileInputRef} type="file" accept="image/*" className="hidden" tabIndex={-1} onChange={handlePicFile} disabled={uploadingPhoto} />
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    <Button type="button" size="sm" disabled={uploadingPhoto} onClick={() => fileInputRef.current?.click()}><Camera className="h-3.5 w-3.5" />{picPreview ? t("common", "changePhoto", lang) : t("common", "uploadPhoto", lang)}</Button>
                    {picPreview && <Button type="button" size="sm" variant="outline" disabled={uploadingPhoto} onClick={handleRemovePhoto}>{t("common", "remove", lang)}</Button>}
                  </div>
                </div>
              </div>
              <div><label htmlFor="admin-profile-name" className="mb-1.5 block text-xs font-semibold text-gray-700">{t("common", "displayName", lang)} *</label><Input id="admin-profile-name" size="lg" value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" /></div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div><label htmlFor="admin-profile-phone" className="mb-1.5 block text-xs font-semibold text-gray-700">{t("common", "phone", lang)}</label><Input id="admin-profile-phone" size="lg" type="tel" inputMode="tel" value={phone} onChange={(event) => setPhone(event.target.value)} autoComplete="tel" /></div>
                <div><label htmlFor="admin-profile-email" className="mb-1.5 block text-xs font-semibold text-gray-700">{t("common", "email", lang)}</label><Input id="admin-profile-email" size="lg" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" /></div>
              </div>
              <div><label htmlFor="admin-profile-address" className="mb-1.5 block text-xs font-semibold text-gray-700">{t("common", "address", lang)}</label><Textarea id="admin-profile-address" size="lg" rows={3} value={address} onChange={(event) => setAddress(event.target.value)} /></div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50/60 p-3 text-xs text-amber-800"><Shield className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />{t("common", "pwChangeHint", lang)}</div>
              {([
                { id: "current", label: t("common", "currentPassword", lang), value: currentPassword, set: setCurrentPassword, shown: showCur, toggle: setShowCur, autoComplete: "current-password" },
                { id: "new", label: t("common", "newPassword", lang), value: newPassword, set: setNewPassword, shown: showNew, toggle: setShowNew, autoComplete: "new-password" },
                { id: "confirm", label: t("common", "confirmPassword", lang), value: confirmPassword, set: setConfirmPassword, shown: showCon, toggle: setShowCon, autoComplete: "new-password" },
              ] as const).map((field) => (
                <div key={field.id}>
                  <label htmlFor={`admin-profile-${field.id}`} className="mb-1.5 block text-xs font-semibold text-gray-700">{field.label} *</label>
                  <div className="relative">
                    <Input id={`admin-profile-${field.id}`} size="lg" type={field.shown ? "text" : "password"} autoComplete={field.autoComplete} value={field.value} onChange={(event) => field.set(event.target.value)} className={cn("pr-11", field.id === "confirm" && pwMismatch && "border-destructive")} />
                    <Button type="button" variant="ghost" size="icon-xs" aria-label={`${field.shown ? "Hide" : "Show"} ${field.label}`} onClick={() => field.toggle(!field.shown)} className="absolute right-1 top-1/2 -translate-y-1/2">{field.shown ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button>
                  </div>
                  {field.id === "new" && newPassword && <div className="mt-2.5"><div className="h-1.5 overflow-hidden rounded-full bg-gray-100"><div className={cn("h-full transition-all", strengthMeta[strength].color, strengthMeta[strength].width)} /></div><p className="mt-1 text-[11px] text-muted-foreground">{t("common", "passwordStrength", lang)}: <strong className="text-foreground">{strengthMeta[strength].label}</strong></p></div>}
                  {field.id === "confirm" && pwMismatch && <p className="mt-1 flex items-center gap-1 text-[11px] text-destructive"><AlertCircle className="h-3 w-3" />{t("common", "passwordsMismatch", lang)}</p>}
                  {field.id === "confirm" && confirmPassword && !pwMismatch && <p className="mt-1 flex items-center gap-1 text-[11px] text-primary"><CheckCircle2 className="h-3 w-3" />{t("common", "passwordsMatch", lang)}</p>}
                </div>
              ))}
              <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-3">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{t("common", "passwordRules", lang)}</p>
                <ul className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    { label: t("common", "char8plus", lang), done: newPassword.length >= 8 },
                    { label: t("common", "upperLower", lang), done: /[a-z]/.test(newPassword) && /[A-Z]/.test(newPassword) },
                    { label: t("common", "hasNumber", lang), done: /[0-9]/.test(newPassword) },
                    { label: t("common", "hasSymbol", lang), done: /[^A-Za-z0-9]/.test(newPassword) },
                  ].map((rule) => <li key={rule.label} className="flex items-center gap-1.5">{rule.done ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-primary" /> : <Circle className="h-3.5 w-3.5 shrink-0 text-gray-300" />}<span className={rule.done ? "font-medium text-foreground" : "text-muted-foreground"}>{rule.label}</span></li>)}
                </ul>
              </div>
            </div>
          )}
        </div>
      </ResponsivePopover>
    </DashboardLayout>
  );
}
