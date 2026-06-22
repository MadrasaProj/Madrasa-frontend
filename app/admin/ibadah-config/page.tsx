import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  getSuperAdminIbadahConfig,
  updateSuperAdminIbadahConfig,
  type IbadahConfig,
} from "@/lib/ibadah-api";
import { useAuthStore } from "@/store/auth";
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
          {(["boolean", "number"] as const).map((t) => (
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
              ) : (
                <Hash className="w-4 h-4" />
              )}
              {t === "boolean" ? "Yes/No" : "Number"}
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
