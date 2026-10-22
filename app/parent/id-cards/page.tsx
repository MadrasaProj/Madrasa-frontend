"use client";

import { useRef, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { getParentStudents } from "@/lib/auth-api";
import { useClientConfig, useStudentProfileV2 } from "@/lib/queries";
import { t } from "@/lib/i18n";
import { useAuthStore } from "@/store/auth";
import { useLanguageStore } from "@/store/language";
import { Button } from "@/components/ui/button";

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export default function ParentIdCardsPage() {
  const { lang } = useLanguageStore();
  const { user, accessToken, activeClientId, activeStudentId } = useAuthStore();
  const cardRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState(false);

  const clientId = activeClientId ?? user?.clientId ?? "";
  const token = accessToken ?? "";
  const { data: fetchedStudents, isLoading: loadingStudents } = useQuery({
    queryKey: ["parentIdCardStudents", user?.id, clientId],
    queryFn: async () => (await getParentStudents(token)).data,
    enabled: !!user?.id && !!token,
  });
  const students = fetchedStudents?.length
    ? fetchedStudents
    : user?.accessibleStudents ?? [];
  const selectedId = activeStudentId ?? user?.accessibleStudentIds?.[0] ?? students[0]?.id;
  const listedStudent = students.find((item) => item.id === selectedId) ?? students[0];
  const { data: profile, isLoading: loadingProfile } = useStudentProfileV2(
    { clientId, token },
    selectedId ?? "",
    { enabled: !!selectedId && !listedStudent && !!clientId && !!token },
  );
  const student = listedStudent ?? (profile ? {
    id: profile.id,
    name: profile.name,
    adno: profile.adno,
    className: profile.class?.name ?? "",
    dateOfBirth: profile.dateOfBirth,
    guardianName: profile.guardianName,
    parentPhone: profile.parentPhone,
    photo: profile.photo,
    photoUrl: profile.photoUrl,
  } : null);
  const { data: clientConfig } = useClientConfig({
    clientId,
    token,
  });

  const madrasaName = clientConfig?.name ?? user?.madrasaName ?? "Madrasa";
  const logoUrl = clientConfig?.logo ?? user?.madrasaLogo ?? "/icons/icon.svg";
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
      console.error("[id-cards] download failed:", error);
      setDownloadError(true);
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <DashboardLayout>
      <PageHeader title={t("parentPages", "idCardsTitle", lang)} />
     <div className="pt-13">
        {!student ? (
        <div className="rounded-2xl border border-gray-200 bg-white px-6 py-16 text-center text-sm text-gray-500">
          {loadingStudents || loadingProfile
            ? t("common", "loading", lang)
            : user?.accessibleStudentIds?.length
              ? "Could not load this student's ID card. Please try again."
              : t("parentPages", "noChildren", lang)}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-5">
          <div className="w-full overflow-x-auto pb-20 mt-10">
            <div
              ref={cardRef}
              className="relative mx-auto h-[85.6mm] w-[54mm] overflow-hidden rounded-[14px]  shadow-[0_12px_28px_rgba(15,45,57,0.18)]"
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
                  className={`h-7 w-8 object-contain ${logoUrl === "/icons/icon.svg" ? "brightness-0 invert" : ""}`}
                />
                <p className="mt-2 line-clamp-2 text-[11px] font-extrabold uppercase leading-[12px] tracking-wide">
                  {madrasaName}
                </p>
                <p className="mt-0.5 text-[7px] font-medium tracking-[0.2em] text-white/80">STUDENT ID CARD</p>
              </div>

              <div className="absolute left-1/2 top-[94px] z-20 flex h-[90px] w-[82px] -translate-x-1/2 items-center justify-center overflow-hidden rounded-[18px] border-[4px] border-white bg-[#d7eef0] text-2xl font-bold text-[#19445b] shadow-[0_3px_9px_rgba(12,45,59,0.24)]">
                {photoUrl ? (
                  <img src={photoUrl} alt={student.name} className="h-full w-full object-cover" />
                ) : (
                  initials(student.name)
                )}
              </div>

              <div className="absolute inset-x-3 top-[190px] text-center">
                <p className="line-clamp-2 text-[16px] font-extrabold uppercase leading-[17px] text-[#27333a]">
                  {student.name}
                </p>
                <p className="mt-0.5 truncate text-[9px] font-medium text-[#158b9a]">{student.className || "—"}</p>
              </div>

              <dl className="absolute inset-x-5 top-[239px] grid grid-cols-[58px_minmax(0,1fr)] gap-y-0.5 text-[9px] leading-[13px] text-[#3d454b]">
                <dt>ID NO</dt><dd className="truncate">: {student.adno || "—"}</dd>
                <dt>CLASS</dt><dd className="truncate">: {student.className || "—"}</dd>
                <dt>GUARDIAN</dt><dd className="truncate">: {student.guardianName || "—"}</dd>
                <dt>DOB</dt><dd className="truncate">: {dateOfBirth}</dd>
                <dt>PHONE</dt><dd className="truncate">: {student.parentPhone || "—"}</dd>
              </dl>

            </div>
          </div>

          <Button
            type="button"
            onClick={handleDownload}
            disabled={isDownloading}
            size="lg"
            className=" "
          >
            {isDownloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {t("parentPages", "downloadPng", lang)}
          </Button>
          {downloadError && (
            <p role="alert" className="text-sm text-red-600">Could not download the ID card. Please try again.</p>
          )}
        </div>
      )}
     </div>
    </DashboardLayout>
  );
}
