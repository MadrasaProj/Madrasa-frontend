import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  getSuperAdminIbadahConfig,
  updateSuperAdminIbadahConfig,
  type IbadahConfig,
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
  const { accessToken, user } = useAuthStore();
  const token = accessToken ?? "";
  const isSuperAdmin = user?.actorType === "SUPER_ADMIN";

  const [config, setConfig] = useState<IbadahConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toggles, setToggles] = useState<
    Partial<Record<keyof IbadahConfig, boolean>>
  >({});
  const [customItems, setCustomItems] = useState<CustomItem[]>([]);
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
      const cfg = await getSuperAdminIbadahConfig(token);
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
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async () => {
    if (!token) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await updateSuperAdminIbadahConfig(token, {
        enableFajr: toggles.enableFajr,
        enableDhuhr: toggles.enableDhuhr,
        enableAsr: toggles.enableAsr,
        enableMaghrib: toggles.enableMaghrib,
        enableIsha: toggles.enableIsha,
        enableQuranPages: toggles.enableQuranPages,
        customItems,
      });
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

  if (!isSuperAdmin) {
    return (
      <DashboardLayout>
        <PageHeader
          title="Ibadah Configuration"
          subtitle="Global settings"
          icon={Moon}
        />
        <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-2xl flex items-center gap-2 mt-4">
          <AlertCircle className="w-4 h-4 shrink-0" /> Super Admin access
          required.
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <PageHeader
        title="Ibadah Configuration"
        subtitle="Global ibadah tracking settings for all madrasas"
        icon={Moon}
        back
        backHref="/admin"
      />

      {loading ? (
        <PageSkeleton />
      ) : (
        <div className="space-y-5 pb-28">
          {error && (
            <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-2xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}

          {/* Prayer toggles */}
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-gray-100 p-5"
          >
            <p className="text-xs font-bold text-emerald-600 uppercase tracking-wide mb-4">
              Standard Ibadah Items
            </p>
            <div className="space-y-3">
              {PRAYER_FIELDS.map(({ key, label, desc }) => (
                <div
                  key={key}
                  className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0"
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

          {/* Custom items */}
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-gray-100 p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-bold text-emerald-600 uppercase tracking-wide">
                Custom Items
              </p>
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
              <p className="text-sm text-gray-400 text-center py-4">
                No custom items. Add one to track additional ibadah.
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
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl group">
                        <GripVertical className="w-4 h-4 text-gray-300 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            {item.type === "boolean" ? (
                              <ToggleLeft className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            ) : item.type === "enum" ? (
                              <List className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                            ) : (
                              <Hash className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                            )}
                            <p className="text-sm font-semibold text-gray-800 truncate">
                              {item.label}
                            </p>
                            <span className="text-[10px] font-mono text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded shrink-0">
                              {item.key}
                            </span>
                          </div>
                          {item.type === "number" && (
                            <p className="text-xs text-gray-400 mt-0.5 ml-5">
                              Range: {item.min ?? 0}–{item.max ?? "∞"}
                            </p>
                          )}
                          {item.type === "enum" && (
                            <p className="text-xs text-gray-400 mt-0.5 ml-5">
                              Options: {item.options?.join(", ") ?? "—"}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => startEdit(idx)}
                            className="p-1.5 rounded-lg hover:bg-white text-gray-400 hover:text-gray-700 transition-colors text-xs font-semibold"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteItem(idx)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
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

          {/* Config info */}
          {config && (
            <div className="bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3 text-xs text-amber-700">
              Changes apply globally to all madrasas. Teachers will see updated
              items on next page load.
            </div>
          )}

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
                  <CheckCircle2 className="w-5 h-5" /> Saved!
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" /> Save Ibadah Config
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
  const [newOpt, setNewOpt] = useState({ icon: "mdi:moon", label: "", color: "emerald" });

  const searchIconify = async (q: string) => {
    if (q.length < 2) { setResults([]); return; }
    try {
      const res = await fetch(`https://api.iconify.design/search?query=${encodeURIComponent(q)}&limit=12`);
      const data = await res.json();
      setResults(data.icons ?? []);
    } catch { setResults([]); }
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
      <label className="block text-xs font-semibold text-gray-500 mb-2">Options</label>

      <div className="space-y-1.5 mb-3">
        {options.map((opt, idx) => (
          <div key={idx} className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl">
            <div className={`w-7 h-7 rounded-lg ${colorMap[opt.color] ?? "bg-gray-400"} flex items-center justify-center text-white shrink-0`}>
              <Icon icon={opt.icon} className="w-4 h-4" />
            </div>
            <span className="text-sm font-medium text-gray-800 flex-1">{opt.label}</span>
            <button onClick={() => removeOption(idx)} className="p-1 rounded-lg hover:bg-white text-gray-400 hover:text-red-500 transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {adding ? (
        <div className="border border-emerald-200 bg-emerald-50/50 rounded-xl p-3 space-y-2.5">
          <div className="flex gap-2 items-start">
            <div className="flex flex-col items-center gap-1 shrink-0">
              <div className={`w-10 h-10 rounded-xl ${colorMap[newOpt.color] ?? "bg-gray-400"} flex items-center justify-center text-white`}>
                <Icon icon={newOpt.icon} className="w-5 h-5" />
              </div>
              <input
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); searchIconify(e.target.value); }}
                placeholder="Search icons..."
                className="w-24 px-2 py-1 text-[10px] border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white text-center"
              />
              {results.length > 0 && (
                <div className="absolute mt-16 z-10 bg-white border border-gray-200 rounded-xl shadow-lg p-2 grid grid-cols-4 gap-1 w-48">
                  {results.map((ic) => (
                    <button
                      key={ic}
                      onClick={() => { setNewOpt({ ...newOpt, icon: ic }); setResults([]); setSearch(""); }}
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
                onChange={(e) => setNewOpt({ ...newOpt, label: e.target.value })}
                placeholder="Option label"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              />
              <div className="flex gap-1.5 flex-wrap">
                {ICON_COLORS.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => setNewOpt({ ...newOpt, color: c.value })}
                    className={cn("w-6 h-6 rounded-full transition-all", colorMap[c.value], newOpt.color === c.value ? "ring-2 ring-offset-1 ring-gray-400 scale-110" : "opacity-60 hover:opacity-100")}
                    title={c.label}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={addOption} className="flex-1 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-colors">Add Option</button>
            <button onClick={() => { setAdding(false); setResults([]); setSearch(""); }} className="px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors">Cancel</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAdding(true)} className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-800 transition-colors">
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
    <div className="border border-emerald-200 bg-emerald-50/50 rounded-xl p-4 space-y-3">
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

      <div>
        <label className="block text-xs font-semibold text-gray-500 mb-1">
          Type
        </label>
        <div className="flex gap-2">
          {(["boolean", "number", "enum"] as const).map((t) => (
            <label
              key={t}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-xl border-2 cursor-pointer text-sm font-semibold transition-all",
                item.type === t
                  ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                  : "border-gray-200 text-gray-600",
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
                <ToggleLeft className="w-4 h-4" />
              ) : t === "enum" ? (
                <List className="w-4 h-4" />
              ) : (
                <Hash className="w-4 h-4" />
              )}
              {t === "boolean" ? "Yes/No" : t === "enum" ? "Enum" : "Number"}
            </label>
          ))}
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
              max={10000}
              onChange={(e) =>
                onChange({
                  ...item,
                  max: Math.min(10000, Math.max(1, Number(e.target.value))),
                })
              }
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
            />
          </div>
        </div>
      )}

      {item.type === "enum" && <EnumOptionsEditor item={item} onChange={onChange} />}

      {error && (
        <div className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-xl flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {error}
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <button
          onClick={onSave}
          className="flex-1 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-colors"
        >
          {mode === "add" ? "Add Item" : "Save Changes"}
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}


