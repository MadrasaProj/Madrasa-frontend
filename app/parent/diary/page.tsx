import { useState, useEffect, useMemo } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { ApiErrorBanner } from "@/components/ui/ApiErrorBanner";
import type { DiaryEntry, DiaryComment } from "@/lib/diary-api";
import type { DiaryEventNotification, NotificationType } from "@/lib/notifications-api";
import { useAuthStore } from "@/store/auth";
import { useLanguageStore } from "@/store/language";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/Skeleton";
import { useDiaryList, useDiaryEvents, useAddDiaryComment } from "@/lib/queries";
import {
  FileText, Bell, Send, Loader2,
  BookOpen, ClipboardList, GraduationCap, CreditCard,
  MessageSquare, X, Search,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

function fmt(d: Date) { return d.toISOString().split("T")[0]; }

const MONTH_KEYS = [
  "monthJan", "monthFeb", "monthMar", "monthApr", "monthMay", "monthJun",
  "monthJul", "monthAug", "monthSep", "monthOct", "monthNov", "monthDec",
];

const TYPE_CONFIG: Record<NotificationType, { labelKey: string; icon: React.ElementType; tone: string }> = {
  ANNOUNCEMENT:      { labelKey: "announcementLabel", icon: Bell,          tone: "indigo"  },
  ATTENDANCE_ALERT:  { labelKey: "attendanceAlertLabel", icon: ClipboardList, tone: "emerald" },
  FEE_REMINDER:      { labelKey: "feeReminderLabel", icon: CreditCard,    tone: "amber"   },
  HOMEWORK_REMINDER: { labelKey: "homeworkReminderLabel", icon: BookOpen,      tone: "blue"    },
  EXAM_NOTICE:       { labelKey: "examNoticeLabel", icon: GraduationCap, tone: "violet"  },
  GENERAL:           { labelKey: "generalLabel",     icon: Bell,          tone: "slate"   },
};

const THEME_LABEL_KEYS: Record<string, string> = {
  default: "themeClean",
  classic: "themeClassic",
  vintage: "themeVintage",
  nature: "themeNature",
  ocean: "themeOcean",
  dreamy: "themeDreamy",
  cozy: "themeCozy",
  sunny: "themeSunny",
};

const themes: Record<string, { bg: string; text: string; border: string; chip: string; label: string; font: string; mlFont: string }> = {
  default: { bg: "bg-white",          text: "text-gray-800",   border: "border-gray-200",       chip: "bg-gray-100 text-gray-500",    label: "Clean",   font: "system-ui, sans-serif",          mlFont: "'Noto Sans Malayalam', sans-serif" },
  classic: { bg: "bg-amber-50",       text: "text-amber-900",  border: "border-amber-300/60",    chip: "bg-amber-200/50 text-amber-800", label: "Classic", font: "'Merriweather', serif",            mlFont: "'Noto Serif Malayalam', serif" },
  vintage: { bg: "bg-orange-50",      text: "text-orange-900", border: "border-orange-300/60",   chip: "bg-orange-200/50 text-orange-800", label: "Vintage", font: "'Playfair Display', serif",        mlFont: "'Noto Serif Malayalam', serif" },
  nature:  { bg: "bg-emerald-50",     text: "text-emerald-900", border: "border-emerald-300/60", chip: "bg-emerald-200/50 text-emerald-800", label: "Nature", font: "'EB Garamond', serif",             mlFont: "'Noto Serif Malayalam', serif" },
  ocean:   { bg: "bg-blue-50",        text: "text-blue-900",   border: "border-blue-300/60",     chip: "bg-blue-200/50 text-blue-800",  label: "Ocean",   font: "'DM Sans', sans-serif",            mlFont: "'Manjari', sans-serif" },
  dreamy:  { bg: "bg-purple-50",      text: "text-purple-900", border: "border-purple-300/60",   chip: "bg-purple-200/50 text-purple-800", label: "Dreamy", font: "'Nunito', sans-serif",             mlFont: "'Baloo Chettan 2', sans-serif" },
  cozy:    { bg: "bg-pink-50",        text: "text-pink-900",   border: "border-pink-300/60",     chip: "bg-pink-200/50 text-pink-800",  label: "Cozy",    font: "'Cormorant Garamond', serif",      mlFont: "'Noto Serif Malayalam', serif" },
  sunny:   { bg: "bg-yellow-50",      text: "text-yellow-900", border: "border-yellow-300/60",   chip: "bg-yellow-200/50 text-yellow-800", label: "Sunny", font: "'Fredoka', sans-serif",            mlFont: "'Baloo Chettan 2', sans-serif" },
};

const eventThemes: Record<string, { bg: string; text: string; border: string; chip: string }> = {
  indigo:  { bg: "bg-indigo-50",  text: "text-indigo-900",  border: "border-indigo-300/60",  chip: "bg-indigo-200/50 text-indigo-800"  },
  emerald: { bg: "bg-emerald-50", text: "text-emerald-900", border: "border-emerald-300/60", chip: "bg-emerald-200/50 text-emerald-800" },
  amber:   { bg: "bg-amber-50",   text: "text-amber-900",   border: "border-amber-300/60",   chip: "bg-amber-200/50 text-amber-800"   },
  blue:    { bg: "bg-blue-50",    text: "text-blue-900",    border: "border-blue-300/60",    chip: "bg-blue-200/50 text-blue-800"    },
  violet:  { bg: "bg-violet-50",  text: "text-violet-900",  border: "border-violet-300/60",  chip: "bg-violet-200/50 text-violet-800"  },
  slate:   { bg: "bg-slate-50",   text: "text-slate-900",   border: "border-slate-300/60",   chip: "bg-slate-200/50 text-slate-800"   },
};

const themeFontLinks: Record<string, string[]> = {
  classic: [
    "https://fonts.googleapis.com/css2?family=Merriweather:wght@400;700&display=swap",
    "https://fonts.googleapis.com/css2?family=Noto+Serif+Malayalam:wght@400;600&display=swap",
  ],
  vintage: [
    "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&display=swap",
    "https://fonts.googleapis.com/css2?family=Noto+Serif+Malayalam:wght@400;600&display=swap",
  ],
  nature: [
    "https://fonts.googleapis.com/css2?family=EB+Garamond:wght@400;600&display=swap",
    "https://fonts.googleapis.com/css2?family=Noto+Serif+Malayalam:wght@400;600&display=swap",
  ],
  ocean: [
    "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&display=swap",
    "https://fonts.googleapis.com/css2?family=Manjari:wght@400;700&display=swap",
  ],
  dreamy: [
    "https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700&display=swap",
    "https://fonts.googleapis.com/css2?family=Baloo+Chettan+2:wght@400;600&display=swap",
  ],
  cozy: [
    "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&display=swap",
    "https://fonts.googleapis.com/css2?family=Noto+Serif+Malayalam:wght@400;600&display=swap",
  ],
  sunny: [
    "https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600&display=swap",
    "https://fonts.googleapis.com/css2?family=Baloo+Chettan+2:wght@400;600&display=swap",
  ],
  default: [],
};

function entryTheme(theme: string) {
  return themes[theme] ?? themes.default;
}

function stripHtml(html: string): string {
  if (typeof window === "undefined") return html.replace(/<[^>]*>/g, "");
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  return (tmp.textContent || tmp.innerText || "").trim();
}

function dayLabel(iso: string) {
  const d = new Date(iso);
  return {
    day: String(d.getDate()).padStart(2, "0"),
    weekday: d.toLocaleDateString("en-US", { weekday: "short" }),
    monthIdx: d.getMonth(),
    year: d.getFullYear(),
    monthName: MONTH_KEYS[d.getMonth()],
  };
}

type TimelineItem = {
  type: "entry" | "event";
  date: string;
  data: DiaryEntry | DiaryEventNotification;
};

export default function ParentDiaryPage() {
  const { lang } = useLanguageStore();
  const { user, accessToken, activeClientId, activeStudentId } = useAuthStore();
  const cid   = activeClientId ?? "";
  const token = accessToken ?? "";

  const students = user?.accessibleStudents ?? [];
  const activeStudent = students.find((s) => s.id === activeStudentId) ?? students[0];
  const classId = (activeStudent as any)?.classId ?? "";

  const [replyText, setReplyText] = useState("");
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string>("this");

  const [selectedEntry, setSelectedEntry] = useState<DiaryEntry | null>(null);

  const { data: diaryData } = useDiaryList(
    { clientId: cid, token },
    { classId, studentId: activeStudent?.id },
  );
  const { data: eventsData } = useDiaryEvents(
    { clientId: cid, token },
    { classId, from: "2020-01-01", to: fmt(new Date()) },
  );

  const addComment = useAddDiaryComment({ clientId: cid, token });

  const entries = diaryData ?? [];
  const events  = eventsData ?? [];
  const isLoading = !diaryData && !eventsData;
  const error = diaryData === undefined && eventsData === undefined ? null : null;

  const timeline = useMemo<TimelineItem[]>(() => {
    const items: TimelineItem[] = [
      ...entries.map((e) => ({ type: "entry" as const, date: e.date.slice(0, 10), data: e })),
      ...events.filter((e) => e.eventDate).map((e) => ({ type: "event" as const, date: e.eventDate!.slice(0, 10), data: e })),
    ];
    items.sort((a, b) => b.date.localeCompare(a.date));
    return items;
  }, [entries, events]);

  const availableMonths = useMemo(() => {
    const seen = new Set<string>();
    const out: { key: string; idx: number; year: number; label: string }[] = [];
    for (const item of timeline) {
      const d = dayLabel(item.date);
      const key = `${d.year}-${d.monthIdx}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ key, idx: d.monthIdx, year: d.year, label: MONTH_KEYS[d.monthIdx] });
    }
    return out;
  }, [timeline]);

  useEffect(() => {
    if (selectedMonth === "this") return;
    if (!availableMonths.find((m) => m.key === selectedMonth)) {
      setSelectedMonth("this");
    }
  }, [availableMonths, selectedMonth]);

  const filteredTimeline = useMemo(() => {
    let items = timeline;
    if (selectedMonth !== "this") {
      const [yearStr, idxStr] = selectedMonth.split("-");
      const year = Number(yearStr);
      const idx = Number(idxStr);
      items = items.filter((i) => {
        const d = dayLabel(i.date);
        return d.year === year && d.monthIdx === idx;
      });
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      items = items.filter((i) => {
        if (i.type === "entry") {
          const e = i.data as DiaryEntry;
          return (
            e.title.toLowerCase().includes(q) ||
            stripHtml(e.content).toLowerCase().includes(q) ||
            (e.class?.name ?? "").toLowerCase().includes(q)
          );
        }
        const ev = i.data as DiaryEventNotification;
        return ev.title.toLowerCase().includes(q) || ev.body.toLowerCase().includes(q);
      });
    }
    return items;
  }, [timeline, selectedMonth, search]);

  const groupedByMonth = useMemo(() => {
    const groups: Record<string, TimelineItem[]> = {};
    for (const item of filteredTimeline) {
      const d = dayLabel(item.date);
      const key = `${d.year}-${d.monthIdx}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    }
    return Object.entries(groups)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([key, items]) => {
        const [y, m] = key.split("-");
        return { key, year: Number(y), monthIdx: Number(m), monthName: MONTH_KEYS[Number(m)], items };
      });
  }, [filteredTimeline]);

  const handleReply = async () => {
    if (!selectedEntry) return;
    const text = replyText.trim();
    if (!text || !activeStudent?.id) return;
    try {
      await addComment.mutateAsync({
        diaryId: selectedEntry.id,
        content: text,
        studentId: activeStudent.id,
        parentName: user?.name,
      });
      setReplyText("");
      setSelectedEntry((prev) => {
        if (!prev) return prev;
        const { comments, ...rest } = prev;
        return {
          ...rest,
          comments: [...(comments ?? []), { id: "temp", content: text, parentName: user?.name, studentId: activeStudent?.id, createdAt: new Date().toISOString() } as DiaryComment],
        };
      });
    } catch { /* ignore */ }
  };

  const parentFirstName = useMemo(() => {
    const full = user?.name?.trim() ?? "";
    if (!full) return "there";
    return full.split(/\s+/)[0];
  }, [user?.name]);

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto pb-28">
        <div className="flex items-center justify-between gap-4 mb-8 px-4 pt-2">
          <h1 className="text-3xl font-bold text-gray-900 leading-none tracking-tight">
            {t("parentPages", "heyGreeting", lang)} {parentFirstName}!
          </h1>
          <button
            onClick={() => setSearchOpen((v) => !v)}
            className="p-3 rounded-full bg-white border border-gray-200 hover:bg-gray-50 active:scale-95 transition shrink-0 shadow-sm"
            aria-label="Search"
          >
            <Search className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {error && <div className="px-4"><ApiErrorBanner message={error} onRetry={() => {}} /></div>}

        <AnimatePresence>
          {searchOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mb-5"
            >
              <div className="relative px-4">
                <Search className="absolute left-7 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  autoFocus
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t("parentPages", "searchDiary", lang)}
                  className="w-full pl-10 pr-10 py-3 rounded-full bg-white border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-7 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:bg-gray-100"
                  >
                    <X className="w-3.5 h-3.5 text-gray-400" />
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex gap-2.5 overflow-x-auto pb-1 mb-8 no-scrollbar px-4">
          <FilterPill
            active={selectedMonth === "this"}
            onClick={() => setSelectedMonth("this")}
            label={t("parentPages", "thisMonth", lang)}
          />
          {availableMonths.map((m) => (
            <FilterPill
              key={m.key}
              active={selectedMonth === m.key}
              onClick={() => setSelectedMonth(m.key)}
              label={t("parentPages", m.label as any, lang)}
            />
          ))}
        </div>

        {isLoading ? (
          <div className="space-y-4 px-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex gap-4">
                <Skeleton className="w-14 h-14 rounded-2xl shrink-0" />
                <Skeleton className="flex-1 h-20 rounded-l-2xl rounded-r-none" />
              </div>
            ))}
          </div>
        ) : filteredTimeline.length === 0 ? (
          <div className="text-center py-20 text-gray-400 px-4">
            <FileText className="w-12 h-12 mx-auto mb-3 text-gray-200" />
            <p className="text-sm">{t("parentPages", "noDiaryEntries", lang)}</p>
          </div>
        ) : (
          <div className="space-y-10">
            {groupedByMonth.map((group) => (
              <div key={group.key}>
                <div className="flex items-center gap-4 mb-5 px-4">
                  <div className="h-px flex-1 bg-gray-200" />
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-[0.22em] shrink-0">
                    {t("parentPages", group.monthName as any, lang)}
                  </span>
                  <div className="h-px flex-1 bg-gray-200" />
                </div>

                <ol className="space-y-4">
                  {group.items.map((item, idx) => (
                    <TimelineRow
                      key={(item.data as any).id}
                      item={item}
                      index={idx}
                      lang={lang}
                      onClick={() => {
                        if (item.type === "entry") setSelectedEntry(item.data as DiaryEntry);
                      }}
                    />
                  ))}
                </ol>
              </div>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedEntry && (
            <EntryDrawer
              entry={selectedEntry}
              replyText={replyText}
              setReplyText={setReplyText}
              sending={addComment.isPending}
              onSend={handleReply}
              canReply={!!activeStudent?.id}
              lang={lang}
              onClose={() => { setSelectedEntry(null); setReplyText(""); }}
            />
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}

function FilterPill({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  void label;
  return (
    <button
      onClick={onClick}
      className={cn(
        "shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition active:scale-95",
        active
          ? "bg-gray-900 text-white shadow-sm"
          : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50",
      )}
    >
      {label}
    </button>
  );
}

function TimelineRow({ item, index, onClick, lang: rowLang }: { item: TimelineItem; index: number; onClick: () => void; lang: "en" | "ml" }) {
  const dl = dayLabel(item.date);

  if (item.type === "event") {
    const ev = item.data as DiaryEventNotification;
    const cfg = TYPE_CONFIG[ev.type] ?? TYPE_CONFIG.GENERAL;
    const tone = eventThemes[cfg.tone] ?? eventThemes.slate;
    const Icon = cfg.icon;
    return (
      <motion.li
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.03 }}
        className="flex gap-4 items-stretch px-4"
      >
        <DateColumn day={dl.day} weekday={dl.weekday} />
        <div
          className={cn(
            "flex-1 rounded-l-2xl rounded-r-none border px-5 py-4",
            tone.bg, tone.border,
          )}
        >
          <div className="flex items-center gap-2.5 mb-1.5">
            <div
              className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center shrink-0",
                tone.chip,
              )}
            >
              <Icon className="w-3.5 h-3.5" />
            </div>
            <span className={cn("text-[11px] font-bold uppercase tracking-wider", tone.text)}>
              {t("parentPages", cfg.labelKey as any, rowLang)}
            </span>
          </div>
          <p className="text-[15px] text-gray-800 leading-snug line-clamp-2">{ev.body || ev.title}</p>
        </div>
      </motion.li>
    );
  }

  const entry = item.data as DiaryEntry;
  const tone = entryTheme(entry.theme);
  const snippet = stripHtml(entry.content);
  const commentCount = entry.comments?.length ?? 0;
  const score = String(commentCount).padStart(2, "0");

  return (
    <motion.li
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className="flex gap-4 items-stretch px-4"
    >
      <DateColumn day={dl.day} weekday={dl.weekday} />
      <button
        onClick={onClick}
        className={cn(
          "flex-1 text-left rounded-l-2xl rounded-r-none border px-5 py-4 transition-all active:scale-[0.99] hover:brightness-95",
          tone.bg, tone.border,
        )}
      >
        <div className="flex items-center gap-2.5 mb-1.5">
          <div
            className={cn(
              "w-6 h-6 rounded-full flex items-center justify-center shrink-0",
              tone.chip,
            )}
          >
            <BookOpen className="w-3.5 h-3.5" />
          </div>
          <span className={cn("text-[11px] font-bold uppercase tracking-wider", tone.text)}>
            {entry.class?.name ?? "Diary"}
          </span>
          <span className="ml-auto text-[11px] font-bold text-gray-500 tabular-nums">
            {score}
          </span>
        </div>
        <p className="text-[15px] text-gray-800 leading-snug line-clamp-2">
          {entry.title}
          {snippet ? <span className="text-gray-600"> — {snippet}</span> : null}
        </p>
        {commentCount > 0 && (
          <div className="flex items-center gap-1.5 mt-2 text-[11px] text-gray-500">
            <MessageSquare className="w-3 h-3" />
            <span>{commentCount} {commentCount === 1 ? t("parentPages", "responseLabel", rowLang) : t("parentPages", "responsesLabel", rowLang)}</span>
          </div>
        )}
      </button>
    </motion.li>
  );
}

function DateColumn({ day, weekday }: { day: string; weekday: string }) {
  return (
    <div className="w-14 shrink-0 flex flex-col items-center pt-1">
      <div className="w-14 h-14 rounded-2xl bg-white border border-gray-100 flex flex-col items-center justify-center shadow-sm">
        <span className="text-[17px] font-bold text-gray-900 leading-none">{day}</span>
        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mt-1">
          {weekday}
        </span>
      </div>
    </div>
  );
}

function EntryDrawer({
  entry, replyText, setReplyText, sending, onSend, canReply, onClose, lang: drawerLang,
}: {
  entry: DiaryEntry;
  replyText: string;
  setReplyText: (v: string) => void;
  sending: boolean;
  onSend: () => void;
  canReply: boolean;
  onClose: () => void;
  lang: "en" | "ml";
}) {
  const themeStyle = entryTheme(entry.theme);

  useEffect(() => {
    const links = entry.theme !== "default" ? themeFontLinks[entry.theme] : [];
    if (!links) return;
    for (const href of links) {
      const existing = document.querySelector(`link[href="${href}"]`);
      if (existing) continue;
      const el = document.createElement("link");
      el.href = href;
      el.rel = "stylesheet";
      document.head.appendChild(el);
    }
  }, [entry.theme]);

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/30 z-40"
      />
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className={cn(
          "fixed bottom-0 left-0 right-0 w-full z-50 h-dvh flex flex-col shadow-2xl",
          themeStyle.bg,
        )}
        style={{ fontFamily: `${themeStyle.font}, ${themeStyle.mlFont}` }}
      >
        <div className={cn("px-6 pt-6 pb-5 shrink-0 border-b", themeStyle.border)}>
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <div
                  className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center shrink-0",
                    themeStyle.chip,
                  )}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                </div>
                <span
                  className={cn(
                    "text-[11px] font-bold uppercase tracking-wider",
                    themeStyle.text,
                  )}
                >
            {entry.class?.name ?? t("parentPages", "diaryPageTitle", drawerLang)}
                </span>
              </div>
              <h2 className={cn("text-2xl font-bold leading-tight", themeStyle.text)}>{entry.title}</h2>
              <p className={cn("text-sm mt-1.5 opacity-70", themeStyle.text)}>
                {new Date(entry.date).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
                {entry.teacher ? ` · ${entry.teacher.name}` : ""}
              </p>
            </div>
            <button
              onClick={onClose}
              className={cn("p-2 rounded-xl shrink-0 transition-colors hover:bg-black/5", themeStyle.text)}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="px-6 py-6">
            <div
              className={cn(
                "text-base leading-relaxed [&_ul]:pl-5 [&_ol]:pl-5 [&_img]:max-w-full [&_img]:rounded-lg [&_p]:mb-2",
                themeStyle.text,
              )}
              dangerouslySetInnerHTML={{ __html: entry.content }}
            />

            <div className={cn("mt-7 pt-5 border-t", themeStyle.border)}>
              <h3 className={cn("text-sm font-bold mb-3", themeStyle.text)}>
                {t("parentPages", "responsesTitle", drawerLang)} ({entry.comments?.length ?? 0})
              </h3>
              {(!entry.comments || entry.comments.length === 0) ? (
                <p className={cn("text-sm text-center py-7 rounded-xl bg-black/5 opacity-60", themeStyle.text)}>
                  {t("parentPages", "noResponsesYet", drawerLang)}
                </p>
              ) : (
                <div className="space-y-2.5">
                  {entry.comments.map((c: DiaryComment) => (
                    <div key={c.id} className="rounded-xl p-3.5 bg-black/5">
                      <p className={cn("text-xs font-medium mb-0.5 opacity-70", themeStyle.text)}>
                        {c.parentName ?? t("parentPages", "parentRole", drawerLang)}
                      </p>
                      <p className={cn("text-sm", themeStyle.text)}>{c.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className={cn("shrink-0 p-4 border-t", themeStyle.border)}>
          {canReply ? (
            <div className="flex gap-2.5">
              <input
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder={t("parentPages", "writeResponse", drawerLang)}
                className={cn(
                  "flex-1 px-4 py-2.5 rounded-xl text-sm focus:outline-none bg-white/60 border placeholder:opacity-60",
                  themeStyle.border, themeStyle.text,
                )}
style={{ fontFamily: `${themeStyle.font}, ${themeStyle.mlFont}` }}
              />
              <button
                onClick={onSend}
                disabled={sending || !replyText.trim()}
                className="p-2.5 rounded-xl text-sm font-semibold disabled:opacity-40 shrink-0 transition-opacity bg-emerald-600 text-white"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
          ) : (
            <p className={cn("text-sm text-center py-1 opacity-70", themeStyle.text)}>{t("parentPages", "selectStudentRespond", drawerLang)}</p>
          )}
        </div>
      </motion.div>
    </>
  );
}
