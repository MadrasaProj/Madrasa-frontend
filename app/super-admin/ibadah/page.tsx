import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  getSuperAdminIbadahConfig,
  updateSuperAdminIbadahConfig,
  type IbadahConfig,
} from "@/lib/ibadah-api";
import { useAuthStore } from "@/store/auth";
import { useNavigate } from "react-router-dom";
import {
  Moon, BookOpen, Loader2, AlertCircle, CheckCircle2,
  Save, Plus, Trash2, Hash, ToggleLeft, Edit2, X,
} from "lucide-react";
import { cn } from "@/lib/utils";

type CustomItem = IbadahConfig["customItems"][number];

interface ItemForm {
  key: string;
  label: string;
  type: "boolean" | "number";
  min: string;
  max: string;
}

const EMPTY_ITEM: ItemForm = { key: "", label: "", type: "boolean", min: "", max: "" };

const PRAYERS: { field: keyof IbadahConfig; label: string; time: string }[] = [
  { field: "enableFajr",    label: "Fajr",    time: "Dawn"      },
  { field: "enableDhuhr",   label: "Dhuhr",   time: "Midday"    },
  { field: "enableAsr",     label: "Asr",     time: "Afternoon" },
  { field: "enableMaghrib", label: "Maghrib", time: "Sunset"    },
  { field: "enableIsha",    label: "Isha",    time: "Night"     },
];

export default function SuperAdminIbadahPage() {
  const { user, accessToken } = useAuthStore();
  const navigate = useNavigate();
  const token = accessToken ?? "";

  const [config, setConfig] = useState<IbadahConfig | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [showItemForm, setShowItemForm] = useState(false);
  const [editingIdx, setEditingIdx]     = useState<number | null>(null);
  const [itemForm, setItemForm]         = useState<ItemForm>(EMPTY_ITEM);
  const [itemError, setItemError]       = useState<string | null>(null);

  useEffect(() => {
    if (!user || (user.actorType !== "SUPER_ADMIN" && user.role !== "SUPER_ADMIN")) {
      navigate("/super-admin/login");
    }
  }, [user, navigate]);

  useEffect(() => {
    if (!token) return;
    getSuperAdminIbadahConfig(token)
      .then(setConfig)
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, [token]);

  const togglePrayer = (field: keyof IbadahConfig) => {
    if (!config) return;
    setConfig({ ...config, [field]: !config[field] });
    setSaved(false);
  };

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    setSaveError(null);
    try {
      const updated = await updateSuperAdminIbadahConfig(token, {
        enableFajr:       config.enableFajr,
        enableDhuhr:      config.enableDhuhr,
        enableAsr:        config.enableAsr,
        enableMaghrib:    config.enableMaghrib,
        enableIsha:       config.enableIsha,
        enableQuranPages: config.enableQuranPages,
        customItems:      config.customItems,
      });
      setConfig(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setSaveError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const openAddItem = () => {
    setItemForm(EMPTY_ITEM);
    setEditingIdx(null);
    setItemError(null);
    setShowItemForm(true);
  };

  const openEditItem = (idx: number) => {
    const item = config!.customItems[idx];
    setItemForm({
      key:   item.key,
      label: item.label,
      type:  item.type,
      min:   item.min != null ? String(item.min) : "",
      max:   item.max != null ? String(item.max) : "",
    });
    setEditingIdx(idx);
    setItemError(null);
    setShowItemForm(true);
  };

  const deleteItem = (idx: number) => {
    if (!config) return;
    setConfig({ ...config, customItems: config.customItems.filter((_, i) => i !== idx) });
    setSaved(false);
  };

  const validateKey = (key: string) => /^[a-zA-Z][a-zA-Z0-9_]*$/.test(key);

  const saveItem = () => {
    if (!config) return;
    const { key, label, type, min, max } = itemForm;
    if (!key.trim()) { setItemError("Key required"); return; }
    if (!validateKey(key.trim())) { setItemError("Key must start with letter, only letters/digits/underscore"); return; }
    if (!label.trim()) { setItemError("Label required"); return; }

    // Check for duplicate key (excluding current edit index)
    const duplicate = config.customItems.findIndex((item, i) => item.key === key.trim() && i !== editingIdx);
    if (duplicate >= 0) { setItemError("Key already exists"); return; }

    const newItem: CustomItem = {
      key: key.trim(),
      label: label.trim(),
      type,
      ...(type === "number" && min !== "" && { min: Number(min) }),
      ...(type === "number" && max !== "" && { max: Number(max) }),
    };

    const items = [...config.customItems];
    if (editingIdx !== null) {
      items[editingIdx] = newItem;
    } else {
      items.push(newItem);
    }
    setConfig({ ...config, customItems: items });
    setShowItemForm(false);
    setItemForm(EMPTY_ITEM);
    setEditingIdx(null);
    setSaved(false);
  };

  return (
    <DashboardLayout>
      <PageHeader
        title="Ibadah Config"
        subtitle="Manage prayer tracking &amp; custom items"
        icon={Moon}
        back backHref="/super-admin"
      />

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      ) : error ? (
        <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-2xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      ) : config ? (
        <div className="space-y-4 pb-28">

          {/* Prayer toggles */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 flex items-center gap-2">
              <Moon className="w-4 h-4 text-emerald-600" />
              <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">Prayers</p>
            </div>
            <div className="divide-y divide-gray-50">
              {PRAYERS.map(({ field, label, time }) => {
                const enabled = config[field] as boolean;
                return (
                  <button
                    key={field}
                    onClick={() => togglePrayer(field)}
                    className="w-full flex items-center gap-4 px-4 py-3.5 transition-colors text-left hover:bg-gray-50"
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 transition-all",
                      enabled ? "bg-emerald-500 text-white" : "bg-gray-100 text-gray-400",
                    )}>
                      {enabled ? "ON" : "OFF"}
                    </div>
                    <div className="flex-1">
                      <p className={cn("text-sm font-bold", enabled ? "text-emerald-800" : "text-gray-500")}>{label}</p>
                      <p className="text-xs text-gray-400">{time}</p>
                    </div>
                    <span className={cn(
                      "text-xs font-semibold px-2 py-1 rounded-lg",
                      enabled ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500",
                    )}>
                      {enabled ? "Enabled" : "Disabled"}
                    </span>
                  </button>
                );
              })}

              {/* Quran pages toggle */}
              <button
                onClick={() => togglePrayer("enableQuranPages")}
                className="w-full flex items-center gap-4 px-4 py-3.5 transition-colors text-left hover:bg-gray-50"
              >
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 transition-all",
                  config.enableQuranPages ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-400",
                )}>
                  {config.enableQuranPages ? "ON" : "OFF"}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-blue-500" />
                    <p className={cn("text-sm font-bold", config.enableQuranPages ? "text-blue-800" : "text-gray-500")}>Quran Pages</p>
                  </div>
                  <p className="text-xs text-gray-400">Daily page count tracking</p>
                </div>
                <span className={cn(
                  "text-xs font-semibold px-2 py-1 rounded-lg",
                  config.enableQuranPages ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500",
                )}>
                  {config.enableQuranPages ? "Enabled" : "Disabled"}
                </span>
              </button>
            </div>
          </div>

          {/* Custom items */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 flex items-center justify-between">
              <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">Custom Items</p>
              <button
                onClick={openAddItem}
                className="flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1.5 rounded-lg transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add Item
              </button>
            </div>

            {config.customItems.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">
                No custom items. Add one above.
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {config.customItems.map((item, idx) => (
                  <div key={item.key} className="flex items-center gap-3 px-4 py-3">
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                      item.type === "boolean" ? "bg-purple-100" : "bg-orange-100",
                    )}>
                      {item.type === "boolean"
                        ? <ToggleLeft className="w-4 h-4 text-purple-600" />
                        : <Hash className="w-4 h-4 text-orange-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{item.label}</p>
                      <p className="text-xs text-gray-400">
                        key: <code className="bg-gray-100 px-1 rounded">{item.key}</code>
                        {" · "}{item.type}
                        {item.type === "number" && (item.min != null || item.max != null)
                          ? ` (${item.min ?? 0}–${item.max ?? "∞"})`
                          : ""}
                      </p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => openEditItem(idx)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => deleteItem(idx)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add/Edit item form */}
          {showItemForm && (
            <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-bold text-gray-800">
                  {editingIdx !== null ? "Edit Item" : "New Custom Item"}
                </p>
                <button onClick={() => setShowItemForm(false)} className="p-1 rounded-lg hover:bg-gray-100">
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Key <span className="text-gray-400 font-normal">(no spaces, unique)</span></label>
                <input
                  value={itemForm.key}
                  onChange={(e) => setItemForm((f) => ({ ...f, key: e.target.value }))}
                  placeholder="e.g. dhikr_count"
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                  disabled={editingIdx !== null}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Label <span className="text-gray-400 font-normal">(shown to parents)</span></label>
                <input
                  value={itemForm.label}
                  onChange={(e) => setItemForm((f) => ({ ...f, label: e.target.value }))}
                  placeholder="e.g. Morning Dhikr"
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Type</label>
                <div className="flex gap-2">
                  {(["boolean", "number"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setItemForm((f) => ({ ...f, type: t }))}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold border transition-colors",
                        itemForm.type === t
                          ? "bg-emerald-600 text-white border-emerald-600"
                          : "bg-white text-gray-600 border-gray-200",
                      )}
                    >
                      {t === "boolean" ? <ToggleLeft className="w-3.5 h-3.5" /> : <Hash className="w-3.5 h-3.5" />}
                      {t === "boolean" ? "Yes / No" : "Number"}
                    </button>
                  ))}
                </div>
              </div>

              {itemForm.type === "number" && (
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Min <span className="text-gray-400 font-normal">(optional)</span></label>
                    <input
                      type="number"
                      value={itemForm.min}
                      onChange={(e) => setItemForm((f) => ({ ...f, min: e.target.value }))}
                      placeholder="0"
                      className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Max <span className="text-gray-400 font-normal">(optional)</span></label>
                    <input
                      type="number"
                      value={itemForm.max}
                      onChange={(e) => setItemForm((f) => ({ ...f, max: e.target.value }))}
                      placeholder="∞"
                      className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                    />
                  </div>
                </div>
              )}

              {itemError && (
                <div className="flex items-center gap-2 bg-red-50 text-red-600 text-xs px-3 py-2 rounded-xl">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {itemError}
                </div>
              )}

              <button
                onClick={saveItem}
                className="w-full py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors"
              >
                {editingIdx !== null ? "Update Item" : "Add Item"}
              </button>
            </div>
          )}

          {/* Save error */}
          {saveError && (
            <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-2xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" /> {saveError}
            </div>
          )}

          {/* Sticky save */}
          <div className="sticky bottom-6">
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
                <><CheckCircle2 className="w-5 h-5" /> Config Saved!</>
              ) : (
                <><Save className="w-5 h-5" /> Save Config</>
              )}
            </button>
          </div>
        </div>
      ) : null}
    </DashboardLayout>
  );
}
