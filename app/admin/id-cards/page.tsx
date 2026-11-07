"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Download, Loader2, Search } from "lucide-react";

import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/PageHeader";
import { getClientConfig } from "@/lib/config-api";
import { t } from "@/lib/i18n";
import { getStudents, type StudentRecord } from "@/lib/students-api";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth";
import { useLanguageStore } from "@/store/language";

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export default function AdminIdCardsPage() {
  const { lang } = useLanguageStore();
  const { user, accessToken, activeClientId } = useAuthStore();
  const cardRef = useRef<HTMLDivElement>(null);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("All");
  const [genderFilter, setGenderFilter] = useState("All");
  const [madrasaName, setMadrasaName] = useState(user?.madrasaName ?? "Madrasa");
  const [logoUrl, setLogoUrl] = useState(user?.madrasaLogo ?? "/icons/icon.svg");
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState(false);

  const clientId = activeClientId ?? user?.clientId ?? "";
  const token = accessToken ?? "";

  useEffect(() => {
    if (!clientId || !token) {
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    setIsLoading(true);

    Promise.all([
      getStudents(clientId, token, { limit: 500, signal: controller.signal }),
      getClientConfig(clientId, token).catch(() => null),
    ])
      .then(([response, config]) => {
        setStudents(response.data ?? []);
        setSelectedId((current) => current || response.data?.[0]?.id || "");
        if (config?.name) setMadrasaName(config.name);
        if (config?.logo) setLogoUrl(config.logo);
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        console.error("[admin-id-cards] failed to load:", error);
        setStudents([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, [clientId, token]);

  const filteredStudents = useMemo(() => {
    const query = search.trim().toLowerCase();
    return students.filter((student) => {
      const matchesSearch =
        !query ||
        student.name.toLowerCase().includes(query) ||
        student.adno.toLowerCase().includes(query) ||
        student.class?.name.toLowerCase().includes(query);
      const matchesClass = classFilter === "All" || student.class?.name === classFilter;
      const matchesGender = genderFilter === "All" || student.gender === genderFilter;
      return matchesSearch && matchesClass && matchesGender;
    });
  }, [classFilter, genderFilter, search, students]);

  const classNames = useMemo(
    () => ["All", ...Array.from(new Set(students.map((item) => item.class?.name).filter(Boolean) as string[])).sort()],
    [students],
  );

  const student = students.find((item) => item.id === selectedId) ?? null;
  const photoUrl = student?.photoUrl ?? student?.photo;
  const dateOfBirth = student?.dateOfBirth
    ? new Date(student.dateOfBirth).toLocaleDateString("en-GB")
    : "—";

  async function handleDownload() {
    if (!cardRef.current || !student || isDownloading) return;

    setIsDownloading(true);
    setDownloadError(false);
    try {
      const html2canvas = (await import("html2canvas-pro")).default;
      const canvas = await html2canvas(cardRef.current, {
        scale: 3,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
      });
      const link = document.createElement("a");
      link.download = `id-card-${student.name.trim().replace(/\s+/g, "-")}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (error) {
      console.error("[admin-id-cards] download failed:", error);
      setDownloadError(true);
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <DashboardLayout>
      <PageHeader
        title={t("adminPages", "idCardsTitle", lang)}
        subtitle={`${students.length} ${t("common", "students", lang)}`}
      />

      <div className="grid gap-6 pt-8 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <div className="border-b border-gray-100 p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t("common", "searchByName", lang)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
              />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <select
                value={classFilter}
                onChange={(event) => setClassFilter(event.target.value)}
                className="min-w-0 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-primary-500"
              >
                {classNames.map((className) => (
                  <option key={className} value={className}>{className === "All" ? "All Classes" : className}</option>
                ))}
              </select>
              <select
                value={genderFilter}
                onChange={(event) => setGenderFilter(event.target.value)}
                className="min-w-0 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-primary-500"
              >
                <option value="All">All Genders</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
              </select>
            </div>
          </div>

          <div className="max-h-[590px] overflow-y-auto">
            {isLoading ? (
              <div className="p-8 text-center text-sm text-gray-400">{t("common", "loading", lang)}</div>
            ) : filteredStudents.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-400">{t("common", "noResults", lang)}</div>
            ) : (
              filteredStudents.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedId(item.id)}
                  className={cn(
                    "flex w-full items-center gap-3 border-b border-gray-50 px-4 py-3 text-left transition-colors hover:bg-gray-50",
                    selectedId === item.id && "bg-primary-50",
                  )}
                >
                  <div className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white",
                    selectedId === item.id ? "bg-primary-500" : "bg-gray-300",
                  )}>
                    {initials(item.name)}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-gray-900">{item.name}</p>
                    <p className="truncate text-xs text-gray-400">{item.adno} · {item.class?.name || "—"}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </aside>

        <section className="flex min-h-[590px] flex-col items-center rounded-2xl border border-gray-200 bg-white p-6">
          {!student ? (
            <div className="flex flex-1 items-center justify-center text-sm text-gray-400">
              {isLoading ? t("common", "loading", lang) : t("common", "noResults", lang)}
            </div>
          ) : (
            <>
              <div className="w-full overflow-x-auto pb-10 pt-5">
                <div
                  ref={cardRef}
                  className="relative mx-auto h-[85.6mm] w-[54mm] overflow-hidden rounded-[14px] bg-white shadow-[0_12px_28px_rgba(15,45,57,0.18)]"
                >
                  <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
                    <div className="absolute left-1/2 top-[-217px] h-[400px] w-[360px] -translate-x-1/2 rounded-full bg-[#d4f5f3]" />
                    <div className="absolute left-1/2 top-[-229px] h-[400px] w-[360px] -translate-x-1/2 rounded-full bg-[#35c4cc]" />
                    <div className="absolute left-1/2 top-[-241px] h-[400px] w-[360px] -translate-x-1/2 rounded-full bg-[#117b8f]" />
                    <div className="absolute left-1/2 top-[-259px] h-[400px] w-[360px] -translate-x-1/2 rounded-full bg-[#19445b]" />
                  </div>

                  <div className="absolute inset-x-3 top-[22px] z-10 flex flex-col items-center text-center text-white">
                    <img
                      src={logoUrl}
                      alt=""
                      className={cn("h-7 w-8 object-contain", logoUrl === "/icons/icon.svg" && "brightness-0 invert")}
                    />
                    <p className="mt-2 line-clamp-2 text-[11px] font-extrabold uppercase leading-[12px] tracking-wide">{madrasaName}</p>
                    <p className="mt-0.5 text-[7px] font-medium tracking-[0.2em] text-white/80">STUDENT ID CARD</p>
                  </div>

                  <div className="absolute left-1/2 top-[94px] z-20 flex h-[90px] w-[82px] -translate-x-1/2 items-center justify-center overflow-hidden rounded-[18px] border-[4px] border-white bg-[#d7eef0] text-2xl font-bold text-[#19445b] shadow-[0_3px_9px_rgba(12,45,59,0.24)]">
                    {photoUrl ? <img src={photoUrl} alt={student.name} className="h-full w-full object-cover" /> : initials(student.name)}
                  </div>

                  <div className="absolute inset-x-3 top-[190px] text-center">
                    <p className="line-clamp-2 text-[16px] font-extrabold uppercase leading-[17px] text-[#27333a]">{student.name}</p>
                    <p className="mt-0.5 truncate text-[9px] font-medium text-[#158b9a]">{student.class?.name || "—"}</p>
                  </div>

                  <dl className="absolute inset-x-5 top-[239px] grid grid-cols-[58px_minmax(0,1fr)] gap-y-0.5 text-[9px] leading-[13px] text-[#3d454b]">
                    <dt>ID NO</dt><dd className="truncate">: {student.adno || "—"}</dd>
                    <dt>CLASS</dt><dd className="truncate">: {student.class?.name || "—"}</dd>
                    <dt>GUARDIAN</dt><dd className="truncate">: {student.guardianName || "—"}</dd>
                    <dt>DOB</dt><dd className="truncate">: {dateOfBirth}</dd>
                    <dt>PHONE</dt><dd className="truncate">: {student.parentPhone || "—"}</dd>
                  </dl>
                </div>
              </div>

              <Button type="button" onClick={handleDownload} disabled={isDownloading} size="lg">
                {isDownloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                {t("parentPages", "downloadPng", lang)}
              </Button>
              {downloadError && <p role="alert" className="mt-3 text-sm text-red-600">Could not download the ID card. Please try again.</p>}
            </>
          )}
        </section>
      </div>
    </DashboardLayout>
  );
}
