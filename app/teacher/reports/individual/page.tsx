import IndividualStudentReportPage from "../../../shared/individual-report/page";
import { useActiveClass } from "@/store/activeClass";

export default function TeacherIndividualReportPage() {
  const { activeClassId } = useActiveClass();
  return <IndividualStudentReportPage classId={activeClassId} />;
}
