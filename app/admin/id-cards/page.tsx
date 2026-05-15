/* eslint-disable @next/next/no-img-element */
"use client";
import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { getStudents } from "@/lib/students-api";
import { getAllClasses } from "@/lib/classes-api";
import { useAuthStore } from "@/store/auth";
import {
  CreditCard, Search, Printer, Download, Eye, X,
  User, Phone, BookMarked, Calendar, MapPin, Hash,
  Settings, CheckCircle, Filter, Layers, ChevronRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useLanguageStore } from "@/store/language";
import { t as tr } from "@/lib/i18n";

type Theme = "classic" | "modern" | "minimal" | "islamic";

const THEMES: { id: Theme; label: string; desc: string }[] = [
  { id: "classic",  label: "Classic Green",   desc: "Traditional design, emerald header"   },
  { id: "modern",   label: "Modern Dark",     desc: "Navy gradient, bold typography"        },
  { id: "minimal",  label: "Minimal White",   desc: "Clean white with coloured side stripe" },
  { id: "islamic",  label: "Islamic Pattern", desc: "Gold accents with decorative border"   },
];

// Placeholder — replaced at runtime with real class names
const DEFAULT_CLASSES = ["All"];

const classColors: Record<string, { bg: string; light: string; text: string; hex: string }> = {
  "Class 2": { bg: "bg-sky-500",     light: "bg-sky-50",     text: "text-sky-700",     hex: "#0ea5e9" },
  "Class 3": { bg: "bg-purple-500",  light: "bg-purple-50",  text: "text-purple-700",  hex: "#a855f7" },
  "Class 4": { bg: "bg-emerald-600", light: "bg-emerald-50", text: "text-emerald-700", hex: "#059669" },
  "Class 5": { bg: "bg-orange-500",  light: "bg-orange-50",  text: "text-orange-700",  hex: "#f97316" },
  "Class 6": { bg: "bg-rose-500",    light: "bg-rose-50",    text: "text-rose-700",    hex: "#f43f5e" },
};
const defaultColor = { bg: "bg-emerald-600", light: "bg-emerald-50", text: "text-emerald-700", hex: "#059669" };
function getColor(cls: string) { return classColors[cls] ?? defaultColor; }
function initials(name: string) { return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase(); }

// Mapped student shape used by all card components
interface CardStudent {
  id: string;
  name: string;
  admissionNumber: string;
  class: string;
  division: string;
  dateOfBirth: string;
  fatherName: string;
  motherName: string;
  phone: string;
  address: string;
  photo?: string;
}

// Default card settings — overridden by madrasa config in component
const DEFAULT_CARD_SETTINGS = {
  madrasaName: "Madrasa",
  madrasaAddress: "",
  madrasaPhone: "",
  logoText: "M",
  academicYear: new Date().getFullYear().toString(),
};

function BarcodeStrip({ light = false }: { light?: boolean }) {
  const bars = [3,1,2,1,3,2,1,2,1,3,1,2,1,1,3,2,1,2,3,1,2,1,1,3,1,2];
  return (
    <div className="flex items-end gap-[1.5px] h-6">
      {bars.map((w, i) => (
        <div key={i}
          className={cn("rounded-[0.5px]", light ? "bg-white/60" : "bg-gray-800", i % 3 === 0 ? "h-full" : "h-4")}
          style={{ width: w * 1.5 }} />
      ))}
    </div>
  );
}

function IslamicPattern({ opacity = 0.12 }: { opacity?: number }) {
  return (
    <svg viewBox="0 0 200 200" className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity }}>
      <defs>
        <pattern id="ip" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M20 0 L40 20 L20 40 L0 20Z" fill="none" stroke="currentColor" strokeWidth="0.8"/>
          <circle cx="20" cy="20" r="5" fill="none" stroke="currentColor" strokeWidth="0.8"/>
          <path d="M0 0 L20 20 M40 0 L20 20 M0 40 L20 20 M40 40 L20 20" stroke="currentColor" strokeWidth="0.4"/>
        </pattern>
      </defs>
      <rect width="200" height="200" fill="url(#ip)" />
    </svg>
  );
}

// ─── THEME 1: CLASSIC GREEN ───────────────────────────────────────────────
function ClassicCard({ student, mini = false }: { student: CardStudent; mini?: boolean }) {
  const col = getColor(student.class);
  const sz  = mini ? "w-14 h-16 text-xl" : "w-20 h-24 text-3xl";
  return (
    <div className="bg-white rounded-2xl shadow-md overflow-hidden border border-gray-200 select-none w-full">
      <div className={cn("px-4 py-3 flex items-center gap-3", col.bg)}>
        <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
          <p className="text-white font-extrabold text-xs">{idCardSettings.logoText}</p>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-sm leading-tight truncate">{idCardSettings.madrasaName}</p>
          <p className="text-white/70 text-[10px] truncate">{idCardSettings.academicYear}</p>
        </div>
        <span className="text-[9px] text-white/90 font-bold border border-white/40 rounded px-1.5 py-0.5 shrink-0">ID</span>
      </div>
      <div className={cn("px-4 flex gap-3 items-start", mini ? "py-3" : "py-4")}>
        <div className={cn("shrink-0 rounded-xl overflow-hidden flex flex-col items-center justify-center text-white font-bold shadow-sm relative", col.bg, sz)}>
          {student.photo
            ? <img src={student.photo} alt={student.name} className="w-full h-full object-cover" />
            : <><span>{initials(student.name)}</span><span className="text-[7px] text-white/60 mt-0.5">PHOTO</span></>}
        </div>
        <div className="flex-1 min-w-0 space-y-1">
          <p className={cn("font-bold text-gray-900 leading-tight", mini ? "text-xs" : "text-sm")}>{student.name}</p>
          <IRow icon={Hash}       text={student.admissionNumber} mini={mini} />
          <IRow icon={BookMarked} text={`${student.class} · Div ${student.division}`} mini={mini} />
          <IRow icon={Calendar}   text={`DOB: ${student.dateOfBirth}`} mini={mini} />
          <IRow icon={User}       text={`Father: ${student.fatherName}`} mini={mini} />
          {!mini && <IRow icon={User}  text={`Mother: ${student.motherName}`} mini={false} />}
          <IRow icon={Phone}      text={student.phone} mini={mini} />
          {!mini && <IRow icon={MapPin} text={student.address} mini={false} />}
        </div>
      </div>
      <div className="px-4 pb-3">
        <div className="flex items-center justify-between mb-1.5">
          <BarcodeStrip />
          <div className={cn("px-2 py-0.5 rounded-lg text-[10px] font-bold text-white shrink-0 ml-3", col.bg)}>{student.class}</div>
        </div>
        <p className="text-[8px] text-gray-400">{idCardSettings.madrasaAddress} · {idCardSettings.madrasaPhone}</p>
      </div>
    </div>
  );
}

// ─── THEME 2: MODERN DARK ────────────────────────────────────────────────
function ModernCard({ student, mini = false }: { student: CardStudent; mini?: boolean }) {
  const col = getColor(student.class);
  const sz  = mini ? "w-14 h-16" : "w-20 h-24";
  return (
    <div className="bg-slate-900 rounded-2xl shadow-xl overflow-hidden border border-slate-700 select-none w-full">
      <div className="h-1.5 w-full" style={{ background: `linear-gradient(to right, ${col.hex}, #6366f1)` }} />
      <div className="px-4 pt-3 pb-2 flex items-center gap-2 border-b border-slate-700/60">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-extrabold text-[10px] shrink-0"
          style={{ background: `linear-gradient(135deg, ${col.hex}, #6366f1)` }}>
          {idCardSettings.logoText}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-xs leading-tight truncate">{idCardSettings.madrasaName}</p>
          <p className="text-slate-400 text-[9px]">{idCardSettings.academicYear}</p>
        </div>
        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border shrink-0"
          style={{ color: col.hex, borderColor: col.hex }}>STUDENT</span>
      </div>
      <div className={cn("px-4 flex gap-3 items-start", mini ? "py-3" : "py-4")}>
        <div className={cn("shrink-0 rounded-2xl overflow-hidden border-2 flex flex-col items-center justify-center text-white font-bold", sz)}
          style={{ borderColor: col.hex, background: `linear-gradient(145deg, ${col.hex}33, ${col.hex}11)` }}>
          {student.photo
            ? <img src={student.photo} alt={student.name} className="w-full h-full object-cover" />
            : <><span className={mini ? "text-xl" : "text-2xl"}>{initials(student.name)}</span><span className="text-[7px] text-white/40 mt-0.5">PHOTO</span></>}
        </div>
        <div className="flex-1 min-w-0 space-y-1">
          <p className={cn("font-extrabold text-white leading-tight", mini ? "text-xs" : "text-sm")}>{student.name}</p>
          <p className="text-[10px] font-semibold" style={{ color: col.hex }}>{student.class} · Division {student.division}</p>
          <div className="space-y-0.5 mt-1">
            <IRowDark icon={Hash}     text={student.admissionNumber} mini={mini} />
            <IRowDark icon={Calendar} text={student.dateOfBirth} mini={mini} />
            <IRowDark icon={User}     text={student.fatherName} mini={mini} />
            {!mini && <IRowDark icon={User}  text={student.motherName} mini={false} />}
            <IRowDark icon={Phone}    text={student.phone} mini={mini} />
            {!mini && <IRowDark icon={MapPin} text={student.address} mini={false} />}
          </div>
        </div>
      </div>
      <div className="px-4 pb-3 flex items-center justify-between">
        <BarcodeStrip light />
        <p className="text-[8px] text-slate-500 ml-3 truncate">{idCardSettings.madrasaPhone}</p>
      </div>
    </div>
  );
}

// ─── THEME 3: MINIMAL WHITE ──────────────────────────────────────────────
function MinimalCard({ student, mini = false }: { student: CardStudent; mini?: boolean }) {
  const col = getColor(student.class);
  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-200 select-none w-full flex">
      <div className={cn("w-2 shrink-0", col.bg)} />
      <div className="flex-1 min-w-0">
        <div className="px-4 py-2 flex items-center justify-between border-b border-gray-100">
          <div>
            <p className="font-extrabold text-gray-900 text-xs leading-tight">{idCardSettings.madrasaName}</p>
            <p className="text-[9px] text-gray-400">{idCardSettings.academicYear}</p>
          </div>
          <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center text-white text-[10px] font-extrabold shrink-0", col.bg)}>
            {idCardSettings.logoText}
          </div>
        </div>
        <div className={cn("px-4 flex gap-3 items-start", mini ? "py-3" : "py-4")}>
          <div className={cn("shrink-0 rounded-xl overflow-hidden border-2 flex flex-col items-center justify-center text-white font-bold", col.bg, mini ? "w-12 h-14" : "w-18 h-22")}
            style={{ borderColor: col.hex }}>
            {student.photo
              ? <img src={student.photo} alt={student.name} className="w-full h-full object-cover" />
              : <><User className={cn("opacity-50", mini ? "w-5 h-5" : "w-7 h-7")} /><span className="text-[7px] text-white/60 mt-0.5">PHOTO</span></>}
          </div>
          <div className="flex-1 min-w-0 space-y-1">
            <p className={cn("font-bold text-gray-900 leading-tight", mini ? "text-xs" : "text-sm")}>{student.name}</p>
            <span className={cn("inline-block text-[9px] font-semibold px-1.5 py-0.5 rounded-full text-white", col.bg)}>{student.class}</span>
            <div className="space-y-0.5 mt-0.5">
              <IRow icon={Hash}     text={student.admissionNumber} mini={mini} />
              <IRow icon={Calendar} text={student.dateOfBirth} mini={mini} />
              <IRow icon={User}     text={student.fatherName} mini={mini} />
              {!mini && <IRow icon={User}  text={student.motherName} mini={false} />}
              <IRow icon={Phone}    text={student.phone} mini={mini} />
              {!mini && <IRow icon={MapPin} text={student.address} mini={false} />}
            </div>
          </div>
        </div>
        <div className="px-4 pb-3 flex items-center justify-between border-t border-gray-100 pt-2">
          <p className="text-[8px] text-gray-400 truncate">{idCardSettings.madrasaAddress}</p>
          <BarcodeStrip />
        </div>
      </div>
    </div>
  );
}

// ─── THEME 4: ISLAMIC PATTERN ────────────────────────────────────────────
function IslamicCard({ student, mini = false }: { student: CardStudent; mini?: boolean }) {
  return (
    <div className="bg-amber-700 rounded-2xl shadow-lg overflow-hidden border-2 border-amber-400/40 select-none w-full relative text-white">
      <IslamicPattern opacity={0.15} />
      <div className="h-1 w-full" style={{ background: "linear-gradient(to right, #fde047, #f59e0b, #fde047)" }} />
      <div className="px-4 pt-3 pb-2 flex items-center gap-2 border-b border-amber-500/40 relative z-10">
        <div className="w-8 h-8 rounded-full border-2 border-yellow-300 flex items-center justify-center bg-amber-800 shrink-0">
          <p className="text-yellow-300 font-extrabold text-[10px]">{idCardSettings.logoText}</p>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-yellow-100 font-extrabold text-xs leading-tight truncate">{idCardSettings.madrasaName}</p>
          <p className="text-amber-300 text-[9px]">{idCardSettings.academicYear}</p>
        </div>
        <span className="text-[9px] text-yellow-300 font-bold border border-yellow-400/50 rounded px-1.5 py-0.5 shrink-0">ID</span>
      </div>
      <div className={cn("px-4 flex gap-3 items-start relative z-10", mini ? "py-3" : "py-4")}>
        <div className={cn("shrink-0 rounded-xl overflow-hidden border-2 border-yellow-300/60 bg-amber-800 flex flex-col items-center justify-center text-white font-bold relative",
          mini ? "w-14 h-16" : "w-20 h-24")}>
          {student.photo
            ? <img src={student.photo} alt={student.name} className="w-full h-full object-cover" />
            : <><span className={mini ? "text-xl" : "text-2xl"}>{initials(student.name)}</span><span className="text-[7px] text-yellow-300/60 mt-0.5">PHOTO</span></>}
          <div className="absolute top-0.5 right-0.5 w-3 h-3 border-t-2 border-r-2 border-yellow-300/60 rounded-tr-sm" />
          <div className="absolute bottom-0.5 left-0.5 w-3 h-3 border-b-2 border-l-2 border-yellow-300/60 rounded-bl-sm" />
        </div>
        <div className="flex-1 min-w-0 space-y-1">
          <p className={cn("font-extrabold text-yellow-100 leading-tight", mini ? "text-xs" : "text-sm")}>{student.name}</p>
          <p className="text-yellow-300 text-[10px] font-semibold">{student.class} · Div {student.division}</p>
          <div className="space-y-0.5">
            <IRowLight icon={Hash}     text={student.admissionNumber} mini={mini} />
            <IRowLight icon={Calendar} text={student.dateOfBirth} mini={mini} />
            <IRowLight icon={User}     text={student.fatherName} mini={mini} />
            {!mini && <IRowLight icon={User}  text={student.motherName} mini={false} />}
            <IRowLight icon={Phone}    text={student.phone} mini={mini} />
            {!mini && <IRowLight icon={MapPin} text={student.address} mini={false} />}
          </div>
        </div>
      </div>
      <div className="px-4 pb-3 border-t border-amber-500/40 pt-2 relative z-10 flex items-center justify-between">
        <BarcodeStrip light />
        <p className="text-[8px] text-amber-300 ml-3 truncate">{idCardSettings.madrasaPhone}</p>
      </div>
      <div className="h-1 w-full" style={{ background: "linear-gradient(to right, #fde047, #f59e0b, #fde047)" }} />
    </div>
  );
}

// ─── ROW HELPERS ─────────────────────────────────────────────────────────
function IRow({ icon: Icon, text, mini }: { icon: React.ElementType; text: string; mini: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon className={cn("shrink-0 text-gray-400", mini ? "w-2.5 h-2.5" : "w-3.5 h-3.5")} />
      <span className={cn("text-gray-700 leading-tight truncate", mini ? "text-[9px]" : "text-xs")}>{text}</span>
    </div>
  );
}
function IRowDark({ icon: Icon, text, mini }: { icon: React.ElementType; text: string; mini: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon className={cn("shrink-0 text-slate-500", mini ? "w-2.5 h-2.5" : "w-3 h-3")} />
      <span className={cn("text-slate-300 leading-tight truncate", mini ? "text-[9px]" : "text-[10px]")}>{text}</span>
    </div>
  );
}
function IRowLight({ icon: Icon, text, mini }: { icon: React.ElementType; text: string; mini: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon className={cn("shrink-0 text-amber-300/70", mini ? "w-2.5 h-2.5" : "w-3 h-3")} />
      <span className={cn("text-amber-100/80 leading-tight truncate", mini ? "text-[9px]" : "text-[10px]")}>{text}</span>
    </div>
  );
}

function IDCard({ student, theme, mini = false }: { student: CardStudent; theme: Theme; mini?: boolean }) {
  switch (theme) {
    case "modern":  return <ModernCard  student={student} mini={mini} />;
    case "minimal": return <MinimalCard student={student} mini={mini} />;
    case "islamic": return <IslamicCard student={student} mini={mini} />;
    default:        return <ClassicCard student={student} mini={mini} />;
  }
}

// ─── PAGE ────────────────────────────────────────────────────────────────
export default function IDCardsPage() {
  const { lang } = useLanguageStore();
  const { user, accessToken, activeClientId } = useAuthStore();
  const cid   = activeClientId ?? "";
  const token = accessToken ?? "";

  const [allStudents, setAllStudents]   = useState<CardStudent[]>([]);
  const [allClasses, setAllClasses]     = useState<string[]>(DEFAULT_CLASSES);
  const [dataLoading, setDataLoading]   = useState(true);
  const [search, setSearch]             = useState("");
  const [activeClass, setActiveClass]   = useState("All");
  const [theme, setTheme]               = useState<Theme>("classic");
  const [preview, setPreview]           = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showThemes, setShowThemes]     = useState(false);
  const [bulkMode, setBulkMode]         = useState(false);
  const [selected, setSelected]         = useState<Set<string>>(new Set());

  const idCardSettings = {
    madrasaName:    DEFAULT_CARD_SETTINGS.madrasaName,
    madrasaAddress: DEFAULT_CARD_SETTINGS.madrasaAddress,
    madrasaPhone:   DEFAULT_CARD_SETTINGS.madrasaPhone,
    logoText:       DEFAULT_CARD_SETTINGS.logoText,
    academicYear:   DEFAULT_CARD_SETTINGS.academicYear,
  };

  useEffect(() => {
    if (!cid || !token) return;
    const ac = new AbortController();
    Promise.all([
      getStudents(cid, token, { limit: 500, signal: ac.signal }).catch(() => ({ data: [] as any[] })),
      getAllClasses(cid, token, ac.signal).catch(() => []),
    ]).then(([stuData, classData]) => {
      const mapped: CardStudent[] = (stuData.data ?? []).map((s) => ({
        id:              s.id,
        name:            s.name,
        admissionNumber: s.adno,
        class:           s.class?.name ?? "",
        division:        "",
        dateOfBirth:     s.dateOfBirth ? new Date(s.dateOfBirth).toLocaleDateString("en-GB") : "",
        fatherName:      s.guardianName ?? "",
        motherName:      "",
        phone:           s.parentPhone ?? "",
        address:         "",
        photo:           undefined,
      }));
      setAllStudents(mapped);
      const classNames = classData.map((c) => c.name);
      setAllClasses(["All", ...Array.from(new Set(classNames)).sort()]);
      setDataLoading(false);
    });
    return () => ac.abort();
  }, [cid, token]);

  const students = allStudents; // alias for card components
  const ALL_CLASSES = allClasses;

  const filtered = students.filter((s) => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.admissionNumber.toLowerCase().includes(search.toLowerCase());
    const matchClass = activeClass === "All" || s.class === activeClass;
    return matchSearch && matchClass;
  });

  const previewStudent = preview ? students.find((s) => s.id === preview) : null;

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const classStats = ALL_CLASSES.filter((c) => c !== "All").map((c) => ({
    cls: c, count: students.filter((s) => s.class === c).length, color: getColor(c),
  }));

  const activeTheme = THEMES.find((t) => t.id === theme)!;

  return (
    <DashboardLayout>
      <PageHeader
        title={tr("adminPages", "idCardsTitle", lang)}
        subtitle={`${students.length} ${tr("common", "students", lang)} · ${ALL_CLASSES.length - 1} ${tr("adminPages", "idCardsSubtitle", lang)}`}
        icon={CreditCard}
        action={
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setShowThemes(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:border-gray-300">
              <Layers className="w-4 h-4" /> {tr("common", "themes", lang)}
            </button>
            <button onClick={() => setShowSettings(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:border-gray-300">
              <Settings className="w-4 h-4" /> {tr("common", "settings", lang)}
            </button>
            <button onClick={() => setBulkMode(!bulkMode)}
              className={cn("flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold",
                bulkMode ? "bg-emerald-600 text-white" : "bg-white border border-gray-200 text-gray-700 hover:border-gray-300")}>
              <Filter className="w-4 h-4" /> {bulkMode ? `${selected.size} ${tr("common", "selected", lang)}` : tr("common", "bulkSelect", lang)}
            </button>
            <button className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700">
              <Printer className="w-4 h-4" /> {tr("common", "print", lang)} {bulkMode && selected.size > 0 ? `(${selected.size})` : tr("common", "all", lang)}
            </button>
          </div>
        }
      />

      {/* Active Theme Banner */}
      <motion.button onClick={() => setShowThemes(true)} whileTap={{ scale: 0.99 }}
        className="w-full mb-4 rounded-2xl border border-gray-200 bg-white overflow-hidden flex items-center gap-4 px-5 py-4 hover:border-gray-300 transition-all text-left shadow-sm">
        <div className="w-12 h-12 rounded-xl shrink-0 overflow-hidden">
          <div className="w-full h-full scale-50 origin-top-left" style={{ width: "200%", height: "200%" }}>
            <IDCard student={students[0]} theme={theme} mini />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-900 text-sm">{activeTheme.label}</p>
          <p className="text-xs text-gray-400">{activeTheme.desc} · {tr("adminPages", "tapToChange", lang)}</p>
        </div>
        <div className="flex items-center gap-1 text-xs font-semibold text-emerald-600 shrink-0">
          {tr("adminPages", "changeTheme", lang)} <ChevronRight className="w-4 h-4" />
        </div>
      </motion.button>

      {/* Madrasa Info Banner */}
      <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 mb-4 flex items-center gap-4">
        <div className="w-11 h-11 bg-emerald-600 rounded-xl flex items-center justify-center text-white font-extrabold text-base shrink-0">
          {idCardSettings.logoText}
        </div>
        <div className="flex-1">
          <p className="font-bold text-emerald-900 text-sm">{idCardSettings.madrasaName}</p>
          <p className="text-xs text-emerald-600 mt-0.5">{idCardSettings.madrasaAddress} · {idCardSettings.madrasaPhone}</p>
        </div>
        <div className="text-right shrink-0">
          <span className="text-xs font-bold bg-emerald-600 text-white px-3 py-1.5 rounded-lg">{idCardSettings.academicYear}</span>
          <p className="text-[10px] text-emerald-500 mt-1">{students.length} {tr("adminPages", "totalStudentsLabel", lang)}</p>
        </div>
      </div>

      {/* Class Stat Pills */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {classStats.map(({ cls, count, color }) => (
          <button key={cls} onClick={() => setActiveClass(activeClass === cls ? "All" : cls)}
            className={cn("rounded-xl p-3 border-2 text-left transition-all",
              activeClass === cls ? `${color.light} border-current` : "bg-white border-gray-100 hover:border-gray-200")}>
            <div className={cn("w-6 h-6 rounded-lg flex items-center justify-center mb-1.5 text-white text-[10px] font-bold", color.bg)}>{count}</div>
            <p className={cn("text-xs font-bold", activeClass === cls ? color.text : "text-gray-700")}>{cls}</p>
            <p className="text-[10px] text-gray-400">{count} students</p>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder={tr("common", "searchByName", lang)}
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm" />
      </div>

      {/* Class Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 mb-5">
        {ALL_CLASSES.map((cls) => (
          <button key={cls} onClick={() => setActiveClass(cls)}
            className={cn("px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap shrink-0 transition-all border",
              activeClass === cls ? "bg-emerald-600 text-white border-transparent shadow-sm" : "bg-white border-gray-200 text-gray-600 hover:border-gray-300")}>
            {cls} {cls !== "All" && `(${students.filter((s) => s.class === cls).length})`}
          </button>
        ))}
      </div>

      {/* Card Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((stu) => {
          const isSel = selected.has(stu.id);
          return (
            <motion.div key={stu.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="relative group">
              {bulkMode && (
                <button onClick={() => toggleSelect(stu.id)}
                  className={cn("absolute top-2.5 left-2.5 z-10 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all shadow-sm",
                    isSel ? "bg-emerald-600 border-emerald-600" : "bg-white border-gray-300")}>
                  {isSel && <CheckCircle className="w-4 h-4 text-white" />}
                </button>
              )}
              <IDCard student={stu} theme={theme} mini />
              {!bulkMode && (
                <div className="absolute inset-0 bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                  <button onClick={() => setPreview(stu.id)}
                    className="bg-white text-gray-900 px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-1.5 shadow-lg">
                    <Eye className="w-4 h-4" /> {tr("common", "preview", lang)}
                  </button>
                  <button className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-1.5 shadow-lg">
                    <Printer className="w-4 h-4" /> {tr("common", "print", lang)}
                  </button>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="py-16 text-center text-gray-400">
          <CreditCard className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">{tr("common", "noResults", lang)}</p>
        </div>
      )}

      {/* FULL PREVIEW MODAL */}
      <AnimatePresence>
        {previewStudent && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm" onClick={() => setPreview(null)} />
            <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
              <div className="bg-white rounded-3xl shadow-2xl overflow-hidden max-w-sm w-full">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                  <div>
                    <p className="font-bold text-gray-900">{tr("adminPages", "idCardPreview", lang)}</p>
                    <p className="text-xs text-gray-400">{previewStudent.name} · {previewStudent.admissionNumber}</p>
                  </div>
                  <button onClick={() => setPreview(null)} className="p-1.5 rounded-lg hover:bg-gray-100">
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
                {/* Theme switcher inside modal */}
                <div className="flex gap-1.5 px-5 pt-3">
                  {THEMES.map((t) => (
                    <button key={t.id} onClick={() => setTheme(t.id)}
                      className={cn("flex-1 py-1.5 rounded-lg text-[10px] font-bold border-2 transition-all",
                        theme === t.id ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-gray-200 text-gray-500 hover:border-gray-300")}>
                      {t.label.split(" ")[0]}
                    </button>
                  ))}
                </div>
                <div className="p-6 flex justify-center bg-gray-50 mt-3">
                  <div className="w-full max-w-xs">
                    <IDCard student={previewStudent} theme={theme} />
                  </div>
                </div>
                <div className="px-5 py-3 border-t border-gray-100 grid grid-cols-3 gap-3 text-center bg-gray-50">
                  <div><p className="text-[10px] text-gray-400">Class</p><p className="text-sm font-bold text-gray-900">{previewStudent.class}</p></div>
                  <div><p className="text-[10px] text-gray-400">Division</p><p className="text-sm font-bold text-gray-900">{previewStudent.division}</p></div>
                  <div><p className="text-[10px] text-gray-400">Gender</p><p className="text-sm font-bold text-gray-900 capitalize">{previewStudent.gender}</p></div>
                </div>
                <div className="px-5 py-4 flex gap-2">
                  <button onClick={() => setPreview(null)} className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700">{tr("common", "close", lang)}</button>
                  <button className="flex-1 py-3 bg-gray-900 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2">
                    <Download className="w-4 h-4" /> {tr("common", "download", lang)}
                  </button>
                  <button className="flex-1 py-3 bg-emerald-600 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2">
                    <Printer className="w-4 h-4" /> {tr("common", "print", lang)}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* THEME PICKER BOTTOM SHEET */}
      <AnimatePresence>
        {showThemes && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 z-40 backdrop-blur-sm" onClick={() => setShowThemes(false)} />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <Layers className="w-5 h-5 text-emerald-600" />
                  <p className="font-bold text-gray-900">{tr("adminPages", "chooseTheme", lang)}</p>
                </div>
                <button onClick={() => setShowThemes(false)}><X className="w-5 h-5 text-gray-400" /></button>
              </div>
              <div className="p-5 space-y-4">
                <p className="text-sm text-gray-500">Select a design template. Changes apply to all cards instantly.</p>
                <div className="grid grid-cols-2 gap-4">
                  {THEMES.map((t) => (
                    <button key={t.id} onClick={() => { setTheme(t.id); setShowThemes(false); }}
                      className={cn("rounded-2xl border-2 overflow-hidden transition-all text-left",
                        theme === t.id ? "border-emerald-500 shadow-md" : "border-gray-200 hover:border-gray-300")}>
                      <div className="p-3 bg-gray-50 overflow-hidden">
                        <IDCard student={students[0]} theme={t.id} mini />
                      </div>
                      <div className={cn("px-3 py-2 border-t flex items-center justify-between",
                        theme === t.id ? "bg-emerald-50 border-emerald-200" : "bg-white border-gray-100")}>
                        <div>
                          <p className={cn("text-xs font-bold", theme === t.id ? "text-emerald-700" : "text-gray-800")}>{t.label}</p>
                          <p className="text-[10px] text-gray-400 leading-tight">{t.desc}</p>
                        </div>
                        {theme === t.id && <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 ml-2" />}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* SETTINGS PANEL */}
      <AnimatePresence>
        {showSettings && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 z-40 backdrop-blur-sm" onClick={() => setShowSettings(false)} />
            <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-xs bg-white z-50 shadow-2xl overflow-y-auto">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-emerald-600" />
                  <p className="font-bold text-gray-900">{tr("adminPages", "cardSettings", lang)}</p>
                </div>
                <button onClick={() => setShowSettings(false)}><X className="w-5 h-5 text-gray-400" /></button>
              </div>
              <div className="p-5 space-y-5">
                <SettingField label="Madrasa Name"  defaultValue={idCardSettings.madrasaName} />
                <SettingField label="Address"       defaultValue={idCardSettings.madrasaAddress} />
                <SettingField label="Phone"         defaultValue={idCardSettings.madrasaPhone} />
                <SettingField label="Academic Year" defaultValue={idCardSettings.academicYear} />
                <SettingField label="Logo Text"     defaultValue={idCardSettings.logoText} />
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-3">Photo / Avatar Settings</p>
                  <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                    {[["Show photo if available", true], ["Fallback: initials avatar", true], ["Gender-aware avatar color", false]].map(([label, on]) => (
                      <div key={label as string} className="flex items-center justify-between">
                        <p className="text-sm text-gray-700">{label as string}</p>
                        <div className={cn("w-10 h-5 rounded-full relative", on ? "bg-emerald-500" : "bg-gray-300")}>
                          <div className={cn("absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all", on ? "right-0.5" : "left-0.5")} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-3">Class Colours</p>
                  <div className="space-y-2">
                    {classStats.map(({ cls, color }) => (
                      <div key={cls} className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2">
                        <div className={cn("w-4 h-4 rounded-full", color.bg)} />
                        <p className="text-sm text-gray-700 flex-1">{cls}</p>
                        <p className={cn("text-[10px] font-bold", color.text)}>Active</p>
                      </div>
                    ))}
                  </div>
                </div>
                <button onClick={() => setShowSettings(false)}
                  className="w-full py-3 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700">
                  {tr("adminPages", "saveSettings", lang)}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}

function SettingField({ label, defaultValue }: { label: string; defaultValue: string }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 mb-1.5">{label}</label>
      <input defaultValue={defaultValue}
        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
    </div>
  );
}
