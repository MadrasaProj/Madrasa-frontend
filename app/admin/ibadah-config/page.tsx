import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { useTenantPath } from "@/hooks/useTenantPath";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ResponsivePopover } from "@/components/ui/responsivePopover";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { IconifyPicker } from "@/components/ui/IconifyPicker";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import {
  getIbadahConfig,
  updateIbadahConfig,
  type IbadahConfig,
  type IbadahScoringConfig,
} from "@/lib/ibadah-api";
import { useAuthStore } from "@/store/auth";
import { Icon } from "@iconify/react";
import {
  ChevronLeft,
  Save,
  Loader2,
  AlertCircle,
  Plus,
  Trash2,
  Pencil,
  ToggleLeft,
  Hash,
  List,
  X,
  Trophy,
  Award,
  BookOpen,
  Check,
  Users,
  Sun,
  Sparkles,
  Calculator,
  Bell,
  ArrowRight,
  Building2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Bar, BarChart, Cell } from "recharts";
import { cn } from "@/lib/utils";

type CustomItem = IbadahConfig["customItems"][number];

const PRAYER_FIELDS: {
  key: keyof IbadahConfig;
  label: string;
  desc: string;
}[] = [
  { key: "enableFajr", label: "Fajr", desc: "Dawn prayer" },
  { key: "enableDhuhr", label: "Dhuhr", desc: "Midday prayer" },
  { key: "enableAsr", label: "Asr", desc: "Afternoon prayer" },
  { key: "enableMaghrib", label: "Maghrib", desc: "Sunset prayer" },
  { key: "enableIsha", label: "Isha", desc: "Night prayer" },
  {
    key: "enableQuranPages",
    label: "Quran Pages",
    desc: "Daily Quran reading tracker",
  },
];

const DEFAULT_TOGGLES: Partial<Record<keyof IbadahConfig, boolean>> = {
  enableFajr: true,
  enableDhuhr: true,
  enableAsr: true,
  enableMaghrib: true,
  enableIsha: true,
  enableQuranPages: true,
};

const DEFAULT_SCORING: IbadahScoringConfig = {
  jamaPoints: 10,
  adaPoints: 7,
  excusedPoints: 7,
  qalaPoints: 3,
  quranPointsPerPage: 2,
  maxQuranPagesPerDay: 20,
};

const EMPTY_ITEM: Omit<CustomItem, "key"> & { key: string } = {
  key: "",
  label: "",
  icon: "lucide:sparkles",
  type: "boolean",
  min: 0,
  max: 100,
  points: 5,
  options: [],
};

function generateKey(label: string): string {
  return label
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 32);
}

function validateKey(key: string): string | null {
  if (!key) return "Key is required";
  if (!/^[a-z][a-z0-9_]*$/.test(key))
    return "Lowercase letters, digits, underscores only, start with letter";
  return null;
}

// ── Compact configuration stats (pattern from teacher ibadah daily stats) ──

const miniChartConfig = {
  value: { label: "Count" },
} satisfies ChartConfig;

function MiniBarChart({ data }: { data: { value: number; color: string }[] }) {
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

interface Stat {
  label: string;
  value: number | string;
}

interface ChartStat extends Stat {
  bars: { value: number; color: string }[];
}

interface IconStat extends Stat {
  icon: LucideIcon;
}

function ConfigStats({
  chartStats,
  iconStats,
}: {
  chartStats: ChartStat[];
  iconStats: IconStat[];
}) {
  return (
    <div className="grid grid-cols-2 overflow-hidden rounded-2xl bg-gradient-to-br from-primary-50/60 via-white to-sky-50/60">
      {chartStats.map((stat, index) => (
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
      {iconStats.map((stat, index) => {
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

// ── Scoring input tile ──────────────────────────────────────────────────────

function ScoreField({
  label,
  hint,
  icon: Icon,
  value,
  onChange,
  tint,
  max = 100,
}: {
  label: string;
  hint: string;
  icon: LucideIcon;
  value: number;
  onChange: (value: number) => void;
  tint: string;
  max?: number;
}) {
  return (
    <div className={cn("rounded-xl border p-3", tint)}>
      <div className="mb-2 flex items-center gap-1.5 text-xs font-bold">
        <Icon aria-hidden="true" className="size-3.5" />
        {label}
      </div>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          min={0}
          max={max}
          value={value}
          onChange={(event) => onChange(Math.max(0, Number(event.target.value)))}
          className="bg-white tabular-nums"
        />
        <span className="shrink-0 text-xs font-semibold text-gray-500">pts</span>
      </div>
      <p className="mt-1.5 text-[10px] text-gray-400">{hint}</p>
    </div>
  );
}

export default function IbadahConfigPage() {
  const tenantPath = useTenantPath();
  const { accessToken, user, activeClientId, hasHydrated } = useAuthStore();
  const token = accessToken ?? "";
  const isSuperAdmin = user?.actorType === "SUPER_ADMIN";
  const isAdmin =
    isSuperAdmin ||
    user?.actorType === "CLIENT_ADMIN" ||
    user?.role === "admin";

  const clientId = activeClientId || user?.clientId || "";

  const [config, setConfig] = useState<IbadahConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toggles, setToggles] =
    useState<Partial<Record<keyof IbadahConfig, boolean>>>(DEFAULT_TOGGLES);
  const [customItems, setCustomItems] = useState<CustomItem[]>([]);
  const [scoring, setScoring] = useState<IbadahScoringConfig>(DEFAULT_SCORING);

  const [addingItem, setAddingItem] = useState(false);
  const [newItem, setNewItem] = useState<CustomItem>({ ...EMPTY_ITEM });
  const [newItemError, setNewItemError] = useState<string | null>(null);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editItem, setEditItem] = useState<CustomItem>({ ...EMPTY_ITEM });
  const [editItemError, setEditItemError] = useState<string | null>(null);

  const loadConfig = useCallback(async (targetCid?: string) => {
    const cidToLoad = targetCid || clientId;

    if (!token || !cidToLoad) {
      if (hasHydrated) {
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const cfg = await getIbadahConfig(token, cidToLoad);
      setConfig(cfg);
      setToggles({
        enableFajr: cfg?.enableFajr ?? true,
        enableDhuhr: cfg?.enableDhuhr ?? true,
        enableAsr: cfg?.enableAsr ?? true,
        enableMaghrib: cfg?.enableMaghrib ?? true,
        enableIsha: cfg?.enableIsha ?? true,
        enableQuranPages: cfg?.enableQuranPages ?? true,
      });

      let parsedCustomItems: CustomItem[] = [];
      if (Array.isArray(cfg?.customItems)) {
        parsedCustomItems = cfg.customItems;
      } else if (typeof cfg?.customItems === "string") {
        try {
          const p = JSON.parse(cfg.customItems);
          if (Array.isArray(p)) parsedCustomItems = p;
        } catch {}
      }
      setCustomItems(parsedCustomItems);

      const sc = cfg?.scoringConfig;
      setScoring({
        jamaPoints: sc?.jamaPoints ?? DEFAULT_SCORING.jamaPoints,
        adaPoints: sc?.adaPoints ?? DEFAULT_SCORING.adaPoints,
        excusedPoints: sc?.excusedPoints ?? DEFAULT_SCORING.excusedPoints,
        qalaPoints: sc?.qalaPoints ?? DEFAULT_SCORING.qalaPoints,
        quranPointsPerPage:
          sc?.quranPointsPerPage ?? DEFAULT_SCORING.quranPointsPerPage,
        maxQuranPagesPerDay:
          sc?.maxQuranPagesPerDay ?? DEFAULT_SCORING.maxQuranPagesPerDay,
      });
    } catch (e) {
      setError((e as Error).message);
      // Fallback gracefully to defaults so UI never gets permanently blocked
      setToggles(DEFAULT_TOGGLES);
      setCustomItems([]);
      setScoring(DEFAULT_SCORING);
    } finally {
      setLoading(false);
    }
  }, [token, clientId, hasHydrated]);

  useEffect(() => {
    if (!hasHydrated) return;
    if (clientId) {
      loadConfig(clientId);
    } else {
      setLoading(false);
    }
  }, [hasHydrated, clientId, loadConfig]);

  const handleSave = async () => {
    const targetCid = clientId;
    if (!token || !targetCid) {
      setError("Madrasa client context not found. Please select a madrasa.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const updated = await updateIbadahConfig(
        token,
        {
          enableFajr: toggles.enableFajr,
          enableDhuhr: toggles.enableDhuhr,
          enableAsr: toggles.enableAsr,
          enableMaghrib: toggles.enableMaghrib,
          enableIsha: toggles.enableIsha,
          enableQuranPages: toggles.enableQuranPages,
          customItems,
          scoringConfig: scoring,
        },
        targetCid,
      );
      setConfig(updated);
      setCustomItems(
        Array.isArray(updated.customItems) ? updated.customItems : [],
      );
      toast.success("Ibadah configuration saved successfully");
    } catch (e) {
      toast.error(
        (e as Error).message || "Failed to save ibadah configuration",
      );
    } finally {
      setSaving(false);
    }
  };

  const closeItemForm = () => {
    setAddingItem(false);
    setEditingIdx(null);
    setNewItemError(null);
    setEditItemError(null);
  };

  const handleAddItem = () => {
    const keyErr = validateKey(newItem.key);
    if (keyErr) {
      setNewItemError(keyErr);
      return;
    }
    if (!newItem.label.trim()) {
      setNewItemError("Label is required");
      return;
    }
    if (customItems.some((i) => i.key === newItem.key)) {
      setNewItemError("An item with this key already exists for this madrasa");
      return;
    }
    const item: CustomItem = {
      key: newItem.key,
      label: newItem.label.trim(),
      icon: newItem.icon || "lucide:sparkles",
      type: newItem.type,
      points: Number(newItem.points ?? 0),
      ...(newItem.type === "number" && {
        min: newItem.min ?? 0,
        max: newItem.max ?? 100,
      }),
      ...(newItem.type === "enum" && {
        options: newItem.options ?? [],
      }),
    };
    setCustomItems((prev) => [...prev, item]);
    closeItemForm();
  };

  const handleDeleteItem = (idx: number) => {
    setCustomItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const startEdit = (idx: number) => {
    setAddingItem(false);
    setEditingIdx(idx);
    setEditItem({ ...customItems[idx] });
    setEditItemError(null);
  };

  const handleSaveEdit = () => {
    if (editingIdx === null) return;
    const keyErr = validateKey(editItem.key);
    if (keyErr) {
      setEditItemError(keyErr);
      return;
    }
    if (!editItem.label.trim()) {
      setEditItemError("Label is required");
      return;
    }
    if (
      customItems.some((i, idx) => i.key === editItem.key && idx !== editingIdx)
    ) {
      setEditItemError("Key already exists");
      return;
    }
    const item: CustomItem = {
      key: editItem.key,
      label: editItem.label.trim(),
      icon: editItem.icon || "lucide:sparkles",
      type: editItem.type,
      points: Number(editItem.points ?? 0),
      ...(editItem.type === "number" && {
        min: editItem.min ?? 0,
        max: editItem.max ?? 100,
      }),
      ...(editItem.type === "enum" && {
        options: editItem.options ?? [],
      }),
    };
    setCustomItems((prev) =>
      prev.map((ci, i) => (i === editingIdx ? item : ci)),
    );
    closeItemForm();
  };

  if (hasHydrated && !isAdmin) {
    return (
      <DashboardLayout>
        <PageHeader title="Ibadah Configuration" />
        <div className="mt-4 flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
          <AlertCircle className="size-4 shrink-0" /> Admin access required.
        </div>
      </DashboardLayout>
    );
  }

  // Active prayer count for live preview
  const activePrayerCount = PRAYER_FIELDS.filter(
    (p) => p.key !== "enableQuranPages" && toggles[p.key] !== false,
  ).length;
  const maxPrayerDaily =
    activePrayerCount *
    Math.max(
      scoring.jamaPoints ?? 10,
      scoring.adaPoints ?? 7,
      scoring.excusedPoints ?? 7,
    );
  const quranEnabled = toggles.enableQuranPages !== false;
  const maxQuranDaily = quranEnabled
    ? (scoring.maxQuranPagesPerDay ?? 20) * (scoring.quranPointsPerPage ?? 2)
    : 0;
  const maxCustomDaily = customItems.reduce(
    (sum, ci) => sum + (Number(ci.points ?? 0) || 0),
    0,
  );
  const totalDailyMax = maxPrayerDaily + maxQuranDaily + maxCustomDaily;
  const topPrayerPoints = Math.max(
    scoring.jamaPoints ?? 10,
    scoring.adaPoints ?? 7,
    scoring.excusedPoints ?? 7,
  );

  const chartStats: ChartStat[] = [
    {
      label: "Active prayers",
      value: activePrayerCount,
      bars: [
        { value: activePrayerCount, color: "#059669" },
        { value: PRAYER_FIELDS.length - 1 - activePrayerCount, color: "#a7f3d0" },
      ],
    },
    {
      label: "Max daily points",
      value: totalDailyMax,
      bars: [
        { value: maxPrayerDaily, color: "#059669" },
        { value: maxQuranDaily, color: "#60a5fa" },
        { value: maxCustomDaily, color: "#bfdbfe" },
      ],
    },
    {
      label: "Activities enabled",
      value: activePrayerCount + (quranEnabled ? 1 : 0) + customItems.length,
      bars: [
        { value: activePrayerCount, color: "#059669" },
        { value: quranEnabled ? 1 : 0, color: "#60a5fa" },
        { value: customItems.length, color: "#bfdbfe" },
      ],
    },
  ];
  const iconStats: IconStat[] = [
    {
      label: "Quran pages cap",
      value: quranEnabled ? scoring.maxQuranPagesPerDay ?? 20 : 0,
      icon: BookOpen,
    },
    { label: "Custom activities", value: customItems.length, icon: Sparkles },
    { label: "Top prayer weight", value: `${topPrayerPoints} pts`, icon: Trophy },
  ];

  const backHref = isSuperAdmin ? "/admin" : tenantPath("/admin/ibadah");

  return (
    <DashboardLayout>
      <PageHeader title="Ibadah Configuration" />

      {loading ? (
        <PageSkeleton />
      ) : !clientId ? (
        <div className="mx-auto max-w-lg space-y-3 rounded-2xl border border-gray-100 bg-white p-8 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
            <Building2 className="size-6" />
          </div>
          <h3 className="text-base font-bold text-gray-900">
            No Madrasa Selected
          </h3>
          <p className="text-xs text-gray-500">
            {isSuperAdmin
              ? "Please enter a madrasa from the Madrasas list to configure its ibadah tracking settings."
              : "No madrasa client was found for your account. Please log in through your madrasa portal."}
          </p>
          {isSuperAdmin && (
            <div className="pt-2">
              <Link
                to="/admin/madrasas"
                className={buttonVariants({ size: "sm" })}
              >
                Go to Madrasas
              </Link>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-5 pb-28">
          <Link
            to={backHref}
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary-700 hover:text-primary-900 hover:underline"
          >
            <ChevronLeft className="size-4" /> Back
          </Link>

          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
              <AlertCircle className="size-4 shrink-0" /> {error}
            </div>
          )}

          {/* Night alert notification banner */}
          <div className="flex flex-col gap-4 rounded-2xl border border-emerald-100/80 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3.5">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white">
                <Bell className="size-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">
                  Night Alert Notification for Ibadah Tracking
                </h3>
                <p className="mt-0.5 max-w-xl text-xs text-gray-600">
                  Configure automated nightly push notifications sent to
                  parents to remind them to log their child&apos;s daily prayers
                  and good deeds.
                </p>
              </div>
            </div>
            <Link
              to={tenantPath("/admin/config?tab=ibadah")}
              className={cn(
                buttonVariants({ size: "sm" }),
                "shrink-0 self-start sm:self-auto",
              )}
            >
              Configure Alert
              <ArrowRight className="size-3.5" />
            </Link>
          </div>

          {/* Configuration overview stats */}
          <ConfigStats chartStats={chartStats} iconStats={iconStats} />

          {/* ── Performance scoring rules ─────────────────────────────── */}
          <section className="space-y-5 rounded-2xl border border-gray-100 bg-white p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3 border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                  <Trophy className="size-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900">
                    Performance Scoring Rules
                  </h2>
                  <p className="text-xs text-gray-400">
                    Point weights for prayers, Quran reading, and custom
                    activities
                  </p>
                </div>
              </div>
              <span className="shrink-0 rounded-full bg-primary-50 px-2.5 py-1 text-[11px] font-bold text-primary-700">
                Max {totalDailyMax} pts/day
              </span>
            </div>

            <div>
              <p className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary-700">
                <Award className="size-3.5" /> Prayer Status Points
              </p>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <ScoreField
                  label="Jama'a (Group)"
                  hint="Congregational prayer"
                  icon={Users}
                  value={scoring.jamaPoints ?? 10}
                  onChange={(value) =>
                    setScoring((prev) => ({ ...prev, jamaPoints: value }))
                  }
                  tint="border-blue-100/80 bg-blue-50/60 text-blue-700"
                />
                <ScoreField
                  label="Ada' (On Time)"
                  hint="Individual on-time prayer"
                  icon={Check}
                  value={scoring.adaPoints ?? 7}
                  onChange={(value) =>
                    setScoring((prev) => ({ ...prev, adaPoints: value }))
                  }
                  tint="border-primary-100/80 bg-primary-50/60 text-primary-700"
                />
                <ScoreField
                  label="Excused (Done)"
                  hint="Ruqsa / valid reason (done)"
                  icon={Check}
                  value={scoring.excusedPoints ?? 7}
                  onChange={(value) =>
                    setScoring((prev) => ({ ...prev, excusedPoints: value }))
                  }
                  tint="border-primary-100/80 bg-primary-50/60 text-primary-700"
                />
                <ScoreField
                  label="Qala' (Make Up)"
                  hint="Off-time make-up prayer"
                  icon={Sun}
                  value={scoring.qalaPoints ?? 3}
                  onChange={(value) =>
                    setScoring((prev) => ({ ...prev, qalaPoints: value }))
                  }
                  tint="border-amber-100/80 bg-amber-50/60 text-amber-700"
                />
              </div>
            </div>

            <div>
              <p className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-blue-700">
                <BookOpen className="size-3.5" /> Quran Reading Scoring
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                  <label className="mb-1.5 block text-xs font-semibold text-gray-700">
                    Points per Quran Page
                  </label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={0}
                      max={50}
                      value={scoring.quranPointsPerPage ?? 2}
                      onChange={(event) =>
                        setScoring((prev) => ({
                          ...prev,
                          quranPointsPerPage: Math.max(
                            0,
                            Number(event.target.value),
                          ),
                        }))
                      }
                      className="bg-white tabular-nums"
                    />
                    <span className="shrink-0 text-xs font-semibold text-gray-500">
                      pts / page
                    </span>
                  </div>
                </div>
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                  <label className="mb-1.5 block text-xs font-semibold text-gray-700">
                    Max Daily Tracked Pages
                  </label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={1}
                      max={100}
                      value={scoring.maxQuranPagesPerDay ?? 20}
                      onChange={(event) =>
                        setScoring((prev) => ({
                          ...prev,
                          maxQuranPagesPerDay: Math.max(
                            1,
                            Number(event.target.value),
                          ),
                        }))
                      }
                      className="bg-white tabular-nums"
                    />
                    <span className="shrink-0 text-xs font-semibold text-gray-500">
                      pages max/day
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2.5 rounded-xl border border-primary-100/60 bg-primary-50/50 p-3.5 text-xs text-primary-800">
              <Calculator className="mt-0.5 size-4 shrink-0 text-primary-600" />
              <div>
                <p className="font-bold">How Performance Score is Computed:</p>
                <p className="mt-0.5 leading-relaxed text-primary-700/90">
                  Total student earned points divided by the maximum possible
                  points across the selected period, multiplied by 100 to yield
                  a percentage score. Excused prayers are scored as completed.
                </p>
              </div>
            </div>
          </section>

          {/* ── Standard ibadah toggles ───────────────────────────────── */}
          <section>
            <h2 className="mb-2 px-1 text-sm font-semibold text-gray-700">
              Standard Ibadah Tracking
            </h2>
            <div className="divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-100 bg-white">
              {PRAYER_FIELDS.map(({ key, label, desc }) => (
                <label
                  key={key}
                  className="flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-4 text-left transition-colors hover:bg-gray-50 focus-within:outline-2 focus-within:outline-offset-[-2px] focus-within:outline-primary-500"
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-gray-900">
                      {label}
                    </span>
                    <span className="block text-xs text-gray-500">{desc}</span>
                  </span>
                  <Switch
                    checked={!!toggles[key]}
                    onCheckedChange={(checked) =>
                      setToggles((prev) => ({ ...prev, [key]: checked }))
                    }
                    aria-label={`Enable ${label}`}
                  />
                </label>
              ))}
            </div>
          </section>

          {/* ── Custom activities ─────────────────────────────────────── */}
          <section>
            <div className="mb-2 flex items-center justify-between gap-3 px-1">
              <div>
                <h2 className="text-sm font-semibold text-gray-700">
                  Custom Ibadah Activities
                </h2>
                <p className="mt-0.5 text-xs text-gray-500">
                  Additional sunnah, adhkar, or good deeds with scoring points
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  setEditingIdx(null);
                  setNewItem({ ...EMPTY_ITEM });
                  setNewItemError(null);
                  setAddingItem(true);
                }}
              >
                <Plus className="size-3.5" /> Add Item
              </Button>
            </div>
            <div className="divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-100 bg-white">
              {customItems.length === 0 ? (
                <p className="px-4 py-10 text-center text-sm text-gray-500">
                  No custom items. Add one to track additional ibadah with
                  custom score points.
                </p>
              ) : (
                customItems.map((item, idx) => (
                  <div
                    key={item.key}
                    className="group flex items-center gap-3 px-4 py-4 transition-colors hover:bg-gray-50"
                  >
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
                      {item.icon ? (
                        <Icon icon={item.icon} className="size-4" />
                      ) : item.type === "boolean" ? (
                        <ToggleLeft className="size-4" />
                      ) : item.type === "enum" ? (
                        <List className="size-4" />
                      ) : (
                        <Hash className="size-4" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-gray-900">
                        {item.label}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-gray-500">
                        <span className="font-mono">{item.key}</span>
                        {item.type === "number" &&
                          ` · ${item.min ?? 0}–${item.max ?? "∞"}`}
                        {item.type === "enum" &&
                          ` · ${item.options?.map((o) => o.label).join(", ") ?? "—"}`}
                      </p>
                    </div>
                    {(item.points ?? 0) > 0 && (
                      <span className="shrink-0 text-sm font-semibold tabular-nums text-amber-700">
                        +{item.points} pts
                      </span>
                    )}
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Edit ${item.label}`}
                        onClick={() => startEdit(idx)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Delete ${item.label}`}
                        onClick={() => handleDeleteItem(idx)}
                        className="text-gray-400 hover:text-red-600"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Sticky save */}
          <div className="sticky bottom-20 lg:bottom-6">
            <Button
              type="button"
              size="lg"
              className="w-full"
              disabled={saving}
              onClick={handleSave}
            >
              {saving ? (
                <Loader2 className="size-5 animate-spin" />
              ) : (
                <>
                  <Save className="size-5" /> Save Configuration &amp; Scoring
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Add / edit custom item panel */}
      <ResponsivePopover
        open={addingItem || editingIdx !== null}
        onOpenChange={(open) => {
          if (!open) closeItemForm();
        }}
        title={editingIdx !== null ? "Edit custom activity" : "New custom activity"}
        description="Track additional sunnah, adhkar, or good deeds with dedicated scoring points."
        fullHeight
        fullHeightWidth="520px"
        footer={
          <div className="border-t border-gray-100 bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <div className="flex gap-2">
              <Button
                type="button"
                size="lg"
                className="flex-1"
                onClick={editingIdx !== null ? handleSaveEdit : handleAddItem}
              >
                {editingIdx !== null ? "Save changes" : "Add item"}
              </Button>
              <Button type="button" size="lg" variant="outline" onClick={closeItemForm}>
                Cancel
              </Button>
            </div>
          </div>
        }
      >
        {editingIdx !== null ? (
          <CustomItemForm
            item={editItem}
            onChange={setEditItem}
            error={editItemError}
          />
        ) : (
          <CustomItemForm
            item={newItem}
            onChange={(item) => {
              if (!newItem.key || newItem.key === generateKey(newItem.label)) {
                setNewItem({ ...item, key: generateKey(item.label) });
              } else {
                setNewItem(item);
              }
            }}
            error={newItemError}
          />
        )}
      </ResponsivePopover>
    </DashboardLayout>
  );
}

// ── Enum options editor ─────────────────────────────────────────────────────

const ICON_COLORS = [
  { label: "Emerald", value: "emerald" },
  { label: "Amber", value: "amber" },
  { label: "Blue", value: "blue" },
  { label: "Purple", value: "purple" },
  { label: "Rose", value: "rose" },
  { label: "Cyan", value: "cyan" },
  { label: "Orange", value: "orange" },
  { label: "Lime", value: "lime" },
];

function EnumOptionsEditor({
  item,
  onChange,
}: {
  item: CustomItem;
  onChange: (item: CustomItem) => void;
}) {
  const options = item.options ?? [];
  const [adding, setAdding] = useState(false);
  const [newOpt, setNewOpt] = useState({
    icon: "mdi:moon",
    label: "",
    color: "emerald",
  });

  const addOption = () => {
    if (!newOpt.label.trim()) return;
    onChange({
      ...item,
      options: [...options, { ...newOpt, label: newOpt.label.trim() }],
    });
    setNewOpt({ icon: "mdi:moon", label: "", color: "emerald" });
    setAdding(false);
  };

  const removeOption = (idx: number) => {
    onChange({ ...item, options: options.filter((_, i) => i !== idx) });
  };

  const colorMap: Record<string, string> = {
    emerald: "bg-primary-500",
    amber: "bg-amber-500",
    blue: "bg-blue-500",
    purple: "bg-purple-500",
    rose: "bg-rose-500",
    cyan: "bg-cyan-500",
    orange: "bg-orange-500",
    lime: "bg-lime-500",
  };

  return (
    <div>
      <label className="mb-2 block text-xs font-semibold text-gray-500">
        Options
      </label>

      <div className="mb-3 space-y-1.5">
        {options.map((opt, idx) => (
          <div
            key={idx}
            className="flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2"
          >
            <div
              className={`flex size-7 shrink-0 items-center justify-center rounded-lg text-white ${colorMap[opt.color] ?? "bg-gray-400"}`}
            >
              <Icon icon={opt.icon} className="size-4" />
            </div>
            <span className="flex-1 text-sm font-medium text-gray-800">
              {opt.label}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`Remove ${opt.label}`}
              onClick={() => removeOption(idx)}
              className="text-gray-400 hover:text-red-500"
            >
              <X className="size-3.5" />
            </Button>
          </div>
        ))}
      </div>

      {adding ? (
        <div className="space-y-2.5 rounded-xl border border-primary-200 bg-primary-50/50 p-3">
          <div className="flex items-start gap-2">
            <div className="shrink-0">
              <div
                className={`flex size-10 items-center justify-center rounded-xl text-white ${colorMap[newOpt.color] ?? "bg-gray-400"}`}
              >
                <Icon icon={newOpt.icon} className="size-5" />
              </div>
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <IconifyPicker
                value={newOpt.icon}
                onChange={(icon) => setNewOpt({ ...newOpt, icon })}
              />
              <Input
                value={newOpt.label}
                onChange={(event) =>
                  setNewOpt({ ...newOpt, label: event.target.value })
                }
                placeholder="Option label"
              />
              <div className="flex flex-wrap gap-1.5">
                {ICON_COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    title={c.label}
                    aria-label={c.label}
                    aria-pressed={newOpt.color === c.value}
                    onClick={() => setNewOpt({ ...newOpt, color: c.value })}
                    className={cn(
                      "size-6 rounded-full transition-all",
                      colorMap[c.value],
                      newOpt.color === c.value
                        ? "scale-110 ring-2 ring-offset-1 ring-gray-400"
                        : "opacity-60 hover:opacity-100",
                    )}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button type="button" className="flex-1" onClick={addOption}>
              Add Option
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setAdding(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-primary-600 hover:text-primary-800"
          onClick={() => setAdding(true)}
        >
          <Plus className="size-3.5" /> Add Option
        </Button>
      )}
    </div>
  );
}

// ── Custom item form ────────────────────────────────────────────────────────

function CustomItemForm({
  item,
  onChange,
  error,
}: {
  item: CustomItem;
  onChange: (item: CustomItem) => void;
  error: string | null;
}) {
  return (
    <div className="mx-auto w-full max-w-xl space-y-5 p-4 sm:p-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-500">
            Label *
          </label>
          <Input
            value={item.label}
            onChange={(event) => onChange({ ...item, label: event.target.value })}
            placeholder="e.g. Tahajjud"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-500">
            Key *
          </label>
          <Input
            value={item.key}
            onChange={(event) =>
              onChange({
                ...item,
                key: event.target.value
                  .toLowerCase()
                  .replace(/[^a-z0-9_]/g, ""),
              })
            }
            placeholder="e.g. tahajjud"
            className="font-mono"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-gray-500">
          Icon
        </label>
        <IconifyPicker
          value={item.icon ?? "lucide:sparkles"}
          onChange={(icon) => onChange({ ...item, icon })}
        />
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-semibold text-gray-500">
          Type
        </label>
        <Tabs
          value={item.type}
          onValueChange={(value) =>
            onChange({ ...item, type: value as CustomItem["type"] })
          }
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="boolean">
              <ToggleLeft className="size-3.5" /> Yes/No
            </TabsTrigger>
            <TabsTrigger value="number">
              <Hash className="size-3.5" /> Number
            </TabsTrigger>
            <TabsTrigger value="enum">
              <List className="size-3.5" /> Enum
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-500">
            Scoring Points Awarded
          </label>
          <Input
            type="number"
            min={0}
            max={100}
            value={item.points ?? 0}
            onChange={(event) =>
              onChange({
                ...item,
                points: Math.max(0, Number(event.target.value)),
              })
            }
            placeholder="e.g. 5"
            className="tabular-nums"
          />
        </div>
        {item.type === "number" && (
          <>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-500">
                Min value
              </label>
              <Input
                type="number"
                min={0}
                value={item.min ?? 0}
                onChange={(event) =>
                  onChange({
                    ...item,
                    min: Math.max(0, Number(event.target.value)),
                  })
                }
                className="tabular-nums"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-500">
                Max value
              </label>
              <Input
                type="number"
                min={1}
                value={item.max ?? 100}
                onChange={(event) =>
                  onChange({ ...item, max: Number(event.target.value) })
                }
                className="tabular-nums"
              />
            </div>
          </>
        )}
      </div>

      {item.type === "enum" && (
        <EnumOptionsEditor item={item} onChange={onChange} />
      )}

      {error && (
        <div className="flex items-center gap-1.5 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-600">
          <AlertCircle className="size-3.5 shrink-0" /> {error}
        </div>
      )}
    </div>
  );
}
