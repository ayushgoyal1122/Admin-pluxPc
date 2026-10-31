import { useState, useEffect, useMemo } from "react";
import {
  Tag,
  Search,
  Filter,
  Plus,
  RefreshCw,
  Edit,
  Calendar,
  CheckCircle2,
  AlertCircle,
  X,
  Copy,
  Percent,
  TrendingDown,
  Layers,
  ChevronRight,
  Archive,
  RotateCcw,
} from "lucide-react";
import {
  adminGetPromotions,
  adminCreatePromotion,
  adminUpdatePromotion,
  adminTogglePromotion,
  adminDeletePromotion,
  adminRestorePromotion,
  adminGetProducts,
} from "../services/api";
import { formatPrice } from "../utils";
import type { Promotion, Product, DiscountPreviewItem } from "../types";

export default function AdminPromoCodesPage() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<Promotion | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form Fields
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [discountValue, setDiscountValue] = useState<number | "">("");
  const [appliesTo, setAppliesTo] = useState<"all" | "specific">("specific");
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [noExpiry, setNoExpiry] = useState(true);
  const [minPurchaseAmount, setMinPurchaseAmount] = useState<number | "">("");
  const [maxDiscountAmount, setMaxDiscountAmount] = useState<number | "">("");
  const [maxUsageLimit, setMaxUsageLimit] = useState<number | "">("");
  const [perCustomerLimit, setPerCustomerLimit] = useState<number | "">(1);

  // Delete Confirmation Modal
  const [deleteTarget, setDeleteTarget] = useState<Promotion | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  // Product Search inside modal
  const [modalProductSearch, setModalProductSearch] = useState("");

  // Feedback banner
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [promosRes, prodsRes] = await Promise.all([
        adminGetPromotions({ status: "all" }),
        adminGetProducts(),
      ]);

      if (promosRes.success && Array.isArray(promosRes.promotions)) {
        setPromotions(promosRes.promotions);
      } else {
        setPromotions([]);
      }

      const prodList = prodsRes.products || prodsRes.data || (Array.isArray(prodsRes) ? prodsRes : []);
      setProducts(prodList);
    } catch (err: any) {
      console.error("[Load Promotions Error]:", err);
      setError("Failed to load promotions catalog. Please check backend connection.");
    } finally {
      setLoading(false);
    }
  };

  const showToast = (type: "success" | "error", text: string) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 4000);
  };

  // Broadcast update to storefront tabs for instant real-time sync without reload
  const notifyPromotionUpdate = () => {
    try {
      const bc = new BroadcastChannel("voltix_promotions_sync");
      bc.postMessage({ type: "PROMOTIONS_UPDATED", timestamp: Date.now() });
      setTimeout(() => {
        try {
          bc.close();
        } catch {
          // ignore
        }
      }, 300);
    } catch {
      // ignore
    }
    try {
      localStorage.setItem("voltix_promotions_updated", Date.now().toString());
    } catch {
      // ignore
    }
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingPromo(null);
    setName("");
    setCode("");
    setDescription("");
    setDiscountType("percentage");
    setDiscountValue("");
    setAppliesTo("specific");
    setSelectedProductIds([]);
    setIsActive(true);
    const nowStr = new Date().toISOString().slice(0, 16);
    setStartDate(nowStr);
    setEndDate("");
    setNoExpiry(true);
    setMinPurchaseAmount("");
    setMaxDiscountAmount("");
    setMaxUsageLimit("");
    setPerCustomerLimit(1);
    setFormError(null);
    setModalProductSearch("");
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (promo: Promotion) => {
    setEditingPromo(promo);
    setName(promo.name);
    setCode(promo.code);
    setDescription(promo.description || "");
    setDiscountType(promo.discountType);
    setDiscountValue(promo.discountValue);
    setAppliesTo(promo.appliesTo);

    const ids: string[] = Array.isArray(promo.products)
      ? promo.products.map((p: any) => (p._id || p.id || p).toString())
      : [];
    setSelectedProductIds(ids);

    setIsActive(promo.isActive);
    setStartDate(promo.startDate ? new Date(promo.startDate).toISOString().slice(0, 16) : "");
    if (promo.endDate) {
      setEndDate(new Date(promo.endDate).toISOString().slice(0, 16));
      setNoExpiry(false);
    } else {
      setEndDate("");
      setNoExpiry(true);
    }

    setMinPurchaseAmount(promo.minPurchaseAmount || "");
    setMaxDiscountAmount(promo.maxDiscountAmount || "");
    setMaxUsageLimit(promo.maxUsageLimit || "");
    setPerCustomerLimit(promo.perCustomerLimit || 1);
    setFormError(null);
    setModalProductSearch("");
    setIsModalOpen(true);
  };

  // Quick Toggle Active State
  const handleToggle = async (promo: Promotion) => {
    try {
      const res = await adminTogglePromotion(promo._id || promo.id || "");
      if (res.success) {
        setPromotions((prev) =>
          prev.map((p) => (p._id === promo._id ? { ...p, isActive: res.isActive } : p))
        );
        notifyPromotionUpdate();
        showToast("success", res.message || "Promotion status updated.");
      } else {
        showToast("error", res.message || "Failed to update status.");
      }
    } catch (err: any) {
      showToast("error", err.message || "Network error while toggling promotion.");
    }
  };

  // Submit Form (Create or Edit)
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name.trim()) {
      setFormError("Promotion name is required.");
      return;
    }
    if (!code.trim()) {
      setFormError("Promo code is required.");
      return;
    }
    if (discountValue === "" || Number(discountValue) <= 0) {
      setFormError("Discount value must be greater than zero.");
      return;
    }
    if (discountType === "percentage" && Number(discountValue) > 100) {
      setFormError("Percentage discount cannot exceed 100%.");
      return;
    }
    if (appliesTo === "specific" && selectedProductIds.length === 0) {
      setFormError("Please select at least one product for a specific product promotion.");
      return;
    }

    setSaving(true);
    try {
      const payload: any = {
        name: name.trim(),
        code: code.trim().toUpperCase().replace(/\s+/g, ""),
        description: description.trim(),
        discountType,
        discountValue: Number(discountValue),
        appliesTo,
        products: appliesTo === "specific" ? selectedProductIds : [],
        isActive,
        startDate: startDate ? new Date(startDate).toISOString() : new Date().toISOString(),
        endDate: noExpiry || !endDate ? null : new Date(endDate).toISOString(),
        minPurchaseAmount: minPurchaseAmount === "" ? 0 : Number(minPurchaseAmount),
        maxDiscountAmount: maxDiscountAmount === "" || discountType === "fixed" ? null : Number(maxDiscountAmount),
        maxUsageLimit: maxUsageLimit === "" ? null : Number(maxUsageLimit),
        perCustomerLimit: perCustomerLimit === "" ? 1 : Number(perCustomerLimit),
      };

      let res;
      if (editingPromo) {
        res = await adminUpdatePromotion(editingPromo._id || editingPromo.id || "", payload);
      } else {
        res = await adminCreatePromotion(payload);
      }

      if (res.success) {
        notifyPromotionUpdate();
        showToast("success", res.message || "Promotion saved successfully!");
        setIsModalOpen(false);
        loadData();
      } else {
        setFormError(res.message || "Failed to save promotion.");
      }
    } catch (err: any) {
      setFormError(err.message || "An unexpected error occurred while saving.");
    } finally {
      setSaving(false);
    }
  };

  // Confirm Archive (Soft Delete)
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await adminDeletePromotion(deleteTarget._id || deleteTarget.id || "");
      if (res.success) {
        notifyPromotionUpdate();
        showToast("success", res.message || "Promotion archived.");
        setDeleteTarget(null);
        loadData();
      } else {
        showToast("error", res.message || "Failed to archive promotion.");
      }
    } catch (err: any) {
      showToast("error", err.message || "Error archiving promotion.");
    } finally {
      setDeleting(false);
    }
  };

  // Restore Archived Promotion
  const handleRestore = async (promo: Promotion) => {
    const promoId = promo._id || promo.id || "";
    setRestoringId(promoId);
    try {
      const res = await adminRestorePromotion(promoId);
      if (res.success) {
        notifyPromotionUpdate();
        showToast("success", res.message || `Promotion '${promo.name}' restored successfully.`);
        loadData();
      } else {
        showToast("error", res.message || "Failed to restore promotion.");
      }
    } catch (err: any) {
      showToast("error", err.message || "Network error while restoring promotion.");
    } finally {
      setRestoringId(null);
    }
  };

  // Copy Promo Code to clipboard
  const handleCopyCode = (promoCode: string) => {
    navigator.clipboard.writeText(promoCode);
    showToast("success", `Promo code "${promoCode}" copied to clipboard!`);
  };

  // Filtered Promotions for Table
  const filteredPromotions = useMemo(() => {
    return promotions.filter((p) => {
      const matchesSearch =
        searchQuery === "" ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));

      let matchesStatus = true;
      const now = new Date();
      const isExpired = p.endDate ? new Date(p.endDate) < now : false;
      const isScheduled = p.startDate ? new Date(p.startDate) > now : false;

      if (statusFilter === "archived") {
        matchesStatus = Boolean(p.isDeleted);
      } else if (statusFilter === "active") {
        matchesStatus = !p.isDeleted && p.isActive && !isExpired && !isScheduled;
      } else if (statusFilter === "inactive") {
        matchesStatus = !p.isDeleted && !p.isActive;
      } else if (statusFilter === "expired") {
        matchesStatus = !p.isDeleted && isExpired;
      } else if (statusFilter === "scheduled") {
        matchesStatus = !p.isDeleted && isScheduled;
      } else {
        // "all"
        matchesStatus = true;
      }

      let matchesType = true;
      if (typeFilter !== "all") {
        matchesType = p.discountType === typeFilter;
      }

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [promotions, searchQuery, statusFilter, typeFilter]);

  // Metric Computations
  const metrics = useMemo(() => {
    const activePromos = promotions.filter((p) => !p.isDeleted);
    const total = activePromos.length;
    const archived = promotions.filter((p) => p.isDeleted).length;
    const now = new Date();
    const active = activePromos.filter(
      (p) => p.isActive && (!p.endDate || new Date(p.endDate) >= now) && (!p.startDate || new Date(p.startDate) <= now)
    ).length;
    const totalRedemptions = promotions.reduce((acc, p) => acc + (p.usedCount || 0), 0);
    const coveredProducts = new Set<string>();
    activePromos.forEach((p) => {
      if (p.isActive) {
        if (p.appliesTo === "all") {
          products.forEach((prod) => coveredProducts.add(prod.id));
        } else if (Array.isArray(p.products)) {
          p.products.forEach((prod: any) => coveredProducts.add(prod._id || prod.id || prod));
        }
      }
    });

    return {
      total,
      active,
      archived,
      totalRedemptions,
      discountedProductsCount: coveredProducts.size,
    };
  }, [promotions, products]);

  // Live Preview Calculations in Modal (Phase 11 requirement)
  const livePreviewItems = useMemo<DiscountPreviewItem[]>(() => {
    const val = Number(discountValue) || 0;
    if (val <= 0) return [];

    const targetList =
      appliesTo === "all"
        ? products.slice(0, 5)
        : products.filter((p) => selectedProductIds.includes(p.id)).slice(0, 5);

    return targetList.map((p) => {
      const price = Number(p.price) || 0;
      let discount = 0;
      if (discountType === "percentage") {
        discount = (price * val) / 100;
        if (maxDiscountAmount && Number(maxDiscountAmount) > 0 && discount > Number(maxDiscountAmount)) {
          discount = Number(maxDiscountAmount);
        }
      } else {
        discount = Math.min(price, val);
      }
      discount = Math.min(price, Math.max(0, Math.round(discount * 100) / 100));
      const discountedPrice = Math.max(0, Math.round((price - discount) * 100) / 100);
      const savingsPercent = price > 0 ? Math.round((discount / price) * 100) : 0;

      return {
        id: p.id,
        name: p.name,
        price,
        discount,
        discountedPrice,
        savingsPercent,
      };
    });
  }, [discountType, discountValue, maxDiscountAmount, appliesTo, selectedProductIds, products]);

  // Filtered products inside the selection modal
  const modalAvailableProducts = useMemo(() => {
    if (!modalProductSearch.trim()) return products;
    const q = modalProductSearch.toLowerCase();
    return products.filter(
      (p) => p.name.toLowerCase().includes(q) || (p.categoryLabel && p.categoryLabel.toLowerCase().includes(q))
    );
  }, [products, modalProductSearch]);

  const toggleSelectProduct = (productId: string) => {
    setSelectedProductIds((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
    );
  };

  const handleSelectAllFiltered = () => {
    const allFilteredIds = modalAvailableProducts.map((p) => p.id);
    setSelectedProductIds((prev) => Array.from(new Set([...prev, ...allFilteredIds])));
  };

  const handleClearAllSelected = () => {
    setSelectedProductIds([]);
  };

  return (
    <div className="p-6 sm:p-8 space-y-6 max-w-7xl mx-auto">
      {/* ── Top Breadcrumb & Action Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 mb-1">
            <span>Orders & Sales</span>
            <ChevronRight size={12} />
            <span className="text-gray-700">Promo Codes & Discounts</span>
          </div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2.5">
            <Tag size={24} className="text-volt-red" />
            <span>Promo Codes & Discounts</span>
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Manage promotional campaigns, percentage discounts, fixed reductions, and coupon redemptions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors shadow-xs"
          >
            <RefreshCw size={13} className={loading ? "animate-spin text-volt-red" : ""} />
            <span>Reload</span>
          </button>
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-volt-red text-white text-xs font-bold hover:bg-[#C9191E] transition-colors shadow-sm"
          >
            <Plus size={15} />
            <span>Create Promotion</span>
          </button>
        </div>
      </div>

      {/* ── Toast Notification ── */}
      {error && (
        <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-gray-400 hover:text-gray-600">
            <X size={14} />
          </button>
        </div>
      )}

      {feedback && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center justify-between animate-fadeIn ${
            feedback.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{feedback.text}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-gray-400 hover:text-gray-600">
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── Metrics Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Campaigns</span>
            <div className="w-8 h-8 rounded-lg bg-red-50 text-volt-red flex items-center justify-center">
              <Tag size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-gray-900 mt-2">{metrics.total}</p>
          <p className="text-[11px] text-gray-500 mt-0.5">Configured promo codes</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Active Campaigns</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-700 mt-2">{metrics.active}</p>
          <p className="text-[11px] text-gray-500 mt-0.5">Live on storefront</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Redemptions</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <TrendingDown size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-gray-900 mt-2">{metrics.totalRedemptions}</p>
          <p className="text-[11px] text-gray-500 mt-0.5">Total customer uses</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Discounted SKUs</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Layers size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-gray-900 mt-2">{metrics.discountedProductsCount}</p>
          <p className="text-[11px] text-gray-500 mt-0.5">Products receiving discounts</p>
        </div>
      </div>

      {/* ── Search & Filters Bar ── */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search promotion name, promo code, or description..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
          />
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Filter size={13} />
            <span>Filter:</span>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-gray-200 text-xs text-gray-700 bg-white focus:outline-none focus:border-gray-900"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive</option>
            <option value="scheduled">Scheduled</option>
            <option value="expired">Expired</option>
            <option value="archived">Archived (Soft Deleted)</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-gray-200 text-xs text-gray-700 bg-white focus:outline-none focus:border-gray-900"
          >
            <option value="all">All Discount Types</option>
            <option value="percentage">Percentage (%)</option>
            <option value="fixed">Fixed Amount (₹)</option>
          </select>
        </div>
      </div>

      {/* ── Promotions Table ── */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-gray-500 animate-pulse space-y-2">
            <RefreshCw size={24} className="animate-spin mx-auto text-volt-red mb-2" />
            <p>Loading promotions catalog...</p>
          </div>
        ) : filteredPromotions.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center mx-auto">
              <Tag size={20} />
            </div>
            <p className="text-sm font-bold text-gray-700">No promotions found</p>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              {searchQuery || statusFilter !== "all" || typeFilter !== "all"
                ? "No campaigns matched your search or filter criteria. Try clearing filters."
                : "Get started by creating your first promotional discount campaign for products."}
            </p>
            <button
              onClick={handleOpenCreate}
              className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-volt-red text-white text-xs font-bold hover:bg-[#C9191E]"
            >
              <Plus size={14} />
              <span>Create Promotion</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50/70 border-b border-gray-200 text-gray-500 uppercase tracking-wider font-bold text-[10px]">
                  <th className="py-3.5 px-4">Campaign & Code</th>
                  <th className="py-3.5 px-4">Discount</th>
                  <th className="py-3.5 px-4">Applies To</th>
                  <th className="py-3.5 px-4">Validity</th>
                  <th className="py-3.5 px-4">Redemptions</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredPromotions.map((promo) => {
                  const now = new Date();
                  const isExpired = promo.endDate ? new Date(promo.endDate) < now : false;
                  const isScheduled = promo.startDate ? new Date(promo.startDate) > now : false;

                  return (
                    <tr key={promo._id} className="hover:bg-gray-50/50 transition-colors">
                      {/* Code & Campaign Name */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleCopyCode(promo.code)}
                            title="Click to copy promo code"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-mono font-black text-xs bg-gray-100 text-gray-900 border border-gray-200 hover:bg-gray-200 transition-colors"
                          >
                            <span>{promo.code}</span>
                            <Copy size={11} className="text-gray-500" />
                          </button>
                        </div>
                        <p className="font-bold text-gray-900 mt-1">{promo.name}</p>
                        {promo.description && (
                          <p className="text-[11px] text-gray-500 line-clamp-1">{promo.description}</p>
                        )}
                      </td>

                      {/* Discount Type & Value */}
                      <td className="py-3.5 px-4">
                        {promo.discountType === "percentage" ? (
                          <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <Percent size={11} />
                            <span>{promo.discountValue}% OFF</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-blue-50 text-blue-700 border border-blue-200">
                            <span>₹{promo.discountValue} OFF</span>
                          </div>
                        )}
                        {promo.maxDiscountAmount && promo.discountType === "percentage" ? (
                          <p className="text-[10px] text-gray-400 mt-0.5">Cap: ₹{promo.maxDiscountAmount}</p>
                        ) : null}
                      </td>

                      {/* Applies To */}
                      <td className="py-3.5 px-4">
                        {promo.appliesTo === "all" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                            Storewide (All)
                          </span>
                        ) : (
                          <div>
                            <span className="font-semibold text-gray-800">
                              {Array.isArray(promo.products) ? promo.products.length : 0} Products
                            </span>
                            {promo.minPurchaseAmount && promo.minPurchaseAmount > 0 ? (
                              <p className="text-[10px] text-gray-400 mt-0.5">
                                Min: ₹{promo.minPurchaseAmount.toLocaleString("en-IN")}
                              </p>
                            ) : null}
                          </div>
                        )}
                      </td>

                      {/* Validity Dates */}
                      <td className="py-3.5 px-4 text-gray-600">
                        <div className="flex items-center gap-1 text-[11px]">
                          <Calendar size={11} className="text-gray-400 flex-shrink-0" />
                          <span>
                            {new Date(promo.startDate).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                            })}
                          </span>
                          <span>→</span>
                          <span>
                            {promo.endDate
                              ? new Date(promo.endDate).toLocaleDateString("en-IN", {
                                  day: "numeric",
                                  month: "short",
                                  year: "2-digit",
                                })
                              : "No expiry"}
                          </span>
                        </div>
                      </td>

                      {/* Usage Stats */}
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-gray-900">{promo.usedCount || 0}</span>
                        <span className="text-gray-400"> / {promo.maxUsageLimit ? promo.maxUsageLimit : "∞"}</span>
                      </td>

                      {/* Status + Toggle */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          {promo.isDeleted ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full">
                              <Archive size={11} />
                              Archived
                            </span>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => handleToggle(promo)}
                                title={promo.isActive ? "Click to deactivate" : "Click to activate"}
                                className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                  promo.isActive ? "bg-emerald-600" : "bg-gray-300"
                                }`}
                              >
                                <span
                                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                                    promo.isActive ? "translate-x-4" : "translate-x-0"
                                  }`}
                                />
                              </button>

                              {isExpired ? (
                                <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded">
                                  Expired
                                </span>
                              ) : isScheduled ? (
                                <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                                  Scheduled
                                </span>
                              ) : promo.isActive ? (
                                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                                  Active
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                  Inactive
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      </td>

                      {/* Action buttons */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {promo.isDeleted ? (
                            <button
                              onClick={() => handleRestore(promo)}
                              disabled={restoringId === (promo._id || promo.id)}
                              title="Restore Campaign"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-xs font-bold transition-colors"
                            >
                              <RotateCcw size={12} className={restoringId === (promo._id || promo.id) ? "animate-spin" : ""} />
                              <span>Restore</span>
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={() => handleOpenEdit(promo)}
                                title="Edit Promotion"
                                className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                              >
                                <Edit size={14} />
                              </button>
                              <button
                                onClick={() => setDeleteTarget(promo)}
                                title="Archive Promotion"
                                className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              >
                                <Archive size={14} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── CREATE / EDIT PROMOTION MODAL ── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-3xl max-w-3xl w-full p-6 sm:p-7 shadow-xl space-y-6 max-h-[92vh] overflow-y-auto animate-scaleIn">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-red-50 text-volt-red flex items-center justify-center">
                  <Tag size={16} />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-gray-900">
                    {editingPromo ? "Edit Promotion" : "Create New Promotion"}
                  </h2>
                  <p className="text-xs text-gray-500">
                    Configure promo codes, discount percentages, and eligible catalog items.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center transition-colors"
              >
                <X size={15} />
              </button>
            </div>

            {formError && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700 flex items-center gap-2">
                <AlertCircle size={15} className="flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-6">
              {/* Campaign Name & Promo Code Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Promotion Name <span className="text-volt-red">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Festive Diwali Sale"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Promo Code <span className="text-volt-red">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase().replace(/\s+/g, ""))}
                    placeholder="e.g. PLUXPC20"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-mono font-bold text-gray-900 uppercase focus:outline-none focus:border-gray-900"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">Customers enter this at checkout or view it on cards.</p>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Campaign Description (Optional)
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Get 20% off on all wireless audio and charging gear."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-gray-900"
                />
              </div>

              {/* Discount Type & Value (Phase 2 requirement) */}
              <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200/80 space-y-4">
                <span className="text-xs font-bold text-gray-800 block">Discount Configuration</span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-500 mb-1.5">
                      Discount Type
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setDiscountType("percentage")}
                        className={`py-2 px-3 rounded-xl text-xs font-bold border transition-colors flex items-center justify-center gap-1.5 ${
                          discountType === "percentage"
                            ? "bg-gray-900 text-white border-gray-900 shadow-xs"
                            : "bg-white text-gray-700 border-gray-200 hover:bg-gray-100"
                        }`}
                      >
                        <Percent size={13} />
                        <span>Percentage (%)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setDiscountType("fixed")}
                        className={`py-2 px-3 rounded-xl text-xs font-bold border transition-colors flex items-center justify-center gap-1.5 ${
                          discountType === "fixed"
                            ? "bg-gray-900 text-white border-gray-900 shadow-xs"
                            : "bg-white text-gray-700 border-gray-200 hover:bg-gray-100"
                        }`}
                      >
                        <span>₹ Fixed Amount</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-500 mb-1.5">
                      {discountType === "percentage" ? "Discount Percentage (%)" : "Discount Amount (₹)"}{" "}
                      <span className="text-volt-red">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        required
                        min="0.01"
                        max={discountType === "percentage" ? "100" : undefined}
                        step="0.01"
                        value={discountValue}
                        onChange={(e) =>
                          setDiscountValue(e.target.value === "" ? "" : Number(e.target.value))
                        }
                        placeholder={discountType === "percentage" ? "e.g. 20" : "e.g. 300"}
                        className="w-full pl-3.5 pr-8 py-2.5 rounded-xl border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-gray-900 bg-white"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">
                        {discountType === "percentage" ? "%" : "₹"}
                      </span>
                    </div>
                  </div>
                </div>

                {discountType === "percentage" && (
                  <div className="pt-2 border-t border-gray-200/60">
                    <label className="block text-[11px] font-semibold text-gray-500 mb-1">
                      Max Discount Cap in INR (Optional)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={maxDiscountAmount}
                      onChange={(e) =>
                        setMaxDiscountAmount(e.target.value === "" ? "" : Number(e.target.value))
                      }
                      placeholder="e.g. 1000 (limits 20% off to maximum ₹1,000)"
                      className="w-full sm:w-1/2 px-3.5 py-2 rounded-xl border border-gray-200 text-xs text-gray-900 bg-white focus:outline-none focus:border-gray-900"
                    />
                  </div>
                )}
              </div>

              {/* Product Selection Scope */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-800">Applies To</span>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1.5 text-xs text-gray-700 cursor-pointer">
                      <input
                        type="radio"
                        name="appliesTo"
                        checked={appliesTo === "specific"}
                        onChange={() => setAppliesTo("specific")}
                        className="text-volt-red focus:ring-volt-red"
                      />
                      <span>Specific Products</span>
                    </label>

                    <label className="flex items-center gap-1.5 text-xs text-gray-700 cursor-pointer">
                      <input
                        type="radio"
                        name="appliesTo"
                        checked={appliesTo === "all"}
                        onChange={() => setAppliesTo("all")}
                        className="text-volt-red focus:ring-volt-red"
                      />
                      <span>All Products (Storewide)</span>
                    </label>
                  </div>
                </div>

                {appliesTo === "specific" && (
                  <div className="p-3.5 rounded-2xl border border-gray-200 bg-gray-50/50 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="relative flex-1 max-w-xs">
                        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          value={modalProductSearch}
                          onChange={(e) => setModalProductSearch(e.target.value)}
                          placeholder="Search products to add..."
                          className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-gray-200 text-xs bg-white focus:outline-none focus:border-gray-900"
                        />
                      </div>

                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-gray-500 font-semibold">
                          Selected: {selectedProductIds.length} of {products.length}
                        </span>
                        <button
                          type="button"
                          onClick={handleSelectAllFiltered}
                          className="px-2 py-1 rounded bg-gray-200 text-gray-700 text-[11px] font-bold hover:bg-gray-300"
                        >
                          Select Filtered
                        </button>
                        <button
                          type="button"
                          onClick={handleClearAllSelected}
                          className="px-2 py-1 rounded bg-gray-200 text-gray-700 text-[11px] font-bold hover:bg-gray-300"
                        >
                          Clear
                        </button>
                      </div>
                    </div>

                    {/* Products Checklist */}
                    <div className="max-h-52 overflow-y-auto divide-y divide-gray-100 bg-white rounded-xl border border-gray-200 p-1">
                      {modalAvailableProducts.map((p) => {
                        const isSelected = selectedProductIds.includes(p.id);
                        return (
                          <label
                            key={p.id}
                            className={`flex items-center justify-between p-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${
                              isSelected ? "bg-red-50/40" : ""
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleSelectProduct(p.id)}
                                className="rounded text-volt-red focus:ring-volt-red"
                              />
                              <img
                                src={p.imageUrl}
                                alt={p.name}
                                className="w-8 h-8 rounded-md object-cover border border-gray-100 flex-shrink-0"
                              />
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-gray-900 truncate">{p.name}</p>
                                <span className="text-[10px] text-gray-400">{p.categoryLabel}</span>
                              </div>
                            </div>
                            <span className="text-xs font-bold text-gray-900 ml-3 flex-shrink-0">
                              {formatPrice(p.price)}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* ── LIVE DISCOUNT PREVIEW CARD (Phase 11 Requirement) ── */}
              {livePreviewItems.length > 0 && (
                <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50/80 to-teal-50/40 border border-emerald-200/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-emerald-900 flex items-center gap-1.5">
                      <TrendingDown size={14} className="text-emerald-600" />
                      <span>Live Discount Preview (Sample Calculations)</span>
                    </span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                      Real-time Calculation
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {livePreviewItems.map((item) => (
                      <div
                        key={item.id}
                        className="p-2.5 rounded-xl bg-white border border-emerald-100 shadow-2xs space-y-1"
                      >
                        <p className="font-bold text-gray-900 text-[11px] truncate">{item.name}</p>
                        <div className="flex items-baseline justify-between text-xs pt-1 border-t border-gray-100">
                          <span className="text-gray-400 line-through text-[11px]">{formatPrice(item.price)}</span>
                          <span className="text-xs font-black text-emerald-700">
                            {formatPrice(item.discountedPrice)}
                          </span>
                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                            Save {formatPrice(item.discount)} ({item.savingsPercent}%)
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Schedule Dates & Limits */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">Start Date & Time</label>
                  <input
                    type="datetime-local"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-gray-900"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-gray-700">End Date & Time</label>
                    <label className="flex items-center gap-1 text-[11px] text-gray-500 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={noExpiry}
                        onChange={(e) => setNoExpiry(e.target.checked)}
                        className="rounded text-volt-red focus:ring-volt-red"
                      />
                      <span>No Expiry</span>
                    </label>
                  </div>
                  <input
                    type="datetime-local"
                    disabled={noExpiry}
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-xs text-gray-900 disabled:bg-gray-100 focus:outline-none focus:border-gray-900"
                  />
                </div>
              </div>

              {/* Guardrails / Usage limits */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 mb-1">
                    Min Cart Subtotal (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={minPurchaseAmount}
                    onChange={(e) =>
                      setMinPurchaseAmount(e.target.value === "" ? "" : Number(e.target.value))
                    }
                    placeholder="0 = No minimum"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 mb-1">
                    Global Usage Limit
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={maxUsageLimit}
                    onChange={(e) =>
                      setMaxUsageLimit(e.target.value === "" ? "" : Number(e.target.value))
                    }
                    placeholder="e.g. 500 (blank = ∞)"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 mb-1">
                    Per Customer Limit
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={perCustomerLimit}
                    onChange={(e) =>
                      setPerCustomerLimit(e.target.value === "" ? "" : Number(e.target.value))
                    }
                    placeholder="Default 1"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-gray-900"
                  />
                </div>
              </div>

              {/* Active Toggle */}
              <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded text-volt-red focus:ring-volt-red"
                />
                <label htmlFor="isActive" className="text-xs font-bold text-gray-800 cursor-pointer">
                  Activate this promotion immediately on the storefront
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl bg-gray-100 text-gray-700 text-xs font-bold hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 rounded-xl bg-volt-red text-white text-xs font-bold hover:bg-[#C9191E] disabled:bg-gray-400 transition-colors shadow-sm"
                >
                  {saving ? "Saving..." : editingPromo ? "Update Promotion" : "Create Promotion"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── ARCHIVE CONFIRMATION SAFETY MODAL ── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-3xl max-w-md w-full p-6 text-center space-y-4 shadow-xl animate-scaleIn">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <Archive size={22} />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-gray-900">Archive Promotion?</h3>
              <p className="text-xs text-gray-500 mt-1">
                Are you sure you want to archive{" "}
                <strong className="text-gray-900 font-mono">{deleteTarget.code}</strong> (
                {deleteTarget.name})?
              </p>
              <div className="mt-3 p-3 bg-gray-50 rounded-xl text-left space-y-1.5 border border-gray-100">
                <p className="text-[11px] text-gray-600">
                  • The promo code will be deactivated immediately and excluded from storefront promos, cart validation, and checkout.
                </p>
                <p className="text-[11px] text-gray-600">
                  • Historical orders that redeemed this code will retain their discounts, prices, and line-item snapshots.
                </p>
                <p className="text-[11px] text-gray-600">
                  • You can restore this campaign at any time without losing usage counts or customer redemption history.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="px-5 py-2.5 rounded-xl bg-gray-100 text-gray-700 text-xs font-bold hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 disabled:bg-gray-400"
              >
                <Archive size={14} />
                <span>{deleting ? "Archiving..." : "Archive Promotion"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
