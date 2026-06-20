import { useCallback, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { ExamConfigForm } from "@/components/exam/ExamConfigForm";
import { ArrowLeft, Save, Loader2 } from "lucide-react";

export default function ExamConfigPage() {
  const navigate = useNavigate();

  const [saving, setSaving] = useState(false);
  const saveFnRef = useRef<(() => Promise<void>) | null>(null);

  const handleSaveRequested = useCallback((fn: () => Promise<void>) => {
    saveFnRef.current = fn;
  }, []);

  const handleSave = async () => {
    if (!saveFnRef.current) return;
    setSaving(true);
    try {
      await saveFnRef.current();
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Exam Configuration</h1>
            <p className="text-sm text-gray-500 mt-0.5">Global settings applied to all exams and result cards</p>
          </div>
        </div>

        <ExamConfigForm onSaveRequested={handleSaveRequested} />

        <div className="flex justify-end gap-3 mt-6 pb-6">
          <button onClick={() => navigate(-1)}
            className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold disabled:opacity-50 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Configuration
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}
