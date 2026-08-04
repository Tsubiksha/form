import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { lazy, Suspense } from "react";
import ProtectedRoute from "../auth/ProtectedRoute";
import WorkspaceLayout from "../layouts/WorkspaceLayout";

import Dashboard from "../pages/Dashboard";
import MyForms from "../pages/MyForms";
import ResponsesOverview from "../pages/ResponsesOverview";
import CreateForm from "../pages/CreateForm";
import FormBuilder from "../pages/FormBuilder";
import FormPreview from "../pages/FormPreview";
import PublicForm from "../pages/PublicForm";
import Login from "../pages/Login";
import Register from "../pages/Register";
import Responses from "../pages/Responses";
import ResponseDetail from "../pages/ResponseDetail";
import ExportCenter from "../pages/ExportCenter";
import Settings from "../pages/Settings";
import NotFound from "../pages/NotFound";
import LandingPage from "../pages/LandingPage";

const AdminAuditLog = lazy(() => import("../pages/AdminAuditLog"));
const FormAnalytics = lazy(() => import("../pages/FormAnalytics"));
const UserAnalytics = lazy(() => import("../pages/UserAnalytics"));

import AdminLayout from "../layouts/AdminLayout";
const AdminDashboard = lazy(() => import("../pages/AdminDashboard"));
const AdminForms = lazy(() => import("../pages/AdminForms"));
const AdminUsers = lazy(() => import("../pages/AdminUsers"));
const AdminAnalytics = lazy(() => import("../pages/AdminAnalytics"));
const AdminWorkflows = lazy(() => import("../pages/AdminWorkflows"));
const AdminWorkflowDetails = lazy(() => import("../pages/AdminWorkflowDetails"));
const AdminRules = lazy(() => import("../pages/AdminRules"));
const AdminSubmissions = lazy(() => import("../pages/AdminSubmissions"));
const AdminSettings = lazy(() => import("../pages/AdminSettings"));

const PageLoader = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '48px' }}>
    <div style={{ width: 32, height: 32, border: '3px solid var(--border-subtle)', borderTopColor: 'var(--brand-600)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
  </div>
);

const lazyPage = (Component) => (
  <Suspense fallback={<PageLoader />}>
    <Component />
  </Suspense>
);

function PathNormalizer({ children }) {
  const location = useLocation();
  const cleanPath = location.pathname.replace(/\/{2,}/g, "/");
  if (cleanPath !== location.pathname) return <Navigate to={`${cleanPath}${location.search}${location.hash}`} replace />;
  return children;
}

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <PathNormalizer>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/admin/login" element={<Login admin />} />
          <Route path="/register" element={<Register />} />
          <Route path="/f/:linkToken" element={<PublicForm />} />

          {/* Protected Workspace Routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<WorkspaceLayout />}>
              <Route path="/workspace/home" element={<Dashboard />} />
              <Route path="/workspace/forms" element={<MyForms />} />
              <Route path="/workspace/responses" element={<ResponsesOverview />} />
              <Route path="/workspace/forms/:formId/responses" element={<Responses />} />
              <Route path="/workspace/forms/:formId/responses/:responseId" element={<ResponseDetail />} />

              {/* Analytics: support both /insights and /analytics URLs */}
              <Route path="/workspace/insights" element={<Navigate to="/workspace/analytics" replace />} />
              <Route path="/workspace/analytics" element={lazyPage(UserAnalytics)} />
              <Route path="/workspace/forms/:formId/insights" element={lazyPage(FormAnalytics)} />
              <Route path="/workspace/forms/:formId/analytics" element={lazyPage(FormAnalytics)} />

              <Route path="/workspace/exports" element={<ExportCenter />} />
              <Route path="/workspace/audit" element={lazyPage(AdminAuditLog)} />
              <Route path="/workspace/settings" element={<Settings />} />

              <Route path="/workspace/create-form" element={<CreateForm />} />
              <Route path="/workspace/forms/:formId/builder" element={<FormBuilder />} />
              <Route path="/workspace/forms/:formId/preview" element={<FormPreview />} />
            </Route>
          </Route>

          {/* Admin Protected Routes */}
          <Route element={<ProtectedRoute admin />}>
            <Route element={<AdminLayout />}>
              <Route path="/admin/dashboard" element={lazyPage(AdminDashboard)} />
              <Route path="/admin/users" element={lazyPage(AdminUsers)} />
              <Route path="/admin/forms" element={lazyPage(AdminForms)} />
              <Route path="/admin/analytics" element={lazyPage(AdminAnalytics)} />
              <Route path="/admin/audit" element={lazyPage(AdminAuditLog)} />
              <Route path="/admin/workflows" element={lazyPage(AdminWorkflows)} />
              <Route path="/admin/workflows/:id" element={lazyPage(AdminWorkflowDetails)} />
              <Route path="/admin/rules" element={lazyPage(AdminRules)} />
              <Route path="/admin/submissions" element={lazyPage(AdminSubmissions)} />
              <Route path="/admin/settings" element={lazyPage(AdminSettings)} />
              <Route path="/admin/forms/:formId/preview" element={lazyPage(FormPreview)} />
            </Route>
          </Route>

          {/* Legacy redirects */}
          <Route path="/dashboard" element={<Navigate to="/workspace/home" replace />} />
          <Route path="/forms" element={<Navigate to="/workspace/forms" replace />} />
          <Route path="/my-forms" element={<Navigate to="/workspace/forms" replace />} />
          <Route path="/create-form" element={<Navigate to="/workspace/create-form" replace />} />
          <Route path="/forms/:formId/builder" element={<Navigate to="/workspace/forms/:formId/builder" replace />} />
          <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />

          <Route path="/" element={<LandingPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </PathNormalizer>
    </BrowserRouter>
  );
}
// Force Vite HMR update
