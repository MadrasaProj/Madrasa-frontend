import { Link, useLocation } from "react-router-dom";
import {
  Briefcase,
  Target,
  LifeBuoy,
  IndianRupee,
  RefreshCw,
  MapPin,
  Receipt,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface CrmNavItem {
  href: string;
  label: string;
  shortLabel: string;
  icon: typeof Briefcase;
  badge?: string | number;
}

const CRM_NAV_ITEMS: CrmNavItem[] = [
  {
    href: "/admin/crm/operations",
    label: "Operations Hub",
    shortLabel: "Operations",
    icon: Briefcase,
  },
  {
    href: "/admin/crm/leads",
    label: "Leads & Pipeline",
    shortLabel: "Leads",
    icon: Target,
  },
  {
    href: "/admin/crm/support",
    label: "Support Desk",
    shortLabel: "Support",
    icon: LifeBuoy,
  },
  {
    href: "/admin/crm/commissions",
    label: "Commissions",
    shortLabel: "Commissions",
    icon: IndianRupee,
  },
  {
    href: "/admin/crm/renewals",
    label: "Renewals & Churn",
    shortLabel: "Renewals",
    icon: RefreshCw,
  },
  {
    href: "/admin/crm/districts",
    label: "Districts",
    shortLabel: "Districts",
    icon: MapPin,
  },
  {
    href: "/admin/crm/expenses",
    label: "Expenses",
    shortLabel: "Expenses",
    icon: Receipt,
  },
];

interface CrmSubNavProps {
  className?: string;
}

export function CrmSubNav({ className }: CrmSubNavProps) {
  const location = useLocation();
  const currentPath = location.pathname;

  return (
    <nav
      aria-label="CRM Modules Navigation"
      className={cn(
        "bg-white/95 backdrop-blur-md border border-gray-200/80 rounded-2xl p-1.5 shadow-xs mb-6",
        className
      )}
    >
      <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-0.5 px-0.5 -mx-0.5">
        {CRM_NAV_ITEMS.map((item) => {
          const isActive =
            currentPath === item.href ||
            (item.href === "/admin/crm/operations" && currentPath === "/admin/crm");
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "group shrink-0 inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-150 select-none",
                "min-h-[42px] touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500",
                isActive
                  ? "bg-emerald-600 text-white shadow-sm font-extrabold"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100/80 active:bg-gray-200/60"
              )}
            >
              <Icon
                className={cn(
                  "w-4 h-4 shrink-0 transition-transform group-hover:scale-110",
                  isActive ? "text-white" : "text-emerald-600"
                )}
              />
              <span className="hidden sm:inline">{item.label}</span>
              <span className="inline sm:hidden">{item.shortLabel}</span>
              {item.badge !== undefined && (
                <span
                  className={cn(
                    "ml-0.5 px-1.5 py-0.5 text-[10px] font-black rounded-full leading-none",
                    isActive
                      ? "bg-emerald-700 text-white"
                      : "bg-gray-100 text-gray-700"
                  )}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
