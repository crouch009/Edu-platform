import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/AuthContext';
import { StudentAuthProvider } from './lib/StudentAuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { StudentProtectedRoute } from './components/StudentProtectedRoute';

import { LoginPage } from './pages/LoginPage';
import { SharedReportPage } from './pages/SharedReportPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { StudentLoginPage } from './pages/StudentLoginPage';

import { OwnerDashboard } from './pages/owner/OwnerDashboard';
import { OwnerUsersPage } from './pages/owner/OwnerUsersPage';
import { OwnerStudentsPage } from './pages/owner/OwnerStudentsPage';
import { OwnerAnalyticsPage } from './pages/owner/OwnerAnalyticsPage';
import { OwnerAuditLogPage } from './pages/owner/OwnerAuditLogPage';
import { OwnerSettingsPage } from './pages/owner/OwnerSettingsPage';

import { TeacherDashboard } from './pages/teacher/TeacherDashboard';
import { TeacherStudentPage } from './pages/teacher/TeacherStudentPage';
import { TeacherNewReportPage } from './pages/teacher/TeacherNewReportPage';
import { TeacherReportPage } from './pages/teacher/TeacherReportPage';
import { TeacherSettingsPage } from './pages/teacher/TeacherSettingsPage';
import { TeacherSubjectsPage } from './pages/teacher/TeacherSubjectsPage';
import { TeacherSubjectPage } from './pages/teacher/TeacherSubjectPage';
import { TeacherCurriculaPage } from './pages/teacher/TeacherCurriculaPage';
import { TeacherQuestionsPage } from './pages/teacher/TeacherQuestionsPage';
import { TeacherExamsPage } from './pages/teacher/TeacherExamsPage';

import { ParentDashboard } from './pages/parent/ParentDashboard';
import { ParentReportPage } from './pages/parent/ParentReportPage';
import { ParentSettingsPage } from './pages/parent/ParentSettingsPage';

import { StudentDashboard } from './pages/student/StudentDashboard';
import { StudentTakeExamPage } from './pages/student/StudentTakeExamPage';

function HomeRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  const roleRoutes: Record<string, string> = {
    owner: '/owner/dashboard',
    teacher: '/teacher/dashboard',
    parent: '/parent/dashboard',
  };
  return <Navigate to={roleRoutes[user.role]} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
      <StudentAuthProvider>
        <Routes>
          <Route path="/" element={<HomeRedirect />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/shared/:token" element={<SharedReportPage />} />
          <Route path="/student/login" element={<StudentLoginPage />} />

          {/* Owner */}
          <Route path="/owner/dashboard" element={
            <ProtectedRoute roles={['owner']}><OwnerDashboard /></ProtectedRoute>
          } />
          <Route path="/owner/users" element={
            <ProtectedRoute roles={['owner']}><OwnerUsersPage /></ProtectedRoute>
          } />
          <Route path="/owner/students" element={
            <ProtectedRoute roles={['owner']}><OwnerStudentsPage /></ProtectedRoute>
          } />
          <Route path="/owner/analytics" element={
            <ProtectedRoute roles={['owner']}><OwnerAnalyticsPage /></ProtectedRoute>
          } />
          <Route path="/owner/audit-log" element={
            <ProtectedRoute roles={['owner']}><OwnerAuditLogPage /></ProtectedRoute>
          } />
          <Route path="/owner/settings" element={
            <ProtectedRoute roles={['owner']}><OwnerSettingsPage /></ProtectedRoute>
          } />

          {/* Teacher */}
          <Route path="/teacher/dashboard" element={
            <ProtectedRoute roles={['teacher']}><TeacherDashboard /></ProtectedRoute>
          } />
          <Route path="/teacher/students/:studentId" element={
            <ProtectedRoute roles={['teacher']}><TeacherStudentPage /></ProtectedRoute>
          } />
          <Route path="/teacher/students/:studentId/reports/new" element={
            <ProtectedRoute roles={['teacher']}><TeacherNewReportPage /></ProtectedRoute>
          } />
          <Route path="/teacher/reports/:reportId" element={
            <ProtectedRoute roles={['teacher']}><TeacherReportPage /></ProtectedRoute>
          } />
          <Route path="/teacher/settings" element={
            <ProtectedRoute roles={['teacher']}><TeacherSettingsPage /></ProtectedRoute>
          } />
          <Route path="/teacher/subjects" element={
            <ProtectedRoute roles={['teacher']}><TeacherSubjectsPage /></ProtectedRoute>
          } />
          <Route path="/teacher/subjects/:subjectId" element={
            <ProtectedRoute roles={['teacher']}><TeacherSubjectPage /></ProtectedRoute>
          } />
          <Route path="/teacher/curricula" element={
            <ProtectedRoute roles={['teacher']}><TeacherCurriculaPage /></ProtectedRoute>
          } />
          <Route path="/teacher/questions" element={
            <ProtectedRoute roles={['teacher']}><TeacherQuestionsPage /></ProtectedRoute>
          } />
          <Route path="/teacher/exams" element={
            <ProtectedRoute roles={['teacher']}><TeacherExamsPage /></ProtectedRoute>
          } />

          {/* Parent */}
          <Route path="/parent/dashboard" element={
            <ProtectedRoute roles={['parent']}><ParentDashboard /></ProtectedRoute>
          } />
          <Route path="/parent/reports/:reportId" element={
            <ProtectedRoute roles={['parent']}><ParentReportPage /></ProtectedRoute>
          } />
          <Route path="/parent/settings" element={
            <ProtectedRoute roles={['parent']}><ParentSettingsPage /></ProtectedRoute>
          } />

          {/* Student */}
          <Route path="/student/dashboard" element={
            <StudentProtectedRoute><StudentDashboard /></StudentProtectedRoute>
          } />
          <Route path="/student/exams/:examId" element={
            <StudentProtectedRoute><StudentTakeExamPage /></StudentProtectedRoute>
          } />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </StudentAuthProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
