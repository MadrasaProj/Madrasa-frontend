import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/Skeleton";
import { getBestPerformers } from "@/lib/best-performance-api";
import { t, type Lang } from "@/lib/i18n";
import { queryKeys } from "@/lib/queryKeys";

type PeriodType = "week" | "month";

type TrendPeriod = {
  from: string;
  to: string;
  label: string;
  range: string;
};

const iso = (date: Date) => [
  date.getFullYear(),
  String(date.getMonth() + 1).padStart(2, "0"),
  String(date.getDate()).padStart(2, "0"),
].join("-");

function buildPeriods(type: PeriodType, lang: Lang): TrendPeriod[] {
  const today = new Date();
  const locale = lang === "ml" ? "ml-IN" : "en-GB";
  const count = type === "week" ? 8 : 6;

  return Array.from({ length: count }, (_, index) => {
    const offset = count - 1 - index;
    if (type === "month") {
      const start = new Date(today.getFullYear(), today.getMonth() - offset, 1);
      const end = offset === 0 ? today : new Date(start.getFullYear(), start.getMonth() + 1, 0);
      return {
        from: iso(start),
        to: iso(end),
        label: start.toLocaleDateString(locale, { month: "short" }),
        range: start.toLocaleDateString(locale, { month: "long", year: "numeric" }),
      };
    }

    const end = new Date(today);
    end.setDate(today.getDate() - offset * 7);
    const start = new Date(end);
    start.setDate(end.getDate() - 6);
    return {
      from: iso(start),
      to: iso(end),
      label: end.toLocaleDateString(locale, { day: "numeric", month: "short" }),
      range: `${start.toLocaleDateString(locale, { day: "numeric", month: "short" })} – ${end.toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" })}`,
    };
  });
}

type Props = {
  clientId: string;
  token: string;
  studentId: string;
  lang: Lang;
  periodType: PeriodType;
};

export function PerformanceHistoryCharts({ clientId, token, studentId, lang, periodType }: Props) {
  const periods = useMemo(() => buildPeriods(periodType, lang), [periodType, lang]);
  const results = useQueries({
    queries: periods.map((period) => {
      const params = { from: period.from, to: period.to, limit: 100 };
      return {
        queryKey: queryKeys.bestPerformance.list(clientId, params),
        queryFn: () => getBestPerformers(clientId, token, params),
        staleTime: 5 * 60 * 1000,
      };
    }),
  });

  const loading = results.some((result) => result.isPending);
  const failed = results.some((result) => result.isError);
  const customItems = results.flatMap((result) => result.data?.customItems ?? [])
    .filter((item, index, items) => items.findIndex((other) => other.key === item.key) === index);
  const points = periods.map((period, index) => {
    const performer = results[index]?.data?.performers.find((entry) => entry.studentId === studentId);
    const custom = Object.fromEntries(customItems.map((item, itemIndex) => [`custom${itemIndex}`, performer?.customCounts?.[item.key] ?? 0]));
    return {
      ...period,
      score: performer?.score ?? 0,
      prayers: performer?.totalPrayers ?? 0,
      pages: performer?.totalQuranPages ?? 0,
      ...custom,
      hasLog: !!performer,
    };
  });
  const hasHistory = points.some((point) => point.hasLog);
  const hasCustomActivity = customItems.some((_, index) => points.some((point) => Number(point[`custom${index}` as keyof typeof point] ?? 0) > 0));
  const scoreConfig = { score: { label: t("parentPages", "scoreLabel", lang), color: "var(--primary)" } } satisfies ChartConfig;
  const prayerConfig = { prayers: { label: t("parentPages", "prayersLabel", lang), color: "var(--chart-2)" } } satisfies ChartConfig;
  const pagesConfig = { pages: { label: t("parentPages", "pagesLabel", lang), color: "var(--chart-3)" } } satisfies ChartConfig;
  const customColors = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];
  const customConfig: ChartConfig = Object.fromEntries(customItems.map((item, index) => [
    `custom${index}`,
    { label: item.label, color: customColors[index % customColors.length] },
  ]));
  const periodLabel = periodType === "week"
    ? (lang === "ml" ? "കഴിഞ്ഞ 8 ആഴ്ചകൾ" : "Last 8 weeks")
    : (lang === "ml" ? "കഴിഞ്ഞ 6 മാസങ്ങൾ" : "Last 6 months");
  const tooltip = <ChartTooltipContent className="shadow-none" labelFormatter={(_, payload) => String(payload[0]?.payload?.range ?? "")} />;

  return <section className="mt-16 border-t border-gray-200 pt-10" aria-label={lang === "ml" ? "വിദ്യാർത്ഥിയുടെ പ്രകടന ചരിത്രം" : "Student performance history"}>
    <div className="text-center">
      <h2 className="text-2xl font-semibold tracking-tight text-gray-950">{lang === "ml" ? "പ്രകടന ചരിത്രം" : "Performance history"}</h2>
      <p className="mt-2 text-sm text-gray-500">{periodLabel}</p>
    </div>

    {loading ? <div className="mt-7 grid gap-8 md:grid-cols-2">{Array.from({ length: 3 }, (_, index) => <Skeleton key={index} className="h-64 rounded-xl" />)}</div>
      : failed ? <p role="alert" className="mt-7 border-t border-gray-200 pt-6 text-sm text-gray-600">{lang === "ml" ? "പ്രകടന ചരിത്രം ലോഡ് ചെയ്യാനായില്ല." : "Could not load performance history."}</p>
      : !hasHistory ? <p className="mt-7 border-t border-gray-200 pt-6 text-sm text-gray-600">{lang === "ml" ? "ഈ കാലയളവിൽ പ്രവർത്തന രേഖകളില്ല." : "No activity recorded in these periods."}</p>
      : <div className="mt-8 grid gap-x-8 gap-y-10 md:grid-cols-2">
        <div className="min-w-0 border-t border-gray-200 pt-5">
          <h3 className="text-center text-sm font-bold text-gray-900">{lang === "ml" ? "സ്കോർ" : "Score by period"}</h3>
          <ChartContainer config={scoreConfig} className="mt-4 h-64 w-full" role="img" aria-label={lang === "ml" ? "ഓരോ കാലയളവിലെയും സ്കോർ" : "Score for each period"}>
            <LineChart accessibilityLayer data={points} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={10} />
              <YAxis tickLine={false} axisLine={false} width={36} allowDecimals={false} />
              <ChartTooltip content={tooltip} />
              <Line dataKey="score" type="monotone" stroke="var(--color-score)" strokeWidth={3} dot={{ r: 3, fill: "var(--primary)" }} activeDot={{ r: 6 }} />
            </LineChart>
          </ChartContainer>
        </div>
        <div className="min-w-0 border-t border-gray-200 pt-5">
          <h3 className="text-center text-sm font-bold text-gray-900">{lang === "ml" ? "നമസ്കാരങ്ങൾ" : "Prayers by period"}</h3>
          <ChartContainer config={prayerConfig} className="mt-4 h-64 w-full" role="img" aria-label={lang === "ml" ? "ഓരോ കാലയളവിലെയും നമസ്കാരങ്ങൾ" : "Prayers for each period"}>
            <BarChart accessibilityLayer data={points} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={10} />
              <YAxis tickLine={false} axisLine={false} width={36} allowDecimals={false} />
              <ChartTooltip cursor={{ fill: "var(--muted)" }} content={tooltip} />
              <Bar dataKey="prayers" fill="var(--color-prayers)" radius={[5, 5, 0, 0]} maxBarSize={32} />
            </BarChart>
          </ChartContainer>
        </div>
        <div className="min-w-0 border-t border-gray-200 pt-5">
          <h3 className="text-center text-sm font-bold text-gray-900">{lang === "ml" ? "ഖുർആൻ പേജുകൾ" : "Qur’an pages by period"}</h3>
          <ChartContainer config={pagesConfig} className="mt-4 h-64 w-full" role="img" aria-label={lang === "ml" ? "ഓരോ കാലയളവിലെയും ഖുർആൻ പേജുകൾ" : "Qur’an pages for each period"}>
            <AreaChart accessibilityLayer data={points} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={10} />
              <YAxis tickLine={false} axisLine={false} width={36} allowDecimals={false} />
              <ChartTooltip content={tooltip} />
              <Area dataKey="pages" type="monotone" stroke="var(--color-pages)" fill="var(--color-pages)" fillOpacity={0.16} strokeWidth={2.5} />
            </AreaChart>
          </ChartContainer>
        </div>
        {hasCustomActivity && <div className="min-w-0 border-t border-gray-200 pt-5">
          <h3 className="text-center text-sm font-bold text-gray-900">{lang === "ml" ? "മറ്റ് പ്രവർത്തനങ്ങൾ" : "Other activities by period"}</h3>
          <ChartContainer config={customConfig} className="mt-4 h-64 w-full" role="img" aria-label={lang === "ml" ? "ഓരോ കാലയളവിലെയും മറ്റ് പ്രവർത്തനങ്ങൾ" : "Other activities for each period"}>
            <BarChart accessibilityLayer data={points} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={10} />
              <YAxis tickLine={false} axisLine={false} width={36} allowDecimals={false} />
              <ChartTooltip cursor={{ fill: "var(--muted)" }} content={tooltip} />
              {customItems.map((item, index) => <Bar key={item.key} dataKey={`custom${index}`} stackId="activities" fill={`var(--color-custom${index})`} maxBarSize={32} />)}
            </BarChart>
          </ChartContainer>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">{customItems.map((item, index) => <span key={item.key}><span className="mr-1.5 inline-block size-2.5 rounded-sm align-middle" style={{ backgroundColor: customColors[index % customColors.length] }} />{item.label}</span>)}</div>
        </div>}
      </div>}
  </section>;
}
