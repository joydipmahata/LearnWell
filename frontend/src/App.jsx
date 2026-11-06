import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import FairnessFooter from './components/FairnessFooter';

// Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import NoticesPage from './pages/shared/NoticesPage';

// Student Pages
import StudentDashboard from './pages/student/StudentDashboard';
import StudentAttendance from './pages/student/StudentAttendance';
import StudentResults from './pages/student/StudentResults';
import StudentMentor from './pages/student/StudentMentor';
import StudentExamSeating from './pages/student/StudentExamSeating';
import StudentNotifications from './pages/student/StudentNotifications';
import StudentCalendar from './pages/student/StudentCalendar';
import StudentLiveQuiz from './pages/student/StudentLiveQuiz';
import StudentScanPage from './pages/student/StudentScanPage';

// Faculty Pages
import FacultyDashboard from './pages/faculty/FacultyDashboard';
import StudentDetailPage from './pages/faculty/StudentDetailPage';
import FacultyMentorship from './pages/faculty/FacultyMentorship';
import FacultyAttendance from './pages/faculty/FacultyAttendance';
import FacultyExamSeating from './pages/faculty/FacultyExamSeating';
import FacultyLiveQuizzes from './pages/faculty/FacultyLiveQuizzes';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminMentorAssignments from './pages/admin/AdminMentorAssignments';
import AdminExamSeating from './pages/admin/AdminExamSeating';
import AdminTimetable from './pages/admin/AdminTimetable';
import QuestionBankPage from './pages/shared/QuestionBankPage';

function ProtectedRoute({ children, allowedRoles }) {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) {
    const redirectParam = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?redirect=${redirectParam}`} replace />;
  }
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }
  return children;
}

function Layout({ children }) {
  const { user } = useAuth();
  const location = useLocation();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const isAuthOrLanding = location.pathname === '/' || location.pathname === '/login';

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      <Navbar onToggleSidebar={() => setMobileSidebarOpen(prev => !prev)} />
      <div className="flex-1 flex">
        {user && !isAuthOrLanding && (
          <Sidebar
            mobileOpen={mobileSidebarOpen}
            onCloseMobile={() => setMobileSidebarOpen(false)}
          />
        )}
        <main
          className={`flex-1 flex flex-col justify-between ${
            user && !isAuthOrLanding
              ? 'p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full'
              : 'w-full'
          }`}
        >
          <div className="w-full">{children}</div>
          <FairnessFooter />
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Layout>
            <Routes>
              {/* Public */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />

              {/* Shared */}
              <Route
                path="/notices"
                element={
                  <ProtectedRoute allowedRoles={['Student', 'Faculty', 'Admin']}>
                    <NoticesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/questions"
                element={
                  <ProtectedRoute allowedRoles={['Student', 'Faculty', 'Admin']}>
                    <QuestionBankPage />
                  </ProtectedRoute>
                }
              />

              {/* Student */}
              <Route
                path="/student/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['Student']}>
                    <StudentDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/student/attendance"
                element={
                  <ProtectedRoute allowedRoles={['Student']}>
                    <StudentAttendance />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/student/results"
                element={
                  <ProtectedRoute allowedRoles={['Student']}>
                    <StudentResults />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/student/mentor"
                element={
                  <ProtectedRoute allowedRoles={['Student']}>
                    <StudentMentor />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/student/exam-seating"
                element={
                  <ProtectedRoute allowedRoles={['Student']}>
                    <StudentExamSeating />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/student/notifications"
                element={
                  <ProtectedRoute allowedRoles={['Student']}>
                    <StudentNotifications />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/student/calendar"
                element={
                  <ProtectedRoute allowedRoles={['Student']}>
                    <StudentCalendar />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/student/live-quiz"
                element={
                  <ProtectedRoute allowedRoles={['Student']}>
                    <StudentLiveQuiz />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/student/scan"
                element={
                  <ProtectedRoute allowedRoles={['Student']}>
                    <StudentScanPage />
                  </ProtectedRoute>
                }
              />

              {/* Faculty */}
              <Route
                path="/faculty/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['Faculty']}>
                    <FacultyDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/faculty/students/:studentId"
                element={
                  <ProtectedRoute allowedRoles={['Faculty']}>
                    <StudentDetailPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/faculty/mentorship"
                element={
                  <ProtectedRoute allowedRoles={['Faculty']}>
                    <FacultyMentorship />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/faculty/attendance"
                element={
                  <ProtectedRoute allowedRoles={['Faculty']}>
                    <FacultyAttendance />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/faculty/exam-seating"
                element={
                  <ProtectedRoute allowedRoles={['Faculty']}>
                    <FacultyExamSeating />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/faculty/quizzes"
                element={
                  <ProtectedRoute allowedRoles={['Faculty']}>
                    <FacultyLiveQuizzes />
                  </ProtectedRoute>
                }
              />

              {/* Admin */}
              <Route
                path="/admin/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['Admin']}>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/users"
                element={
                  <ProtectedRoute allowedRoles={['Admin']}>
                    <AdminUsers />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/mentor-assignments"
                element={
                  <ProtectedRoute allowedRoles={['Admin']}>
                    <AdminMentorAssignments />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/exam-seating"
                element={
                  <ProtectedRoute allowedRoles={['Admin']}>
                    <AdminExamSeating />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/timetable"
                element={
                  <ProtectedRoute allowedRoles={['Admin']}>
                    <AdminTimetable />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/notices"
                element={
                  <ProtectedRoute allowedRoles={['Admin']}>
                    <NoticesPage />
                  </ProtectedRoute>
                }
              />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Layout>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}
