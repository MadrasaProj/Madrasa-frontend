import { cn } from "@/lib/utils";
import { LucideIcon, ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  back?: boolean;
  backHref?: string;
  action?: React.ReactNode;
}

export function PageHeader({ title, subtitle, icon: Icon, back, backHref, action }: PageHeaderProps) {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 mb-5 lg:mb-6">
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        {back && (
          <button
            onClick={() => backHref ? navigate(backHref) : navigate(-1)}
            className="p-2 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 transition-colors shrink-0 active:scale-95"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
        )}
        {Icon && (
          <div className="p-2 lg:p-2.5 bg-emerald-50 rounded-xl shrink-0">
            <Icon className="w-5 h-5 lg:w-6 lg:h-6 text-emerald-600" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="text-lg lg:text-xl font-bold text-gray-900 leading-tight truncate">{title}</h1>
          {subtitle && <p className="text-xs lg:text-sm text-gray-500 truncate mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="shrink-0 hidden sm:block">{action}</div>}
    </div>
  );
}

interface SectionHeaderProps {
  title: string;
  action?: React.ReactNode;
  className?: string;
}

export function SectionHeader({ title, action, className }: SectionHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between mb-3", className)}>
      <h2 className="text-base font-semibold text-gray-700">{title}</h2>
      {action}
    </div>
  );
}
