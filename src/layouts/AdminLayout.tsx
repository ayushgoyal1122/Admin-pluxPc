import { useState, useMemo, useEffect, useCallback } from "react";
import { Outlet, NavLink, Link, useNavigate, useLocation, Navigate } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  Layers,
  FolderTree,
  PlusCircle,
  ExternalLink,
  LogOut,
  Menu,
  X,
  User,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  ShoppingCart,
  Tag,
  Sliders,
} from "lucide-react";
import { useAdminAuth } from "../context/AdminAuthContext";

export default function AdminLayout() {
  const { admin, isAuthenticated, isLoading, logout } = useAdminAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Desktop / tablet sidebar collapsed state (persisted)
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("voltix_sidebar_collapsed");
      if (saved !== null) return JSON.parse(saved);
      // Default to collapsed on medium tablet screens (< 1024px)
      return typeof window !== "undefined" && window.innerWidth < 1024;
    } catch {
      return false;
    }
  });

  // Mobile drawer state (< 768px)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleSidebar = useCallback(() => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("voltix_sidebar_collapsed", JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  // Support Escape key to close mobile drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileMenuOpen]);

  // Derive breadcrumb based on current path
  const breadcrumb = useMemo(() => {
    const path = location.pathname;
    if (path.includes("/admin/products/new")) {
      return { section: "Catalog", page: "Add New Product" };
    }
    if (path.includes("/admin/products/") && path.includes("/edit")) {
      return { section: "Catalog", page: "Edit Product" };
    }
    if (path.startsWith("/admin/products")) {
      return { section: "Catalog", page: "Products" };
    }
    if (path.startsWith("/admin/categories")) {
      return { section: "Catalog", page: "Categories" };
    }
    if (path.startsWith("/admin/subcategories")) {
      return { section: "Catalog", page: "Sub Categories" };
    }
    if (path.includes("/platform-fee")) {
      return { section: "Settings", page: "Platform Fee" };
    }
    return { section: "Overview", page: "Dashboard" };
  }, [location.pathname]);

  // If verifying session, show clean light splash
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F5F6F8] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-500 text-xs font-medium">Verifying admin session...</span>
        </div>
      </div>
    );
  }

  // Enforce server-verified authentication
  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace state={{ from: location }} />;
  }

  const handleLogout = () => {
    logout();
    navigate("/admin/login", { replace: true });
  };

  // Sidebar navigation items (Commerce items removed as requested)
  const navGroups = [
    {
      title: "Overview",
      items: [
        { label: "Dashboard", to: "/admin/dashboard", icon: LayoutDashboard, end: true },
      ],
    },
    {
      title: "Orders & Sales",
      items: [
        { label: "Orders", to: "/admin/orders", icon: ShoppingCart, end: true },
        { label: "Promo Codes & Discounts", to: "/admin/promo-codes", icon: Tag, end: true },
      ],
    },
    {
      title: "Catalog",
      items: [
        { label: "Products", to: "/admin/products", icon: Package, end: true },
        { label: "Categories", to: "/admin/categories", icon: Layers, end: true },
        { label: "Sub Categories", to: "/admin/subcategories", icon: FolderTree, end: true },
        { label: "Add Product", to: "/admin/products/new", icon: PlusCircle, end: true },
      ],
    },
    {
      title: "Settings",
      items: [
        { label: "Platform Fee", to: "/admin/settings/platform-fee", icon: Sliders, end: true },
      ],
    },
  ];

  return (
    <div className="h-screen bg-[#F5F6F8] text-[#1F2937] flex overflow-hidden font-sans">
      {/* ── Desktop & Tablet Sidebar ── */}
      <aside
        id="admin-sidebar"
        aria-label="Admin Navigation Sidebar"
        className={`hidden md:flex flex-col bg-[#F1F3F5] border-r border-gray-200 flex-shrink-0 h-screen z-20 transition-all duration-200 ease-in-out ${
          isCollapsed ? "w-20" : "w-64"
        }`}
      >
        {/* Brand / Logo + Collapse Toggle */}
        <div
          className={`h-16 flex items-center border-b border-gray-200 px-4 bg-[#F1F3F5] transition-all ${
            isCollapsed ? "justify-center" : "justify-between"
          }`}
        >
          <Link
            to="/admin/dashboard"
            className="flex items-center gap-2 font-extrabold text-xl tracking-tight overflow-hidden"
            title="PLUXPC Admin Dashboard"
          >
            {isCollapsed ? (
              <img
                src="/pluxpc-logo.png"
                alt="PLUXPC"
                className="h-7 w-auto object-contain object-left"
              />
            ) : (
              <div className="flex items-center gap-2 overflow-hidden">
                <img
                  src="/pluxpc-logo.png"
                  alt="PLUXPC logo"
                  className="h-7 w-auto max-w-[110px] object-contain"
                />
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 border border-gray-300 uppercase tracking-wide whitespace-nowrap">
                  ADMIN
                </span>
              </div>
            )}
          </Link>

          {!isCollapsed && (
            <button
              onClick={toggleSidebar}
              type="button"
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-900 cursor-pointer"
              aria-label="Collapse sidebar"
              aria-expanded="true"
              aria-controls="admin-sidebar"
            >
              <PanelLeftClose size={18} />
            </button>
          )}
        </div>

        {/* When collapsed: single expand button right under header */}
        {isCollapsed && (
          <div className="pt-2 px-2 flex justify-center">
            <button
              onClick={toggleSidebar}
              type="button"
              className="p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-900 cursor-pointer"
              aria-label="Expand sidebar"
              aria-expanded="false"
              aria-controls="admin-sidebar"
              title="Expand sidebar"
            >
              <PanelLeftOpen size={18} />
            </button>
          </div>
        )}

        {/* Grouped Sidebar Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
          {navGroups.map((group) => (
            <div key={group.title} className="space-y-1">
              {!isCollapsed ? (
                <p className="px-3 text-[11px] font-bold text-[#6B7280] uppercase tracking-wider mb-1.5">
                  {group.title}
                </p>
              ) : (
                <div className="my-2 border-t border-gray-100" />
              )}

              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    title={isCollapsed ? item.label : undefined}
                    className={({ isActive }) =>
                      `flex items-center rounded-lg text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-gray-900 ${
                        isCollapsed
                          ? "justify-center p-2.5"
                          : "gap-3 px-3 py-2.5"
                      } ${
                        isActive
                          ? "bg-white text-[#E31E24] font-bold shadow-xs border border-gray-200/90"
                          : "text-gray-700 hover:text-gray-950 hover:bg-white/80"
                      }`
                    }
                  >
                    <Icon size={18} className="flex-shrink-0" />
                    {!isCollapsed && <span className="truncate">{item.label}</span>}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Bottom Sidebar Footer: View Store & Administrator Profile */}
        <div className="p-3 border-t border-gray-200 bg-[#F1F3F5] space-y-2">
          {/* View Store Button (redirects to main website) */}
          <a
            href="http://localhost:5173"
            target="_blank"
            rel="noopener noreferrer"
            title="View Store"
            className={`w-full flex items-center rounded-lg bg-white border border-gray-200/90 text-gray-700 hover:text-[#E31E24] hover:border-[#E31E24]/30 hover:bg-white shadow-2xs text-xs font-semibold transition-all cursor-pointer ${
              isCollapsed ? "justify-center p-2.5" : "gap-2.5 px-3 py-2"
            }`}
          >
            <ExternalLink size={15} className="flex-shrink-0 text-[#E31E24]" />
            {!isCollapsed && <span>View Store</span>}
          </a>

          <div
            className={`flex items-center rounded-lg bg-white border border-gray-200/90 shadow-2xs transition-all ${
              isCollapsed ? "justify-center p-2" : "justify-between p-2.5"
            }`}
          >
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div
                className="w-8 h-8 rounded-full bg-gray-200 text-gray-700 flex items-center justify-center font-bold text-xs flex-shrink-0"
                title={admin?.email || "dev@youngdecade.com"}
              >
                <User size={15} />
              </div>
              {!isCollapsed && (
                <div className="overflow-hidden">
                  <p className="text-xs font-bold text-[#1F2937] truncate">{admin?.name || "PLUXPC Admin"}</p>
                  <p className="text-[10px] text-[#6B7280] truncate">{admin?.email || "dev@youngdecade.com"}</p>
                </div>
              )}
            </div>

            {!isCollapsed && (
              <button
                onClick={handleLogout}
                type="button"
                title="Sign Out"
                aria-label="Sign out of admin session"
                className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-rose-500 cursor-pointer"
              >
                <LogOut size={16} />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* ── Mobile Modal Drawer Overlay (< 768px) ── */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
          />

          {/* Drawer Content */}
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Mobile Navigation Menu"
            className="relative w-72 max-w-[85vw] bg-[#F1F3F5] h-full shadow-2xl flex flex-col z-50 transition-transform duration-200"
          >
            {/* Drawer Header */}
            <div className="h-16 px-4 flex items-center justify-between border-b border-gray-200 bg-[#F1F3F5]">
              <Link
                to="/admin/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 font-extrabold text-xl tracking-tight"
              >
                <img
                  src="/pluxpc-logo.png"
                  alt="PLUXPC logo"
                  className="h-7 w-auto max-w-[110px] object-contain"
                />
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 border border-gray-300 uppercase tracking-wide">
                  ADMIN
                </span>
              </Link>
              <button
                onClick={() => setMobileMenuOpen(false)}
                type="button"
                aria-label="Close navigation menu"
                className="p-2 text-gray-500 hover:text-gray-900 hover:bg-white/80 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
              >
                <X size={20} />
              </button>
            </div>

            {/* Drawer Navigation Links */}
            <nav className="flex-1 px-4 py-6 space-y-6 overflow-y-auto">
              {navGroups.map((group) => (
                <div key={group.title} className="space-y-1">
                  <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                    {group.title}
                  </p>
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        onClick={() => setMobileMenuOpen(false)}
                        end={item.end}
                        className={({ isActive }) =>
                          `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                            isActive
                              ? "bg-white text-[#E31E24] font-bold shadow-xs border border-gray-200/90"
                              : "text-gray-700 hover:text-gray-950 hover:bg-white/80"
                          }`
                        }
                      >
                        <Icon size={18} />
                        <span>{item.label}</span>
                      </NavLink>
                    );
                  })}
                </div>
              ))}
            </nav>

            {/* Drawer Footer: View Store, User Profile & Logout */}
            <div className="p-4 border-t border-gray-200 bg-[#F1F3F5] space-y-2.5">
              <a
                href="http://localhost:5173"
                target="_blank"
                rel="noopener noreferrer"
                title="View Store"
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg bg-white border border-gray-200/90 text-gray-700 hover:text-[#E31E24] shadow-2xs text-xs font-semibold transition-all cursor-pointer"
              >
                <ExternalLink size={15} className="flex-shrink-0 text-[#E31E24]" />
                <span>View Store</span>
              </a>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-white border border-gray-200/90 shadow-2xs">
                <div className="flex items-center gap-2 overflow-hidden">
                  <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-700 flex items-center justify-center font-bold text-xs flex-shrink-0">
                    <User size={15} />
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-xs font-bold text-[#1F2937] truncate">{admin?.name || "PLUXPC Admin"}</p>
                    <p className="text-[10px] text-[#6B7280] truncate">{admin?.email || "dev@youngdecade.com"}</p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  type="button"
                  aria-label="Sign out"
                  className="p-1.5 text-gray-500 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                >
                  <LogOut size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Main Layout Column ── */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* ── Top Header Navigation Bar ── */}
        <header className="h-16 bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 flex items-center justify-between sticky top-0 z-30 shadow-xs flex-shrink-0">
          {/* Left: Mobile trigger / Sidebar toggle & Breadcrumbs */}
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Mobile drawer trigger */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              type="button"
              className="md:hidden p-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900 cursor-pointer"
              aria-label="Open navigation menu"
              aria-expanded={mobileMenuOpen}
            >
              <Menu size={20} />
            </button>

            {/* Desktop / tablet header toggle icon for quick expand/collapse */}
            <button
              onClick={toggleSidebar}
              type="button"
              className="hidden md:flex p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-900 cursor-pointer"
              aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-expanded={!isCollapsed}
              aria-controls="admin-sidebar"
              title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {isCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
            </button>

            {/* Breadcrumb Context */}
            <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 sm:gap-2 text-xs font-medium text-[#6B7280]">
              <span className="hover:text-gray-900 transition-colors">{breadcrumb.section}</span>
              <ChevronRight size={12} className="text-gray-400 flex-shrink-0" />
              <span className="text-[#1F2937] font-semibold truncate max-w-[150px] sm:max-w-none">
                {breadcrumb.page}
              </span>
            </nav>
          </div>

          {/* Right: Storefront Link, Admin Info, Logout */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Storefront Link button (Preserved as requested) */}
            <a
              href="http://localhost:5173"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open Live Storefront in new tab"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors shadow-xs"
            >
              <ExternalLink size={13} />
              <span>Storefront</span>
            </a>

            {/* Admin Badge */}
            <div className="flex items-center gap-2 pl-2 border-l border-gray-200">
              <div className="w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-xs">
                {admin?.name?.charAt(0) || "A"}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-bold text-[#1F2937] leading-tight">{admin?.name || "PLUXPC Admin"}</p>
                <p className="text-[10px] text-[#6B7280] leading-tight">Super Administrator</p>
              </div>
            </div>

            {/* Logout button */}
            <button
              onClick={handleLogout}
              type="button"
              title="Sign Out"
              aria-label="Sign out"
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-gray-600 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded-lg transition-colors ml-1 focus:outline-none focus:ring-2 focus:ring-rose-500 cursor-pointer"
            >
              <LogOut size={15} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>

        {/* ── Main Workspace Content ── */}
        <main className="flex-1 bg-[#F5F6F8] p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
