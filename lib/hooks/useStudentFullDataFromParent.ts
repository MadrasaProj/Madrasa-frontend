import { useEffect, useState } from "react";
import { getParentStudents } from "@/lib/auth-api";
import { useAuthStore } from "@/store/auth";
import type { StudentInfo } from "@/lib/auth-api";
import { getStudentProfileV2, StudentRecord } from "../students-api";

/**
 * Fetches a single student's complete profile using the parent's session.
 *
 * Calls `GET /api/v2/auth/parent/students` (the parent-specific endpoint
 * that returns all of the parent's accessible children with full profile
 * data — photo, photoUrl, contact, address, accademicYear, etc.) and
 * returns the matching student by ID.
 *
 * Falls back to the current `accessibleStudents` store entry while the
 * request is in flight, so the UI can render immediately. Re-fetches
 * whenever `studentId` changes.
 */
export function useStudentFullDataFromParent(
  studentId: string | null | undefined
): { student: StudentRecord | null; loading: boolean; error: Error | null } {
  const { accessToken, user } = useAuthStore();
  const token = accessToken ?? "";
  const [student, setStudent] = useState<StudentRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!studentId) {
      setStudent(null);
      return;
    }
    // Seed with cached value so callers have something to render with
    setStudent(null);
    if (!token) return;

    let cancelled = false;
    setLoading(true);
    setError(null);
    getStudentProfileV2(user?.clientId!,token, studentId)
      .then((e) => {
        if (cancelled) return;
        setStudent(e);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setError(err);
        // Keep the cached value on error
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // `cached` is derived from the same store, no need to re-run on its changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId, token]);

  return { student, loading, error };
}
