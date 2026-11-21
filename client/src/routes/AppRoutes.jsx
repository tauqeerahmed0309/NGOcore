import React, { Suspense, lazy, useLayoutEffect, useRef } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
const Overview = lazy(() => import('../features/dashboard/Overview'));
const Login = lazy(() => import('../features/auth/Login'));
const PasswordReset = lazy(() => import('../features/auth/PasswordReset'));
const StudentPasswordSetup = lazy(() => import('../features/auth/StudentPasswordSetup'));
const SignupFlow = lazy(() => import('../features/auth/SignupFlow'));
const AdminDashboard = lazy(() => import('../features/dashboard/AdminDashboard'));
const StaffDashboard = lazy(() => import('../features/dashboard/StaffDashboard'));
const VolunteerDashboard = lazy(() => import('../features/dashboard/VolunteerDashboard'));
const StudentDashboard = lazy(() => import('../features/dashboard/StudentDashboard'));
const UserManagement = lazy(() => import('../features/users/UserManagement'));
const StudentManagement = lazy(() => import('../features/students/StudentManagement'));
const ProgramManagement = lazy(() => import('../features/programs/ProgramManagement'));
const ReportsPage = lazy(() => import('../features/reports/ReportsPage'));
const OrganizationAnalytics = lazy(() => import('../features/analytics/OrganizationAnalytics'));
const DonorManagement = lazy(() => import('../features/donors/DonorManagement'));
const DonationManagement = lazy(() => import('../features/donations/DonationManagement'));
const ExpenseManagement = lazy(() => import('../features/expenses/ExpenseManagement'));
const VolunteerManagement = lazy(() => import('../features/volunteers/VolunteerManagement'));
const TaskManagement = lazy(() => import('../features/tasks/TaskManagement'));
const EventManagement = lazy(() => import('../features/events/EventManagement'));
const InventoryManagement = lazy(() => import('../features/inventory/InventoryManagement'));
const DocumentManagement = lazy(() => import('../features/documents/DocumentManagement'));
const AiInsightsStudio = lazy(() => import('../features/aiInsights/AiInsightsStudio'));
import ProtectedRoute from './ProtectedRoute';
import RoleGuard from './RoleGuard';
import AccessDenied from '../components/common/AccessDenied';
import { pageTransition } from '../animations';

function RouteMotion({ children }) {
  const location = useLocation();
  const pageRef = useRef(null);

  useLayoutEffect(() => pageTransition(pageRef.current), [location.pathname]);

  return <div className="route-transition" ref={pageRef}>{children}</div>;
}

export default function AppRoutes() {
  return (
    <RouteMotion>
    <Suspense fallback={<div className="route-loading" role="status">Loading page…</div>}>
    <Routes>
      {/* Public — Login */}
      <Route path="/login" element={<Login />} />
      <Route path="/login/student" element={<Login variant="student" />} />
      <Route path="/student/login" element={<Login variant="student" />} />
      <Route path="/forgot-password" element={<PasswordReset />} />
      <Route path="/set-password" element={<StudentPasswordSetup />} />
      <Route path="/signup/*" element={<SignupFlow />} />

      {/* Root — redirects based on auth state */}
      <Route path="/" element={<Overview />} />

      {/* Admin routes */}
      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute>
            <RoleGuard allowedRoles={['admin']}>
              <AdminDashboard />
            </RoleGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <ProtectedRoute>
            <RoleGuard allowedRoles={['admin']}>
              <UserManagement />
            </RoleGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/analytics"
        element={<Navigate to="/analytics" replace />}
      />
      <Route
        path="/admin/*"
        element={
          <ProtectedRoute>
            <RoleGuard allowedRoles={['admin']}>
              <AdminDashboard />
            </RoleGuard>
          </ProtectedRoute>
        }
      />

      {/* Staff routes */}
      <Route
        path="/staff/dashboard"
        element={
          <ProtectedRoute>
            <RoleGuard allowedRoles={['staff']}>
              <StaffDashboard />
            </RoleGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/staff/analytics"
        element={<Navigate to="/analytics" replace />}
      />
      <Route
        path="/staff/*"
        element={
          <ProtectedRoute>
            <RoleGuard allowedRoles={['staff']}>
              <StaffDashboard />
            </RoleGuard>
          </ProtectedRoute>
        }
      />

      {/* Volunteer routes */}
      <Route
        path="/volunteer/dashboard"
        element={
          <ProtectedRoute>
            <RoleGuard allowedRoles={['volunteer']}>
              <VolunteerDashboard />
            </RoleGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/volunteer/*"
        element={
          <ProtectedRoute>
            <RoleGuard allowedRoles={['volunteer']}>
              <VolunteerDashboard />
            </RoleGuard>
          </ProtectedRoute>
        }
      />

      {/* Student routes */}
      <Route
        path="/student/dashboard"
        element={
          <ProtectedRoute>
            <RoleGuard allowedRoles={['student']}>
              <StudentDashboard />
            </RoleGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/*"
        element={
          <ProtectedRoute>
            <RoleGuard allowedRoles={['student']}>
              <StudentDashboard />
            </RoleGuard>
          </ProtectedRoute>
        }
      />

      {/* Shared module routes (RBAC enforced at API + component level) */}
      <Route
        path="/students"
        element={
          <ProtectedRoute>
            <StudentManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/programs"
        element={
          <ProtectedRoute>
            <ProgramManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <ProtectedRoute>
            <RoleGuard allowedRoles={['admin', 'staff']}>
              <ReportsPage />
            </RoleGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/analytics"
        element={
          <ProtectedRoute>
            <RoleGuard allowedRoles={['admin', 'staff']}>
              <OrganizationAnalytics />
            </RoleGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/donors"
        element={
          <ProtectedRoute>
            <RoleGuard allowedRoles={['admin', 'staff']}>
              <DonorManagement />
            </RoleGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/donors/:id"
        element={
          <ProtectedRoute>
            <RoleGuard allowedRoles={['admin', 'staff']}>
              <DonorManagement />
            </RoleGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/donations"
        element={
          <ProtectedRoute>
            <RoleGuard allowedRoles={['admin', 'staff']}>
              <DonationManagement />
            </RoleGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/donations/:id"
        element={
          <ProtectedRoute>
            <RoleGuard allowedRoles={['admin', 'staff']}>
              <DonationManagement />
            </RoleGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/expenses"
        element={
          <ProtectedRoute>
            <RoleGuard allowedRoles={['admin', 'staff']}>
              <ExpenseManagement />
            </RoleGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/expenses/:id"
        element={
          <ProtectedRoute>
            <RoleGuard allowedRoles={['admin', 'staff']}>
              <ExpenseManagement />
            </RoleGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/volunteers"
        element={
          <ProtectedRoute>
            <RoleGuard allowedRoles={['admin', 'staff', 'volunteer']}>
              <VolunteerManagement />
            </RoleGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/volunteers/:id"
        element={
          <ProtectedRoute>
            <RoleGuard allowedRoles={['admin', 'staff', 'volunteer']}>
              <VolunteerManagement />
            </RoleGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/tasks"
        element={
          <ProtectedRoute>
            <RoleGuard allowedRoles={['admin', 'staff', 'volunteer']}>
              <TaskManagement />
            </RoleGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/tasks/:id"
        element={
          <ProtectedRoute>
            <RoleGuard allowedRoles={['admin', 'staff', 'volunteer']}>
              <TaskManagement />
            </RoleGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/events"
        element={
          <ProtectedRoute>
            <RoleGuard allowedRoles={['admin', 'staff', 'volunteer']}>
              <EventManagement />
            </RoleGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/events/:id"
        element={
          <ProtectedRoute>
            <RoleGuard allowedRoles={['admin', 'staff', 'volunteer']}>
              <EventManagement />
            </RoleGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/inventory"
        element={
          <ProtectedRoute>
            <RoleGuard allowedRoles={['admin', 'staff', 'volunteer']}>
              <InventoryManagement />
            </RoleGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/inventory/:id"
        element={
          <ProtectedRoute>
            <RoleGuard allowedRoles={['admin', 'staff', 'volunteer']}>
              <InventoryManagement />
            </RoleGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/documents"
        element={
          <ProtectedRoute>
            <RoleGuard allowedRoles={['admin', 'staff', 'volunteer']}>
              <DocumentManagement />
            </RoleGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/documents/:id"
        element={
          <ProtectedRoute>
            <RoleGuard allowedRoles={['admin', 'staff', 'volunteer']}>
              <DocumentManagement />
            </RoleGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/insights"
        element={
          <ProtectedRoute>
            <RoleGuard allowedRoles={['admin', 'staff']}>
              <AiInsightsStudio />
            </RoleGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/report-studio"
        element={
          <ProtectedRoute>
            <RoleGuard allowedRoles={['admin', 'staff']}>
              <AiInsightsStudio />
            </RoleGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/users"
        element={
          <ProtectedRoute>
            <RoleGuard allowedRoles={['admin']}>
              <UserManagement />
            </RoleGuard>
          </ProtectedRoute>
        }
      />

      {/* Access Denied */}
      <Route path="/unauthorized" element={<AccessDenied />} />

      {/* 404 — redirect to root (which redirects appropriately) */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </Suspense>
    </RouteMotion>
  );
}
