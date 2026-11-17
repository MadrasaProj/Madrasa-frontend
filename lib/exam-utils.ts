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
