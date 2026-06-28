import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuthStore } from "@/store/auth";
import {
  getPosters,
  uploadPoster,
  deletePoster,
  getPosterDownloadUrl,
  type PosterRecord,
} from "@/lib/posters-api";
import { SkeletonGrid } from "@/components/ui/Skeleton";
import { Plus, Trash2, Download, Loader2, Upload } from "lucide-react";

export default function AdminPostersPage() {
  const { user, accessToken } = useAuthStore();
  const clientId = user?.clientId ?? "";
  const token = accessToken ?? "";
  const isSuperAdmin = user?.actorType === "SUPER_ADMIN";

  const [posters, setPosters] = useState<PosterRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);

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

  const handleUpload = async () => {
    if (!title.trim() || !file) return;
    setUploading(true);
    try {
      await uploadPoster(clientId, token, title, file);
      setTitle("");
      setFile(null);
      setShowUpload(false);
      loadPosters();
    } catch {
      alert("Failed to upload poster");
    } finally {
      setUploading(false);
    }
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

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">Posters</h1>
          {isSuperAdmin && (
            <button
              onClick={() => setShowUpload(!showUpload)}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Upload Poster
            </button>
          )}
        </div>

        {isSuperAdmin && showUpload && (
          <div className="border rounded-xl bg-white p-4 space-y-3">
            <h3 className="text-sm font-semibold">Upload New Poster</h3>
            <div className="flex flex-wrap gap-3">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Poster title"
                className="border rounded-lg px-3 py-2 text-sm flex-1 min-w-[200px]"
              />
              <label className="flex items-center gap-2 cursor-pointer bg-gray-50 border rounded-lg px-3 py-2 text-sm hover:bg-gray-100">
                <Upload className="w-4 h-4 text-gray-500" />
                <span>{file ? file.name : "Choose image"}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  className="hidden"
                />
              </label>
              <button
                onClick={handleUpload}
                disabled={uploading || !title.trim() || !file}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center gap-2"
              >
                {uploading && <Loader2 className="w-4 h-4 animate-spin" />}
                Upload
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <SkeletonGrid count={3} className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" />
        ) : posters.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-sm">No posters yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {posters.map((poster) => (
              <div
                key={poster.id}
                className="border rounded-xl bg-white overflow-hidden"
              >
                <div className="aspect-video bg-gray-100">
                  {poster.imageUrl && (
                    <img
                      src={poster.imageUrl}
                      alt={poster.title}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                <div className="p-3 flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{poster.title}</p>
                    <p className="text-[11px] text-gray-400">
                      {new Date(poster.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    <a
                      href={poster.imageUrl}
                      download
                      className="p-1.5 rounded-lg hover:bg-gray-100"
                      title="Download"
                    >
                      <Download className="w-4 h-4 text-gray-500" />
                    </a>
                    {isSuperAdmin && (
                      <button
                        onClick={() => handleDelete(poster)}
                        className="p-1.5 rounded-lg hover:bg-red-50"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    )}
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
