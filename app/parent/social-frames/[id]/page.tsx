import { useEffect } from "react";
import { useParams } from "react-router-dom";
import SocialFrameViewer from "../../../social-frames/SocialFrameViewer";

export default function ParentSocialFrameViewPage() {
  const { id } = useParams<{ id: string }>();

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  if (!id) return null;

  return <SocialFrameViewer frameId={id} fullScreen />;
}
