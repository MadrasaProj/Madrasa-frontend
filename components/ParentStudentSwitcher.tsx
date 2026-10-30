import { Swiper, SwiperSlide } from "swiper/react";
import { FreeMode } from "swiper/modules";
import "swiper/css";
import "swiper/css/free-mode";
import type { StudentInfo } from "@/lib/auth-api";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";
import { useLanguageStore } from "@/store/language";
import { StudentAvatar } from "@/components/teacher/StudentAvatar";

type ParentStudentSwitcherProps = {
  studentIds: string[];
  students: StudentInfo[];
  activeStudentId: string | null;
  activeStudent?: { name: string; photoUrl?: string | null } | null;
  onSelectStudent: (id: string) => void;
};

export function ParentStudentSwitcher({
  studentIds,
  students,
  activeStudentId,
  activeStudent,
  onSelectStudent,
}: ParentStudentSwitcherProps) {
  const { lang } = useLanguageStore();

  return (
    <Swiper
      modules={[FreeMode]}
      freeMode={{ enabled: true, momentum: true }}
      slidesPerView="auto"
      spaceBetween={8}
      grabCursor
      className="!overflow-hidden"
      aria-label={t("parentPages", "yourStudentsLabel", lang)}
    >
      {studentIds.map((id) => {
        const info = students.find((student) => student.id === id);
        const isActive = id === activeStudentId;
        const photo = isActive ? (activeStudent?.photoUrl ?? info?.photoUrl) : info?.photoUrl;
        const name = info?.name ?? (isActive ? activeStudent?.name : undefined) ?? t("parentPages", "studentProfileTitle", lang);

        return (
          <SwiperSlide key={id} className="!h-auto !w-auto">
            <button
              type="button"
              onClick={() => onSelectStudent(id)}
              aria-pressed={isActive}
              className={cn(
                "inline-flex h-11 max-w-44 items-center gap-2 rounded-xl border-2 px-2 pr-3.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2",
                isActive
                  ? "border-primary-600 bg-primary-50 text-primary-900"
                  : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:text-gray-900",
              )}
            >
              <StudentAvatar name={name} gender={info?.gender} photoUrl={photo} className="size-7 text-xs" />
              <span className="truncate">{name}</span>
            </button>
          </SwiperSlide>
        );
      })}
    </Swiper>
  );
}
