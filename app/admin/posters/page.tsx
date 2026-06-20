import { useState, useRef, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuthStore } from "@/store/auth";
import {
  getPosters,
  createPoster,
  updatePoster,
  deletePoster,
  type PosterRecord,
} from "@/lib/posters-api";
import {
  PosterCreator,
  type PosterCreatorRef,
} from "./PosterCreator";
import { ArrowLeft, Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { SkeletonGrid } from "@/components/ui/Skeleton";

type View = "list" | "create" | "edit";

export default function AdminPostersPage() {
  const { user, accessToken } = useAuthStore();
  const clientId = user?.clientId ?? "";
  const token = accessToken ?? "";

  const [view, setView] = useState<View>("list");
  const [posters, setPosters] = useState<PosterRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingPoster, setEditingPoster] = useState<PosterRecord | null>(null);
  const [title, setTitle] = useState("Untitled Poster");

  const creatorRef = useRef<PosterCreatorRef>(null);

  const loadPosters = useCallback(async () => {
    if (!clientId) return;
    setLoading(true);
    try {
      const res = await getPosters(clientId, { limit: 100 });
      setPosters(res.data);
    } catch {
      setPosters([]);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    loadPosters();
  }, [loadPosters]);

  const handleCreate = () => {
    setEditingPoster(null);
    setTitle("Untitled Poster");
    setView("create");
  };

  const handleEdit = (poster: PosterRecord) => {
    setEditingPoster(poster);
    setTitle(poster.title);
    setView("edit");
  };

  const handleDelete = async (poster: PosterRecord) => {
    if (!confirm(`Delete "${poster.title}"?`)) return;
    try {
      await deletePoster(clientId, token, poster.id);
      setPosters((prev) => prev.filter((p) => p.id !== poster.id));
    } catch {
      alert("Failed to delete poster");
    }
  };

  const handleSave = async () => {
    const sceneData = creatorRef.current?.getSceneData();
    if (!sceneData) {
      alert("No scene data to save");
      return;
    }
    setSaving(true);
    try {
      if (view === "edit" && editingPoster) {
        const updated = await updatePoster(clientId, token, editingPoster.id, {
          title,
          sceneData,
        });
        setPosters((prev) =>
          prev.map((p) => (p.id === updated.id ? updated : p))
        );
      } else {
        const created = await createPoster(clientId, token, {
          title,
          sceneData,
        });
        setPosters((prev) => [created, ...prev]);
      }
      setView("list");
    } catch {
      alert("Failed to save poster");
    } finally {
      setSaving(false);
    }
  };

  if (view === "create" || view === "edit") {
    return (
      <DashboardLayout>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setView("list")}
              className="p-2 rounded-lg hover:bg-gray-100"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-semibold">
              {view === "edit" ? "Edit Poster" : "Create Poster"}
            </h1>
          </div>

          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm w-64"
              />
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center gap-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {view === "edit" ? "Update" : "Save"}
            </button>
          </div>

          <PosterCreator
            ref={creatorRef}
            initialData={
              view === "edit" && editingPoster
                ? (editingPoster.sceneData as Record<string, unknown>)
                : null
            }
          />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">Posters</h1>
          <button
            onClick={handleCreate}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Create Poster
          </button>
        </div>

        {loading ? (
          <SkeletonGrid count={3} className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" />
        ) : posters.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-sm">No posters yet.</p>
            <button
              onClick={handleCreate}
              className="mt-3 text-emerald-600 text-sm font-medium hover:underline"
            >
              Create your first poster
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {posters.map((poster) => (
              <div
                key={poster.id}
                className="border rounded-xl bg-white overflow-hidden"
              >
                <div className="aspect-video bg-gray-100" />
                <div className="p-3 flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{poster.title}</p>
                    <p className="text-[11px] text-gray-400">
                      {new Date(poster.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    <button
                      onClick={() => handleEdit(poster)}
                      className="p-1.5 rounded-lg hover:bg-gray-100"
                      title="Edit"
                    >
                      <Pencil className="w-4 h-4 text-gray-500" />
                    </button>
                    <button
                      onClick={() => handleDelete(poster)}
                      className="p-1.5 rounded-lg hover:bg-red-50"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
