import { DashboardLayout } from "@/components/DashboardLayout";
import { ParentStudentProfileContent } from "@/components/ParentStudentProfileContent";
import { PageHeader } from "@/components/ui/PageHeader";
import { t } from "@/lib/i18n";
import { useLanguageStore } from "@/store/language";

export default function ParentStudentProfile() {
  const { lang } = useLanguageStore();

  return (
    <DashboardLayout>
      <div className="-mx-4 -mt-4 min-h-screen bg-[#f6faf8] px-4 pb-0 pt-4 lg:-mx-8 lg:-mt-8 lg:px-8 lg:pb-8 lg:pt-8">
        <PageHeader title={t("parentPages", "studentProfileTitle", lang)} />
        <ParentStudentProfileContent />
      </div>
    </DashboardLayout>
  );
}
