import { useState, useEffect } from "react";
import { useAuthStore } from "@/store/auth";
import { DashboardLayout } from "@/components/DashboardLayout";
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

  const canManage = loggedInUser?.actorType === "SUPER_ADMIN" || loggedInUser?.actorType === "SALES_MANAGER";

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
        setSuccess("District created successfully!");
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
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError((err as Error).message ?? "An error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!accessToken) return;
    if (!window.confirm("Are you sure you want to delete this district?")) return;

    setDeletingId(id);
    setError(null);
    try {
      await deleteDistrict(id, accessToken);
      setSuccess("District deleted successfully!");
      loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError((err as Error).message ?? "Failed to delete district.");
    } finally {
      setDeletingId(null);
    }
  };

  const filteredDistricts = districts.filter((d) =>
    d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (d.headUser?.name || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-20">
        {/* Header section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
              <MapPin className="w-6 h-6 text-emerald-600 shrink-0" />
              Districts Catalog
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Manage geographical districts and assign CRM staff as district heads. Only sales &amp; CRM team members can be assigned.
            </p>
          </div>
          {canManage && (
            <button
              onClick={handleOpenAdd}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-2xl shadow-sm transition-all text-sm shrink-0"
            >
              <Plus className="w-4 h-4" /> Add District
            </button>
          )}
        </div>

        {/* Feedback / alerts */}
        {error && (
          <div className="flex items-center gap-2 p-4 bg-rose-50 border border-rose-100 rounded-2xl text-sm text-rose-800">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
            <p className="font-medium">{error}</p>
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl text-sm text-emerald-800">
            <Check className="w-5 h-5 shrink-0 text-emerald-600" />
            <p className="font-medium">{success}</p>
          </div>
        )}

        {/* Filter panel */}
        <div className="relative">
          <Search className="absolute left-4 top-3.5 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search districts or district heads..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white border border-gray-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm"
          />
        </div>

        {/* Districts Content */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
          </div>
        ) : filteredDistricts.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-sm">
            <MapPin className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No districts found.</p>
            {searchTerm && <p className="text-xs text-gray-400 mt-1">Try clearing your search filters.</p>}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDistricts.map((dist) => (
              <motion.div
                key={dist.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-gray-900 text-lg tracking-tight">{dist.name}</h3>
                    <div className="flex items-center gap-1">
                      {canManage && (
                        <>
                          <button
                            onClick={() => handleOpenEdit(dist)}
                            className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                            title="Edit District"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {loggedInUser?.actorType === "SUPER_ADMIN" && (
                            <button
                              onClick={() => handleDelete(dist.id)}
                              disabled={deletingId === dist.id}
                              className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                              title="Delete District"
                            >
                              {deletingId === dist.id ? (
                                <Loader2 className="w-4 h-4 animate-spin text-rose-600" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 space-y-2 border-t border-gray-50 pt-3">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs text-gray-400 font-medium">District Head</p>
                        <p className="text-sm font-semibold text-gray-800 truncate">
                          {dist.headUser?.name ?? "Unassigned"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {dist.headUser && (
                  <div className="mt-4 pt-3 border-t border-gray-50 flex items-center justify-between text-xs text-gray-400 font-mono">
                    <span>Username: {dist.headUser.username}</span>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}

        {/* Modal Drawer */}
        <AnimatePresence>
          {showModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowModal(false)}
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              />

              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white w-full max-w-md rounded-3xl shadow-2xl relative overflow-hidden z-10 flex flex-col max-h-[90vh]"
              >
                <div className="px-6 py-5 border-b border-gray-50 flex justify-between items-center shrink-0">
                  <h3 className="font-bold text-gray-900 text-lg">
                    {modalMode === "add" ? "Add New District" : "Edit District"}
                  </h3>
                  <button
                    onClick={() => setShowModal(false)}
                    className="p-1 text-gray-400 hover:bg-gray-100 rounded-xl transition-all"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">
                      District Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Kozhikode, Malappuram"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium text-gray-800"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">
                      Assign Sales District Head (Optional)
                    </label>
                    <select
                      value={headUserId}
                      onChange={(e) => setHeadUserId(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium text-gray-800"
                    >
                      <option value="">-- No District Head (Unassigned) --</option>
                      {staffList.map((staff) => (
                        <option key={staff.id} value={staff.id}>
                          {staff.name} — {staff.role.replace(/_/g, " ")}
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-gray-400 mt-1">Only CRM staff (Sales, Implementation, Support) are shown here.</p>
                  </div>

                  <div className="pt-4 flex gap-3">
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="flex-1 py-3 text-sm font-semibold text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-2xl transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting || !name.trim()}
                      className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl transition-all disabled:opacity-60"
                    >
                      {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                      {modalMode === "add" ? "Create District" : "Save Changes"}
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
