import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { BestPerformer, BestPerformanceResponse } from "@/lib/best-performance-api";
import type { Lang } from "@/lib/i18n";
import { t } from "@/lib/i18n";

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
    <article className="mx-auto h-full max-w-md rounded-[30px]   text-gray-950 sm:p-4">
      <div className="relative  rounded-[26px]   pb-5 pt-3 p-4 text-center     sm:px-6">
        <div className=" flex flex-col justify-center text-center items-center gap-4  ">
          <Avatar size="lg" className="!size-28 border-4 border-white" aria-hidden="true">
            <AvatarImage src={performer.photoUrl || undefined} />
            <AvatarFallback className="bg-primary text-4xl font-semibold text-primary-foreground">
              {performer.name.trim().charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="mb-1 text-xl flex items-baseline justify-center gap-1.5">
              <span className=" font-semibold uppercase tracking-wide text-primary-400">{t("parentPages", "rankLabel", lang)}:</span>
              <span className=" font-extrabold leading-none tabular-nums text-primary-700">{rank}</span>
            </p>
            <p className="truncate text-lg font-semibold tracking-tight">{performer.name}</p>
            <p className="mt-1 text-xs text-gray-600">{performer.adno}</p>
            {isMyChild && (
              <p className="mt-1 text-xs font-semibold text-primary">
                {t("parentPages", "myChildBestPerf", lang)}
              </p>
            )}
          </div>
        </div>
        <div className="mt-6 grid grid-cols-6 gap-2">
          {[
            { label: t("parentPages", "scoreLabel", lang), value: performer.score, tone: "from-primary-100/30" },
            { label: t("parentPages", "prayersLabel", lang), value: performer.totalPrayers, tone: "from-sky-100/30" },
            { label: t("parentPages", "pagesLabel", lang), value: performer.totalQuranPages, tone: "from-amber-100/30" },
            { label: t("parentPages", "streakLabel", lang), value: `${performer.streak}d`, tone: "from-violet-100/30" },
            { label: t("parentPages", "consistencyLabel", lang), value: `${performer.consistency}%`, tone: "from-emerald-100/30" },
          ].map(({ label, value, tone }, index) => (
            <div key={label} className={`min-w-0 px-3 text-left  bg-linear-120 ${tone}   px-1.5 py-3 ${index < 3 ? "col-span-2" : "col-span-3"}`}>
              <strong className="block text-xl font-semibold leading-none tabular-nums sm:text-2xl">
                {value}
              </strong>
              <span className="mt-1.5 block text-[11px] leading-tight text-gray-600">{label}</span>
            </div>
          ))}
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
