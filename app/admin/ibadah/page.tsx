import { useEffect, useState } from "react";
import TeacherIbadahPage from "@/app/teacher/ibadah/page";
import { getAllClasses, type ClassRecord } from "@/lib/classes-api";
import { useAuthStore } from "@/store/auth";

export default function AdminIbadahPage() {
  const { user, accessToken, activeClientId } = useAuthStore();
  const cid = activeClientId ?? user?.clientId ?? "";
  const token = accessToken ?? "";
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [activeClassId, setActiveClassId] = useState<string | null>(null);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [classError, setClassError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (!cid || !token) {
      setClasses([]);
      setActiveClassId(null);
      setLoadingClasses(false);
      return;
    }

    const controller = new AbortController();
    setLoadingClasses(true);
    setClassError(null);
    getAllClasses(cid, token, controller.signal)
      .then((nextClasses) => {
        if (controller.signal.aborted) return;
        setClasses(nextClasses);
        setActiveClassId((current) =>
          nextClasses.some((cls) => cls.id === current) ? current : (nextClasses[0]?.id ?? null),
        );
      })
      .catch((error: Error) => {
        if (controller.signal.aborted) return;
        setClasses([]);
        setActiveClassId(null);
        setClassError(error.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingClasses(false);
      });
    return () => controller.abort();
  }, [cid, token, retryCount]);

  return (
    <TeacherIbadahPage
      adminClassContext={{
        classes,
        activeClassId,
        isLoading: loadingClasses,
        error: classError,
        onRetry: () => setRetryCount((count) => count + 1),
        onClassChange: setActiveClassId,
      }}
    />
  );
}
