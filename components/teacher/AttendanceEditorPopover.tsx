import type { ReactNode } from "react";
import { ResponsivePopover } from "@/components/ui/responsivePopover";

interface AttendanceEditorPopoverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description: ReactNode;
  children: ReactNode;
}

export function AttendanceEditorPopover({
  open,
  onOpenChange,
  title,
  description,
  children,
}: AttendanceEditorPopoverProps) {
  return (
    <ResponsivePopover
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      side="bottom"
      contentClassName="p-4"
    >
      {children}
    </ResponsivePopover>
  );
}
