import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { updateProfile } from "@/lib/super-admin-api";
import { useAuthStore } from "@/store/auth";
import { UserCircle2, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

// ── Role badge ────────────────────────────────────────────────────────────────

const ROLE_BADGE: Record<string, string> = {
  SUPER_ADMIN: "bg-indigo-100 text-indigo-700",
  CLIENT_ADMIN: "bg-emerald-100 text-emerald-700",
  TEACHER: "bg-blue-100 text-blue-700",
  PARENT: "bg-amber-100 text-amber-700",
  COMMITTEE: "bg-blue-100 text-blue-700",
};

const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  CLIENT_ADMIN: "Madrasa Admin",
  TEACHER: "Teacher",
  PARENT: "Parent",
  COMMITTEE: "Committee",
};

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { user, accessToken, updateUser } = useAuthStore();

  const [name, setName] = useState(user?.name ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const inputCls = "w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400";
  const labelCls = "text-xs text-gray-500 mb-1 block font-medium";

  const handleSave = async () => {
    setError("");
    setSuccess("");

    if (!name.trim()) { setError("Name cannot be empty."); return; }

    const dto: { name?: string; currentPassword?: string; newPassword?: string } = {};

    if (name !== user?.name) dto.name = name.trim();

    if (newPassword) {
      if (!currentPassword) { setError("Current password is required to set a new password."); return; }
      if (newPassword.length < 8) { setError("New password must be at least 8 characters."); return; }
      if (newPassword !== confirmPassword) { setError("New passwords do not match."); return; }
      dto.currentPassword = currentPassword;
      dto.newPassword = newPassword;
    }

    if (!dto.name && !dto.newPassword) {
      setError("No changes to save.");
      return;
    }

    setSaving(true);
    try {
      await updateProfile(accessToken!, dto);
      setSuccess("Profile updated successfully.");
      if (dto.name) {
        updateUser({ name: dto.name });
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (e: any) {
      setError(e?.message ?? "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  const actorType = user?.actorType ?? "CLIENT_ADMIN";

  return (
    <DashboardLayout>
      <PageHeader title="Profile" icon={UserCircle2} />

      <div className="max-w-lg space-y-4 pb-20">
        {/* User info card */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border border-gray-100 p-5"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 bg-emerald-600 rounded-2xl flex items-center justify-center text-white font-black text-xl">
              {user?.name?.charAt(0)?.toUpperCase() ?? "?"}
            </div>
            <div>
              <p className="font-bold text-gray-900 text-base">{user?.name}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full", ROLE_BADGE[actorType] ?? "bg-gray-100 text-gray-600")}>
                  {ROLE_LABEL[actorType] ?? actorType}
                </span>
              </div>
              {user?.id && (
                <p className="text-[11px] text-gray-300 font-mono mt-1">{user.id}</p>
              )}
            </div>
          </div>
        </motion.div>

        {/* Edit form */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-white rounded-2xl border border-gray-100 p-5"
        >
          <p className="text-sm font-bold text-gray-700 mb-4">Edit Profile</p>

          {error && (
            <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-600">
              <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}
          {success && (
            <div className="mb-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-700">
              <CheckCircle className="w-4 h-4 shrink-0" /> {success}
            </div>
          )}

          <div className="space-y-3">
            <div>
              <label className={labelCls}>Display Name *</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputCls}
                placeholder="Your full name"
              />
            </div>
          </div>
        </motion.div>

        {/* Password section */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl border border-gray-100 p-5"
        >
          <p className="text-sm font-bold text-gray-700 mb-1">Change Password</p>
          <p className="text-xs text-gray-400 mb-4">Leave blank if you do not want to change your password.</p>
          <div className="space-y-3">
            <div>
              <label className={labelCls}>Current Password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className={inputCls}
                placeholder="Enter current password"
              />
            </div>
            <div>
              <label className={labelCls}>New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={inputCls}
                placeholder="Min 8 characters"
              />
            </div>
            <div>
              <label className={labelCls}>Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={inputCls}
                placeholder="Repeat new password"
              />
            </div>
          </div>
        </motion.div>

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 py-3.5 text-sm font-semibold bg-emerald-600 text-white rounded-2xl hover:bg-emerald-700 transition-all disabled:opacity-60"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Save Changes
        </button>
      </div>
    </DashboardLayout>
  );
}
