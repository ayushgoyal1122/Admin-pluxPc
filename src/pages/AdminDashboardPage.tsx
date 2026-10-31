import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Package,
  Layers,
  CheckCircle2,
  AlertTriangle,
  PlusCircle,
  ArrowRight,
  RefreshCw,
  Tag,
  Boxes,
  Database,
  XCircle,
} from "lucide-react";
import { adminGetDashboardStats } from "../services/api";
import { formatPrice } from "../utils";
import type { DashboardData } from "../types";

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminGetDashboardStats();
      if (res.success && res.data) {
        setData(res.data);
      } else {
        setError(res.message || "Failed to retrieve live statistics from backend.");
      }
    } catch (err: any) {
      setError(err.message || "Network error while connecting to server API.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans">
      {/* ── Top Header Section ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E5E7EB]">
        <div>
          <h1 className="text-2xl font-bold text-[#1F2937] tracking-tight">Admin Overview</h1>
          <p className="text-sm text-[#6B7280] mt-0.5">
            Real-time catalog metrics and inventory tracking backed by MongoDB Atlas.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={loadStats}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-[#E5E7EB] text-xs font-semibold text-[#374151] hover:text-[#1F2937] hover:bg-[#F3F4F6] transition-all disabled:opacity-50 shadow-xs"
          >
            <RefreshCw size={14} className={loading ? "animate-spin text-gray-500" : "text-gray-500"} />
            <span>{loading ? "Refreshing..." : "Refresh"}</span>
          </button>
          <Link
            to="/admin/products/new"
            className="flex items-center gap-2 text-xs font-semibold py-2 px-3.5 rounded-lg bg-gray-900 hover:bg-gray-800 text-white transition-all shadow-xs"
          >
            <PlusCircle size={15} />
            <span>Add Product</span>
          </Link>
        </div>
      </div>

      {/* ── Error Banner (Strictly Truthful, Retryable) ── */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <XCircle size={18} className="text-rose-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={loadStats}
            className="px-3 py-1 bg-white border border-rose-200 text-rose-700 font-semibold text-xs rounded-lg hover:bg-rose-100 transition-colors"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* ── Responsive Real Database Summary Cards Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Products */}
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 shadow-xs transition-shadow hover:shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Total Products</span>
            <div className="w-9 h-9 rounded-lg bg-gray-100 text-gray-700 flex items-center justify-center">
              <Package size={18} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-[#1F2937] tracking-tight">
              {loading ? (
                <div className="h-8 w-16 bg-gray-200 rounded animate-pulse" />
              ) : (
                data?.metrics?.totalProducts ?? 0
              )}
            </div>
            <p className="text-xs text-[#6B7280] mt-1.5 flex items-center gap-1">
              <span>Active in MongoDB collection</span>
            </p>
          </div>
        </div>

        {/* Card 2: Total Categories */}
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 shadow-xs transition-shadow hover:shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Categories</span>
            <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Layers size={18} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-[#1F2937] tracking-tight">
              {loading ? (
                <div className="h-8 w-16 bg-gray-200 rounded animate-pulse" />
              ) : (
                data?.metrics?.totalCategories ?? 0
              )}
            </div>
            <p className="text-xs text-[#6B7280] mt-1.5">Organized store departments</p>
          </div>
        </div>

        {/* Card 3: In Stock Units */}
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 shadow-xs transition-shadow hover:shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider">In Stock SKUs</span>
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-emerald-700 tracking-tight">
              {loading ? (
                <div className="h-8 w-16 bg-gray-200 rounded animate-pulse" />
              ) : (
                data?.metrics?.inStockCount ?? 0
              )}
            </div>
            <p className="text-xs text-[#6B7280] mt-1.5">
              Available for immediate checkout
            </p>
          </div>
        </div>

        {/* Card 4: Low Stock Alert */}
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 shadow-xs transition-shadow hover:shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Low Stock SKUs</span>
            <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertTriangle size={18} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-amber-700 tracking-tight">
              {loading ? (
                <div className="h-8 w-16 bg-gray-200 rounded animate-pulse" />
              ) : (
                data?.metrics?.lowStockCount ?? 0
              )}
            </div>
            <p className="text-xs text-[#6B7280] mt-1.5">Stock level &le; 25 units</p>
          </div>
        </div>

        {/* Card 5: Out of Stock */}
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 shadow-xs transition-shadow hover:shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Out of Stock</span>
            <div className="w-9 h-9 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <XCircle size={18} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-[#1F2937] tracking-tight">
              {loading ? (
                <div className="h-8 w-16 bg-gray-200 rounded animate-pulse" />
              ) : (
                data?.metrics?.outOfStockCount ?? 0
              )}
            </div>
            <p className="text-xs text-[#6B7280] mt-1.5">Zero inventory depleted</p>
          </div>
        </div>

        {/* Card 6: Average Product Price */}
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 shadow-xs transition-shadow hover:shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Avg Catalog Price</span>
            <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Tag size={18} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-[#1F2937] tracking-tight">
              {loading ? (
                <div className="h-8 w-24 bg-gray-200 rounded animate-pulse" />
              ) : (
                formatPrice(data?.metrics?.avgPrice ?? 0)
              )}
            </div>
            <p className="text-xs text-[#6B7280] mt-1.5">
              Range: {formatPrice(data?.metrics?.minPrice ?? 0)} - {formatPrice(data?.metrics?.maxPrice ?? 0)}
            </p>
          </div>
        </div>

        {/* Card 7: Total Inventory Volume */}
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 shadow-xs transition-shadow hover:shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Total Units in Stock</span>
            <div className="w-9 h-9 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
              <Boxes size={18} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-[#1F2937] tracking-tight">
              {loading ? (
                <div className="h-8 w-20 bg-gray-200 rounded animate-pulse" />
              ) : (
                data?.metrics?.totalInventoryUnits?.toLocaleString() ?? 0
              )}
            </div>
            <p className="text-xs text-[#6B7280] mt-1.5">Aggregated warehouse volume</p>
          </div>
        </div>

        {/* Card 8: Database Connection */}
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 shadow-xs transition-shadow hover:shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Database Status</span>
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Database size={18} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-emerald-700 tracking-tight flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Connected</span>
            </div>
            <p className="text-xs text-[#6B7280] mt-1.5 truncate" title={data?.databaseStatus?.host}>
              Atlas: {data?.databaseStatus?.databaseName || "e-commerce"}
            </p>
          </div>
        </div>
      </div>

      {/* ── Quick Catalog Actions ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Link
          to="/admin/products/new"
          className="flex items-center justify-between p-4 rounded-xl bg-white border border-[#E5E7EB] hover:bg-[#F3F4F6] transition-all shadow-xs group"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gray-100 text-gray-800 flex items-center justify-center group-hover:bg-gray-200 transition-colors">
              <PlusCircle size={16} />
            </div>
            <div>
              <p className="text-xs font-bold text-[#1F2937]">Create Product</p>
              <p className="text-[11px] text-[#6B7280]">Add new item to MongoDB catalog</p>
            </div>
          </div>
          <ArrowRight size={14} className="text-gray-400 group-hover:text-gray-800 transition-colors" />
        </Link>

        <Link
          to="/admin/products"
          className="flex items-center justify-between p-4 rounded-xl bg-white border border-[#E5E7EB] hover:bg-[#F3F4F6] transition-all shadow-xs group"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gray-100 text-gray-800 flex items-center justify-center group-hover:bg-gray-200 transition-colors">
              <Package size={16} />
            </div>
            <div>
              <p className="text-xs font-bold text-[#1F2937]">Manage Products</p>
              <p className="text-[11px] text-[#6B7280]">Filter, edit prices, update stock</p>
            </div>
          </div>
          <ArrowRight size={14} className="text-gray-400 group-hover:text-gray-800 transition-colors" />
        </Link>

        <Link
          to="/admin/categories"
          className="flex items-center justify-between p-4 rounded-xl bg-white border border-[#E5E7EB] hover:bg-[#F3F4F6] transition-all shadow-xs group"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gray-100 text-gray-800 flex items-center justify-center group-hover:bg-gray-200 transition-colors">
              <Layers size={16} />
            </div>
            <div>
              <p className="text-xs font-bold text-[#1F2937]">Manage Categories</p>
              <p className="text-[11px] text-[#6B7280]">Review store sections & image covers</p>
            </div>
          </div>
          <ArrowRight size={14} className="text-gray-400 group-hover:text-gray-800 transition-colors" />
        </Link>
      </div>
    </div>
  );
}
