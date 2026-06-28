import { useState, useRef, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuthStore } from "@/store/auth";
import { getCoverImageUrl } from "@/lib/poster-utils";
import {
  getSocialFrames,
  createSocialFrame,
  updateSocialFrame,
  deleteSocialFrame,
  type SocialFrameRecord,
} from "@/lib/social-frames-api";
import {
  SocialFrameCreator,
  type SocialFrameCreatorRef,
} from "./SocialFrameCreator";
import { ArrowLeft, Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { SkeletonGrid } from "@/components/ui/Skeleton";

type View = "list" | "create" | "edit";

export default function AdminSocialFramesPage() {
  const { user, accessToken } = useAuthStore();
  const clientId = user?.clientId ?? "";
  const token = accessToken ?? "";

  const [view, setView] = useState<View>("list");
  const [frames, setFrames] = useState<SocialFrameRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingFrame, setEditingFrame] = useState<SocialFrameRecord | null>(null);
  const [title, setTitle] = useState("Untitled Social Frame");

  const creatorRef = useRef<SocialFrameCreatorRef>(null);

  const loadFrames = useCallback(async () => {
    if (!clientId) return;
    setLoading(true);
    try {
      const res = await getSocialFrames(clientId, { limit: 100 });
      setFrames(res.data);
    } catch {
      setFrames([]);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    loadFrames();
  }, [loadFrames]);

  const handleCreate = () => {
    setEditingFrame(null);
    setTitle("Untitled Social Frame");
    setView("create");
  };

  const handleEdit = (frame: SocialFrameRecord) => {
    setEditingFrame(frame);
    setTitle(frame.title);
    setView("edit");
  };

  const handleDelete = async (frame: SocialFrameRecord) => {
    if (!confirm(`Delete "${frame.title}"?`)) return;
    try {
      await deleteSocialFrame(clientId, token, frame.id);
      setFrames((prev) => prev.filter((p) => p.id !== frame.id));
    } catch {
      alert("Failed to delete social frame");
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
      if (view === "edit" && editingFrame) {
        const updated = await updateSocialFrame(clientId, token, editingFrame.id, {
          title,
          sceneData,
        });
        setFrames((prev) =>
          prev.map((p) => (p.id === updated.id ? updated : p))
        );
      } else {
        const created = await createSocialFrame(clientId, token, {
          title,
          sceneData,
        });
        setFrames((prev) => [created, ...prev]);
      }
      setView("list");
    } catch {
      alert("Failed to save social frame");
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
              {view === "edit" ? "Edit Social Frame" : "Create Social Frame"}
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

          <SocialFrameCreator
            ref={creatorRef}
            initialData={
              view === "edit" && editingFrame
                ? (editingFrame.sceneData as Record<string, unknown>)
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
          <h1 className="text-lg font-semibold">Social Frames</h1>
          <button
            onClick={handleCreate}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Create Social Frame
          </button>
        </div>

        {loading ? (
          <SkeletonGrid count={3} className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" />
        ) : frames.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-sm">No social frames yet.</p>
            <button
              onClick={handleCreate}
              className="mt-3 text-emerald-600 text-sm font-medium hover:underline"
            >
              Create your first social frame
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {frames.map((frame) => (
              <div
                key={frame.id}
                className="border rounded-xl bg-white overflow-hidden"
              >
                <div className="aspect-video bg-gray-100">
                  {getCoverImageUrl(frame.sceneData) && (
                    <img
                      src={getCoverImageUrl(frame.sceneData)!}
                      alt={frame.title}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                <div className="p-3 flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{frame.title}</p>
                    <p className="text-[11px] text-gray-400">
                      {new Date(frame.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    <button
                      onClick={() => handleEdit(frame)}
                      className="p-1.5 rounded-lg hover:bg-gray-100"
                      title="Edit"
                    >
                      <Pencil className="w-4 h-4 text-gray-500" />
                    </button>
                    <button
                      onClick={() => handleDelete(frame)}
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
