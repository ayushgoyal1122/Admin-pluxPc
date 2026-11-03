import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  RotateCw,
  Search,
  ChevronDown,
  ChevronUp,
  X,
  ExternalLink,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  Download,
} from "lucide-react";
import {
  adminGetAuditLogs,
  adminGetAuditLogStats,
} from "../services/api";
import type {
  AuditLogRecord,
  AuditLogStats,
  AuditLogQueryParams,
} from "../types";

export default function AdminAuditLogsPage() {
  // ── State Management ──
  const [logs, setLogs] = useState<AuditLogRecord[]>([]);
  const [stats, setStats] = useState<AuditLogStats>({
    totalLogs: 0,
    todayActivity: 0,
    adminActions: 0,
    customerActivity: 0,
    failedActions: 0,
    tabs: {
      all: 0,
      admin: 0,
      customer: 0,
      auth: 0,
      products: 0,
      orders: 0,
      settings: 0,
      failed: 0,
    },
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Active filters
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [selectedModule, setSelectedModule] = useState("all");
  const [selectedAction, setSelectedAction] = useState("all");
  const [selectedRole, setSelectedRole] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [activeTab, setActiveTab] = useState<
    "all" | "admin" | "customer" | "auth" | "products" | "orders" | "settings" | "failed"
  >("all");

  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Expanded row IDs
  const [expandedRowIds, setExpandedRowIds] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // ── Fetch Audit Metrics ──
  const fetchStats = useCallback(async () => {
    try {
      const res = await adminGetAuditLogStats();
      if (res.success && res.stats) {
        setStats(res.stats);
      }
    } catch (err: any) {
      console.error("Failed to load audit stats:", err);
    }
  }, []);

  // ── Fetch Audit Records ──
  const fetchLogs = useCallback(
    async (isManualRefresh = false) => {
      if (isManualRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      try {
        const params: AuditLogQueryParams = {
          page,
          limit,
          tab: activeTab,
        };

        if (activeSearch.trim()) params.q = activeSearch.trim();
        if (selectedModule !== "all") params.module = selectedModule;
        if (selectedAction !== "all") params.action = selectedAction;
        if (selectedRole !== "all") params.role = selectedRole;
        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;

        const res = await adminGetAuditLogs(params);
        if (res.success) {
          setLogs(res.logs || []);
          setTotalCount(res.totalCount || 0);
          setTotalPages(res.totalPages || 1);
        } else {
          setError(res.message || "Unable to fetch audit logs.");
        }
      } catch (err: any) {
        setError(err.message || "Failed to communicate with backend server.");
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [page, limit, activeTab, activeSearch, selectedModule, selectedAction, selectedRole, startDate, endDate]
  );

  // Trigger data fetching
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Handle Search submit
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveSearch(searchQuery);
    setPage(1);
  };

  // Handle Clear Filters
  const handleClearFilters = () => {
    setSearchQuery("");
    setActiveSearch("");
    setSelectedModule("all");
    setSelectedAction("all");
    setSelectedRole("all");
    setStartDate("");
    setEndDate("");
    setActiveTab("all");
    setPage(1);
  };

  // Toggle Row Accordion
  const toggleRow = (id: string) => {
    setExpandedRowIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Copy JSON Payload
  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Format date nicely matching reference: "14/10/2026, 10:43:00"
  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return "—";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const day = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const year = d.getFullYear();
      let hours = d.getHours();
      const minutes = String(d.getMinutes()).padStart(2, "0");
      const seconds = String(d.getSeconds()).padStart(2, "0");
      return `${day}/${month}/${year}, ${String(hours).padStart(2, "0")}:${minutes}:${seconds}`;
    } catch {
      return dateStr;
    }
  };

  // Export visible records to CSV
  const handleExportCSV = () => {
    if (!logs.length) return;
    const headers = ["S.No", "Event ID", "Date & Time", "Actor Name", "Actor Email", "Role", "Action", "Module", "Description", "Result", "IP Address"];
    const rows = logs.map((log, idx) => [
      (page - 1) * limit + idx + 1,
      log.id,
      formatDateTime(log.createdAt),
      `"${log.actorName.replace(/"/g, '""')}"`,
      `"${log.actorEmail.replace(/"/g, '""')}"`,
      log.actorRole,
      log.actionLabel || log.action,
      log.moduleLabel || log.module,
      `"${log.description.replace(/"/g, '""')}"`,
      log.result,
      log.ipAddress,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `PLUXPC_Audit_Logs_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Role Badge Styling (Strict Red, White, Black Theme)
  const renderRoleBadge = (role: string) => {
    switch (role?.toLowerCase()) {
      case "admin":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-[#E31E24] border border-red-200">
            Admin
          </span>
        );
      case "customer":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-800 border border-gray-300">
            Customer
          </span>
        );
      case "system":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-700 border border-[#BFC5CE]">
            System
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-[#E31E24] border border-red-200">
            Guest
          </span>
        );
    }
  };

  // Action Badge Styling (Strict Red, White, Black Theme)
  const renderActionBadge = (action: string, result: string) => {
    if (result === "failure") {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#E31E24] text-white">
          Failed
        </span>
      );
    }

    const norm = (action || "").toUpperCase();
    if (norm.includes("CREATE") || norm.includes("REGISTER") || norm.includes("PURCHASE") || norm.includes("RESTORE")) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-[#E31E24] border border-red-200">
          {norm.includes("CREATE") ? "Create" : norm.includes("REGISTER") ? "Register" : norm.includes("RESTORE") ? "Restore" : "Purchase"}
        </span>
      );
    }
    if (norm.includes("UPDATE") || norm.includes("CONFIG")) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-800 border border-gray-300">
          Update
        </span>
      );
    }
    if (norm.includes("DELETE")) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#E31E24] text-white">
          Delete
        </span>
      );
    }
    if (norm.includes("STATUS")) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-800 border border-gray-300">
          Status Change
        </span>
      );
    }
    if (norm.includes("LOGIN")) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-[#E31E24] border border-red-200">
          Login
        </span>
      );
    }

    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-800 border border-gray-300">
        {action}
      </span>
    );
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-12">
      {/* ── 1. Header Section ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-[26px] font-extrabold text-[#111827] tracking-tight leading-tight">
            Audit Logs
          </h1>
          <p className="text-xs sm:text-sm text-[#6B7280] mt-0.5 font-normal">
            Track administrative and user activities across PLUXPC.
          </p>
        </div>

        {/* Refresh Action */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              fetchStats();
              fetchLogs(true);
            }}
            disabled={isRefreshing}
            type="button"
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-gray-700 bg-white border border-[#BFC5CE] hover:border-[#111827] rounded-lg shadow-xs hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-900 transition-all cursor-pointer disabled:opacity-50"
            title="Refresh Audit Logs"
          >
            <RotateCw
              size={14}
              className={`text-gray-500 ${isRefreshing ? "animate-spin text-gray-900" : ""}`}
            />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ── 2. Search & Filters Bar (Matches Reference Screenshot) ── */}
      <div className="bg-white rounded-xl border border-[#C5C9D0] p-3 sm:p-4 shadow-2xs">
        <form onSubmit={handleSearchSubmit} className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          {/* Search Input Box */}
          <div className="relative flex-1 min-w-[220px]">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search audit logs..."
              className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-white border border-[#BFC5CE] rounded-lg focus:outline-none focus:border-[#111827] focus:ring-1 focus:ring-[#111827] text-gray-800 placeholder-gray-400 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-600 rounded-full"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Search Button (Solid Red matching brand) */}
          <button
            type="submit"
            className="px-4 py-2 text-xs font-semibold text-white bg-[#E31E24] hover:bg-[#C9191E] rounded-lg transition-colors cursor-pointer shadow-xs"
          >
            Search
          </button>

          {/* Module Filter Dropdown */}
          <select
            value={selectedModule}
            onChange={(e) => {
              setSelectedModule(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-xs bg-white border border-[#BFC5CE] rounded-lg text-gray-700 focus:outline-none focus:border-[#111827] focus:ring-1 focus:ring-[#111827] cursor-pointer"
          >
            <option value="all">All Modules</option>
            <option value="AUTHENTICATION">Authentication</option>
            <option value="PRODUCTS">Products</option>
            <option value="CATEGORIES">Categories</option>
            <option value="SUBCATEGORIES">Sub Categories</option>
            <option value="ORDERS">Orders & Fulfillment</option>
            <option value="PLATFORM_FEE">Platform Fee</option>
            <option value="PROMOTIONS">Promotions</option>
            <option value="CUSTOMERS">Customers</option>
            <option value="SYSTEM">System Settings</option>
          </select>

          {/* Action Filter Dropdown */}
          <select
            value={selectedAction}
            onChange={(e) => {
              setSelectedAction(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-xs bg-white border border-[#BFC5CE] rounded-lg text-gray-700 focus:outline-none focus:border-[#111827] focus:ring-1 focus:ring-[#111827] cursor-pointer"
          >
            <option value="all">All Actions</option>
            <option value="LOGIN">Login</option>
            <option value="FAILED_LOGIN">Failed Login</option>
            <option value="CREATE">Create</option>
            <option value="UPDATE">Update</option>
            <option value="DELETE">Delete</option>
            <option value="RESTORE">Restore</option>
            <option value="STATUS_CHANGE">Status Change</option>
            <option value="CONFIG_UPDATE">Config Update</option>
            <option value="PURCHASE">Purchase</option>
            <option value="REGISTER">Register</option>
          </select>

          {/* Role Filter Dropdown */}
          <select
            value={selectedRole}
            onChange={(e) => {
              setSelectedRole(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-xs bg-white border border-[#BFC5CE] rounded-lg text-gray-700 focus:outline-none focus:border-[#111827] focus:ring-1 focus:ring-[#111827] cursor-pointer"
          >
            <option value="all">All Roles</option>
            <option value="admin">Admin</option>
            <option value="customer">Customer</option>
            <option value="unauthenticated">Unauthenticated</option>
          </select>

          {/* From Date Filter */}
          <div className="flex items-center gap-1.5">
            <label
              htmlFor="audit-filter-from-date"
              className="text-xs font-semibold text-gray-600 whitespace-nowrap select-none"
            >
              From Date
            </label>
            <input
              id="audit-filter-from-date"
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1.5 text-xs bg-white border border-[#BFC5CE] rounded-lg text-gray-700 focus:outline-none focus:border-[#111827] focus:ring-1 focus:ring-[#111827] cursor-pointer"
              title="From Date"
            />
          </div>

          {/* To Date Filter */}
          <div className="flex items-center gap-1.5">
            <label
              htmlFor="audit-filter-to-date"
              className="text-xs font-semibold text-gray-600 whitespace-nowrap select-none"
            >
              To Date
            </label>
            <input
              id="audit-filter-to-date"
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1.5 text-xs bg-white border border-[#BFC5CE] rounded-lg text-gray-700 focus:outline-none focus:border-[#111827] focus:ring-1 focus:ring-[#111827] cursor-pointer"
              title="To Date"
            />
          </div>

          {/* Clear Filters Button */}
          <button
            type="button"
            onClick={handleClearFilters}
            className="px-3 py-2 text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors cursor-pointer"
          >
            Clear
          </button>
        </form>
      </div>

      {/* ── 3. 5 Revenue & Activity Summary Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4">
        {/* Card 1: Total Logs */}
        <div className="bg-white rounded-xl border border-[#C5C9D0] p-4 shadow-2xs flex flex-col justify-between">
          <p className="text-[11px] sm:text-xs font-medium text-gray-500">Total Logs</p>
          <p className="text-2xl sm:text-3xl font-extrabold text-[#111827] mt-2">
            {stats.totalLogs.toLocaleString()}
          </p>
        </div>

        {/* Card 2: Today's Activity */}
        <div className="bg-white rounded-xl border border-[#C5C9D0] p-4 shadow-2xs flex flex-col justify-between">
          <p className="text-[11px] sm:text-xs font-medium text-gray-500">Today's Activity</p>
          <p className="text-2xl sm:text-3xl font-extrabold text-[#111827] mt-2">
            {stats.todayActivity.toLocaleString()}
          </p>
        </div>

        {/* Card 3: Admin Actions */}
        <div className="bg-white rounded-xl border border-[#C5C9D0] p-4 shadow-2xs flex flex-col justify-between">
          <p className="text-[11px] sm:text-xs font-medium text-gray-500">Admin Actions</p>
          <p className="text-2xl sm:text-3xl font-extrabold text-[#111827] mt-2">
            {stats.adminActions.toLocaleString()}
          </p>
        </div>

        {/* Card 4: Customer Activity */}
        <div className="bg-white rounded-xl border border-[#C5C9D0] p-4 shadow-2xs flex flex-col justify-between">
          <p className="text-[11px] sm:text-xs font-medium text-gray-500">Customer Activity</p>
          <p className="text-2xl sm:text-3xl font-extrabold text-[#111827] mt-2">
            {stats.customerActivity.toLocaleString()}
          </p>
        </div>

        {/* Card 5: Failed Actions */}
        <div className="bg-white rounded-xl border border-[#C5C9D0] p-4 shadow-2xs flex flex-col justify-between col-span-2 sm:col-span-1">
          <p className="text-[11px] sm:text-xs font-medium text-gray-500">Failed Actions</p>
          <p
            className={`text-2xl sm:text-3xl font-extrabold mt-2 ${
              stats.failedActions > 0 ? "text-rose-600" : "text-[#111827]"
            }`}
          >
            {stats.failedActions.toLocaleString()}
          </p>
        </div>
      </div>

      {/* ── 4. Category Tabs (Pills Matching Reference) ── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {/* All Logs */}
        <button
          type="button"
          onClick={() => {
            setActiveTab("all");
            setPage(1);
          }}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === "all"
              ? "bg-[#E31E24] text-white shadow-xs"
              : "bg-white text-gray-700 border border-[#BFC5CE] hover:bg-gray-50"
          }`}
        >
          <span>All Logs</span>
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
              activeTab === "all" ? "bg-white/20 text-white" : "bg-gray-100 text-gray-600"
            }`}
          >
            {stats.tabs.all}
          </span>
        </button>

        {/* Admin Actions */}
        <button
          type="button"
          onClick={() => {
            setActiveTab("admin");
            setPage(1);
          }}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === "admin"
              ? "bg-[#E31E24] text-white shadow-xs"
              : "bg-white text-gray-700 border border-[#BFC5CE] hover:bg-gray-50"
          }`}
        >
          <span>Admin Actions</span>
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
              activeTab === "admin" ? "bg-white/20 text-white" : "bg-gray-100 text-gray-600"
            }`}
          >
            {stats.tabs.admin}
          </span>
        </button>

        {/* Customer Activity */}
        <button
          type="button"
          onClick={() => {
            setActiveTab("customer");
            setPage(1);
          }}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === "customer"
              ? "bg-[#E31E24] text-white shadow-xs"
              : "bg-white text-gray-700 border border-[#BFC5CE] hover:bg-gray-50"
          }`}
        >
          <span>Customer Activity</span>
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
              activeTab === "customer" ? "bg-white/20 text-white" : "bg-gray-100 text-gray-600"
            }`}
          >
            {stats.tabs.customer}
          </span>
        </button>

        {/* Login & Auth */}
        <button
          type="button"
          onClick={() => {
            setActiveTab("auth");
            setPage(1);
          }}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === "auth"
              ? "bg-[#E31E24] text-white shadow-xs"
              : "bg-white text-gray-700 border border-[#BFC5CE] hover:bg-gray-50"
          }`}
        >
          <span>Login & Auth</span>
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
              activeTab === "auth" ? "bg-white/20 text-white" : "bg-gray-100 text-gray-600"
            }`}
          >
            {stats.tabs.auth}
          </span>
        </button>

        {/* Product & Catalog */}
        <button
          type="button"
          onClick={() => {
            setActiveTab("products");
            setPage(1);
          }}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === "products"
              ? "bg-[#E31E24] text-white shadow-xs"
              : "bg-white text-gray-700 border border-[#BFC5CE] hover:bg-gray-50"
          }`}
        >
          <span>Product & Inventory</span>
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
              activeTab === "products" ? "bg-white/20 text-white" : "bg-gray-100 text-gray-600"
            }`}
          >
            {stats.tabs.products}
          </span>
        </button>

        {/* Orders & Fulfillment */}
        <button
          type="button"
          onClick={() => {
            setActiveTab("orders");
            setPage(1);
          }}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === "orders"
              ? "bg-[#E31E24] text-white shadow-xs"
              : "bg-white text-gray-700 border border-[#BFC5CE] hover:bg-gray-50"
          }`}
        >
          <span>Orders & Payments</span>
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
              activeTab === "orders" ? "bg-white/20 text-white" : "bg-gray-100 text-gray-600"
            }`}
          >
            {stats.tabs.orders}
          </span>
        </button>

        {/* Settings & Config */}
        <button
          type="button"
          onClick={() => {
            setActiveTab("settings");
            setPage(1);
          }}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === "settings"
              ? "bg-[#E31E24] text-white shadow-xs"
              : "bg-white text-gray-700 border border-[#BFC5CE] hover:bg-gray-50"
          }`}
        >
          <span>Settings & Config</span>
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
              activeTab === "settings" ? "bg-white/20 text-white" : "bg-gray-100 text-gray-600"
            }`}
          >
            {stats.tabs.settings}
          </span>
        </button>

        {/* Failed Actions */}
        <button
          type="button"
          onClick={() => {
            setActiveTab("failed");
            setPage(1);
          }}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === "failed"
              ? "bg-[#E31E24] text-white shadow-xs"
              : "bg-white text-gray-700 border border-[#BFC5CE] hover:bg-gray-50"
          }`}
        >
          <span>Failed Actions</span>
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
              activeTab === "failed"
                ? "bg-rose-500 text-white"
                : "bg-rose-100 text-rose-700"
            }`}
          >
            {stats.tabs.failed}
          </span>
        </button>
      </div>

      {/* ── 5. Main Table Container (Matches Reference Screenshot) ── */}
      <div className="bg-white rounded-xl border border-[#C5C9D0] shadow-2xs overflow-hidden">
        {/* Table Title and Action Header */}
        <div className="px-5 py-4 border-b border-[#C5C9D0] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-[#111827]">
              Recent Activity Log ({totalCount.toLocaleString()} Records)
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              disabled={logs.length === 0}
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white border border-[#BFC5CE] hover:border-[#111827] rounded-lg shadow-xs hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-40"
              title="Export visible records to CSV"
            >
              <Download size={13} className="text-gray-500" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Error message banner */}
        {error && (
          <div className="mx-5 my-4 p-3.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert size={16} />
              <span>{error}</span>
            </div>
            <button
              onClick={() => fetchLogs()}
              className="text-xs font-bold underline hover:text-rose-900 cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* Table View */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#BFC5CE] bg-[#FAFAFA] text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">
                <th className="py-3 px-3 w-10 text-center"></th>
                <th className="py-3 px-4 font-bold w-16">S.NO.</th>
                <th className="py-3 px-4 font-bold min-w-[200px]">USER / ADMIN NAME</th>
                <th className="py-3 px-4 font-bold min-w-[100px]">ROLE</th>
                <th className="py-3 px-4 font-bold min-w-[120px]">ACTION</th>
                <th className="py-3 px-4 font-bold min-w-[140px]">MODULE</th>
                <th className="py-3 px-4 font-bold min-w-[160px]">DATE & TIME</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D1D5DB]">
              {isLoading && logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-500">
                    <div className="inline-flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
                      <span className="text-xs font-medium">Loading audit logs...</span>
                    </div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-500">
                    <p className="text-sm font-semibold text-gray-700">No audit records found.</p>
                    <p className="text-xs text-gray-400 mt-1">Try adjusting your filters or search keywords.</p>
                  </td>
                </tr>
              ) : (
                logs.map((log, index) => {
                  const isExpanded = expandedRowIds.has(log.id);
                  const serialNumber = (page - 1) * limit + index + 1;

                  return (
                    <tr
                      key={log.id}
                      className={`transition-colors ${
                        isExpanded ? "bg-[#F8FAFC]" : "hover:bg-[#F9FAFB]"
                      }`}
                    >
                      {/* Expand / Collapse Button */}
                      <td className="py-3.5 px-3 text-center align-middle">
                        <button
                          type="button"
                          onClick={() => toggleRow(log.id)}
                          aria-label={isExpanded ? "Collapse row details" : "Expand row details"}
                          className="w-6 h-6 inline-flex items-center justify-center rounded border border-[#BFC5CE] bg-white hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition-colors cursor-pointer"
                        >
                          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                      </td>

                      {/* S.No */}
                      <td className="py-3.5 px-4 text-gray-500 font-medium align-middle">
                        {serialNumber}
                      </td>

                      {/* User / Admin Name & Email */}
                      <td className="py-3.5 px-4 align-middle">
                        <div className="flex items-center gap-1.5">
                          {log.actorRole === "customer" && log.actorId ? (
                            <Link
                              to={`/admin/view-user/${log.actorId}`}
                              className="font-bold text-gray-900 hover:text-[#E31E24] flex items-center gap-1 group"
                              title="View Customer Profile"
                            >
                              <span>{log.actorName}</span>
                              <ExternalLink
                                size={11}
                                className="text-gray-400 group-hover:text-[#E31E24] transition-colors"
                              />
                            </Link>
                          ) : (
                            <span className="font-bold text-gray-900">{log.actorName}</span>
                          )}
                        </div>
                        <p className="text-[11px] text-gray-400 truncate max-w-[220px]">
                          {log.actorEmail || "system-internal@pluxpc.com"}
                        </p>
                      </td>

                      {/* Role Badge */}
                      <td className="py-3.5 px-4 align-middle">
                        {renderRoleBadge(log.actorRole)}
                      </td>

                      {/* Action Badge */}
                      <td className="py-3.5 px-4 align-middle">
                        {renderActionBadge(log.actionLabel || log.action, log.result)}
                      </td>

                      {/* Module */}
                      <td className="py-3.5 px-4 text-gray-700 font-medium align-middle">
                        {log.moduleLabel || log.module}
                      </td>

                      {/* Date & Time */}
                      <td className="py-3.5 px-4 text-gray-500 text-[11px] font-mono whitespace-nowrap align-middle">
                        {formatDateTime(log.createdAt)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Expanded Row Accordion View ── */}
        {logs.some((l) => expandedRowIds.has(l.id)) && (
          <div className="border-t border-[#C5C9D0]">
            {logs
              .filter((log) => expandedRowIds.has(log.id))
              .map((log) => (
                <div
                  key={`expanded-${log.id}`}
                  className="bg-[#F8FAFC] border-b border-[#C5C9D0] p-4 sm:p-6 space-y-4"
                >
                  {/* Expanded Header */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#D1D5DB] pb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-700">Audit Record:</span>
                      <code className="text-xs font-mono bg-white px-2 py-0.5 rounded border border-[#BFC5CE] text-gray-800">
                        {log.id}
                      </code>
                    </div>

                    <div className="flex items-center gap-3">
                      {log.result === "success" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-[#E31E24] border border-red-200">
                          <CheckCircle2 size={13} />
                          <span>Status: Success</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                          <XCircle size={13} />
                          <span>Status: Failed ({log.failureReason || "Authentication / Security Error"})</span>
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => toggleRow(log.id)}
                        className="text-xs text-gray-500 hover:text-gray-900 underline cursor-pointer"
                      >
                        Close
                      </button>
                    </div>
                  </div>

                  {/* Grid Metadata Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                    {/* Actor Details */}
                    <div className="bg-white rounded-lg border border-[#BFC5CE] p-3.5 space-y-1.5 shadow-2xs">
                      <p className="font-bold uppercase text-[10px] tracking-wider text-gray-400">
                        Actor Information
                      </p>
                      <div>
                        <span className="text-gray-500">Name: </span>
                        <span className="font-semibold text-gray-800">{log.actorName}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Email: </span>
                        <span className="font-mono text-gray-700">{log.actorEmail || "N/A"}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Role: </span>
                        <span className="font-semibold capitalize text-gray-800">{log.actorRole}</span>
                      </div>
                      {log.actorId && (
                        <div>
                          <span className="text-gray-500">ID: </span>
                          <span className="font-mono text-gray-600">{log.actorId}</span>
                        </div>
                      )}
                    </div>

                    {/* Target Entity & Module */}
                    <div className="bg-white rounded-lg border border-[#BFC5CE] p-3.5 space-y-1.5 shadow-2xs">
                      <p className="font-bold uppercase text-[10px] tracking-wider text-gray-400">
                        Target & Action
                      </p>
                      <div>
                        <span className="text-gray-500">Module: </span>
                        <span className="font-semibold text-gray-800">{log.moduleLabel || log.module}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Action: </span>
                        <span className="font-semibold text-gray-800">{log.actionLabel || log.action}</span>
                      </div>
                      {log.entityType && (
                        <div>
                          <span className="text-gray-500">Entity: </span>
                          <span className="font-medium text-gray-700">{log.entityType} ({log.entityTitle || log.entityId || "N/A"})</span>
                        </div>
                      )}
                      <div>
                        <span className="text-gray-500">Timestamp: </span>
                        <span className="font-mono text-gray-700">{formatDateTime(log.createdAt)}</span>
                      </div>
                    </div>

                    {/* Network & Request Details */}
                    <div className="bg-white rounded-lg border border-[#BFC5CE] p-3.5 space-y-1.5 shadow-2xs">
                      <p className="font-bold uppercase text-[10px] tracking-wider text-gray-400">
                        Network & Origin
                      </p>
                      <div>
                        <span className="text-gray-500">Request: </span>
                        <code className="font-mono font-bold text-gray-800">{log.requestMethod} {log.requestPath || "/api"}</code>
                      </div>
                      <div>
                        <span className="text-gray-500">Client IP: </span>
                        <span className="font-mono text-gray-700">{log.ipAddress || "127.0.0.1"}</span>
                      </div>
                      <div className="truncate" title={log.userAgent}>
                        <span className="text-gray-500">User Agent: </span>
                        <span className="font-mono text-gray-600 truncate">{log.userAgent || "Browser Client"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Summary Description */}
                  <div className="bg-white rounded-lg border border-[#BFC5CE] p-3.5 shadow-2xs">
                    <p className="font-bold uppercase text-[10px] tracking-wider text-gray-400 mb-1">
                      Event Summary
                    </p>
                    <p className="text-xs text-gray-800 leading-relaxed font-medium">
                      {log.description}
                    </p>
                  </div>

                  {/* Changed Fields / Metadata Diff Viewer */}
                  {((log.changedFields && log.changedFields.length > 0) || (log.metadata && Object.keys(log.metadata).length > 0)) && (
                    <div className="bg-white rounded-lg border border-[#BFC5CE] p-3.5 shadow-2xs space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="font-bold uppercase text-[10px] tracking-wider text-gray-400">
                          Sanitized Parameters & Changed Attributes
                        </p>
                        <button
                          type="button"
                          onClick={() => handleCopy(log.id, JSON.stringify(log.metadata, null, 2))}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-600 hover:text-gray-900 cursor-pointer"
                        >
                          {copiedId === log.id ? (
                            <>
                              <Check size={12} className="text-[#E31E24]" />
                              <span className="text-[#E31E24]">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy size={12} />
                              <span>Copy JSON</span>
                            </>
                          )}
                        </button>
                      </div>

                      {log.changedFields && log.changedFields.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          <span className="text-[11px] text-gray-500 self-center mr-1">Modified Fields:</span>
                          {log.changedFields.map((field) => (
                            <span
                              key={field}
                              className="px-2 py-0.5 rounded bg-gray-100 text-gray-800 text-[11px] font-mono border border-[#BFC5CE]"
                            >
                              {field}
                            </span>
                          ))}
                        </div>
                      )}

                      {log.metadata && Object.keys(log.metadata).length > 0 && (
                        <pre className="bg-[#0F172A] text-[#E2E8F0] p-3 rounded-lg text-[11px] font-mono overflow-x-auto max-h-48 scrollbar-thin">
                          {JSON.stringify(log.metadata, null, 2)}
                        </pre>
                      )}
                    </div>
                  )}
                </div>
              ))}
          </div>
        )}

        {/* ── Table Footer & Server-Side Pagination Controls ── */}
        <div className="px-5 py-3.5 border-t border-[#C5C9D0] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white text-xs text-gray-500">
          <div className="flex items-center gap-3">
            <span>
              Showing {totalCount > 0 ? (page - 1) * limit + 1 : 0} to{" "}
              {Math.min(page * limit, totalCount)} of {totalCount.toLocaleString()} records
            </span>

            {/* Limit Selector */}
            <div className="flex items-center gap-1.5">
              <span>Show</span>
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
                className="px-2 py-1 text-xs bg-white border border-[#BFC5CE] rounded text-gray-700 focus:outline-none focus:border-[#111827] focus:ring-1 focus:ring-[#111827] cursor-pointer"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
              <span>per page</span>
            </div>
          </div>

          {/* Page Buttons */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 rounded-lg border border-[#BFC5CE] bg-white font-medium text-gray-700 hover:bg-gray-50 hover:border-[#111827] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              Previous
            </button>

            <span className="px-2 font-medium text-gray-700">
              Page {page} of {totalPages}
            </span>

            <button
              type="button"
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1.5 rounded-lg border border-[#BFC5CE] bg-white font-medium text-gray-700 hover:bg-gray-50 hover:border-[#111827] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
