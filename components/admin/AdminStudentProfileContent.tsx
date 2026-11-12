import type { StudentRecord } from "@/lib/students-api";
import { StudentAvatar } from "@/components/teacher/StudentAvatar";
import { cn } from "@/lib/utils";
import {
  CalendarDays, Droplets, GraduationCap, Hash, HeartPulse,
  Mail, MapPin, Phone, ShieldAlert, UserRound,
} from "lucide-react";

type Detail = {
  label: string;
  value: string | null | undefined;
  icon: typeof Hash;
};

function DetailSection({ title, details }: { title: string; details: Detail[] }) {
  const visible = details.filter(({ value }) => !!value);
  if (!visible.length) return null;

  return (
    <section className="border-t border-gray-100 px-5 py-5 sm:px-6">
      <h3 className="mb-2 text-sm font-bold text-gray-900">{title}</h3>
      <div className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
        {visible.map(({ label, value, icon: Icon }) => (
          <div key={label} className="flex min-w-0 items-start gap-3 border-b border-gray-100 py-3 last:border-b-0">
            <Icon aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-primary-500" />
            <div className="min-w-0">
              <p className="text-xs font-medium text-gray-500">{label}</p>
              <p className="mt-0.5 break-words text-sm font-semibold text-gray-900">{value}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function AdminStudentProfileContent({ student }: { student: StudentRecord }) {
  const address = [student.address, student.city, student.state, student.country, student.pincode].filter(Boolean).join(", ");
  const genderLabel = student.gender === "FEMALE" ? "Girl" : student.gender === "MALE" ? "Boy" : null;
  const statusLabel = student.status?.replace(/_/g, " ") ?? "ACTIVE";

  return (
    <div className="mx-auto w-full max-w-2xl pb-6">
      <div className="flex flex-col items-center px-5 pb-6 pt-7 text-center sm:px-6">
        <StudentAvatar name={student.name} gender={student.gender ?? undefined} photoUrl={student.photoUrl} size="lg" className="size-20 ring-4 ring-primary-50 sm:size-24" />
        <h2 className="mt-4 max-w-full break-words text-xl font-bold leading-tight text-gray-950 sm:text-2xl">{student.name}</h2>
        <p className="mt-1 text-sm text-gray-500">
          {student.class?.name ?? "No class assigned"}
          <span aria-hidden="true" className="mx-2 text-gray-300">·</span>
          {student.adno}
        </p>
        <span className={cn(
          "mt-3 rounded-full px-3 py-1 text-xs font-semibold capitalize",
          student.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-700",
        )}>{statusLabel.toLowerCase()}</span>
      </div>

      <DetailSection title="Student details" details={[
        { icon: Hash, label: "Admission number", value: student.adno },
        { icon: GraduationCap, label: "Class", value: student.class?.name },
        { icon: UserRound, label: "Gender", value: genderLabel },
        { icon: Hash, label: "Student UID", value: student.uid },
        { icon: CalendarDays, label: "Date of birth", value: student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString("en-GB") : null },
        { icon: CalendarDays, label: "Academic year", value: student.accademicYear?.name },
      ]} />

      <DetailSection title="Family and contact" details={[
        { icon: UserRound, label: "Guardian", value: student.guardianName ? `${student.guardianName}${student.relationToStudent ? ` · ${student.relationToStudent}` : ""}` : null },
        { icon: Phone, label: "Parent phone", value: student.parentPhone },
        { icon: Phone, label: "Alternate phone", value: student.parentAltPhone },
        { icon: Mail, label: "Parent email", value: student.parentEmail },
        { icon: MapPin, label: "Address", value: address },
      ]} />

      <DetailSection title="Health and emergency" details={[
        { icon: Droplets, label: "Blood group", value: student.bloodGroup },
        { icon: ShieldAlert, label: "Emergency contact", value: student.emergencyContactName ? `${student.emergencyContactName}${student.emergencyContactPhone ? ` · ${student.emergencyContactPhone}` : ""}` : student.emergencyContactPhone },
        { icon: HeartPulse, label: "Medical notes", value: student.medicalNotes },
      ]} />

    </div>
  );
}
