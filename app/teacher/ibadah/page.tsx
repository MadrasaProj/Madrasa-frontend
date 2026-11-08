import { ScrollableRangeNavigator, commonRangePreset } from "@/components/ScrollableRangeNavigator";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { ScrollableDateNavigator } from "@/components/ScrollableDateNavigator";
import { ScrollableWeekNavigator } from "@/components/ScrollableWeekNavigator";
import { ScrollableMonthlyNavigator } from "@/components/ScrollableMonthlyNavigator";
import { ApiErrorBanner } from "@/components/ui/ApiErrorBanner";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Skeleton } from "@/components/ui/Skeleton";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import {
  getClassIbadah,
  type PrayerStatus,
  type IbadahConfig,
  type IbadahRecord,
} from "@/lib/ibadah-api";
import { getStudents, type StudentRecord } from "@/lib/students-api";
import { useAuthStore } from "@/store/auth";
import { useActiveClass } from "@/store/activeClass";
import { useLanguageStore } from "@/store/language";
import { t } from "@/lib/i18n";
import {
  Moon,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Calendar,
  List,
  Users,
  Check,
  Sun,
  Minus,
  Download,
  Hash,
  Trophy,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { jsPDF } from "jspdf";
import { Bar, BarChart, Cell } from "recharts";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Icon } from "@iconify/react";

type Section = "prayers" | "quran" | "custom";
type ViewMode = "daily" | "weekly" | "monthly" | "custom";

export const PRAYER_STATUS_META: Record<
  PrayerStatus,
  {
    labelKey: "jama" | "adaLabel" | "qalaLabel" | "excusedLabel";
    icon: typeof Check;
    bg: string;
    text: string;
    border: string;
  }
> = {
  JAMA: {
    labelKey: "jama",
    icon: Users,
    bg: "bg-blue-100",
    text: "text-blue-700",
    border: "border-blue-200",
  },
  ADA: {
    labelKey: "adaLabel",
    icon: Check,
    bg: "bg-primary-100",
    text: "text-primary-700",
    border: "border-primary-200",
  },
  QALA: {
    labelKey: "qalaLabel",
    icon: Sun,
    bg: "bg-amber-100",
    text: "text-amber-700",
    border: "border-amber-200",
  },
  NOT_PRAYABLE: {
    labelKey: "excusedLabel",
    icon: Check,
    bg: "bg-primary-100",
    text: "text-primary-700",
    border: "border-primary-200",
  },
};

function PrayerStatusIcon({
  status,
  lang,
  unrecorded = false,
}: {
  status: PrayerStatus | null;
  lang: "en" | "ml";
  unrecorded?: boolean;
}) {
  if (!status) {
    return (
      <div
        title={
          unrecorded
            ? t("teacherPages", "notRecordedLabel", lang)
            : t("parentPages", "missedLabel", lang)
        }
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-gray-100 bg-gray-50 text-gray-300"
      >
        <Minus className="h-2.5 w-2.5" />
      </div>
    );
  }

  const meta = PRAYER_STATUS_META[status];
  if (!meta) return null;
  const Icon = meta.icon;

  return (
    <div
      title={t("parentPages", meta.labelKey, lang)}
      className={cn(
        "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border",
        meta.bg,
        meta.text,
        meta.border,
      )}
    >
      <Icon className="h-2.5 w-2.5" />
    </div>
  );
}

const ALL_PRAYERS: {
  key: "fajr" | "dhuhr" | "asr" | "maghrib" | "isha";
  label: string;
  configKey: keyof IbadahConfig;
}[] = [
  { key: "fajr", label: "Fajr", configKey: "enableFajr" },
  { key: "dhuhr", label: "Dhuhr", configKey: "enableDhuhr" },
  { key: "asr", label: "Asr", configKey: "enableAsr" },
  { key: "maghrib", label: "Maghrib", configKey: "enableMaghrib" },
  { key: "isha", label: "Isha", configKey: "enableIsha" },
];

interface StudentRow {
  studentId: string;
  name: string;
  adno: string;
  fajr: PrayerStatus | null;
  dhuhr: PrayerStatus | null;
  asr: PrayerStatus | null;
  maghrib: PrayerStatus | null;
  isha: PrayerStatus | null;
  quranPages: number;
  customData: Record<string, boolean | number | string>;
  hasRecord?: boolean;
}

const miniChartConfig = {
  value: { label: "Count" },
} satisfies ChartConfig;

function MiniBarChart({
  data,
}: {
  data: { value: number; color: string }[];
}) {
  return (
    <ChartContainer
      config={miniChartConfig}
      initialDimension={{ width: 32, height: 28 }}
      className="h-7 w-8 shrink-0 sm:h-8 sm:w-14"
      aria-hidden="true"
    >
      <BarChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
        <Bar dataKey="value" radius={[2, 2, 0, 0]} isAnimationActive={false}>
          {data.map((item, index) => (
            <Cell key={index} fill={item.color} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}

function DailyIbadahStats({
  rows,
  activePrayers,
  config,
  lang,
}: {
  rows: StudentRow[];
  activePrayers: typeof ALL_PRAYERS;
  config: IbadahConfig | null;
  lang: "en" | "ml";
}) {
  const submitted = rows.filter((row) => row.hasRecord).length;
  const pending = rows.length - submitted;
  const quranEnabled = config?.enableQuranPages !== false;
  const customCount = config?.customItems.length ?? 0;
  const activities = activePrayers.length + (quranEnabled ? 1 : 0) + customCount;
  const prayersLogged = rows.reduce(
    (total, row) =>
      total + activePrayers.filter((prayer) => row[prayer.key] !== null).length,
    0,
  );
  const quranPages = quranEnabled
    ? rows.reduce((total, row) => total + row.quranPages, 0)
    : 0;
  const studentsNote = t("teacherPages", "ibadahOfStudents", lang).replace(
    "{n}",
    String(rows.length),
  );
  const topStats = [
    {
      label: t("teacherPages", "ibadahSubmissions", lang),
      value: submitted,
      note: studentsNote,
      bars: [
        { value: submitted, color: "#059669" },
        { value: pending, color: "#a7f3d0" },
      ],
    },
    {
      label: t("teacherPages", "ibadahTotalActivities", lang),
      value: activities,
      note: t("teacherPages", "ibadahEnabledForClass", lang),
      bars: [
        { value: activePrayers.length, color: "#2563eb" },
        { value: quranEnabled ? 1 : 0, color: "#60a5fa" },
        { value: customCount, color: "#bfdbfe" },
      ],
    },
    {
      label: t("teacherPages", "ibadahPendingStudents", lang),
      value: pending,
      note: studentsNote,
      bars: [
        { value: pending, color: "#d97706" },
        { value: submitted, color: "#fcd34d" },
      ],
    },
  ];
  const bottomStats = [
    { label: t("teacherPages", "ibadahClassStudents", lang), value: rows.length, icon: Users },
    { label: t("teacherPages", "ibadahPrayersLogged", lang), value: prayersLogged, icon: Moon },
    { label: t("teacherPages", "ibadahQuranPages", lang), value: quranPages, icon: BookOpen },
  ];

  return (
    <div className="grid grid-cols-2 overflow-hidden rounded-2xl bg-gradient-to-br from-primary-50/60 via-white to-sky-50/60">
      {topStats.map((stat, index) => (
        <div
          key={stat.label}
          className={cn(
            "min-w-0 border-b border-gray-100 p-2.5 sm:p-3",
            index % 2 === 0 && "border-r",
          )}
        >
          <span className="block text-sm font-medium leading-4 text-gray-700">
            {stat.label}
          </span>
          <div className="mt-1.5 flex items-end justify-between gap-1">
            <span className="text-xl font-medium leading-none tabular-nums text-gray-950 sm:text-[22px]">
              {stat.value}
            </span>
            <MiniBarChart data={stat.bars} />
          </div>
        </div>
      ))}
      {bottomStats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.label}
            className={cn(
              "min-w-0 p-2.5 sm:p-3",
              index < 2 && "border-b border-gray-100",
              index === 1 && "border-r border-gray-100",
            )}
          >
            <div className="flex gap-1.5">
              <Icon aria-hidden="true" className="h-3.5 w-3.5 text-gray-800" />
              <span className="block text-sm font-medium leading-4 text-gray-700">
                {stat.label}
              </span>
            </div>
            <span className="mt-1.5 block text-[22px] font-medium leading-none tabular-nums text-gray-950">
              {stat.value}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function isCompletedPrayer(status: PrayerStatus | null): boolean {
  return status !== null && status !== "NOT_PRAYABLE";
}

function StudentSummaryCard({
  student,
  activePrayers,
  showQuran,
  lang,
  onClick,
}: {
  student: StudentRow;
  activePrayers: typeof ALL_PRAYERS;
  showQuran: boolean;
  lang: "en" | "ml";
  onClick: () => void;
}) {
  const completedPrayers = activePrayers.filter((prayer) =>
    isCompletedPrayer(student[prayer.key]),
  ).length;

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-none p-4 text-left transition-colors hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary-500"
    >
      <span className="flex items-start justify-between gap-2">
        <span className="min-w-0 truncate text-sm font-semibold text-gray-900">
          {student.name}
        </span>
        {student.hasRecord === false && (
          <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
            {t("teacherPages", "notSubmittedStatus", lang)}
          </span>
        )}
      </span>
      <span className="block text-xs text-gray-500">{student.adno}</span>
      {student.hasRecord && (
        <span className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
          {activePrayers.length > 0 && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600">
              <Moon aria-hidden="true" className="h-3.5 w-3.5 text-primary-600" />
              {completedPrayers}/{activePrayers.length}{" "}
              {t("teacherPages", "prayerSection", lang)}
            </span>
          )}
          {showQuran && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600">
              <BookOpen aria-hidden="true" className="h-3.5 w-3.5 text-blue-600" />
              {student.quranPages} {t("parentPages", "pages", lang)}
            </span>
          )}
        </span>
      )}
    </button>
  );
}

function PeriodStudentSummaryCard({
  student,
  logs,
  activePrayers,
  showQuran,
  customItems,
  daysInPeriod,
  lang,
  onClick,
}: {
  student: StudentRecord;
  logs: IbadahRecord[];
  activePrayers: typeof ALL_PRAYERS;
  showQuran: boolean;
  customItems: IbadahConfig["customItems"];
  daysInPeriod: number;
  lang: "en" | "ml";
  onClick: () => void;
}) {
  const completedPrayers = logs.reduce(
    (total, log) =>
      total +
      activePrayers.filter((prayer) => isCompletedPrayer(log[prayer.key])).length,
    0,
  );
  const quranPages = logs.reduce((total, log) => total + log.quranPages, 0);

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-none p-4 text-left transition-colors hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary-500"
    >
      <span className="block truncate text-sm font-semibold text-gray-900">
        {student.name}
      </span>
      <span className="block text-xs text-gray-500">{student.adno}</span>
      <span className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        {activePrayers.length > 0 && (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600">
            <Moon aria-hidden="true" className="h-3.5 w-3.5 text-primary-600" />
            {completedPrayers}/{activePrayers.length * daysInPeriod}{" "}
            {t("teacherPages", "prayerSection", lang)}
          </span>
        )}
        {showQuran && (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600">
            <BookOpen aria-hidden="true" className="h-3.5 w-3.5 text-blue-600" />
            {quranPages} {t("parentPages", "pages", lang)}
          </span>
        )}
        {customItems.map((item) => {
          const count =
            item.type === "number"
              ? logs.reduce(
                  (total, log) =>
                    total + (Number(log.customData?.[item.key]) || 0),
                  0,
                )
              : logs.filter((log) => {
                  const value = log.customData?.[item.key];
                  return item.type === "boolean"
                    ? value === true
                    : value !== undefined && value !== null && value !== "";
                }).length;
          return (
            <span
              key={item.key}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600"
            >
              <Icon icon={item.icon || "lucide:hash"} aria-hidden="true" className="h-3.5 w-3.5 text-violet-600" />
              {item.label}: {count}
              {item.type !== "number" && `/${daysInPeriod}`}
            </span>
          );
        })}
      </span>
    </button>
  );
}

function PeriodIbadahView({
  viewMode,
  students,
  dates,
  logMap,
  activePrayers,
  config,
  lang,
  onDownload,
  onStudentClick,
}: {
  viewMode: Exclude<ViewMode, "daily">;
  students: StudentRecord[];
  dates: string[];
  logMap: Map<string, Map<string, IbadahRecord>>;
  activePrayers: typeof ALL_PRAYERS;
  config: IbadahConfig | null;
  lang: "en" | "ml";
  onDownload: () => void;
  onStudentClick: (studentId: string) => void;
}) {
  const label = viewMode === "weekly" ? "Weekly" : viewMode === "monthly" ? "Monthly" : "Custom";
  return (
    <div className="space-y-3 px-3">
      <section className="relative overflow-hidden rounded-2xl border border-teal-100/70 bg-gradient-to-br from-[#fdfefd] via-[#f7fcfa] to-[#eef8f6] px-4 py-3.5 sm:px-5 sm:py-4" aria-labelledby="period-report-title">
        <div className="relative z-10 min-w-0 pr-24 sm:pr-40">
          <h2 id="period-report-title" className="text-base font-semibold text-gray-900">{label} report</h2>
          <p className="mt-1.5 text-xs leading-4 text-gray-600">
            Download a PDF of your class&apos;s ibadah records for the selected period.
          </p>
          <Button type="button" onClick={onDownload} disabled={students.length === 0} size="sm" className="mt-3 h-8 w-auto px-3">
            <Download aria-hidden="true" className="h-3.5 w-3.5" />
            Download report
          </Button>
        </div>
        <img src="/icons/ibadah/weekly-report.webp" alt="" aria-hidden="true" className="pointer-events-none absolute bottom-0 right-0 h-28 w-28 object-contain object-bottom sm:h-36 sm:w-36" />
      </section>
      {students.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">
          <Moon className="w-10 h-10 mx-auto mb-3 text-gray-200" />
          {t("teacherPages", "noStudentsInClass", lang)}
        </div>
      ) : (
        <div className="divide-y divide-gray-100 overflow-hidden rounded-2xl bg-white card">
          {students.map((student) => {
            const logs = dates.map((day) => logMap.get(student.id)?.get(day)).filter((log): log is IbadahRecord => log !== undefined);
            return (
              <PeriodStudentSummaryCard
                key={student.id}
                student={student}
                logs={logs}
                activePrayers={activePrayers}
                showQuran={config?.enableQuranPages !== false}
                customItems={config?.customItems ?? []}
                daysInPeriod={dates.length}
                lang={lang}
                onClick={() => onStudentClick(student.id)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function StudentDetailSections({
  student,
  activePrayers,
  config,
  lang,
}: {
  student: StudentRow;
  activePrayers: typeof ALL_PRAYERS;
  config: IbadahConfig | null;
  lang: "en" | "ml";
}) {
  const customItems = config?.customItems ?? [];
  return (
    <div className="space-y-5">
      {activePrayers.length > 0 && (
        <section>
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500">
            {t("teacherPages", "prayerSection", lang)}
          </h3>
          <div className="divide-y divide-gray-100 rounded-xl border border-gray-100 bg-white">
            {activePrayers.map((prayer) => {
              const status = student[prayer.key];
              return (
                <div
                  key={prayer.key}
                  className="flex items-center justify-between gap-3 px-3 py-2.5"
                >
                  <span className="text-sm font-medium text-gray-800">
                    {prayer.label}
                  </span>
                  <span className="flex items-center gap-2 text-xs text-gray-600">
                    <PrayerStatusIcon
                      status={status}
                      lang={lang}
                      unrecorded={student.hasRecord === false}
                    />
                    {student.hasRecord === false
                      ? t("teacherPages", "notRecordedLabel", lang)
                      : status
                      ? t(
                          "parentPages",
                          PRAYER_STATUS_META[status].labelKey,
                          lang,
                        )
                      : t("parentPages", "missedLabel", lang)}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}
      {config?.enableQuranPages !== false && (
        <section>
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500">
            {t("teacherPages", "quranPagesHeader", lang)}
          </h3>
          <div className="flex items-center gap-2 rounded-xl border border-gray-100 bg-white px-3 py-3 text-sm text-gray-800">
            <BookOpen aria-hidden="true" className="h-4 w-4 text-blue-600" />
            {student.hasRecord === false ? (
              t("teacherPages", "notRecordedLabel", lang)
            ) : (
              <>
                <span className="font-semibold">{student.quranPages}</span>
                {t("parentPages", "pages", lang)}
              </>
            )}
          </div>
        </section>
      )}
      {customItems.length > 0 && (
        <section>
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500">
            {t("teacherPages", "customSection", lang)}
          </h3>
          <div className="divide-y divide-gray-100 rounded-xl border border-gray-100 bg-white">
            {customItems.map((item) => {
              const value = student.customData[item.key];
              const displayValue =
                value === undefined || value === null || value === ""
                  ? t("teacherPages", "notRecordedLabel", lang)
                  : item.type === "boolean"
                    ? t(
                        "parentPages",
                        value ? "yesLabel" : "noLabel",
                        lang,
                      )
                    : String(value);
              return (
                <div
                  key={item.key}
                  className="flex items-center justify-between gap-3 px-3 py-3 text-sm"
                >
                  <span className="flex items-center gap-2 text-gray-600">
                    <Icon icon={item.icon || "lucide:hash"} className="size-4 text-violet-600" aria-hidden="true" />
                    {item.label}
                  </span>
                  <span className="text-right font-semibold text-gray-900">
                    {displayValue}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

function fmt(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function fmtShort(iso: string) {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}
function getLast7Days(endDate: string): string[] {
  const dates: string[] = [];
  const end = new Date(`${endDate}T00:00:00`);
  for (let i = 6; i >= 0; i--) {
    const d = new Date(end);
    d.setDate(d.getDate() - i);
    dates.push(fmt(d));
  }
  return dates;
}

function getPeriodDates(from: string, to: string): string[] {
  const result: string[] = [];
  const cursor = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  while (cursor <= end) {
    result.push(fmt(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return result;
}

async function getAllClassStudents(
  clientId: string,
  token: string,
  classId: string,
): Promise<StudentRecord[]> {
  const students: StudentRecord[] = [];
  const limit = 200;
  let page = 1;
  while (true) {
    const result = await getStudents(clientId, token, { classId, page, limit, status: "ACTIVE" });
    students.push(...result.data);
    if (result.data.length === 0 || students.length >= result.total) break;
    page += 1;
  }
  return students;
}

function reportPrayerType(status: PrayerStatus | null): string {
  if (!status) return "-";
  if (status === "JAMA") return "Jamaath";
  if (status === "QALA") return "Qada";
  if (status === "NOT_PRAYABLE") return "Excused";
  return "Ada";
}

export default function TeacherIbadahPage({
  initialDate,
  embedded = false,
}: { initialDate?: string; embedded?: boolean } = {}) {
  const navigate = useNavigate();
  const { user, accessToken } = useAuthStore();
  const { lang } = useLanguageStore();
  const cid = user?.clientId ?? "";
  const token = accessToken ?? "";

  const {
    activeClassId,
    activeClass,
    classes,
    isLoading: loadingClasses,
  } = useActiveClass();
  const [date, setDate] = useState(initialDate ?? fmt(new Date()));
  useEffect(() => {
    if (initialDate) setDate(initialDate);
  }, [initialDate]);
  const [viewMode, setViewMode] = useState<ViewMode>("daily");

  // Daily view state
  const [rows, setRows] = useState<StudentRow[]>([]);
  const [config, setConfig] = useState<IbadahConfig | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [selectedPeriodDay, setSelectedPeriodDay] = useState<string | null>(null);

  // Period views share the same records and student list.
  const [periodLogs, setPeriodLogs] = useState<IbadahRecord[]>([]);
  const [periodStudents, setPeriodStudents] = useState<StudentRecord[]>([]);

  // Custom view state
  const [customFrom, setCustomFrom] = useState(() => {
    const d = new Date();
    return fmt(new Date(d.getFullYear(), d.getMonth(), 1));
  });
  const [customTo, setCustomTo] = useState(() => fmt(new Date()));
  useEffect(() => {
    setSelectedStudentId(null);
    setSelectedPeriodDay(null);
  }, [date, customFrom, customTo, activeClassId]);

  const [loadingIbadah, setLoadingIbadah] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  // Daily load
  const loadDailyIbadah = useCallback(async () => {
    if (!cid || !token || !activeClassId) return;
    const requestId = ++requestIdRef.current;
    setLoadingIbadah(true);
    setError(null);
    try {
      const [ibadahData, students] = await Promise.all([
        getClassIbadah(cid, token, { classId: activeClassId, date }),
        getAllClassStudents(cid, token, activeClassId),
      ]);
      const logsByStudent = new Map(
        ibadahData.logs.map((log) => [log.studentId, log]),
      );
      if (requestId !== requestIdRef.current) return;
      setConfig(ibadahData.config);
      setRows(
        students.map((student) => {
          const log = logsByStudent.get(student.id);
          return {
            studentId: student.id,
            name: student.name,
            adno: student.adno,
            fajr: log?.fajr ?? null,
            dhuhr: log?.dhuhr ?? null,
            asr: log?.asr ?? null,
            maghrib: log?.maghrib ?? null,
            isha: log?.isha ?? null,
            quranPages: log?.quranPages ?? 0,
            customData: log?.customData ?? {},
            hasRecord: Boolean(log),
          };
        }),
      );
    } catch (e) {
      if (requestId === requestIdRef.current) setError((e as Error).message);
    } finally {
      if (requestId === requestIdRef.current) setLoadingIbadah(false);
    }
  }, [cid, token, activeClassId, date]);

  const weekDates = useMemo(() => getLast7Days(date), [date]);
  const [monthYear, monthNumber] = date.slice(0, 7).split("-").map(Number);
  const monthlyFrom = fmt(new Date(monthYear, monthNumber - 1, 1));
  const monthlyTo = [fmt(new Date(monthYear, monthNumber, 0)), fmt(new Date())].sort()[0];
  const periodFrom = viewMode === "weekly" ? weekDates[0] : viewMode === "monthly" ? monthlyFrom : customFrom;
  const periodTo = viewMode === "weekly" ? weekDates[6] : viewMode === "monthly" ? monthlyTo : customTo;
  const periodDates = useMemo(() => getPeriodDates(periodFrom, periodTo), [periodFrom, periodTo]);

  const loadPeriodIbadah = useCallback(async () => {
    if (!cid || !token || !activeClassId || !periodFrom || !periodTo || periodFrom > periodTo) return;
    const requestId = ++requestIdRef.current;
    setLoadingIbadah(true);
    setError(null);
    try {
      const [ibadahData, students] = await Promise.all([
        getClassIbadah(cid, token, { classId: activeClassId, from: periodFrom, to: periodTo }),
        getAllClassStudents(cid, token, activeClassId),
      ]);
      if (requestId !== requestIdRef.current) return;
      setConfig(ibadahData.config);
      setPeriodLogs(ibadahData.logs);
      setPeriodStudents(students);
    } catch (e) {
      if (requestId === requestIdRef.current) setError((e as Error).message);
    } finally {
      if (requestId === requestIdRef.current) setLoadingIbadah(false);
    }
  }, [cid, token, activeClassId, periodFrom, periodTo]);

  useEffect(() => {
    if (viewMode === "daily") loadDailyIbadah();
    else loadPeriodIbadah();
  }, [viewMode, loadDailyIbadah, loadPeriodIbadah]);

  const activePrayers = useMemo(
    () =>
      config
        ? ALL_PRAYERS.filter((p) => config[p.configKey] !== false)
        : ALL_PRAYERS,
    [config],
  );
  const customItems = config?.customItems ?? [];

  const selectedDay = selectedPeriodDay && periodDates.includes(selectedPeriodDay)
    ? selectedPeriodDay
    : periodDates[periodDates.length - 1] ?? date;

  // Build log map for all period views: studentId → date → log
  const logMap = useMemo(() => {
    const map = new Map<string, Map<string, IbadahRecord>>();
    for (const log of periodLogs) {
      const dateKey = log.date.split("T")[0];
      if (!map.has(log.studentId)) map.set(log.studentId, new Map());
      map.get(log.studentId)!.set(dateKey, log);
    }
    return map;
  }, [periodLogs]);

  const periodDayRows = useMemo(
    () =>
      periodStudents.map((student): StudentRow => {
        const log = logMap.get(student.id)?.get(selectedDay);
        return {
          studentId: student.id,
          name: student.name,
          adno: student.adno,
          fajr: log?.fajr ?? null,
          dhuhr: log?.dhuhr ?? null,
          asr: log?.asr ?? null,
          maghrib: log?.maghrib ?? null,
          isha: log?.isha ?? null,
          quranPages: log?.quranPages ?? 0,
          customData: log?.customData ?? {},
          hasRecord: Boolean(log),
        };
      }),
    [periodStudents, logMap, selectedDay],
  );
  const selectedStudent =
    (viewMode === "daily" ? rows : periodDayRows).find(
      (row) => row.studentId === selectedStudentId,
    ) ?? null;
  const detailDate = viewMode === "daily" ? date : selectedDay;

  const downloadWeeklyReport = useCallback(() => {
    if (!activeClass || periodStudents.length === 0) return;

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });
    const margin = 10;
    const rowHeight = 7;
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const columns = [
      "Student",
      "Adm. No.",
      "Date",
      ...activePrayers.map((p) => p.label),
      ...(config?.enableQuranPages === false ? [] : ["Quran"]),
    ];
    const widths = [
      39,
      23,
      19,
      ...activePrayers.map(() => 18),
      ...(config?.enableQuranPages === false ? [] : [15]),
    ];
    const totalWidth = widths.reduce((sum, width) => sum + width, 0);
    const startX = Math.max(margin, (pageWidth - totalWidth) / 2);
    let y = 10;

    const fitCellText = (value: string, width: number) => {
      const availableWidth = width - 4;
      if (pdf.getTextWidth(value) <= availableWidth) return value;
      let shortened = value;
      while (shortened && pdf.getTextWidth(`${shortened}...`) > availableWidth) {
        shortened = shortened.slice(0, -1);
      }
      return `${shortened}...`;
    };

    const drawHeader = () => {
      pdf.setFontSize(15);
      pdf.setFont("helvetica", "bold");
      pdf.text("Weekly Ibadah Report", startX, y);
      y += 7;
      pdf.setFontSize(9);
      pdf.setFont("helvetica", "normal");
      pdf.text(
        fitCellText(
          `${activeClass.name}  |  ${weekDates[0]} to ${weekDates[6]}`,
          pageWidth - startX - margin + 4,
        ),
        startX,
        y,
      );
      y += 7;
      let x = startX;
      pdf.setFillColor(16, 185, 129);
      pdf.rect(startX, y, totalWidth, rowHeight, "F");
      pdf.setTextColor(255, 255, 255);
      pdf.setFont("helvetica", "bold");
      columns.forEach((column, index) => {
        pdf.text(fitCellText(column, widths[index]), x + 2, y + 4.7);
        x += widths[index];
      });
      pdf.setTextColor(0, 0, 0);
      y += rowHeight;
    };

    drawHeader();
    pdf.setFontSize(7.5);
    pdf.setFont("helvetica", "normal");
    for (const student of periodStudents) {
      const studentLogs = logMap.get(student.id);
      for (const day of weekDates) {
        if (y > pageHeight - 18) {
          pdf.addPage();
          y = 10;
          drawHeader();
          pdf.setFontSize(7.5);
          pdf.setFont("helvetica", "normal");
        }
        const log = studentLogs?.get(day);
        const values = [
          student.name,
          student.adno,
          fmtShort(day),
          ...activePrayers.map((p) => reportPrayerType(log?.[p.key] ?? null)),
          ...(config?.enableQuranPages === false
            ? []
            : [log ? String(log.quranPages) : "-"]),
        ];
        let x = startX;
        if (Math.round(y / rowHeight) % 2 === 0) {
          pdf.setFillColor(248, 250, 252);
          pdf.rect(startX, y, totalWidth, rowHeight, "F");
        }
        values.forEach((value, index) => {
          pdf.setTextColor(31, 41, 55);
          pdf.text(
            fitCellText(String(value), widths[index]),
            x + 2,
            y + 4.7,
          );
          pdf.setDrawColor(226, 232, 240);
          pdf.rect(x, y, widths[index], rowHeight);
          x += widths[index];
        });
        y += rowHeight;
      }
    }
    pdf.setFontSize(8);
    pdf.setTextColor(75, 85, 99);
    pdf.text(
      "Prayer type: Jamaath = congregation | Qada = made up | Ada = performed | Excused = not prayable | - = not recorded",
      startX,
      pageHeight - 8,
    );
    pdf.save(
      `ibadah-weekly-${activeClass.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-${weekDates[6]}.pdf`,
    );
  }, [
    activeClass,
    activePrayers,
    config?.enableQuranPages,
    logMap,
    weekDates,
    periodStudents,
  ]);

  const periodStudentMetrics = useMemo(() => {
    const map = new Map<string, {
      student: StudentRecord;
      daysLogged: number;
      jama: number;
      ada: number;
      qala: number;
      excused: number;
      quran: number;
      logs: IbadahRecord[];
    }>();

    for (const s of periodStudents) {
      map.set(s.id, {
        student: s,
        daysLogged: 0,
        jama: 0,
        ada: 0,
        qala: 0,
        excused: 0,
        quran: 0,
        logs: [],
      });
    }

    for (const log of periodLogs) {
      let m = map.get(log.studentId);
      if (!m) {
        m = {
          student: log.student as any,
          daysLogged: 0,
          jama: 0,
          ada: 0,
          qala: 0,
          excused: 0,
          quran: 0,
          logs: [],
        };
        map.set(log.studentId, m);
      }
      m.daysLogged++;
      m.quran += log.quranPages || 0;
      m.logs.push(log);
      for (const p of activePrayers) {
        const val = log[p.key];
        if (val === "JAMA") m.jama++;
        else if (val === "ADA") m.ada++;
        else if (val === "QALA") m.qala++;
        else if (val === "NOT_PRAYABLE") m.excused++;
      }
    }

    return Array.from(map.values()).sort((a, b) => a.student.name.localeCompare(b.student.name));
  }, [periodStudents, periodLogs, activePrayers]);

  const downloadPeriodSummaryReport = useCallback(() => {
    if (!activeClass || periodStudentMetrics.length === 0) return;

    const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const margin = 10;
    const rowHeight = 7;
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const columns = ["Student", "Admission No.", "Days Logged", "Jama'a", "Ada'", "Qada'", "Excused", "Quran Pages"];
    const widths = [55, 30, 28, 26, 26, 26, 26, 28];
    const totalWidth = widths.reduce((sum, width) => sum + width, 0);
    const startX = Math.max(margin, (pageWidth - totalWidth) / 2);
    let y = 10;

    const drawHeader = () => {
      pdf.setFontSize(15);
      pdf.setFont("helvetica", "bold");
      pdf.text(`${viewMode === "monthly" ? "Monthly" : "Custom"} Ibadah Performance Report`, startX, y);
      y += 7;
      pdf.setFontSize(9);
      pdf.setFont("helvetica", "normal");
      pdf.text(`${activeClass.name}  •  ${periodFrom} to ${periodTo}`, startX, y);
      y += 7;
      let x = startX;
      pdf.setFillColor(16, 185, 129);
      pdf.rect(startX, y, totalWidth, rowHeight, "F");
      pdf.setTextColor(255, 255, 255);
      pdf.setFont("helvetica", "bold");
      columns.forEach((column, index) => {
        pdf.text(column, x + 2, y + 4.7);
        x += widths[index];
      });
      pdf.setTextColor(0, 0, 0);
      y += rowHeight;
    };

    drawHeader();
    pdf.setFontSize(8);
    pdf.setFont("helvetica", "normal");
    for (const item of periodStudentMetrics) {
      if (y > pageHeight - 15) {
        pdf.addPage();
        y = 10;
        drawHeader();
        pdf.setFontSize(8);
        pdf.setFont("helvetica", "normal");
      }
      const values = [
        item.student.name,
        item.student.adno,
        String(item.daysLogged),
        String(item.jama),
        String(item.ada),
        String(item.qala),
        String(item.excused),
        String(item.quran),
      ];
      let x = startX;
      if (Math.round(y / rowHeight) % 2 === 0) {
        pdf.setFillColor(248, 250, 252);
        pdf.rect(startX, y, totalWidth, rowHeight, "F");
      }
      values.forEach((value, index) => {
        pdf.setTextColor(31, 41, 55);
        pdf.text(String(value).slice(0, 25), x + 2, y + 4.7);
        pdf.setDrawColor(226, 232, 240);
        pdf.rect(x, y, widths[index], rowHeight);
        x += widths[index];
      });
      y += rowHeight;
    }
    pdf.save(`ibadah-${viewMode}-${activeClass.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-${periodFrom}-to-${periodTo}.pdf`);
  }, [activeClass, viewMode, periodFrom, periodTo, periodStudentMetrics]);

  const content = (
    <>
      {!embedded && (
        <PageHeader
          title={t("teacherPages", "ibadahRecordsTitle", lang)}
           backHref="/teacher"
          action={
            // <button
            //   type="button"
            //   onClick={() =>
            //     navigate(
            //       `/teacher/best-performance?category=ibadah${
            //         activeClassId ? `&classId=${activeClassId}` : ""
            //       }`
            //     )
            //   }
            //   className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
            // >
            //   <Trophy className="w-3.5 h-3.5" />
            //   <span>{lang === "ml" ? "റാങ്ക് ലിസ്റ്റ്" : "Class Rankings"}</span>
            // </button>
            <></>
          }
        />
      )}


      {error && (
        <ApiErrorBanner
          message={error}
          onRetry={viewMode === "daily" ? loadDailyIbadah : loadPeriodIbadah}
        />
      )}

      {loadingClasses ? (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-20 rounded-xl" />
            <Skeleton className="h-9 w-20 rounded-xl" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-xl" />
            <Skeleton className="h-8 flex-1 rounded-xl" />
            <Skeleton className="h-10 w-10 rounded-xl" />
          </div>
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      ) : classes.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">
          {t("teacherPages", "noClassesAssigned", lang)}
        </div>
      ) : (
        <>
         <div className="p-4!">
           <Tabs
            value={viewMode}
            onValueChange={(value) => {
              setSelectedStudentId(null);
              setSelectedPeriodDay(null);
              setViewMode(value as ViewMode);
            }}
            className="px-0 pb-2"
          >
            <TabsList aria-label="Ibadah view" className="w-full bg-gray-100">
              <TabsTrigger value="daily" className="flex-1 px-2 py-2 text-sm">
                {t("teacherPages", "dailyView", lang)}
              </TabsTrigger>
              <TabsTrigger value="weekly" className="flex-1 px-2 py-2 text-sm">
                {t("teacherPages", "weeklyView", lang)}
              </TabsTrigger>
              <TabsTrigger value="monthly" className="flex-1 px-2 py-2 text-sm">
                {t("teacherPages", "monthlyView", lang)}
              </TabsTrigger>
              <TabsTrigger value="custom" className="flex-1 px-2 py-2 text-sm">
                {t("teacherPages", "customSection", lang)}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {viewMode === "custom" ? (
            <ScrollableRangeNavigator
              from={customFrom}
              to={customTo}
              presets={[
                ...commonRangePreset().slice(0, 3).map((preset, index) => ({ ...preset, label: index === 0 ? "This Week" : preset.label })),
                { label: "Last 30 Days", from: new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() - 30), to: new Date() },
              ]}
              onChange={({ from, to }) => { setCustomFrom(from); setCustomTo(to); }}
              className=" mb-0"
            />
          ) : (
            <div className="border-b border-gray-100 px-3 py-2">
              <div className="flex min-w-0 items-center gap-2">
                {viewMode === "daily" ? (
                  <ScrollableDateNavigator date={date} hideCalendarButton onDateChange={setDate} pickerTitle="Choose ibadah date" />
                ) : viewMode === "weekly" ? (
                  <ScrollableWeekNavigator date={date} hideCalendarButton onDateChange={setDate} pickerTitle="Choose ibadah week" />
                ) : (
                  <ScrollableMonthlyNavigator date={date} hideCalendarButton onDateChange={setDate} pickerTitle="Choose ibadah month" />
                )}
              </div>
            </div>
          )}

         </div>
          {loadingIbadah ? (
            <div className="space-y-3 px-3" aria-label="Loading ibadah records" aria-busy="true">
              {viewMode === "daily" && (
                <>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="rounded-2xl border border-gray-100 bg-white p-4">
                        <Skeleton className="h-3 w-24 rounded-md" />
                        <Skeleton className="mt-3 h-7 w-12 rounded-md" />
                        <Skeleton className="mt-2 h-3 w-28 rounded-md" />
                      </div>
                    ))}
                  </div>
                  <div className="divide-y divide-gray-100 overflow-hidden rounded-2xl bg-white card">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-3 px-4 py-4">
                        <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
                        <div className="min-w-0 flex-1 space-y-2">
                          <Skeleton className="h-4 w-32 rounded-md" />
                          <Skeleton className="h-3 w-20 rounded-md" />
                        </div>
                        <div className="flex gap-1">
                          {Array.from({ length: 5 }).map((_, j) => (
                            <Skeleton key={j} className="h-5 w-5 rounded-md" />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
              {viewMode !== "daily" && (
                <>
                  <Skeleton className="h-36 rounded-2xl" />
                  <div className="divide-y divide-gray-100 overflow-hidden rounded-2xl bg-white card">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-3 px-4 py-4">
                        <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
                        <div className="min-w-0 flex-1 space-y-2">
                          <Skeleton className="h-4 w-32 rounded-md" />
                          <Skeleton className="h-3 w-20 rounded-md" />
                        </div>
                        <Skeleton className="h-8 w-20 rounded-lg" />
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : (
            <>
              {/* ── DAILY VIEW ── */}
              {viewMode === "daily" && (
                <>
                  {rows.length === 0 ? (
                    <div className="text-center py-12 text-gray-400 text-sm">
                      <Moon className="w-10 h-10 mx-auto mb-3 text-gray-200" />
                      {t("teacherPages", "noStudentsInClass", lang)}
                    </div>
                  ) : (
                    <div className="space-y-3 px-3">
                      <DailyIbadahStats
                        rows={rows}
                        activePrayers={activePrayers}
                        config={config}
                        lang={lang}
                      />
                      <div className="divide-y divide-gray-100 overflow-hidden rounded-2xl bg-white card">
                        {rows.map((student) => (
                          <StudentSummaryCard
                            key={student.studentId}
                            student={student}
                            activePrayers={activePrayers}
                            showQuran={config?.enableQuranPages !== false}
                            lang={lang}
                            onClick={() =>
                              setSelectedStudentId(student.studentId)
                            }
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {viewMode !== "daily" && (
                <PeriodIbadahView
                  viewMode={viewMode}
                  students={periodStudents}
                  dates={periodDates}
                  logMap={logMap}
                  activePrayers={activePrayers}
                  config={config}
                  lang={lang}
                  onDownload={viewMode === "weekly" ? downloadWeeklyReport : downloadPeriodSummaryReport}
                  onStudentClick={(studentId) => {
                    const latestRecordedDay = [...periodDates].reverse().find((day) => logMap.get(studentId)?.has(day));
                    setSelectedPeriodDay(latestRecordedDay ?? periodDates[periodDates.length - 1] ?? null);
                    setSelectedStudentId(studentId);
                  }}
                />
              )}
            </>
          )}
          <Drawer
            open={selectedStudent !== null}
            onOpenChange={(open) => {
              if (!open) setSelectedStudentId(null);
            }}
          >
            <DrawerContent className="max-h-[85dvh] bg-white">
              <DrawerHeader className="flex-row items-start justify-between gap-3 border-b border-gray-100 pb-4 text-left">
                <div className="min-w-0">
                  <DrawerTitle className="truncate text-lg font-semibold text-gray-900">
                    {selectedStudent?.name}
                  </DrawerTitle>
                  <DrawerDescription className="text-xs text-gray-500">
                    {selectedStudent?.adno} · {fmtShort(detailDate)}
                  </DrawerDescription>
                </div>
                <DrawerClose
                  aria-label={t("common", "close", lang)}
                  className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100"
                >
                  <X aria-hidden="true" className="h-5 w-5" />
                </DrawerClose>
              </DrawerHeader>
              {selectedStudent && (
                <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                  {viewMode !== "daily" ? (
                    <div>
                      <div className="flex min-w-0">
                        <ScrollableDateNavigator
                          date={selectedDay}
                          visibleDates={periodDates}
                          hideCalendarButton
                          pickerTitle="Ibadah day"
                          onDateChange={(value) => {
                            if (periodDates.includes(value)) setSelectedPeriodDay(value);
                          }}
                        />
                      </div>
                      <div className="mt-4">
                        <StudentDetailSections
                          student={selectedStudent}
                          activePrayers={activePrayers}
                          config={config}
                          lang={lang}
                        />
                      </div>
                    </div>
                  ) : (
                    <StudentDetailSections
                      student={selectedStudent}
                      activePrayers={activePrayers}
                      config={config}
                      lang={lang}
                    />
                  )}
                </div>
              )}
            </DrawerContent>
          </Drawer>
          <div className="h-20" aria-hidden="true" />
        </>
      )}
    </>
  );

  return embedded ? content : <DashboardLayout>{content}</DashboardLayout>;
}
