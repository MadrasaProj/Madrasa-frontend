
import { useLanguageStore } from "@/store/language";
import { motion } from "framer-motion";
import { Languages } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function LanguageSwitcher() {
  const { lang, toggleLang } = useLanguageStore();

  return (
    <Button
      variant="outline" size="sm"
      onClick={toggleLang}
      className="h-auto rounded-full bg-white/80 px-3 py-1.5 text-xs shadow-sm hover:shadow-md"
      title={lang === "en" ? "Switch to Malayalam" : "Switch to English"}
    >
      <Languages className="h-3.5 w-3.5 text-emerald-600" />
      <motion.span
        key={lang}
        initial={{ y: -8, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="text-gray-700  "
      >
        {lang === "en" ? "മല" : "EN"}
      </motion.span>
    </Button>
  );
}
