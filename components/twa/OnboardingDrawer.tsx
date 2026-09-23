import type { FormEvent, ReactNode } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Check } from "lucide-react";
import { Drawer } from "@/components/ui/Drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PwaInstallButton from "@/components/PwaInstallButton";

type LandingRole = "parent" | "teacher" | "admin";

interface OnboardingDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: LandingRole | null;
  setRole: (role: LandingRole) => void;
  slug: string;
  setSlug: (slug: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onClearSlug: () => void;
  sessionsContent?: ReactNode;
}

const roles = [
  ["parent", "Parent", "/imgs/onboarding/parent_ico.png"],
  ["admin", "Admin", "/imgs/onboarding/admin_ico.png"],
  ["teacher", "Teacher", "/imgs/onboarding/teacher_ico.png"],
] as const;

export default function OnboardingDrawer({
  open,
  onOpenChange,
  role,
  setRole,
  slug,
  setSlug,
  onSubmit,
  onClearSlug,
  sessionsContent,
}: OnboardingDrawerProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange} side="bottom" showCloseButton contentClassName="bg-[#f8fbf7]" className="rounded-t-[2rem] bg-[#f8fbf7] px-4 pb-8 pt-3 shadow-[0_-18px_50px_rgba(15,67,45,0.18)]">
       <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="mx-auto w-full max-w-md">
        {/* <div className="mb-8 text-center"><p className="mt-1 text-sm text-gray-500">Select your role to continue</p></div> */}
        {sessionsContent}
        <form onSubmit={onSubmit} className="space-y-7">
          <div className="flex  ">
            {roles.map(([value, label, image]) => {
              const selected = role === value;
              return (
                <div>

                <button key={value} type="button" onClick={() => setRole(value)} className={`relative flex flex-col w-30 items-center gap-2 rounded-2xl p-2 transition-all ${selected ? "scale-[1.03] bg-gradient-to-b from-[#059669]/10  to-[#0d8488]/15" : "opacity-80 hover:opacity-100"}`}>
                  {selected && <span className="absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white"><Check className="h-3 w-3" /></span>}
                  <img src={image} alt={label} className="h-30 w-30 object-contain" />
                </button>
                  <div className={`text-sm mx-auto text-center mt-2 font-semibold ${selected ? "text-emerald-800" : "text-gray-700"}`}>{label}</div>
                </div>
              );
            })}
          </div>
          {role && <motion.div initial={{ opacity: 0, height: 0 }} className="px-1" animate={{ opacity: 1, height: "auto" }} transition={{ duration: 0.2 }}>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Madrasa Slug</label>
            <Input type="text" value={slug} onChange={(event) => setSlug(event.target.value)} placeholder="e.g. noorul-islam" className="h-auto rounded-xl px-4 py-3" autoFocus required />
            {/* <div className="mt-1.5 flex items-center justify-between"><p className="text-xs text-gray-400">Enter your madrasa's slug to proceed to login</p>{slug && <button type="button" onClick={onClearSlug} className="text-xs font-medium text-emerald-600 hover:underline">Change</button>}</div> */}
          </motion.div>}
          {role && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Button type="submit" disabled={!slug.trim()} className="h-auto w-full rounded-xl bg-emerald-600 py-3.5 text-sm font-semibold text-white hover:bg-emerald-700">
              Continue to Login
             </Button>
          </motion.div>}
        </form>
        <div className="mt-4"><PwaInstallButton /></div>
      </motion.div>
    </Drawer>
  );
}
