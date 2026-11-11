import { createPortal } from "react-dom";
import { ExcelImportModal } from "@/components/exam/ExcelImportModal";
import { MarkEntryGrid, type MarkEntryGridProps } from "@/components/exam/MarkEntryGrid";
import { ScrollableSubjectNavigator } from "@/components/ScrollableSubjectNavigator";

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
  const { examId, classId, subjectId, subjects, students, activeExam } = gridProps;
  const currentSubject = subjects.find((subject) => subject.id === subjectId);

  return (
    <div className="space-y-4 px-2 sm:px-6">
      {showSelectors && (
        <ScrollableSubjectNavigator
          subjects={subjects}
          value={subjectId}
          onChange={gridProps.onSubjectChange}
          disabled={!classId}
        />
      )}
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
