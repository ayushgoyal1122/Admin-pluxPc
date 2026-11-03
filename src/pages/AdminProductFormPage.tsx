import { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  Save,
  Image as ImageIcon,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import {
  adminCreateProduct,
  adminUpdateProduct,
  adminGetProductById,
  fetchCategories,
} from "../services/api";
import { slugify, handleImageError } from "../utils";
import type { Category } from "../types";

const SECTION_OPTIONS = [
  { id: "exclusive", label: "Exclusive Offers" },
  { id: "topdeals", label: "Top Deals" },
  { id: "hotpicks", label: "Hot Picks / New Launches" },
  { id: "bestsellers", label: "Our Bestsellers" },
  { id: "gaming", label: "Gaming Essentials" },
  { id: "premium", label: "Premium Audio" },
  { id: "everyday", label: "Everyday Tech" },
  { id: "personalisation", label: "Personalisation" },
];

const COLOR_OPTIONS = [
  { label: "Dark / Black", value: "bg-gray-900" },
  { label: "Pure White", value: "bg-white" },
  { label: "Silver / Gray", value: "bg-gray-400" },
  { label: "Volt Yellow", value: "bg-yellow-400" },
  { label: "Volt Red", value: "bg-red-600" },
  { label: "Royal Blue", value: "bg-blue-600" },
  { label: "Teal Green", value: "bg-teal-400" },
  { label: "Purple", value: "bg-purple-500" },
];

export default function AdminProductFormPage() {
  const { id } = useParams<{ id?: string }>();
  const isEditing = Boolean(id);
  const navigate = useNavigate();

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(isEditing);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [autoSlug, setAutoSlug] = useState(true);
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState<number | "">("");
  const [originalPrice, setOriginalPrice] = useState<number | "">("");
  const [imageUrl, setImageUrl] = useState("");
  const [badge, setBadge] = useState("");
  const [badgeIcon, setBadgeIcon] = useState("🚀");
  const [featureTag, setFeatureTag] = useState("");
  const [description, setDescription] = useState("");
  const [stockQuantity, setStockQuantity] = useState<number>(50);
  const [inStock, setInStock] = useState<boolean>(true);
  const [selectedSections, setSelectedSections] = useState<string[]>(["exclusive"]);
  const [selectedColors, setSelectedColors] = useState<string[]>(["bg-gray-900"]);

  // Load Categories & Existing Product (if editing)
  useEffect(() => {
    async function init() {
      try {
        const catRes = await fetchCategories();
        if (catRes.success && catRes.data) {
          setCategories(catRes.data);
          setCategory((prev) => (prev ? prev : (catRes.data[0]?.slug ?? "")));
        }

        if (isEditing && id) {
          const prodRes = await adminGetProductById(id);
          if (prodRes.success && prodRes.data) {
            const p = prodRes.data;
            setName(p.name || "");
            setSlug(p.slug || "");
            setAutoSlug(false);
            setCategory(p.category || "");
            setPrice(p.price !== undefined && p.price !== null ? p.price : "");
            setOriginalPrice(p.originalPrice !== undefined && p.originalPrice !== null ? p.originalPrice : "");
            setImageUrl(p.imageUrl || "");
            setBadge(p.badge || "");
            setBadgeIcon(p.badgeIcon || "🚀");
            setFeatureTag(p.featureTag || "");
            setDescription(p.description || "");
            setStockQuantity(p.stockQuantity ?? 50);
            setInStock(p.inStock ?? true);
            setSelectedSections(p.section || ["exclusive"]);
            setSelectedColors(p.colors || ["bg-gray-900"]);
          } else {
            setError(prodRes.message || "Product not found");
          }
        }
      } catch (err: any) {
        setError(err.message || "Failed to load product data");
      } finally {
        setLoading(false);
      }
    }

    init();
  }, [id, isEditing]);

  // Auto-generate slug when name changes
  const handleNameChange = (val: string) => {
    setName(val);
    if (autoSlug) {
      setSlug(slugify(val));
    }
  };

  const handleToggleSection = (sectionId: string) => {
    setSelectedSections((prev) =>
      prev.includes(sectionId) ? prev.filter((s) => s !== sectionId) : [...prev, sectionId]
    );
  };

  const handleToggleColor = (colorClass: string) => {
    setSelectedColors((prev) =>
      prev.includes(colorClass) ? prev.filter((c) => c !== colorClass) : [...prev, colorClass]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !category || price === "" || !imageUrl.trim()) {
      setError("Please fill out all required fields (Name, Category, Price, and Image URL).");
      return;
    }

    setError(null);
    setSubmitting(true);

    const catDoc = categories.find((c) => c.slug === category);
    const categoryLabel = catDoc ? catDoc.name : category;

    const payload: any = {
      name: name.trim(),
      slug: slug ? slugify(slug) : slugify(name),
      category: category.toLowerCase().trim(),
      categoryLabel,
      price: Number(price),
      originalPrice: originalPrice ? Number(originalPrice) : undefined,
      imageUrl: imageUrl.trim(),
      badge: badge.trim(),
      badgeIcon: badge.trim() ? badgeIcon : "",
      featureTag: featureTag.trim(),
      description: description.trim(),
      stockQuantity: Number(stockQuantity),
      inStock: Boolean(inStock),
      section: selectedSections.length > 0 ? selectedSections : ["exclusive"],
      colors: selectedColors.length > 0 ? selectedColors : ["bg-gray-900"],
    };

    try {
      const res = isEditing && id
        ? await adminUpdateProduct(id, payload)
        : await adminCreateProduct(payload);

      if (res.success) {
        setSuccess(isEditing ? "Product updated successfully!" : "Product created successfully!");
        setTimeout(() => {
          navigate("/admin/products");
        }, 1200);
      } else {
        setError(res.message || "Failed to save product.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to communicate with server");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-[#6B7280] text-sm flex flex-col items-center gap-3 font-sans">
        <div className="w-8 h-8 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
        <span>Loading product details...</span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 font-sans">
      {/* ── Top Navigation & Title ── */}
      <div className="flex items-center justify-between pb-2 border-b border-[#C5C9D0]">
        <Link
          to="/admin/products"
          className="text-xs font-semibold text-[#6B7280] hover:text-[#1F2937] flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft size={14} />
          <span>Back to Products</span>
        </Link>
        <span className="text-xs font-mono text-[#6B7280]">
          {isEditing ? `Editing ID: ${id}` : "New Product Entry"}
        </span>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-[#1F2937] tracking-tight">
          {isEditing ? `Edit "${name || "Product"}"` : "Add New Product"}
        </h1>
        <p className="text-sm text-[#6B7280] mt-0.5">
          {isEditing
            ? "Update specifications, pricing, inventory status, or promotional badges in MongoDB."
            : "Publish a new electronic item directly to the live PLUXPC storefront catalog."}
        </p>
      </div>

      {/* ── Feedback Alerts ── */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center gap-2.5 shadow-xs">
          <AlertTriangle size={16} className="text-rose-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2.5 shadow-xs">
          <CheckCircle size={16} className="text-emerald-600 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* ── Main Form ── */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 1. Basic Information */}
        <div className="bg-white border border-[#C5C9D0] rounded-xl p-6 space-y-4 shadow-2xs">
          <h2 className="text-xs font-bold text-[#1F2937] uppercase tracking-wider border-b border-[#C5C9D0] pb-2">
            1. Basic Information
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#374151] mb-1.5">
                Product Name <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. PLUXPC ProBuds X9 ANC"
                required
                className="w-full px-3.5 py-2 text-sm bg-white border border-[#BFC5CE] rounded-lg text-[#1F2937] focus:outline-none focus:border-[#111827] focus:ring-1 focus:ring-[#111827]"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-[#374151]">
                  URL Slug <span className="text-rose-600">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setAutoSlug((o) => !o)}
                  className="text-[11px] text-[#6B7280] hover:text-[#1F2937] underline cursor-pointer"
                >
                  {autoSlug ? "Auto-generating (click to edit)" : "Custom slug"}
                </button>
              </div>
              <input
                type="text"
                value={slug}
                disabled={autoSlug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="pluxpc-probuds-x9-anc"
                required
                className="w-full px-3.5 py-2 text-sm bg-white border border-[#BFC5CE] rounded-lg text-[#1F2937] font-mono focus:outline-none focus:border-[#111827] focus:ring-1 focus:ring-[#111827] disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#374151] mb-1.5">
                Category <span className="text-rose-600">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
                className="w-full px-3.5 py-2 text-sm bg-white border border-[#BFC5CE] rounded-lg text-[#1F2937] focus:outline-none focus:border-[#111827]"
              >
                {categories.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name} ({c.slug})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#374151] mb-1.5">
                Feature Tag (shown on card strip)
              </label>
              <input
                type="text"
                value={featureTag}
                onChange={(e) => setFeatureTag(e.target.value)}
                placeholder="e.g. 50 Hrs Playback, 100W RMS"
                className="w-full px-3.5 py-2 text-sm bg-white border border-[#BFC5CE] rounded-lg text-[#1F2937] focus:outline-none focus:border-[#111827] focus:ring-1 focus:ring-[#111827]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#374151] mb-1.5">
              Short Description
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Key specifications, battery life, audio tech highlights..."
              className="w-full px-3.5 py-2 text-sm bg-white border border-[#BFC5CE] rounded-lg text-[#1F2937] focus:outline-none focus:border-[#111827] focus:ring-1 focus:ring-[#111827]"
            />
          </div>
        </div>

        {/* 2. Pricing & Inventory */}
        <div className="bg-white border border-[#C5C9D0] rounded-xl p-6 space-y-4 shadow-2xs">
          <h2 className="text-xs font-bold text-[#1F2937] uppercase tracking-wider border-b border-[#C5C9D0] pb-2">
            2. Pricing & Inventory
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#374151] mb-1.5">
                Current Price (₹) <span className="text-rose-600">*</span>
              </label>
              <input
                type="number"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="1499"
                required
                className="w-full px-3.5 py-2 text-sm bg-white border border-[#BFC5CE] rounded-lg text-[#1F2937] focus:outline-none focus:border-[#111827] focus:ring-1 focus:ring-[#111827]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#374151] mb-1.5">
                Original Price (₹) <span className="text-[#6B7280] font-normal">(For discount tag)</span>
              </label>
              <input
                type="number"
                min="0"
                value={originalPrice}
                onChange={(e) => setOriginalPrice(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="4990"
                className="w-full px-3.5 py-2 text-sm bg-white border border-[#BFC5CE] rounded-lg text-[#1F2937] focus:outline-none focus:border-[#111827] focus:ring-1 focus:ring-[#111827]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#374151] mb-1.5">
                Stock Quantity (Units)
              </label>
              <input
                type="number"
                min="0"
                value={stockQuantity}
                onChange={(e) => setStockQuantity(Number(e.target.value))}
                className="w-full px-3.5 py-2 text-sm bg-white border border-[#BFC5CE] rounded-lg text-[#1F2937] focus:outline-none focus:border-[#111827] focus:ring-1 focus:ring-[#111827]"
              />
            </div>
          </div>

          <div className="flex items-center gap-2.5 pt-2">
            <input
              type="checkbox"
              id="inStockCheck"
              checked={inStock}
              onChange={(e) => setInStock(e.target.checked)}
              className="w-4 h-4 rounded border-[#BFC5CE] text-gray-900 focus:ring-[#111827]"
            />
            <label htmlFor="inStockCheck" className="text-xs font-semibold text-[#374151] cursor-pointer">
              Mark product as In Stock & available for immediate purchase
            </label>
          </div>
        </div>

        {/* 3. Product Imagery */}
        <div className="bg-white border border-[#C5C9D0] rounded-xl p-6 space-y-4 shadow-2xs">
          <h2 className="text-xs font-bold text-[#1F2937] uppercase tracking-wider border-b border-[#C5C9D0] pb-2">
            3. Product Imagery
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            <div className="md:col-span-2 space-y-2">
              <label className="block text-xs font-semibold text-[#374151]">
                Primary Product Image URL <span className="text-rose-600">*</span>
              </label>
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://images.unsplash.com/..."
                required
                className="w-full px-3.5 py-2 text-sm bg-white border border-[#BFC5CE] rounded-lg text-[#1F2937] focus:outline-none focus:border-[#111827] focus:ring-1 focus:ring-[#111827]"
              />
              <p className="text-[11px] text-[#6B7280]">
                Direct image link (Unsplash, CDN, or Cloudinary). Uses high-resolution electronics photography.
              </p>
            </div>

            {/* Live Preview Box */}
            <div className="flex flex-col items-center">
              <span className="text-xs font-semibold text-[#6B7280] mb-1.5">Card Preview</span>
              <div className="w-24 h-24 rounded-lg bg-gray-50 border border-[#BFC5CE] overflow-hidden flex items-center justify-center relative shadow-xs">
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                    onError={(e) => handleImageError(e, name || "Preview")}
                  />
                ) : (
                  <div className="text-center p-2 text-gray-400 flex flex-col items-center">
                    <ImageIcon size={18} className="mb-1" />
                    <span className="text-[10px]">No image</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 4. Merchandising & Sections */}
        <div className="bg-white border border-[#C5C9D0] rounded-xl p-6 space-y-4 shadow-2xs">
          <h2 className="text-xs font-bold text-[#1F2937] uppercase tracking-wider border-b border-[#C5C9D0] pb-2">
            4. Merchandising & Sections
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#374151] mb-1.5">
                Badge Label (Optional)
              </label>
              <input
                type="text"
                value={badge}
                onChange={(e) => setBadge(e.target.value)}
                placeholder="e.g. New Launch, Bestseller, Free Spotify"
                className="w-full px-3.5 py-2 text-sm bg-white border border-[#BFC5CE] rounded-lg text-[#1F2937] focus:outline-none focus:border-[#111827] focus:ring-1 focus:ring-[#111827]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#374151] mb-1.5">
                Badge Icon
              </label>
              <select
                value={badgeIcon}
                onChange={(e) => setBadgeIcon(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-white border border-[#BFC5CE] rounded-lg text-[#1F2937] focus:outline-none focus:border-[#111827]"
              >
                <option value="🚀">🚀 Rocket (New Launch)</option>
                <option value="🔥">🔥 Fire (Trending / Hot)</option>
                <option value="🎵">🎵 Music (Free Spotify)</option>
                <option value="💰">💰 Money (Special Discount)</option>
                <option value="✏️">✏️ Pencil (Engraving)</option>
                <option value="👑">👑 Crown (Premium)</option>
                <option value="🎮">🎮 Gamepad (Gaming)</option>
                <option value="⚡">⚡ Lightning (Power)</option>
              </select>
            </div>
          </div>

          {/* Section Placement Checkboxes */}
          <div>
            <label className="block text-xs font-semibold text-[#374151] mb-2">
              Featured Homepage Sections
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {SECTION_OPTIONS.map((sec) => (
                <label
                  key={sec.id}
                  className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                    selectedSections.includes(sec.id)
                      ? "bg-[#EEF2F7] border-[#AEB6C2] text-[#1F2937] font-semibold"
                      : "bg-white border-[#BFC5CE] text-[#6B7280] hover:text-[#1F2937] hover:bg-gray-50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedSections.includes(sec.id)}
                    onChange={() => handleToggleSection(sec.id)}
                    className="rounded border-[#BFC5CE] text-gray-900 focus:ring-[#111827]"
                  />
                  <span>{sec.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Available Colors */}
          <div>
            <label className="block text-xs font-semibold text-[#374151] mb-2">
              Color Swatches
            </label>
            <div className="flex flex-wrap gap-2">
              {COLOR_OPTIONS.map((c) => (
                <button
                  type="button"
                  key={c.value}
                  onClick={() => handleToggleColor(c.value)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs transition-all cursor-pointer ${
                    selectedColors.includes(c.value)
                      ? "bg-[#EEF2F7] border-[#AEB6C2] text-[#1F2937] font-semibold"
                      : "bg-white border-[#BFC5CE] text-[#6B7280] hover:bg-gray-50"
                  }`}
                >
                  <span className={`w-3.5 h-3.5 rounded-full border border-gray-300 ${c.value}`} />
                  <span>{c.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Submit Actions ── */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#C5C9D0]">
          <Link
            to="/admin/products"
            className="px-5 py-2.5 rounded-lg bg-gray-100 hover:bg-gray-200 border border-[#BFC5CE] text-xs font-semibold text-gray-700 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2.5 rounded-lg bg-gray-900 hover:bg-gray-800 text-white text-xs font-semibold flex items-center gap-2 transition-all shadow-xs disabled:opacity-50 cursor-pointer"
          >
            <Save size={15} />
            <span>{submitting ? "Saving..." : isEditing ? "Save Product Changes" : "Publish Product"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
