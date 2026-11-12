import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import { type FeePayment } from "@/lib/fees-api";
import { t, type Lang } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { IndianRupee, Clock3 } from "lucide-react";
import { PolarAngleAxis, RadialBar, RadialBarChart } from "recharts";

const feeProgressChartConfig = {
  collected: { color: "#059669" },
} satisfies ChartConfig;

const feeStatusChartConfig = {
  paid: { label: "Paid", color: "#059669" },
  overdue: { label: "Overdue", color: "#dc2626" },
  pending: { label: "Pending", color: "#f59e0b" },
  waived: { label: "Waived", color: "#9ca3af" },
} satisfies ChartConfig;

export function FeeTypeProgress({ collected, total, ariaLabel }: { collected: number; total: number; ariaLabel?: string }) {
  const percentage = total > 0 ? Math.min(100, Math.max(0, (collected / total) * 100)) : 0;

  return (
    <div
      className="size-[30px] shrink-0"
      role="img"
      aria-label={ariaLabel ?? (total > 0 ? `${Math.round(percentage)}% collected` : "No amount recorded")}
    >
      <ChartContainer
        config={feeProgressChartConfig}
        initialDimension={{ width: 30, height: 30 }}
        className="!aspect-auto size-[30px]"
        aria-hidden="true"
      >
        <RadialBarChart
          data={[{ value: percentage, fill: "#059669" }]}
          startAngle={90}
          endAngle={-270}
          innerRadius={10}
          outerRadius={14}
        >
          <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
          <RadialBar
            dataKey="value"
            background={{ fill: "#e5e7eb" }}
            cornerRadius={3}
            isAnimationActive={false}
          />
        </RadialBarChart>
      </ChartContainer>
    </div>
  );
}

function FeeSemiCircle({
  segments,
  value,
  label,
  description,
}: {
  segments: { value: number; color: string }[];
  value: string;
  label: string;
  description: string;
}) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  const chartData = [
    {
      ...Object.fromEntries(segments.map((segment, index) => [`segment${index}`, segment.value])),
      empty: total === 0 ? 1 : 0,
    },
  ];

  return (
    <div className="relative mx-auto h-36 w-full max-w-72 sm:h-44" role="img" aria-label={description}>
      <ChartContainer
        config={feeStatusChartConfig}
        initialDimension={{ width: 288, height: 176 }}
        className="!aspect-auto h-full w-full"
        aria-hidden="true"
      >
        <RadialBarChart
          data={chartData}
          startAngle={180}
          endAngle={0}
          cx="50%"
          cy="92%"
          innerRadius={88}
          outerRadius={112}
        >
          <PolarAngleAxis type="number" domain={[0, Math.max(total, 1)]} tick={false} />
          {segments.map((segment, index) => (
            <RadialBar
              key={index}
              dataKey={`segment${index}`}
              stackId="fees"
              fill={segment.color}
              isAnimationActive={false}
            />
          ))}
          {total === 0 && (
            <RadialBar dataKey="empty" fill="#e5e7eb" isAnimationActive={false} />
          )}
        </RadialBarChart>
      </ChartContainer>
      <div className="pointer-events-none absolute inset-x-0 bottom-3 text-center">
        <div className="text-3xl font-semibold tabular-nums text-gray-950">{value}</div>
        <div className="text-[16px] font-medium text-gray-500">{label}</div>
      </div>
    </div>
  );
}

export function FeeStats({
  payments,
  lang,
}: {
  payments: FeePayment[];
  lang: Lang;
}) {
  const amountPaid = (payment: FeePayment) =>
    Number(payment.paidAmount ?? (payment.status === "PAID" ? payment.dueAmount : 0));
  const paid = payments.filter((payment) => payment.status === "PAID").length;
  const overdue = payments.filter((payment) => payment.status === "OVERDUE").length;
  const waived = payments.filter((payment) => payment.status === "WAIVED").length;
  const pending = payments.length - paid - overdue - waived;
  const collected = payments.reduce(
    (sum, payment) =>
      payment.status === "WAIVED" ? sum : sum + amountPaid(payment),
    0,
  );
  const outstanding = payments.reduce(
    (sum, payment) =>
      payment.status === "WAIVED"
        ? sum
        : sum + Math.max(0, Number(payment.dueAmount) - amountPaid(payment)),
    0,
  );
  const formatAmount = (amount: number) => `₹${amount.toLocaleString("en-IN")}`;
  const stats = [
    {
      label: t("teacherPages", "feeStatsCollected", lang),
      value: formatAmount(collected),
      detail: t("teacherPages", "feeStatsAmount", lang),
      icon: IndianRupee,
      color: "text-primary-700",
    },
    {
      label: t("teacherPages", "feeStatsToCollect", lang),
      value: formatAmount(outstanding),
      detail: t("teacherPages", "feeStatsAmount", lang),
      icon: Clock3,
      color: "text-amber-700",
    },
  ];

  return (
   <div className="pt-4">
     <section className="overflow-hidden rounded-2xl  p-0! my-4!  ">
      <div className="  text-center py-4  bg-gradient-to-br from-white to-sky-50 ">
        <h3 className="text-sm font-semibold  text-gray-700">{t("teacherPages", "feeStatsPaymentStatus", lang)}</h3>
        <FeeSemiCircle
          segments={[
            { value: paid, color: "#059669" },
            { value: overdue, color: "#dc2626" },
            { value: pending, color: "#f59e0b" },
            { value: waived, color: "#9ca3af" },
          ]}
          value={String(payments.length)}
          label={t("teacherPages", "feeStatsPayments", lang)}
          description={t("teacherPages", "feeStatsPaymentStatus", lang)}
        />
        <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs text-gray-600">
          {[
            [t("common", "paid", lang), "bg-emerald-600"],
            [t("teacherPages", "feeStatsOverdue", lang), "bg-red-600"],
            [t("teacherPages", "feeStatsPending", lang), "bg-amber-500"],
            [t("teacherPages", "feeStatsWaived", lang), "bg-gray-400"],
          ].map(([label, color]) => (
            <span key={label}><span className={cn("mr-1 inline-block size-2 rounded-full", color)} />{label}</span>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-px border-t border-gray-100 bg-gray-100">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="min-w-0 bg-white/90 p-3 sm:p-4">
              <div className="flex items-center gap-1.5 text-sm font-medium text-gray-600">
                <Icon aria-hidden="true" className={cn("h-4 w-4 shrink-0", stat.color)} />
                <span>{stat.label}</span>
              </div>
              <div className="mt-2 text-xl font-bold tabular-nums text-gray-950 sm:text-2xl">{stat.value}</div>
             </div>
          );
        })}
      </div>
    </section>
   </div>

  );
}

