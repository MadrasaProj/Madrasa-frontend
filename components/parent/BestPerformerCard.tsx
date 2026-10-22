import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { BestPerformer, BestPerformanceResponse } from "@/lib/best-performance-api";
import type { Lang } from "@/lib/i18n";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type CustomItems = NonNullable<BestPerformanceResponse["customItems"]>;

export function BestPerformerCard({
  performer,
  rank,
  isMyChild,
  customItems = [],
  lang,
}: {
  performer: BestPerformer;
  rank: number;
  isMyChild: boolean;
  customItems?: CustomItems;
  lang: Lang;
}) {
  return (
    <article
      className={cn(
        "mx-auto h-full max-w-md rounded-[30px] p-3.5 text-gray-950 sm:p-4",
        isMyChild && " ",
      )}
    >
      <div className="relative mt-7 rounded-[26px] bg-primary/6 px-5 pb-5 pt-12 text-center shadow-lg ring-1 ring-white/80 backdrop-blur-sm sm:px-6">
        <Avatar
          size="lg"
          className="absolute -top-10 left-1/2 !size-20 -translate-x-1/2 border-4 border-white"
          aria-hidden="true"
        >
          <AvatarImage src={performer.photoUrl || undefined} />
          <AvatarFallback className="bg-primary text-3xl font-semibold text-primary-foreground">
            {performer.name.trim().charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <p className="truncate text-lg font-semibold tracking-tight">{performer.name}</p>
        <p className="mt-1 text-xs text-gray-600">{performer.adno}</p>
        {isMyChild && (
          <p className="mt-1 text-xs font-semibold text-primary">
            {t("parentPages", "myChildBestPerf", lang)}
          </p>
        )}
        <div className="mt-6 grid grid-cols-3 divide-x divide-gray-200">
          {[
            { label: t("parentPages", "scoreLabel", lang), value: performer.score },
            { label: t("parentPages", "prayersLabel", lang), value: performer.totalPrayers },
            { label: t("parentPages", "pagesLabel", lang), value: performer.totalQuranPages },
          ].map(({ label, value }) => (
            <div key={label} className="min-w-0 px-1.5">
              <strong className="block text-xl font-semibold leading-none tabular-nums sm:text-2xl">
                {value}
              </strong>
              <span className="mt-1.5 block text-[11px] leading-tight text-gray-600">{label}</span>
            </div>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2 border-t border-gray-200/80 pt-4 text-xs font-medium text-gray-800">
          <span className="rounded-full border border-gray-200 bg-white px-3 py-2">
            {t("parentPages", "rankLabel", lang)} #{rank}
          </span>
          <span className="rounded-full border border-gray-200 bg-white px-3 py-2">
            {t("parentPages", "streakLabel", lang)} {performer.streak}d
          </span>
          <span className="rounded-full border border-gray-200 bg-white px-3 py-2">
            {t("parentPages", "consistencyLabel", lang)} {performer.consistency}%
          </span>
        </div>
        {Object.entries(performer.customCounts ?? {}).some(([, value]) => value > 0) && (
          <div className="mt-4 flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs text-gray-600">
            {Object.entries(performer.customCounts ?? {})
              .filter(([, value]) => value > 0)
              .map(([key, value]) => (
                <span key={key}>
                  {value} {customItems.find((item) => item.key === key)?.label ?? key}
                </span>
              ))}
          </div>
        )}
      </div>
    </article>
  );
}
