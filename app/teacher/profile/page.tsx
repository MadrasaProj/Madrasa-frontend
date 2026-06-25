import { useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { updateProfile, type UpdateProfileDto } from "@/lib/super-admin-api";
import { listHomework } from "@/lib/homework-api";
import { getAttendanceSummary } from "@/lib/reports-api";
import { getUnreadCount } from "@/lib/notifications-api";
import { useAuthStore } from "@/store/auth";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
 UserCircle2, Loader2, CheckCircle, AlertCircle, Phone, Mail,
 BookOpen, ClipboardList, Star, Bell, KeyRound, Eye, EyeOff,
 Shield, Sparkles, IdCard, CalendarDays, Edit3,
 Building2, Hash, Activity, TrendingUp, Clock,
 CheckCircle2, Circle, ArrowUpRight, Lock, User, X,
 Camera, MapPin, Briefcase, Pencil,
} from "lucide-react";

const inputCls =
 "w-full px-3.5 py-2.5 text-sm bg-white border border-gray-200 rounded-xl " +
 "focus:outline-none focus:ring-2 focus:ring-emerald-400/60 focus:border-emerald-400 " +
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

const strengthMeta: Record<Strength, { label: string; color: string; width: string }> = {
 0: { label: "—", color: "bg-gray-200", width: "w-0" },
 1: { label: "Weak", color: "bg-rose-500", width: "w-1/4" },
 2: { label: "Fair", color: "bg-amber-500", width: "w-2/4" },
 3: { label: "Good", color: "bg-sky-500", width: "w-3/4" },
 4: { label: "Strong", color: "bg-emerald-500", width: "w-full" },
};

interface DrawerProps {
 open: boolean;
 onClose: () => void;
 children: React.ReactNode;
 title: string;
 subtitle?: string;
}

function Drawer({ open, onClose, children, title, subtitle }: DrawerProps) {
 useEffect(() => {
 if (open) {
 document.body.style.overflow = "hidden";
 const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
 window.addEventListener("keydown", handler);
 return () => {
 document.body.style.overflow = "";
 window.removeEventListener("keydown", handler);
 };
 }
 }, [open, onClose]);

 return (
 <AnimatePresence>
 {open && (
 <div className="fixed inset-0 z-50">
 <motion.div
 initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
 transition={{ duration: 0.2 }}
 onClick={onClose}
 className="absolute inset-0 bg-black/50 backdrop-blur-sm"
 />
 <motion.div
 initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
 transition={{ type: "spring", stiffness: 350, damping: 36 }}
 className="absolute right-0 top-0 bottom-0 w-full sm:max-w-lg bg-white shadow-2xl flex flex-col"
 >
 <div className="flex items-center justify-between gap-3 p-5 border-b border-gray-100 shrink-0">
 <div className="min-w-0">
 <h2 className="text-base font-bold text-gray-900 truncate">{title}</h2>
 {subtitle && <p className="text-xs text-gray-500 mt-0.5 truncate">{subtitle}</p>}
 </div>
 <button
 onClick={onClose}
 className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 transition-colors active:scale-95 shrink-0"
 aria-label="Close drawer"
 >
 <X className="w-5 h-5" />
 </button>
 </div>
 <div className="flex-1 overflow-y-auto">{children}</div>
 </motion.div>
 </div>
 )}
 </AnimatePresence>
 );
}

export default function TeacherProfilePage() {
 const { user, accessToken, updateUser } = useAuthStore();

 // Editable fields
 const [name, setName] = useState(user?.name ?? "");
 const [email, setEmail] = useState(user?.email ?? "");
 const [phone, setPhone] = useState(user?.phone ?? user?.parentPhone ?? "");
 const [address, setAddress] = useState(user?.address ?? "");
 const [msrId, setMsrId] = useState(user?.msrId ?? "");
 const [profilePic, setProfilePic] = useState(user?.profilePic ?? "");
 const [picPreview, setPicPreview] = useState<string | null>(user?.profilePic ?? null);

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

 // Live stats
 const [stats, setStats] = useState({ hw: 0, attRate: 0, unread: 0, present: 0, absent: 0 });
 const [statsLoading, setStatsLoading] = useState(true);

 const cid = user?.clientId ?? "";
 const token = accessToken ?? "";
 const joined = useMemo(() => {
 if (!user?.id) return "—";
 return "Active member";
 }, [user?.id]);

 useEffect(() => {
 if (!cid || !token) return;
 setStatsLoading(true);
 Promise.all([
 listHomework(cid, token).catch(() => [] as any[]),
 getAttendanceSummary(cid, token).catch(() => null),
 getUnreadCount(cid, token).catch(() => ({ count: 0 })),
 ]).then(([hw, att, notif]) => {
 const present = att?.present ?? 0;
 const total = att?.total ?? 0;
 setStats({
 hw: (hw as any[]).length,
 attRate: att?.rate ?? 0,
 unread: notif.count,
 present,
 absent: Math.max(total - present, 0),
 });
 }).finally(() => setStatsLoading(false));
 }, [cid, token]);

 const strength = passwordStrength(newPassword);
 const pwMismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;

 const resetForm = () => {
 setName(user?.name ?? "");
 setEmail(user?.email ?? "");
 setPhone(user?.phone ?? user?.parentPhone ?? "");
 setAddress(user?.address ?? "");
 setMsrId(user?.msrId ?? "");
 setProfilePic(user?.profilePic ?? "");
 setPicPreview(user?.profilePic ?? null);
 setCurrentPassword("");
 setNewPassword("");
 setConfirmPassword("");
 setError("");
 };

 const openDrawer = () => {
 resetForm();
 setDrawerTab("account");
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
 if (cleanMsr !== (user?.msrId ?? "")) dto.msrId = cleanMsr || undefined;
 const cleanPic = profilePic.trim();
 if (cleanPic !== (user?.profilePic ?? "")) dto.profilePic = cleanPic || undefined;
 }

 if (drawerTab === "security" && newPassword) {
 if (!currentPassword) { setError("Current password is required."); return; }
 if (newPassword.length < 8) { setError("New password must be at least 8 characters."); return; }
 if (newPassword !== confirmPassword) { setError("New passwords do not match."); return; }
 dto.currentPassword = currentPassword;
 dto.newPassword = newPassword;
 }

 if (!dto.name && !dto.newPassword && !dto.email && !dto.phone &&
 !dto.address && !dto.msrId && !dto.profilePic) {
 setError("No changes to save.");
 return;
 }

 setSaving(true);
 try {
 await updateProfile(accessToken!, dto);
 if (dto.name) updateUser({ name: dto.name });
 if (dto.email !== undefined) updateUser({ email: cleanEmail || undefined });
 if (dto.phone !== undefined) updateUser({ phone: cleanPhone || undefined, parentPhone: cleanPhone || undefined });
 if (dto.address !== undefined) updateUser({ address: address.trim() || undefined });
 if (dto.msrId !== undefined) updateUser({ msrId: msrId.trim() || undefined });
 if (dto.profilePic !== undefined) updateUser({ profilePic: profilePic.trim() || null });
 setSuccess("Profile updated successfully.");
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

 const handlePicFile = (e: React.ChangeEvent<HTMLInputElement>) => {
 const file = e.target.files?.[0];
 if (!file) return;
 if (file.size > 2 * 1024 * 1024) {
 setError("Image must be under 2MB.");
 return;
 }
 const reader = new FileReader();
 reader.onload = () => {
 const dataUrl = reader.result as string;
 setPicPreview(dataUrl);
 setProfilePic(dataUrl);
 };
 reader.readAsDataURL(file);
 };

 const today = new Date().toLocaleDateString("en-GB", {
 weekday: "long", day: "numeric", month: "long", year: "numeric",
 });

 const statTiles = [
 {
 label: "Homework", value: stats.hw, icon: BookOpen,
 bg: "bg-sky-50", text: "text-sky-700", blob: "bg-sky-400",
 },
 {
 label: "Attendance", value: `${stats.attRate}%`, icon: ClipboardList,
 bg: "bg-emerald-50", text: "text-emerald-700", blob: "bg-emerald-400",
 },
 {
 label: "Unread", value: stats.unread, icon: Bell,
 bg: "bg-amber-50", text: "text-amber-700", blob: "bg-amber-400",
 },
 {
 label: "Present Today", value: stats.present, icon: CheckCircle2,
 bg: "bg-violet-50", text: "text-violet-700", blob: "bg-violet-400",
 },
 ];

 const drawerTabs = [
 { id: "account" as const, label: "Account Details", icon: User },
 { id: "security" as const, label: "Security", icon: Shield },
 ];

 return (
 <DashboardLayout>
 <PageHeader
 title="My Profile"
 subtitle="Manage your account & preferences"
 icon={UserCircle2}
 />

 {/* ── Banners ─────────────────────────────────────────────────────────── */}
 <AnimatePresence>
 {success && (
 <motion.div
 initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
 className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2 text-sm text-emerald-700"
 >
 <CheckCircle className="w-4 h-4 shrink-0" /> {success}
 </motion.div>
 )}
 </AnimatePresence>

 {/* ── Content grid ────────────────────────────────────────────────────── */}
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pb-28">

 {/* ── Identity card ─────────────────────────────────────────────────── */}
 <motion.div
 initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
 className="lg:col-span-3 relative overflow-hidden rounded-3xl border border-gray-100"
 >
 <div className="absolute inset-0 bg-gradient-to-r from-emerald-700 to-teal-600" />
 <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-white/10 blur-3xl" />
 <div className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full bg-emerald-400/20 blur-3xl" />
 <div className="absolute inset-0 opacity-20"
 style={{
 backgroundImage:
 "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.4) 1px, transparent 0)",
 backgroundSize: "22px 22px",
 }}
 />

 <div className="relative p-5 sm:p-7 text-white">
 <div className="flex flex-col sm:flex-row sm:items-center gap-5">
 {/* Avatar */}
 <div className="relative shrink-0">
 {user?.profilePic ? (
 <img
 src={user.profilePic}
 alt={user.name}
 className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl object-cover border-2 border-white/30 shadow-xl bg-white/15"
 />
 ) : (
 <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-white/15 backdrop-blur-sm border-2 border-white/30 flex items-center justify-center text-3xl sm:text-4xl font-black shadow-xl">
 {user?.name?.charAt(0)?.toUpperCase() ?? "T"}
 </div>
 )}
 
 
 </div>

 {/* Info */}
 <div className="flex-1 min-w-0">
 <div className="flex items-center gap-2 mb-1">
 <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-white/20 backdrop-blur-sm">
 <Sparkles className="w-3 h-3" /> Teacher
 </span>
 <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-100/80">
 {today}
 </span>
 </div>
 <h1 className="text-2xl sm:text-3xl font-black tracking-tight truncate">
 {user?.name ?? "Teacher"}
 </h1>
 <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-emerald-50/90">
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
 <span className="inline-flex items-center gap-1.5">
 <CalendarDays className="w-3 h-3" /> {joined}
 </span>
 </div>
 </div>
 </div>
 </div>
 </motion.div>

 {/* ── Left column on desktop: stat tiles ────────────────────────────── */}
 <motion.div
 initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
 className="lg:col-span-1 grid grid-cols-2 gap-3"
 >
 {statTiles.map((s, i) => {
 const Icon = s.icon;
 return (
 <motion.div
 key={s.label}
 initial={{ opacity: 0, scale: 0.95 }}
 animate={{ opacity: 1, scale: 1 }}
 transition={{ delay: 0.05 + i * 0.04 }}
 whileHover={{ y: -2 }}
 className="relative overflow-hidden bg-white border border-gray-100 rounded-2xl p-3.5 group cursor-default"
 >
 <div className={cn(
 "absolute -top-6 -right-6 w-16 h-16 rounded-full opacity-10 group-hover:opacity-20 transition-opacity",
 s.blob
 )} />
 <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center mb-2", s.bg)}>
 <Icon className={cn("w-4 h-4", s.text)} />
 </div>
 <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{s.label}</p>
 <p className="text-xl font-black text-gray-900 mt-0.5">
 {statsLoading ? <span className="inline-block w-10 h-5 bg-gray-100 rounded animate-pulse" /> : s.value}
 </p>
 </motion.div>
 );
 })}

 {/* Activity card */}
 <motion.div
 initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}
 className="col-span-2 bg-gray-900 rounded-2xl p-4 text-white"
 >
 <div className="flex items-center justify-between mb-3">
 <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">This week</p>
 <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400">
 <TrendingUp className="w-3 h-3" /> +12%
 </span>
 </div>
 <div className="flex items-end gap-1.5 h-16">
 {[40, 65, 50, 80, 55, 90, 70].map((h, i) => (
 <motion.div
 key={i}
 initial={{ height: 0 }}
 animate={{ height: `${h}%` }}
 transition={{ delay: 0.3 + i * 0.05, duration: 0.5 }}
 className="flex-1 rounded-t-md bg-emerald-500"
 />
 ))}
 </div>
 <div className="flex justify-between text-[9px] text-gray-400 mt-1.5 font-medium">
 {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => <span key={i}>{d}</span>)}
 </div>
 </motion.div>
 </motion.div>

 {/* ── Right column on desktop: profile details (read-only) ──────────── */}
 <motion.div
 initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
 className="lg:col-span-2 bg-white border border-gray-100 rounded-3xl p-5 sm:p-6"
 >
 <div className="flex items-center justify-between mb-5">
 <div>
 <h2 className="text-base font-bold text-gray-900">Profile Details</h2>
 <p className="text-xs text-gray-500 mt-0.5">
 Hello, <span className="font-semibold text-emerald-700">{user?.name ?? "Teacher"}</span> — your account at a glance
 </p>
 </div>
 <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full">
 <CheckCircle className="w-3 h-3" /> Verified
 </span>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div>
 <label className={labelCls}>Display Name</label>
 <div className={readOnlyCls}>
 <User className="w-4 h-4 text-gray-400" />
 <span className="font-medium">{user?.name ?? "—"}</span>
 </div>
 </div>

 <div>
 <label className={labelCls}>Role</label>
 <div className={readOnlyCls}>
 <IdCard className="w-4 h-4 text-gray-400" />
 <span className="font-medium">Teacher</span>
 <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700">
 TEACHER
 </span>
 </div>
 </div>

 <div>
 <label className={labelCls}>User ID</label>
 <div className={readOnlyCls}>
 <Hash className="w-4 h-4 text-gray-400" />
 <span className="font-mono text-xs truncate">{user?.id ?? "—"}</span>
 </div>
 </div>

 <div>
 <label className={labelCls}>Tenant</label>
 <div className={readOnlyCls}>
 <Building2 className="w-4 h-4 text-gray-400" />
 <span className="font-medium truncate">{user?.madrasaName ?? user?.tenantSlug ?? "—"}</span>
 </div>
 </div>

 <div>
 <label className={labelCls}>Phone</label>
 <div className={readOnlyCls}>
 <Phone className="w-4 h-4 text-gray-400" />
 <span className={cn("font-medium", !user?.phone && !user?.parentPhone && "text-gray-400")}>
 {user?.phone || user?.parentPhone || "Not set"}
 </span>
 </div>
 </div>

 <div>
 <label className={labelCls}>Email</label>
 <div className={readOnlyCls}>
 <Mail className="w-4 h-4 text-gray-400" />
 <span className={cn("font-medium", !user?.email && "text-gray-400")}>
 {user?.email || "Not set"}
 </span>
 </div>
 </div>

 <div>
 <label className={labelCls}>MSR ID</label>
 <div className={readOnlyCls}>
 <Briefcase className="w-4 h-4 text-gray-400" />
 <span className={cn("font-medium font-mono", !user?.msrId && "text-gray-400")}>
 {user?.msrId || "Not assigned"}
 </span>
 </div>
 </div>

 <div className="sm:col-span-2">
 <label className={labelCls}>Address</label>
 <div className={cn(readOnlyCls, "whitespace-pre-wrap items-start")}>
 <MapPin className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
 <span className={cn("font-medium", !user?.address && "text-gray-400")}>
 {user?.address || "Not set"}
 </span>
 </div>
 </div>
 </div>

 {/* Quick links */}
 <div className="mt-5 pt-5 border-t border-gray-100">
 <p className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold mb-3">Quick Links</p>
 <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
 {[
 { label: "Dashboard", icon: Activity, href: "/teacher" },
 { label: "Notifications",icon: Bell, href: "/teacher/notifications", badge: stats.unread },
 { label: "Performance", icon: Star, href: "/teacher/performance" },
 { label: "Attendance", icon: ClipboardList, href: "/teacher/attendance" },
 ].map((q) => {
 const Icon = q.icon;
 return (
 <a
 key={q.label}
 href={q.href}
 className="group relative flex items-center gap-2 p-2.5 rounded-xl bg-gray-50 hover:bg-emerald-50 transition-colors"
 >
 <Icon className="w-4 h-4 text-gray-500 group-hover:text-emerald-600 shrink-0" />
 <span className="text-xs font-semibold text-gray-700 group-hover:text-emerald-700 truncate">
 {q.label}
 </span>
 {q.badge !== undefined && q.badge > 0 && (
 <span className="absolute top-1 right-1 text-[9px] font-bold bg-rose-500 text-white min-w-[16px] h-4 px-1 rounded-full inline-flex items-center justify-center">
 {q.badge}
 </span>
 )}
 </a>
 );
 })}
 </div>
 </div>
 </motion.div>
 </div>

 {/* ── Desktop: prominent Update Profile button ───────────────────────── */}
 <div className="hidden sm:flex justify-end pb-24">
 <motion.button
 whileHover={{ y: -1 }}
 whileTap={{ scale: 0.97 }}
 onClick={openDrawer}
 className="inline-flex items-center gap-2 px-5 py-3 text-sm font-bold
 bg-emerald-600 text-white rounded-2xl hover:bg-emerald-700
 shadow-lg transition-colors"
 >
 <Pencil className="w-4 h-4" />
 Update Profile
 </motion.button>
 </div>

 {/* ── Mobile: floating Update Profile button ─────────────────────────── */}
 <motion.button
 whileTap={{ scale: 0.95 }}
 onClick={openDrawer}
 className="sm:hidden fixed bottom-20 right-4 z-30 inline-flex items-center gap-2
 px-4 py-3 text-sm font-bold text-white
 bg-emerald-600 rounded-full
 shadow-lg hover:bg-emerald-700 transition-colors"
 >
 <Pencil className="w-4 h-4" />
 Update Profile
 </motion.button>

 {/* ── Edit Drawer ────────────────────────────────────────────────────── */}
 <Drawer
 open={drawerOpen}
 onClose={closeDrawer}
 title="Update Profile"
 subtitle="Edit your account information and security"
 >
 {/* Tab bar */}
 <div className="px-5 pt-4">
 <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-2xl">
 {drawerTabs.map((t) => {
 const Icon = t.icon;
 const active = drawerTab === t.id;
 return (
 <button
 key={t.id}
 onClick={() => { setDrawerTab(t.id); setError(""); }}
 className={cn(
 "relative flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl transition-all",
 active ? "text-white" : "text-gray-500 hover:text-gray-700"
 )}
 >
 {active && (
 <motion.div
 layoutId="drawerActiveTab"
 className="absolute inset-0 bg-emerald-600 rounded-xl shadow"
 transition={{ type: "spring", stiffness: 350, damping: 30 }}
 />
 )}
 <Icon className="w-3.5 h-3.5 relative z-10" />
 <span className="relative z-10">{t.label}</span>
 </button>
 );
 })}
 </div>
 </div>

 {/* Tab content */}
 <div className="p-5">
 <AnimatePresence mode="wait">
 {drawerTab === "account" ? (
 <motion.div
 key="account"
 initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }}
 transition={{ duration: 0.2 }}
 className="space-y-3"
 >
 {/* Profile picture */}
 <div className="flex items-center gap-4 p-3.5 bg-gray-50 rounded-2xl border border-gray-100">
 <div className="relative shrink-0">
 {picPreview ? (
 <img
 src={picPreview}
 alt={user?.name}
 className="w-16 h-16 rounded-2xl object-cover border-2 border-white shadow"
 />
 ) : (
 <div className="w-16 h-16 rounded-2xl bg-emerald-600 flex items-center justify-center text-white text-xl font-black border-2 border-white shadow">
 {user?.name?.charAt(0)?.toUpperCase() ?? "T"}
 </div>
 )}
 </div>
 <div className="flex-1 min-w-0">
 <p className="text-sm font-semibold text-gray-900">Profile Picture</p>
 <p className="text-[11px] text-gray-500 mt-0.5">PNG, JPG up to 2MB.</p>
 <div className="mt-2 flex items-center gap-2">
 <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold
 bg-emerald-600 text-white rounded-lg cursor-pointer
 hover:bg-emerald-700 transition-colors active:scale-95">
 <Camera className="w-3.5 h-3.5" />
 {picPreview ? "Change Photo" : "Upload Photo"}
 <input type="file" accept="image/*" className="hidden" onChange={handlePicFile} />
 </label>
 {picPreview && (
 <button
 type="button"
 onClick={() => { setPicPreview(null); setProfilePic(""); }}
 className="inline-flex items-center gap-1 px-3 py-1.5 text-[11px] font-semibold
 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors"
 >
 <X className="w-3 h-3" /> Remove
 </button>
 )}
 </div>
 </div>
 </div>

 <div>
 <label className={labelCls}>Display Name *</label>
 <div className="relative">
 <User className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
 <input
 value={name}
 onChange={(e) => setName(e.target.value)}
 className={cn(inputCls, "pl-9")}
 placeholder="Your full name"
 autoFocus
 />
 </div>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div>
 <label className={labelCls}>Phone</label>
 <div className="relative">
 <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
 <input
 value={phone}
 onChange={(e) => setPhone(e.target.value)}
 className={cn(inputCls, "pl-9")}
 placeholder="e.g. +919876543210"
 type="tel"
 inputMode="tel"
 />
 </div>
 </div>

 <div>
 <label className={labelCls}>Email</label>
 <div className="relative">
 <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
 <input
 value={email}
 onChange={(e) => setEmail(e.target.value)}
 className={cn(inputCls, "pl-9")}
 placeholder="you@email.com"
 type="email"
 />
 </div>
 </div>

 <div className="sm:col-span-2">
 <label className={labelCls}>MSR ID</label>
 <div className="relative">
 <Briefcase className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
 <input
 value={msrId}
 onChange={(e) => setMsrId(e.target.value)}
 className={cn(inputCls, "pl-9 font-mono")}
 placeholder="e.g. MSR-0001"
 />
 </div>
 </div>

 <div className="sm:col-span-2">
 <label className={labelCls}>Address</label>
 <div className="relative">
 <MapPin className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
 <textarea
 value={address}
 onChange={(e) => setAddress(e.target.value)}
 className={cn(inputCls, "pl-9 min-h-[72px] resize-none")}
 placeholder="House, street, city, state, pincode"
 rows={2}
 />
 </div>
 </div>
 </div>
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
 Leave blank if you don't want to change your password.
 </p>
 </div>

 <div>
 <label className={labelCls}>Current Password</label>
 <div className="relative">
 <input
 type={showCur ? "text" : "password"}
 value={currentPassword}
 onChange={(e) => setCurrentPassword(e.target.value)}
 className={cn(inputCls, "pr-10")}
 placeholder="Enter current password"
 />
 <button
 type="button"
 onClick={() => setShowCur((v) => !v)}
 className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
 >
 {showCur ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
 </button>
 </div>
 </div>

 <div>
 <label className={labelCls}>New Password</label>
 <div className="relative">
 <input
 type={showNew ? "text" : "password"}
 value={newPassword}
 onChange={(e) => setNewPassword(e.target.value)}
 className={cn(inputCls, "pr-10")}
 placeholder="Min 8 characters"
 />
 <button
 type="button"
 onClick={() => setShowNew((v) => !v)}
 className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
 >
 {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
 </button>
 </div>

 {newPassword && (
 <motion.div
 initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
 className="mt-2 overflow-hidden"
 >
 <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
 <motion.div
 initial={{ width: 0 }} animate={{ width: strengthMeta[strength].width }}
 className={cn("h-full transition-all duration-300", strengthMeta[strength].color)}
 />
 </div>
 <div className="flex items-center justify-between mt-1.5">
 <span className="text-[10px] font-semibold text-gray-500">
 Strength: <span className="text-gray-700">{strengthMeta[strength].label}</span>
 </span>
 </div>
 </motion.div>
 )}
 </div>

 <div>
 <label className={labelCls}>Confirm New Password</label>
 <div className="relative">
 <input
 type={showCon ? "text" : "password"}
 value={confirmPassword}
 onChange={(e) => setConfirmPassword(e.target.value)}
 className={cn(
 inputCls, "pr-10",
 pwMismatch && "border-rose-300 focus:ring-rose-300/60 focus:border-rose-400"
 )}
 placeholder="Repeat new password"
 />
 <button
 type="button"
 onClick={() => setShowCon((v) => !v)}
 className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
 >
 {showCon ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
 </button>
 </div>
 {pwMismatch && (
 <p className="text-[10px] text-rose-600 font-semibold mt-1.5 flex items-center gap-1">
 <AlertCircle className="w-3 h-3" /> Passwords do not match
 </p>
 )}
 {confirmPassword && !pwMismatch && (
 <p className="text-[10px] text-emerald-600 font-semibold mt-1.5 flex items-center gap-1">
 <CheckCircle className="w-3 h-3" /> Passwords match
 </p>
 )}
 </div>

 {/* Security checklist */}
 <div className="pt-2 border-t border-gray-100">
 <p className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold mb-2">Password rules</p>
 <ul className="grid grid-cols-2 gap-1.5">
 {[
 { label: "8+ characters", done: newPassword.length >= 8 },
 { label: "Upper & lower", done: /[a-z]/.test(newPassword) && /[A-Z]/.test(newPassword) },
 { label: "Has number", done: /[0-9]/.test(newPassword) },
 { label: "Has symbol", done: /[^A-Za-z0-9]/.test(newPassword) },
 ].map((c) => (
 <li key={c.label} className="flex items-center gap-1.5 text-[11px]">
 {c.done ? (
 <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
 ) : (
 <Circle className="w-3.5 h-3.5 text-gray-300 shrink-0" />
 )}
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

 {/* Error inline */}
 {error && (
 <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-700">
 <AlertCircle className="w-4 h-4 shrink-0" /> {error}
 </div>
 )}
 </div>

 {/* Drawer footer with prominent Update Profile button */}
 <div className="border-t border-gray-100 p-4 bg-gray-50/60 backdrop-blur-sm flex items-center gap-2">
 <button
 onClick={closeDrawer}
 disabled={saving}
 className="px-4 py-3 text-sm font-semibold border border-gray-200 rounded-2xl
 text-gray-600 bg-white hover:bg-gray-50 transition-all active:scale-95
 disabled:opacity-50"
 >
 Cancel
 </button>
 <button
 onClick={handleSave}
 disabled={saving}
 className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-bold
 bg-emerald-600 text-white rounded-2xl hover:bg-emerald-700
 shadow-lg transition-colors active:scale-[0.98] disabled:opacity-60"
 >
 {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Pencil className="w-4 h-4" />}
 {saving ? "Updating…" : "Update Profile"}
 </button>
 </div>
 </Drawer>
 </DashboardLayout>
 );
}
