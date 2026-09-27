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
    <div className="h-[20px] mb-5 lg:mb-6">
      <div className="fixed inset-x-0 top-0 z-40 flex flex-col gap-2 border-b border-gray-100 bg-white/95 px-4 py-3 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between sm:gap-3 lg:left-64 lg:top-[73px] lg:px-8">
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
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
        <div className="min-w-0 flex-1 flex items-center">
          <h1 className="text-lg lg:text-xl font-bold text-gray-900 leading-tight truncate">{title}</h1>
          {subtitle && <p className="text-xs lg:text-sm text-gray-500 truncate mt-0.5">{subtitle}</p>}
      {action && <div className="shrink-0 ml-auto sm:block">{action}</div>}
        </div>
      </div>
      </div>
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
