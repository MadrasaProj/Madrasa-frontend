import { useState } from "react";
import { DatePickerDrawer } from "@/components/DatePickerDrawer";
import { DrawerSelector } from "@/components/DrawerSelector";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ResponsivePopover } from "@/components/ui/responsivePopover";
import { Textarea } from "@/components/ui/textarea";
import { t, type Lang } from "@/lib/i18n";
import type { SubjectRecord } from "@/lib/subjects-api";
import { Calendar, Check, Loader2, Plus } from "lucide-react";

interface HomeworkAssignmentDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  lang: Lang;
  isPeriodBased: boolean;
  classSubjects: SubjectRecord[];
  classId: string;
  subjectId: string;
  onSubjectChange: (subjectId: string) => void;
  title: string;
  onTitleChange: (title: string) => void;
  description: string;
  onDescriptionChange: (description: string) => void;
  dueDate: string;
  onDueDateChange: (date: string) => void;
  today: string;
  busy: boolean;
  onSubmit: () => void;
}

export function HomeworkAssignmentDrawer({
  open,
  onOpenChange,
  mode,
  lang,
  isPeriodBased,
  classSubjects,
  classId,
  subjectId,
  onSubjectChange,
  title,
  onTitleChange,
  description,
  onDescriptionChange,
  dueDate,
  onDueDateChange,
  today,
  busy,
  onSubmit,
}: HomeworkAssignmentDrawerProps) {
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const isCreate = mode === "create";
  const subjectPlaceholder = classSubjects.length === 0
    ? isCreate && !classId
      ? t("teacherPages", "noAccessibleClasses", lang)
      : isCreate
        ? t("teacherPages", isPeriodBased ? "noSubjectsAssigned" : "noSubjectsInClass", lang)
        : t("teacherPages", "noSubjectsAvail", lang)
    : t("teacherPages", "selectSubjectOpt", lang);

  return (
    <ResponsivePopover
      open={open}
      onOpenChange={onOpenChange}
      title={t("teacherPages", isCreate ? "newHomeworkTitle" : "editAssignmentTitle", lang)}
      description={isCreate ? t("teacherPages", "newHomeworkDesc", lang) : undefined}
    >
      <div className="space-y-4 p-5 pb-8">
        <div>
          <p className="mb-1.5 block text-xs font-semibold text-gray-500">
            {t("teacherPages", "subjectRequired", lang)}
            {isPeriodBased && isCreate && <span className="ml-1 font-normal text-gray-400">{t("teacherPages", "yourSubjectsHint", lang)}</span>}
          </p>
          <DrawerSelector
            title={t("teacherPages", "subjectRequired", lang)}
            options={classSubjects.map((subject) => ({ value: subject.id, label: subject.name }))}
            value={subjectId}
            onChange={onSubjectChange}
            placeholder={subjectPlaceholder}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-gray-500">{t("teacherPages", "titleRequired", lang)}</label>
          <Input size="lg" value={title} onChange={(event) => onTitleChange(event.target.value)} placeholder={t("teacherPages", "titlePlaceholder", lang)} />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-gray-500">{t("teacherPages", "descOptional", lang)}</label>
          <Textarea size="lg" value={description} onChange={(event) => onDescriptionChange(event.target.value)} rows={3} placeholder={t("teacherPages", "descPlaceholder", lang)} />
        </div>

        <div>
          <p className="mb-1.5 block text-xs font-semibold text-gray-500">{t("teacherPages", "dueDateRequired", lang)}</p>
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="h-11 w-full justify-start font-normal shadow-none!"
            aria-haspopup="dialog"
            aria-expanded={datePickerOpen}
            onClick={() => setDatePickerOpen(true)}
          >
            <Calendar className="text-muted-foreground" />
            {dueDate
              ? new Date(`${dueDate}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
              : t("teacherPages", "dueDateRequired", lang)}
          </Button>
          <DatePickerDrawer
            open={datePickerOpen}
            onOpenChange={setDatePickerOpen}
            date={dueDate}
            onDateChange={onDueDateChange}
            title={t("teacherPages", "dueDateRequired", lang)}
            minDate={today}
            disableFuture={false}
          />
        </div>

        <Button
          onClick={onSubmit}
          disabled={!(isCreate ? classId : true) || !subjectId || !title || !dueDate || busy}
          size="lg"
          className="w-full"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : isCreate ? <Plus className="h-4 w-4" /> : <Check className="h-4 w-4" />}
          {t("teacherPages", isCreate ? "createAssignmentBtn" : "saveChangesBtn", lang)}
        </Button>
      </div>
    </ResponsivePopover>
  );
}
