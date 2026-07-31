import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { GraduationCap, Users, ArrowRight } from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { roleHomePath } from "@/lib/tenant-routing";
import PwaInstallButton from "@/components/PwaInstallButton";

type LandingRole = "parent" | "teacher";

const TWA_PREFS_KEY = "twa-landing-prefs";

function loadPrefs(): { role: LandingRole | null; slug: string } {
 try {
 const raw = localStorage.getItem(TWA_PREFS_KEY);
 if (!raw) return { role: null, slug: "" };
 const parsed = JSON.parse(raw);
 return {
 role: parsed.role === "parent" || parsed.role === "teacher" ? parsed.role : null,
 slug: typeof parsed.slug === "string" ? parsed.slug : "",
 };
 } catch {
 return { role: null, slug: "" };
 }
}

function savePrefs(role: LandingRole, slug: string) {
 localStorage.setItem(TWA_PREFS_KEY, JSON.stringify({ role, slug }));
}

export default function TwaLandingPage() {
 const navigate = useNavigate();
 const { isLoggedIn, user, hasHydrated } = useAuthStore();

 const [role, setRole] = useState<LandingRole | null>(null);
 const [slug, setSlug] = useState("");

 useEffect(() => {
 if (!hasHydrated) return;
 if (isLoggedIn && user) {
 navigate(
 roleHomePath({
 role: user.role,
 actorType: user.actorType,
 tenantSlug: user.tenantSlug,
 }),
 { replace: true },
 );
 return;
 }
 const prefs = loadPrefs();
 if (prefs.role) setRole(prefs.role);
 if (prefs.slug) setSlug(prefs.slug);
 }, [hasHydrated, isLoggedIn, user, navigate]);

 const handleSubmit = (e: React.FormEvent) => {
 e.preventDefault();
 if (!role || !slug.trim()) return;
 const normalizedSlug = slug.trim().toLowerCase();
 savePrefs(role, normalizedSlug);
  navigate(`/m/${normalizedSlug}/${role}`);
 };

 return (
 <div className="min-h-[100dvh] bg-[#faf9f6] flex flex-col items-center justify-center p-4">
 <motion.div
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ duration: 0.35 }}
 className="w-full max-w-md"
 >
  <div className="text-center mb-8">
  <img src="/icons/icon.svg" alt="Smart Madrasa" className="inline-block w-16 h-16 mb-4 shadow-lg rounded-2xl" />
 <h1 className="text-2xl font-bold text-gray-900">Madrasa Portal</h1>
 <p className="text-gray-500 text-sm mt-1">
 Select your role to continue
 </p>
 </div>

 <form onSubmit={handleSubmit} className="space-y-5">
 <div className="grid grid-cols-2 gap-3">
 <button
 type="button"
 onClick={() => setRole("parent")}
 className={`flex flex-col items-center gap-2 p-5 rounded-2xl border-2 transition-all ${
 role === "parent"
 ? "border-emerald-500 bg-emerald-50 shadow-sm"
 : "border-gray-200 bg-white hover:border-gray-300"
 }`}
 >
 <div
 className={`w-12 h-12 rounded-xl flex items-center justify-center ${
 role === "parent"
 ? "bg-emerald-600 text-white"
 : "bg-gray-100 text-gray-500"
 }`}
 >
 <Users className="w-6 h-6" />
 </div>
 <span
 className={`text-sm font-semibold ${
 role === "parent" ? "text-emerald-800" : "text-gray-700"
 }`}
 >
 Parent
 </span>
 </button>

 <button
 type="button"
 onClick={() => setRole("teacher")}
 className={`flex flex-col items-center gap-2 p-5 rounded-2xl border-2 transition-all ${
 role === "teacher"
 ? "border-emerald-500 bg-emerald-50 shadow-sm"
 : "border-gray-200 bg-white hover:border-gray-300"
 }`}
 >
 <div
 className={`w-12 h-12 rounded-xl flex items-center justify-center ${
 role === "teacher"
 ? "bg-emerald-600 text-white"
 : "bg-gray-100 text-gray-500"
 }`}
 >
 <GraduationCap className="w-6 h-6" />
 </div>
 <span
 className={`text-sm font-semibold ${
 role === "teacher" ? "text-emerald-800" : "text-gray-700"
 }`}
 >
 Teacher
 </span>
 </button>
 </div>

 {role && (
 <motion.div
 initial={{ opacity: 0, height: 0 }}
 animate={{ opacity: 1, height: "auto" }}
 transition={{ duration: 0.2 }}
 >
 <label className="block text-sm font-medium text-gray-700 mb-1.5">
 Madrasa Slug
 </label>
 <input
 type="text"
 value={slug}
 onChange={(e) => setSlug(e.target.value)}
 placeholder="e.g. noorul-islam"
 className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-gray-900 text-sm"
 autoFocus
 required
 />
 <p className="text-xs text-gray-400 mt-1.5">
 Enter your madrasa's slug to proceed to login
 </p>
 </motion.div>
 )}

    {role && (
        <motion.button
          type="submit"
          disabled={!slug.trim()}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="w-full bg-emerald-600 text-white font-semibold py-3.5 rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
        >
          Continue to Login
          <ArrowRight className="w-4 h-4" />
        </motion.button>
      )}
    </form>

      <div className="mt-6 text-center">
        <PwaInstallButton />
      </div>
    </motion.div>
    </div>
 );
}
