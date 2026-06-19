import { useEffect } from "react";
import { useParams } from "react-router-dom";
import PosterViewer from "../../../posters/PosterViewer";

export default function ParentPosterViewPage() {
  const { id } = useParams<{ id: string }>();

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  if (!id) return null;

  return <PosterViewer posterId={id} fullScreen />;
}
