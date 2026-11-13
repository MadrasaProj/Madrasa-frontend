import { Icon } from "@iconify/react";
import type { NotificationRecord, NotificationType } from "@/lib/notifications-api";
import { cn } from "@/lib/utils";

const ICONS: Record<NotificationType, { icon: string; gradient: string }> = {
  ANNOUNCEMENT: { icon: "mdi:bell-outline", gradient: "from-rose-500 to-pink-600" },
  ATTENDANCE_ALERT: { icon: "mdi:clipboard-check-outline", gradient: "from-sky-500 to-blue-600" },
  FEE_REMINDER: { icon: "mdi:credit-card-check-outline", gradient: "from-green-500 to-emerald-700" },
  HOMEWORK_REMINDER: { icon: "mdi:note-plus-outline", gradient: "from-indigo-500 to-violet-600" },
  EXAM_NOTICE: { icon: "mdi:school-outline", gradient: "from-violet-500 to-fuchsia-600" },
  GENERAL: { icon: "mdi:bell-outline", gradient: "from-slate-500 to-slate-700" },
};

export function NotificationListItem({ notification, onClick, ariaLabel, unread = false }: {
  notification: NotificationRecord;
  onClick: () => void;
  ariaLabel?: string;
  unread?: boolean;
}) {
  const config = ICONS[notification.type] ?? ICONS.GENERAL;
  return (
    <button type="button" onClick={onClick} aria-label={ariaLabel ?? notification.title}
      className={cn("flex w-full items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary-500", unread && "bg-blue-50/40")}>
      <span aria-hidden="true" className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white", config.gradient)}>
        <Icon icon={config.icon} className="size-5" />
      </span>
      <span title={notification.title} className={cn("min-w-0 flex-1 truncate text-sm font-semibold text-gray-900", unread && "font-bold text-gray-950")}>{notification.title}</span>
      <time dateTime={notification.createdAt} className="shrink-0 whitespace-nowrap text-right text-xs tabular-nums text-gray-500">
        {new Date(notification.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
      </time>
    </button>
  );
}
