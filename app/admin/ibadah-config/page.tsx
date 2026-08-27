import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  getIbadahConfig,
  updateIbadahConfig,
  type IbadahConfig,
  type IbadahScoringConfig,
} from "@/lib/ibadah-api";
import { useAuthStore } from "@/store/auth";
import { Icon } from "@iconify/react";
import {
  Moon,
  Save,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Plus,
  Trash2,
  GripVertical,
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
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { PageSkeleton } from "@/components/ui/Skeleton";

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

const EMPTY_ITEM: Omit<CustomItem, "key"> & { key: string } = {
  key: "",
  label: "",
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

export default function IbadahConfigPage() {
  const { accessToken, user, activeClientId } = useAuthStore();
  const token = accessToken ?? "";
  const cid = activeClientId ?? user?.clientId ?? "";
  const isSuperAdmin = user?.actorType === "SUPER_ADMIN";
  const isAdmin =
    isSuperAdmin ||
    user?.actorType === "CLIENT_ADMIN" ||
    user?.role === "admin";

  const [config, setConfig] = useState<IbadahConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toggles, setToggles] = useState<
    Partial<Record<keyof IbadahConfig, boolean>>
  >({});
  const [customItems, setCustomItems] = useState<CustomItem[]>([]);
  const [scoring, setScoring] = useState<IbadahScoringConfig>({
    jamaPoints: 10,
    adaPoints: 7,
    excusedPoints: 7,
    qalaPoints: 3,
    quranPointsPerPage: 2,
    maxQuranPagesPerDay: 20,
  });

  const [addingItem, setAddingItem] = useState(false);
  const [newItem, setNewItem] = useState<CustomItem>({ ...EMPTY_ITEM });
  const [newItemError, setNewItemError] = useState<string | null>(null);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editItem, setEditItem] = useState<CustomItem>({ ...EMPTY_ITEM });
  const [editItemError, setEditItemError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const cfg = await getIbadahConfig(token, cid || undefined);
      setConfig(cfg);
      setToggles({
        enableFajr: cfg.enableFajr,
        enableDhuhr: cfg.enableDhuhr,
        enableAsr: cfg.enableAsr,
        enableMaghrib: cfg.enableMaghrib,
        enableIsha: cfg.enableIsha,
        enableQuranPages: cfg.enableQuranPages,
      });
      setCustomItems(Array.isArray(cfg.customItems) ? cfg.customItems : []);
      if (cfg.scoringConfig) {
        setScoring({
          jamaPoints: cfg.scoringConfig.jamaPoints ?? 10,
          adaPoints: cfg.scoringConfig.adaPoints ?? 7,
          excusedPoints: cfg.scoringConfig.excusedPoints ?? 7,
          qalaPoints: cfg.scoringConfig.qalaPoints ?? 3,
          quranPointsPerPage: cfg.scoringConfig.quranPointsPerPage ?? 2,
          maxQuranPagesPerDay: cfg.scoringConfig.maxQuranPagesPerDay ?? 20,
        });
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [token, cid]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async () => {
    if (!token) return;
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
        cid || undefined,
      );
      setConfig(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
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
      setNewItemError("Key already exists");
      return;
    }
    const item: CustomItem = {
      key: newItem.key,
      label: newItem.label.trim(),
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
    setNewItem({ ...EMPTY_ITEM });
    setAddingItem(false);
    setNewItemError(null);
  };

  const handleDeleteItem = (idx: number) => {
    setCustomItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const startEdit = (idx: number) => {
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
    setEditingIdx(null);
    setEditItemError(null);
  };

  if (!isAdmin) {
    return (
      <DashboardLayout>
        <PageHeader
          title="Ibadah Configuration"
          subtitle="Settings & Performance Scoring"
          icon={Moon}
        />
        <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-2xl flex items-center gap-2 mt-4">
          <AlertCircle className="w-4 h-4 shrink-0" /> Admin access required.
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
  const maxQuranDaily =
    (toggles.enableQuranPages !== false
      ? (scoring.maxQuranPagesPerDay ?? 20) * (scoring.quranPointsPerPage ?? 2)
      : 0);
  const maxCustomDaily = customItems.reduce(
    (sum, ci) => sum + (Number(ci.points ?? 0) || 0),
    0,
  );
  const totalDailyMax = maxPrayerDaily + maxQuranDaily + maxCustomDaily;

  return (
    <DashboardLayout>
      <PageHeader
        title="Ibadah Configuration"
        subtitle="Tracking settings and performance scoring rules"
        icon={Moon}
        back
        backHref="/admin/ibadah"
      />

      {loading ? (
        <PageSkeleton />
      ) : (
        <div className="space-y-6 pb-28">
          {error && (
            <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-2xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}

          {/* ──────────────────────────────────────────────────────── */}
          {/* SECTION 1: Performance Scoring Configuration            */}
          {/* ──────────────────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl border border-gray-100 p-5 lg:p-6 shadow-xs space-y-5"
          >
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Trophy className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900">
                    Performance Scoring Rules
                  </h2>
                  <p className="text-xs text-gray-400">
                    Set point weights for prayers, excused ruqsa, Quran reading, and custom activities
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700">
                Max {totalDailyMax} pts/day
              </span>
            </div>

            {/* Prayer Scoring Inputs */}
            <div>
              <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5" /> Prayer Status Points
              </p>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Jama'a */}
                <div className="p-3.5 rounded-2xl bg-blue-50/60 border border-blue-100/80">
                  <div className="flex items-center justify-between mb-2">
                    <span className="flex items-center gap-1 text-xs font-bold text-blue-700">
                      <Users className="w-3.5 h-3.5" /> Jama'a (Group)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={scoring.jamaPoints ?? 10}
                      onChange={(e) =>
                        setScoring((prev) => ({
                          ...prev,
                          jamaPoints: Math.max(0, Number(e.target.value)),
                        }))
                      }
                      className="w-full px-3 py-2 bg-white border border-blue-200 rounded-xl text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-xs font-semibold text-blue-600 shrink-0">pts</span>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1.5">Congregational prayer</p>
                </div>

                {/* Ada' */}
                <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-100/80">
                  <div className="flex items-center justify-between mb-2">
                    <span className="flex items-center gap-1 text-xs font-bold text-emerald-700">
                      <Check className="w-3.5 h-3.5" /> Ada' (On Time)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={scoring.adaPoints ?? 7}
                      onChange={(e) =>
                        setScoring((prev) => ({
                          ...prev,
                          adaPoints: Math.max(0, Number(e.target.value)),
                        }))
                      }
                      className="w-full px-3 py-2 bg-white border border-emerald-200 rounded-xl text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <span className="text-xs font-semibold text-emerald-600 shrink-0">pts</span>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1.5">Individual on-time prayer</p>
                </div>

                {/* Excused / Ruqsa */}
                <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-100/80">
                  <div className="flex items-center justify-between mb-2">
                    <span className="flex items-center gap-1 text-xs font-bold text-emerald-700">
                      <Check className="w-3.5 h-3.5 text-emerald-600" /> Excused (Done)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={scoring.excusedPoints ?? 7}
                      onChange={(e) =>
                        setScoring((prev) => ({
                          ...prev,
                          excusedPoints: Math.max(0, Number(e.target.value)),
                        }))
                      }
                      className="w-full px-3 py-2 bg-white border border-emerald-200 rounded-xl text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <span className="text-xs font-semibold text-emerald-600 shrink-0">pts</span>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1.5">Ruqsa / Valid reason (done)</p>
                </div>

                {/* Qala' */}
                <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-100/80">
                  <div className="flex items-center justify-between mb-2">
                    <span className="flex items-center gap-1 text-xs font-bold text-amber-700">
                      <Sun className="w-3.5 h-3.5" /> Qala' (Make Up)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={scoring.qalaPoints ?? 3}
                      onChange={(e) =>
                        setScoring((prev) => ({
                          ...prev,
                          qalaPoints: Math.max(0, Number(e.target.value)),
                        }))
                      }
                      className="w-full px-3 py-2 bg-white border border-amber-200 rounded-xl text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <span className="text-xs font-semibold text-amber-600 shrink-0">pts</span>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1.5">Off-time make-up prayer</p>
                </div>
              </div>
            </div>

            {/* Quran Reading Scoring */}
            <div>
              <p className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5" /> Quran Reading Scoring
              </p>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-100">
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Points per Quran Page
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={50}
                      value={scoring.quranPointsPerPage ?? 2}
                      onChange={(e) =>
                        setScoring((prev) => ({
                          ...prev,
                          quranPointsPerPage: Math.max(0, Number(e.target.value)),
                        }))
                      }
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <span className="text-xs font-semibold text-gray-500 shrink-0">pts / page</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-100">
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Max Daily Tracked Pages
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={scoring.maxQuranPagesPerDay ?? 20}
                      onChange={(e) =>
                        setScoring((prev) => ({
                          ...prev,
                          maxQuranPagesPerDay: Math.max(1, Number(e.target.value)),
                        }))
                      }
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <span className="text-xs font-semibold text-gray-500 shrink-0">pages max/day</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Live scoring explanation */}
            <div className="p-3.5 rounded-2xl bg-emerald-50/50 border border-emerald-100/60 text-xs text-emerald-800 flex items-start gap-2.5">
              <Calculator className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">How Performance Score is Computed:</p>
                <p className="text-emerald-700/90 mt-0.5 leading-relaxed">
                  Total student earned points divided by the maximum possible points across the selected period, multiplied by 100 to yield a percentage score. Excused prayers are scored as completed.
                </p>
              </div>
            </div>
          </motion.div>

          {/* ──────────────────────────────────────────────────────── */}
          {/* SECTION 2: Standard Ibadah Items                         */}
          {/* ──────────────────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl border border-gray-100 p-5 lg:p-6 shadow-xs"
          >
            <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-4">
              Standard Ibadah Tracking Toggles
            </p>
            <div className="space-y-3">
              {PRAYER_FIELDS.map(({ key, label, desc }) => (
                <div
                  key={key}
                  className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0"
                >
                  <div>
                    <p className="text-sm font-semibold text-gray-800">
                      {label}
                    </p>
                    <p className="text-xs text-gray-400">{desc}</p>
                  </div>
                  <button
                    onClick={() =>
                      setToggles((prev) => ({ ...prev, [key]: !prev[key] }))
                    }
                    className={cn(
                      "relative w-12 h-6 rounded-full transition-colors duration-200 focus:outline-none",
                      toggles[key] ? "bg-emerald-500" : "bg-gray-200",
                    )}
                    aria-pressed={!!toggles[key]}
                  >
                    <span
                      className={cn(
                        "absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200",
                        toggles[key] ? "translate-x-6" : "translate-x-0",
                      )}
                    />
                  </button>
                </div>
              ))}
            </div>
          </motion.div>

          {/* ──────────────────────────────────────────────────────── */}
          {/* SECTION 3: Custom Items                                 */}
          {/* ──────────────────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl border border-gray-100 p-5 lg:p-6 shadow-xs"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                  Custom Ibadah Activities
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Track additional sunnah, adhkar, or good deeds with dedicated scoring points
                </p>
              </div>
              {!addingItem && (
                <button
                  onClick={() => {
                    setAddingItem(true);
                    setNewItem({ ...EMPTY_ITEM });
                    setNewItemError(null);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-semibold hover:bg-emerald-100 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Item
                </button>
              )}
            </div>

            {customItems.length === 0 && !addingItem && (
              <p className="text-sm text-gray-400 text-center py-6">
                No custom items. Add one to track additional ibadah with custom score points.
              </p>
            )}

            <div className="space-y-3">
              <AnimatePresence initial={false}>
                {customItems.map((item, idx) => (
                  <motion.div
                    key={item.key}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    {editingIdx === idx ? (
                      <CustomItemForm
                        item={editItem}
                        onChange={setEditItem}
                        error={editItemError}
                        onSave={handleSaveEdit}
                        onCancel={() => {
                          setEditingIdx(null);
                          setEditItemError(null);
                        }}
                        mode="edit"
                      />
                    ) : (
                      <div className="flex items-center gap-3 p-3.5 bg-gray-50 rounded-2xl group border border-gray-100">
                        <GripVertical className="w-4 h-4 text-gray-300 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            {item.type === "boolean" ? (
                              <ToggleLeft className="w-4 h-4 text-emerald-500 shrink-0" />
                            ) : item.type === "enum" ? (
                              <List className="w-4 h-4 text-purple-500 shrink-0" />
                            ) : (
                              <Hash className="w-4 h-4 text-blue-500 shrink-0" />
                            )}
                            <p className="text-sm font-semibold text-gray-900 truncate">
                              {item.label}
                            </p>
                            <span className="text-[10px] font-mono text-gray-400 bg-gray-200/60 px-1.5 py-0.5 rounded shrink-0">
                              {item.key}
                            </span>
                            {(item.points ?? 0) > 0 && (
                              <span className="text-[10px] font-bold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-full shrink-0">
                                +{item.points} pts
                              </span>
                            )}
                          </div>
                          {item.type === "number" && (
                            <p className="text-xs text-gray-400 mt-0.5 ml-6">
                              Range: {item.min ?? 0}–{item.max ?? "∞"}
                            </p>
                          )}
                          {item.type === "enum" && (
                            <p className="text-xs text-gray-400 mt-0.5 ml-6">
                              Options: {item.options?.map((o) => o.label).join(", ") ?? "—"}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => startEdit(idx)}
                            className="px-2.5 py-1.5 rounded-xl hover:bg-white text-gray-500 hover:text-gray-900 transition-colors text-xs font-semibold"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteItem(idx)}
                            className="p-1.5 rounded-xl hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Add new item form */}
              <AnimatePresence>
                {addingItem && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <CustomItemForm
                      item={newItem}
                      onChange={(item) => {
                        if (
                          !newItem.key ||
                          newItem.key === generateKey(newItem.label)
                        ) {
                          setNewItem({ ...item, key: generateKey(item.label) });
                        } else {
                          setNewItem(item);
                        }
                      }}
                      error={newItemError}
                      onSave={handleAddItem}
                      onCancel={() => {
                        setAddingItem(false);
                        setNewItemError(null);
                      }}
                      mode="add"
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Sticky save */}
          <div className="sticky bottom-20 lg:bottom-6">
            <button
              onClick={handleSave}
              disabled={saving}
              className={cn(
                "w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl font-bold text-sm transition-all shadow-lg",
                saved
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60",
              )}
            >
              {saving ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : saved ? (
                <>
                  <CheckCircle2 className="w-5 h-5" /> Saved Successfully!
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" /> Save Configuration & Scoring
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

// ── Enum Options Editor ─────────────────────────────────────────────────────

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
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<string[]>([]);
  const [newOpt, setNewOpt] = useState({
    icon: "mdi:moon",
    label: "",
    color: "emerald",
  });

  const searchIconify = async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      return;
    }
    try {
      const res = await fetch(
        `https://api.iconify.design/search?query=${encodeURIComponent(q)}&limit=12`,
      );
      const data = await res.json();
      setResults(data.icons ?? []);
    } catch {
      setResults([]);
    }
  };

  const addOption = () => {
    if (!newOpt.label.trim()) return;
    onChange({
      ...item,
      options: [...options, { ...newOpt, label: newOpt.label.trim() }],
    });
    setNewOpt({ icon: "mdi:moon", label: "", color: "emerald" });
    setAdding(false);
    setSearch("");
    setResults([]);
  };

  const removeOption = (idx: number) => {
    onChange({ ...item, options: options.filter((_, i) => i !== idx) });
  };

  const colorMap: Record<string, string> = {
    emerald: "bg-emerald-500",
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
      <label className="block text-xs font-semibold text-gray-500 mb-2">
        Options
      </label>

      <div className="space-y-1.5 mb-3">
        {options.map((opt, idx) => (
          <div
            key={idx}
            className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl"
          >
            <div
              className={`w-7 h-7 rounded-lg ${colorMap[opt.color] ?? "bg-gray-400"} flex items-center justify-center text-white shrink-0`}
            >
              <Icon icon={opt.icon} className="w-4 h-4" />
            </div>
            <span className="text-sm font-medium text-gray-800 flex-1">
              {opt.label}
            </span>
            <button
              onClick={() => removeOption(idx)}
              className="p-1 rounded-lg hover:bg-white text-gray-400 hover:text-red-500 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {adding ? (
        <div className="border border-emerald-200 bg-emerald-50/50 rounded-xl p-3 space-y-2.5">
          <div className="flex gap-2 items-start">
            <div className="flex flex-col items-center gap-1 shrink-0">
              <div
                className={`w-10 h-10 rounded-xl ${colorMap[newOpt.color] ?? "bg-gray-400"} flex items-center justify-center text-white`}
              >
                <Icon icon={newOpt.icon} className="w-5 h-5" />
              </div>
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  searchIconify(e.target.value);
                }}
                placeholder="Search icons..."
                className="w-24 px-2 py-1 text-[10px] border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white text-center"
              />
              {results.length > 0 && (
                <div className="absolute mt-16 z-10 bg-white border border-gray-200 rounded-xl shadow-lg p-2 grid grid-cols-4 gap-1 w-48">
                  {results.map((ic) => (
                    <button
                      key={ic}
                      onClick={() => {
                        setNewOpt({ ...newOpt, icon: ic });
                        setResults([]);
                        setSearch("");
                      }}
                      className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-600"
                    >
                      <Icon icon={ic} className="w-4 h-4" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex-1 space-y-2">
              <input
                type="text"
                value={newOpt.label}
                onChange={(e) =>
                  setNewOpt({ ...newOpt, label: e.target.value })
                }
                placeholder="Option label"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              />
              <div className="flex gap-1.5 flex-wrap">
                {ICON_COLORS.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => setNewOpt({ ...newOpt, color: c.value })}
                    className={cn(
                      "w-6 h-6 rounded-full transition-all",
                      colorMap[c.value],
                      newOpt.color === c.value
                        ? "ring-2 ring-offset-1 ring-gray-400 scale-110"
                        : "opacity-60 hover:opacity-100",
                    )}
                    title={c.label}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={addOption}
              className="flex-1 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-colors"
            >
              Add Option
            </button>
            <button
              onClick={() => {
                setAdding(false);
                setResults([]);
                setSearch("");
              }}
              className="px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-800 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Add Option
        </button>
      )}
    </div>
  );
}

// ── Custom Item Form ─────────────────────────────────────────────────────────

interface CustomItemFormProps {
  item: CustomItem;
  onChange: (item: CustomItem) => void;
  error: string | null;
  onSave: () => void;
  onCancel: () => void;
  mode: "add" | "edit";
}

function CustomItemForm({
  item,
  onChange,
  error,
  onSave,
  onCancel,
  mode,
}: CustomItemFormProps) {
  return (
    <div className="border border-emerald-200 bg-emerald-50/50 rounded-2xl p-4 space-y-3">
      <p className="text-xs font-bold text-emerald-700 uppercase tracking-wide">
        {mode === "add" ? "New Custom Item" : "Edit Item"}
      </p>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">
            Label *
          </label>
          <input
            type="text"
            value={item.label}
            onChange={(e) => onChange({ ...item, label: e.target.value })}
            placeholder="e.g. Tahajjud"
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">
            Key *
          </label>
          <input
            type="text"
            value={item.key}
            onChange={(e) =>
              onChange({
                ...item,
                key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""),
              })
            }
            placeholder="e.g. tahajjud"
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">
            Type
          </label>
          <div className="flex gap-1.5">
            {(["boolean", "number", "enum"] as const).map((t) => (
              <label
                key={t}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-2 px-1 rounded-xl border-2 cursor-pointer text-xs font-semibold transition-all",
                  item.type === t
                    ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                    : "border-gray-200 text-gray-600 bg-white",
                )}
              >
                <input
                  type="radio"
                  name={`type-${mode}`}
                  value={t}
                  checked={item.type === t}
                  onChange={() => onChange({ ...item, type: t })}
                  className="sr-only"
                />
                {t === "boolean" ? (
                  <ToggleLeft className="w-3.5 h-3.5" />
                ) : t === "enum" ? (
                  <List className="w-3.5 h-3.5" />
                ) : (
                  <Hash className="w-3.5 h-3.5" />
                )}
                {t === "boolean" ? "Yes/No" : t === "enum" ? "Enum" : "Num"}
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">
            Scoring Points Awarded
          </label>
          <input
            type="number"
            min={0}
            max={100}
            value={item.points ?? 0}
            onChange={(e) =>
              onChange({ ...item, points: Math.max(0, Number(e.target.value)) })
            }
            placeholder="e.g. 5"
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
          />
        </div>
      </div>

      {item.type === "number" && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">
              Min value
            </label>
            <input
              type="number"
              value={item.min ?? 0}
              min={0}
              onChange={(e) =>
                onChange({ ...item, min: Math.max(0, Number(e.target.value)) })
              }
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">
              Max value
            </label>
            <input
              type="number"
              value={item.max ?? 100}
              min={1}
              onChange={(e) =>
                onChange({
                  ...item,
                  max: Number(e.target.value),
                })
              }
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
            />
          </div>
        </div>
      )}

      {item.type === "enum" && (
        <EnumOptionsEditor item={item} onChange={onChange} />
      )}

      {error && (
        <div className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-xl flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {error}
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <button
          onClick={onSave}
          className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-colors"
        >
          {mode === "add" ? "Add Item" : "Save Changes"}
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2.5 bg-white border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
