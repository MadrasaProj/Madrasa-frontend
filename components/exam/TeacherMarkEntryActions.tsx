import { useEffect, useState } from "react";
import { Ellipsis, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { ResponsivePopover } from "@/components/ui/responsivePopover";
import { ClassResultTable } from "@/components/exam/ClassResultTable";
import type { ClassReport } from "@/lib/results-api";
import { loadLiveClassReport } from "@/lib/live-class-report";
import { t, type Lang } from "@/lib/i18n";

interface TeacherMarkEntryActionsProps {
  clientId: string;
  token: string;
  examId: string;
  examName: string;
  examType: string;
  classId: string;
  className: string;
  subjectId?: string;
  lang: Lang;
  saving: boolean;
  saved: boolean;
  isLocked: boolean;
  hasEnteredScores: boolean;
  saveDisabled: boolean;
  importDisabled: boolean;
  resetDisabled: boolean;
  onSave: () => Promise<boolean>;
  onImport: () => void;
  onReset: () => void;
}

export function TeacherMarkEntryActions({
  clientId, token, examId, examName, examType, classId, className, subjectId, lang,
  saving, saved, isLocked, hasEnteredScores, saveDisabled, importDisabled, resetDisabled,
  onSave, onImport, onReset,
}: TeacherMarkEntryActionsProps) {
  const [moreOpen, setMoreOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportSaving, setReportSaving] = useState(false);
  const [report, setReport] = useState<ClassReport | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [reportRequest, setReportRequest] = useState(0);
  const [reportControlsContainer, setReportControlsContainer] = useState<HTMLDivElement | null>(null);

  const openReport = async () => {
    if (reportSaving) return;
    if (isLocked || !hasEnteredScores) {
      setReportOpen(true);
      return;
    }
    setReportSaving(true);
    try {
      if (await onSave()) setReportOpen(true);
    } finally {
      setReportSaving(false);
    }
  };

  useEffect(() => {
    if (!reportOpen || !clientId || !token || !examId || !classId) return;
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
  }, [reportOpen, reportRequest, clientId, token, examId, examName, examType, classId, className, subjectId]);

  return (
    <>
      <div className="border-t border-gray-200 bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6">
        <ButtonGroup aria-label="Mark entry actions" className="ml-auto w-full sm:w-auto">
          <Button type="button" variant="outline" size="icon-lg" aria-label={t("common", "actions", lang)} title={t("common", "actions", lang)} onClick={() => setMoreOpen(true)}>
            <Ellipsis aria-hidden="true" />
          </Button>
          <Button type="button" variant="outline" size="lg" className="flex-1 sm:flex-none" disabled={!examId || !classId || (examType === "CLASS_TEST" && !subjectId) || reportSaving || (!isLocked && saveDisabled)} onClick={() => { void openReport(); }}>
            {reportSaving ? <Loader2 aria-hidden="true" className="animate-spin" /> : <FileText aria-hidden="true" />}
            {t("teacherPages", "report", lang)}
          </Button>
          <Button type="button" size="lg" className="flex-1 sm:flex-none" disabled={saveDisabled || reportSaving} onClick={() => { void onSave(); }}>
            {saving && <Loader2 aria-hidden="true" className="animate-spin" />}
            {saving ? "Saving…" : saved ? "Saved" : t("common", "save", lang)}
          </Button>
        </ButtonGroup>
      </div>

      <ResponsivePopover
        open={moreOpen}
        onOpenChange={setMoreOpen}
        side="bottom"
        title={t("common", "actions", lang)}
        className="mx-auto w-full max-w-md rounded-t-2xl"
      >
        <div className="grid gap-2 p-4">
          <Button type="button" variant="outline" className="w-full justify-start" disabled={importDisabled} onClick={() => { setMoreOpen(false); onImport(); }}>
            Import
          </Button>
          <Button type="button" variant="outline" className="w-full justify-start" disabled={resetDisabled} onClick={() => { setMoreOpen(false); onReset(); }}>
            Reset
          </Button>
          <Button type="button" variant="outline" className="w-full justify-start" disabled={saveDisabled || reportSaving} onClick={() => { setMoreOpen(false); void onSave(); }}>
            Save as Draft
          </Button>
        </div>
      </ResponsivePopover>

      <ResponsivePopover
        open={reportOpen}
        onOpenChange={setReportOpen}
        fullHeight
        onBack={() => setReportOpen(false)}
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
    </>
  );
}
