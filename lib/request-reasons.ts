import { CalendarDays, Clock, HeartPulse, type LucideIcon } from "lucide-react";

export type RequestReasonType = "LEAVE" | "SICK" | "EARLY_LEAVE";
export type RequestConfig = Record<string, unknown>;

export const REQUEST_DAYS = [
  { value: "all", en: "All days", ml: "എല്ലാ ദിവസവും" },
  { value: "sun", en: "Sunday", ml: "ഞായർ" },
  { value: "mon", en: "Monday", ml: "തിങ്കൾ" },
  { value: "tue", en: "Tuesday", ml: "ചൊവ്വ" },
  { value: "wed", en: "Wednesday", ml: "ബുധൻ" },
  { value: "thu", en: "Thursday", ml: "വ്യാഴം" },
  { value: "fri", en: "Friday", ml: "വെള്ളി" },
  { value: "sat", en: "Saturday", ml: "ശനി" },
] as const;

interface ReasonSchema {
  label: string;
  labelKey: string;
  color: string;
  bg: string;
  icon: LucideIcon;
  // Flags describe which date inputs are enabled, not the submitted date values.
  startDate: boolean;
  endDate: boolean;
  configs: {
    leaveTime?: { type: "time"; default: string; required: boolean };
    days?: { type: "weekdays"; default: string[]; options: typeof REQUEST_DAYS };
  };
}

export const REQUEST_REASON_SCHEMA: Record<RequestReasonType, ReasonSchema> = {
  LEAVE: {
    label: "Leave", labelKey: "leaveLabel", color: "text-amber-600",
    bg: "bg-amber-50", icon: CalendarDays, startDate: true, endDate: true, configs: {},
  },
  SICK: {
    label: "Sick", labelKey: "sickLabel", color: "text-orange-600",
    bg: "bg-orange-50", icon: HeartPulse, startDate: true, endDate: true, configs: {},
  },
  EARLY_LEAVE: {
    label: "Early leave", labelKey: "earlyLeaveLabel", color: "text-blue-600",
    bg: "bg-blue-50", icon: Clock, startDate: true, endDate: true,
    configs: {
      days: { type: "weekdays", default: ["all"], options: REQUEST_DAYS },
      leaveTime: { type: "time", default: "", required: true },
    },
  },
};

export const REQUEST_REASON_TYPES = Object.keys(REQUEST_REASON_SCHEMA) as RequestReasonType[];

export function getDefaultRequestConfig(reason: RequestReasonType): RequestConfig {
  const { days, leaveTime } = REQUEST_REASON_SCHEMA[reason].configs;
  return {
    ...(days ? { days: [...days.default] } : {}),
    ...(leaveTime ? { leaveTime: leaveTime.default } : {}),
  };
}

export function isValidLeaveTime(value: unknown): value is string {
  return typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function getRequestConfigSummary(reason: RequestReasonType, config: RequestConfig, lang: string): string {
  const field = REQUEST_REASON_SCHEMA[reason].configs.days;
  if (!field || !Array.isArray(config.days)) return "";
  const days = field.options.filter(day => (config.days as unknown[]).includes(day.value))
    .map(day => lang === "ml" ? day.ml : day.en).join(", ");
  const time = REQUEST_REASON_SCHEMA[reason].configs.leaveTime && isValidLeaveTime(config.leaveTime)
    ? (lang === "ml" ? "പോകുന്ന സമയം" : "Leave time") + ": " + config.leaveTime
    : "";
  return [days, time].filter(Boolean).join(" · ");
}
