import { useState } from "react";
import { Ellipsis, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { ResponsivePopover } from "@/components/ui/responsivePopover";
import { TeacherClassReportPopover } from "@/components/exam/TeacherClassReportPopover";
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

      <TeacherClassReportPopover
        open={reportOpen}
        onOpenChange={setReportOpen}
        clientId={clientId}
        token={token}
        examId={examId}
        examName={examName}
        examType={examType}
        classId={classId}
        className={className}
        subjectId={subjectId}
        lang={lang}
      />
    </>
  );
}
