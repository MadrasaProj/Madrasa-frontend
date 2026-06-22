import { Navigate, Route, Routes } from "react-router-dom";
import PwaRegister from "../components/PwaRegister";

// ── TWA Landing ───────────────────────────────────────────────────────────────
import TwaLandingPage from "../app/twa/page";

// ── Auth / Login ──────────────────────────────────────────────────────────────
import AdminLoginPage from "../app/m/[slug]/admin/login/page";
import CommitteeLoginPage from "../app/m/[slug]/committee/login/page";
import ParentLoginPage from "../app/m/[slug]/parent/login/page";
import TeacherLoginPage from "../app/m/[slug]/teacher/login/page";
import SuperAdminLoginPage from "../app/super-admin/login/page";

// ── Admin ─────────────────────────────────────────────────────────────────────
import AdminAbsentPage from "../app/admin/absent/page";
import AdminAttendancePage from "../app/admin/attendance/page";
import AdminLeaveRequestsPage from "../app/admin/leave-requests/page";
import AdminClassesPage from "../app/admin/classes/page";
import AdminConfigPage from "../app/admin/config/page";
import AdminClassReportPage from "../app/admin/exams/class-report/page";
import AdminExamConfigPage from "../app/admin/exams/config/page";
import AdminExamsPage from "../app/admin/exams/page";
import AdminFeesPage from "../app/admin/fees/page";
import AdminFeesTypesPage from "../app/admin/fees/types/page";
import AdminFeesPaidPage from "../app/admin/fees/paid/page";
import AdminFeesUnpaidPage from "../app/admin/fees/unpaid/page";
import AdminIbadahConfigPage from "../app/admin/ibadah-config/page";
import AdminIbadahPage from "../app/admin/ibadah/page";
 import AdminLogsPage from "../app/admin/logs/page";
import AdminMadrasasPage from "../app/admin/madrasas/page";
import AdminNotificationsPage from "../app/admin/notifications/page";
import AdminOtherPaymentsPage from "../app/admin/other-payments/page";
import AdminDashboard from "../app/admin/page";
import AdminPlatformReportsPage from "../app/admin/platform-reports/page";
import AdminPostersPage from "../app/admin/posters/page";
import AdminPresentPage from "../app/admin/present/page";
import { default as AdminProfilePage, default as CommitteeProfilePage, default as ParentProfilePage, default as TeacherProfilePage } from "../app/admin/profile/page";
import AdminReportsPage from "../app/admin/reports/page";
import AdminStudentDetailPage from "../app/admin/students/[id]/page";
import AdminStudentsPage from "../app/admin/students/page";
import AdminSubjectsPage from "../app/admin/subjects/page";
import AdminSuperUsersPage from "../app/admin/super-users/page";
import AdminTeachersPage from "../app/admin/teachers/page";
import AdminTeacherAttendancePage from "../app/admin/teacher-attendance/page";
// ClassReportPage is role-agnostic; teacher route reuses the same component
const TeacherClassReportPage = AdminClassReportPage;

// ── Teacher ───────────────────────────────────────────────────────────────────
import TeacherAbsentPage from "../app/teacher/absent/page";
import TeacherAttendancePage from "../app/teacher/attendance/page";
import TeacherLeaveRequestsPage from "../app/teacher/leave-requests/page";
import TeacherCheckinPage from "../app/teacher/checkin/page";
import TeacherDiaryPage from "../app/teacher/diary/page";
import TeacherClassTestsPage from "../app/teacher/exams/class-test/page";
import TeacherExamsPage from "../app/teacher/exams/page";
import TeacherHomeworkListPage from "../app/teacher/homework-list/page";
import TeacherHomeworkPage from "../app/teacher/homework/page";
import TeacherIbadahPage from "../app/teacher/ibadah/page";
import TeacherNotificationsPage from "../app/teacher/notifications/page";
import TeacherDashboard from "../app/teacher/page";
import TeacherFeesPage from "../app/teacher/fees/page";
import TeacherPerformancePage from "../app/teacher/performance/page";
import TeacherBestPerformancePage from "../app/teacher/best-performance/page";
import TeacherPresentPage from "../app/teacher/present/page";
import TeacherPostersPage from "../app/teacher/posters/page";
import TeacherPosterViewPage from "../app/teacher/posters/[id]/page";

// ── Parent ────────────────────────────────────────────────────────────────────
import ParentAttendancePage from "../app/parent/attendance/page";
import ParentLeaveRequestsPage from "../app/parent/leave-requests/page";
import ParentDiaryPage from "../app/parent/diary/page";
import ParentFeesPage from "../app/parent/fees/page";
import ParentHomeworkPage from "../app/parent/homework/page";
import ParentIbadahPage from "../app/parent/ibadah/page";
import ParentNotificationsPage from "../app/parent/notifications/page";
import ParentDashboard from "../app/parent/page";
import ParentResultsPage from "../app/parent/results/page";
import ParentBestPerformancePage from "../app/parent/best-performance/page";
import ParentPostersPage from "../app/parent/posters/page";
import ParentPosterViewPage from "../app/parent/posters/[id]/page";

// ── Committee ─────────────────────────────────────────────────────────────────
import IDCardsPage from "../app/admin/id-cards/IdCard";
import AdminBestPerformancePage from "../app/committee/best-performance/page";
import CommitteeAnnouncementsPage from "../app/committee/announcements/page";
import CommitteeAttendancePage from "../app/committee/attendance/page";
import CommitteeFinancePage from "../app/committee/finance/page";
import CommitteeDashboard from "../app/committee/page";
import CommitteeReportsPage from "../app/committee/reports/page";
import CommitteeStudentsPage from "../app/committee/students/page";
import CommitteeTeacherAttendancePage from "../app/committee/teacher-attendance/page";
import CommitteeBestPerformancePage from "../app/committee/best-performance/page";

export default function App() {
  return (
    <>
      <PwaRegister />
      <Routes>
        {/* TWA Landing */}
        <Route path="/" element={<TwaLandingPage />} />
        <Route path="/twa" element={<TwaLandingPage />} />

        {/* Auth */}
        <Route path="/super-admin/login" element={<SuperAdminLoginPage />} />
        <Route path="/m/:slug/login" element={<Navigate to="../admin/login" replace />} />
        <Route path="/m/:slug/admin/login" element={<AdminLoginPage />} />
        <Route path="/m/:slug/teacher/login" element={<TeacherLoginPage />} />
        <Route path="/m/:slug/parent/login" element={<ParentLoginPage />} />
        <Route path="/m/:slug/committee/login" element={<CommitteeLoginPage />} />

        {/* Admin — bare paths kept for super-admin platform view */}
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/students" element={<AdminStudentsPage />} />
        <Route path="/admin/students/:id" element={<AdminStudentDetailPage />} />
        <Route path="/admin/attendance" element={<AdminAttendancePage />} />
        <Route path="/admin/leave-requests" element={<AdminLeaveRequestsPage />} />
        <Route path="/admin/present" element={<AdminPresentPage />} />
        <Route path="/admin/absent" element={<AdminAbsentPage />} />
        <Route path="/admin/fees" element={<AdminFeesPage />} />
        <Route path="/admin/fees/types" element={<AdminFeesTypesPage />} />
        <Route path="/admin/fees/paid" element={<AdminFeesPaidPage />} />
        <Route path="/admin/fees/unpaid" element={<AdminFeesUnpaidPage />} />
        <Route path="/admin/other-payments" element={<AdminOtherPaymentsPage />} />
        <Route path="/admin/classes" element={<AdminClassesPage />} />
        <Route path="/admin/subjects" element={<AdminSubjectsPage />} />
        <Route path="/admin/teachers" element={<AdminTeachersPage />} />
        <Route path="/admin/teacher-attendance" element={<AdminTeacherAttendancePage />} />
        <Route path="/admin/exams" element={<AdminExamsPage />} />
        <Route path="/admin/exams/class-test" element={<TeacherClassTestsPage />} />
        <Route path="/admin/exams/class-report" element={<AdminClassReportPage />} />
        <Route path="/admin/exams/config" element={<AdminExamConfigPage />} />
        <Route path="/admin/notifications" element={<AdminNotificationsPage />} />
        <Route path="/admin/reports" element={<AdminReportsPage />} />
        <Route path="/admin/config" element={<AdminConfigPage />} />
        <Route path="/admin/ibadah" element={<AdminIbadahPage />} />
        <Route path="/admin/ibadah-config" element={<AdminIbadahConfigPage />} />
        <Route path="/admin/id-cards" element={<IDCardsPage />} />
        <Route path="/admin/posters" element={<AdminPostersPage />} />
        <Route path="/admin/logs" element={<AdminLogsPage />} />
        <Route path="/admin/best-performance" element={<AdminBestPerformancePage />} />

        {/* Super Admin platform routes */}
        <Route path="/admin/madrasas" element={<AdminMadrasasPage />} />
        <Route path="/admin/super-users" element={<AdminSuperUsersPage />} />
        <Route path="/admin/platform-reports" element={<AdminPlatformReportsPage />} />
        <Route path="/admin/profile" element={<AdminProfilePage />} />

        {/* Profile for all roles */}
        <Route path="/teacher/profile" element={<TeacherProfilePage />} />
        <Route path="/parent/profile" element={<ParentProfilePage />} />
        <Route path="/committee/profile" element={<CommitteeProfilePage />} />

        {/* Slug-prefixed profile routes */}
        <Route path="/m/:slug/admin/profile" element={<AdminProfilePage />} />
        <Route path="/m/:slug/teacher/profile" element={<TeacherProfilePage />} />
        <Route path="/m/:slug/parent/profile" element={<ParentProfilePage />} />
        <Route path="/m/:slug/committee/profile" element={<CommitteeProfilePage />} />

        {/* Admin — slug-prefixed (CLIENT_ADMIN + super-admin viewing a madrasa) */}
        <Route path="/m/:slug/admin" element={<AdminDashboard />} />
        <Route path="/m/:slug/admin/students" element={<AdminStudentsPage />} />
        <Route path="/m/:slug/admin/students/:id" element={<AdminStudentDetailPage />} />
        <Route path="/m/:slug/admin/attendance" element={<AdminAttendancePage />} />
        <Route path="/m/:slug/admin/leave-requests" element={<AdminLeaveRequestsPage />} />
        <Route path="/m/:slug/admin/present" element={<AdminPresentPage />} />
        <Route path="/m/:slug/admin/absent" element={<AdminAbsentPage />} />
        <Route path="/m/:slug/admin/fees" element={<AdminFeesPage />} />
        <Route path="/m/:slug/admin/fees/types" element={<AdminFeesTypesPage />} />
        <Route path="/m/:slug/admin/fees/paid" element={<AdminFeesPaidPage />} />
        <Route path="/m/:slug/admin/fees/unpaid" element={<AdminFeesUnpaidPage />} />
        <Route path="/m/:slug/admin/other-payments" element={<AdminOtherPaymentsPage />} />
        <Route path="/m/:slug/admin/classes" element={<AdminClassesPage />} />
        <Route path="/m/:slug/admin/subjects" element={<AdminSubjectsPage />} />
        <Route path="/m/:slug/admin/teachers" element={<AdminTeachersPage />} />
        <Route path="/m/:slug/admin/teacher-attendance" element={<AdminTeacherAttendancePage />} />
        <Route path="/m/:slug/admin/exams" element={<AdminExamsPage />} />
        <Route path="/m/:slug/admin/exams/class-test" element={<TeacherClassTestsPage />} />
        <Route path="/m/:slug/admin/exams/class-report" element={<AdminClassReportPage />} />
        <Route path="/m/:slug/admin/exams/config" element={<AdminExamConfigPage />} />
        <Route path="/m/:slug/admin/notifications" element={<AdminNotificationsPage />} />
        <Route path="/m/:slug/admin/reports" element={<AdminReportsPage />} />
        <Route path="/m/:slug/admin/ibadah" element={<AdminIbadahPage />} />
        <Route path="/m/:slug/admin/config" element={<AdminConfigPage />} />
        <Route path="/m/:slug/admin/id-cards" element={<IDCardsPage />} />
       
        <Route path="/m/:slug/admin/logs" element={<AdminLogsPage />} />
        <Route path="/m/:slug/admin/best-performance" element={<AdminBestPerformancePage />} />

        {/* Teacher */}
        <Route path="/teacher" element={<TeacherDashboard />} />
        <Route path="/teacher/checkin" element={<TeacherCheckinPage />} />
        <Route path="/teacher/attendance" element={<TeacherAttendancePage />} />
        <Route path="/teacher/leave-requests" element={<TeacherLeaveRequestsPage />} />
        <Route path="/teacher/present" element={<TeacherPresentPage />} />
        <Route path="/teacher/absent" element={<TeacherAbsentPage />} />
        <Route path="/teacher/homework" element={<TeacherHomeworkPage />} />
        <Route path="/teacher/homework-list" element={<TeacherHomeworkListPage />} />
        <Route path="/teacher/diary" element={<TeacherDiaryPage />} />
        <Route path="/teacher/ibadah" element={<TeacherIbadahPage />} />
        <Route path="/teacher/fees" element={<TeacherFeesPage />} />
        <Route path="/teacher/exams" element={<TeacherExamsPage />} />
        <Route path="/teacher/exams/class-test" element={<TeacherClassTestsPage />} />
        <Route path="/teacher/exams/class-report" element={<TeacherClassReportPage />} />
        <Route path="/teacher/notifications" element={<TeacherNotificationsPage />} />
        <Route path="/teacher/performance" element={<TeacherPerformancePage />} />
        <Route path="/teacher/best-performance" element={<TeacherBestPerformancePage />} />
        <Route path="/teacher/posters" element={<TeacherPostersPage />} />
        <Route path="/teacher/posters/:id" element={<TeacherPosterViewPage />} />

        {/* Teacher — slug-prefixed */}
        <Route path="/m/:slug/teacher" element={<TeacherDashboard />} />
        <Route path="/m/:slug/teacher/checkin" element={<TeacherCheckinPage />} />
        <Route path="/m/:slug/teacher/attendance" element={<TeacherAttendancePage />} />
        <Route path="/m/:slug/teacher/leave-requests" element={<TeacherLeaveRequestsPage />} />
        <Route path="/m/:slug/teacher/present" element={<TeacherPresentPage />} />
        <Route path="/m/:slug/teacher/absent" element={<TeacherAbsentPage />} />
        <Route path="/m/:slug/teacher/homework" element={<TeacherHomeworkPage />} />
        <Route path="/m/:slug/teacher/homework-list" element={<TeacherHomeworkListPage />} />
        <Route path="/m/:slug/teacher/diary" element={<TeacherDiaryPage />} />
        <Route path="/m/:slug/teacher/ibadah" element={<TeacherIbadahPage />} />
        <Route path="/m/:slug/teacher/fees" element={<TeacherFeesPage />} />
        <Route path="/m/:slug/teacher/exams" element={<TeacherExamsPage />} />
        <Route path="/m/:slug/teacher/exams/class-test" element={<TeacherClassTestsPage />} />
        <Route path="/m/:slug/teacher/exams/class-report" element={<TeacherClassReportPage />} />
        <Route path="/m/:slug/teacher/notifications" element={<TeacherNotificationsPage />} />
        <Route path="/m/:slug/teacher/performance" element={<TeacherPerformancePage />} />
        <Route path="/m/:slug/teacher/best-performance" element={<TeacherBestPerformancePage />} />
        <Route path="/m/:slug/teacher/posters" element={<TeacherPostersPage />} />
        <Route path="/m/:slug/teacher/posters/:id" element={<TeacherPosterViewPage />} />

        {/* Parent */}
        <Route path="/parent" element={<ParentDashboard />} />
        <Route path="/parent/attendance" element={<ParentAttendancePage />} />
        <Route path="/parent/fees" element={<ParentFeesPage />} />
        <Route path="/parent/homework" element={<ParentHomeworkPage />} />
        <Route path="/parent/ibadah" element={<ParentIbadahPage />} />
        <Route path="/parent/results" element={<ParentResultsPage />} />
        <Route path="/parent/notifications" element={<ParentNotificationsPage />} />
        <Route path="/parent/best-performance" element={<ParentBestPerformancePage />} />
        <Route path="/parent/diary" element={<ParentDiaryPage />} />
        <Route path="/parent/posters" element={<ParentPostersPage />} />
        <Route path="/parent/posters/:id" element={<ParentPosterViewPage />} />
        <Route path="/parent/best-performance" element={<ParentBestPerformancePage />} />

        {/* Parent — slug-prefixed */}
        <Route path="/m/:slug/parent" element={<ParentDashboard />} />
        <Route path="/m/:slug/parent/attendance" element={<ParentAttendancePage />} />
        <Route path="/m/:slug/parent/leave-requests" element={<ParentLeaveRequestsPage />} />
        <Route path="/m/:slug/parent/fees" element={<ParentFeesPage />} />
        <Route path="/m/:slug/parent/homework" element={<ParentHomeworkPage />} />
        <Route path="/m/:slug/parent/ibadah" element={<ParentIbadahPage />} />
        <Route path="/m/:slug/parent/results" element={<ParentResultsPage />} />
        <Route path="/m/:slug/parent/notifications" element={<ParentNotificationsPage />} />
        <Route path="/m/:slug/parent/best-performance" element={<ParentBestPerformancePage />} />
        <Route path="/m/:slug/parent/diary" element={<ParentDiaryPage />} />
        <Route path="/m/:slug/parent/posters" element={<ParentPostersPage />} />
        <Route path="/m/:slug/parent/posters/:id" element={<ParentPosterViewPage />} />
        <Route path="/m/:slug/parent/best-performance" element={<ParentBestPerformancePage />} />

        {/* Committee */}
        <Route path="/committee" element={<CommitteeDashboard />} />
        <Route path="/committee/attendance" element={<CommitteeAttendancePage />} />
        <Route path="/committee/finance" element={<CommitteeFinancePage />} />
        <Route path="/committee/students" element={<CommitteeStudentsPage />} />
        <Route path="/committee/announcements" element={<CommitteeAnnouncementsPage />} />
        <Route path="/committee/reports" element={<CommitteeReportsPage />} />
        <Route path="/committee/teacher-attendance" element={<CommitteeTeacherAttendancePage />} />
        <Route path="/committee/best-performance" element={<CommitteeBestPerformancePage />} />

        {/* Committee — slug-prefixed */}
        <Route path="/m/:slug/committee" element={<CommitteeDashboard />} />
        <Route path="/m/:slug/committee/attendance" element={<CommitteeAttendancePage />} />
        <Route path="/m/:slug/committee/finance" element={<CommitteeFinancePage />} />
        <Route path="/m/:slug/committee/students" element={<CommitteeStudentsPage />} />
        <Route path="/m/:slug/committee/announcements" element={<CommitteeAnnouncementsPage />} />
        <Route path="/m/:slug/committee/reports" element={<CommitteeReportsPage />} />
        <Route path="/m/:slug/committee/teacher-attendance" element={<CommitteeTeacherAttendancePage />} />
        <Route path="/m/:slug/committee/best-performance" element={<CommitteeBestPerformancePage />} />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
