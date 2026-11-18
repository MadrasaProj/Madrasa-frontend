import type { ExamRecord } from "@/lib/exams-api";

export function fmt(d?: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function shortDate(d?: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
  });
}

export function getExamCategories(exams: ExamRecord[]) {
  const upcoming = exams.filter(
    (e) => e.startDate && new Date(e.startDate) > new Date(),
  );
  const markEntryOpen = exams.filter(
    (e) =>
      e.status === "ACTIVE" && (!e.startDate || new Date(e.startDate) <= new Date()) &&
      (!e.markEntryLastDate || new Date(e.markEntryLastDate) >= new Date()),
  );
  const completed = exams.filter((e) => {
    if (e.status !== "ACTIVE" || (e.publishedDate && new Date(e.publishedDate) <= new Date())) return false;
    if (e.markEntryLastDate && new Date(e.markEntryLastDate) < new Date())
      return true;
    return false;
  });
  const published = exams.filter((e) => e.publishedDate && new Date(e.publishedDate) <= new Date());

  return { upcoming, markEntryOpen, completed, published };
}

export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export function resolveTermSubjectOverride(
  exam?: ExamRecord | null,
  cls?: { id: string; gradeLevelId?: string | null; name?: string } | null,
  subject?: { id: string; name: string; classSubjectGlobalId?: string | null } | null,
) {
  const termConfig = exam?.term?.config as Record<string, Record<string, any>> | undefined;
  if (!termConfig || !cls || !subject) return null;

  const classKeys = [cls.gradeLevelId, cls.id, cls.name].filter(Boolean) as string[];
  for (const cKey of classKeys) {
    const classCfg = termConfig[cKey];
    if (!classCfg || typeof classCfg !== "object") continue;

    const subjKeys = [subject.classSubjectGlobalId, subject.id, subject.name].filter(Boolean) as string[];
    for (const sKey of subjKeys) {
      if (classCfg[sKey] !== undefined) {
        return classCfg[sKey];
      }
    }
  }
  return null;
}

export function getEffectiveMaxMarks(
  exam?: ExamRecord | null,
  cls?: { id: string; gradeLevelId?: string | null; name?: string } | null,
  subject?: { id: string; name: string; classSubjectGlobalId?: string | null; classSubject?: { maxMarks?: number | null } | null } | null,
  fallback = 50,
): number {
  const override = resolveTermSubjectOverride(exam, cls, subject);
  if (override && typeof override === "object" && typeof override.maxMarks === "number") {
    return override.maxMarks;
  }
  return subject?.classSubject?.maxMarks ?? exam?.maxMarks ?? fallback;
}
