import { useRef, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { ResponsivePopover } from "@/components/ui/responsivePopover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DrawerSelector } from "@/components/DrawerSelector";
import { updateProfile, uploadProfilePhoto, deleteProfilePhoto, type UpdateProfileDto } from "@/lib/super-admin-api";
import { useAuthStore } from "@/store/auth";
import { useLanguageStore } from "@/store/language";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2, CheckCircle, AlertCircle, Phone, Mail,
  KeyRound, Eye, EyeOff,
  Shield, Sparkles, IdCard,
  Building2, Hash,
  CheckCircle2, Circle, User, X,
  Camera, MapPin, Briefcase, Pencil, Users, ChevronRight,
} from "lucide-react";

const inputCls =
  "h-11 w-full px-3.5 py-2.5 text-sm bg-white border border-gray-200 rounded-xl " +
  "focus:outline-none focus:ring-2 focus:ring-primary-400/60 focus:border-primary-400 " +
  "transition-all placeholder:text-gray-300";

const labelCls = "text-[11px] uppercase tracking-wider text-gray-500 mb-1.5 block font-semibold";

const readOnlyCls =
  "w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-transparent rounded-xl " +
  "text-gray-700 flex items-center gap-2 min-h-[42px]";

type Strength = 0 | 1 | 2 | 3 | 4;

function passwordStrength(pw: string): Strength {
  if (!pw) return 0;
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return Math.min(s, 4) as Strength;
}

const validatePasswordStrength = (password: string, phone?: string): string | null => {
  if (!password || password.length < 8) {
    return "Password must be at least 8 characters long.";
  }

  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  if (!hasUppercase || !hasLowercase || !hasDigit || !hasSpecial) {
    return "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.";
  }

  const normalized = password.toLowerCase();

  const WEAK_PASSWORDS = [
    'password', '123456', '12345678', '123456789', 'qwerty', '123123', '111111',
    'password123', 'admin123', 'madrasa', 'madrasa123', 'welcome', 'letmein',
    'school123', 'parent123', 'student123', 'pass123', 'user123', 'changekey'
  ];

  const isWeak = WEAK_PASSWORDS.some((weak) => normalized.includes(weak));
  if (isWeak) {
    return "Password is too common or easy to guess. Please choose a stronger password.";
  }

  if (phone) {
    const cleanPhone = phone.replace(/\+/g, '').trim();
    if (cleanPhone.length >= 4 && normalized.includes(cleanPhone.toLowerCase())) {
      return "Password must not contain your phone number.";
    }
  }

  return null;
};

const STRENGTH_KEYS: Record<number, string> = {
  0: "—",
  1: "weakPw",
  2: "fairPw",
  3: "goodPw",
  4: "strongPw",
};

const strengthMeta: Record<Strength, { label: string; color: string; width: string }> = {
  0: { label: "—", color: "bg-gray-200", width: "w-0" },
  1: { label: "Weak", color: "bg-rose-500", width: "w-1/4" },
  2: { label: "Fair", color: "bg-amber-500", width: "w-2/4" },
  3: { label: "Good", color: "bg-sky-500", width: "w-3/4" },
  4: { label: "Strong", color: "bg-primary-500", width: "w-full" },
};

export interface ProfileConfig {
  roleLabel: string;
  roleShort: string;
  roleBadgeClass: string;
  roleBadgeTextClass: string;
  homePath: string;
  notifPath: string;
  quickLinks: Array<{ label: string; icon: any; href: string }>;
  showMsrId?: boolean;
  showParentExtras?: boolean;
}

interface ProfilePageProps {
  config: ProfileConfig;
  layout?: "teacher" | "parent";
}

export default function ProfilePage({ config, layout }: ProfilePageProps) {
  const { lang } = useLanguageStore();
  const { user, accessToken, updateUser } = useAuthStore();
  const isParent = user?.actorType === "PARENT";
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Editable fields
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState(user?.phone ?? user?.parentPhone ?? "");
  const [address, setAddress] = useState(user?.address ?? "");
  const [msrId, setMsrId] = useState(user?.msrId ?? "");
  const [picPreview, setPicPreview] = useState<string | null>(user?.photoUrl ?? user?.photo ?? null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Parent-only fields
  const [parentAltPhone, setParentAltPhone] = useState(user?.phone ?? user?.parentPhone ?? "");
  const [parentEmail, setParentEmail] = useState(user?.email ?? "");
  const [city, setCity] = useState("");
  const [stateField, setStateField] = useState("");
  const [country, setCountry] = useState("");
  const [pincode, setPincode] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");

  // Password
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCur, setShowCur] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showCon, setShowCon] = useState(false);

  // UI state
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<"account" | "security">("account");

  const strength = passwordStrength(newPassword);
  const pwMismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;

  const resetForm = () => {
    setName(user?.name ?? "");
    setEmail(user?.email ?? "");
    setPhone(user?.phone ?? user?.parentPhone ?? "");
    setAddress(user?.address ?? "");
    setMsrId(user?.msrId ?? "");
    setPicPreview(user?.photoUrl ?? user?.photo ?? null);
    setParentAltPhone(user?.phone ?? user?.parentPhone ?? "");
    setParentEmail(user?.email ?? "");
    setCity("");
    setStateField("");
    setCountry("");
    setPincode("");
    setBloodGroup("");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setError("");
  };

  const openDrawer = (tab: "account" | "security" = "account") => {
    resetForm();
    setDrawerTab(tab);
    setSuccess("");
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setTimeout(() => resetForm(), 250);
  };

  const handleSave = async () => {
    setError("");

    if (drawerTab === "account" && !name.trim()) { setError("Name cannot be empty."); return; }

    const cleanEmail = email.trim();
    const cleanPhone = phone.trim().replace(/[\s\-()]/g, "");
    const cleanAltPhone = parentAltPhone.trim().replace(/[\s\-()]/g, "");

    if (drawerTab === "account") {
      if (cleanEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        setError("Please enter a valid email address."); return;
      }
      if (cleanPhone && !/^\+?\d{7,15}$/.test(cleanPhone)) {
        setError("Please enter a valid phone number (7–15 digits)."); return;
      }
    }

    const dto: UpdateProfileDto = {};

    if (drawerTab === "account") {
      if (name !== user?.name) dto.name = name.trim();
      if (cleanEmail !== (user?.email ?? "")) dto.email = cleanEmail || undefined;
      if (cleanPhone !== (user?.phone ?? user?.parentPhone ?? "")) dto.phone = cleanPhone || undefined;
      const cleanAddress = address.trim();
      if (cleanAddress !== (user?.address ?? "")) dto.address = cleanAddress || undefined;
      const cleanMsr = msrId.trim();
      if (config.showMsrId && cleanMsr !== (user?.msrId ?? "")) dto.msrId = cleanMsr || undefined;

      if (config.showParentExtras) {
        if (cleanAltPhone && cleanAltPhone !== (user?.phone ?? user?.parentPhone ?? "")) dto.parentAltPhone = cleanAltPhone;
        if (cleanEmail) dto.parentEmail = cleanEmail;
        if (address.trim()) dto.address = address.trim();
        if (city.trim()) dto.city = city.trim();
        if (stateField.trim()) dto.state = stateField.trim();
        if (country.trim()) dto.country = country.trim();
        if (pincode.trim()) dto.pincode = pincode.trim();
        if (bloodGroup) dto.bloodGroup = bloodGroup;
      }
    }

    if (drawerTab === "security" && newPassword) {
      if (!currentPassword) { setError("Current password is required."); return; }
      const strengthError = validatePasswordStrength(newPassword, phone);
      if (strengthError) { setError(strengthError); return; }
      if (newPassword !== confirmPassword) { setError("New passwords do not match."); return; }
      dto.currentPassword = currentPassword;
      dto.newPassword = newPassword;
    }

    const hasChanges = Object.keys(dto).length > 0;
    if (!hasChanges) { setError("No changes to save."); return; }

    setSaving(true);
    try {
      await updateProfile(accessToken!, dto);
      if (dto.name) updateUser({ name: dto.name });
      if (dto.email !== undefined) updateUser({ email: cleanEmail || undefined });
      if (dto.phone !== undefined) updateUser({ phone: cleanPhone || undefined, parentPhone: cleanPhone || undefined });
      if (dto.address !== undefined) updateUser({ address: address.trim() || undefined });
      if (dto.msrId !== undefined) updateUser({ msrId: msrId.trim() || undefined });
      setSuccess(t("parentPages", "profileUpdated", lang));
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => closeDrawer(), 600);
    } catch (e: any) {
      setError(e?.message ?? "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  const handlePicFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setError("Image must be under 2MB."); return; }

    setUploadingPhoto(true);
    setError("");
    try {
      const result = await uploadProfilePhoto(accessToken!, file);
      updateUser({ photo: result.photo, photoUrl: result.photoUrl });
      setPicPreview(result.photoUrl);
    } catch (err: any) {
      setError(err?.message ?? "Failed to upload photo");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleRemovePhoto = async () => {
    setUploadingPhoto(true);
    setError("");
    try {
      await deleteProfilePhoto(accessToken!);
      updateUser({ photo: null, photoUrl: null });
      setPicPreview(null);
    } catch (err: any) {
      setError(err?.message ?? "Failed to remove photo");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  const drawerTabs = [
    { id: "account" as const, label: t("common", "accountDetails", lang), icon: User },
    { id: "security" as const, label: t("common", "security", lang), icon: Shield },
  ];

  const compactLayout = layout === "teacher" || layout === "parent";
  const parentPhone = user?.phone || user?.parentPhone;
  const parentStudents = user?.accessibleStudents?.length ?? 0;
  const compactToday = new Date().toLocaleDateString(lang === "ml" ? "ml-IN" : "en-IN", {
    weekday: "short", day: "numeric", month: "short", year: "numeric",
  });
  const parentInfoRows = [
    { label: t("common", "displayName", lang), value: user?.name || "—", icon: User },
    { label: t("common", "role", lang), value: config.roleLabel, icon: IdCard },
    { label: t("common", "tenant", lang), value: user?.madrasaName || user?.tenantSlug || "—", icon: Building2 },
    { label: t("common", "primaryPhone", lang), value: parentPhone || t("common", "notSet", lang), icon: Phone },
    { label: t("common", "email", lang), value: user?.email || t("common", "notSet", lang), icon: Mail },
    { label: t("common", "address", lang), value: user?.address || t("common", "notSet", lang), icon: MapPin, wrap: true },
  ];

  return (
    <DashboardLayout>
      <PageHeader title={t("nav", "profile", lang)} />

      <AnimatePresence>
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="mb-4 p-3 bg-primary-50 border border-primary-200 rounded-2xl flex items-center gap-2 text-sm text-primary-700"
          >
            <CheckCircle className="w-4 h-4 shrink-0" /> {success}
          </motion.div>
        )}
      </AnimatePresence>

      {compactLayout ? (
        <div className="pt-6 pb-24">
          <section className="mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-white to-sky-50">
            <div className="border-b border-gray-100 px-4 py-4 sm:px-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3.5 sm:gap-4">
                  <div className="relative shrink-0">
                    <Avatar className="size-16 ring-2 ring-white sm:size-20">
                      <AvatarImage src={user?.photoUrl ?? user?.photo ?? undefined} alt={user?.name ?? config.roleLabel} />
                      <AvatarFallback className="bg-primary-600 text-2xl font-bold text-white sm:text-3xl">
                        {user?.name?.trim().charAt(0).toUpperCase() || config.roleLabel.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-white">
                      <CheckCircle className="h-3.5 w-3.5 text-white" />
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="truncate text-lg font-bold text-gray-950 sm:text-xl">{user?.name ?? config.roleLabel}</h1>
                      <span className="inline-flex items-center gap-1 rounded-full border border-primary-100 bg-primary-50 px-2.5 py-0.5 text-[11px] font-semibold text-primary-700">
                        <Sparkles className="h-3 w-3" /> {config.roleShort}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">{user?.madrasaName || user?.tenantSlug || "Smart Madrasa"}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-medium">
                      {parentStudents > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-0.5 text-gray-700 ring-1 ring-gray-200">
                          <Users className="h-3 w-3 text-primary-600" />
                          {parentStudents} {t("parentPages", "childrenLabel", lang)}
                        </span>
                      )}
                      <span className="inline-flex items-center rounded-full bg-white px-2.5 py-0.5 text-gray-600 ring-1 ring-gray-200">{compactToday}</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:self-start">
                  <Button type="button" variant="outline" size="xs" onClick={() => openDrawer("security")} className="rounded-xl px-3">
                    <KeyRound className="mr-1.5 h-3.5 w-3.5" /> {t("login", "password", lang)}
                  </Button>
                  <Button type="button" size="xs" onClick={() => openDrawer("account")} className="rounded-xl px-3">
                    <Pencil className="mr-1.5 h-3.5 w-3.5" /> {t("common", "updateProfile", lang)}
                  </Button>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 overflow-hidden bg-gradient-to-br from-primary-50/70 via-white to-sky-50/70">
              {[
                { label: t("parentPages", "childrenLabel", lang), value: user?.accessibleStudents ? String(parentStudents) : "—", icon: Users, iconColor: "text-primary-700" },
                { label: t("common", "primaryPhone", lang), value: parentPhone || "—", icon: Phone, iconColor: "text-emerald-700" },
                { label: t("common", "email", lang), value: user?.email || "—", icon: Mail, iconColor: "text-amber-700" },
                { label: t("common", "tenant", lang), value: user?.madrasaName || user?.tenantSlug || "—", icon: Building2, iconColor: "text-blue-700" },
              ].map((item, index) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className={cn("min-w-0 p-2.5 sm:p-3", index % 2 === 0 && "border-r border-gray-100", index < 2 && "border-b border-gray-100")}>
                    <div className="flex items-center gap-1.5 text-[11px] font-medium text-gray-600">
                      <Icon className={cn("h-3.5 w-3.5 shrink-0", item.iconColor)} />
                      <span>{item.label}</span>
                    </div>
                    <div className="mt-1 truncate text-base font-semibold tabular-nums text-gray-950 sm:text-lg" title={item.value}>{item.value}</div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="mb-6">
            <div className="mb-2 flex items-center justify-between px-1">
              <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500">{t("common", "accountDetails", lang)}</h2>

            </div>
            <div className="divide-y divide-gray-100 overflow-hidden rounded-2xl bg-white shadow-none">
              {parentInfoRows.map((row) => {
                const Icon = row.icon;
                return (
                  <div key={row.label} className="flex min-w-0 items-start gap-3 px-4 py-4">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gray-50 text-gray-500"><Icon className="h-4 w-4" /></div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-muted-foreground">{row.label}</p>
                      <p className={cn("text-sm font-semibold text-gray-900", row.wrap ? "whitespace-pre-wrap break-words" : "truncate")} title={row.wrap ? undefined : row.value}>{row.value}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>


        </div>
      ) : (
      <>
      <div className="grid grid-cols-1 gap-4 pb-28">
        {/* Identity card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-3 relative overflow-hidden rounded-3xl border border-gray-100"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-primary-700 to-teal-600" />
          <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full bg-primary-400/20 blur-3xl" />
          <div className="absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.4) 1px, transparent 0)",
              backgroundSize: "22px 22px",
            }}
          />

          <div className="relative p-5 sm:p-7 text-white">
            <div className="flex flex-col sm:flex-row sm:items-center gap-5">
              <div className="relative shrink-0">
                <Avatar className="size-20 border-2 border-white/30 sm:size-24">
                  <AvatarImage src={user?.photoUrl ?? user?.photo ?? undefined} alt={user?.name ?? config.roleLabel} />
                  <AvatarFallback className="bg-primary-600 text-3xl font-black text-white sm:text-4xl">
                    {user?.name?.trim().charAt(0).toUpperCase() || config.roleLabel.charAt(0)}
                  </AvatarFallback>
                </Avatar>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-white/20 backdrop-blur-sm">
                    <Sparkles className="w-3 h-3" /> {config.roleLabel}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-primary-100/80">
                    {today}
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight truncate">
                  {user?.name ?? config.roleLabel}
                </h1>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-primary-50/90">
                  {user?.id && (
                    <span className="inline-flex items-center gap-1.5">
                      <Hash className="w-3 h-3" />
                      <span className="font-mono">{user.id.slice(0, 8)}…</span>
                    </span>
                  )}
                  {user?.madrasaName && (
                    <span className="inline-flex items-center gap-1.5">
                      <Building2 className="w-3 h-3" /> {user.madrasaName}
                    </span>
                  )}
                  {isParent && user?.accessibleStudents && user.accessibleStudents.length > 0 && (
                    <span className="inline-flex items-center gap-1.5">
                      <Users className="w-3 h-3" />
                      {user.accessibleStudents.length} child{user.accessibleStudents.length !== 1 ? "ren" : ""}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Profile details (read-only) */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-gray-100 rounded-3xl p-5 sm:p-6"
        >
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-bold text-gray-900">{t("common", "profileDetails", lang)}</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {t("common", "helloYourAccount", lang).replace("{name}", user?.name ?? config.roleLabel)}
              </p>
            </div>
            <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-semibold text-primary-700 bg-primary-50 px-2 py-1 rounded-full">
              <CheckCircle className="w-3 h-3" /> {t("common", "verified", lang)}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>{t("common", "displayName", lang)}</label>
              <div className={readOnlyCls}>
                <User className="w-4 h-4 text-gray-400" />
                <span className="font-medium">{user?.name ?? "—"}</span>
              </div>
            </div>

            <div>
              <label className={labelCls}>{t("common", "role", lang)}</label>
              <div className={readOnlyCls}>
                <IdCard className="w-4 h-4 text-gray-400" />
                <span className="font-medium">{config.roleLabel}</span>
                <span className={cn("ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full", config.roleBadgeClass, config.roleBadgeTextClass)}>
                  {config.roleShort}
                </span>
              </div>
            </div>

            <div>
              <label className={labelCls}>{t("common", "userId", lang)}</label>
              <div className={readOnlyCls}>
                <Hash className="w-4 h-4 text-gray-400" />
                <span className="font-mono text-xs truncate">{user?.id ?? "—"}</span>
              </div>
            </div>

            <div>
              <label className={labelCls}>{user?.actorType === "SUPER_ADMIN" ? t("common", "scope", lang) : t("common", "tenant", lang)}</label>
              <div className={readOnlyCls}>
                <Building2 className="w-4 h-4 text-gray-400" />
                <span className="font-medium truncate">
                  {user?.actorType === "SUPER_ADMIN" ? t("common", "platformWide", lang) : (user?.madrasaName ?? user?.tenantSlug ?? "—")}
                </span>
              </div>
            </div>

            <div>
              <label className={labelCls}>{isParent ? t("common", "primaryPhone", lang) : t("common", "phone", lang)}</label>
              <div className={readOnlyCls}>
                <Phone className="w-4 h-4 text-gray-400" />
                <span className={cn("font-medium", !user?.phone && !user?.parentPhone && "text-gray-400")}>
                  {user?.phone || user?.parentPhone || t("common", "notSet", lang)}
                </span>
              </div>
            </div>

            <div>
              <label className={labelCls}>{t("common", "email", lang)}</label>
              <div className={readOnlyCls}>
                <Mail className="w-4 h-4 text-gray-400" />
                <span className={cn("font-medium", !user?.email && "text-gray-400")}>
                  {user?.email || t("common", "notSet", lang)}
                </span>
              </div>
            </div>

            {config.showMsrId && (
              <div>
                <label className={labelCls}>{t("common", "msrId", lang)}</label>
                <div className={readOnlyCls}>
                  <Briefcase className="w-4 h-4 text-gray-400" />
                  <span className={cn("font-medium font-mono", !user?.msrId && "text-gray-400")}>
                    {user?.msrId || t("common", "notAssigned", lang)}
                  </span>
                </div>
              </div>
            )}

            <div className="sm:col-span-2">
              <label className={labelCls}>{t("common", "address", lang)}</label>
              <div className={cn(readOnlyCls, "whitespace-pre-wrap items-start")}>
                <MapPin className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                <span className={cn("font-medium", !user?.address && "text-gray-400")}>
                  {user?.address || t("common", "notSet", lang)}
                </span>
              </div>
            </div>
          </div>


        </motion.div>
      </div>

      {/* Desktop Update Profile button */}
      <div className="hidden sm:flex justify-end pb-24">
        <motion.button
          whileHover={{ y: -1 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => openDrawer()}
          className="inline-flex items-center gap-2 px-5 py-3 text-sm font-bold
                     bg-primary-600 text-white rounded-2xl hover:bg-primary-700
                     transition-colors"
        >
          <Pencil className="w-4 h-4" />
          {t("common", "updateProfile", lang)}
        </motion.button>
      </div>

      {/* Mobile floating Update Profile button */}
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={() => openDrawer()}
        className="sm:hidden fixed bottom-20 right-4 z-30 inline-flex items-center gap-2
                   px-4 py-3 text-sm font-bold text-white
                   bg-primary-600 rounded-full
                   hover:bg-primary-700 transition-colors"
      >
        <Pencil className="w-4 h-4" />
        {t("common", "updateProfile", lang)}
      </motion.button>
      </>
      )}

      {/* Edit Drawer */}
      <ResponsivePopover
        fullHeight
        open={drawerOpen}
        onOpenChange={(open) => { if (!open) closeDrawer(); }}
        title={t("common", "updateProfile", lang)}
        description={t("common", "editInfo", lang)}
        footer={
          <div className="border-t border-gray-100 p-4 bg-gray-50/60 backdrop-blur-sm flex items-center gap-2">
            <Button type="button" variant="outline" onClick={closeDrawer} disabled={saving}
              className="px-4 py-3 text-sm font-semibold border border-gray-200 rounded-2xl
                         text-gray-600 bg-white hover:bg-gray-50 transition-all active:scale-95
                         disabled:opacity-50">
              {t("common", "cancel", lang)}
            </Button>
            <Button type="button" onClick={handleSave} disabled={saving}
              className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-bold
                         bg-primary-600 text-white rounded-2xl hover:bg-primary-700
                         transition-colors active:scale-[0.98] disabled:opacity-60">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Pencil className="w-4 h-4" />}
              {saving ? t("common", "updating", lang) : t("common", "updateProfile", lang)}
            </Button>
          </div>
        }
      >
        <Tabs value={drawerTab} onValueChange={(value) => { setDrawerTab(value as "account" | "security"); setError(""); }}>
          <div className="px-5 pt-4">
            <TabsList className="grid w-full grid-cols-2 rounded-2xl">
              {drawerTabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <TabsTrigger key={tab.id} value={tab.id} className="gap-1.5 rounded-xl text-xs data-[state=active]:bg-primary-600 data-[state=active]:text-white data-[state=active]:shadow-none">
                    <Icon className="size-3.5" />
                    {tab.label}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>

          <TabsContent value={drawerTab} className="m-0 p-5">
            <AnimatePresence mode="wait">
              {drawerTab === "account" ? (
                <motion.div
                  key="account"
                  initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-3"
                >
                  {/* Profile picture uploader */}
                  <div className="flex items-center gap-4 p-3.5 bg-gray-50 rounded-2xl border border-gray-100">
                    <div className="relative shrink-0">
                      <Avatar className="size-16 border-2 border-white" aria-busy={uploadingPhoto}>
                        <AvatarImage src={picPreview ?? undefined} alt={user?.name ?? config.roleLabel} />
                        <AvatarFallback className="bg-primary-600 text-xl font-black text-white">
                          {user?.name?.trim().charAt(0).toUpperCase() || config.roleLabel.charAt(0)}
                        </AvatarFallback>
                        {uploadingPhoto && (
                          <span className="absolute inset-0 flex items-center justify-center rounded-full bg-primary-100">
                            <Loader2 className="size-6 animate-spin text-primary-600" />
                          </span>
                        )}
                      </Avatar>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">{t("common", "profilePicture", lang)}</p>
                      <p className="text-[11px] text-gray-500 mt-0.5">{t("common", "photoHint", lang)}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <Button type="button" size="xs" onClick={() => photoInputRef.current?.click()} disabled={uploadingPhoto}>
                          <Camera className="size-3.5" />
                          {picPreview ? t("common", "changePhoto", lang) : t("common", "uploadPhoto", lang)}
                        </Button>
                        <Input ref={photoInputRef} type="file" accept="image/*" className="hidden" aria-label={t("common", "uploadPhoto", lang)} onChange={handlePicFile} onClick={(event) => { event.currentTarget.value = ""; }} disabled={uploadingPhoto} />
                        {picPreview && (
                          <Button type="button" variant="destructive" size="xs" onClick={handleRemovePhoto} disabled={uploadingPhoto}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-[11px] font-semibold
                                       text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors disabled:opacity-50">
                            <X className="w-3 h-3" /> {t("common", "remove", lang)}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="profile-name" className={labelCls}>{t("common", "displayName", lang)} *</label>
                    <div className="relative">
                      <User className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <Input id="profile-name" value={name} onChange={(e) => setName(e.target.value)}
                        className={cn(inputCls, "pl-9")} placeholder={t("common", "displayName", lang).toLowerCase()} autoFocus />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="profile-phone" className={labelCls}>{isParent ? t("common", "primaryPhone", lang) : t("common", "phone", lang)}</label>
                      <div className="relative">
                        <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <Input id="profile-phone" value={phone} onChange={(e) => setPhone(e.target.value)}
                          className={cn(inputCls, "pl-9")} placeholder="e.g. +919876543210" type="tel" inputMode="tel" />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="profile-email" className={labelCls}>{t("common", "email", lang)}</label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <Input id="profile-email" value={email} onChange={(e) => setEmail(e.target.value)}
                          className={cn(inputCls, "pl-9")} placeholder="you@email.com" type="email" />
                      </div>
                    </div>

                    {config.showMsrId && (
                      <div className="sm:col-span-2">
                        <label htmlFor="profile-msrId" className={labelCls}>{t("common", "msrId", lang)}</label>
                        <div className="relative">
                          <Briefcase className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <Input id="profile-msrId" value={msrId} onChange={(e) => setMsrId(e.target.value)}
                            className={cn(inputCls, "pl-9 font-mono")} placeholder="e.g. MSR-0001" />
                        </div>
                      </div>
                    )}

                    <div className="sm:col-span-2">
                      <label htmlFor="profile-address" className={labelCls}>{t("common", "address", lang)}</label>
                      <div className="relative">
                        <MapPin className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                        <Textarea id="profile-address" value={address} onChange={(e) => setAddress(e.target.value)}
                          className={cn(inputCls, "pl-9 min-h-[72px] resize-none")}
                          placeholder="House, street, city, state, pincode" rows={2} />
                      </div>
                    </div>
                  </div>

                  {config.showParentExtras && (
                    <>
                      <div className="pt-2 border-t border-gray-100">
                        <p className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold mb-2">
                          {t("common", "additionalDetails", lang)}
                        </p>
                      </div>
                      <div>
                        <label htmlFor="profile-parentAltPhone" className={labelCls}>{t("common", "alternatePhone", lang)}</label>
                        <div className="relative">
                          <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <Input id="profile-parentAltPhone" value={parentAltPhone} onChange={(e) => setParentAltPhone(e.target.value)}
                            className={cn(inputCls, "pl-9")} placeholder="10-digit mobile number" type="tel" inputMode="tel" />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label htmlFor="profile-city" className={labelCls}>{t("common", "city", lang)}</label>
                          <Input id="profile-city" value={city} onChange={(e) => setCity(e.target.value)}
                            className={inputCls} placeholder={t("common", "city", lang)} />
                        </div>
                        <div>
                          <label htmlFor="profile-stateField" className={labelCls}>{t("common", "state", lang)}</label>
                          <Input id="profile-stateField" value={stateField} onChange={(e) => setStateField(e.target.value)}
                            className={inputCls} placeholder={t("common", "state", lang)} />
                        </div>
                        <div>
                          <label htmlFor="profile-country" className={labelCls}>{t("common", "country", lang)}</label>
                          <Input id="profile-country" value={country} onChange={(e) => setCountry(e.target.value)}
                            className={inputCls} placeholder={t("common", "country", lang)} />
                        </div>
                        <div>
                          <label htmlFor="profile-pincode" className={labelCls}>{t("common", "pincode", lang)}</label>
                          <Input id="profile-pincode" value={pincode} onChange={(e) => setPincode(e.target.value)}
                            className={inputCls} placeholder={t("common", "pincode", lang)} inputMode="numeric" />
                        </div>
                        <div className="sm:col-span-2">
                          <label className={labelCls}>{t("common", "bloodGroup", lang)}</label>
                          <DrawerSelector
                            title={t("common", "bloodGroup", lang)}
                            options={[
                              { value: "", label: "—" },
                              ...["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((group) => ({ value: group, label: group })),
                            ]}
                            value={bloodGroup}
                            onChange={setBloodGroup}
                          />
                        </div>
                      </div>
                    </>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="security"
                  initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-3"
                >
                  <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                    <Shield className="w-4 h-4 text-amber-600 shrink-0" />
                    <p className="text-[11px] text-amber-800 font-medium">
                      {t("common", "pwChangeHint", lang)}
                    </p>
                  </div>


                  <div>
                    <label htmlFor="profile-currentPassword" className={labelCls}>{t("common", "currentPassword", lang)}</label>
                    <div className="relative">
                      <Input
                        type={showCur ? "text" : "password"}
                        name="profile_cur_pwd_custom"
                        autoComplete="current-password"
                        id="profile-currentPassword" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)}
                        className={cn(inputCls, "pr-10")} placeholder={t("common", "enterCurrentPassword", lang)} />
                      <Button type="button" variant="ghost" size="icon-xs" aria-label={showCur ? "Hide password" : "Show password"} aria-pressed={showCur} onClick={() => setShowCur((v) => !v)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100">
                        {showCur ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="profile-newPassword" className={labelCls}>{t("common", "newPassword", lang)}</label>
                    <div className="relative">
                      <Input
                        type={showNew ? "text" : "password"}
                        name="profile_new_pwd_custom"
                        autoComplete="new-password"
                        id="profile-newPassword" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                        className={cn(inputCls, "pr-10")} placeholder={t("common", "min8Chars", lang)} />
                      <Button type="button" variant="ghost" size="icon-xs" aria-label={showNew ? "Hide password" : "Show password"} aria-pressed={showNew} onClick={() => setShowNew((v) => !v)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100">
                        {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>

                    {newPassword && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                        className="mt-2 overflow-hidden">
                        <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                          <motion.div initial={{ width: 0 }} animate={{ width: strengthMeta[strength].width }}
                            className={cn("h-full transition-all duration-300", strengthMeta[strength].color)} />
                        </div>
                        <div className="flex items-center justify-between mt-1.5">
                          <span className="text-[10px] font-semibold text-gray-500">
                            {t("common", "passwordStrength", lang)}: <span className="text-gray-700">{strength === 0 ? "—" : t("common", STRENGTH_KEYS[strength] as any, lang)}</span>
                          </span>
                        </div>
                      </motion.div>
                    )}
                  </div>

                  <div>
                    <label htmlFor="profile-confirmPassword" className={labelCls}>{t("common", "confirmPassword", lang)}</label>
                    <div className="relative">
                      <Input
                        type={showCon ? "text" : "password"}
                        name="profile_con_pwd_custom"
                        autoComplete="new-password"
                        id="profile-confirmPassword" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                        className={cn(inputCls, "pr-10", pwMismatch && "border-rose-300 focus:ring-rose-300/60 focus:border-rose-400")}
                        placeholder={t("common", "repeatNewPassword", lang)} />
                      <Button type="button" variant="ghost" size="icon-xs" aria-label={showCon ? "Hide password" : "Show password"} aria-pressed={showCon} onClick={() => setShowCon((v) => !v)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100">
                        {showCon ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>
                    {pwMismatch && (
                      <p className="text-[10px] text-rose-600 font-semibold mt-1.5 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> {t("common", "passwordsMismatch", lang)}
                      </p>
                    )}
                    {confirmPassword && !pwMismatch && (
                      <p className="text-[10px] text-primary-600 font-semibold mt-1.5 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> {t("common", "passwordsMatch", lang)}
                      </p>
                    )}
                  </div>

                  <div className="pt-2 border-t border-gray-100">
                    <p className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold mb-2">{t("common", "passwordRules", lang)}</p>
                    <ul className="grid grid-cols-2 gap-1.5">
                      {[
                        { label: t("common", "char8plus", lang), done: newPassword.length >= 8 },
                        { label: t("common", "upperLower", lang), done: /[a-z]/.test(newPassword) && /[A-Z]/.test(newPassword) },
                        { label: t("common", "hasNumber", lang),    done: /[0-9]/.test(newPassword) },
                        { label: t("common", "hasSymbol", lang),    done: /[^A-Za-z0-9]/.test(newPassword) },
                      ].map((c) => (
                        <li key={c.label} className="flex items-center gap-1.5 text-[11px]">
                          {c.done ? <CheckCircle2 className="w-3.5 h-3.5 text-primary-500 shrink-0" />
                                  : <Circle className="w-3.5 h-3.5 text-gray-300 shrink-0" />}
                          <span className={cn("font-medium", c.done ? "text-gray-700" : "text-gray-400")}>
                            {c.label}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {error && (
              <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-700">
                <AlertCircle className="w-4 h-4 shrink-0" /> {error}
              </div>
            )}
          </TabsContent>
        </Tabs>

      </ResponsivePopover>
    </DashboardLayout>
  );
}
