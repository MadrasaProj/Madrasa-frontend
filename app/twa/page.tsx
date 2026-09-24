import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Swiper, SwiperSlide } from "swiper/react";
import type { Swiper as SwiperInstance } from "swiper";
import "swiper/css";
import { Building2, ChevronRight, GraduationCap, Plus, Shield, Users } from "lucide-react";
import OnboardingDrawer from "@/components/twa/OnboardingDrawer";
import { Button } from "@/components/ui/button";
import { roleHomePath } from "@/lib/tenant-routing";
import { clearTenantSlug, getTenantSlugAsync, getTenantSlugSync, saveTenantSlug } from "@/lib/slug-storage";
import { getStoredSessionsSync, useAuthStore, type UserRole } from "@/store/auth";

type LandingRole = "parent" | "teacher" | "admin";

const onboardingSlides = [
  { title: "One place for your whole madrasa", description: "Connect management, teachers, students, and parents with one simple system built for better learning.", image: "/imgs/onboarding/1.png", alt: "Madrasa community" },
  { title: "Make every ibada count", description: "Track ibada consistently and help students build meaningful daily habits with support from their madrasa and family.", image: "/imgs/onboarding/2.png", alt: "Quran and prayer beads" },
  { title: "Exams made simple", description: "Create exams, manage results, and understand progress clearly so teachers can help every student grow.", image: "/imgs/onboarding/3.png", alt: "Exam papers and pencil" },
] as const;

const roleMeta: Record<UserRole, { label: string; icon: typeof Shield; color: string }> = {
  admin: { label: "Admin", icon: Shield, color: "text-emerald-700 bg-emerald-50" },
  teacher: { label: "Teacher", icon: GraduationCap, color: "text-teal-700 bg-teal-50" },
  parent: { label: "Parent", icon: Users, color: "text-blue-700 bg-blue-50" },
  committee: { label: "Committee", icon: Building2, color: "text-amber-700 bg-amber-50" },
};

const pagePattern = {
  backgroundImage: "linear-gradient(rgba(16, 111, 76, 0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(16, 111, 76, 0.08) 1px, transparent 1px)",
  backgroundSize: "32px 32px",
};

function SessionsList() {
  const navigate = useNavigate();
  const { hasHydrated, sessions } = useAuthStore();
  const stored = hasHydrated ? getStoredSessionsSync() : [];

  const items = stored.map(({ role, payload }) => {
    const fullUser = (sessions as Record<string, unknown>)[role] as { name?: string; tenantSlug?: string; actorType?: string } | undefined;
    const client = payload?.client as { slug?: string; subdomain?: string } | undefined;
    return {
      role,
      name: fullUser?.name ?? payload?.name ?? roleMeta[role]?.label ?? role,
      slug: fullUser?.tenantSlug ?? client?.slug ?? client?.subdomain ?? "",
      actor: fullUser?.actorType ?? (payload?.actorType as string) ?? (payload?.role as string) ?? "",
    };
  });

  const openSession = (role: UserRole, slug: string, actor: string) => {
    navigate(roleHomePath({ role, actorType: actor as never, tenantSlug: actor === "SUPER_ADMIN" ? undefined : slug || undefined }));
  };

  return (
    <div className="w-full">
      {items.map(({ role, name, slug, actor }) => {
        const meta = roleMeta[role] ?? roleMeta.admin;
        const Icon = meta.icon;
        return (
          <button key={role} type="button" onClick={() => openSession(role, slug, actor)} className="flex h-14 w-full items-center gap-3 border-b border-emerald-950/5 px-1 text-left transition-colors hover:bg-emerald-50/50">
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${meta.color}`}><Icon className="h-4 w-4" /></span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-slate-900">{name}</span>
              <span className="block truncate text-xs capitalize text-slate-500">{meta.label}{slug ? ` · ${slug}` : actor === "SUPER_ADMIN" ? " · Platform" : ""}</span>
            </span>
            <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" />
          </button>
        );
      })}
    </div>
  );
}

export default function TwaLandingPage() {
  const navigate = useNavigate();
  const { hasHydrated, sessions } = useAuthStore();
  const [role, setRole] = useState<LandingRole | null>(null);
  const [slug, setSlug] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [onboardingSwiper, setOnboardingSwiper] = useState<SwiperInstance | null>(null);

  const hasSessions = hasHydrated && getStoredSessionsSync().length > 0;

  useEffect(() => {
    if (!hasHydrated) return;

    const stored = getStoredSessionsSync();
    if (stored.length === 1) {
      const single = stored[0];
      const fullUser = (sessions as Record<string, unknown>)[single.role] as
        | { tenantSlug?: string; actorType?: string }
        | undefined;
      const client = single.payload?.client as
        | { slug?: string; subdomain?: string }
        | undefined;
      const actor =
        fullUser?.actorType ??
        (single.payload?.actorType as string) ??
        (single.payload?.role as string) ??
        "";
      const sessionSlug =
        fullUser?.tenantSlug ?? client?.slug ?? client?.subdomain ?? "";

      navigate(
        roleHomePath({
          role: single.role,
          actorType: actor as never,
          tenantSlug:
            actor === "SUPER_ADMIN" ? undefined : sessionSlug || undefined,
        }),
        { replace: true },
      );
      return;
    }

    const syncPrefs = getTenantSlugSync();
    if (syncPrefs.slug) setSlug(syncPrefs.slug);
    if (syncPrefs.role === "parent" || syncPrefs.role === "teacher" || syncPrefs.role === "admin") setRole(syncPrefs.role);

    void getTenantSlugAsync().then((prefs) => {
      if (prefs.slug) setSlug((current) => current || prefs.slug);
      if (prefs.role === "parent" || prefs.role === "teacher" || prefs.role === "admin") setRole((current) => current ?? prefs.role as LandingRole);
    });
  }, [hasHydrated, sessions]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
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

  const drawer = <OnboardingDrawer open={drawerOpen} onOpenChange={setDrawerOpen} role={role} setRole={setRole} slug={slug} setSlug={setSlug} onSubmit={handleSubmit} onClearSlug={handleClearSlug} />;

  if (!hasHydrated) {
    return <main className="flex min-h-[100dvh] items-center justify-center bg-[#f8fbf7]"><span className="h-7 w-7 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-600" /></main>;
  }

  if (hasSessions) {
    return (
      <main className="relative min-h-[100dvh] overflow-hidden bg-[#f8fbf7] text-slate-900">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-70" style={pagePattern} />
        <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-md flex-col items-center pt-7">
          <div className="flex w-full flex-1 flex-col items-center px-6 text-center">
            <img
              src="/imgs/onboarding/1.png"
              alt="Madrasa community"
              className="mt-auto h-[min(30vh,250px)] w-full object-contain drop-shadow-[0_16px_18px_rgba(15,67,45,0.12)]"
            />
            <img
              src="/imgs/onboarding/logo.svg"
              alt="Smart Madrasa"
              className="mt-3 h-10 w-11 object-contain"
            />
            <h1 className="mt-4 bg-gradient-to-r from-[#059669] to-[#0d9488] bg-clip-text text-4xl font-semibold tracking-[-0.04em] text-transparent">
              Welcome back
            </h1>
            <p className="mb-auto mt-2 text-sm leading-6 text-slate-500">
              Choose a session to continue where you left off.
            </p>
          </div>

          <section className="mt-auto flex h-max w-full flex-none flex-col rounded-t-[2rem] bg-white/85 px-6 pb-8 pt-7 shadow-[0_-18px_55px_rgba(5,150,105,0.14)] backdrop-blur-md">
            <div className="mb-2 text-center">
              {/* <h2 className="text-base font-semibold text-slate-900">Your sessions</h2> */}
              {/* <p className="mt-1 text-xs text-slate-500">Select an account to continue</p> */}
            </div>
            <SessionsList />
            <Button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="mt-6 h-auto w-full rounded-2xl py-4 text-sm font-semibold"
            >
              {/* <Plus className="h-4 w-4" /> */}
              New session
            </Button>
          </section>
        </div>
        {drawer}
      </main>
    );
  }

  return (
    <main className="relative min-h-[100dvh] overflow-hidden bg-[#f8fbf7] text-slate-900">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-70" style={pagePattern} />
      <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-md flex-col pb-7 pt-8 sm:px-8">
        <Swiper onSwiper={setOnboardingSwiper} onSlideChange={(swiper) => setOnboardingStep(swiper.activeIndex)} spaceBetween={28} slidesPerView={1} className="flex w-full flex-1 !overflow-visible !px-2" allowTouchMove resistanceRatio={1}>
          {onboardingSlides.map((item) => (
            <SwiperSlide key={item.title} className="!flex flex-col items-center justify-center px-6 text-center">
              <div className="mb-3 flex h-[min(48vh,530px)] w-full items-center justify-center"><img src={item.image} alt={item.alt} className="mt-auto max-h-full w-full object-contain drop-shadow-[0_18px_18px_rgba(14,78,54,0.12)]" /></div>
              <img src="/imgs/onboarding/logo.svg" alt="Smart Madrasa" className="mb-5 h-10 w-10 object-contain" />
              <h1 className="max-w-sm bg-gradient-to-r from-emerald-800 via-emerald-600 to-emerald-900 bg-clip-text text-[2.5rem] font-semibold leading-[1.06] tracking-[-0.045em] text-transparent">{item.title}</h1>
              <p className="mt-4 max-w-sm text-sm leading-6 text-slate-600">{item.description}</p>
            </SwiperSlide>
          ))}
        </Swiper>
        <div className="space-y-5 px-6">
          <div className="flex justify-center gap-2" aria-label="Onboarding progress">
            {onboardingSlides.map((item, index) => <button key={item.title} type="button" aria-label={`Go to slide ${index + 1}`} onClick={() => onboardingSwiper?.slideTo(index)} className={`h-1.5 rounded-full transition-all ${index === onboardingStep ? "w-8 bg-emerald-700" : "w-1.5 bg-emerald-700/20"}`} />)}
          </div>
          <Button type="button" onClick={() => setDrawerOpen(true)} className="h-auto w-full rounded-2xl px-5 py-4 text-sm font-bold shadow-[0_10px_24px_rgba(16,111,76,0.22)] active:scale-[0.99]">Get started</Button>
        </div>
      </div>
      {drawer}
    </main>
  );
}
