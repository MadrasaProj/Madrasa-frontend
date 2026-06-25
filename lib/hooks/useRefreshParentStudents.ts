import { useEffect } from "react";
import { useAuthStore } from "@/store/auth";

/**
 * Runs once on mount: if the current session is a parent, refresh the
 * `accessibleStudents` list from the server so the full profile data
 * (photo, photoUrl, contact, address, etc.) is available without requiring
 * a re-login.
 *
 * Also auto-refreshes when the cached data appears incomplete (e.g. missing
 * the `photo` field, which indicates an old login payload from before the
 * parent-login response was expanded).
 */
export function useRefreshParentStudents() {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const actorType  = useAuthStore((s) => s.user?.actorType);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const firstStudentHasPhoto = useAuthStore(
    (s) => s.user?.accessibleStudents?.[0]?.photo != null
      || s.user?.accessibleStudents?.[0]?.photoUrl != null
  );
  const refresh = useAuthStore((s) => s.refreshParentStudents);

  useEffect(() => {
    if (!hasHydrated) return;
    if (!isLoggedIn || actorType !== "PARENT") return;
    // Always refresh once on mount. The endpoint is cheap and ensures the
    // store has the full profile fields even if the persisted payload is
    // from an older build.
    refresh();
    // If we just refreshed and the data still looks thin, leave the user
    // alone — the next page navigation will trigger another refresh.
    // (Dependency intentionally omits firstStudentHasPhoto to avoid loops.)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasHydrated, isLoggedIn, actorType]);
}

