export function periodDates(type: "week" | "month") {
  const end = new Date();
  const start = new Date(end);
  if (type === "week") start.setDate(end.getDate() - 6);
  else start.setDate(1);
  const iso = (date: Date) =>
    [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0"),
    ].join("-");
  return { from: iso(start), to: iso(end) };
}
