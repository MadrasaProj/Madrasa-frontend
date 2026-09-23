import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Swiper, SwiperSlide } from "swiper/react";
import type { Swiper as SwiperInstance } from "swiper";
import "swiper/css";
import { GraduationCap, Users, LogOut, Shield, Building2 } from "lucide-react";
import { useAuthStore, getStoredSessionsSync, storageKeyForRole, type UserRole } from "@/store/auth";
import { roleHomePath } from "@/lib/tenant-routing";
import { Button } from "@/components/ui/button";
import OnboardingDrawer from "@/components/twa/OnboardingDrawer";

type LandingRole = "parent" | "teacher" | "admin";

const onboardingSlides = [
  {
    eyebrow: "Welcome to Smart Madrasa",
    title: "One place for your whole madrasa",
    description:
      "Connect management, teachers, students, and parents with one simple system built for better learning.",
    image: "/imgs/onboarding/1.png",
    alt: "Madrasa community",
  },
  {
    eyebrow: "Stay connected to learning",
    title: "Make every ibada count",
    description:
      "Track ibada gently and consistently, helping students build meaningful daily habits with support from their madrasa and family.",
    image: "/imgs/onboarding/2.png",
    alt: "Quran and prayer beads",
  },
  {
    eyebrow: "Plan. Conduct. Improve.",
    title: "Exams made simple",
    description:
      "Create exams, manage results, and understand progress clearly—so teachers can focus on helping every student grow.",
    image: "/imgs/onboarding/3.png",
    alt: "Exam papers and pencil",
  },
] as const;

import {
  clearTenantSlug,
  getTenantSlugAsync,
  getTenantSlugSync,
  saveTenantSlug,
} from "@/lib/slug-storage";

const roleMeta: Record<UserRole, { label: string; icon: typeof Shield; color: string }> = {
  admin: { label: "Admin", icon: Shield, color: "bg-slate-600" },
  teacher: { label: "Teacher", icon: GraduationCap, color: "bg-emerald-600" },
  parent: { label: "Parent", icon: Users, color: "bg-blue-600" },
  committee: { label: "Committee", icon: Building2, color: "bg-amber-600" },
};

function SessionsList() {
  const navigate = useNavigate();
  const { hasHydrated, logout, sessions } = useAuthStore();
  const [refreshKey, setRefreshKey] = useState(0);

  const stored = hasHydrated ? getStoredSessionsSync() : [];

  const items = stored.map(({ role, payload }) => {
    const fullUser = (sessions as Record<string, unknown>)[role] as { name?: string; tenantSlug?: string; actorType?: string; photoUrl?: string | null } | undefined;
    const name = fullUser?.name ?? payload?.name ?? role;
    const slug = fullUser?.tenantSlug ?? (payload?.client as { slug?: string; subdomain?: string } | undefined)?.slug ?? (payload?.client as { subdomain?: string } | undefined)?.subdomain ?? "";
    const actor = fullUser?.actorType ?? (payload?.actorType as string) ?? (payload?.role as string) ?? "";
    return { role, name, slug, actor, tokenPayload: payload };
  });

  if (!hasHydrated) {
    return (
      <div className="mb-6 bg-white rounded-2xl border border-gray-100 p-4 text-center text-sm text-gray-400">
        Loading sessions...
      </div>
    );
  }

  if (items.length === 0) return null;

  const handleGo = (role: UserRole, slug: string, actor: string) => {
    const r = role as UserRole;
    const isSuperAdmin = actor === "SUPER_ADMIN";
    const tenantSlug = slug || undefined;
    navigate(roleHomePath({ role: r, actorType: actor as never, tenantSlug: isSuperAdmin ? undefined : tenantSlug }));
  };

  const handleLogout = (role: UserRole) => {
    logout(role);
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="mb-6 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <h2 className="text-sm font-bold text-gray-900">Signed in</h2>
        <span className="text-xs text-gray-400">{items.length} session{items.length !== 1 ? "s" : ""}</span>
      </div>
      <div className="divide-y divide-gray-50">
        {items.map(({ role, name, slug, actor }) => {
          const meta = roleMeta[role] ?? roleMeta.admin;
          const Icon = meta.icon;
          return (
            <div key={role} className="flex items-center gap-3 px-4 py-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 ${meta.color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-900 truncate">{name}</p>
                <p className="text-xs text-gray-500 truncate capitalize">{meta.label} {slug ? `· ${slug}` : actor === "SUPER_ADMIN" ? "· Platform" : ""}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => handleGo(role, slug, actor as string)}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors"
                >
                  Open
                </button>
                <button
                  onClick={() => handleLogout(role)}
                  title={`Sign out ${role}`}
                  className="p-1.5 rounded-lg bg-gray-50 border border-gray-200 text-gray-500 hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <div className="px-4 py-2 bg-gray-50/60 flex items-center justify-between">
        <button
          onClick={() => {
            for (const { role } of items) {
              localStorage.removeItem(storageKeyForRole(role));
            }
            window.location.reload();
          }}
          className="text-xs font-medium text-gray-500 hover:text-red-600"
        >
          Sign out all
        </button>
        <span className="text-[11px] text-gray-400">Sessions are stored per role</span>
      </div>
    </div>
  );
}

export default function TwaLandingPage() {
  const navigate = useNavigate();
  const { hasHydrated, sessions } = useAuthStore();

  const [role, setRole] = useState<LandingRole | null>(null);
  const [slug, setSlug] = useState("");
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const [onboardingSwiper, setOnboardingSwiper] = useState<SwiperInstance | null>(null);

  useEffect(() => {
    if (!hasHydrated) return;

    // 1. If exactly one session exists, auto-open it directly!
    const stored = getStoredSessionsSync();
    if (stored.length === 1) {
      const single = stored[0];
      const fullUser = (sessions as Record<string, unknown>)[single.role] as
        | { tenantSlug?: string; actorType?: string }
        | undefined;
      const targetSlug =
        fullUser?.tenantSlug ??
        single.payload?.client?.slug ??
        single.payload?.client?.subdomain ??
        "";
      const targetActor =
        fullUser?.actorType ??
        single.payload?.actorType ??
        single.payload?.role ??
        "";
      const isSuperAdmin = targetActor === "SUPER_ADMIN";
      navigate(
        roleHomePath({
          role: single.role,
          actorType: targetActor as never,
          tenantSlug: isSuperAdmin ? undefined : targetSlug || undefined,
        }),
        { replace: true }
      );
      return;
    }

    // 2. Synchronous check for remembered slug + role (localStorage + Cookie)
    const syncPrefs = getTenantSlugSync();
    if (syncPrefs.slug) {
      setSlug(syncPrefs.slug);
      if (syncPrefs.role === "parent" || syncPrefs.role === "teacher") {
        setRole(syncPrefs.role);
      }
    }

    // 3. Asynchronous fallback check (IndexedDB) in case localStorage was evicted
    void getTenantSlugAsync().then((asyncPrefs) => {
      if (asyncPrefs.slug) {
        setSlug((prev) => prev || asyncPrefs.slug);
        if (asyncPrefs.role === "parent" || asyncPrefs.role === "teacher") {
          const matchedRole: LandingRole = asyncPrefs.role;
          setRole((prev) => prev ?? matchedRole);
        }
      }
    });

    // 4. If in standalone PWA mode and slug + role are remembered with no sessions, auto-redirect directly to role page/login!
    const isStandalone =
      typeof window !== "undefined" &&
      (window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true);

    if (isStandalone && syncPrefs.slug && (syncPrefs.role === "parent" || syncPrefs.role === "teacher")) {
      navigate(`/m/${syncPrefs.slug}/${syncPrefs.role}`, { replace: true });
    }
  }, [hasHydrated, sessions, navigate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!role || !slug.trim()) return;
    const normalizedSlug = slug.trim().toLowerCase();
    saveTenantSlug(normalizedSlug, role);
    navigate(`/m/${normalizedSlug}/${role}`);
  };

  const handleClearSlug = () => {
    clearTenantSlug();
    setSlug("");
    setRole(null);
  };

  
    const isLastSlide = onboardingStep === onboardingSlides.length - 1;

    return (
      <main className="relative min-h-[100dvh] overflow-hidden bg-[#f8fbf7] text-slate-900">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            backgroundImage:
              "linear-gradient(rgba(16, 111, 76, 0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(16, 111, 76, 0.08) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
        <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-md flex-col   pb-7 pt-8 sm:px-8">
          <div className="flex justify-end">
           </div>

          <Swiper
          autoplay
            onSwiper={setOnboardingSwiper}
            onSlideChange={(swiper) => setOnboardingStep(swiper.activeIndex)}
            // spaceBetween={28}
            slidesPerView={1}
            className="flex w-full flex-1 !overflow-visible !px-2"
            allowTouchMove
            resistanceRatio={1}
          >
            {onboardingSlides.map((item) => (
              <SwiperSlide key={item.title} className="!flex flex-col px-6 items-center justify-center px-2 text-center">
                <div className="mb-3 flex h-[min(48vh,530px)] w-full items-center justify-center">
                  <img src={item.image} alt={item.alt} className="max-h-full mt-auto  w-full object-contain drop-shadow-[0_18px_18px_rgba(14,78,54,0.12)]" />
                </div>
                <div className="mb-5 flex h-14 w-14 items-center justify-center ">
                  <img src="/icons/icon.svg" alt="Smart Madrasa" className="h-10 w-10  " />
                </div>
                {/* <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">{item.eyebrow}</p> */}
                <h1 className="max-w-sm bg-gradient-to-r from-emerald-800 via-emerald-600 to-emerald-900 bg-clip-text text-[2.5rem] font-semibold leading-[1.06] tracking-[-0.045em] text-transparent">{item.title}</h1>
                <p className="mt-4 max-w-sm text-sm leading-6 text-slate-600">{item.description}</p>
              </SwiperSlide>
            ))}
          </Swiper>

          <div className="space-y-5 px-6">
            <div className="flex justify-center gap-2" aria-label="Onboarding progress">
              {onboardingSlides.map((item, index) => (
                <button
                  key={item.title}
                  type="button"
                  aria-label={`Go to slide ${index + 1}`}
                  onClick={() => onboardingSwiper?.slideTo(index)}
                  className={`h-1.5 rounded-full transition-all ${index === onboardingStep ? "w-8 bg-emerald-700" : "w-1.5 bg-emerald-700/20"}`}
                />
              ))}
            </div>
            <Button
              type="button"
              onClick={() => (  setHasStarted(true)  )}
              className="h-auto w-full rounded-2xl px-5 py-4 text-sm font-bold shadow-[0_10px_24px_rgba(16,111,76,0.22)] active:scale-[0.99]"
            >
              Get started
             </Button>
          </div>
        </div>
     <OnboardingDrawer open={hasStarted} onOpenChange={setHasStarted} role={role} setRole={setRole} slug={slug} setSlug={setSlug} onSubmit={handleSubmit} onClearSlug={handleClearSlug} sessionsContent={<SessionsList />} />;

     
      </main>
    );
   

  }
