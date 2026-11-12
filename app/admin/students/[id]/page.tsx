import { useState, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  useClasses,
  useStudentProfileV2,
  useDeleteStudent,
} from "@/lib/queries";
import { queryKeys } from "@/lib/queryKeys";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth";
import { motion, AnimatePresence } from "framer-motion";
import { User, Loader2, Pencil, Trash2 } from "lucide-react";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { AdminStudentProfileContent } from "@/components/admin/AdminStudentProfileContent";
import StudentEditDrawer from "@/components/admin/StudentEditDrawer";
import { toast } from "sonner";

export default function StudentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const slugMatch = pathname.match(/^\/m\/([^/]+)\//);
  const slugPrefix = slugMatch ? `/m/${slugMatch[1]}` : "";
  const { user, accessToken, activeClientId } = useAuthStore();
  const canWrite = user?.actorType !== "TEAM_LEADER";

  const [showEdit, setShowEdit] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const qc = useQueryClient();

  const ctx = useMemo(
    () => ({ clientId: activeClientId!, token: accessToken! }),
    [activeClientId, accessToken],
  );

  const {
    data: student,
    isLoading: loadingStudent,
    error,
  } = useStudentProfileV2(ctx, id!, { enabled: !!activeClientId && !!accessToken && !!id });

  const deleteMutation = useDeleteStudent(ctx);

  const { data: classesData } = useClasses({
    clientId: activeClientId ?? "",
    token: accessToken ?? "",
  });
  const classes = classesData ?? [];

  if (loadingStudent) {
    return (
      <DashboardLayout>
        <PageHeader title="Student Profile" back />
        <PageSkeleton />
      </DashboardLayout>
    );
  }

  if (!student || error) {
    return (
      <DashboardLayout>
        <PageHeader title="Student Not Found" back />
        <div className="text-center py-20 text-gray-400">
          <User className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-semibold text-lg">{error ? (error as Error).message : "Student not found"}</p>
          <button onClick={() => navigate(-1)} className="mt-4 text-primary-600 font-semibold text-sm underline">
            Go back
          </button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <PageHeader
        title="Student Profile"
        back
        backHref={`${slugPrefix}/admin/students`}
        action={
          canWrite ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowEdit(true)}
                className="flex items-center gap-1.5 bg-white border border-gray-200 text-gray-700 px-3 py-2 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors"
              >
                <Pencil className="w-4 h-4" /> Edit
              </button>
              <button
                onClick={() => setConfirmDelete(true)}
                className="flex items-center gap-1.5 bg-red-50 text-red-600 px-3 py-2 rounded-xl text-sm font-semibold hover:bg-red-100 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ) : undefined
        }
      />

      <AdminStudentProfileContent student={student} />

      <StudentEditDrawer
        open={showEdit}
        onClose={() => setShowEdit(false)}
        mode="edit"
        student={student}
        classes={classes}
        onSaved={(updated) => {
          qc.setQueryData(queryKeys.students.profile(ctx.clientId, id!), updated);
          setShowEdit(false);
        }}
        onDelete={() => {
          setShowEdit(false);
          setConfirmDelete(true);
        }}
      />

      <AnimatePresence>
        {confirmDelete && (
          <>
            <motion.div key="del-backdrop"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => !deleteMutation.isPending && setConfirmDelete(false)}
              className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
            />
            <motion.div key="del-dialog"
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 bg-white rounded-3xl p-6 max-w-sm mx-auto shadow-2xl"
            >
              <div className="text-center space-y-3">
                <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                  <Trash2 className="w-7 h-7 text-red-600" />
                </div>
                <h3 className="font-bold text-gray-900 text-lg">Delete Student?</h3>
                <p className="text-sm text-gray-500">
                  <strong>{student.name}</strong> will be permanently deleted. This cannot be undone.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-6">
                <button
                  onClick={() => setConfirmDelete(false)}
                  disabled={deleteMutation.isPending}
                  className="py-3 rounded-2xl border border-gray-200 text-gray-700 font-semibold text-sm hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    deleteMutation.mutate(student.id, {
                      onSuccess: () => {
                        toast.success("Student deleted successfully");
                        navigate(`${slugPrefix}/admin/students`);
                      },
                      onError: (err: any) => {
                        toast.error(err?.message || "Failed to delete student");
                      },
                    });
                  }}
                  disabled={deleteMutation.isPending}
                  className="py-3 rounded-2xl bg-red-600 text-white font-bold text-sm hover:bg-red-700 transition-colors disabled:opacity-60"
                >
                  {deleteMutation.isPending ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" /> Deleting…
                    </span>
                  ) : "Delete"}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}
