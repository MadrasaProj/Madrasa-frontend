import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import PosterViewer from "../PosterViewer";
import { ArrowLeft } from "lucide-react";

interface PosterViewPageProps {
  basePath: string;
}

export default function PosterViewPage({ basePath }: PosterViewPageProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  if (!id) return null;

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <button
          onClick={() => navigate(`${basePath}/posters`)}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Posters
        </button>
        <PosterViewer posterId={id} />
      </div>
    </DashboardLayout>
  );
}
