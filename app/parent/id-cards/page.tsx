"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { DashboardLayout } from "@/components/DashboardLayout";

import { PageHeader } from "@/components/ui/PageHeader";

import { useAuthStore } from "@/store/auth";

import { useLanguageStore } from "@/store/language";

import { t } from "@/lib/i18n";

import {
  CreditCard,
  Download,
  ChevronDown,
  Filter,
  AlertCircle,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";

import { Group, Leafer, Image as LeaferImage, Rect, Text } from "leafer-ui";

import { Platform } from "@leafer/platform";

import { useClientConfig } from "@/lib/queries";

// ── Disable CORS on leafer image loads ─────────────────────────────────────────
// By default leafer sets `crossOrigin="anonymous"` on the underlying
// HTMLImageElement, which requires the storage host (R2) to return
// `Access-Control-Allow-Origin` on the response. The pre-signed URLs we
// receive from the backend expire quickly and the bucket-level CORS rule
// is not always reliably applied on the *response* itself, so the image
// load rejects silently and the avatar never paints.
// Setting this to an empty string makes leafer skip the `crossOrigin`
// attribute, so the image loads without CORS. The canvas becomes "tainted"
// as a side-effect, which is fine for display. Export (`leafer.export()`)
// will fail with a SecurityError in that case — handled in `handleExport`.
// The type is `IImageCrossOrigin = "anonymous" | "use-credentials"`; we
// widen to the type to bypass the literal check.
(Platform.image as { crossOrigin: string }).crossOrigin = "";

const THEME_KEYS: Record<string, string> = {
  classic: "classicGreen",
  modern: "modernDark",
  minimal: "minimalWhite",
  islamic: "islamicGold",
};

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
  photoUrl,
  clientConfig,
}: {
    student: { id: string; name: string; adno: string; className: string; parentPhone: string; guardianName: string; dateOfBirth: string; gender: string };
  theme: ThemeId;
  containerRef: React.RefObject<HTMLDivElement | null>;
  bgImage?: string | null;
  madrasaName?: string;
  photoUrl?: string | null;
  clientConfig?: { address?: string | null; phone?: string | null } | null;
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
    (el as any).__leafer = leafer;

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
    const cardBg = theme === "minimal" ? "#ffffff" : isDark ? "#1e293b" : "#ffffff";
    const headerBg = theme === "minimal" ? "#ffffff" : primaryColor;

    const cardShadow = new Rect({
      x: 2, y: 2, width: W, height: H,
      fill: "rgba(0,0,0,0.08)", cornerRadius: 16,
    });
    card.add(cardShadow);

    const bg = new Rect({
      width: W, height: H, fill: cardBg, cornerRadius: 14,
      stroke: theme === "minimal" ? "#e5e7eb" : "transparent",
      strokeWidth: theme === "minimal" ? 1 : 0,
    });
    card.add(bg);

    if (bgImage) {
      const bgImg = new LeaferImage({
        url: bgImage, width: W, height: H, cornerRadius: 14,
      });
      card.add(bgImg);
    }

    if (theme === "islamic") {
      const border = new Rect({
        width: W, height: H, fill: "transparent", cornerRadius: 14,
        stroke: "rgba(251,191,36,0.3)", strokeWidth: 2,
      });
      card.add(border);
    }

    if (theme === "modern") {
      const gradientLine = new Rect({
        y: 0, x: pad, width: W - pad * 2, height: 6,
        fill: primaryColor, cornerRadius: [14, 14, 0, 0],
      });
      card.add(gradientLine);
    }

    if (theme !== "minimal" && theme !== "modern") {
      const header = new Rect({
        x: 0, y: 0, width: W, height: 42,
        fill: headerBg,
        cornerRadius: theme === "islamic" ? [14, 14, 0, 0] : [14, 14, 0, 0],
      });
      card.add(header);
    }

    const logoY = 8;
    const logoSz = 26;
    const logoCircle = new Rect({
      x: 14 + pad, y: logoY, width: logoSz, height: logoSz,
      fill: theme === "minimal" ? primaryColor : theme === "islamic" ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.2)",
      cornerRadius: 6,
    });
    card.add(logoCircle);

    const logoText = new Text({
      x: 14 + pad, y: logoY, width: logoSz, height: logoSz,
      text: "M", fontSize: 12, fill: "#fff",
      textAlign: "center", verticalAlign: "middle", fontWeight: "bold",
    });
    card.add(logoText);

    const headerTextColor = theme === "minimal" ? "#111827" : "#fff";
    const headerMutedColor = theme === "minimal" ? "#6b7280" : "rgba(255,255,255,0.7)";

    const madrasaLabel = new Text({
      x: 48 + pad, y: 9,
      text: madrasaName || "Madrasa Name",
      fontSize: 12, fill: headerTextColor, fontWeight: "bold",
    });
    card.add(madrasaLabel);

    const yearLabel = new Text({
      x: 48 + pad, y: 25,
      text: "2025-2026", fontSize: 9, fill: headerMutedColor,
    });
    card.add(yearLabel);

    const photoX = 14 + pad;
    const photoY = 52;
    const photoW = 58;
    const photoH = 74;

    const photoBg = new Rect({
      x: photoX, y: photoY, width: photoW, height: photoH,
      fill: theme === "islamic" ? "rgba(180,83,9,0.3)" : primaryColor + "22",
      cornerRadius: 8,
    });
    card.add(photoBg);

    const photoBorder = new Rect({
      x: photoX, y: photoY, width: photoW, height: photoH,
      fill: "transparent", cornerRadius: 8,
      stroke: theme === "islamic" ? "rgba(251,191,36,0.5)" : primaryColor,
      strokeWidth: 2,
    });
    card.add(photoBorder);

    if (photoUrl) {
      // Avatar is rendered as a CSS <img> overlay on top of the leafer
      // canvas (see <div className="absolute"> in the parent component).
      // The card still draws the photoBg + photoBorder underneath so the
      // layout looks correct, and the export composites the avatar onto
      // the leafer PNG so the downloaded card has it too. This sidesteps
      // leafer's CORS-on-image-load which fails for R2 pre-signed URLs
      // even when bucket CORS is configured.
    } else {
      const initText = new Text({
        x: photoX, y: photoY, width: photoW, height: photoH - 14,
        text: initials(student.name), fontSize: 18,
        fill: theme === "islamic" ? "#fbbf24" : primaryColor,
        textAlign: "center", verticalAlign: "middle", fontWeight: "bold",
      });
      card.add(initText);

      const photoLabel = new Text({
        x: photoX, y: photoY + photoH - 14, width: photoW, height: 14,
        text: "PHOTO", fontSize: 7, fill: mutedColor,
        textAlign: "center", verticalAlign: "middle",
      });
      card.add(photoLabel);
    }

    const infoX = 82 + pad;
    let infoY = 52;
    const rowH = 15;

    const nameEl = new Text({
      x: infoX, y: infoY,
      text: student.name, fontSize: 13, fill: textColor, fontWeight: "bold",
    });
    card.add(nameEl);
    infoY += rowH + 2;

    const classEl = new Text({
      x: infoX, y: infoY,
      text: student.className, fontSize: 10, fill: primaryColor, fontWeight: "600",
    });
    card.add(classEl);
    infoY += rowH;

    const rows = [
      { icon: "■", text: `Adm: ${student.adno}`, color: mutedColor },
      { icon: "■", text: `DOB: ${student.dateOfBirth || "—"}`, color: mutedColor },
      { icon: "■", text: `Guardian: ${student.guardianName || "—"}`, color: mutedColor },
      { icon: "■", text: `Phone: ${student.parentPhone || "—"}`, color: mutedColor },
    ];

    rows.forEach((r) => {
      const row = new Text({
        x: infoX, y: infoY,
        text: r.text, fontSize: 9.5, fill: mutedColor,
      });
      card.add(row);
      infoY += rowH - 1;
    });

    const barY = 168;
    const badgeW = 50;
    const badgeEl = new Rect({
      x: W - 14 - pad - badgeW, y: barY, width: badgeW, height: 18,
      fill: primaryColor, cornerRadius: 6,
    });
    card.add(badgeEl);

    const badgeElText = new Text({
      x: W - 14 - pad - badgeW, y: barY, width: badgeW, height: 18,
      text: student.className || "Class", fontSize: 8, fill: "#fff",
      textAlign: "center", verticalAlign: "middle", fontWeight: "bold",
    });
    card.add(badgeElText);

    const footerText = new Text({
      x: 14 + pad, y: 192,
      text: [clientConfig?.address, clientConfig?.phone].filter(Boolean).join(" · ") || "Madrasa Address · Phone",
      fontSize: 7.5, fill: mutedColor,
    });
    card.add(footerText);

    leafer.add(card);

    return () => {
      (el as any).__leafer = undefined;
      leafer.destroy();
    };
  }, [student, theme, bgImage, madrasaName, photoUrl, clientConfig]);

  return null;
}

export default function ParentIdCardsPage() {
  const { lang } = useLanguageStore();
  const { user, accessToken, activeClientId } = useAuthStore();
  const cid = activeClientId ?? "";
  const token = accessToken ?? "";
  const madrasaName = user?.madrasaName;
  const canvasRef = useRef<HTMLDivElement>(null);

  const students = user?.accessibleStudents ?? [];

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [theme, setTheme] = useState<ThemeId>("classic");
  const [showMobileList, setShowMobileList] = useState(false);
  const [bgImage, setBgImage] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const { data: clientConfig } = useClientConfig({ clientId: cid, token });

  const selected = useMemo(
    () => students.find((s) => s.id === selectedId) ?? null,
    [students, selectedId],
  );

  // Memoize the student payload passed into <CardCanvas>. Without this the
  // inline object literal creates a new reference on every parent render,
  // which re-triggers the canvas useEffect and tears down the Leafer (and
  // any in-flight image load) before the avatar can render.
  const studentForCanvas = useMemo(
    () =>
      selected
        ? {
            id: selected.id,
            name: selected.name,
            adno: selected.adno,
            className: selected.className ?? "",
            parentPhone: selected.parentPhone ?? "",
            guardianName: selected.guardianName ?? "",
            dateOfBirth: selected.dateOfBirth
              ? new Date(selected.dateOfBirth).toLocaleDateString("en-GB")
              : "",
            gender: selected.gender ?? "",
          }
        : null,
    [selected],
  );

  useEffect(() => {
    if (students.length > 0 && !selectedId) {
      setSelectedId(students[0].id);
    }
  }, [students, selectedId]);

  const handleExport = async () => {
    const leafer = (canvasRef.current as any)?.__leafer as Leafer | undefined;
    if (!leafer) return;
    try {
      const dataUrl = await leafer.export("png", { quality: 1, pixelRatio: 5 });
      if (!dataUrl) return;

      // The avatar is rendered as a CSS <img> overlay (not via leafer, to
      // avoid CORS-on-image-load). Composite it onto the exported PNG so
      // the downloaded card shows the student photo.
      const avatarUrl = selected?.photoUrl ?? selected?.photo ?? null;
      const finalUrl = avatarUrl
        ? await compositeAvatarOntoCard(dataUrl.data, avatarUrl, 5)
        : dataUrl.data;

      const link = document.createElement("a");
      link.download = `id-card-${selected?.name?.replace(/\s+/g, "-") || "student"}.png`;
      link.href = finalUrl;
      link.click();
    } catch (err) {
      console.error("[id-cards] export failed:", err);
      setExportError(
        "Couldn't export the card. The student photo may be blocking it (CORS).",
      );
    }
  };

  // Composites the avatar <img> on top of the leafer-exported PNG.
  // Avatar position in CSS pixels: x=18, y=52, w=58, h=74, radius=8.
  async function compositeAvatarOntoCard(
    cardDataUrl: string,
    avatarUrl: string,
    scale: number,
  ): Promise<string> {
    const cardImg = await loadHtmlImage(cardDataUrl);
    const avatarImg = await loadHtmlImage(avatarUrl).catch(() => null);
    if (!avatarImg) return cardDataUrl;

    const canvas = document.createElement("canvas");
    canvas.width = cardImg.naturalWidth;
    canvas.height = cardImg.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return cardDataUrl;

    ctx.drawImage(cardImg, 0, 0);

    const x = 18 * scale;
    const y = 52 * scale;
    const w = 58 * scale;
    const h = 74 * scale;
    const r = 8 * scale;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatarImg, x, y, w, h);
    ctx.restore();

    return canvas.toDataURL("image/png");
  }

  function loadHtmlImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = (e) => reject(e);
      img.src = src;
    });
  }

  return (
    <DashboardLayout>
      <PageHeader
        title={t("parentPages", "idCardsTitle", lang)}
        subtitle={`${students.length} ${t("common", "students", lang)}`}
        icon={CreditCard}
        action={
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700"
          >
            <Download className="w-4 h-4" /> {t("common", "download", lang)}
          </button>
        }
      />

      {/* Theme selector */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {THEMES.map((th) => (
          <button
            key={th.id}
            onClick={() => setTheme(th.id)}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold whitespace-nowrap border transition-all shrink-0",
              theme === th.id
                ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                : "border-gray-200 bg-white text-gray-600 hover:border-gray-300",
            )}
          >
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: th.color }} />
            {t("adminPages", THEME_KEYS[th.id] as any, lang)}
          </button>
        ))}
      </div>

      {/* Background image upload */}
      <div className="flex items-center gap-3 mb-4">
        <label className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 cursor-pointer hover:border-gray-300">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          {bgImage ? t("parentPages", "changeBackground", lang) : t("parentPages", "uploadBackground", lang)}
          <input
            type="file" accept="image/*" className="hidden"
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
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        )}
      </div>

      {/* Mobile toggle */}
      <button
        onClick={() => setShowMobileList(!showMobileList)}
        className="w-full lg:hidden flex items-center gap-2 px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 mb-4"
      >
        <Filter className="w-4 h-4" />
        {showMobileList ? t("parentPages", "hideStudents", lang) : t("parentPages", "showStudents", lang)} ({students.length})
        <ChevronDown className={cn("w-4 h-4 ml-auto transition-transform", showMobileList && "rotate-180")} />
      </button>

      <div className="flex gap-5">
        {/* Student list sidebar */}
        <div className={cn("w-full lg:w-80 shrink-0 lg:block", showMobileList ? "block" : "hidden")}>
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {t("parentPages", "myChildren", lang)}
              </p>
            </div>
            <div className="overflow-y-auto max-h-[580px]">
              {students.length === 0 ? (
                <div className="p-8 text-center text-sm text-gray-400">
                  {t("common", "noResults", lang)}
                </div>
              ) : (
                students.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => { setSelectedId(s.id); setShowMobileList(false); }}
                    className={cn(
                      "w-full text-left px-4 py-3 flex items-center gap-3 border-b border-gray-50 hover:bg-gray-50 transition-colors",
                      selectedId === s.id && "bg-emerald-50",
                    )}
                  >
                    {s.photoUrl ? (
                      <img
                        src={s.photoUrl}
                        alt={s.name}
                        className="w-9 h-9 rounded-full object-cover shrink-0"
                      />
                    ) : (
                      <div className={cn(
                        "w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0",
                        selectedId === s.id ? "bg-emerald-500" : "bg-gray-300",
                      )}>
                        {initials(s.name)}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className={cn(
                        "text-sm font-semibold truncate",
                        selectedId === s.id ? "text-emerald-700" : "text-gray-900",
                      )}>
                        {s.name}
                      </p>
                      <p className="text-xs text-gray-400 truncate">
                        {s.adno}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Main canvas area */}
        <div className="flex-1 min-w-0">
          <div className="bg-white border border-gray-200 rounded-2xl p-6 flex flex-col items-center">
            {!selected ? (
              <div className="py-16 text-center text-gray-400">
                <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p className="text-sm">
                  {students.length === 0
                    ? t("parentPages", "noChildren", lang)
                    : t("parentPages", "selectStudentIdCard", lang)}
                </p>
              </div>
            ) : (
              <>
                <p className="text-sm font-semibold text-gray-700 mb-4">
                  {selected.name} · {selected.adno}
                </p>
                {exportError && (
                  <div className="mb-3 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-xs text-amber-800">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span className="flex-1">{exportError}</span>
                    <button
                      onClick={() => setExportError(null)}
                      className="text-amber-600 hover:text-amber-800"
                      aria-label="Dismiss"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
                <div
                  ref={canvasRef}
                  className="relative rounded-2xl shadow-lg border border-gray-200 overflow-hidden"
                  style={{ width: 340, height: 210 }}
                >
                  <CardCanvas
                    student={studentForCanvas!}
                    theme={theme}
                    containerRef={canvasRef}
                    bgImage={bgImage}
                    madrasaName={madrasaName}
                    photoUrl={selected.photoUrl ?? selected.photo ?? null}
                    clientConfig={clientConfig}
                  />
                  {/* Avatar overlay — see comment in CardCanvas for why this is a CSS <img> and not a LeaferImage. */}
                  {(selected.photoUrl ?? selected.photo) && (
                    <img
                      src={selected.photoUrl ?? selected.photo ?? ""}
                      alt=""
                      className="absolute pointer-events-none"
                      style={{
                        left: 18,
                        top: 52,
                        width: 58,
                        height: 74,
                        borderRadius: 8,
                        objectFit: "cover",
                      }}
                    />
                  )}
                </div>

                <div className="mt-4 grid grid-cols-3 gap-4 w-full max-w-md text-center">
                  <div>
                    <p className="text-[10px] text-gray-400">{t("parentPages", "classInfo", lang)}</p>
                    <p className="text-sm font-bold text-gray-900">
                      {selected.className || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400">{t("parentPages", "genderInfo", lang)}</p>
                    <p className="text-sm font-bold capitalize text-gray-900">
                      {selected.gender?.toLowerCase() || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400">{t("parentPages", "dobInfo", lang)}</p>
                    <p className="text-sm font-bold text-gray-900">
                      {selected.dateOfBirth
                        ? new Date(selected.dateOfBirth).toLocaleDateString("en-GB")
                        : "—"}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex gap-3">
                  <button
                    onClick={handleExport}
                    className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700"
                  >
                    <Download className="w-4 h-4" /> {t("parentPages", "downloadPng", lang)}
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
