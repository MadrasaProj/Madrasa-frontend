import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ResponsivePopover } from "@/components/ui/responsivePopover";
import { ClassResultTable } from "@/components/exam/ClassResultTable";
import type { ClassReport } from "@/lib/results-api";
import { loadLiveClassReport } from "@/lib/live-class-report";
import { t, type Lang } from "@/lib/i18n";

interface TeacherClassReportPopoverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  token: string;
  examId: string;
  examName: string;
  examType: string;
  classId: string;
  className: string;
  subjectId?: string;
  lang: Lang;
}

export function TeacherClassReportPopover({
  open, onOpenChange, clientId, token, examId, examName, examType, classId, className, subjectId, lang,
}: TeacherClassReportPopoverProps) {
  const [report, setReport] = useState<ClassReport | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [reportRequest, setReportRequest] = useState(0);
  const [reportControlsContainer, setReportControlsContainer] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open || !clientId || !token || !examId || !classId) return;
    let active = true;
    setReport(null);
    setReportError(null);
    setReportLoading(true);
    const loadReport = async () => {
      try {
        const { report: liveReport } = await loadLiveClassReport({
          clientId, token, examId, examName, examType, classId, className, subjectId,
        });
        if (active) setReport(liveReport);
      } catch (error) {
        if (active) setReportError(error instanceof Error ? error.message : "Could not load the class report.");
      } finally {
        if (active) setReportLoading(false);
      }
    };
    void loadReport();
    return () => { active = false; };
  }, [open, reportRequest, clientId, token, examId, examName, examType, classId, className, subjectId]);

  return (
    <ResponsivePopover
      open={open}
      onOpenChange={onOpenChange}
      fullHeight
      onBack={() => onOpenChange(false)}
      title={`${examName} · ${t("teacherPages", "report", lang)}`}
      footer={report && !reportLoading ? (
        <div ref={setReportControlsContainer} className="flex justify-end border-t border-gray-100 bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6" />
      ) : undefined}
      className="z-[60] md:max-w-none"
    >
      <div className="mx-auto w-full max-w-[1400px] px-4 py-5 sm:px-6">
        {reportLoading ? (
          <div role="status" className="flex items-center justify-center gap-2 py-16 text-sm text-gray-500">
            <Loader2 aria-hidden="true" className="size-5 animate-spin" />
            {t("common", "loading", lang)}
          </div>
        ) : reportError ? (
          <div role="alert" className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
            <p>{reportError}</p>
            <Button type="button" variant="outline" className="mt-3" onClick={() => setReportRequest((value) => value + 1)}>Retry</Button>
          </div>
        ) : report ? (
          <ClassResultTable report={report} madrasaName={report.clientName ?? ""} teacherView teacherControlsContainer={reportControlsContainer} />
        ) : null}
      </div>
    </ResponsivePopover>
  );
}
