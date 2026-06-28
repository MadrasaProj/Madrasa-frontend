import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuthStore } from "@/store/auth";
import { useLanguageStore } from "@/store/language";
import { t } from "@/lib/i18n";
import { getSocialFrames, type SocialFrameRecord } from "@/lib/social-frames-api";
import { getCoverImageUrl } from "@/lib/poster-utils";
import { SkeletonGrid } from "@/components/ui/Skeleton";

interface PublicSocialFramesPageProps {
  basePath: string;
}

export default function PublicSocialFramesPage({ basePath }: PublicSocialFramesPageProps) {
  const { user } = useAuthStore();
  const { lang } = useLanguageStore();
  const clientId = user?.clientId ?? "";
  const navigate = useNavigate();

  const [frames, setFrames] = useState<SocialFrameRecord[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <h1 className="text-lg font-semibold">{t("adminPages", "socialFramesTitle", lang)}</h1>

        {loading ? (
          <SkeletonGrid count={3} className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" />
        ) : frames.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-sm">{t("adminPages", "noSocialFrames", lang)}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {frames.map((frame) => (
              <div
                key={frame.id}
                onClick={() => navigate(`${basePath}/social-frames/${frame.id}`)}
                className="border rounded-xl bg-white overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
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
                <div className="p-3">
                  <p className="text-sm font-medium truncate">{frame.title}</p>
                  <p className="text-[11px] text-gray-400">
                    {new Date(frame.updatedAt).toLocaleDateString()}
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
