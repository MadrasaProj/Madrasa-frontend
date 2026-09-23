import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Building2,
  GraduationCap,
  Eye,
  EyeOff,
  Shield,
  Smartphone,
  Users,
} from "lucide-react";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AuthApiError,
  loginCommittee,
  loginMadrasa,
  loginParent,
  loginSuperAdmin,
  loginTeacher,
} from "@/lib/auth-api";
import { roleHomePath } from "@/lib/tenant-routing";
import { getTenantSlugSync, saveTenantSlug } from "@/lib/slug-storage";
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
    title: "Welcome, Super Admin",
    subtitle: "Platform-level secure access",
    icon: Shield,
    image: "/imgs/onboarding/admin_ico.png",
  },
  CLIENT_ADMIN: {
    title: "Welcome, Admin",
    subtitle: "Manage your institution operations",
    icon: Building2,
    image: "/imgs/onboarding/admin_ico.png",
  },
  TEACHER: {
    title: "Welcome, Teacher",
    subtitle: "Access attendance, homework, and class tools",
    icon: GraduationCap,
    image: "/imgs/onboarding/teacher_ico.png",
  },
  PARENT: {
    title: "Welcome, Parent",
    subtitle: "Track your child progress and updates",
    icon: Users,
    image: "/imgs/onboarding/parent_ico.png",
  },
  COMMITTEE: {
    title: "Welcome, Committee Member",
    subtitle: "View reports, finances, and send announcements",
    icon: Users,
    image: "/imgs/onboarding/admin_ico.png",
  },
} satisfies Record<
  LoginType,
  { title: string; subtitle: string; icon: typeof Shield; image: string }
>;

const validatePasswordStrength = (
  password: string,
  phone?: string,
  dob?: string,
): string | null => {
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
    "password",
    "123456",
    "12345678",
    "123456789",
    "qwerty",
    "123123",
    "111111",
    "password123",
    "admin123",
    "madrasa",
    "madrasa123",
    "welcome",
    "letmein",
    "school123",
    "parent123",
    "student123",
    "pass123",
    "user123",
    "changekey",
  ];

  const isWeak = WEAK_PASSWORDS.some((weak) => normalized.includes(weak));
  if (isWeak) {
    return "Password is too common or easy to guess. Please choose a stronger password.";
  }

  if (phone) {
    const cleanPhone = phone.replace(/\+/g, "").trim();
    if (
      cleanPhone.length >= 4 &&
      normalized.includes(cleanPhone.toLowerCase())
    ) {
      return "Password must not contain your phone number.";
    }
  }

  if (dob) {
    const cleanDob = dob.trim().toLowerCase();
    if (cleanDob.length >= 6 && normalized.includes(cleanDob)) {
      return "Password must not contain your date of birth.";
    }
  }

  return null;
};

export default function RoleLoginPage({
  type,
  tenantSlug,
}: RoleLoginPageProps) {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const { lang } = useLanguageStore();
  const [searchParams] = useSearchParams();

  const queryEmail = searchParams.get("email") ?? "";
  const queryPassword = searchParams.get("password") ?? "";
  const queryPhone = searchParams.get("phone") ?? "";
  const querySlug = searchParams.get("slug") ?? "";

  const [identifier, setIdentifier] = useState(queryEmail);
  const [password, setPassword] = useState(queryPassword);
  const [parentPhone, setParentPhone] = useState(queryPhone);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const [mustSetPassword, setMustSetPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const meta = useMemo(() => metaByType[type], [type]);
  const isTenantRole = type !== "SUPER_ADMIN";
  const madrasaName = tenantSlug
    ? tenantSlug.replace(/[-_]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase())
    : type === "SUPER_ADMIN"
      ? "Smart Madrasa Platform"
      : "Smart Madrasa";

  const getLocalizedError = (
    error: unknown,
    fallbackKey: "otpRequestFailed" | "signInFailed",
  ) => {
    if (error instanceof AuthApiError) {
      // Do not reveal whether slug, user, or students exist to attackers
      if (
        error.statusCode === 401 ||
        error.statusCode === 404 ||
        error.statusCode === 403 ||
        error.code === "AUTH_INVALID_CREDENTIALS" ||
        error.code === "AUTH_MADRASA_NOT_FOUND" ||
        error.code === "AUTH_MADRASA_LOGIN_DISABLED" ||
        error.code === "AUTH_STUDENTS_NOT_FOUND_FOR_PARENT"
      ) {
        return t("authErrors", "invalidCredentials", lang);
      }

      const codeMap: Record<
        string,
        keyof (typeof import("@/lib/i18n").translations)["authErrors"]
      > = {
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
      const lower = error.message.toLowerCase();
      if (
        lower.includes("not found") ||
        lower.includes("does not exist") ||
        lower.includes("disabled") ||
        lower.includes("invalid") ||
        lower.includes("credential") ||
        lower.includes("unauthorized")
      ) {
        return t("authErrors", "invalidCredentials", lang);
      }
      return error.message;
    }

    return t("authErrors", fallbackKey, lang);
  };

  const requireTenantSlug = () => {
    if (!isTenantRole) return undefined;
    const slug = (tenantSlug ?? querySlug ?? getTenantSlugSync().slug).trim().toLowerCase();
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
        setError(
          "Please enter a valid phone number (digits and optional + prefix only, 7-15 digits)",
        );
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
        if (mustSetPassword) {
          const strengthError = validatePasswordStrength(
            newPassword.trim(),
            parentPhone,
            password,
          );
          if (strengthError) {
            setError(strengthError);
            setLoading(false);
            return;
          }
          if (newPassword !== confirmNewPassword) {
            setError("Passwords do not match.");
            setLoading(false);
            return;
          }
          session = await loginParent(slug!, parentPhone.trim(), {
            password,
            newPassword: newPassword.trim(),
          });
        } else {
          session = await loginParent(slug!, parentPhone.trim(), { password });
          if (session && (session as any).mustSetPassword) {
            setMustSetPassword(true);
            setInfo(
              "Parent account found without password. Please set a new secure password to proceed.",
            );
            setLoading(false);
            return;
          }
        }
      }

      const normalized = normalizeUserSession(
        session as import("@/store/auth").AuthSessionPayload,
      );
      const finalSlug = normalized.user.tenantSlug || tenantSlug || requireTenantSlug();
      if (finalSlug) {
        normalized.user.tenantSlug = finalSlug;
        saveTenantSlug(finalSlug, normalized.user.role);
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
    <div className="relative flex min-h-[100dvh] flex-col items-center justify-center overflow-x-hidden bg-[#f8fbf7] px-5 py-10">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          backgroundImage:
            "linear-gradient(rgba(16, 111, 76, 0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(16, 111, 76, 0.08) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />
      <div aria-hidden="true" className="pointer-events-none absolute -left-28 -top-28 h-72 w-72 rounded-full bg-emerald-200/30 blur-3xl" />
      {/* <div aria-hidden="true" className="pointer-events-none absolute -bottom-32 -right-24 h-80 w-80 rounded-full bg-teal-200/30 blur-3xl" /> */}
      <div className="fixed top-4 right-4 z-50">
        <LanguageSwitcher />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="mb-7 text-center">
          <img src={meta.image} alt="" className="mx-auto mt-4 h-66 w-66 object-contain " />
          {/* <button type="button" className="mx-auto mt-3 flex min-h-14 w-full max-w-xs items-center justify-center gap-3 rounded-2xl border border-white/80 bg-gradient-to-br from-white via-emerald-50/80 to-teal-100/70 px-5 py-3 text-emerald-950 shadow-[8px_8px_18px_rgba(15,67,45,0.13),-7px_-7px_16px_rgba(255,255,255,0.95),inset_1px_1px_2px_rgba(255,255,255,0.9)] transition-transform active:scale-[0.98]">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/80 shadow-[inset_1px_1px_2px_rgba(255,255,255,1),2px_3px_8px_rgba(15,67,45,0.12)]">
              <img src="/imgs/onboarding/logo.svg" alt="" className="h-5 w-6 object-contain" />
            </span>
          
          </button> */}

            <h1 className=" text-[1.8rem] font-semibold leading-tight tracking-[-0.04em] ">{meta.title} to <br/>  <span className="bg-gradient-to-r text-transparent text-[2.3rem] from-[#059669] to-[#0d9488] bg-clip-text font-black italic">{madrasaName}</span></h1>
          <p className="mx-auto mt-0 max-w-xs text-sm leading-6 text-slate-500">{meta.subtitle}</p>
        
        </div>

<div className="h-[170px]"></div>
        <div style={{boxShadow:'#dcf2ec 0px -5px 32px -6px'}} className="  bg-white p-6 py-10 fixed bottom-0 left-0 w-full rounded-t-4xl  ">
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
                <Input
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
                <Input
                  type="tel"
                  value={parentPhone}
                  onChange={(e) => setParentPhone(e.target.value)}
                  placeholder="9876543210"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-gray-900 text-sm disabled:opacity-60"
                  required
                  disabled={mustSetPassword}
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                {type === "PARENT" && mustSetPassword
                  ? "Temporary Password"
                  : t("login", "password", lang)}
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t("login", "enterPassword", lang)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-gray-900 text-sm pr-12 disabled:opacity-60"
                  required
                  disabled={mustSetPassword}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                  disabled={mustSetPassword}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {mustSetPassword && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    New Password
                  </label>
                  <div className="relative">
                    <Input
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password (min 6 characters)"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-gray-900 text-sm pr-12"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                    >
                      {showNewPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <Input
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      placeholder="Confirm new password"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-gray-900 text-sm pr-12"
                      required
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="text-right">
                  <button
                    type="button"
                    onClick={() => {
                      setMustSetPassword(false);
                      setNewPassword("");
                      setConfirmNewPassword("");
                      setInfo("");
                      setError("");
                    }}
                    className="text-xs text-emerald-600 hover:underline"
                  >
                    Cancel & Edit Details
                  </button>
                </div>
              </>
            )}

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

            <Button
              type="submit"
              disabled={loading}
              className="h-auto w-full rounded-xl  py-3.5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(5,150,105,0.2)] hover:from-emerald-700 hover:to-teal-700 disabled:opacity-70"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  {t("login", "signingIn", lang)}
                </>
              ) : (
                <>
                   {mustSetPassword
                    ? "Set Password & Sign In"
                    : " Sign In"}
                </>
              )}
            </Button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
