import { DashboardLayout } from "@/components/DashboardLayout";
import { ParentStudentProfileContent } from "@/components/ParentStudentProfileContent";
import { PageHeader } from "@/components/ui/PageHeader";
import { t } from "@/lib/i18n";
import { useLanguageStore } from "@/store/language";

export default function ParentStudentProfile() {
  const { lang } = useLanguageStore();

  return (
    <DashboardLayout>
      <div className="p-4">
        <PageHeader title={t("parentPages", "studentProfileTitle", lang)} />
        <ParentStudentProfileContent />
      </div>
    </DashboardLayout>
  );
}
