import { useAuthStore } from "@/store/auth";
import type { StudentInfo } from "@/lib/auth-api";

/**
 * Returns the complete student record (with photo, photoUrl, etc.) from the
 * parent's authenticated session. No network call — the data is already
 * available in `accessibleStudents` from the parent login response.
 */
export function useStudent(studentId: string | null | undefined): StudentInfo | null {
  const user = useAuthStore((s) => s.user);
  const students = user?.accessibleStudents ?? [];
  if (!studentId) return null;
  return students.find((s) => s.id === studentId) ?? null;
}

/**
 * Returns just the student's profile photo URL (signed CDN URL when available,
 * else the raw photo path) from the parent's authenticated session.
 */
export function useStudentPhoto(studentId: string | null | undefined): string | null {
  const student = useStudent(studentId);
  return student?.photoUrl ?? student?.photo ?? null;
}
