import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AdminAuthProvider } from "./context/AdminAuthContext";
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

export default function App() {
  return (
    <BrowserRouter>
      <AdminAuthProvider>
        <Routes>
          {/* Root and shortcut redirects */}
          <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="/login" element={<Navigate to="/admin/login" replace />} />
          <Route path="/dashboard" element={<Navigate to="/admin/dashboard" replace />} />

          {/* Dedicated Admin Login */}
          <Route path="/admin/login" element={<AdminLoginPage />} />

          {/* Protected Admin Routes */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboardPage />} />
            <Route path="products" element={<AdminProductsPage />} />
            <Route path="products/new" element={<AdminProductFormPage />} />
            <Route path="products/:id/edit" element={<AdminProductFormPage />} />
            <Route path="categories" element={<AdminCategoriesPage />} />
            <Route path="subcategories" element={<AdminSubCategoriesPage />} />
            <Route path="orders" element={<AdminOrdersPage />} />
            <Route path="promo-codes" element={<AdminPromoCodesPage />} />
            <Route path="settings/platform-fee" element={<AdminPlatformFeePage />} />
            <Route path="platform-fee" element={<Navigate to="/admin/settings/platform-fee" replace />} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
        </Routes>
      </AdminAuthProvider>
    </BrowserRouter>
  );
}

