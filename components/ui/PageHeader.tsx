import { cn } from "@/lib/utils";
import { LucideIcon, ChevronLeft, ChevronDown, School, ChevronRight } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/auth";
import { useActiveClass } from "@/store/activeClass";
import { useLanguageStore } from "@/store/language";
import { DrawerSelector } from "@/components/DrawerSelector";
import { StudentAvatar } from "@/components/teacher/StudentAvatar";

export function PageHeaderSwitchers() {
  const { pathname } = useLocation();
  const { user, activeStudentId, setActiveStudent } = useAuthStore();
  const { lang } = useLanguageStore();
  const { classes, activeClass, activeClassId, setActiveClassId, isLoading } =
    useActiveClass();

  const isParentRoute = /^\/(?:m\/[^/]+\/)?parent(?:\/|$)/.test(pathname);
  const isTeacherRoute = /^\/(?:m\/[^/]+\/)?teacher(?:\/|$)/.test(pathname);
  const studentIds = user?.accessibleStudentIds ?? [];
  const students = user?.accessibleStudents ?? [];
  const currentId = activeStudentId ?? studentIds[0] ?? null;
  const currentStudent = students.find((student) => student.id === currentId);

  if (isParentRoute && user?.actorType === "PARENT" && studentIds.length > 0) {
    return (
      <DrawerSelector
        title={lang === "ml" ? "വിദ്യാർത്ഥിയെ തിരഞ്ഞെടുക്കുക" : "Switch student"}
        options={studentIds.map((id) => {
          const student = students.find((item) => item.id === id);
          return { value: id, label: student?.name ?? "Student" };
        })}
        renderOption={(option) => {
          const student = students.find((item) => item.id === option.value);
          return (
            <>
              <StudentAvatar name={option.label} gender={student?.gender} photoUrl={student?.photoUrl} size="sm" />
              <span className="min-w-0 flex-1 truncate font-medium">{option.label}</span>
            </>
          );
        }}
        value={currentId ?? ""}
        onChange={setActiveStudent}
        placeholder="Student"
        triggerItem={
          <button
            type="button"
            className="inline-flex max-w-40 shrink-0 items-center gap-2 rounded-full border border-gray-200 bg-white px-2 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          >
            <StudentAvatar name={currentStudent?.name ?? "Student"} gender={currentStudent?.gender} photoUrl={currentStudent?.photoUrl} size="sm" />
            <span className="line-clamp-1 max-w-[60px] break-all">{currentStudent?.name ?? "Student"}</span>
            <ChevronRight className="size-4 shrink-0" />
          </button>
        }
      />
    );
  }

  if (isTeacherRoute && user?.role === "teacher") {
    return (
      <DrawerSelector
        title={lang === "ml" ? "സജീവ ക്ലാസ്" : "Active class"}
        options={[...classes]
          .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" }))
          .map((cls) => ({ value: cls.id, label: cls.name, disabled: isLoading }))}
        value={activeClassId ?? ""}
        onChange={setActiveClassId}
        placeholder={isLoading ? (lang === "ml" ? "ക്ലാസുകൾ ലോഡ് ചെയ്യുന്നു…" : "Loading classes…") : "Class"}
        disabled={isLoading}
        triggerItem={
          <button
            type="button"
            className="inline-flex max-w-40 shrink-0 items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          >
            <School className="size-4 shrink-0 text-primary-600" />
            <span className="truncate">{activeClass?.name ?? "Class"}</span>
            <ChevronDown className="size-4 shrink-0" />
          </button>
        }
      />
    );
  }

  return null;
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  back?: boolean;
  backHref?: string;
  action?: React.ReactNode;
}

export function PageHeader({
  title,
  subtitle,
  icon: Icon,
  back,
  backHref,
  action,
}: PageHeaderProps) {
  const navigate = useNavigate();
  return (
    <div className="relative !p-0 ">
      <div className="mb-[62px]"></div>
      <div className=" fixed   inset-x-0 top-0 z-40 flex flex-col gap-2 border-b border-gray-100 bg-white/95 px-4 py-3 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between sm:gap-3 lg:left-64 lg:top-[0px] lg:px-8">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          {back && (
            <button
              onClick={() => (backHref ? navigate(backHref) : navigate(-1))}
              className="p-2 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 transition-colors shrink-0 active:scale-95"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
          )}
          {Icon && (
            <div className="p-2 lg:p-2.5 bg-primary-50 rounded-xl shrink-0">
              <Icon className="w-5 h-5 lg:w-6 lg:h-6 text-primary-600" />
            </div>
          )}
          <div className="min-w-0 flex-1 flex items-center">
            <h1 className="text-lg lg:text-xl font-bold text-gray-900 leading-tight truncate">
              {title}
            </h1>
            {subtitle && (
              <p className="text-xs lg:text-sm text-gray-500 truncate mt-0.5">
                {subtitle}
              </p>
            )}
            {action && (
              <div className="shrink-0 ml-auto sm:block">{action}</div>
            )}
          </div>
          <PageHeaderSwitchers />
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

export function SectionHeader({
  title,
  action,
  className,
}: SectionHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between mb-3", className)}>
      <h2 className="text-base font-semibold text-gray-700">{title}</h2>
      {action}
    </div>
  );
}
