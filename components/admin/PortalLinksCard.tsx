import { useState } from "react";
import {
  Users,
  GraduationCap,
  Copy,
  Check,
  ExternalLink,
  MessageCircle,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { cn } from "@/lib/utils";

export interface PortalLinksCardProps {
  slug: string;
  madrasaName?: string;
  className?: string;
}

type Portal = {
  key: "teacher" | "parent";
  title: string;
  description: string;
  url: string;
  icon: LucideIcon;
};

export function PortalLinksCard({
  slug,
  madrasaName,
  className,
}: PortalLinksCardProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!slug) return null;

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const teacherUrl = `${origin}/m/${slug}/teacher`;
  const parentUrl = `${origin}/m/${slug}/parent`;
  const portals: Portal[] = [
    { key: "teacher", title: "Teacher Portal", description: "For staff attendance & classes", url: teacherUrl, icon: Users },
    { key: "parent", title: "Parent Portal", description: "For fees, exams & attendance", url: parentUrl, icon: GraduationCap },
  ];

  const copyToClipboard = async (url: string, key: string, label: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = url;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopiedKey(key);
      toast.success(`${label} copied to clipboard!`);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const shareSingleViaWhatsApp = (portalName: string, url: string) => {
    const org = madrasaName ? `${madrasaName} - ` : "";
    const message = `*${org}${portalName}*\nAccess your portal here:\n${url}\n\n_Tip: Open this link and add it to your Home Screen for quick access._`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");
  };

  const shareBroadcastViaWhatsApp = () => {
    const org = madrasaName ? ` for *${madrasaName}*` : "";
    const message =
      `*Smart Madrasa Portals${org}*\n\n` +
      `👩‍🏫 *Teacher Portal:*\n${teacherUrl}\n\n` +
      `👨‍👩‍👧 *Parent Portal:*\n${parentUrl}\n\n` +
      `_Save these links or tap the browser menu to "Add to Home Screen" for easy app-like access._`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");
  };

  return (
    <section className={cn("card rounded-2xl border border-gray-100 bg-white p-4 shadow-xs sm:p-5", className)}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-gray-950 sm:text-base">Staff & Parent Portal Links</h2>
          <p className="mt-0.5 text-xs text-gray-500">Share login links with teachers and parents</p>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={shareBroadcastViaWhatsApp}>
          <MessageCircle aria-hidden="true" className="size-3.5" />
          Share both
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {portals.map((portal) => (
          <div
            key={portal.key}
            className="flex min-w-0 flex-col justify-between rounded-2xl border border-white bg-linear-to-br from-primary-50 via-white to-white p-4 shadow-xs"
          >
            <div>
              <div className="flex items-center gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary-100 text-primary-700">
                  <portal.icon aria-hidden="true" className="size-5" />
                </span>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-gray-950">{portal.title}</h3>
                  <p className="text-xs text-gray-600">{portal.description}</p>
                </div>
              </div>
              <p className="mt-4 truncate rounded-xl bg-white/80 px-3 py-2 text-xs text-gray-600 select-all" title={portal.url}>
                {portal.url}
              </p>
            </div>

            <ButtonGroup aria-label={`${portal.title} actions`} className="mt-3 w-full">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="min-w-0 flex-1"
                onClick={() => copyToClipboard(portal.url, portal.key, `${portal.title} Link`)}
              >
                {copiedKey === portal.key ? <Check aria-hidden="true" className="size-3.5" /> : <Copy aria-hidden="true" className="size-3.5" />}
                {copiedKey === portal.key ? "Copied" : "Copy"}
              </Button>
              <Button
                type="button"
                size="sm"
                className="min-w-0 flex-1"
                onClick={() => shareSingleViaWhatsApp(portal.title, portal.url)}
              >
                <MessageCircle aria-hidden="true" className="size-3.5" />
                Share
              </Button>
              <Button
                type="button"
                size="icon-sm"
                variant="outline"
                aria-label={`Open ${portal.title} in a new tab`}
                title={`Open ${portal.title} in a new tab`}
                onClick={() => window.open(portal.url, "_blank", "noopener,noreferrer")}
              >
                <ExternalLink aria-hidden="true" className="size-4" />
              </Button>
            </ButtonGroup>
          </div>
        ))}
      </div>
    </section>
  );
}
