import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AdminAuthProvider, useAdminAuth } from "./context/AdminAuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminLayout from "./layouts/AdminLayout";
import AdminLoginPage from "./pages/AdminLoginPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import AdminProductsPage from "./pages/AdminProductsPage";
import AdminProductFormPage from "./pages/AdminProductFormPage";
import AdminCategoriesPage from "./pages/AdminCategoriesPage";
import AdminSubCategoriesPage from "./pages/AdminSubCategoriesPage";
import AdminOrdersPage from "./pages/AdminOrdersPage";
import AdminPromoCodesPage from "./pages/AdminPromoCodesPage";
import AdminPlatformFeePage from "./pages/AdminPlatformFeePage";
import AdminManageEarningPage from "./pages/AdminManageEarningPage";
import AdminUserDetailsPage from "./pages/AdminUserDetailsPage";
import AdminAuditLogsPage from "./pages/AdminAuditLogsPage";
import AdminBlogsPage from "./pages/AdminBlogsPage";
import AdminBlogFormPage from "./pages/AdminBlogFormPage";

/**
 * Root landing page resolver:
 * - Unauthenticated users landing on "/" or root URL are directed to Admin Login.
 * - Authenticated users with active sessions are directed to Admin Dashboard.
 */
export function RootRoute() {
  const { isAuthenticated, isLoading } = useAdminAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F5F6F8] flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-500 text-xs font-medium">Verifying admin session...</span>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return <Navigate to="/admin/login" replace />;
}

export function AppRoutes() {
  return (
    <Routes>
      {/* Root landing page: Login for unauthenticated, Dashboard for authenticated */}
      <Route path="/" element={<RootRoute />} />
      <Route path="/login" element={<Navigate to="/admin/login" replace />} />
      <Route path="/dashboard" element={<Navigate to="/admin/dashboard" replace />} />

      {/* Dedicated Admin Login */}
      <Route path="/admin/login" element={<AdminLoginPage />} />

      {/* Protected Admin Routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboardPage />} />
        <Route path="products" element={<AdminProductsPage />} />
        <Route path="products/new" element={<AdminProductFormPage />} />
        <Route path="products/:id/edit" element={<AdminProductFormPage />} />
        <Route path="categories" element={<AdminCategoriesPage />} />
        <Route path="subcategories" element={<AdminSubCategoriesPage />} />
        <Route path="orders" element={<AdminOrdersPage />} />
        <Route path="manage-earning" element={<AdminManageEarningPage />} />
        <Route path="earnings" element={<Navigate to="/admin/manage-earning" replace />} />
        <Route path="view-user/:userId" element={<AdminUserDetailsPage />} />
        <Route path="users/:userId" element={<Navigate to="/admin/view-user/:userId" replace />} />
        <Route path="promo-codes" element={<AdminPromoCodesPage />} />
        <Route path="settings/platform-fee" element={<AdminPlatformFeePage />} />
        <Route path="platform-fee" element={<Navigate to="/admin/settings/platform-fee" replace />} />
        <Route path="audit-logs" element={<AdminAuditLogsPage />} />
        <Route path="blogs" element={<AdminBlogsPage />} />
        <Route path="blogs/new" element={<AdminBlogFormPage />} />
        <Route path="blogs/:id/edit" element={<AdminBlogFormPage />} />
      </Route>

      {/* Catch-all redirect back to root resolver */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AdminAuthProvider>
        <AppRoutes />
      </AdminAuthProvider>
    </BrowserRouter>
  );
}
