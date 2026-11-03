import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  PlusCircle,
  Search,
  Filter,
  Edit2,
  ExternalLink,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  X,
  Archive,
  RotateCcw,
} from "lucide-react";
import {
  adminGetProducts,
  adminDeleteProduct,
  adminRestoreProduct,
  fetchCategories,
} from "../services/api";
import { formatPrice, handleImageError } from "../utils";
import type { Category } from "../types";

export default function AdminProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [stockFilter, setStockFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"active" | "archived" | "all">("active");

  // Archive modal state
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [prodRes, catRes] = await Promise.all([
        adminGetProducts(),
        fetchCategories(),
      ]);

      if (prodRes.success) {
        setProducts(prodRes.data || []);
      } else {
        setError(prodRes.message || "Failed to load products");
      }

      if (catRes.success) {
        setCategories(catRes.data || []);
      }
    } catch (err: any) {
      setError(err.message || "Failed to communicate with server");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered products list
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        !search.trim() ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.slug.toLowerCase().includes(search.toLowerCase()) ||
        (p.categoryLabel && p.categoryLabel.toLowerCase().includes(search.toLowerCase()));

      const matchesCat = !selectedCategory || p.category === selectedCategory;

      const matchesStock =
        stockFilter === "all" ||
        (stockFilter === "in" && p.inStock) ||
        (stockFilter === "out" && !p.inStock);

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && !p.isDeleted) ||
        (statusFilter === "archived" && p.isDeleted);

      return matchesSearch && matchesCat && matchesStock && matchesStatus;
    });
  }, [products, search, selectedCategory, stockFilter, statusFilter]);

  const handleArchive = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await adminDeleteProduct(deleteTarget.id);
      if (res.success) {
        setProducts((prev) =>
          prev.map((p) => (p.id === deleteTarget.id ? { ...p, isDeleted: true, deletedAt: new Date().toISOString() } : p))
        );
        setFeedback({ type: "success", text: `Product "${deleteTarget.name}" archived successfully.` });
        setDeleteTarget(null);
      } else {
        setFeedback({ type: "error", text: res.message || "Failed to archive product." });
      }
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message || "Error archiving product." });
    } finally {
      setDeleting(false);
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  const handleRestore = async (product: any) => {
    setRestoringId(product.id);
    try {
      const res = await adminRestoreProduct(product.id);
      if (res.success) {
        setProducts((prev) =>
          prev.map((p) => (p.id === product.id ? { ...p, isDeleted: false, deletedAt: null } : p))
        );
        setFeedback({ type: "success", text: `Product "${product.name}" restored successfully.` });
      } else {
        setFeedback({ type: "error", text: res.message || "Failed to restore product." });
      }
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message || "Error restoring product." });
    } finally {
      setRestoringId(null);
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#C5C9D0]">
        <div>
          <h1 className="text-2xl font-bold text-[#1F2937] tracking-tight">Products Management</h1>
          <p className="text-sm text-[#6B7280] mt-0.5">
            Manage your store's inventory, pricing, availability, and storefront merchandising.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-[#BFC5CE] text-xs font-semibold text-[#374151] hover:text-[#1F2937] hover:bg-[#F3F4F6] transition-all disabled:opacity-50 shadow-xs"
          >
            <RefreshCw size={14} className={loading ? "animate-spin text-gray-500" : "text-gray-500"} />
            <span>Reload</span>
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

      {/* ── Feedback Alert ── */}
      {feedback && (
        <div
          className={`p-4 rounded-xl text-sm flex items-center justify-between transition-all shadow-xs ${
            feedback.type === "success"
              ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
              : "bg-rose-50 border border-rose-200 text-rose-800"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {feedback.type === "success" ? (
              <CheckCircle size={16} className="text-emerald-600" />
            ) : (
              <AlertTriangle size={16} className="text-rose-600" />
            )}
            <span>{feedback.text}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-gray-500 hover:text-gray-700">
            <X size={15} />
          </button>
        </div>
      )}

      {/* ── Filter and Search Bar ── */}
      <div className="bg-white border border-[#C5C9D0] rounded-xl p-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between shadow-2xs">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products by name, slug, tag..."
            className="w-full pl-10 pr-4 py-2 text-xs bg-white border border-[#BFC5CE] rounded-lg text-[#1F2937] placeholder-gray-400 focus:outline-none focus:border-[#111827] focus:ring-1 focus:ring-[#111827] transition-colors"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-[#6B7280]">
            <Filter size={13} />
            <span>Category:</span>
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-1.5 text-xs bg-white border border-[#BFC5CE] rounded-lg text-[#1F2937] focus:outline-none focus:border-[#111827]"
          >
            <option value="">All Categories ({categories.length})</option>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value)}
            className="px-3 py-1.5 text-xs bg-white border border-[#BFC5CE] rounded-lg text-[#1F2937] focus:outline-none focus:border-[#111827]"
          >
            <option value="all">All Stock Statuses</option>
            <option value="in">In Stock Only</option>
            <option value="out">Out of Stock Only</option>
          </select>

          {/* Lifecycle Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-1.5 text-xs bg-white border border-[#BFC5CE] rounded-lg text-[#1F2937] font-semibold focus:outline-none focus:border-[#111827]"
          >
            <option value="active">Active Products</option>
            <option value="archived">Archived Products</option>
            <option value="all">All (Active & Archived)</option>
          </select>

          {(search || selectedCategory || stockFilter !== "all" || statusFilter !== "active") && (
            <button
              onClick={() => {
                setSearch("");
                setSelectedCategory("");
                setStockFilter("all");
                setStatusFilter("active");
              }}
              className="text-xs text-[#6B7280] hover:text-[#1F2937] underline ml-1 cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* ── Products Table ── */}
      <div className="bg-white border border-[#C5C9D0] rounded-xl overflow-hidden shadow-2xs">
        {loading ? (
          <div className="py-24 text-center text-[#6B7280] text-sm flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
            <span>Loading products catalog...</span>
          </div>
        ) : error ? (
          <div className="py-24 text-center text-rose-600 text-sm">
            <p>{error}</p>
            <button onClick={loadData} className="mt-3 text-xs font-semibold underline">
              Try again
            </button>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="py-24 text-center text-[#6B7280] text-sm">
            No products match the selected criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-[#1F2937]">
              <thead className="bg-[#F9FAFB] text-[11px] font-bold text-[#6B7280] uppercase tracking-wider border-b border-[#BFC5CE]">
                <tr>
                  <th className="px-5 py-3.5">Product</th>
                  <th className="px-5 py-3.5">Category</th>
                  <th className="px-5 py-3.5">Price & Discount</th>
                  <th className="px-5 py-3.5">Merchandising</th>
                  <th className="px-5 py-3.5">Stock</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D1D5DB]">
                {filteredProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-[#F9FAFB] transition-colors">
                    {/* Product info */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={p.imageUrl}
                          alt={p.name}
                          className="w-12 h-12 rounded-lg object-cover bg-gray-100 border border-[#BFC5CE] flex-shrink-0"
                          onError={(e) => handleImageError(e, p.category || p.name)}
                        />
                        <div className="max-w-xs">
                          <p className="font-semibold text-xs text-[#1F2937] truncate">{p.name}</p>
                          <p className="text-[11px] text-[#6B7280] truncate font-mono">/{p.slug}</p>
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="px-5 py-4">
                      <span className="px-2.5 py-1 rounded bg-gray-100 border border-[#BFC5CE] text-xs font-medium text-gray-700">
                        {p.categoryLabel || p.category}
                      </span>
                    </td>

                    {/* Price */}
                    <td className="px-5 py-4">
                      <div className="font-bold text-xs text-[#1F2937]">{formatPrice(p.price)}</div>
                      {p.originalPrice && (
                        <div className="text-[11px] text-[#6B7280] line-through">
                          {formatPrice(p.originalPrice)}
                        </div>
                      )}
                    </td>

                    {/* Merchandising & Badges */}
                    <td className="px-5 py-4">
                      <div className="flex flex-col gap-1 items-start">
                        {p.badge && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-800 border border-[#BFC5CE]">
                            {p.badgeIcon && <span>{p.badgeIcon}</span>}
                            <span>{p.badge}</span>
                          </span>
                        )}
                        {p.featureTag && (
                          <span className="text-[11px] text-[#6B7280] font-medium">
                            {p.featureTag}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Stock & Lifecycle Status */}
                    <td className="px-5 py-4">
                      {p.isDeleted ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          <Archive size={12} className="text-amber-600" />
                          Archived
                        </span>
                      ) : p.inStock ? (
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                          (p.stockQuantity ?? 50) <= 25
                            ? "bg-red-50 text-[#E31E24] border-red-200"
                            : "bg-gray-100 text-gray-800 border-[#BFC5CE]"
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            (p.stockQuantity ?? 50) <= 25 ? "bg-[#E31E24]" : "bg-gray-900"
                          }`} />
                          In Stock ({p.stockQuantity ?? 0})
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-[#E31E24] border border-red-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#E31E24]" />
                          Out of Stock
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {!p.isDeleted && (
                          <>
                            <a
                              href={`http://localhost:5173/products/${p.slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="View on Storefront"
                              className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                            >
                              <ExternalLink size={15} />
                            </a>
                            <Link
                              to={`/admin/products/${p.id}/edit`}
                              title="Edit Product"
                              className="p-1.5 text-gray-400 hover:text-[#E31E24] hover:bg-red-50 rounded-md transition-colors"
                            >
                              <Edit2 size={15} />
                            </Link>
                            <button
                              onClick={() => setDeleteTarget(p)}
                              title="Archive Product"
                              className="p-1.5 text-gray-400 hover:text-[#E31E24] hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                            >
                              <Archive size={15} />
                            </button>
                          </>
                        )}
                        {p.isDeleted && (
                          <button
                            onClick={() => handleRestore(p)}
                            disabled={restoringId === p.id}
                            title="Restore Product to Active"
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-gray-900 bg-gray-100 hover:bg-gray-200 border border-[#BFC5CE] rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                          >
                            <RotateCcw size={13} className={restoringId === p.id ? "animate-spin" : ""} />
                            <span>{restoringId === p.id ? "Restoring..." : "Restore"}</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Archive Confirmation Modal ── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#AEB6C2] rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mb-4">
              <Archive size={22} />
            </div>
            <h3 className="text-lg font-bold text-[#1F2937] mb-2">Archive Product</h3>
            <p className="text-sm text-[#6B7280] mb-6">
              Are you sure you want to archive{" "}
              <strong className="text-gray-900 font-semibold">"{deleteTarget.name}"</strong>?
              This product will be hidden from customer storefront queries and cannot be purchased or added to cart.
              Historical orders remain preserved, and you can restore this product at any time.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-xs font-semibold text-gray-700 border border-[#BFC5CE] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleArchive}
                disabled={deleting}
                className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-xs font-semibold text-white transition-colors flex items-center gap-2 cursor-pointer shadow-xs"
              >
                {deleting ? "Archiving..." : "Confirm Archive"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
