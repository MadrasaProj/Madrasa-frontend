import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Share2,
  Copy,
  Check,
  ExternalLink,
  MessageCircle,
  Building2,
  Users,
  GraduationCap,
} from "lucide-react";
import type { ClientListItem } from "@/lib/super-admin-api";
import { toast } from "sonner";

export interface ShareMadrasaLinksModalProps {
  open: boolean;
  onClose: () => void;
  client: ClientListItem | null;
}

export function ShareMadrasaLinksModal({
  open,
  onClose,
  client,
}: ShareMadrasaLinksModalProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open || !client) return null;

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const adminUrl = `${origin}/m/${client.slug}/admin/login`;
  const teacherUrl = `${origin}/m/${client.slug}/teacher`;
  const parentUrl = `${origin}/m/${client.slug}/parent`;

  const copyToClipboard = async (text: string, key: string, label: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = text;
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

  const shareViaWhatsApp = (portalName: string, url: string) => {
    const text = `*${portalName} - ${client.name}*\nAccess your portal here:\n${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  const shareAllViaWhatsApp = () => {
    const text =
      `*Smart Madrasa Login Portals for ${client.name}*\n\n` +
      `🏫 *Madrasa Admin Portal:*\n${adminUrl}\n\n` +
      `👩‍🏫 *Teacher Portal:*\n${teacherUrl}\n\n` +
      `👨‍👩‍👧 *Parent Portal:*\n${parentUrl}\n\n` +
      `_Save these links or add them to your phone's Home Screen for quick access._`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Login Portals for ${client.name}`,
          text: `Smart Madrasa Login Portals for ${client.name}`,
          url: adminUrl,
        });
      } catch {
        // User cancelled share
      }
    } else {
      shareAllViaWhatsApp();
    }
  };

  const portals = [
    {
      key: "admin",
      title: "Madrasa Admin Portal",
      audience: "For Madrasa administrators & principals",
      url: adminUrl,
      icon: Building2,
      color: "emerald",
      bgBadge: "bg-emerald-50 text-emerald-700 border-emerald-200",
      iconBg: "bg-emerald-100 text-emerald-700",
    },
    {
      key: "teacher",
      title: "Teacher Portal",
      audience: "For teachers to mark attendance and manage classes",
      url: teacherUrl,
      icon: Users,
      color: "blue",
      bgBadge: "bg-blue-50 text-blue-700 border-blue-200",
      iconBg: "bg-blue-100 text-blue-700",
    },
    {
      key: "parent",
      title: "Parent Portal",
      audience: "For parents to track student attendance, fees, and results",
      url: parentUrl,
      icon: GraduationCap,
      color: "purple",
      bgBadge: "bg-purple-50 text-purple-700 border-purple-200",
      iconBg: "bg-purple-100 text-purple-700",
    },
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50/50 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-xs">
                <Share2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-base">
                  Share Login Portals
                </h3>
                <p className="text-xs text-gray-500 font-medium">
                  {client.name}{" "}
                  <span className="font-mono text-gray-400">
                    ({client.slug})
                  </span>
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 overflow-y-auto space-y-4">
            {portals.map((p) => {
              const Icon = p.icon;
              const isCopied = copiedKey === p.key;
              return (
                <div
                  key={p.key}
                  className="bg-white rounded-2xl border border-gray-150 p-4 hover:border-gray-300 transition-all shadow-xs"
                >
                  <div className="flex items-start justify-between gap-3 mb-2.5">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${p.iconBg}`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm text-gray-900">
                          {p.title}
                        </h4>
                        <p className="text-xs text-gray-500">{p.audience}</p>
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full border ${p.bgBadge}`}
                    >
                      {p.key}
                    </span>
                  </div>

                  {/* URL box */}
                  <div className="flex items-center gap-2 bg-gray-50 rounded-xl p-1.5 border border-gray-200">
                    <span className="text-xs font-mono text-gray-600 truncate px-2 flex-1 select-all">
                      {p.url}
                    </span>
                    <button
                      onClick={() => copyToClipboard(p.url, p.key, p.title)}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-white border border-gray-200 text-gray-700 hover:bg-gray-100 transition-colors shrink-0 shadow-xs cursor-pointer"
                      title="Copy URL"
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-600 font-bold">
                            Copied
                          </span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-gray-500" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                    <a
                      href={p.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors shrink-0"
                      title="Open Portal"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    <button
                      onClick={() => shareViaWhatsApp(p.title, p.url)}
                      className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors shrink-0 cursor-pointer"
                      title="Share to WhatsApp"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex flex-wrap gap-2.5 items-center justify-between shrink-0">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
            >
              Close
            </button>
            <div className="flex items-center gap-2">
              {typeof navigator !== "undefined" && "share" in navigator && (
                <button
                  onClick={handleNativeShare}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-colors cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5" /> Share App
                </button>
              )}
              <button
                onClick={shareAllViaWhatsApp}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-all shadow-xs cursor-pointer"
              >
                <MessageCircle className="w-3.5 h-3.5" /> Share All via WhatsApp
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
