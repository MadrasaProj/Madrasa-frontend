import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar as HomeworkCalendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ResponsivePopover } from "@/components/ui/responsivePopover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { ClassRecord } from "@/lib/classes-api";
import { t, type Lang } from "@/lib/i18n";
import type { SubjectRecord } from "@/lib/subjects-api";
import { Calendar, Check, Loader2, Plus } from "lucide-react";

interface HomeworkAssignmentDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  lang: Lang;
  isPeriodBased: boolean;
  classes: ClassRecord[];
  classSubjects: SubjectRecord[];
  classId: string;
  onClassChange: (classId: string) => void;
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
  classes,
  classSubjects,
  classId,
  onClassChange,
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

  return (
    <ResponsivePopover
      open={open}
      onOpenChange={onOpenChange}
      title={t("teacherPages", isCreate ? "newHomeworkTitle" : "editAssignmentTitle", lang)}
      description={isCreate ? t("teacherPages", "newHomeworkDesc", lang) : undefined}
    >
      <div className="space-y-4 p-5 pb-8">
        {isCreate && (
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-gray-500">{t("teacherPages", "classRequired", lang)}</label>
            <Select value={classId} onValueChange={(value) => { if (value !== null) onClassChange(value); }}>
              <SelectTrigger size="lg" className="w-full">
                <SelectValue>
                  {(value: string | null) => classes.find((item) => item.id === value)?.name
                    ?? (classes.length === 0 ? t("teacherPages", "noAccessibleClasses", lang) : t("teacherPages", "classRequired", lang))}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {classes.length === 0
                  ? <SelectItem size="lg" value="none" disabled>{t("teacherPages", "noAccessibleClasses", lang)}</SelectItem>
                  : classes.map((item) => <SelectItem size="lg" key={item.id} value={item.id}>{item.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-gray-500">
            {t("teacherPages", "subjectRequired", lang)}
            {isPeriodBased && isCreate && <span className="ml-1 font-normal text-gray-400">{t("teacherPages", "yourSubjectsHint", lang)}</span>}
          </label>
          <Select value={subjectId} onValueChange={(value) => { if (value !== null) onSubjectChange(value); }}>
            <SelectTrigger size="lg" className="w-full">
              <SelectValue>
                {(value: string | null) => classSubjects.find((item) => item.id === value)?.name
                  ?? (classSubjects.length === 0
                    ? isCreate && !classId
                      ? t("teacherPages", "selectClassFirst", lang)
                      : isCreate
                        ? isPeriodBased ? t("teacherPages", "noSubjectsAssigned", lang) : t("teacherPages", "noSubjectsInClass", lang)
                        : t("teacherPages", "noSubjectsAvail", lang)
                    : t("teacherPages", "subjectRequired", lang))}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {classSubjects.length === 0
                ? <SelectItem size="lg" value="none" disabled>
                    {isCreate && !classId
                      ? t("teacherPages", "selectClassFirst", lang)
                      : isCreate
                        ? isPeriodBased ? t("teacherPages", "noSubjectsAssigned", lang) : t("teacherPages", "noSubjectsInClass", lang)
                        : t("teacherPages", "noSubjectsAvail", lang)}
                  </SelectItem>
                : classSubjects.map((item) => <SelectItem size="lg" key={item.id} value={item.id}>{item.name}</SelectItem>)}
            </SelectContent>
          </Select>
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
          <label className="mb-1.5 block text-xs font-semibold text-gray-500">{t("teacherPages", "dueDateRequired", lang)}</label>
          <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
            <PopoverTrigger render={<Button type="button" variant="outline" size="lg" className="h-11 w-full justify-start font-normal" />}>
              <Calendar className="text-muted-foreground" />
              {dueDate
                ? new Date(`${dueDate}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
                : t("teacherPages", "dueDateRequired", lang)}
            </PopoverTrigger>
            <PopoverContent align="start" className="w-auto p-0">
              <HomeworkCalendar
                mode="single"
                selected={dueDate ? new Date(`${dueDate}T00:00:00`) : undefined}
                onSelect={(date) => {
                  if (!date) return;
                  const year = date.getFullYear();
                  const month = String(date.getMonth() + 1).padStart(2, "0");
                  const day = String(date.getDate()).padStart(2, "0");
                  onDueDateChange(`${year}-${month}-${day}`);
                  setDatePickerOpen(false);
                }}
                disabled={{ before: new Date(`${today}T00:00:00`) }}
              />
            </PopoverContent>
          </Popover>
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
