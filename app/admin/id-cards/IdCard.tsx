"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { DashboardLayout } from "@/components/DashboardLayout";

import { PageHeader } from "@/components/ui/PageHeader";

import { getStudents, StudentRecord } from "@/lib/students-api";

import { ClassRecord, getAllClasses } from "@/lib/classes-api";

import { useAuthStore } from "@/store/auth";

import { useLanguageStore } from "@/store/language";

import { t } from "@/lib/i18n";

import {
  ChevronDown,
  CreditCard,
  Download,
  Filter,
  Image as ImageIcon,
  Search,
  Upload,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";

import { Group, Leafer, Image as LeaferImage, Rect, Text } from "leafer-ui";

interface StudentInfo {
  id: string;

  name: string;

  adno: string;

  gender: string;

  dateOfBirth: string;

  parentPhone: string;

  guardianName: string;

  className: string;
}

const THEMES = [
  { id: "classic", label: "Classic Green", color: "#059669" },

  { id: "modern", label: "Modern Dark", color: "#1e293b" },

  { id: "minimal", label: "Minimal White", color: "#ffffff" },

  { id: "islamic", label: "Islamic Gold", color: "#b45309" },
] as const;

type ThemeId = (typeof THEMES)[number]["id"];

function initials(name: string) {
  return name

    .split(" ")

    .slice(0, 2)

    .map((w) => w[0])

    .join("")

    .toUpperCase();
}

function CardCanvas({
  student,

  theme,

  containerRef,

  bgImage,

  madrasaName,

  avatars,
}: {
  student: StudentInfo;

  theme: ThemeId;

  containerRef: React.RefObject<HTMLDivElement | null>;

  bgImage?: string | null;

  madrasaName?: string;

  avatars?: Record<string, string>;
}) {
  const leaferRef = useRef<Leafer | null>(null);

  useEffect(() => {
    const el = containerRef.current;

    if (!el) return;

    if (leaferRef.current) {
      leaferRef.current.destroy();
    }

    const W = 340;

    const H = 210;

    const pad = 4;

    const leafer = new Leafer({
      view: el,

      width: W,

      height: H,

      fill: "transparent",

      pixelRatio: 3,
    });

    leaferRef.current = leafer;

    const card = new Group({ x: 0, y: 0 });

    const primaryColor =
      theme === "classic"
        ? "#059669"
        : theme === "modern"
          ? "#1e293b"
          : theme === "islamic"
            ? "#b45309"
            : "#0ea5e9";

    const isDark = theme === "modern" || theme === "islamic";

    const textColor = isDark ? "#f1f5f9" : "#111827";

    const mutedColor = isDark ? "rgba(255,255,255,0.6)" : "#6b7280";

    const cardBg =
      theme === "minimal" ? "#ffffff" : isDark ? "#1e293b" : "#ffffff";

    const headerBg = theme === "minimal" ? "#ffffff" : primaryColor;

    const cardShadow = new Rect({
      x: 2,

      y: 2,

      width: W,

      height: H,

      fill: "rgba(0,0,0,0.08)",

      cornerRadius: 16,
    });

    card.add(cardShadow);

    const bg = new Rect({
      width: W,

      height: H,

      fill: cardBg,

      cornerRadius: 14,

      stroke: theme === "minimal" ? "#e5e7eb" : "transparent",

      strokeWidth: theme === "minimal" ? 1 : 0,
    });

    card.add(bg);

    // Background image (overlays card background)

    if (bgImage) {
      const bgImg = new LeaferImage({
        url: bgImage,

        width: W,

        height: H,

        cornerRadius: 14,
      });

      card.add(bgImg);
    }

    if (theme === "islamic") {
      const border = new Rect({
        width: W,

        height: H,

        fill: "transparent",

        cornerRadius: 14,

        stroke: "rgba(251,191,36,0.3)",

        strokeWidth: 2,
      });

      card.add(border);
    }

    if (theme === "modern") {
      const gradientLine = new Rect({
        y: 0,

        x: pad,

        width: W - pad * 2,

        height: 6,

        fill: primaryColor,

        cornerRadius: [14, 14, 0, 0],
      });

      card.add(gradientLine);
    }

    if (theme === "islamic") {
      
    }

    // ── Header ──

    if (theme !== "minimal" && theme !== "modern") {
      const header = new Rect({
        x: 0,

        y: 0,

        width: W ,

        height: 42,

        fill: headerBg,

        cornerRadius: theme === "islamic" ? [14, 14, 0, 0] : [14, 14, 0, 0],
      });

      card.add(header);
    }

    // Logo circle

    const logoY = 8;

    const logoSz = 26;

    const logoCircle = new Rect({
      x: 14 + pad,

      y: logoY,

      width: logoSz,

      height: logoSz,

      fill:
        theme === "minimal"
          ? primaryColor
          : theme === "islamic"
            ? "rgba(255,255,255,0.15)"
            : "rgba(255,255,255,0.2)",

      cornerRadius: 6,
    });

    card.add(logoCircle);

    const logoText = new Text({
      x: 14 + pad,

      y: logoY,

      width: logoSz,

      height: logoSz,

      text: "M",

      fontSize: 12,

      fill: theme === "minimal" ? "#fff" : "#fff",

      textAlign: "center",

      verticalAlign: "middle",

      fontWeight: "bold",
    });

    card.add(logoText);

    const headerTextColor = theme === "minimal" ? "#111827" : "#fff";

    const headerMutedColor =
      theme === "minimal" ? "#6b7280" : "rgba(255,255,255,0.7)";

    const madrasaLabel = new Text({
      x: 48 + pad,

      y: 9,

      text: madrasaName || "Madrasa Name",

      fontSize: 12,

      fill: headerTextColor,

      fontWeight: "bold",
    });

    card.add(madrasaLabel);

    const yearLabel = new Text({
      x: 48 + pad,

      y: 25,

      text: "2025-2026",

      fontSize: 9,

      fill: headerMutedColor,
    });

    card.add(yearLabel);

    // ID badge

    const badgeX = W - 50 - pad;

    
    

 
    // ── Body: Photo + Info ──

    // Photo placeholder

    const photoX = 14 + pad;

    const photoY = 52;

    const photoW = 58;

    const photoH = 74;

    const photoBg = new Rect({
      x: photoX,

      y: photoY,

      width: photoW,

      height: photoH,

      fill: theme === "islamic" ? "rgba(180,83,9,0.3)" : primaryColor + "22",

      cornerRadius: 8,
    });

    card.add(photoBg);

    const photoBorder = new Rect({
      x: photoX,

      y: photoY,

      width: photoW,

      height: photoH,

      fill: "transparent",

      cornerRadius: 8,

      stroke: theme === "islamic" ? "rgba(251,191,36,0.5)" : primaryColor,

      strokeWidth: 2,
    });

    card.add(photoBorder);

    // Avatar image or initials

    const avatarUrl = student ? avatars?.[student.id] : undefined;

    if (avatarUrl) {
      const avatarImg = new LeaferImage({
        url: avatarUrl,

        x: photoX,

        y: photoY,

        width: photoW,

        height: photoH,

        cornerRadius: 8,
      });

      card.add(avatarImg);
    } else {
      const initText = new Text({
        x: photoX,

        y: photoY,

        width: photoW,

        height: photoH - 14,

        text: initials(student.name),

        fontSize: 18,

        fill: theme === "islamic" ? "#fbbf24" : primaryColor,

        textAlign: "center",

        verticalAlign: "middle",

        fontWeight: "bold",
      });

      card.add(initText);

      const photoLabel = new Text({
        x: photoX,

        y: photoY + photoH - 14,

        width: photoW,

        height: 14,

        text: "PHOTO",

        fontSize: 7,

        fill: mutedColor,

        textAlign: "center",

        verticalAlign: "middle",
      });

      card.add(photoLabel);
    }

    // Info section

    const infoX = 82 + pad;

    let infoY = 52;

    const rowH = 15;

    const nameEl = new Text({
      x: infoX,

      y: infoY,

      text: student.name,

      fontSize: 13,

      fill: textColor,

      fontWeight: "bold",
    });

    card.add(nameEl);

    infoY += rowH + 2;

    // Class + Division subtitle

    const classEl = new Text({
      x: infoX,

      y: infoY,

      text: `${student.className}`,

      fontSize: 10,

      fill: primaryColor,

      fontWeight: "600",
    });

    card.add(classEl);

    infoY += rowH;

    // Fields

    const rows = [
      { icon: "■", text: `Adm: ${student.adno}`, color: mutedColor },

      {
        icon: "■",
        text: `DOB: ${student.dateOfBirth || "—"}`,
        color: mutedColor,
      },

      {
        icon: "■",
        text: `Guardian: ${student.guardianName || "—"}`,
        color: mutedColor,
      },

      {
        icon: "■",
        text: `Phone: ${student.parentPhone || "—"}`,
        color: mutedColor,
      },
    ];

    rows.forEach((r) => {
      const row = new Text({
        x: infoX,

        y: infoY,

        text: r.text,

        fontSize: 9.5,

        fill: mutedColor,
      });

      card.add(row);

      infoY += rowH - 1;
    });

    const barY = 168;

    // Class badge

    const badgeW = 50;

    const badgeEl = new Rect({
      x: W - 14 - pad - badgeW,

      y: barY,

      width: badgeW,

      height: 18,

      fill: primaryColor,

      cornerRadius: 6,
    });

    card.add(badgeEl);

    const badgeElText = new Text({
      x: W - 14 - pad - badgeW,

      y: barY,

      width: badgeW,

      height: 18,

      text: student.className || "Class",

      fontSize: 8,

      fill: "#fff",

      textAlign: "center",

      verticalAlign: "middle",

      fontWeight: "bold",
    });

    card.add(badgeElText);

    // Footer text

    const footerText = new Text({
      x: 14 + pad,

      y: 192,

      text: "Madrasa Address · Phone: 0495-XXXXXX",

      fontSize: 7.5,

      fill: mutedColor,
    });

    card.add(footerText);

    leafer.add(card);

    return () => {
      leafer.destroy();
    };
  }, [student, theme, bgImage, madrasaName, avatars]);

  return null;
}

function filterStudents(
  students: StudentInfo[],

  search: string,

  classFilter: string,

  genderFilter: string,
) {
  return students.filter((s) => {
    const matchSearch =
      !search ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.adno.toLowerCase().includes(search.toLowerCase());

    const matchClass =
      !classFilter || classFilter === "All" || s.className === classFilter;

    const matchGender =
      !genderFilter || genderFilter === "All" || s.gender === genderFilter;

    return matchSearch && matchClass && matchGender;
  });
}

export default function IDCardsPage() {
  const { lang } = useLanguageStore();

  const { user, accessToken, activeClientId } = useAuthStore();

  const cid = activeClientId ?? "";

  const token = accessToken ?? "";

  const madrasaName = user?.madrasaName;

  const canvasRef = useRef<HTMLDivElement>(null);

  const [students, setStudents] = useState<StudentInfo[]>([]);

  const [classes, setClasses] = useState<ClassRecord[]>([]);

  const [loading, setLoading] = useState(true);

  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [search, setSearch] = useState("");

  const [classFilter, setClassFilter] = useState("All");

  const [genderFilter, setGenderFilter] = useState("All");

  const [theme, setTheme] = useState<ThemeId>("classic");

  const [showMobileList, setShowMobileList] = useState(false);

  const [bgImage, setBgImage] = useState<string | null>(null);

  const [avatars, setAvatars] = useState<Record<string, string>>({});

  const selected = useMemo(
    () => students.find((s) => s.id === selectedId) ?? null,

    [students, selectedId],
  );

  const filtered = useMemo(
    () => filterStudents(students, search, classFilter, genderFilter),

    [students, search, classFilter, genderFilter],
  );

  const classNames = useMemo(
    () => ["All", ...classes.map((c) => c.name).sort()],

    [classes],
  );

  useEffect(() => {
    if (!cid || !token) return;

    const ac = new AbortController();

    setLoading(true);

    Promise.all([
      getStudents(cid, token, { limit: 500, signal: ac.signal }).catch(() => ({
        data: [] as StudentRecord[],
        total: 0,
        page: 1,
        limit: 500,
      })),

      getAllClasses(cid, token, ac.signal).catch(() => [] as ClassRecord[]),
    ]).then(([stuData, classData]) => {
      const mapped: StudentInfo[] = (stuData.data ?? []).map((s) => ({
        id: s.id,

        name: s.name,

        adno: s.adno,

        gender: s.gender ?? "",

        dateOfBirth: s.dateOfBirth
          ? new Date(s.dateOfBirth).toLocaleDateString("en-GB")
          : "",

        parentPhone: s.parentPhone ?? "",

        guardianName: s.guardianName ?? "",

        className: s.class?.name ?? "",
      }));

      setStudents(mapped);

      setClasses(classData);

      if (mapped.length > 0 && !selectedId) {
        setSelectedId(mapped[0].id);
      }

      setLoading(false);
    });

    return () => ac.abort();
  }, [cid, token]);

  const handleExport = async () => {
    const canvas = canvasRef.current?.querySelector("canvas");

    if (!canvas) return;

    const link = document.createElement("a");

    link.download = `id-card-${selected?.name?.replace(/\s+/g, "-") || "student"}.png`;

    link.href = canvas.toDataURL("image/png");

    link.click();
  };

  const currentTheme = THEMES.find((t) => t.id === theme)!;

  return (
    <DashboardLayout>
      <PageHeader
        title={t("adminPages", "idCardsTitle", lang)}
        subtitle={`${students.length} ${t("common", "students", lang)} · ${classes.length} ${t("adminPages", "idCardsSubtitle", lang)}`}
        icon={CreditCard}
        action={
          <div className="flex gap-2">
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700"
            >
              <Download className="w-4 h-4" /> {t("common", "download", lang)}
            </button>
          </div>
        }
      />

      {/* Theme selector */}

      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
     
     
        {THEMES.map((t) => (
          <button
            key={t.id}
            onClick={() => setTheme(t.id)}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold whitespace-nowrap border transition-all shrink-0",

              theme === t.id
                ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                : "border-gray-200 bg-white text-gray-600 hover:border-gray-300",
            )}
          >
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: t.color }}
            />

            {t.label}
          </button>
        ))}
      </div>

      {/* Background image upload */}

      <div className="flex items-center gap-3 mb-4">
        <label className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 cursor-pointer hover:border-gray-300">
          <ImageIcon className="w-4 h-4" />

          {bgImage ? "Change Background" : "Upload Background"}

          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];

              if (file) {
                const reader = new FileReader();

                reader.onload = () => setBgImage(reader.result as string);

                reader.readAsDataURL(file);
              }
            }}
          />
        </label>

        {bgImage && (
          <button
            onClick={() => setBgImage(null)}
            className="p-2 text-gray-400 hover:text-red-500 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Mobile toggle for student list */}

      <button
        onClick={() => setShowMobileList(!showMobileList)}
        className="w-full lg:hidden flex items-center gap-2 px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 mb-4"
      >
        <Filter className="w-4 h-4" />
        {showMobileList ? "Hide" : "Show"} Students ({filtered.length})
        <ChevronDown
          className={cn(
            "w-4 h-4 ml-auto transition-transform",

            showMobileList && "rotate-180",
          )}
        />
      </button>

      <div className="flex gap-5">
        {/* Left sidebar: filters + student list */}

        <div
          className={cn(
            "w-full lg:w-80 shrink-0 lg:block",

            showMobileList ? "block" : "hidden",
          )}
        >
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
            {/* Filters */}

            <div className="p-4 border-b border-gray-100 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />

                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t("common", "searchByName", lang)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>

              <div className="flex gap-2">
                <select
                  value={classFilter}
                  onChange={(e) => setClassFilter(e.target.value)}
                  className="flex-1 px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 appearance-none cursor-pointer"
                >
                  {classNames.map((c) => (
                    <option key={c} value={c}>
                      {c === "All" ? "All Classes" : c}
                    </option>
                  ))}
                </select>

                <select
                  value={genderFilter}
                  onChange={(e) => setGenderFilter(e.target.value)}
                  className="flex-1 px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 appearance-none cursor-pointer"
                >
                  <option value="All">All</option>

                  <option value="MALE">Male</option>

                  <option value="FEMALE">Female</option>
                </select>
              </div>

              <p className="text-xs text-gray-400">
                {filtered.length} of {students.length} students
              </p>
            </div>

            {/* Student list */}

            <div className="overflow-y-auto max-h-[580px]">
              {loading ? (
                <div className="p-8 text-center text-sm text-gray-400">
                  Loading...
                </div>
              ) : filtered.length === 0 ? (
                <div className="p-8 text-center text-sm text-gray-400">
                  {t("common", "noResults", lang)}
                </div>
              ) : (
                filtered.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      setSelectedId(s.id);

                      setShowMobileList(false);
                    }}
                    className={cn(
                      "w-full text-left px-4 py-3 flex items-center gap-3 border-b border-gray-50 hover:bg-gray-50 transition-colors",

                      selectedId === s.id && "bg-emerald-50",
                    )}
                  >
                    <div
                      className={cn(
                        "w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0",

                        selectedId === s.id ? "bg-emerald-500" : "bg-gray-300",
                      )}
                    >
                      {initials(s.name)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "text-sm font-semibold truncate",

                          selectedId === s.id
                            ? "text-emerald-700"
                            : "text-gray-900",
                        )}
                      >
                        {s.name}
                      </p>

                      <p className="text-xs text-gray-400 truncate">
                        {s.adno} · {s.className}
                      </p>
                    </div>

                    <span className="text-[10px] text-gray-400 shrink-0 capitalize">
                      {s.gender?.toLowerCase()}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Theme preview mini card - desktop only */}

          <div className="hidden lg:block mt-4 bg-white border border-gray-200 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <CreditCard className="w-4 h-4 text-gray-400" />

              <p className="text-xs font-semibold text-gray-500">
                Active Theme
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span
                className="w-4 h-4 rounded-full shrink-0"
                style={{ backgroundColor: currentTheme.color }}
              />

              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900">
                  {currentTheme.label}
                </p>

                <p className="text-xs text-gray-400">Current selection</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main area: Canvas */}

        <div className="flex-1 min-w-0">
          <div className="bg-white border border-gray-200 rounded-2xl p-6 flex flex-col items-center">
            {!selected ? (
              <div className="py-16 text-center text-gray-400">
                <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-40" />

                <p className="text-sm">
                  {loading
                    ? "Loading students..."
                    : "Select a student to generate ID card"}
                </p>
              </div>
            ) : (
              <>
                <p className="text-sm font-semibold text-gray-700 mb-4">
                  {selected.name} · {selected.adno}
                </p>

                <div
                  ref={canvasRef}
                  className="rounded-2xl shadow-lg border border-gray-200"
                  style={{
                    width: 340,

                    height: 210,
                  }}
                >
                  <CardCanvas
                    student={selected}
                    theme={theme}
                    containerRef={canvasRef}
                    bgImage={bgImage}
                    madrasaName={madrasaName}
                    avatars={avatars}
                  />
                </div>

                {/* Avatar upload */}

                <div className="mt-3 flex items-center gap-2">
                  <label className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 cursor-pointer hover:border-gray-300 transition-colors">
                    <Upload className="w-4 h-4" />

                    {avatars[selected.id] ? "Change Photo" : "Upload Photo"}

                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];

                        if (file) {
                          const reader = new FileReader();

                          reader.onload = () => {
                            setAvatars((prev) => ({
                              ...prev,
                              [selected.id]: reader.result as string,
                            }));
                          };

                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>

                  {avatars[selected.id] && (
                    <button
                      onClick={() => {
                        setAvatars((prev) => {
                          const next = { ...prev };

                          delete next[selected.id];

                          return next;
                        });
                      }}
                      className="text-xs text-red-500 hover:text-red-700 transition-colors"
                    >
                      Remove
                    </button>
                  )}
                </div>

                {/* Student info footer */}

                <div className="mt-4 grid grid-cols-3 gap-4 w-full max-w-md text-center">
                  <div>
                    <p className="text-[10px] text-gray-400">Class</p>

                    <p className="text-sm font-bold text-gray-900">
                      {selected.className || "—"}
                    </p>
                  </div>

                  <div>
                    <p className="text-[10px] text-gray-400">Gender</p>

                    <p className="text-sm font-bold capitalize text-gray-900">
                      {selected.gender?.toLowerCase() || "—"}
                    </p>
                  </div>

                  <div>
                    <p className="text-[10px] text-gray-400">DOB</p>

                    <p className="text-sm font-bold text-gray-900">
                      {selected.dateOfBirth || "—"}
                    </p>
                  </div>
                </div>

                {/* Action buttons */}

                <div className="mt-4 flex gap-3">
                  <button
                    onClick={handleExport}
                    className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700"
                  >
                    <Download className="w-4 h-4" /> Download PNG
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
