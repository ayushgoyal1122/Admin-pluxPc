import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  Save,
  Eye,
  Edit3,
  Sparkles,
  Bold,
  Italic,
  Heading2,
  Heading3,
  Quote,
  List,
  Code,
  Globe,
  ImageIcon,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import {
  adminCreateBlog,
  adminGetBlogById,
  adminUpdateBlog,
} from "../services/api";
import type { BlogInput } from "../types";

const HARDWARE_IMAGE_PRESETS = [
  { label: "Wireless Earbuds", url: "/images/blogs/best-wireless-earbuds-2026.jpg" },
  { label: "Bluetooth Speaker", url: "/images/blogs/choose-bluetooth-speaker.jpg" },
  { label: "Power Bank Guide", url: "/images/blogs/power-bank-capacity-guide.jpg" },
  { label: "Top Tech Gadgets", url: "/images/blogs/top-gadgets-tech-lovers.jpg" },
  { label: "Wired vs Wireless", url: "/images/blogs/wired-vs-wireless-earbuds.jpg" },
  { label: "Smartphone Guide", url: "/images/blogs/smartphone-buying-checklist.jpg" },
  { label: "Battery Longevity", url: "/images/blogs/extend-gadget-battery-life.jpg" },
  { label: "Everyday Tech", url: "/images/blogs/electronics-accessories-everyday.jpg" },
  { label: "Charging Tech", url: "/images/blogs/charging-accessories-guide.jpg" },
];

const PRESET_CATEGORIES = [
  "Latest Technology",
  "Smartphones",
  "Audio & Earbuds",
  "Speakers",
  "Power Banks & Charging",
  "Gaming Accessories",
  "Gadgets & Electronics",
  "Product Reviews",
  "Buying Guides",
  "Tips & Tutorials",
];

export default function AdminBlogFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditMode = Boolean(id);

  const [isLoading, setIsLoading] = useState(isEditMode);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Tab: 'write' | 'preview'
  const [activeTab, setActiveTab] = useState<"write" | "preview">("write");

  // Form Fields
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [autoSlug, setAutoSlug] = useState(!isEditMode);
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [coverImage, setCoverImage] = useState(HARDWARE_IMAGE_PRESETS[0].url);
  const [category, setCategory] = useState(PRESET_CATEGORIES[0]);
  const [customCategory, setCustomCategory] = useState("");
  const [author, setAuthor] = useState("PLUXPC Hardware Lab");
  const [authorRole, setAuthorRole] = useState("Hardware Editor");
  const [authorAvatar, setAuthorAvatar] = useState("");
  const [tagsInput, setTagsInput] = useState("Gaming PC, Benchmarks, Hardware");
  const [status, setStatus] = useState<"draft" | "published">("published");
  const [isFeatured, setIsFeatured] = useState(false);
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");

  // Slug generator helper
  const slugify = (text: string) => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[\s\W-]+/g, "-")
      .replace(/^-+|-+$/g, "");
  };

  // Sync slug if autoSlug enabled
  useEffect(() => {
    if (autoSlug && title) {
      setSlug(slugify(title));
    }
  }, [title, autoSlug]);

  // Load existing blog if editing
  useEffect(() => {
    if (!id) return;
    let isMounted = true;
    setIsLoading(true);

    adminGetBlogById(id)
      .then((res) => {
        if (!isMounted) return;
        if (res && res.success && res.blog) {
          const b = res.blog;
          setTitle(b.title);
          setSlug(b.slug);
          setAutoSlug(false);
          setExcerpt(b.excerpt || "");
          setContent(b.content || "");
          setCoverImage(b.coverImage || HARDWARE_IMAGE_PRESETS[0].url);
          if (PRESET_CATEGORIES.includes(b.category)) {
            setCategory(b.category);
          } else {
            setCategory("Other");
            setCustomCategory(b.category);
          }
          setAuthor(b.author || "PLUXPC Hardware Lab");
          setAuthorRole(b.authorRole || "Hardware Editor");
          setAuthorAvatar(b.authorAvatar || "");
          setTagsInput(Array.isArray(b.tags) ? b.tags.join(", ") : "");
          setStatus(b.status || "published");
          setIsFeatured(Boolean(b.isFeatured));
          setMetaTitle(b.metaTitle || "");
          setMetaDescription(b.metaDescription || "");
        } else {
          setErrorMsg("Could not find article.");
        }
      })
      .catch((err) => {
        console.error("[Load Article Error]:", err);
        if (isMounted) setErrorMsg("Failed to load article details.");
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [id]);

  // Word count & read time
  const { wordCount, readTimeEst } = useMemo(() => {
    if (!content.trim()) return { wordCount: 0, readTimeEst: "1 min read" };
    const words = content.trim().split(/\s+/).length;
    const minutes = Math.max(1, Math.ceil(words / 200));
    return { wordCount: words, readTimeEst: `${minutes} min read` };
  }, [content]);

  // Formatting toolbar insertion helper
  const handleInsertMarkdown = (prefix: string, suffix: string = "") => {
    const textarea = document.getElementById("blog-content-area") as HTMLTextAreaElement | null;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    const replacement = `${prefix}${selectedText || "text"}${suffix}`;

    const newContent = content.substring(0, start) + replacement + content.substring(end);
    setContent(newContent);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + (selectedText.length || 4));
    }, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    const finalCategory = category === "Other" ? customCategory.trim() : category;

    if (!title.trim()) {
      setErrorMsg("Please enter an article title.");
      return;
    }
    if (!excerpt.trim()) {
      setErrorMsg("Please enter a short excerpt or summary.");
      return;
    }
    if (!content.trim()) {
      setErrorMsg("Please enter the article content.");
      return;
    }
    if (!coverImage.trim()) {
      setErrorMsg("Please provide a cover image URL.");
      return;
    }
    if (!finalCategory) {
      setErrorMsg("Please specify a category.");
      return;
    }

    const tagsArray = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const payload: BlogInput = {
      title: title.trim(),
      slug: slug.trim() ? slugify(slug) : slugify(title),
      excerpt: excerpt.trim(),
      content: content.trim(),
      coverImage: coverImage.trim(),
      category: finalCategory,
      author: author.trim() || "PLUXPC Hardware Lab",
      authorRole: authorRole.trim() || "Hardware Editor",
      authorAvatar: authorAvatar.trim(),
      tags: tagsArray,
      status,
      readTime: readTimeEst,
      isFeatured,
      metaTitle: metaTitle.trim() || `${title.trim()} | PLUXPC Lab`,
      metaDescription: metaDescription.trim() || excerpt.trim(),
    };

    setIsSubmitting(true);
    try {
      if (isEditMode && id) {
        const res = await adminUpdateBlog(id, payload);
        if (res && res.success) {
          setSuccessMsg("Article updated successfully!");
          setTimeout(() => navigate("/admin/blogs"), 1200);
        } else {
          setErrorMsg(res?.message || "Failed to update article.");
        }
      } else {
        const res = await adminCreateBlog(payload);
        if (res && res.success) {
          setSuccessMsg("Article published successfully!");
          setTimeout(() => navigate("/admin/blogs"), 1200);
        } else {
          setErrorMsg(res?.message || "Failed to create article.");
        }
      }
    } catch (err: any) {
      console.error("[Save Article Error]:", err);
      setErrorMsg(err?.message || "An unexpected error occurred while saving.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 max-w-5xl mx-auto text-center space-y-3">
        <div className="w-8 h-8 border-2 border-gray-900 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-gray-500 font-medium">Loading article details...</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* ── Breadcrumb & Top Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/admin/blogs"
            className="p-2 rounded-xl bg-white border border-[#C5C9D0] text-gray-700 hover:text-gray-900 shadow-2xs hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <div className="flex items-center gap-2 text-xs text-gray-400 font-medium">
              <Link to="/admin/blogs" className="hover:text-gray-600">Blog Posts</Link>
              <span>/</span>
              <span>{isEditMode ? "Edit Article" : "New Article"}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
              {isEditMode ? "Edit Blog Article" : "Create Blog Article"}
            </h1>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#E31E24] hover:bg-red-700 text-white text-xs sm:text-sm font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50"
          >
            <Save size={16} />
            <span>{isSubmitting ? "Saving..." : isEditMode ? "Update Article" : "Publish Article"}</span>
          </button>
        </div>
      </div>

      {/* ── Alerts ── */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-semibold flex items-center gap-2">
          <AlertCircle size={16} className="flex-shrink-0 text-red-600" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 size={16} className="flex-shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* ── 2-Column Responsive Form ── */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Title, Content, SEO (8 cols on lg) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Section 1: Title & Slug */}
          <div className="bg-white rounded-xl border border-[#C5C9D0] p-5 sm:p-6 shadow-2xs space-y-4">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
              1. Title & URL Slug
            </h2>

            {/* Title */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Article Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Best Gaming PC Components in 2026: The Ultimate Hardware Guide"
                className="w-full px-4 py-2.5 bg-gray-50 border border-[#BFC5CE] rounded-xl text-sm font-bold text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-[#111827] focus:border-[#111827]"
              />
            </div>

            {/* Slug */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-gray-700">
                  URL Slug <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setAutoSlug(!autoSlug);
                    if (!autoSlug && title) setSlug(slugify(title));
                  }}
                  className="text-[11px] font-semibold text-[#E31E24] hover:underline cursor-pointer"
                >
                  {autoSlug ? "Manual Slug" : "Auto Generate from Title"}
                </button>
              </div>
              <div className="flex items-center rounded-xl bg-gray-50 border border-[#BFC5CE] overflow-hidden text-xs focus-within:ring-1 focus-within:ring-[#111827] focus-within:border-[#111827]">
                <span className="px-3 py-2.5 text-gray-500 font-mono bg-gray-100 border-r border-[#BFC5CE]">
                  /blog/
                </span>
                <input
                  type="text"
                  required
                  value={slug}
                  onChange={(e) => {
                    setAutoSlug(false);
                    setSlug(e.target.value);
                  }}
                  placeholder="best-gaming-pc-components-2026"
                  className="w-full px-3 py-2.5 bg-transparent font-mono text-gray-800 focus:outline-none"
                />
              </div>
            </div>

            {/* Excerpt */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-gray-700">
                  Short Excerpt / Summary <span className="text-red-500">*</span>
                </label>
                <span className={`text-[10px] ${excerpt.length > 400 ? "text-red-500 font-bold" : "text-gray-400"}`}>
                  {excerpt.length}/400 characters
                </span>
              </div>
              <textarea
                required
                rows={3}
                maxLength={400}
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                placeholder="A concise summary of the article displayed on cards and search results..."
                className="w-full px-4 py-2.5 bg-gray-50 border border-[#BFC5CE] rounded-xl text-xs sm:text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-[#111827] focus:border-[#111827]"
              />
            </div>
          </div>

          {/* Section 2: Content Editor with Markdown Toolbar & Preview */}
          <div className="bg-white rounded-xl border border-[#C5C9D0] p-5 sm:p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                2. Article Content
              </h2>

              {/* Mode Toggle Tabs */}
              <div className="flex items-center bg-gray-100 border border-[#BFC5CE] p-0.5 rounded-xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setActiveTab("write")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    activeTab === "write"
                      ? "bg-white text-gray-900 shadow-2xs"
                      : "text-gray-500 hover:text-gray-800"
                  }`}
                >
                  <Edit3 size={13} />
                  <span>Write (Markdown)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("preview")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    activeTab === "preview"
                      ? "bg-white text-gray-900 shadow-2xs"
                      : "text-gray-500 hover:text-gray-800"
                  }`}
                >
                  <Eye size={13} />
                  <span>Live Preview</span>
                </button>
              </div>
            </div>

            {/* Markdown Quick Toolbar (Only shown in 'write' mode) */}
            {activeTab === "write" && (
              <div className="flex items-center flex-wrap gap-1 p-2 bg-gray-50 border border-[#BFC5CE] rounded-xl text-xs">
                <button
                  type="button"
                  onClick={() => handleInsertMarkdown("**", "**")}
                  className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-700 font-bold"
                  title="Bold"
                >
                  <Bold size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertMarkdown("*", "*")}
                  className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-700 italic"
                  title="Italic"
                >
                  <Italic size={14} />
                </button>
                <span className="w-px h-4 bg-[#C5C9D0] mx-1" />
                <button
                  type="button"
                  onClick={() => handleInsertMarkdown("## ", "")}
                  className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-700 font-bold"
                  title="Heading 2"
                >
                  <Heading2 size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertMarkdown("### ", "")}
                  className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-700 font-bold"
                  title="Heading 3"
                >
                  <Heading3 size={14} />
                </button>
                <span className="w-px h-4 bg-[#C5C9D0] mx-1" />
                <button
                  type="button"
                  onClick={() => handleInsertMarkdown("> ", "")}
                  className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-700"
                  title="Callout Quote"
                >
                  <Quote size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertMarkdown("- ", "")}
                  className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-700"
                  title="Bullet List"
                >
                  <List size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertMarkdown("`", "`")}
                  className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-700 font-mono"
                  title="Code Tag"
                >
                  <Code size={14} />
                </button>

                <div className="ml-auto flex items-center gap-3 text-[11px] text-gray-400 font-medium pr-2">
                  <span>{wordCount} words</span>
                  <span>•</span>
                  <span>{readTimeEst}</span>
                </div>
              </div>
            )}

            {/* Write Text Area */}
            {activeTab === "write" ? (
              <textarea
                id="blog-content-area"
                required
                rows={18}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write article using Markdown formatting...&#10;&#10;## Section Heading&#10;Paragraph text with **bold** highlights.&#10;&#10;> Technical callout quote&#10;&#10;- Bullet point one&#10;- Bullet point two"
                className="w-full p-4 bg-gray-50 border border-[#BFC5CE] rounded-xl text-xs sm:text-sm font-mono text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-[#111827] focus:border-[#111827] leading-relaxed"
              />
            ) : (
              /* Live Preview Box */
              <div className="p-6 bg-gray-50/50 border border-[#BFC5CE] rounded-xl max-h-[500px] overflow-y-auto space-y-4">
                {content.trim() ? (
                  <div className="prose prose-sm max-w-none text-gray-800">
                    {content.split("\n").map((line, idx) => {
                      const t = line.trim();
                      if (t.startsWith("## ")) {
                        return <h2 key={idx} className="text-xl font-bold text-gray-900 mt-4 mb-2">{t.replace(/^##\s+/, "")}</h2>;
                      }
                      if (t.startsWith("### ")) {
                        return <h3 key={idx} className="text-lg font-bold text-gray-800 mt-3 mb-1">{t.replace(/^###\s+/, "")}</h3>;
                      }
                      if (t.startsWith("> ")) {
                        return (
                          <blockquote key={idx} className="p-3 my-2 border-l-4 border-[#E31E24] bg-red-50 text-gray-700 italic rounded">
                            {t.replace(/^>\s+/, "")}
                          </blockquote>
                        );
                      }
                      if (t.startsWith("- ") || t.startsWith("* ")) {
                        return <li key={idx} className="ml-4 list-disc text-gray-700">{t.substring(2)}</li>;
                      }
                      if (!t) return <div key={idx} className="h-2" />;
                      return <p key={idx} className="my-2 leading-relaxed text-gray-700">{t}</p>;
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 italic">No content to preview yet. Switch to "Write" mode to enter text.</p>
                )}
              </div>
            )}
          </div>

          {/* Section 3: SEO Configuration */}
          <div className="bg-white rounded-xl border border-[#C5C9D0] p-5 sm:p-6 shadow-2xs space-y-4">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
              <Globe size={16} className="text-blue-500" />
              <span>3. Search Engine Optimization (SEO)</span>
            </h2>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-gray-700">Meta Title</label>
                <span className="text-[10px] text-gray-400">{metaTitle.length}/60 recommended</span>
              </div>
              <input
                type="text"
                value={metaTitle}
                onChange={(e) => setMetaTitle(e.target.value)}
                placeholder={title ? `${title} | PLUXPC Lab` : "Custom search title"}
                className="w-full px-4 py-2 bg-gray-50 border border-[#BFC5CE] rounded-xl text-xs sm:text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#111827] focus:border-[#111827]"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-gray-700">Meta Description</label>
                <span className="text-[10px] text-gray-400">{metaDescription.length}/160 recommended</span>
              </div>
              <textarea
                rows={2}
                value={metaDescription}
                onChange={(e) => setMetaDescription(e.target.value)}
                placeholder={excerpt || "Summary snippet shown in Google search results..."}
                className="w-full px-4 py-2 bg-gray-50 border border-[#BFC5CE] rounded-xl text-xs sm:text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#111827] focus:border-[#111827]"
              />
            </div>

            {/* Google Search Snippet Preview */}
            <div className="p-4 bg-gray-50 rounded-xl border border-[#BFC5CE]">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Google Snippet Preview</p>
              <div className="font-sans">
                <p className="text-xs text-blue-700 hover:underline font-medium truncate">
                  {metaTitle || title || "Article Title"} | PLUXPC Hardware Lab
                </p>
                <p className="text-[10px] text-emerald-800 truncate mt-0.5">
                  https://pluxpc.com/blog/{slug || "article-slug"}
                </p>
                <p className="text-xs text-gray-600 line-clamp-2 mt-1">
                  {metaDescription || excerpt || "Article summary snippet displayed here."}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Media, Settings, Author (4 cols on lg) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Publishing Settings Box */}
          <div className="bg-white rounded-xl border border-[#C5C9D0] p-5 shadow-2xs space-y-4">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
              Publishing Status
            </h2>

            {/* Status Selector */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">Article State</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setStatus("published")}
                  className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    status === "published"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-400 ring-1 ring-emerald-400"
                      : "bg-gray-50 text-gray-600 border-[#BFC5CE] hover:bg-gray-100"
                  }`}
                >
                  Published
                </button>
                <button
                  type="button"
                  onClick={() => setStatus("draft")}
                  className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    status === "draft"
                      ? "bg-amber-50 text-amber-700 border-amber-400 ring-1 ring-amber-400"
                      : "bg-gray-50 text-gray-600 border-[#BFC5CE] hover:bg-gray-100"
                  }`}
                >
                  Draft
                </button>
              </div>
            </div>

            {/* Featured Story Toggle */}
            <div className="pt-3 border-t border-[#D1D5DB]">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isFeatured}
                  onChange={(e) => setIsFeatured(e.target.checked)}
                  className="rounded text-[#E31E24] focus:ring-[#E31E24]"
                />
                <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                  <Sparkles size={14} className="text-amber-500" />
                  Mark as Editorial Feature
                </span>
              </label>
              <p className="text-[11px] text-gray-400 mt-1 pl-5 leading-snug">
                Presents this article as the hero feature story at the top of the blog.
              </p>
            </div>
          </div>

          {/* Cover Image & 16:9 Card Preview */}
          <div className="bg-white rounded-xl border border-[#C5C9D0] p-5 shadow-2xs space-y-4">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
              <ImageIcon size={15} className="text-gray-500" />
              <span>Cover Image (16:9)</span>
            </h2>

            {/* 16:9 Live Card Preview */}
            <div className="w-full aspect-[16/9] rounded-xl overflow-hidden bg-gray-100 border border-[#BFC5CE] relative shadow-2xs">
              <img
                src={coverImage || HARDWARE_IMAGE_PRESETS[0].url}
                alt="Preview"
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.src = HARDWARE_IMAGE_PRESETS[0].url;
                }}
              />
              <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/70 text-white text-[10px] font-semibold backdrop-blur-xs">
                16:9 Card Preview
              </div>
            </div>

            {/* URL Input */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Image URL <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={coverImage}
                onChange={(e) => setCoverImage(e.target.value)}
                placeholder="/images/blogs/... or https://..."
                className="w-full px-3 py-2 bg-gray-50 border border-[#BFC5CE] rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#111827] focus:border-[#111827]"
              />
            </div>

            {/* Quick Electronics Presets */}
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                Verified Electronics & Gadget Presets
              </label>
              <div className="flex flex-wrap gap-1.5">
                {HARDWARE_IMAGE_PRESETS.map((preset) => (
                  <button
                    key={preset.url}
                    type="button"
                    onClick={() => setCoverImage(preset.url)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold border transition-all cursor-pointer ${
                      coverImage === preset.url
                        ? "bg-[#E31E24] text-white border-[#E31E24]"
                        : "bg-gray-50 text-gray-700 border-[#BFC5CE] hover:bg-gray-100"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Taxonomy & Category */}
          <div className="bg-white rounded-xl border border-[#C5C9D0] p-5 shadow-2xs space-y-4">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
              Category & Tags
            </h2>

            {/* Category */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-[#BFC5CE] rounded-xl text-xs font-medium text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#111827] focus:border-[#111827]"
              >
                {PRESET_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
                <option value="Other">+ Custom Category...</option>
              </select>

              {category === "Other" && (
                <input
                  type="text"
                  required
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  placeholder="Enter custom category name"
                  className="w-full mt-2 px-3 py-2 bg-gray-50 border border-[#BFC5CE] rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#111827] focus:border-[#111827]"
                />
              )}
            </div>

            {/* Tags */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Tags (Comma separated)
              </label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="GPU, RTX 5080, Cooling, Benchmarks"
                className="w-full px-3 py-2 bg-gray-50 border border-[#BFC5CE] rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#111827] focus:border-[#111827]"
              />
              <p className="text-[10px] text-gray-400 mt-1">Separate keywords with commas.</p>
            </div>
          </div>

          {/* Author Details */}
          <div className="bg-white rounded-xl border border-[#C5C9D0] p-5 shadow-2xs space-y-4">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
              Author Information
            </h2>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Author Name</label>
              <input
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="PLUXPC Hardware Lab"
                className="w-full px-3 py-2 bg-gray-50 border border-[#BFC5CE] rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#111827] focus:border-[#111827]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Author Role / Title</label>
              <input
                type="text"
                value={authorRole}
                onChange={(e) => setAuthorRole(e.target.value)}
                placeholder="Hardware Editor"
                className="w-full px-3 py-2 bg-gray-50 border border-[#BFC5CE] rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#111827] focus:border-[#111827]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Author Avatar URL (Optional)</label>
              <input
                type="text"
                value={authorAvatar}
                onChange={(e) => setAuthorAvatar(e.target.value)}
                placeholder="https://... (Leave empty for initial icon)"
                className="w-full px-3 py-2 bg-gray-50 border border-[#BFC5CE] rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#111827] focus:border-[#111827]"
              />
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

