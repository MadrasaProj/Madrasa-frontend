import { useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Briefcase,
  Target,
  LifeBuoy,
  IndianRupee,
  RefreshCw,
  MapPin,
  Receipt,
  ChevronRight,
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
  const activeTabRef = useRef<HTMLAnchorElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll active module tab into view on mobile
  useEffect(() => {
    if (activeTabRef.current && containerRef.current) {
      activeTabRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  }, [currentPath]);

  return (
    <nav
      aria-label="CRM Modules Navigation"
      className={cn(
        "relative bg-white/95 backdrop-blur-md border border-gray-200/90 rounded-2xl p-1.5 shadow-xs mb-5 select-none",
        className
      )}
    >
      <div
        ref={containerRef}
        className="flex items-center gap-1 sm:gap-1.5 flex-wrap py-0.5 px-0.5"
      >
        {CRM_NAV_ITEMS.map((item) => {
          const isActive =
            currentPath === item.href ||
            (item.href === "/admin/crm/operations" && currentPath === "/admin/crm");
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              ref={isActive ? activeTabRef : undefined}
              to={item.href}
              className={cn(
                "group shrink-0 inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold transition-all duration-150",
                "min-h-[38px] sm:min-h-[40px] touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500",
                isActive
                  ? "bg-emerald-600 text-white shadow-xs font-black ring-1 ring-emerald-700/20"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100/80 active:bg-gray-200/60"
              )}
            >
              <Icon
                className={cn(
                  "w-4 h-4 shrink-0 transition-transform duration-150 group-hover:scale-110",
                  isActive ? "text-white" : "text-emerald-600"
                )}
              />
              <span className="inline">{item.label}</span>
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
