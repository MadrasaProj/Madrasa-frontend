import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
 BookMarked,
 Building2,
 GraduationCap,
 Eye,
 EyeOff,
 Shield,
 Smartphone,
 Users,
} from "lucide-react";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import {
 AuthApiError,
 loginCommittee,
 loginMadrasa,
 loginParent,
 loginSuperAdmin,
 loginTeacher,
} from "@/lib/auth-api";
import { roleHomePath } from "@/lib/tenant-routing";
import { normalizeUserSession, useAuthStore } from "@/store/auth";
import { useLanguageStore } from "@/store/language";
import { t } from "@/lib/i18n";

type LoginType =
 | "SUPER_ADMIN"
 | "CLIENT_ADMIN"
 | "TEACHER"
 | "PARENT"
 | "COMMITTEE";

type RoleLoginPageProps = {
 type: LoginType;
 tenantSlug?: string;
};

const metaByType = {
 SUPER_ADMIN: {
 title: "Super Admin Sign In",
 subtitle: "Platform-level secure access",
 icon: Shield,
 },
 CLIENT_ADMIN: {
 title: "Madrasa Admin Sign In",
 subtitle: "Manage your institution operations",
 icon: Building2,
 },
 TEACHER: {
 title: "Teacher Sign In",
 subtitle: "Access attendance, homework, and class tools",
 icon: GraduationCap,
 },
 PARENT: {
 title: "Parent Sign In",
 subtitle: "Track your child progress and updates",
 icon: Users,
 },
 COMMITTEE: {
 title: "Committee Sign In",
 subtitle: "View reports, finances, and send announcements",
 icon: Users,
 },
} satisfies Record<
 LoginType,
 { title: string; subtitle: string; icon: typeof Shield }
>;

export default function RoleLoginPage({
 type,
 tenantSlug,
}: RoleLoginPageProps) {
 const navigate = useNavigate();
 const { login } = useAuthStore();
 const { lang } = useLanguageStore();

 const [identifier, setIdentifier] = useState("");
 const [password, setPassword] = useState("");
 const [parentPhone, setParentPhone] = useState("");
 const [showPassword, setShowPassword] = useState(false);
 const [loading, setLoading] = useState(false);
 const [error, setError] = useState("");
 const [info, setInfo] = useState("");

 const meta = useMemo(() => metaByType[type], [type]);
 const Icon = meta.icon;
 const isTenantRole = type !== "SUPER_ADMIN";

 const getLocalizedError = (
 error: unknown,
 fallbackKey: "otpRequestFailed" | "signInFailed",
 ) => {
 if (error instanceof AuthApiError) {
 const codeMap: Record<
 string,
 keyof (typeof import("@/lib/i18n").translations)["authErrors"]
 > = {
 AUTH_INVALID_CREDENTIALS: "invalidCredentials",
 AUTH_MADRASA_NOT_FOUND: "madrasaNotFound",
 AUTH_MADRASA_LOGIN_DISABLED: "madrasaLoginDisabled",
 AUTH_STUDENTS_NOT_FOUND_FOR_PARENT: "studentsNotFoundForParent",
 AUTH_BACKEND_SCHEMA_MISMATCH: "backendSchemaMismatch",
 AUTH_DB_UNAVAILABLE: "dbUnavailable",
 AUTH_SERVICE_UNAVAILABLE: "dbUnavailable",
 DB_QUERY_ERROR: "dbUnavailable",
 DB_VALIDATION_ERROR: "requestValidationFailed",
 DB_CONFLICT: "requestValidationFailed",
 UNHANDLED_ERROR: "unexpected",
 };

 const translationKey = (error.code && codeMap[error.code]) || fallbackKey;
 return t("authErrors", translationKey, lang);
 }

 if (error instanceof Error && error.message) {
 return error.message;
 }

 return t("authErrors", fallbackKey, lang);
 };

 const requireTenantSlug = () => {
 if (!isTenantRole) return undefined;
 const slug = tenantSlug?.trim().toLowerCase();
 if (!slug) throw new Error(t("authErrors", "tenantUrlMissing", lang));
 return slug;
 };

 const handleLogin = async (e: React.FormEvent) => {
 e.preventDefault();
 setError("");
 setInfo("");

 // Client-side validations
 if (type === "PARENT") {
 const phoneRegex = /^\+?[0-9]{7,15}$/;
 const trimmedPhone = parentPhone.trim();
 if (!trimmedPhone) {
 setError(t("authErrors", "parentPhoneRequired", lang));
 return;
 }
 if (!phoneRegex.test(trimmedPhone)) {
 setError("Please enter a valid phone number (digits and optional + prefix only, 7-15 digits)");
 return;
 }
 } else if (type === "CLIENT_ADMIN") {
 const trimmedIdentifier = identifier.trim();
 const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
 const phoneRegex = /^\+?[0-9]{7,15}$/;
 
 const isEmail = emailRegex.test(trimmedIdentifier);
 const isPhone = phoneRegex.test(trimmedIdentifier);
 
 if (!isEmail && !isPhone) {
 setError("Please enter a valid email address or phone number");
 return;
 }
 } else {
 // Teacher, Committee, Super Admin
 const trimmedIdentifier = identifier.trim();
 const identifierRegex = /^[a-zA-Z0-9._%+-@]+$/;
 if (!trimmedIdentifier) {
 setError("Identifier is required");
 return;
 }
 if (!identifierRegex.test(trimmedIdentifier)) {
 setError("Identifier contains invalid characters");
 return;
 }
 }

 setLoading(true);

 try {
 let session;

 if (type === "SUPER_ADMIN") {
 session = await loginSuperAdmin(identifier.trim(), password);
 } else if (type === "CLIENT_ADMIN") {
 const slug = requireTenantSlug();
 session = await loginMadrasa(identifier.trim(), slug!, password);
 } else if (type === "TEACHER") {
 const slug = requireTenantSlug();
 session = await loginTeacher(identifier.trim(), password, slug);
 } else if (type === "COMMITTEE") {
 const slug = requireTenantSlug();
 session = await loginCommittee(slug!, identifier.trim(), password);
 } else {
 const slug = requireTenantSlug();
 session = await loginParent(
 slug!,
 parentPhone.trim(),
 { password },
 );
 }

 const normalized = normalizeUserSession(
 session as import("@/store/auth").AuthSessionPayload,
 );
 if (!normalized.user.tenantSlug && tenantSlug) {
 normalized.user.tenantSlug = tenantSlug;
 }
 login(normalized);

 // Push token registration is handled by PwaRegister on auth state change
 // (single source of truth to avoid duplicate token registration).

 if (normalized.user.actorType === "SUPER_ADMIN") {
 navigate("/admin");
 return;
 }

 navigate(
 roleHomePath({
 role: normalized.user.role,
 actorType: normalized.user.actorType,
 tenantSlug: normalized.user.tenantSlug,
 }),
 );
 } catch (e: unknown) {
 setError(getLocalizedError(e, "signInFailed"));
 } finally {
 setLoading(false);
 }
 };

 return (
 <div className="min-h-[100dvh] bg-[#faf9f6] flex flex-col items-center justify-center p-4">
 <div className="fixed top-4 right-4 z-50">
 <LanguageSwitcher />
 </div>

 <motion.div
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ duration: 0.35 }}
 className="w-full max-w-md"
 >
 <div className="text-center mb-6">
 <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-600 rounded-2xl mb-4 shadow-lg">
 <BookMarked className="w-8 h-8 text-white" />
 </div>
 <h1 className="text-2xl font-bold text-gray-900">{meta.title}</h1>
 <p className="text-gray-500 text-sm mt-1">{meta.subtitle}</p>
 {isTenantRole && tenantSlug && (
 <p className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full">
 <Icon className="w-3.5 h-3.5" /> {tenantSlug}
 </p>
 )}
 </div>

 <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
 <form onSubmit={handleLogin} className="space-y-4">
 {type !== "PARENT" && (
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1.5">
 {type === "SUPER_ADMIN"
 ? "Admin Identifier"
 : type === "CLIENT_ADMIN"
 ? "Email or Phone"
 : type === "COMMITTEE"
 ? "Committee Username"
 : "Teacher Username"}
 </label>
 <input
 type="text"
 value={identifier}
 onChange={(e) => setIdentifier(e.target.value)}
 placeholder={
 type === "CLIENT_ADMIN"
 ? "admin@example.com or 9876543210"
 : "Enter your identifier"
 }
 className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-gray-900 text-sm"
 required
 />
 </div>
 )}

 {type === "PARENT" && (
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1.5">
 Parent Phone
 </label>
 <input
 type="tel"
 value={parentPhone}
 onChange={(e) => setParentPhone(e.target.value)}
 placeholder="9876543210"
 className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-gray-900 text-sm"
 required
 />
 </div>
 )}

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1.5">
 {t("login", "password", lang)}
 </label>
 <div className="relative">
 <input
 type={showPassword ? "text" : "password"}
 value={password}
 onChange={(e) => setPassword(e.target.value)}
 placeholder={t("login", "enterPassword", lang)}
 className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-gray-900 text-sm pr-12"
 required
 />
 <button
 type="button"
 onClick={() => setShowPassword(!showPassword)}
 className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
 >
 {showPassword ? (
 <EyeOff className="w-5 h-5" />
 ) : (
 <Eye className="w-5 h-5" />
 )}
 </button>
 </div>
 </div>

 {error && (
 <motion.p
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3"
 >
 {error}
 </motion.p>
 )}

 {info && (
 <motion.p
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 className="text-sm text-emerald-700 bg-emerald-50 rounded-xl px-4 py-3"
 >
 {info}
 </motion.p>
 )}

 <button
 type="submit"
 disabled={loading}
 className="w-full bg-emerald-600 text-white font-semibold py-3.5 rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-70 flex items-center justify-center gap-2 text-sm"
 >
 {loading ? (
 <>
 <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
 {t("login", "signingIn", lang)}
 </>
 ) : (
 <>
 <Smartphone className="w-4 h-4" /> Secure Sign In
 </>
 )}
 </button>
 </form>
 </div>
 </motion.div>
 </div>
 );
}
