import { Routes, Route, Navigate } from "react-router-dom";
import PwaRegister from "../components/PwaRegister";

// ── Auth / Login ──────────────────────────────────────────────────────────────
import SuperAdminLoginPage from "../app/super-admin/login/page";
import AdminLoginPage from "../app/m/[slug]/admin/login/page";
import TeacherLoginPage from "../app/m/[slug]/teacher/login/page";
import ParentLoginPage from "../app/m/[slug]/parent/login/page";
import CommitteeLoginPage from "../app/m/[slug]/committee/login/page";

// ── Admin ─────────────────────────────────────────────────────────────────────
import AdminDashboard from "../app/admin/page";
import AdminMadrasasPage from "../app/admin/madrasas/page";
import AdminSuperUsersPage from "../app/admin/super-users/page";
import AdminPlatformReportsPage from "../app/admin/platform-reports/page";
import AdminProfilePage from "../app/admin/profile/page";
import TeacherProfilePage from "../app/admin/profile/page";
import ParentProfilePage from "../app/admin/profile/page";
import CommitteeProfilePage from "../app/admin/profile/page";
import AdminStudentsPage from "../app/admin/students/page";
import AdminStudentDetailPage from "../app/admin/students/[id]/page";
import AdminAttendancePage from "../app/admin/attendance/page";
import AdminPresentPage from "../app/admin/present/page";
import AdminAbsentPage from "../app/admin/absent/page";
import AdminFeesPage from "../app/admin/fees/page";
import AdminFeesPaidPage from "../app/admin/fees/paid/page";
import AdminFeesUnpaidPage from "../app/admin/fees/unpaid/page";
import AdminOtherPaymentsPage from "../app/admin/other-payments/page";
import AdminTeachersPage from "../app/admin/teachers/page";
import AdminClassesPage from "../app/admin/classes/page";
import AdminSubjectsPage from "../app/admin/subjects/page";
import AdminExamsPage from "../app/admin/exams/page";
import AdminClassReportPage from "../app/admin/exams/class-report/page";
import AdminExamConfigPage from "../app/admin/exams/config/page";
// ClassReportPage is role-agnostic; teacher route reuses the same component
const TeacherClassReportPage = AdminClassReportPage;
import AdminNotificationsPage from "../app/admin/notifications/page";
import AdminReportsPage from "../app/admin/reports/page";
import AdminConfigPage from "../app/admin/config/page";
import AdminIbadahConfigPage from "../app/admin/ibadah-config/page";
import AdminIbadahPage from "../app/admin/ibadah/page";
import AdminLogsPage from "../app/admin/logs/page";
import AdminIdCardsPage from "../app/admin/id-cards/page";

// ── Teacher ───────────────────────────────────────────────────────────────────
import TeacherDashboard from "../app/teacher/page";
import TeacherAttendancePage from "../app/teacher/attendance/page";
import TeacherPresentPage from "../app/teacher/present/page";
import TeacherAbsentPage from "../app/teacher/absent/page";
import TeacherHomeworkPage from "../app/teacher/homework/page";
import TeacherHomeworkListPage from "../app/teacher/homework-list/page";
import TeacherDiaryPage from "../app/teacher/diary/page";
import TeacherIbadahPage from "../app/teacher/ibadah/page";
import TeacherExamsPage from "../app/teacher/exams/page";
import TeacherNotificationsPage from "../app/teacher/notifications/page";
import TeacherPerformancePage from "../app/teacher/performance/page";

// ── Parent ────────────────────────────────────────────────────────────────────
import ParentDashboard from "../app/parent/page";
import ParentAttendancePage from "../app/parent/attendance/page";
import ParentFeesPage from "../app/parent/fees/page";
import ParentHomeworkPage from "../app/parent/homework/page";
import ParentIbadahPage from "../app/parent/ibadah/page";
import ParentResultsPage from "../app/parent/results/page";
import ParentNotificationsPage from "../app/parent/notifications/page";
import ParentDiaryPage from "../app/parent/diary/page";

// ── Committee ─────────────────────────────────────────────────────────────────
import CommitteeDashboard from "../app/committee/page";
import CommitteeAttendancePage from "../app/committee/attendance/page";
import CommitteeFinancePage from "../app/committee/finance/page";
import CommitteeStudentsPage from "../app/committee/students/page";
import CommitteeAnnouncementsPage from "../app/committee/announcements/page";
import CommitteeReportsPage from "../app/committee/reports/page";

export default function App() {
  return (
    <>
      <PwaRegister />
      <Routes>
        {/* Root redirect */}
        <Route path="/" element={<Navigate to="/super-admin/login" replace />} />

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
        <Route path="/admin/present" element={<AdminPresentPage />} />
        <Route path="/admin/absent" element={<AdminAbsentPage />} />
        <Route path="/admin/fees" element={<AdminFeesPage />} />
        <Route path="/admin/fees/paid" element={<AdminFeesPaidPage />} />
        <Route path="/admin/fees/unpaid" element={<AdminFeesUnpaidPage />} />
        <Route path="/admin/other-payments" element={<AdminOtherPaymentsPage />} />
        <Route path="/admin/classes" element={<AdminClassesPage />} />
        <Route path="/admin/subjects" element={<AdminSubjectsPage />} />
        <Route path="/admin/teachers" element={<AdminTeachersPage />} />
        <Route path="/admin/exams" element={<AdminExamsPage />} />
        <Route path="/admin/exams/class-report" element={<AdminClassReportPage />} />
        <Route path="/admin/exams/config" element={<AdminExamConfigPage />} />
        <Route path="/admin/notifications" element={<AdminNotificationsPage />} />
        <Route path="/admin/reports" element={<AdminReportsPage />} />
        <Route path="/admin/config" element={<AdminConfigPage />} />
        <Route path="/admin/ibadah" element={<AdminIbadahPage />} />
        <Route path="/admin/ibadah-config" element={<AdminIbadahConfigPage />} />
        <Route path="/admin/id-cards" element={<AdminIdCardsPage />} />
        <Route path="/admin/logs" element={<AdminLogsPage />} />

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
        <Route path="/m/:slug/admin/present" element={<AdminPresentPage />} />
        <Route path="/m/:slug/admin/absent" element={<AdminAbsentPage />} />
        <Route path="/m/:slug/admin/fees" element={<AdminFeesPage />} />
        <Route path="/m/:slug/admin/fees/paid" element={<AdminFeesPaidPage />} />
        <Route path="/m/:slug/admin/fees/unpaid" element={<AdminFeesUnpaidPage />} />
        <Route path="/m/:slug/admin/other-payments" element={<AdminOtherPaymentsPage />} />
        <Route path="/m/:slug/admin/classes" element={<AdminClassesPage />} />
        <Route path="/m/:slug/admin/subjects" element={<AdminSubjectsPage />} />
        <Route path="/m/:slug/admin/teachers" element={<AdminTeachersPage />} />
        <Route path="/m/:slug/admin/exams" element={<AdminExamsPage />} />
        <Route path="/m/:slug/admin/exams/class-report" element={<AdminClassReportPage />} />
        <Route path="/m/:slug/admin/exams/config" element={<AdminExamConfigPage />} />
        <Route path="/m/:slug/admin/notifications" element={<AdminNotificationsPage />} />
        <Route path="/m/:slug/admin/reports" element={<AdminReportsPage />} />
        <Route path="/m/:slug/admin/ibadah" element={<AdminIbadahPage />} />
        <Route path="/m/:slug/admin/config" element={<AdminConfigPage />} />
        <Route path="/m/:slug/admin/id-cards" element={<AdminIdCardsPage />} />
        <Route path="/m/:slug/admin/logs" element={<AdminLogsPage />} />

        {/* Teacher */}
        <Route path="/teacher" element={<TeacherDashboard />} />
        <Route path="/teacher/attendance" element={<TeacherAttendancePage />} />
        <Route path="/teacher/present" element={<TeacherPresentPage />} />
        <Route path="/teacher/absent" element={<TeacherAbsentPage />} />
        <Route path="/teacher/homework" element={<TeacherHomeworkPage />} />
        <Route path="/teacher/homework-list" element={<TeacherHomeworkListPage />} />
        <Route path="/teacher/diary" element={<TeacherDiaryPage />} />
        <Route path="/teacher/ibadah" element={<TeacherIbadahPage />} />
        <Route path="/teacher/exams" element={<TeacherExamsPage />} />
        <Route path="/teacher/exams/class-report" element={<TeacherClassReportPage />} />
        <Route path="/teacher/notifications" element={<TeacherNotificationsPage />} />
        <Route path="/teacher/performance" element={<TeacherPerformancePage />} />

        {/* Teacher — slug-prefixed */}
        <Route path="/m/:slug/teacher" element={<TeacherDashboard />} />
        <Route path="/m/:slug/teacher/attendance" element={<TeacherAttendancePage />} />
        <Route path="/m/:slug/teacher/present" element={<TeacherPresentPage />} />
        <Route path="/m/:slug/teacher/absent" element={<TeacherAbsentPage />} />
        <Route path="/m/:slug/teacher/homework" element={<TeacherHomeworkPage />} />
        <Route path="/m/:slug/teacher/homework-list" element={<TeacherHomeworkListPage />} />
        <Route path="/m/:slug/teacher/diary" element={<TeacherDiaryPage />} />
        <Route path="/m/:slug/teacher/ibadah" element={<TeacherIbadahPage />} />
        <Route path="/m/:slug/teacher/exams" element={<TeacherExamsPage />} />
        <Route path="/m/:slug/teacher/exams/class-report" element={<TeacherClassReportPage />} />
        <Route path="/m/:slug/teacher/notifications" element={<TeacherNotificationsPage />} />
        <Route path="/m/:slug/teacher/performance" element={<TeacherPerformancePage />} />

        {/* Parent */}
        <Route path="/parent" element={<ParentDashboard />} />
        <Route path="/parent/attendance" element={<ParentAttendancePage />} />
        <Route path="/parent/fees" element={<ParentFeesPage />} />
        <Route path="/parent/homework" element={<ParentHomeworkPage />} />
        <Route path="/parent/ibadah" element={<ParentIbadahPage />} />
        <Route path="/parent/results" element={<ParentResultsPage />} />
        <Route path="/parent/notifications" element={<ParentNotificationsPage />} />
        <Route path="/parent/diary" element={<ParentDiaryPage />} />

        {/* Parent — slug-prefixed */}
        <Route path="/m/:slug/parent" element={<ParentDashboard />} />
        <Route path="/m/:slug/parent/attendance" element={<ParentAttendancePage />} />
        <Route path="/m/:slug/parent/fees" element={<ParentFeesPage />} />
        <Route path="/m/:slug/parent/homework" element={<ParentHomeworkPage />} />
        <Route path="/m/:slug/parent/ibadah" element={<ParentIbadahPage />} />
        <Route path="/m/:slug/parent/results" element={<ParentResultsPage />} />
        <Route path="/m/:slug/parent/notifications" element={<ParentNotificationsPage />} />
        <Route path="/m/:slug/parent/diary" element={<ParentDiaryPage />} />

        {/* Committee */}
        <Route path="/committee" element={<CommitteeDashboard />} />
        <Route path="/committee/attendance" element={<CommitteeAttendancePage />} />
        <Route path="/committee/finance" element={<CommitteeFinancePage />} />
        <Route path="/committee/students" element={<CommitteeStudentsPage />} />
        <Route path="/committee/announcements" element={<CommitteeAnnouncementsPage />} />
        <Route path="/committee/reports" element={<CommitteeReportsPage />} />

        {/* Committee — slug-prefixed */}
        <Route path="/m/:slug/committee" element={<CommitteeDashboard />} />
        <Route path="/m/:slug/committee/attendance" element={<CommitteeAttendancePage />} />
        <Route path="/m/:slug/committee/finance" element={<CommitteeFinancePage />} />
        <Route path="/m/:slug/committee/students" element={<CommitteeStudentsPage />} />
        <Route path="/m/:slug/committee/announcements" element={<CommitteeAnnouncementsPage />} />
        <Route path="/m/:slug/committee/reports" element={<CommitteeReportsPage />} />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/super-admin/login" replace />} />
      </Routes>
    </>
  );
}
