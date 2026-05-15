import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { seatArrangements } from "@/mock-data";
import { BookMarked } from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";
import { useLanguageStore } from "@/store/language";
import { t } from "@/lib/i18n";

export default function AdminSeatsPage() {
  const { lang } = useLanguageStore();
  const [arrangement] = useState(seatArrangements[0]);
  const [showGenerator, setShowGenerator] = useState(false);

  const maxRow = Math.max(...arrangement.layout.map((b) => b.row));
  const maxCol = Math.max(...arrangement.layout.map((b) => b.col));

  return (
    <DashboardLayout>
      <PageHeader
        title={t("adminPages", "seatsTitle", lang)}
        subtitle={arrangement.examName}
        icon={BookMarked}
        action={
          <button
            onClick={() => setShowGenerator(true)}
            className="bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors"
          >
            {t("adminPages", "generateNew", lang)}
          </button>
        }
      />

      {/* Hall Info */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 mb-5 flex items-center justify-between">
        <div>
          <p className="font-semibold text-gray-900">{arrangement.hall}</p>
          <p className="text-sm text-gray-500">{arrangement.totalBenches} {t("adminPages", "benches", lang)}</p>
        </div>
        <div className="flex gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-blue-200" />
            <span className="text-xs text-gray-600">{t("adminPages", "boys", lang)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-pink-200" />
            <span className="text-xs text-gray-600">{t("adminPages", "girls", lang)}</span>
          </div>
        </div>
      </div>

      {/* Teacher / Invigilator */}
      <div className="bg-emerald-600 text-white rounded-2xl p-3 mb-6 text-center text-sm font-semibold">
        {t("adminPages", "invigilatorDesk", lang)}
      </div>

      {/* Seat Grid */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100 overflow-x-auto">
        <div className="space-y-4 min-w-max mx-auto">
          {Array.from({ length: maxRow }, (_, r) => (
            <div key={r} className="flex gap-4 justify-center">
              {Array.from({ length: maxCol }, (_, c) => {
                const bench = arrangement.layout.find((b) => b.row === r + 1 && b.col === c + 1);
                if (!bench) return <div key={c} className="w-28 h-20 opacity-0" />;
                return (
                  <motion.div
                    key={bench.benchId}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: bench.benchId * 0.05 }}
                    className={`w-28 h-20 rounded-xl border-2 flex flex-col items-center justify-center p-2 ${
                      bench.gender === "male"
                        ? "bg-blue-50 border-blue-200"
                        : "bg-pink-50 border-pink-200"
                    }`}
                  >
                    <span className="text-xs font-bold text-gray-700 text-center leading-tight">{bench.studentName.split(" ")[0]}</span>
                    <span className="text-[10px] text-gray-500 mt-0.5">{bench.class}</span>
                    <span className="text-[10px] font-mono text-gray-400">#{bench.benchId}</span>
                  </motion.div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Generator Modal */}
      {showGenerator && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end lg:items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl p-6 w-full max-w-md"
          >
            <h2 className="font-bold text-gray-900 text-lg mb-4">{t("adminPages", "generateSeat", lang)}</h2>
            <div className="space-y-4">
              {[
                { label: t("adminPages", "examNameLabel", lang), placeholder: "e.g. Second Semester Exam" },
                { label: t("adminPages", "hallName", lang), placeholder: "e.g. Main Hall" },
                { label: t("adminPages", "numBenches", lang), placeholder: "e.g. 30", type: "number" },
                { label: t("adminPages", "numColumns", lang), placeholder: "e.g. 4", type: "number" },
              ].map(({ label, placeholder, type }) => (
                <div key={label}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                  <input type={type ?? "text"} placeholder={placeholder} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm" />
                </div>
              ))}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t("adminPages", "participatingClasses", lang)}</label>
                <div className="flex gap-2 flex-wrap">
                  {["Class 2","Class 3","Class 4","Class 5"].map((c) => (
                    <label key={c} className="flex items-center gap-1.5 bg-gray-50 rounded-lg px-3 py-1.5 cursor-pointer">
                      <input type="checkbox" defaultChecked className="w-3.5 h-3.5 accent-emerald-600" />
                      <span className="text-sm text-gray-700">{c}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 mt-2">
                <button
                  onClick={() => { setShowGenerator(false); alert("✅ Seat arrangement generated! (Demo)"); }}
                  className="flex-1 bg-emerald-600 text-white font-semibold py-3 rounded-xl hover:bg-emerald-700 transition-colors text-sm"
                >
                  {t("adminPages", "generate", lang)}
                </button>
                <button onClick={() => setShowGenerator(false)} className="flex-1 bg-gray-100 text-gray-700 font-semibold py-3 rounded-xl hover:bg-gray-200 transition-colors text-sm">
                  {t("adminPages", "cancel", lang)}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </DashboardLayout>
  );
}
