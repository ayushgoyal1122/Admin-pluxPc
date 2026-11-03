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
  adminGetSubCategories,
  adminCreateSubCategory,
  adminUpdateSubCategory,
  adminDeleteSubCategory,
  adminRestoreSubCategory,
  fetchCategories,
} from "../services/api";
import { slugify, handleImageError } from "../utils";
import type { Category, SubCategory } from "../types";

// Format date matching the reference screenshot: "10/10/2026, 05:30 am"
function formatSubCategoryDate(dateStr?: string | Date) {
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

export default function AdminSubCategoriesPage() {
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [statusFilter, setStatusFilter] = useState<"active" | "archived" | "all">("active");

  // Action dropdown state
  const [openActionId, setOpenActionId] = useState<string | null>(null);

  // Modal State
  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [activeSubCat, setActiveSubCat] = useState<SubCategory | null>(null);
  const [formName, setFormName] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formImageUrl, setFormImageUrl] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [saving, setSaving] = useState(false);

  // Delete safety modal state
  const [deleteTarget, setDeleteTarget] = useState<SubCategory | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  // Feedback notifications
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Load SubCategories and Categories from backend
  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [subRes, catRes] = await Promise.all([
        adminGetSubCategories(),
        fetchCategories(),
      ]);

      if (subRes.success) {
        setSubCategories(subRes.data || []);
      } else {
        setError(subRes.message || "Failed to load subcategories");
      }

      if (catRes.success && catRes.data) {
        setCategories(catRes.data);
      }
    } catch (err: any) {
      setError(err.message || "Network error connecting to backend");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
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

  // Client-side filtered list
  const filteredSubCategories = useMemo(() => {
    return subCategories.filter((sc) => {
      const matchesSearch =
        !search.trim() ||
        sc.name.toLowerCase().includes(search.toLowerCase()) ||
        sc.slug.toLowerCase().includes(search.toLowerCase()) ||
        (sc.categoryName && sc.categoryName.toLowerCase().includes(search.toLowerCase())) ||
        sc.category.toLowerCase().includes(search.toLowerCase());

      const matchesCat = !selectedCategory || sc.category === selectedCategory;

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && !sc.isDeleted) ||
        (statusFilter === "archived" && sc.isDeleted);

      return matchesSearch && matchesCat && matchesStatus;
    });
  }, [subCategories, search, selectedCategory, statusFilter]);

  const openCreateModal = () => {
    setModalMode("create");
    setActiveSubCat(null);
    setFormName("");
    setFormSlug("");
    setFormCategory(categories[0]?.slug || "earbuds");
    setFormImageUrl("");
    setFormDesc("");
  };

  const openEditModal = (sc: SubCategory) => {
    setModalMode("edit");
    setActiveSubCat(sc);
    setFormName(sc.name);
    setFormSlug(sc.slug);
    setFormCategory(sc.category);
    setFormImageUrl(sc.imageUrl);
    setFormDesc(sc.description || "");
  };

  const handleSaveSubCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formCategory || !formImageUrl.trim()) {
      setFeedback({ type: "error", text: "Subcategory name, parent category, and image URL are required." });
      return;
    }

    const parentCat = categories.find((c) => c.slug === formCategory);
    const categoryName = parentCat ? parentCat.name : formCategory.toUpperCase();

    setSaving(true);
    try {
      if (modalMode === "create") {
        const res = await adminCreateSubCategory({
          name: formName.trim(),
          slug: formSlug ? slugify(formSlug) : slugify(formName),
          category: formCategory,
          categoryName,
          imageUrl: formImageUrl.trim(),
          description: formDesc.trim(),
        });
        if (res.success) {
          setFeedback({ type: "success", text: `Subcategory "${formName}" created successfully!` });
          setModalMode(null);
          loadData();
        } else {
          setFeedback({ type: "error", text: res.message || "Failed to create subcategory." });
        }
      } else if (modalMode === "edit" && activeSubCat) {
        const res = await adminUpdateSubCategory(activeSubCat.id, {
          name: formName.trim(),
          slug: formSlug ? slugify(formSlug) : activeSubCat.slug,
          category: formCategory,
          categoryName,
          imageUrl: formImageUrl.trim(),
          description: formDesc.trim(),
        });
        if (res.success) {
          setFeedback({ type: "success", text: `Subcategory "${formName}" updated successfully!` });
          setModalMode(null);
          loadData();
        } else {
          setFeedback({ type: "error", text: res.message || "Failed to update subcategory." });
        }
      }
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message || "Error saving subcategory." });
    } finally {
      setSaving(false);
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  // Safe archive handler
  const handleArchiveSubCategory = async () => {
    if (!deleteTarget) return;

    setDeleting(true);
    try {
      const res = await adminDeleteSubCategory(deleteTarget.id);
      if (res.success) {
        setSubCategories((prev) =>
          prev.map((sc) => (sc.id === deleteTarget.id ? { ...sc, isDeleted: true, deletedAt: new Date().toISOString() } : sc))
        );
        setFeedback({ type: "success", text: `Subcategory "${deleteTarget.name}" archived successfully.` });
        setDeleteTarget(null);
      } else {
        setFeedback({ type: "error", text: res.message || "Failed to archive subcategory." });
      }
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message || "Error archiving subcategory." });
    } finally {
      setDeleting(false);
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  // Restore archived subcategory
  const handleRestoreSubCategory = async (sc: SubCategory) => {
    setRestoringId(sc.id);
    try {
      const res = await adminRestoreSubCategory(sc.id);
      if (res.success) {
        setSubCategories((prev) =>
          prev.map((item) => (item.id === sc.id ? { ...item, isDeleted: false, deletedAt: null } : item))
        );
        setFeedback({ type: "success", text: `Subcategory "${sc.name}" restored successfully.` });
      } else {
        setFeedback({ type: "error", text: res.message || "Failed to restore subcategory." });
      }
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message || "Error restoring subcategory." });
    } finally {
      setRestoringId(null);
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans pb-12">
      {/* ── Top Header Card (Manage Sub Categories) ── */}
      <div className="bg-white border border-[#C5C9D0] rounded-xl px-6 py-5 flex items-center justify-between shadow-2xs">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
          Manage Sub Categories
        </h1>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#BFC5CE] bg-white text-xs shadow-2xs">
          <span className="font-extrabold text-[#E31E24] text-sm">{subCategories.length}</span>
          <span className="text-gray-500 font-medium">Total Sub Categories</span>
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

      {/* ── Main Subcategories Container Card ── */}
      <div className="bg-white border border-[#C5C9D0] rounded-xl shadow-2xs overflow-visible">
        {/* Top Search Bar & Add Sub Category Button */}
        <div className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#C5C9D0]">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1 max-w-2xl">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search sub category..."
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#BFC5CE] rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#111827] focus:ring-1 focus:ring-[#111827] transition-colors"
              />
            </div>

            {/* Optional Parent Category Filter */}
            <div className="relative sm:w-44">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2.5 text-xs bg-white border border-[#BFC5CE] rounded-lg text-gray-700 focus:outline-none focus:border-[#111827] focus:ring-1 focus:ring-[#111827] cursor-pointer"
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Lifecycle Status Filter */}
            <div className="relative sm:w-40">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="w-full px-3 py-2.5 text-xs bg-white border border-[#BFC5CE] rounded-lg text-gray-800 font-semibold focus:outline-none focus:border-[#111827] focus:ring-1 focus:ring-[#111827] cursor-pointer"
              >
                <option value="active">Active Only</option>
                <option value="archived">Archived Only</option>
                <option value="all">All Statuses</option>
              </select>
            </div>
          </div>

          <button
            onClick={openCreateModal}
            className="flex items-center justify-center gap-2 text-sm font-semibold py-2.5 px-5 rounded-lg bg-[#E31E24] hover:bg-[#C9191E] text-white transition-all shadow-xs cursor-pointer flex-shrink-0"
          >
            <Plus size={16} />
            <span>Add Sub Category</span>
          </button>
        </div>

        {/* Subcategories Table */}
        {loading ? (
          <div className="py-24 text-center text-[#6B7280] text-sm flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
            <span>Loading subcategories...</span>
          </div>
        ) : error ? (
          <div className="py-24 text-center text-rose-600 text-sm">
            <p>{error}</p>
            <button onClick={loadData} className="mt-3 text-xs font-semibold underline cursor-pointer">
              Try again
            </button>
          </div>
        ) : filteredSubCategories.length === 0 ? (
          <div className="py-24 text-center text-[#6B7280] text-sm">
            No subcategories found matching your query.
          </div>
        ) : (
          <div className="overflow-x-auto min-h-[460px]">
            <table className="w-full text-left text-sm text-gray-800">
              <thead className="bg-white border-b border-[#BFC5CE] text-[11px] font-bold text-gray-600 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4 w-16 text-center sm:text-left">S.NO.</th>
                  <th className="px-6 py-4 w-36">ACTION</th>
                  <th className="px-6 py-4 w-24 text-center sm:text-left">ICON</th>
                  <th className="px-6 py-4">SUB CATEGORY NAME</th>
                  <th className="px-6 py-4">CATEGORY</th>
                  <th className="px-6 py-4 text-right pr-8">CREATED DATE & TIME</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D1D5DB] text-sm">
                {filteredSubCategories.map((sc, idx) => {
                  const isDropup = idx >= 2 && idx >= filteredSubCategories.length - 3;
                  return (
                    <tr
                      key={sc.id}
                      className={`hover:bg-gray-50/80 transition-colors ${
                        openActionId === sc.id ? "relative z-30" : ""
                      }`}
                    >
                      {/* S.NO. */}
                      <td className="px-6 py-4.5 font-bold text-gray-900 text-sm">
                        {idx + 1}
                      </td>

                      {/* ACTION Dropdown Button */}
                      <td className="px-6 py-4.5">
                        <div
                          className={`relative action-menu-container inline-block text-left ${
                            openActionId === sc.id ? "z-50" : ""
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => setOpenActionId(openActionId === sc.id ? null : sc.id)}
                            className="bg-[#E31E24] hover:bg-[#C9191E] text-white text-xs font-semibold px-4 py-2 rounded-lg flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
                          >
                            <span>Action</span>
                            <ChevronDown
                              size={14}
                              className={openActionId === sc.id ? "rotate-180 transition-transform" : "transition-transform"}
                            />
                          </button>

                          {/* Floating Action Dropdown Menu */}
                          {openActionId === sc.id && (
                            <div
                              className={`absolute left-0 ${
                                isDropup ? "bottom-full mb-1.5" : "top-full mt-1.5"
                              } w-36 bg-white border border-[#BFC5CE] rounded-xl shadow-xl py-1 z-50 divide-y divide-[#D1D5DB]`}
                            >
                            <div className="py-1">
                              {!sc.isDeleted && (
                                <a
                                  href={`http://localhost:5173/products?category=${sc.category}`}
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
                                  openEditModal(sc);
                                }}
                                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors cursor-pointer text-left"
                              >
                                <Edit2 size={14} className="text-gray-500" />
                                <span>Edit</span>
                              </button>
                            </div>
                            <div className="py-1">
                              {!sc.isDeleted ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenActionId(null);
                                    setDeleteTarget(sc);
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
                                    handleRestoreSubCategory(sc);
                                  }}
                                  disabled={restoringId === sc.id}
                                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer text-left"
                                >
                                  <RotateCcw size={14} className={restoringId === sc.id ? "animate-spin text-emerald-600" : "text-emerald-500"} />
                                  <span>{restoringId === sc.id ? "Restoring..." : "Restore"}</span>
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* ICON (Rounded Square Tile like Image Reference) */}
                    <td className="px-6 py-4.5">
                      <div className="w-12 h-12 rounded-xl bg-[#F8FAFC] border border-[#BFC5CE] flex items-center justify-center p-1 shadow-xs mx-auto sm:mx-0 flex-shrink-0">
                        <img
                          src={sc.imageUrl}
                          alt={sc.name}
                          className="w-full h-full object-cover rounded-lg"
                          onError={(e) => handleImageError(e, sc.name)}
                        />
                      </div>
                    </td>

                    {/* SUB CATEGORY NAME (Clean bold text with archive badge) */}
                    <td className="px-6 py-4.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-gray-900 tracking-tight">
                          {sc.name}
                        </span>
                        {sc.isDeleted && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <Archive size={10} /> Archived
                          </span>
                        )}
                      </div>
                    </td>

                    {/* CATEGORY (Parent Category Badge matching brand theme) */}
                    <td className="px-6 py-4.5">
                      <span className="text-xs font-bold text-[#E31E24] tracking-wider uppercase">
                        {sc.categoryName || sc.category.toUpperCase()}
                      </span>
                    </td>

                    {/* CREATED DATE & TIME (Formatted timestamp) */}
                    <td className="px-6 py-4.5 text-right pr-8">
                      <span className="text-xs font-medium text-gray-600">
                        {formatSubCategoryDate(sc.createdAt)}
                      </span>
                    </td>
                  </tr>
                );
              })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Add / Edit Sub Category Modal ── */}
      {modalMode && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#AEB6C2] rounded-2xl p-6 max-w-lg w-full shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#C5C9D0] pb-4 mb-4">
              <h3 className="text-base font-bold text-gray-900">
                {modalMode === "create" ? "Add Sub Category" : `Edit "${activeSubCat?.name}"`}
              </h3>
              <button
                onClick={() => setModalMode(null)}
                className="text-gray-400 hover:text-gray-700 cursor-pointer p-1"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveSubCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Sub Category Name <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => {
                    setFormName(e.target.value);
                    if (modalMode === "create") setFormSlug(slugify(e.target.value));
                  }}
                  placeholder="e.g. Active Noise Cancelling Earbuds"
                  required
                  className="w-full px-3.5 py-2 text-sm bg-white border border-[#BFC5CE] rounded-lg text-gray-900 focus:outline-none focus:border-[#111827] focus:ring-1 focus:ring-[#111827]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Parent Category <span className="text-rose-600">*</span>
                </label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  required
                  className="w-full px-3.5 py-2 text-sm bg-white border border-[#BFC5CE] rounded-lg text-gray-900 focus:outline-none focus:border-[#111827] focus:ring-1 focus:ring-[#111827] cursor-pointer"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.slug}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Sub Category Slug <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  value={formSlug}
                  onChange={(e) => setFormSlug(e.target.value)}
                  placeholder="anc-earbuds"
                  required
                  className="w-full px-3.5 py-2 text-sm bg-white border border-[#BFC5CE] rounded-lg text-gray-900 font-mono focus:outline-none focus:border-[#111827] focus:ring-1 focus:ring-[#111827]"
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
                  className="w-full px-3.5 py-2 text-sm bg-white border border-[#BFC5CE] rounded-lg text-gray-900 focus:outline-none focus:border-[#111827] focus:ring-1 focus:ring-[#111827]"
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
                  className="w-full px-3.5 py-2 text-sm bg-white border border-[#BFC5CE] rounded-lg text-gray-900 focus:outline-none focus:border-[#111827] focus:ring-1 focus:ring-[#111827]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#C5C9D0]">
                <button
                  type="button"
                  onClick={() => setModalMode(null)}
                  disabled={saving}
                  className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-xs font-semibold text-gray-700 border border-[#BFC5CE] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-lg bg-[#E31E24] hover:bg-[#C9191E] text-xs font-semibold text-white transition-colors flex items-center gap-2 cursor-pointer shadow-xs"
                >
                  {saving ? "Saving..." : modalMode === "create" ? "Create Sub Category" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Archive Confirmation Modal ── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#AEB6C2] rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mb-4">
              <Archive size={22} />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Archive Sub Category</h3>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to archive subcategory{" "}
              <strong className="text-gray-900 font-semibold">"{deleteTarget.name}"</strong>?
              This subcategory will be hidden from customer storefront queries and navigation. You can restore it anytime if its parent category is active.
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
                onClick={handleArchiveSubCategory}
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
