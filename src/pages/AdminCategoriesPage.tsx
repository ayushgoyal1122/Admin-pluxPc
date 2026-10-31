import { useState, useEffect, useMemo } from "react";
import {
  Search,
  Plus,
  ChevronDown,
  Eye,
  Edit2,
  CheckCircle,
  AlertTriangle,
  X,
  Archive,
  RotateCcw,
} from "lucide-react";
import {
  adminGetCategories,
  adminCreateCategory,
  adminUpdateCategory,
  adminDeleteCategory,
  adminRestoreCategory,
} from "../services/api";
import { slugify, handleImageError } from "../utils";

// Format date to "01/09/2026, 06:29 pm" matching Image 1
function formatCategoryDate(dateStr?: string | Date) {
  if (!dateStr) return "29/10/2026, 05:20 pm";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "29/10/2026, 05:20 pm";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "pm" : "am";
  hours = hours % 12;
  hours = hours ? hours : 12;
  const strHours = String(hours).padStart(2, "0");
  return `${day}/${month}/${year}, ${strHours}:${minutes} ${ampm}`;
}

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"active" | "archived" | "all">("active");

  // Action dropdown state
  const [openActionId, setOpenActionId] = useState<string | null>(null);

  // Modal State
  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [activeCategory, setActiveCategory] = useState<any | null>(null);
  const [formName, setFormName] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [formImageUrl, setFormImageUrl] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [saving, setSaving] = useState(false);

  // Delete safety modal state
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  // Feedback notifications
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadCategories = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminGetCategories();
      if (res.success) {
        setCategories(res.data || []);
      } else {
        setError(res.message || "Failed to load categories");
      }
    } catch (err: any) {
      setError(err.message || "Network error loading categories");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  // Close Action dropdown when clicking outside or scrolling
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".action-menu-container")) {
        setOpenActionId(null);
      }
    };
    const handleScroll = () => {
      setOpenActionId(null);
    };

    document.addEventListener("mousedown", handleOutsideClick);
    window.addEventListener("scroll", handleScroll, true);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, []);

  const filteredCategories = useMemo(() => {
    return categories.filter((c) => {
      const matchesSearch =
        !search.trim() ||
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.slug.toLowerCase().includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && !c.isDeleted) ||
        (statusFilter === "archived" && c.isDeleted);

      return matchesSearch && matchesStatus;
    });
  }, [categories, search, statusFilter]);

  const openCreateModal = () => {
    setModalMode("create");
    setActiveCategory(null);
    setFormName("");
    setFormSlug("");
    setFormImageUrl("");
    setFormDesc("");
  };

  const openEditModal = (cat: any) => {
    setModalMode("edit");
    setActiveCategory(cat);
    setFormName(cat.name);
    setFormSlug(cat.slug);
    setFormImageUrl(cat.imageUrl);
    setFormDesc(cat.description || "");
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formImageUrl.trim()) {
      setFeedback({ type: "error", text: "Category name and image URL are required." });
      return;
    }

    setSaving(true);
    try {
      if (modalMode === "create") {
        const res = await adminCreateCategory({
          name: formName.trim(),
          slug: formSlug ? slugify(formSlug) : slugify(formName),
          imageUrl: formImageUrl.trim(),
          description: formDesc.trim(),
        });
        if (res.success) {
          setFeedback({ type: "success", text: `Category "${formName}" created successfully!` });
          setModalMode(null);
          loadCategories();
        } else {
          setFeedback({ type: "error", text: res.message || "Failed to create category." });
        }
      } else if (modalMode === "edit" && activeCategory) {
        const res = await adminUpdateCategory(activeCategory.id, {
          name: formName.trim(),
          slug: formSlug ? slugify(formSlug) : activeCategory.slug,
          imageUrl: formImageUrl.trim(),
          description: formDesc.trim(),
        });
        if (res.success) {
          setFeedback({ type: "success", text: `Category "${formName}" updated successfully!` });
          setModalMode(null);
          loadCategories();
        } else {
          setFeedback({ type: "error", text: res.message || "Failed to update category." });
        }
      }
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message || "Error saving category." });
    } finally {
      setSaving(false);
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  // Safe archive handler with backend check
  const handleArchiveCategory = async () => {
    if (!deleteTarget) return;

    if (deleteTarget.productCount > 0) {
      setFeedback({
        type: "error",
        text: `Cannot archive "${deleteTarget.name}". It contains ${deleteTarget.productCount} active products. Reassign or archive these products first.`,
      });
      setDeleteTarget(null);
      setTimeout(() => setFeedback(null), 5000);
      return;
    }

    setDeleting(true);
    try {
      const res = await adminDeleteCategory(deleteTarget.id);
      if (res.success) {
        setCategories((prev) =>
          prev.map((c) => (c.id === deleteTarget.id ? { ...c, isDeleted: true, deletedAt: new Date().toISOString() } : c))
        );
        setFeedback({
          type: "success",
          text: `Category "${deleteTarget.name}" archived successfully along with child subcategories.`,
        });
        setDeleteTarget(null);
      } else {
        setFeedback({ type: "error", text: res.message || "Failed to archive category." });
      }
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message || "Error archiving category." });
    } finally {
      setDeleting(false);
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  // Restore archived category
  const handleRestoreCategory = async (cat: any) => {
    setRestoringId(cat.id);
    try {
      const res = await adminRestoreCategory(cat.id);
      if (res.success) {
        setCategories((prev) =>
          prev.map((c) => (c.id === cat.id ? { ...c, isDeleted: false, deletedAt: null } : c))
        );
        setFeedback({
          type: "success",
          text: `Category "${cat.name}" restored successfully.`,
        });
      } else {
        setFeedback({ type: "error", text: res.message || "Failed to restore category." });
      }
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message || "Error restoring category." });
    } finally {
      setRestoringId(null);
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans pb-12">
      {/* ── Top Header Card (Manage Categories) ── */}
      <div className="bg-white border border-gray-200 rounded-xl px-6 py-5 flex items-center justify-between shadow-xs">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
          Manage Categories
        </h1>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs shadow-2xs">
          <span className="font-extrabold text-[#E31E24] text-sm">{categories.length}</span>
          <span className="text-gray-500 font-medium">Total Categories</span>
        </div>
      </div>

      {/* ── Feedback Alerts ── */}
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
          <button onClick={() => setFeedback(null)} className="text-gray-500 hover:text-gray-700 cursor-pointer">
            <X size={15} />
          </button>
        </div>
      )}

      {/* ── Main Categories Container Card ── */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-xs overflow-visible">
        {/* Top Search Bar, Status Filter & Add Category Button */}
        <div className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200">
          <div className="flex items-center gap-3 flex-1 max-w-lg">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search category..."
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 transition-colors"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-xs font-semibold text-gray-800 focus:outline-none focus:border-gray-900"
            >
              <option value="active">Active Categories</option>
              <option value="archived">Archived Categories</option>
              <option value="all">All Categories</option>
            </select>
          </div>
          <button
            onClick={openCreateModal}
            className="flex items-center justify-center gap-2 text-sm font-semibold py-2.5 px-5 rounded-lg bg-[#E31E24] hover:bg-[#C9191E] text-white transition-all shadow-xs cursor-pointer flex-shrink-0"
          >
            <Plus size={16} />
            <span>Add Category</span>
          </button>
        </div>

        {/* Categories Table */}
        {loading ? (
          <div className="py-24 text-center text-[#6B7280] text-sm flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
            <span>Loading categories...</span>
          </div>
        ) : error ? (
          <div className="py-24 text-center text-rose-600 text-sm">
            <p>{error}</p>
            <button onClick={loadCategories} className="mt-3 text-xs font-semibold underline cursor-pointer">
              Try again
            </button>
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="py-24 text-center text-[#6B7280] text-sm">
            No categories found matching your query.
          </div>
        ) : (
          <div className="overflow-x-auto min-h-[460px]">
            <table className="w-full text-left text-sm text-gray-800">
              <thead className="bg-white border-b border-gray-200 text-[11px] font-bold text-gray-600 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4 w-16 text-center sm:text-left">S.NO.</th>
                  <th className="px-6 py-4 w-36">ACTION</th>
                  <th className="px-6 py-4 w-24 text-center sm:text-left">ICON</th>
                  <th className="px-6 py-4">CATEGORY NAME</th>
                  <th className="px-6 py-4 text-center w-28">PLACES</th>
                  <th className="px-6 py-4 text-right pr-8">CREATED DATE & TIME</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-sm">
                {filteredCategories.map((c, idx) => (
                  <tr key={c.id} className="hover:bg-gray-50/80 transition-colors">
                    {/* S.NO. */}
                    <td className="px-6 py-4.5 font-bold text-gray-900 text-sm">
                      {idx + 1}
                    </td>

                    {/* ACTION Dropdown Button */}
                    <td className="px-6 py-4.5">
                      <div className="relative action-menu-container inline-block text-left">
                        <button
                          type="button"
                          onClick={() => setOpenActionId(openActionId === c.id ? null : c.id)}
                          className="bg-[#E31E24] hover:bg-[#C9191E] text-white text-xs font-semibold px-4 py-2 rounded-lg flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
                        >
                          <span>Action</span>
                          <ChevronDown
                            size={14}
                            className={openActionId === c.id ? "rotate-180 transition-transform" : "transition-transform"}
                          />
                        </button>

                        {/* Floating Action Dropdown Menu */}
                        {openActionId === c.id && (
                          <div className="absolute left-0 top-full mt-1.5 w-36 bg-white border border-gray-200 rounded-xl shadow-xl py-1 z-40 divide-y divide-gray-100">
                            <div className="py-1">
                              {!c.isDeleted && (
                                <a
                                  href={`http://localhost:5173/products?category=${c.slug}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={() => setOpenActionId(null)}
                                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors cursor-pointer text-left"
                                >
                                  <Eye size={14} className="text-gray-500" />
                                  <span>View</span>
                                </a>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenActionId(null);
                                  openEditModal(c);
                                }}
                                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors cursor-pointer text-left"
                              >
                                <Edit2 size={14} className="text-gray-500" />
                                <span>Edit</span>
                              </button>
                            </div>
                            <div className="py-1">
                              {!c.isDeleted ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenActionId(null);
                                    setDeleteTarget(c);
                                  }}
                                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer text-left"
                                >
                                  <Archive size={14} className="text-amber-500" />
                                  <span>Archive</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenActionId(null);
                                    handleRestoreCategory(c);
                                  }}
                                  disabled={restoringId === c.id}
                                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer text-left"
                                >
                                  <RotateCcw size={14} className={restoringId === c.id ? "animate-spin text-emerald-600" : "text-emerald-500"} />
                                  <span>{restoringId === c.id ? "Restoring..." : "Restore"}</span>
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* ICON (Rounded Square Tile like Image 1) */}
                    <td className="px-6 py-4.5">
                      <div className="w-12 h-12 rounded-xl bg-[#F8FAFC] border border-gray-200/90 flex items-center justify-center p-1 shadow-xs mx-auto sm:mx-0 flex-shrink-0">
                        <img
                          src={c.imageUrl}
                          alt={c.name}
                          className="w-full h-full object-cover rounded-lg"
                          onError={(e) => handleImageError(e, c.name)}
                        />
                      </div>
                    </td>

                    {/* CATEGORY NAME (Bold Uppercase with status badge) */}
                    <td className="px-6 py-4.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-gray-900 tracking-wide uppercase">
                          {c.name}
                        </span>
                        {c.isDeleted && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <Archive size={10} /> Archived
                          </span>
                        )}
                      </div>
                    </td>

                    {/* PLACES (Pill Badge matching Image 1) */}
                    <td className="px-6 py-4.5 text-center">
                      <span className="inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-600 border border-blue-200 shadow-2xs">
                        {(c.productCount ?? 0) > 0 ? `${c.productCount}+` : "0"}
                      </span>
                    </td>

                    {/* CREATED DATE & TIME (Formatted timestamp) */}
                    <td className="px-6 py-4.5 text-right pr-8">
                      <span className="text-xs font-medium text-gray-600">
                        {formatCategoryDate(c.createdAt)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Add / Edit Category Modal ── */}
      {modalMode && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-gray-300 rounded-2xl p-6 max-w-lg w-full shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 pb-4 mb-4">
              <h3 className="text-base font-bold text-gray-900">
                {modalMode === "create" ? "Add Category" : `Edit "${activeCategory?.name}"`}
              </h3>
              <button
                onClick={() => setModalMode(null)}
                className="text-gray-400 hover:text-gray-700 cursor-pointer p-1"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Category Name <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => {
                    setFormName(e.target.value);
                    if (modalMode === "create") setFormSlug(slugify(e.target.value));
                  }}
                  placeholder="e.g. Smart Watches"
                  required
                  className="w-full px-3.5 py-2 text-sm bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Category Slug <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  value={formSlug}
                  onChange={(e) => setFormSlug(e.target.value)}
                  placeholder="smartwatches"
                  required
                  className="w-full px-3.5 py-2 text-sm bg-white border border-gray-300 rounded-lg text-gray-900 font-mono focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Thumbnail Image URL <span className="text-rose-600">*</span>
                </label>
                <input
                  type="url"
                  value={formImageUrl}
                  onChange={(e) => setFormImageUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  required
                  className="w-full px-3.5 py-2 text-sm bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Description <span className="text-xs text-gray-500 font-normal">(Optional)</span>
                </label>
                <textarea
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Brief merchandising description..."
                  rows={3}
                  className="w-full px-3.5 py-2 text-sm bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setModalMode(null)}
                  disabled={saving}
                  className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-xs font-semibold text-gray-700 border border-gray-300 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-lg bg-[#E31E24] hover:bg-[#C9191E] text-xs font-semibold text-white transition-colors flex items-center gap-2 cursor-pointer shadow-xs"
                >
                  {saving ? "Saving..." : modalMode === "create" ? "Create Category" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Archive Confirmation Modal ── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-gray-300 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mb-4">
              <Archive size={22} />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Archive Category</h3>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to archive category{" "}
              <strong className="text-gray-900 font-semibold">"{deleteTarget.name}"</strong>?
              This will archive the category and all its child subcategories. Archived categories are hidden from storefront navigation, and products cannot be created under them. You can restore it anytime.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-xs font-semibold text-gray-700 border border-gray-300 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleArchiveCategory}
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
