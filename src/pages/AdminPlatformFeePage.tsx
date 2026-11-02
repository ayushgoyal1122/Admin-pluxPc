import { useState, useEffect, useMemo } from "react";
import {
  Sliders,
  DollarSign,
  Percent,
  CheckCircle2,
  AlertCircle,
  Save,
  RefreshCw,
  Info,
  ShieldCheck,
  ChevronRight,
  TrendingUp,
} from "lucide-react";
import {
  adminGetPlatformFeeSettings,
  adminUpdatePlatformFeeSettings,
  adminTogglePlatformFee,
} from "../services/api";
import { formatPrice } from "../utils";
import type { PlatformFeeSettings } from "../types";

export default function AdminPlatformFeePage() {
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [toggling, setToggling] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Form Fields
  const [enabled, setEnabled] = useState<boolean>(false);
  const [feeType, setFeeType] = useState<"fixed" | "percentage">("fixed");
  const [feeValue, setFeeValue] = useState<string>("10");
  const [minFee, setMinFee] = useState<string>("");
  const [maxFee, setMaxFee] = useState<string>("");

  // Live simulation interactive test amount (string | number to support fluid typing, empty state, and decimals)
  const [simulatedSubtotal, setSimulatedSubtotal] = useState<string | number>("1499");

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminGetPlatformFeeSettings();
      if (res.success && res.settings) {
        const s: PlatformFeeSettings = res.settings;
        setEnabled(Boolean(s.enabled));
        setFeeType(s.feeType || "fixed");
        setFeeValue(s.feeValue !== undefined ? String(s.feeValue) : "10");
        setMinFee(s.minFee !== null && s.minFee !== undefined ? String(s.minFee) : "");
        setMaxFee(s.maxFee !== null && s.maxFee !== undefined ? String(s.maxFee) : "");
      }
    } catch (err: any) {
      console.error("[Load Platform Fee Settings Error]:", err);
      setError("Failed to load platform fee configuration from server.");
    } finally {
      setLoading(false);
    }
  };

  const showToast = (type: "success" | "error", text: string) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 4000);
  };

  // Instant Quick Toggle that saves directly to MongoDB and broadcasts sync
  const handleQuickToggle = async () => {
    if (toggling) return;
    setToggling(true);
    try {
      const res = await adminTogglePlatformFee();
      if (res.success) {
        setEnabled(res.enabled);
        showToast(
          "success",
          res.message || `Platform fee ${res.enabled ? "enabled" : "disabled"} successfully.`
        );
        // Broadcast to storefront tabs
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
      } else {
        showToast("error", res.message || "Failed to update platform fee status.");
      }
    } catch (err: any) {
      showToast("error", err.message || "Network error while toggling status.");
    } finally {
      setToggling(false);
    }
  };

  // Helper to compute fee for preview
  const computeFee = (subtotal: number): number => {
    if (!enabled) return 0;
    const val = Number(feeValue) || 0;
    if (val < 0) return 0;

    let fee = 0;
    if (feeType === "fixed") {
      fee = val;
    } else {
      fee = (subtotal * val) / 100;
      const min = Number(minFee);
      if (minFee !== "" && !isNaN(min) && min > 0 && fee < min) {
        fee = min;
      }
      const max = Number(maxFee);
      if (maxFee !== "" && !isNaN(max) && max > 0 && fee > max) {
        fee = max;
      }
    }

    return Math.max(0, Math.round(fee * 100) / 100);
  };

  const previewNumericSubtotal = useMemo(() => {
    const n = Number(simulatedSubtotal);
    return isNaN(n) || n < 0 ? 0 : n;
  }, [simulatedSubtotal]);

  const previewCurrentFee = useMemo(() => {
    return computeFee(previewNumericSubtotal);
  }, [enabled, feeType, feeValue, minFee, maxFee, previewNumericSubtotal]);

  // Validation before submission
  const validateForm = (): string | null => {
    const val = Number(feeValue);
    if (feeValue === "" || isNaN(val) || val < 0) {
      return "Fee value must be a valid, non-negative number.";
    }
    if (feeType === "percentage" && val > 100) {
      return "Percentage fee cannot exceed 100%.";
    }

    const min = minFee !== "" ? Number(minFee) : null;
    const max = maxFee !== "" ? Number(maxFee) : null;

    if (min !== null && (isNaN(min) || min < 0)) {
      return "Minimum fee must be a valid non-negative number.";
    }
    if (max !== null && (isNaN(max) || max < 0)) {
      return "Maximum fee cap must be a valid non-negative number.";
    }
    if (min !== null && max !== null && min > max) {
      return "Minimum fee cannot exceed the maximum fee cap.";
    }

    return null;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validateForm();
    if (validationError) {
      showToast("error", validationError);
      return;
    }

    setSaving(true);
    try {
      const payload = {
        enabled,
        feeType,
        feeValue: Number(feeValue),
        minFee: minFee !== "" ? Number(minFee) : null,
        maxFee: maxFee !== "" ? Number(maxFee) : null,
      };

      const res = await adminUpdatePlatformFeeSettings(payload);
      if (res.success) {
        showToast("success", res.message || "Platform fee configuration saved successfully.");
        // Broadcast sync to storefront tabs
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
      } else {
        showToast("error", res.message || "Failed to update platform fee settings.");
      }
    } catch (err: any) {
      showToast("error", err.message || "An unexpected error occurred while saving.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5 sm:space-y-6 max-w-5xl mx-auto">
      {/* ── Breadcrumb & Top Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 mb-1">
            <span>Settings</span>
            <ChevronRight size={12} />
            <span className="text-gray-700">Platform Fee</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2 sm:gap-2.5 flex-wrap">
            <Sliders size={22} className="text-volt-red flex-shrink-0" />
            <span>Platform Fee Management</span>
          </h1>
          <p className="text-xs text-gray-500 mt-1 leading-relaxed">
            Configure order platform fees charged to customers across cart, checkout, and Razorpay transactions.
          </p>
        </div>

        <button
          onClick={loadSettings}
          disabled={loading}
          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors shadow-2xs self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw size={13} className={loading ? "animate-spin text-volt-red" : ""} />
          <span>Reload</span>
        </button>
      </div>

      {/* ── Toast Feedback Banner ── */}
      {feedback && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center justify-between ${
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
            ×
          </button>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-xs font-semibold flex items-center gap-2">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-5 sm:space-y-6">
        {/* ── Status Banner & Toggle ── */}
        <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-5">
          <div className="flex items-start gap-3 sm:gap-3.5 min-w-0">
            <div
              className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                enabled ? "bg-emerald-100 text-emerald-700 shadow-2xs" : "bg-gray-100 text-gray-400"
              }`}
            >
              <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
                <h3 className="text-sm font-bold text-gray-900">Platform Fee Status</h3>
                <span
                  className={`text-[10px] sm:text-[11px] font-black uppercase tracking-wider px-2 sm:px-2.5 py-0.5 rounded-full inline-flex items-center gap-1.5 flex-shrink-0 ${
                    enabled
                      ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                      : "bg-gray-100 text-gray-600 border border-gray-200"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      enabled ? "bg-emerald-500 animate-pulse" : "bg-gray-400"
                    }`}
                  />
                  {enabled ? "ACTIVE / ENABLED" : "DISABLED"}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                {enabled
                  ? "Platform fee is actively applied to shopping carts, checkout, and payments."
                  : "Platform fee is currently turned off. Customers are charged ₹0.00."}
              </p>
            </div>
          </div>

          {/* Clearly Visible Enable/Disable Toggle Switch Control */}
          <div className="flex items-center justify-between md:justify-end gap-3 w-full md:w-auto bg-gray-50 border border-gray-200/80 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl flex-shrink-0">
            <span className="text-xs font-bold text-gray-700 select-none">
              {enabled ? "Enabled" : "Disabled"}
            </span>

            <button
              type="button"
              role="switch"
              aria-checked={enabled}
              disabled={loading || toggling || saving}
              onClick={handleQuickToggle}
              title={enabled ? "Click to Disable Platform Fee" : "Click to Enable Platform Fee"}
              className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-volt-red focus:ring-offset-2 ${
                enabled ? "bg-emerald-600" : "bg-gray-300"
              } ${toggling ? "opacity-60 cursor-wait" : ""}`}
            >
              <span className="sr-only">Toggle Platform Fee</span>
              <span
                aria-hidden="true"
                className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  enabled ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>

        {/* ── Main Configuration Grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">
          {/* Settings Left Column */}
          <div className="lg:col-span-2 bg-white border border-gray-200 rounded-2xl p-4 sm:p-6 shadow-xs space-y-5 sm:space-y-6">
            <h2 className="text-base font-bold text-gray-900 pb-3 border-b border-gray-100 flex items-center gap-2">
              <span>Fee Calculation Rules</span>
            </h2>

            {/* Fee Type Selection */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2.5">
                Fee Calculation Type
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <button
                  type="button"
                  onClick={() => setFeeType("fixed")}
                  className={`p-3.5 sm:p-4 rounded-xl border-2 text-left flex items-start gap-3 transition-all cursor-pointer w-full ${
                    feeType === "fixed"
                      ? "border-volt-red bg-red-50/40 shadow-2xs ring-1 ring-volt-red/20"
                      : "border-gray-200 hover:border-gray-300 bg-white"
                  }`}
                >
                  <div
                    className={`p-2 rounded-lg flex-shrink-0 transition-colors ${
                      feeType === "fixed"
                        ? "bg-red-100 text-volt-red font-bold"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    <DollarSign size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`block text-xs font-black ${
                        feeType === "fixed" ? "text-volt-red" : "text-gray-900"
                      }`}>
                        Fixed Amount
                      </span>
                      {feeType === "fixed" && (
                        <span className="text-[10px] font-bold text-volt-red uppercase tracking-wider bg-white/80 border border-volt-red/30 px-1.5 py-0.5 rounded-md flex-shrink-0">
                          Selected
                        </span>
                      )}
                    </div>
                    <span className="block text-[11px] text-gray-500 mt-1 leading-relaxed">
                      Charges a constant fee (e.g. ₹10) on every order.
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setFeeType("percentage")}
                  className={`p-3.5 sm:p-4 rounded-xl border-2 text-left flex items-start gap-3 transition-all cursor-pointer w-full ${
                    feeType === "percentage"
                      ? "border-volt-red bg-red-50/40 shadow-2xs ring-1 ring-volt-red/20"
                      : "border-gray-200 hover:border-gray-300 bg-white"
                  }`}
                >
                  <div
                    className={`p-2 rounded-lg flex-shrink-0 transition-colors ${
                      feeType === "percentage"
                        ? "bg-red-100 text-volt-red font-bold"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    <Percent size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`block text-xs font-black ${
                        feeType === "percentage" ? "text-volt-red" : "text-gray-900"
                      }`}>
                        Percentage (%)
                      </span>
                      {feeType === "percentage" && (
                        <span className="text-[10px] font-bold text-volt-red uppercase tracking-wider bg-white/80 border border-volt-red/30 px-1.5 py-0.5 rounded-md flex-shrink-0">
                          Selected
                        </span>
                      )}
                    </div>
                    <span className="block text-[11px] text-gray-500 mt-1 leading-relaxed">
                      Charges a percentage of net eligible merchandise.
                    </span>
                  </div>
                </button>
              </div>
            </div>

            {/* Fee Value */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                {feeType === "fixed" ? "Fixed Fee Amount (₹)" : "Fee Percentage (%)"}{" "}
                <span className="text-volt-red">*</span>
              </label>
              <div className="relative w-full sm:max-w-sm">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">
                  {feeType === "fixed" ? "₹" : "%"}
                </span>
                <input
                  type="number"
                  step={feeType === "fixed" ? "1" : "0.1"}
                  min="0"
                  max={feeType === "percentage" ? "100" : undefined}
                  required
                  value={feeValue}
                  onChange={(e) => setFeeValue(e.target.value)}
                  placeholder={feeType === "fixed" ? "e.g. 10" : "e.g. 2"}
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-900 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 transition-colors"
                />
              </div>
              <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">
                {feeType === "fixed"
                  ? "Standard fixed rupee amount charged per order."
                  : "Calculated against merchandise subtotal after promo code and product discounts."}
              </p>
            </div>

            {/* Percentage Constraints: Min Fee & Max Cap */}
            {feeType === "percentage" && (
              <div className="p-3.5 sm:p-4 rounded-xl bg-gray-50/80 border border-gray-200/80 space-y-4">
                <div className="flex items-center gap-1.5 text-xs font-bold text-gray-900">
                  <Info size={14} className="text-volt-red flex-shrink-0" />
                  <span>Optional Constraints for Percentage Fee</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Minimum Fee Floor (₹)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">
                        ₹
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={minFee}
                        onChange={(e) => setMinFee(e.target.value)}
                        placeholder="Leave blank for no minimum"
                        className="w-full pl-8 pr-3 py-2 rounded-xl border border-gray-200 text-xs text-gray-900 bg-white focus:outline-none focus:border-gray-900"
                      />
                    </div>
                    <span className="text-[10px] text-gray-400 mt-0.5 block leading-relaxed">
                      Ensures small carts generate at least this fee.
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Maximum Fee Cap (₹)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">
                        ₹
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={maxFee}
                        onChange={(e) => setMaxFee(e.target.value)}
                        placeholder="Leave blank for no cap"
                        className="w-full pl-8 pr-3 py-2 rounded-xl border border-gray-200 text-xs text-gray-900 bg-white focus:outline-none focus:border-gray-900"
                      />
                    </div>
                    <span className="text-[10px] text-gray-400 mt-0.5 block leading-relaxed">
                      Protects high-value orders from excessive fees.
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Save Button */}
            <div className="pt-3 flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3 border-t border-gray-100">
              <span className="text-[11px] text-gray-400">
                Changes take effect immediately on active storefront carts.
              </span>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-volt-red text-white text-xs font-bold hover:bg-[#C9191E] disabled:bg-gray-400 transition-colors shadow-sm cursor-pointer w-full sm:w-auto"
              >
                <Save size={14} />
                <span>{saving ? "Saving Changes..." : "Save Settings"}</span>
              </button>
            </div>
          </div>

          {/* Live Preview Right Column */}
          <div className="space-y-5 sm:space-y-6">
            <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
                <TrendingUp size={16} className="text-volt-red flex-shrink-0" />
                <h3 className="text-sm font-bold text-gray-900">Live Customer Preview</h3>
              </div>

              <p className="text-xs text-gray-500 leading-relaxed">
                Test how the configured platform fee affects sample order subtotals:
              </p>

              {/* Interactive test input */}
              <div>
                <label
                  htmlFor="preview-subtotal-input"
                  className="block text-[11px] font-bold text-gray-600 mb-1 uppercase tracking-wider"
                >
                  Test Cart Subtotal (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">
                    ₹
                  </span>
                  <input
                    id="preview-subtotal-input"
                    type="number"
                    form="preview-simulator"
                    min="0"
                    step="any"
                    value={simulatedSubtotal}
                    onChange={(e) => setSimulatedSubtotal(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") e.preventDefault();
                    }}
                    placeholder="Enter subtotal (e.g. 1499)"
                    className="w-full pl-8 pr-3 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-900 bg-gray-50 focus:bg-white focus:outline-none focus:border-gray-900"
                  />
                </div>
              </div>

              {/* Sample calculation receipt */}
              <div className="p-3.5 sm:p-4 rounded-xl bg-gray-50 border border-gray-100 space-y-2 text-xs">
                <div className="flex justify-between text-gray-600">
                  <span>Eligible Merchandise</span>
                  <span className="font-semibold text-gray-900">{formatPrice(previewNumericSubtotal)}</span>
                </div>

                <div className="flex justify-between items-center text-gray-600">
                  <span>Platform Fee</span>
                  <span className="font-bold text-volt-red font-mono">
                    {enabled ? formatPrice(previewCurrentFee) : "₹0.00 (Disabled)"}
                  </span>
                </div>

                <div className="flex justify-between text-gray-600">
                  <span>Standard Delivery</span>
                  <span className="font-semibold text-emerald-600">FREE</span>
                </div>

                <div className="flex justify-between text-gray-600">
                  <span>GST / Taxes</span>
                  <span className="font-medium text-gray-400">Included</span>
                </div>

                <div className="pt-2 border-t border-gray-200 flex justify-between items-baseline font-bold">
                  <span className="text-gray-900">Customer Payable</span>
                  <span className="text-base font-black text-gray-900 tracking-tight">
                    {formatPrice(previewNumericSubtotal + previewCurrentFee)}
                  </span>
                </div>
              </div>

              {/* Benchmark Quick Presets */}
              <div className="space-y-1.5 pt-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                  Quick Benchmark Tiers
                </span>
                <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                  {[499, 1499, 4999].map((amt) => {
                    const fee = computeFee(amt);
                    const isSelected = Number(simulatedSubtotal) === amt;
                    return (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setSimulatedSubtotal(amt)}
                        className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                          isSelected
                            ? "border-volt-red bg-red-50 text-volt-red"
                            : "border-gray-200 hover:border-gray-300 text-gray-700 bg-white"
                        }`}
                      >
                        <span className="block text-[11px] font-bold truncate">₹{amt}</span>
                        <span className="block text-[10px] text-gray-500 font-mono mt-0.5 truncate">
                          Fee: {formatPrice(fee)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

