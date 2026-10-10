import { createPortal } from "react-dom";
import { DrawerSelector } from "@/components/DrawerSelector";
import { ButtonGroup } from "@/components/ui/button-group";
import { ExcelImportModal } from "@/components/exam/ExcelImportModal";
import { MarkEntryGrid, type MarkEntryGridProps } from "@/components/exam/MarkEntryGrid";

interface TeacherMarkEntryViewProps {
  gridProps: Omit<MarkEntryGridProps, "onReset" | "onImportOpen">;
  clientId: string;
  token: string;
  academicYearId: string;
  importOpen: boolean;
  onImportOpenChange: (open: boolean) => void;
  onReload: () => Promise<void>;
  showSelectors?: boolean;
}

export function TeacherMarkEntryView({
  gridProps,
  clientId,
  token,
  academicYearId,
  importOpen,
  onImportOpenChange,
  onReload,
  showSelectors = true,
}: TeacherMarkEntryViewProps) {
  const { examId, classId, subjectId, classes, subjects, students, activeExam } = gridProps;
  const currentSubject = subjects.find((subject) => subject.id === subjectId);

  return (
    <div className="space-y-4 p-4 sm:p-6">
      {showSelectors && <ButtonGroup aria-label="Mark entry class and subject" className="w-full max-w-xl">
        <DrawerSelector
          title="Select Class"
          triggerLabel="Class"
          options={classes.map((classRecord) => ({
            value: classRecord.id,
            label: classRecord.name,
          }))}
          value={classId}
          onChange={gridProps.onClassChange}
          placeholder="Select Class"
          className="min-w-0 flex-1"
        />
        <DrawerSelector
          title="Select Subject"
          triggerLabel="Subject"
          options={subjects.map((subject) => ({
            value: subject.id,
            label: subject.name,
          }))}
          value={subjectId}
          onChange={gridProps.onSubjectChange}
          placeholder="Select Subject"
          disabled={!classId}
          className="min-w-0 flex-1"
        />
      </ButtonGroup>}
      <MarkEntryGrid
        {...gridProps}
        showExamSelector={false}
        showClassSelector={false}
        showSubjectSelector={false}
        showExcelImport={false}
        showActionButtons={false}
      />

      {importOpen && examId && classId && subjectId && currentSubject && createPortal(
        <ExcelImportModal
          clientId={clientId}
          token={token}
          examId={examId}
          classId={classId}
          accademicYearId={academicYearId}
          subjects={[{
            id: subjectId,
            name: currentSubject.name,
            maxMarks: currentSubject.classSubject?.maxMarks ?? activeExam?.maxMarks ?? 50,
            passMarks: currentSubject.classSubject?.passMarks ?? null,
            gradeConfig: null,
          }]}
          students={students.map((student) => ({
            id: student.id,
            name: student.name,
            adno: student.adno,
          }))}
          onClose={() => onImportOpenChange(false)}
          onSuccess={async () => {
            onImportOpenChange(false);
            await onReload();
          }}
        />,
        document.body,
      )}
    </div>
  );
}
