import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuthStore } from "@/store/auth";
import { getPosters, type PosterRecord } from "@/lib/posters-api";
import { SkeletonGrid } from "@/components/ui/Skeleton";

interface PublicPostersPageProps {
  basePath: string;
}

export default function PublicPostersPage({ basePath }: PublicPostersPageProps) {
  const { user } = useAuthStore();
  const clientId = user?.clientId ?? "";
  const navigate = useNavigate();

  const [posters, setPosters] = useState<PosterRecord[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <h1 className="text-lg font-semibold">Posters</h1>

        {loading ? (
          <SkeletonGrid count={3} className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" />
        ) : posters.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-sm">No posters available.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {posters.map((poster) => (
              <div
                key={poster.id}
                onClick={() => navigate(`${basePath}/posters/${poster.id}`)}
                className="border rounded-xl bg-white overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
              >
                <div className="aspect-video bg-gray-100" />
                <div className="p-3">
                  <p className="text-sm font-medium truncate">{poster.title}</p>
                  <p className="text-[11px] text-gray-400">
                    {new Date(poster.updatedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
