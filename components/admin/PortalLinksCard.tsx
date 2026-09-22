import { useState } from "react";
import { motion } from "framer-motion";
import {
  Users,
  GraduationCap,
  Copy,
  Check,
  ExternalLink,
  MessageCircle,
  Share2,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

export interface PortalLinksCardProps {
  slug: string;
  madrasaName?: string;
  className?: string;
}

export function PortalLinksCard({
  slug,
  madrasaName,
  className = "",
}: PortalLinksCardProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!slug) return null;

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const teacherUrl = `${origin}/m/${slug}/teacher`;
  const parentUrl = `${origin}/m/${slug}/parent`;

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
    const text = `*${org}${portalName}*\nAccess your portal here:\n${url}\n\n_Tip: Open this link and add it to your Home Screen for quick access._`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  const shareBroadcastViaWhatsApp = () => {
    const org = madrasaName ? ` for *${madrasaName}*` : "";
    const text =
      `*Smart Madrasa Portals${org}*\n\n` +
      `👩‍🏫 *Teacher Portal:*\n${teacherUrl}\n\n` +
      `👨‍👩‍👧 *Parent Portal:*\n${parentUrl}\n\n` +
      `_Save these links or tap the browser menu to "Add to Home Screen" for easy app-like access._`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  return (
    <div
      className={`bg-white rounded-3xl p-5 border border-gray-100 shadow-xs mb-5 ${className}`}
    >
      {/* Card Header */}
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <Share2 className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-gray-900">
                Staff & Parent Portal Links
              </h2>
              <span className="flex items-center gap-1 text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
                <Sparkles className="w-2.5 h-2.5" />
                Live Portals
              </span>
            </div>
            <p className="text-xs text-gray-500">
              Share login portal links with your teachers and student parents
            </p>
          </div>
        </div>

        <button
          onClick={shareBroadcastViaWhatsApp}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors cursor-pointer"
        >
          <MessageCircle className="w-3.5 h-3.5" />
          Broadcast Both Links
        </button>
      </div>

      {/* Two Portal Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {/* Teacher Portal */}
        <div className="bg-gradient-to-br from-emerald-50/40 via-white to-teal-50/30 rounded-2xl p-4 border border-emerald-100 hover:border-emerald-200 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">
                    Teacher Portal
                  </h3>
                  <p className="text-xs text-gray-500">
                    For staff attendance & classes
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-100/70 text-emerald-800">
                Staff
              </span>
            </div>

            {/* URL display */}
            <div className="bg-white/80 rounded-xl p-2 border border-emerald-150 mb-3 flex items-center gap-2">
              <span className="text-xs font-mono text-gray-600 truncate flex-1 select-all">
                {teacherUrl}
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1.5 pt-1 border-t border-emerald-100/60">
            <button
              onClick={() =>
                copyToClipboard(teacherUrl, "teacher", "Teacher Portal Link")
              }
              className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl text-xs font-semibold bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors shadow-2xs cursor-pointer"
            >
              {copiedKey === "teacher" ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-600 font-bold">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-gray-400" />
                  <span>Copy Link</span>
                </>
              )}
            </button>

            <button
              onClick={() =>
                shareSingleViaWhatsApp("Teacher Portal", teacherUrl)
              }
              className="flex items-center justify-center gap-1 py-1.5 px-2.5 rounded-xl text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-2xs cursor-pointer"
              title="Share to WhatsApp"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>Share</span>
            </button>

            <a
              href={teacherUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-xl text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors cursor-pointer"
              title="Open Teacher Portal in new tab"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* Parent Portal */}
        <div className="bg-gradient-to-br from-indigo-50/40 via-white to-purple-50/30 rounded-2xl p-4 border border-indigo-100 hover:border-indigo-200 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                  <GraduationCap className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">
                    Parent Portal
                  </h3>
                  <p className="text-xs text-gray-500">
                    For fees, exams & attendance
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-100/70 text-indigo-800">
                Parents
              </span>
            </div>

            {/* URL display */}
            <div className="bg-white/80 rounded-xl p-2 border border-indigo-150 mb-3 flex items-center gap-2">
              <span className="text-xs font-mono text-gray-600 truncate flex-1 select-all">
                {parentUrl}
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1.5 pt-1 border-t border-indigo-100/60">
            <button
              onClick={() =>
                copyToClipboard(parentUrl, "parent", "Parent Portal Link")
              }
              className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl text-xs font-semibold bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors shadow-2xs cursor-pointer"
            >
              {copiedKey === "parent" ? (
                <>
                  <Check className="w-3.5 h-3.5 text-indigo-600" />
                  <span className="text-indigo-600 font-bold">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-gray-400" />
                  <span>Copy Link</span>
                </>
              )}
            </button>

            <button
              onClick={() => shareSingleViaWhatsApp("Parent Portal", parentUrl)}
              className="flex items-center justify-center gap-1 py-1.5 px-2.5 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-2xs cursor-pointer"
              title="Share to WhatsApp"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>Share</span>
            </button>

            <a
              href={parentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-xl text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors cursor-pointer"
              title="Open Parent Portal in new tab"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
