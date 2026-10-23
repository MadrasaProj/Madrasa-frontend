import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth";
import { useClasses } from "@/lib/queries";
import { getSubjects } from "@/lib/subjects-api";

interface ActiveClassState {
  selectedByTeacher: Record<string, string>;
  select: (teacherKey: string, classId: string) => void;
}

export const useActiveClassStore = create<ActiveClassState>()(
  persist(
    (set) => ({
      selectedByTeacher: {},
      select: (teacherKey, classId) =>
        set((state) => ({
          selectedByTeacher: { ...state.selectedByTeacher, [teacherKey]: classId },
        })),
    }),
    { name: "teacher-active-class" },
  ),
);

/** The validated, shared class selection for the signed-in teacher. */
export function useActiveClass() {
  const { user, accessToken } = useAuthStore();
  const clientId = user?.clientId ?? "";
  const token = accessToken ?? "";
  const teacherId = user?.id ?? "";
  const teacherKey = `${clientId}:${teacherId}`;
  const selectedId = useActiveClassStore((state) => state.selectedByTeacher[teacherKey]);
  const select = useActiveClassStore((state) => state.select);
  const classQuery = useClasses({ clientId, token }, undefined, { enabled: !!clientId && !!token && user?.role === "teacher" });
  const subjectQuery = useQuery({
    queryKey: ["teacher-class-subjects", clientId, teacherId],
    queryFn: () => getSubjects(clientId, token, { teacherId, limit: 500 }),
    enabled: !!clientId && !!token && !!teacherId && user?.role === "teacher" && user?.attendanceMode === "PERIOD_BASED",
    staleTime: 5 * 60_000,
  });
  const classes = useMemo(() => {
    const assigned = new Set(subjectQuery.data?.data.map((subject) => subject.classId) ?? []);
    return (classQuery.data ?? []).filter((cls) =>
      cls.classTeacherId === teacherId || (user?.attendanceMode === "PERIOD_BASED" && assigned.has(cls.id)),
    );
  }, [classQuery.data, subjectQuery.data, teacherId, user?.attendanceMode]);
  const activeClass = classes.find((cls) => cls.id === selectedId) ?? classes[0] ?? null;
  return {
    classes,
    activeClass,
    activeClassId: activeClass?.id ?? "",
    setActiveClassId: (classId: string) => {
      if (classes.some((cls) => cls.id === classId)) select(teacherKey, classId);
    },
    isLoading: classQuery.isLoading || (user?.attendanceMode === "PERIOD_BASED" && subjectQuery.isLoading),
    error: classQuery.error ?? subjectQuery.error,
  };
}
