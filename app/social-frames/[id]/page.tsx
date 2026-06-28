import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import SocialFrameViewer from "../SocialFrameViewer";
import { ArrowLeft } from "lucide-react";

interface SocialFrameViewPageProps {
  basePath: string;
}

export default function SocialFrameViewPage({ basePath }: SocialFrameViewPageProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  if (!id) return null;

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <button
          onClick={() => navigate(`${basePath}/social-frames`)}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Social Frames
        </button>
        <SocialFrameViewer frameId={id} />
      </div>
    </DashboardLayout>
  );
}
