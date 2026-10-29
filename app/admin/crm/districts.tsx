import { useState, useEffect } from "react";
import { useAuthStore } from "@/store/auth";
import { DashboardLayout } from "@/components/DashboardLayout";
import { CrmSubNav } from "@/components/crm/CrmSubNav";
import {
  listDistricts,
  createDistrict,
  updateDistrict,
  deleteDistrict,
  listInternalUsers,
  type DistrictItem,
  type InternalUserItem,
} from "@/lib/crm-api";
import {
  MapPin,
  Plus,
  Loader2,
  Trash2,
  Edit2,
  Shield,
  Search,
  Check,
  X,
  AlertCircle,
  Users,
  CheckCircle2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export default function DistrictsPage() {
  const { accessToken, user: loggedInUser } = useAuthStore();
  const [districts, setDistricts] = useState<DistrictItem[]>([]);
  const [staffList, setStaffList] = useState<InternalUserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Modal / Drawer state
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [selectedDistrict, setSelectedDistrict] = useState<DistrictItem | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [headUserId, setHeadUserId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const canManage =
    loggedInUser?.actorType === "SUPER_ADMIN" || loggedInUser?.actorType === "SALES_MANAGER";

  const loadData = async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const [dList, sList] = await Promise.all([
        listDistricts(accessToken),
        canManage ? listInternalUsers(accessToken) : Promise.resolve([]),
      ]);
      setDistricts(dList);
      setStaffList(sList);
    } catch (err) {
      setError((err as Error).message ?? "Failed to load districts data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [accessToken]); // eslint-disable-line

  const handleOpenAdd = () => {
    setName("");
    setHeadUserId("");
    setModalMode("add");
    setSelectedDistrict(null);
    setShowModal(true);
  };

  const handleOpenEdit = (dist: DistrictItem) => {
    setName(dist.name);
    setHeadUserId(dist.headUserId || "");
    setModalMode("edit");
    setSelectedDistrict(dist);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (!accessToken) return;

    setSubmitting(true);
    setError(null);
    try {
      if (modalMode === "add") {
        await createDistrict({ name: name.trim(), headUserId: headUserId || undefined }, accessToken);
        setSuccess("District registered successfully!");
      } else if (modalMode === "edit" && selectedDistrict) {
        await updateDistrict(
          selectedDistrict.id,
          { name: name.trim(), headUserId: headUserId || null },
          accessToken
        );
        setSuccess("District updated successfully!");
      }
      setShowModal(false);
      loadData();
      setTimeout(() => setSuccess(null), 3500);
    } catch (err) {
      setError((err as Error).message ?? "An error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, distName: string) => {
    if (!accessToken) return;
    if (!window.confirm(`Are you sure you want to delete the district "${distName}"?`)) return;

    setDeletingId(id);
    setError(null);
    try {
      await deleteDistrict(id, accessToken);
      setSuccess("District deleted successfully!");
      loadData();
      setTimeout(() => setSuccess(null), 3500);
    } catch (err) {
      setError((err as Error).message ?? "Failed to delete district.");
    } finally {
      setDeletingId(null);
    }
  };

  const filteredDistricts = districts.filter(
    (d) =>
      d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (d.headUser?.name || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-24">
        {/* Persistent CRM Sub-Navigation */}
        <CrmSubNav />

        {/* Header section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight flex items-center gap-2.5">
              <MapPin className="w-7 h-7 text-emerald-600 shrink-0" />
              Districts &amp; Territories
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              Geographical sales territories and assigned District Head managers
            </p>
          </div>
          {canManage && (
            <button
              type="button"
              onClick={handleOpenAdd}
              className="min-h-[44px] flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl shadow-sm transition-all text-xs sm:text-sm active:scale-[0.98] shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Add District</span>
            </button>
          )}
        </div>

        {/* Feedback / alerts */}
        {error && (
          <div className="flex items-center justify-between gap-2 p-4 bg-rose-50 border border-rose-200 rounded-2xl text-sm text-rose-900 shadow-xs">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <p className="font-semibold">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-xs font-bold text-rose-800 underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {success && (
          <div className="flex items-center justify-between gap-2 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-sm text-emerald-900 shadow-xs">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <p className="font-semibold">{success}</p>
            </div>
            <button
              onClick={() => setSuccess(null)}
              className="text-xs font-bold text-emerald-800 underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Search filter */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search district name or district head..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200/90 rounded-2xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all shadow-2xs"
          />
        </div>

        {/* Districts Content */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
          </div>
        ) : filteredDistricts.length === 0 ? (
          <div className="bg-white rounded-3xl border border-gray-200/80 p-12 text-center shadow-xs">
            <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-gray-800">No districts match your search</h3>
            <p className="text-xs text-gray-500 mt-1">Try clearing your search keyword or add a new territory.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDistricts.map((dist) => (
              <div
                key={dist.id}
                className="bg-white rounded-3xl border border-gray-200/90 p-5 sm:p-6 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between gap-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-black text-gray-900 text-lg tracking-tight truncate">
                        {dist.name}
                      </h3>
                      <p className="text-xs text-gray-500 mt-0.5">Geographical Sales Territory</p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {canManage && (
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(dist)}
                          className="min-h-[40px] min-w-[40px] p-2 text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition-all flex items-center justify-center active:scale-95"
                          title="Edit District"
                          aria-label={`Edit ${dist.name}`}
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
                      {loggedInUser?.actorType === "SUPER_ADMIN" && (
                        <button
                          type="button"
                          onClick={() => handleDelete(dist.id, dist.name)}
                          disabled={deletingId === dist.id}
                          className="min-h-[40px] min-w-[40px] p-2 text-gray-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-all flex items-center justify-center active:scale-95 disabled:opacity-50"
                          title="Delete District"
                          aria-label={`Delete ${dist.name}`}
                        >
                          {deletingId === dist.id ? (
                            <Loader2 className="w-4 h-4 animate-spin text-rose-600" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-gray-100 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 font-bold text-sm">
                      {dist.headUser?.name ? dist.headUser.name.charAt(0).toUpperCase() : <Shield className="w-4 h-4 text-gray-400" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-gray-500 font-semibold">Assigned District Head</p>
                      <p className="text-sm font-bold text-gray-900 truncate">
                        {dist.headUser?.name ?? <span className="text-gray-400 font-normal italic">Unassigned</span>}
                      </p>
                      {dist.headUser?.username && (
                        <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full inline-block mt-0.5">
                          @{dist.headUser.username}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                  <span>Registered:</span>
                  <span className="font-medium text-gray-700">
                    {dist.createdAt ? new Date(dist.createdAt).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" }) : "Active"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal / Bottom Sheet Form */}
        <AnimatePresence>
          {showModal && (
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowModal(false)}
                className="absolute inset-0 bg-black/50 backdrop-blur-xs"
              />

              <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 40 }}
                className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl relative overflow-hidden z-10 flex flex-col max-h-[90vh]"
              >
                <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center shrink-0">
                  <h3 className="font-black text-gray-900 text-lg">
                    {modalMode === "add" ? "Add New Territory" : "Edit Territory"}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="p-2 text-gray-400 hover:bg-gray-100 rounded-xl transition-all"
                    aria-label="Close modal"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block">
                      District Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Kozhikode, Malappuram, Wayanad"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all font-semibold text-gray-900 min-h-[44px]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block">
                      Assign Sales District Head (Optional)
                    </label>
                    <select
                      value={headUserId}
                      onChange={(e) => setHeadUserId(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all font-semibold text-gray-900 min-h-[44px]"
                    >
                      <option value="">-- No District Head (Unassigned) --</option>
                      {staffList.map((staff) => (
                        <option key={staff.id} value={staff.id}>
                          {staff.name} — {staff.role.replace(/_/g, " ")}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      Only internal CRM team members (Sales, Implementation, Support) can be assigned.
                    </p>
                  </div>

                  <div className="pt-4 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="min-h-[44px] flex-1 py-3 text-xs sm:text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting || !name.trim()}
                      className="min-h-[44px] flex-1 flex items-center justify-center gap-2 py-3 text-xs sm:text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-all disabled:opacity-60 shadow-xs active:scale-[0.98]"
                    >
                      {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                      <span>{modalMode === "add" ? "Create District" : "Save Changes"}</span>
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
}
