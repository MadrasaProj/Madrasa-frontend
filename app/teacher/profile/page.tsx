import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { ApiErrorBanner } from "@/components/ui/ApiErrorBanner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  updateProfile,
  uploadProfilePhoto,
  deleteProfilePhoto,
  type UpdateProfileDto,
} from "@/lib/super-admin-api";
import { useAuthStore } from "@/store/auth";
import { useActiveClass } from "@/store/activeClass";
import { useLanguageStore } from "@/store/language";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  Phone,
  Mail,
  MapPin,
  Building2,
  Briefcase,
  Hash,
  Shield,
  Eye,
  EyeOff,
  Camera,
  Pencil,
  KeyRound,
  CheckCircle,
  CheckCircle2,
  Circle,
  AlertCircle,
  Loader2,
  Sparkles,
  GraduationCap,
  IndianRupee,
  ClipboardList,
  FileText,
  Star,
  Bell,
  ChevronRight,
  Copy,
  Check,
  X,
} from "lucide-react";

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
    "password", "123456", "12345678", "123456789", "qwerty", "123123", "111111",
    "password123", "admin123", "madrasa", "madrasa123", "welcome", "letmein",
    "school123", "parent123", "student123", "pass123", "user123", "changekey"
  ];

  if (WEAK_PASSWORDS.some((weak) => normalized.includes(weak))) {
    return "Password is too common or easy to guess. Please choose a stronger password.";
  }

  if (phone) {
    const cleanPhone = phone.replace(/\+/g, "").trim();
    if (cleanPhone.length >= 4 && normalized.includes(cleanPhone.toLowerCase())) {
      return "Password must not contain your phone number.";
    }
  }

  return null;
};

const strengthMeta: Record<Strength, { label: string; color: string; width: string }> = {
  0: { label: "—", color: "bg-gray-200", width: "w-0" },
  1: { label: "Weak", color: "bg-rose-500", width: "w-1/4" },
  2: { label: "Fair", color: "bg-amber-500", width: "w-2/4" },
  3: { label: "Good", color: "bg-sky-500", width: "w-3/4" },
  4: { label: "Strong", color: "bg-primary-500", width: "w-full" },
};

export default function TeacherProfilePage() {
  const { user, accessToken, updateUser } = useAuthStore();
  const { lang } = useLanguageStore();
  const { activeClass } = useActiveClass();

  // Drawer & Form States
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<"account" | "security">("account");

  // Editable Account Form States
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState(user?.phone ?? user?.parentPhone ?? "");
  const [address, setAddress] = useState(user?.address ?? "");
  const [msrId, setMsrId] = useState(user?.msrId ?? "");

  // Photo Upload States
  const [picPreview, setPicPreview] = useState<string | null>(user?.photoUrl ?? user?.photo ?? null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Security Form States
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCur, setShowCur] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showCon, setShowCon] = useState(false);

  // Action status
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    setName(user?.name ?? "");
    setEmail(user?.email ?? "");
    setPhone(user?.phone ?? user?.parentPhone ?? "");
    setAddress(user?.address ?? "");
    setMsrId(user?.msrId ?? "");
    setPicPreview(user?.photoUrl ?? user?.photo ?? null);
  }, [user]);

  const strength = passwordStrength(newPassword);
  const pwMismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;

  const resetForm = () => {
    setName(user?.name ?? "");
    setEmail(user?.email ?? "");
    setPhone(user?.phone ?? user?.parentPhone ?? "");
    setAddress(user?.address ?? "");
    setMsrId(user?.msrId ?? "");
    setPicPreview(user?.photoUrl ?? user?.photo ?? null);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setError(null);
  };

  const openDrawer = (tab: "account" | "security" = "account") => {
    resetForm();
    setDrawerTab(tab);
    setSuccess(null);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setTimeout(() => resetForm(), 250);
  };

  const copyText = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(text);
    setTimeout(() => setCopiedField(null), 1500);
  };

  const handlePicFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !accessToken) return;
    if (file.size > 2 * 1024 * 1024) {
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
    } catch (err: any) {
      setError(err?.message ?? "Failed to upload photo");
    } finally {
      setUploadingPhoto(false);
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
    } catch (err: any) {
      setError(err?.message ?? "Failed to remove photo");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSave = async () => {
    setError(null);

    if (drawerTab === "account") {
      if (!name.trim()) {
        setError("Display name cannot be empty.");
        return;
      }
      const cleanEmail = email.trim();
      const cleanPhone = phone.trim().replace(/[\s\-()]/g, "");

      if (cleanEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        setError("Please enter a valid email address.");
        return;
      }
      if (cleanPhone && !/^\+?\d{7,15}$/.test(cleanPhone)) {
        setError("Please enter a valid phone number (7–15 digits).");
        return;
      }
    }

    const dto: UpdateProfileDto = {};

    if (drawerTab === "account") {
      const cleanName = name.trim();
      const cleanEmail = email.trim();
      const cleanPhone = phone.trim().replace(/[\s\-()]/g, "");
      const cleanAddress = address.trim();
      const cleanMsr = msrId.trim();

      if (cleanName !== user?.name) dto.name = cleanName;
      if (cleanEmail !== (user?.email ?? "")) dto.email = cleanEmail || undefined;
      if (cleanPhone !== (user?.phone ?? user?.parentPhone ?? "")) dto.phone = cleanPhone || undefined;
      if (cleanAddress !== (user?.address ?? "")) dto.address = cleanAddress || undefined;
      if (cleanMsr !== (user?.msrId ?? "")) dto.msrId = cleanMsr || undefined;
    }

    if (drawerTab === "security") {
      if (!currentPassword) {
        setError("Current password is required.");
        return;
      }
      if (!newPassword) {
        setError("New password is required.");
        return;
      }
      const strengthError = validatePasswordStrength(newPassword, phone);
      if (strengthError) {
        setError(strengthError);
        return;
      }
      if (newPassword !== confirmPassword) {
        setError("New passwords do not match.");
        return;
      }
      dto.currentPassword = currentPassword;
      dto.newPassword = newPassword;
    }

    const hasChanges = Object.keys(dto).length > 0;
    if (!hasChanges) {
      setError("No changes to save.");
      return;
    }

    setSaving(true);
    try {
      await updateProfile(accessToken!, dto);
      if (dto.name) updateUser({ name: dto.name });
      if (dto.email !== undefined) updateUser({ email: dto.email });
      if (dto.phone !== undefined) updateUser({ phone: dto.phone, parentPhone: dto.phone });
      if (dto.address !== undefined) updateUser({ address: dto.address });
      if (dto.msrId !== undefined) updateUser({ msrId: dto.msrId });

      setSuccess(
        drawerTab === "security"
          ? "Password updated successfully."
          : t("parentPages", "profileUpdated", lang)
      );
      closeDrawer();
    } catch (e: any) {
      setError(e?.message ?? "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  const today = new Date().toLocaleDateString(lang === "ml" ? "ml-IN" : "en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <DashboardLayout>
      <PageHeader
        title={t("nav", "profile", lang)}

        />

      <div className="pt-6 pb-24">
        {/* Success Alert */}
        <AnimatePresence>
          {success && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mx-3 mb-4 flex items-center justify-between gap-2 rounded-2xl border border-primary-200 bg-primary-50 p-3 text-sm text-primary-800"
            >
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 shrink-0 text-primary-600" />
                <span>{success}</span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={() => setSuccess(null)}
                className="text-primary-700 hover:bg-primary-100"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Hero Identity & Stats Card (Referencing FeeStats from fees/page.tsx) */}
        <div className="py-3">
          <section className="mb-4 overflow-hidden rounded-2xl bg-gradient-to-br from-white to-sky-50 shadow-none">
            <div className="border-b border-gray-100 px-4 py-4 sm:px-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3.5 sm:gap-4">
                  <div className="relative shrink-0">
                    {user?.photoUrl ? (
                      <img
                        src={user.photoUrl}
                        alt={user.name}
                        className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl object-cover ring-2 ring-white shadow-md bg-white/60"
                      />
                    ) : (
                      <div className="flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-2xl bg-primary-600 text-2xl sm:text-3xl font-bold text-white shadow-md ring-2 ring-white">
                        {user?.name?.charAt(0)?.toUpperCase() ?? "T"}
                      </div>
                    )}
                    <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-white">
                      <CheckCircle className="h-3.5 w-3.5 text-white" />
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="truncate text-lg sm:text-xl font-bold text-gray-950">
                        {user?.name ?? "Teacher"}
                      </h1>
                      <span className="inline-flex items-center gap-1 rounded-full border border-primary-100 bg-primary-50 px-2.5 py-0.5 text-[11px] font-semibold text-primary-700">
                        <Sparkles className="h-3 w-3" /> TEACHER
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground truncate">
                      {user?.madrasaName ?? "Smart Madrasa"}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-medium">
                      {activeClass && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-0.5 text-gray-700 ring-1 ring-gray-200">
                          <GraduationCap className="h-3 w-3 text-primary-600" />
                          {activeClass.name}
                        </span>
                      )}
                      {user?.msrId && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-0.5 text-gray-700 ring-1 ring-gray-200 font-mono">
                          <Hash className="h-3 w-3 text-gray-400" />
                          {user.msrId}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-0.5 text-gray-600 ring-1 ring-gray-200">
                        {today}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Header Action Buttons using shadcn Button */}
                <div className="flex items-center gap-2 sm:self-start">
                  <Button
                    type="button"
                    variant="outline"
                    size="default"
                    onClick={() => openDrawer("security")}
                    className="h-9 rounded-xl border-gray-200 text-xs font-semibold"
                  >
                    <KeyRound className="mr-1.5 h-3.5 w-3.5" />
                    Password
                  </Button>
                  <Button
                    type="button"
                    size="default"
                    onClick={() => openDrawer("account")}
                    className="h-9 rounded-xl text-xs font-semibold shadow-sm"
                  >
                    <Pencil className="mr-1.5 h-3.5 w-3.5" />
                    Edit Profile
                  </Button>
                </div>
              </div>
            </div>

            {/* Stat & Metadata Tiles Grid */}
            <div className="grid grid-cols-2 gap-px border-t border-gray-100 bg-gray-100 sm:grid-cols-4">
              <div className="min-w-0 bg-white/90 p-3 sm:p-4">
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-gray-600">
                  <GraduationCap className="h-3.5 w-3.5 shrink-0 text-primary-700" />
                  <span>Assigned Class</span>
                </div>
                <div className="mt-2 text-base font-semibold tabular-nums text-gray-950 sm:text-lg truncate">
                  {activeClass?.name ?? "All Classes"}
                </div>
                <div className="mt-1 text-[11px] text-gray-500">
                  {activeClass ? "Class Teacher" : "Subject Teacher"}
                </div>
              </div>

              <div className="min-w-0 bg-white/90 p-3 sm:p-4">
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-gray-600">
                  <Briefcase className="h-3.5 w-3.5 shrink-0 text-blue-700" />
                  <span>Staff MSR ID</span>
                </div>
                <div className="mt-2 text-base font-semibold tabular-nums font-mono text-gray-950 sm:text-lg truncate">
                  {user?.msrId || "—"}
                </div>
                <div className="mt-1 text-[11px] text-gray-500">
                  Institutional ID
                </div>
              </div>

              <div className="min-w-0 bg-white/90 p-3 sm:p-4">
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-gray-600">
                  <Phone className="h-3.5 w-3.5 shrink-0 text-emerald-700" />
                  <span>Contact Phone</span>
                </div>
                <div className="mt-2 text-base font-semibold tabular-nums text-gray-950 sm:text-lg truncate">
                  {user?.phone || user?.parentPhone || "—"}
                </div>
                <div className="mt-1 text-[11px] text-gray-500">
                  Primary Phone
                </div>
              </div>

              <div className="min-w-0 bg-white/90 p-3 sm:p-4">
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-gray-600">
                  <Mail className="h-3.5 w-3.5 shrink-0 text-amber-700" />
                  <span>Email Address</span>
                </div>
                <div className="mt-2 text-base font-semibold text-gray-950 sm:text-lg truncate">
                  {user?.email || "—"}
                </div>
                <div className="mt-1 text-[11px] text-gray-500">
                  Login & Communication
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Profile Information List (Referencing classic card style from fees/page.tsx) */}
        <div className="px-3">
          <div className="mb-2 flex items-center justify-between px-1">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Account Information
            </h2>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={() => openDrawer("account")}
              className="text-primary hover:text-primary/80"
            >
              <Pencil className="mr-1 h-3 w-3" /> Edit
            </Button>
          </div>

          <div
            data-ui-style="classic"
            className="card mb-6 divide-y p-0! divide-gray-100 overflow-hidden rounded-2xl bg-white shadow-none"
          >
            {/* Row 1: Full Name */}
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gray-50 text-gray-500">
                  <User className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{t("common", "displayName", lang)}</p>
                  <p className="font-semibold text-sm text-gray-900 truncate">{user?.name || "—"}</p>
                </div>
              </div>
            </div>

            {/* Row 2: Phone */}
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gray-50 text-gray-500">
                  <Phone className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{t("common", "phone", lang)}</p>
                  <p className="font-semibold text-sm text-gray-900 truncate">
                    {user?.phone || user?.parentPhone || t("common", "notSet", lang)}
                  </p>
                </div>
              </div>
              {(user?.phone || user?.parentPhone) && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => copyText(user?.phone || user?.parentPhone || "")}
                  title="Copy phone"
                  aria-label="Copy phone number"
                >
                  {copiedField === (user?.phone || user?.parentPhone) ? (
                    <Check className="h-3.5 w-3.5 text-primary" />
                  ) : (
                    <Copy className="h-3.5 w-3.5 text-gray-400" />
                  )}
                </Button>
              )}
            </div>

            {/* Row 3: Email */}
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gray-50 text-gray-500">
                  <Mail className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{t("common", "email", lang)}</p>
                  <p className="font-semibold text-sm text-gray-900 truncate">
                    {user?.email || t("common", "notSet", lang)}
                  </p>
                </div>
              </div>
              {user?.email && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => copyText(user?.email || "")}
                  title="Copy email"
                  aria-label="Copy email address"
                >
                  {copiedField === user?.email ? (
                    <Check className="h-3.5 w-3.5 text-primary" />
                  ) : (
                    <Copy className="h-3.5 w-3.5 text-gray-400" />
                  )}
                </Button>
              )}
            </div>

            {/* Row 4: Staff MSR ID */}
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gray-50 text-gray-500">
                  <Briefcase className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{t("common", "msrId", lang)}</p>
                  <p className="font-semibold font-mono text-sm text-gray-900 truncate">
                    {user?.msrId || t("common", "notAssigned", lang)}
                  </p>
                </div>
              </div>
            </div>

            {/* Row 5: Madrasa / Center */}
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gray-50 text-gray-500">
                  <Building2 className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{t("common", "tenant", lang)}</p>
                  <p className="font-semibold text-sm text-gray-900 truncate">
                    {user?.madrasaName || user?.tenantSlug || "—"}
                  </p>
                </div>
              </div>
            </div>

            {/* Row 6: Address */}
            <div className="flex items-start justify-between p-4">
              <div className="flex items-start gap-3 min-w-0">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gray-50 text-gray-500 mt-0.5">
                  <MapPin className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{t("common", "address", lang)}</p>
                  <p className="font-semibold text-sm text-gray-900 whitespace-pre-wrap">
                    {user?.address || t("common", "notSet", lang)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Teacher Quick Shortcuts */}
        <div className="px-3">
          <h2 className="mb-2 px-1 text-xs font-bold uppercase tracking-wider text-gray-500">
            {t("common", "quickLinks", lang)}
          </h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              { label: t("teacherPages", "feesPaymentsTitle", lang), icon: IndianRupee, href: "/teacher/fees" },
              { label: t("nav", "attendance", lang), icon: ClipboardList, href: "/teacher/attendance" },
              { label: t("nav", "performance", lang), icon: Star, href: "/teacher/performance" },
              { label: "Individual Reports", icon: FileText, href: "/teacher/reports/individual" },
              { label: t("nav", "notifications", lang), icon: Bell, href: "/teacher/notifications" },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <a
                  key={item.label}
                  href={item.href}
                  className="flex items-center justify-between rounded-2xl border border-gray-100 bg-white p-3.5 transition-all hover:border-primary-200 hover:bg-primary-50/50"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-50 text-gray-600">
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="truncate text-xs font-semibold text-gray-900">{item.label}</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-300 shrink-0" />
                </a>
              );
            })}
          </div>
        </div>
      </div>

      {/* Edit Profile Drawer (Shadcn Drawer matching fees/page.tsx) */}
      <Drawer
        open={drawerOpen}
        onOpenChange={(open) => {
          if (!open) closeDrawer();
        }}
        swipeDirection="down"
      >
        <DrawerContent className="max-h-[88dvh] bg-background">
          <div className="shrink-0 border-b px-5 py-4">
            <div className="flex items-center justify-between">
              <div>
                <DrawerTitle className="text-lg font-semibold">
                  {drawerTab === "account" ? t("common", "updateProfile", lang) : t("common", "security", lang)}
                </DrawerTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  {drawerTab === "account"
                    ? "Manage your teacher account personal information"
                    : "Update your account login password"}
                </p>
              </div>
              <DrawerClose className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                <X className="h-5 w-5" />
              </DrawerClose>
            </div>
          </div>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
            {/* Drawer Navigation Tabs */}
            <Tabs
              value={drawerTab}
              onValueChange={(val) => {
                setDrawerTab(val as "account" | "security");
                setError(null);
              }}
              className="w-full"
            >
              <TabsList className="grid h-auto w-full grid-cols-2">
                <TabsTrigger value="account" className="px-2 py-2 text-xs">
                  {t("common", "accountDetails", lang)}
                </TabsTrigger>
                <TabsTrigger value="security" className="px-2 py-2 text-xs">
                  {t("common", "security", lang)}
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {error && (
              <ApiErrorBanner
                message={error}
                onRetry={() => setError(null)}
              />
            )}

            {drawerTab === "account" ? (
              <div className="space-y-4">
                {/* Profile Photo Uploader */}
                <div className="flex items-center gap-4 rounded-xl border border-gray-100 bg-gray-50/70 p-3.5">
                  <div className="relative shrink-0">
                    {uploadingPhoto ? (
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-100">
                        <Loader2 className="h-6 w-6 animate-spin text-primary-600" />
                      </div>
                    ) : picPreview ? (
                      <img
                        src={picPreview}
                        alt={user?.name ?? "Teacher"}
                        className="h-16 w-16 rounded-2xl border-2 border-white object-cover shadow-sm"
                      />
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-white bg-primary-600 text-xl font-bold text-white shadow-sm">
                        {user?.name?.charAt(0)?.toUpperCase() ?? "T"}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900">{t("common", "profilePicture", lang)}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{t("common", "photoHint", lang)}</p>
                    <div className="mt-2.5 flex flex-wrap items-center gap-2">
                      <label className="cursor-pointer">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handlePicFile}
                          disabled={uploadingPhoto}
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="default"
                          disabled={uploadingPhoto}
                          onClick={(e) => {
                            const input = (e.currentTarget.parentElement as HTMLElement)?.querySelector("input");
                            input?.click();
                          }}
                        >
                          <Camera className="mr-1.5 h-3.5 w-3.5" />
                          {picPreview ? t("common", "changePhoto", lang) : t("common", "uploadPhoto", lang)}
                        </Button>
                      </label>
                      {picPreview && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={uploadingPhoto}
                          onClick={handleRemovePhoto}
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        >
                          {t("common", "remove", lang)}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Name Input using shadcn Input */}
                <div>
                  <label className="text-xs font-semibold text-gray-700 mb-1.5 block">
                    {t("common", "displayName", lang)} <span className="text-destructive">*</span>
                  </label>
                  <Input
                    size="lg"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Usthad Ahmed"
                    className="w-full"
                  />
                </div>

                {/* Phone & Email Inputs */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-semibold text-gray-700 mb-1.5 block">
                      {t("common", "phone", lang)}
                    </label>
                    <Input
                      size="lg"
                      type="tel"
                      inputMode="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. +91 98765 43210"
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-700 mb-1.5 block">
                      {t("common", "email", lang)}
                    </label>
                    <Input
                      size="lg"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. teacher@madrasa.com"
                      className="w-full"
                    />
                  </div>
                </div>

                {/* Staff MSR ID Input */}
                <div>
                  <label className="text-xs font-semibold text-gray-700 mb-1.5 block">
                    {t("common", "msrId", lang)}
                  </label>
                  <Input
                    size="lg"
                    value={msrId}
                    onChange={(e) => setMsrId(e.target.value)}
                    placeholder="e.g. MSR-1024"
                    className="w-full font-mono"
                  />
                </div>

                {/* Address using shadcn Textarea */}
                <div>
                  <label className="text-xs font-semibold text-gray-700 mb-1.5 block">
                    {t("common", "address", lang)}
                  </label>
                  <Textarea
                    size="lg"
                    rows={3}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="House name, street, area, city, pincode"
                    className="w-full"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50/60 p-3 text-xs text-amber-800">
                  <Shield className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                  <p>{t("common", "pwChangeHint", lang)}</p>
                </div>

                {/* Decoy trap to prevent browser auto-injection */}
                <div style={{ position: "absolute", opacity: 0, height: 0, width: 0, overflow: "hidden", zIndex: -1 }}>
                  <input type="text" name="fake_username_trap" tabIndex={-1} autoComplete="username" />
                  <input type="password" name="fake_password_trap" tabIndex={-1} autoComplete="current-password" />
                </div>

                {/* Current Password Input */}
                <div>
                  <label className="text-xs font-semibold text-gray-700 mb-1.5 block">
                    {t("common", "currentPassword", lang)} <span className="text-destructive">*</span>
                  </label>
                  <div className="relative">
                    <Input
                      size="lg"
                      type={showCur ? "text" : "password"}
                      name="teacher_profile_cur_pwd"
                      autoComplete="new-password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder={t("common", "enterCurrentPassword", lang)}
                      className="pr-10 w-full"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setShowCur(!showCur)}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showCur ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                {/* New Password Input */}
                <div>
                  <label className="text-xs font-semibold text-gray-700 mb-1.5 block">
                    {t("common", "newPassword", lang)} <span className="text-destructive">*</span>
                  </label>
                  <div className="relative">
                    <Input
                      size="lg"
                      type={showNew ? "text" : "password"}
                      name="teacher_profile_new_pwd"
                      autoComplete="new-password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder={t("common", "min8Chars", lang)}
                      className="pr-10 w-full"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setShowNew(!showNew)}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>

                  {newPassword && (
                    <div className="mt-2.5">
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                        <div
                          className={cn("h-full transition-all duration-300", strengthMeta[strength].color, strengthMeta[strength].width)}
                        />
                      </div>
                      <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>
                          {t("common", "passwordStrength", lang)}:{" "}
                          <strong className="text-foreground">{strengthMeta[strength].label}</strong>
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Confirm Password Input */}
                <div>
                  <label className="text-xs font-semibold text-gray-700 mb-1.5 block">
                    {t("common", "confirmPassword", lang)} <span className="text-destructive">*</span>
                  </label>
                  <div className="relative">
                    <Input
                      size="lg"
                      type={showCon ? "text" : "password"}
                      name="teacher_profile_con_pwd"
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder={t("common", "repeatNewPassword", lang)}
                      className={cn("pr-10 w-full", pwMismatch && "border-destructive focus-visible:ring-destructive/30")}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setShowCon(!showCon)}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showCon ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  {pwMismatch && (
                    <p className="mt-1 flex items-center gap-1 text-[11px] font-medium text-destructive">
                      <AlertCircle className="h-3 w-3" /> {t("common", "passwordsMismatch", lang)}
                    </p>
                  )}
                  {confirmPassword && !pwMismatch && (
                    <p className="mt-1 flex items-center gap-1 text-[11px] font-medium text-primary">
                      <CheckCircle2 className="h-3 w-3" /> {t("common", "passwordsMatch", lang)}
                    </p>
                  )}
                </div>

                {/* Password Rules Checklist */}
                <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-3">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("common", "passwordRules", lang)}
                  </p>
                  <ul className="grid grid-cols-2 gap-2 text-xs">
                    {[
                      { label: t("common", "char8plus", lang), done: newPassword.length >= 8 },
                      { label: t("common", "upperLower", lang), done: /[a-z]/.test(newPassword) && /[A-Z]/.test(newPassword) },
                      { label: t("common", "hasNumber", lang), done: /[0-9]/.test(newPassword) },
                      { label: t("common", "hasSymbol", lang), done: /[^A-Za-z0-9]/.test(newPassword) },
                    ].map((rule) => (
                      <li key={rule.label} className="flex items-center gap-1.5">
                        {rule.done ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                        ) : (
                          <Circle className="h-3.5 w-3.5 text-gray-300 shrink-0" />
                        )}
                        <span className={cn(rule.done ? "text-foreground font-medium" : "text-muted-foreground")}>
                          {rule.label}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* Drawer Footer using ButtonGroup and shadcn Button */}
          <DrawerFooter className="shrink-0 bg-background p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <ButtonGroup className="w-full [&>button]:flex-1">
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={closeDrawer}
                disabled={saving}
              >
                {t("common", "cancel", lang)}
              </Button>
              <Button
                type="button"
                size="lg"
                disabled={saving}
                onClick={handleSave}
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("common", "updating", lang)}
                  </>
                ) : (
                  t("common", "updateProfile", lang)
                )}
              </Button>
            </ButtonGroup>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </DashboardLayout>
  );
}

