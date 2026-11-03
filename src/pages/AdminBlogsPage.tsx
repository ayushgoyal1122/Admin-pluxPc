import { useState, useEffect, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  ExternalLink,
  Eye,
  FileText,
  CheckCircle2,
  Clock,
  Sparkles,
  AlertTriangle,
  X,
  Calendar,
} from "lucide-react";
import {
  adminGetBlogs,
  adminGetBlogStats,
  adminToggleBlogStatus,
  adminDeleteBlog,
} from "../services/api";
import type { Blog, BlogStats } from "../types";

export default function AdminBlogsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const currentPage = parseInt(searchParams.get("page") || "1", 10);
  const currentStatus = searchParams.get("status") || "all";
  const currentCategory = searchParams.get("category") || "all";
  const currentQuery = searchParams.get("q") || "";

  const [stats, setStats] = useState<BlogStats>({
    total: 0,
    published: 0,
    draft: 0,
    totalViews: 0,
  });

  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [searchInput, setSearchInput] = useState(currentQuery);

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<Blog | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Quick status toggle loading
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      const res = await adminGetBlogStats();
      if (res && res.success && res.stats) {
        setStats(res.stats);
      }
    } catch (err) {
      console.warn("[Admin Blog Stats Load Error]:", err);
    }
  };

  const fetchBlogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await adminGetBlogs({
        page: currentPage,
        limit: 10,
        status: currentStatus,
        category: currentCategory,
        q: currentQuery,
      });

      if (res && res.success) {
        setBlogs(res.blogs || []);
        setTotalPages(res.totalPages || 1);
        setTotalCount(res.total || 0);
      } else {
        setBlogs([]);
      }
    } catch (err) {
      console.error("[Admin Fetch Blogs Error]:", err);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, currentStatus, currentCategory, currentQuery]);

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    fetchBlogs();
  }, [fetchBlogs]);

  const updateFilters = (updates: Record<string, string | number | null>) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([k, v]) => {
      if (v === null || v === "" || (k === "status" && v === "all") || (k === "category" && v === "all") || (k === "page" && v === 1)) {
        next.delete(k);
      } else {
        next.set(k, String(v));
      }
    });
    setSearchParams(next);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters({ q: searchInput.trim(), page: 1 });
  };

  const handleToggleStatus = async (blog: Blog) => {
    const nextStatus = blog.status === "published" ? "draft" : "published";
    setTogglingId(blog._id);
    try {
      const res = await adminToggleBlogStatus(blog._id, nextStatus);
      if (res && res.success) {
        setBlogs((prev) =>
          prev.map((b) => (b._id === blog._id ? { ...b, status: nextStatus } : b))
        );
        fetchStats();
        setActionMessage({
          text: `Article status changed to ${nextStatus.toUpperCase()}`,
          type: "success",
        });
      }
    } catch (err: any) {
      setActionMessage({
        text: err?.message || "Failed to update article status",
        type: "error",
      });
    } finally {
      setTogglingId(null);
      setTimeout(() => setActionMessage(null), 4000);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await adminDeleteBlog(deleteTarget._id);
      if (res && res.success) {
        setBlogs((prev) => prev.filter((b) => b._id !== deleteTarget._id));
        setDeleteTarget(null);
        fetchStats();
        fetchBlogs();
        setActionMessage({
          text: "Article successfully deleted.",
          type: "success",
        });
      }
    } catch (err: any) {
      setActionMessage({
        text: err?.message || "Failed to delete article",
        type: "error",
      });
    } finally {
      setIsDeleting(false);
      setTimeout(() => setActionMessage(null), 4000);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* ── Top Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
            Blog & Hardware Articles
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Create, manage, and publish technical guides, component benchmarks, and editorial news.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/admin/blogs/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#E31E24] hover:bg-red-700 text-white text-xs sm:text-sm font-bold shadow-sm transition-all"
          >
            <Plus size={16} />
            <span>Create Article</span>
          </Link>
        </div>
      </div>

      {/* ── Notification Alert ── */}
      {actionMessage && (
        <div
          className={`p-3.5 rounded-xl text-xs font-semibold flex items-center justify-between ${
            actionMessage.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          <span>{actionMessage.text}</span>
          <button
            onClick={() => setActionMessage(null)}
            className="text-gray-400 hover:text-gray-700"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── Metric Summary Counters ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-[#C5C9D0] p-5 shadow-2xs">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#111827]">Total Posts</span>
            <FileText size={18} className="text-gray-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-[#111827]">{stats.total}</p>
          <span className="text-[11px] text-[#111827] mt-1 block font-medium">Hardware Lab Catalog</span>
        </div>

        <div className="bg-white rounded-xl border border-[#C5C9D0] p-5 shadow-2xs">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#111827]">Published</span>
            <CheckCircle2 size={18} className="text-emerald-500" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-[#111827]">{stats.published}</p>
          <span className="text-[11px] text-[#111827] mt-1 block font-medium">Live on Storefront</span>
        </div>

        <div className="bg-white rounded-xl border border-[#C5C9D0] p-5 shadow-2xs">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#111827]">Drafts</span>
            <Clock size={18} className="text-amber-500" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-[#111827]">{stats.draft}</p>
          <span className="text-[11px] text-[#111827] mt-1 block font-medium">Unpublished Work</span>
        </div>

        <div className="bg-white rounded-xl border border-[#C5C9D0] p-5 shadow-2xs">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#111827]">Total Views</span>
            <Eye size={18} className="text-blue-500" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-[#111827]">{stats.totalViews.toLocaleString()}</p>
          <span className="text-[11px] text-[#111827] mt-1 block font-medium">Storefront Reader Views</span>
        </div>
      </div>

      {/* ── Filters & Search Toolbar ── */}
      <div className="bg-white rounded-xl border border-[#C5C9D0] p-4 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Search */}
          <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by title, author, category, tags..."
              className="w-full pl-10 pr-9 py-2 bg-gray-50 border border-[#BFC5CE] rounded-xl text-xs sm:text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-[#111827] focus:ring-1 focus:ring-[#111827]"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => {
                  setSearchInput("");
                  updateFilters({ q: null, page: 1 });
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={14} />
              </button>
            )}
          </form>

          {/* Dropdown Filters */}
          <div className="flex items-center flex-wrap gap-2.5">
            {/* Status Filter */}
            <select
              value={currentStatus}
              onChange={(e) => updateFilters({ status: e.target.value, page: 1 })}
              aria-label="Filter articles by status"
              className="bg-gray-50 border border-[#BFC5CE] rounded-xl px-3 py-2 text-xs font-semibold text-gray-700 focus:outline-none focus:border-[#111827] focus:ring-1 focus:ring-[#111827] cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
            </select>

            {/* Category Filter */}
            <select
              value={currentCategory}
              onChange={(e) => updateFilters({ category: e.target.value, page: 1 })}
              aria-label="Filter articles by category"
              className="bg-gray-50 border border-[#BFC5CE] rounded-xl px-3 py-2 text-xs font-semibold text-gray-700 focus:outline-none focus:border-[#111827] focus:ring-1 focus:ring-[#111827] cursor-pointer"
            >
              <option value="all">All Categories</option>
              <option value="Latest Technology">Latest Technology</option>
              <option value="Smartphones">Smartphones</option>
              <option value="Audio & Earbuds">Audio & Earbuds</option>
              <option value="Speakers">Speakers</option>
              <option value="Power Banks & Charging">Power Banks & Charging</option>
              <option value="Gaming Accessories">Gaming Accessories</option>
              <option value="Gadgets & Electronics">Gadgets & Electronics</option>
              <option value="Product Reviews">Product Reviews</option>
              <option value="Buying Guides">Buying Guides</option>
              <option value="Tips & Tutorials">Tips & Tutorials</option>
            </select>

            {/* Clear All */}
            {(currentQuery || currentStatus !== "all" || currentCategory !== "all") && (
              <button
                onClick={() => {
                  setSearchInput("");
                  setSearchParams(new URLSearchParams());
                }}
                className="text-xs text-[#E31E24] hover:underline font-semibold px-2 py-1"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Articles Data Table ── */}
      <div className="bg-white rounded-xl border border-[#C5C9D0] shadow-2xs overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-8 h-8 border-2 border-gray-900 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-gray-500 font-medium">Loading articles...</p>
          </div>
        ) : blogs.length === 0 ? (
          <div className="p-12 text-center">
            <FileText size={36} className="text-gray-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-gray-900 mb-1">No articles found</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto mb-4">
              Try adjusting your search keywords or category filters.
            </p>
            <Link
              to="/admin/blogs/new"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#E31E24] text-white text-xs font-bold hover:bg-red-700 transition-colors"
            >
              <Plus size={14} />
              <span>Create First Article</span>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-gray-50/75 border-b border-[#BFC5CE] text-gray-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4 w-12 text-center border-r border-[#E5E7EB]">#</th>
                  <th className="py-3 px-4 w-28 border-r border-[#E5E7EB]">Cover</th>
                  <th className="py-3 px-4 border-r border-[#E5E7EB]">Article Title & Details</th>
                  <th className="py-3 px-4 border-r border-[#E5E7EB]">Category</th>
                  <th className="py-3 px-4 border-r border-[#E5E7EB]">Author</th>
                  <th className="py-3 px-4 text-center border-r border-[#E5E7EB]">Views</th>
                  <th className="py-3 px-4 text-center border-r border-[#E5E7EB]">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D1D5DB]">
                {blogs.map((blog, idx) => {
                  const sNo = (currentPage - 1) * 10 + idx + 1;
                  const dateStr = new Date(blog.publishedAt || blog.createdAt || Date.now()).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  });

                  return (
                    <tr key={blog._id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="py-3 px-4 text-center text-gray-400 font-mono border-r border-[#E5E7EB]">{sNo}</td>

                      {/* 16:9 Thumbnail */}
                      <td className="py-3 px-4 border-r border-[#E5E7EB]">
                        <div className="w-20 aspect-[16/9] rounded-lg overflow-hidden bg-gray-100 border border-[#BFC5CE]">
                          <img
                            src={blog.coverImage || "/images/blogs/best-wireless-earbuds-2026.jpg"}
                            alt={blog.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </td>

                      {/* Title, Excerpt & Badge */}
                      <td className="py-3 px-4 border-r border-[#E5E7EB]">
                        <div className="max-w-md">
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="font-bold text-gray-900 text-xs sm:text-sm line-clamp-1 hover:text-[#E31E24] transition-colors">
                              <Link to={`/admin/blogs/${blog._id}/edit`}>{blog.title}</Link>
                            </span>
                            {blog.isFeatured && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-red-100 text-[#E31E24]">
                                <Sparkles size={9} />
                                Feature
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-gray-500 line-clamp-1 mb-1">{blog.excerpt}</p>
                          <div className="flex items-center gap-2 text-[10px] text-gray-400 font-mono">
                            <span>/blog/{blog.slug}</span>
                            <span>•</span>
                            <span>{blog.readTime || "5 min"}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Calendar size={10} />
                              {dateStr}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3 px-4 border-r border-[#E5E7EB]">
                        <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-700">
                          {blog.category}
                        </span>
                      </td>

                      {/* Author */}
                      <td className="py-3 px-4 border-r border-[#E5E7EB]">
                        <p className="font-semibold text-gray-800">{blog.author}</p>
                        <p className="text-[10px] text-gray-400">{blog.authorRole || "Author"}</p>
                      </td>

                      {/* Views */}
                      <td className="py-3 px-4 text-center font-mono font-medium text-gray-700 border-r border-[#E5E7EB]">
                        {blog.views.toLocaleString()}
                      </td>

                      {/* Status & Quick Toggle */}
                      <td className="py-3 px-4 text-center border-r border-[#E5E7EB]">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(blog)}
                          disabled={togglingId === blog._id}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase transition-all cursor-pointer ${
                            blog.status === "published"
                              ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                              : "bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200"
                          } ${togglingId === blog._id ? "opacity-50" : ""}`}
                          title="Click to toggle status"
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${blog.status === "published" ? "bg-emerald-500" : "bg-amber-500"}`} />
                          <span>{blog.status}</span>
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Storefront Link */}
                          <a
                            href={`/blog/${blog.slug}`}
                            target="_blank"
                            rel="noreferrer"
                            title="Preview on Storefront"
                            className="p-1.5 text-gray-400 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors"
                          >
                            <ExternalLink size={14} />
                          </a>

                          {/* Edit */}
                          <Link
                            to={`/admin/blogs/${blog._id}/edit`}
                            title="Edit Article"
                            className="p-1.5 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors"
                          >
                            <Edit size={14} />
                          </Link>

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(blog)}
                            title="Delete Article"
                            className="p-1.5 text-red-500 hover:text-red-700 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Pagination ── */}
        {totalPages > 1 && (
          <div className="px-4 py-3 bg-gray-50/50 border-t border-[#C5C9D0] flex items-center justify-between text-xs">
            <span className="text-gray-500 font-medium">
              Showing page {currentPage} of {totalPages} ({totalCount} total)
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => updateFilters({ page: currentPage - 1 })}
                disabled={currentPage <= 1}
                className="px-3 py-1 rounded-lg border border-[#BFC5CE] bg-white font-semibold text-gray-700 hover:bg-gray-50 hover:border-[#111827] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                Previous
              </button>
              <button
                onClick={() => updateFilters({ page: currentPage + 1 })}
                disabled={currentPage >= totalPages}
                className="px-3 py-1 rounded-lg border border-[#BFC5CE] bg-white font-semibold text-gray-700 hover:bg-gray-50 hover:border-[#111827] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Delete Confirmation Modal ── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl border border-[#AEB6C2] p-6 sm:p-8 max-w-md w-full shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-red-50 text-[#E31E24] flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={24} />
            </div>
            <h3 className="text-lg font-black text-gray-900 text-center mb-2">Delete Article?</h3>
            <p className="text-xs text-gray-500 text-center mb-6 leading-relaxed">
              Are you sure you want to delete <span className="font-bold text-gray-800">"{deleteTarget.title}"</span>? This will remove the article from the storefront.
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl border border-[#BFC5CE] bg-white text-xs font-bold text-gray-700 hover:bg-gray-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                {isDeleting ? "Deleting..." : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
