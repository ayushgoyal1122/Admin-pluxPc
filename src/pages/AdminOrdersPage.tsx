import { useState, useEffect, useMemo } from "react";
import {
  Search,
  Filter,
  RefreshCw,
  Eye,
  Edit,
  Truck,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  MapPin,
  X,
} from "lucide-react";
import { adminGetOrders, adminUpdateOrderStatus } from "../services/api";
import { formatPrice, handleImageError } from "../utils";
import type { AdminOrder } from "../types";

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "placed", label: "Placed" },
  { value: "confirmed", label: "Confirmed" },
  { value: "processing", label: "Processing" },
  { value: "shipped", label: "Shipped" },
  { value: "out_for_delivery", label: "Out for Delivery" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
];

const PAYMENT_OPTIONS = [
  { value: "all", label: "All Payments" },
  { value: "paid", label: "Paid" },
  { value: "pending", label: "Pending" },
  { value: "failed", label: "Failed" },
  { value: "refunded", label: "Refunded" },
];

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");

  // Modals state
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null);
  const [statusModalOrder, setStatusModalOrder] = useState<AdminOrder | null>(null);

  // Status form state
  const [newStatus, setNewStatus] = useState<string>("");
  const [statusDescription, setStatusDescription] = useState("");
  const [locationNote, setLocationNote] = useState("");
  const [courierName, setCourierName] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [trackingUrl, setTrackingUrl] = useState("");
  const [estimatedDate, setEstimatedDate] = useState("");
  const [updating, setUpdating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminGetOrders({
        q: search.trim() || undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
        paymentStatus: paymentFilter !== "all" ? paymentFilter : undefined,
      });

      if (res.success && Array.isArray(res.orders)) {
        setOrders(res.orders);
      } else {
        setError(res.message || "Failed to load orders");
      }
    } catch (err: any) {
      setError(err.message || "Failed to communicate with server");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [statusFilter, paymentFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadOrders();
  };

  // Open Status Update Modal
  const openStatusModal = (order: AdminOrder) => {
    setStatusModalOrder(order);
    setNewStatus(order.orderStatus);
    setStatusDescription("");
    setLocationNote("");
    setCourierName(order.shipment?.courierName || "");
    setTrackingNumber(order.shipment?.trackingNumber || "");
    setTrackingUrl(order.shipment?.trackingUrl || "");
    setEstimatedDate(
      order.shipment?.estimatedDeliveryDate
        ? new Date(order.shipment.estimatedDeliveryDate).toISOString().split("T")[0]
        : ""
    );
    setFormError(null);
  };

  // Handle Status Update Submit
  const handleStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusModalOrder) return;
    setFormError(null);

    if (trackingUrl && trackingUrl.trim() && !trackingUrl.startsWith("http")) {
      setFormError("Tracking URL must begin with http:// or https://");
      return;
    }

    setUpdating(true);
    try {
      const res = await adminUpdateOrderStatus(statusModalOrder._id, {
        status: newStatus,
        description: statusDescription.trim() || undefined,
        location: locationNote.trim() || undefined,
        courierName: courierName.trim() || undefined,
        trackingNumber: trackingNumber.trim() || undefined,
        trackingUrl: trackingUrl.trim() || undefined,
        estimatedDeliveryDate: estimatedDate || undefined,
      });

      if (res.success && res.order) {
        setOrders((prev) =>
          prev.map((o) => (o._id === res.order._id ? { ...o, ...res.order } : o))
        );
        if (selectedOrder && selectedOrder._id === res.order._id) {
          setSelectedOrder(res.order);
        }
        setFeedback({
          type: "success",
          text: `Order #${res.order.orderNumber} updated to "${newStatus.replace(/_/g, " ")}"`,
        });
        setStatusModalOrder(null);
      } else {
        setFormError(res.message || "Failed to update order status.");
      }
    } catch (err: any) {
      setFormError(err.message || "Network error updating status.");
    } finally {
      setUpdating(false);
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  // Metrics summary
  const metrics = useMemo(() => {
    let totalRevenue = 0;
    let pendingFulfillment = 0;
    let inTransit = 0;

    orders.forEach((o) => {
      if (o.paymentStatus === "paid") {
        totalRevenue += o.total;
      }
      if (o.orderStatus === "placed" || o.orderStatus === "confirmed" || o.orderStatus === "processing") {
        pendingFulfillment++;
      }
      if (o.orderStatus === "shipped" || o.orderStatus === "out_for_delivery") {
        inTransit++;
      }
    });

    return { totalRevenue, pendingFulfillment, inTransit };
  }, [orders]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "delivered":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-gray-900 text-white">
            <CheckCircle2 size={12} />
            <span>Delivered</span>
          </span>
        );
      case "out_for_delivery":
      case "shipped":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-gray-100 text-gray-900 border border-gray-300">
            <Truck size={12} />
            <span>{status === "out_for_delivery" ? "Out for Delivery" : "Shipped"}</span>
          </span>
        );
      case "processing":
      case "confirmed":
      case "placed":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-gray-100 text-gray-700 border border-[#BFC5CE]">
            <Clock size={12} />
            <span className="capitalize">{status}</span>
          </span>
        );
      case "cancelled":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-[#E31E24] border border-red-200">
            <XCircle size={12} />
            <span>Cancelled</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-gray-100 text-gray-700 border border-[#BFC5CE]">
            <span>{status}</span>
          </span>
        );
    }
  };

  const getPaymentBadge = (status: string) => {
    switch (status) {
      case "paid":
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wide bg-gray-900 text-white">
            Paid
          </span>
        );
      case "pending":
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wide bg-gray-100 text-gray-800 border border-gray-300">
            Pending
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wide bg-red-50 text-[#E31E24] border border-red-200">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#C5C9D0]">
        <div>
          <h1 className="text-2xl font-bold text-[#1F2937] tracking-tight">Orders & Fulfillment</h1>
          <p className="text-sm text-[#6B7280] mt-0.5">
            Monitor incoming customer purchases, assign courier waybills, and update tracking events.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={loadOrders}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-[#BFC5CE] text-xs font-semibold text-[#374151] hover:text-[#1F2937] hover:bg-[#F3F4F6] transition-all disabled:opacity-50 shadow-xs cursor-pointer"
          >
            <RefreshCw size={14} className={loading ? "animate-spin text-gray-500" : "text-gray-500"} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ── Metrics Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-[#C5C9D0] rounded-xl p-5 shadow-2xs">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Store Orders</span>
          <p className="text-2xl font-extrabold text-[#1F2937] mt-1.5">{orders.length}</p>
          <p className="text-xs text-gray-500 mt-1">Recorded in MongoDB Atlas</p>
        </div>

        <div className="bg-white border border-[#C5C9D0] rounded-xl p-5 shadow-2xs">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Pending Fulfillment</span>
          <p className="text-2xl font-extrabold text-[#1F2937] mt-1.5">{metrics.pendingFulfillment}</p>
          <p className="text-xs text-gray-500 mt-1">Confirmed or packing in warehouse</p>
        </div>

        <div className="bg-white border border-[#C5C9D0] rounded-xl p-5 shadow-2xs">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Verified Revenue</span>
          <p className="text-2xl font-extrabold text-[#E31E24] mt-1.5">{formatPrice(metrics.totalRevenue)}</p>
          <p className="text-xs text-gray-500 mt-1">From successfully captured payments</p>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-xs font-semibold ${
            feedback.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-rose-50 text-rose-800 border-rose-200"
          }`}
        >
          <span>{feedback.text}</span>
          <button onClick={() => setFeedback(null)} className="text-gray-400 hover:text-gray-700">
            <X size={14} />
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-center gap-3 text-xs text-red-800">
          <AlertCircle size={16} className="text-volt-red flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ── Search and Filter Controls ── */}
      <div className="bg-white border border-[#C5C9D0] rounded-xl p-4 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search bar */}
          <form onSubmit={handleSearchSubmit} className="relative flex-1">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Order #, Recipient Name, City, or Phone..."
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-[#BFC5CE] focus:outline-none focus:border-[#111827] focus:ring-1 focus:ring-[#111827] transition-colors"
            />
          </form>

          {/* Status filter */}
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-gray-400 flex-shrink-0" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-[#BFC5CE] text-xs font-medium text-gray-700 bg-white focus:outline-none focus:border-[#111827] focus:ring-1 focus:ring-[#111827] cursor-pointer"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-[#BFC5CE] text-xs font-medium text-gray-700 bg-white focus:outline-none focus:border-[#111827] focus:ring-1 focus:ring-[#111827] cursor-pointer"
            >
              {PAYMENT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── Orders Table ── */}
      <div className="bg-white border border-[#C5C9D0] rounded-xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F9FAFB] text-[#6B7280] font-bold border-b border-[#BFC5CE]">
              <tr>
                <th className="py-3.5 px-4 font-bold">Order #</th>
                <th className="py-3.5 px-4 font-bold">Customer & Shipping</th>
                <th className="py-3.5 px-4 font-bold">Date & Time</th>
                <th className="py-3.5 px-4 font-bold">Items</th>
                <th className="py-3.5 px-4 font-bold">Total</th>
                <th className="py-3.5 px-4 font-bold">Payment</th>
                <th className="py-3.5 px-4 font-bold">Fulfillment</th>
                <th className="py-3.5 px-4 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D1D5DB] text-[#374151]">
              {loading && orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw size={20} className="animate-spin text-gray-400" />
                      <span>Loading orders...</span>
                    </div>
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-400">
                    <p className="font-semibold text-gray-700 mb-1">No orders match criteria</p>
                    <p className="text-xs text-gray-400">Try adjusting your search terms or filters.</p>
                  </td>
                </tr>
              ) : (
                orders.map((order) => {
                  const dateStr = new Date(order.createdAt).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  });

                  return (
                    <tr key={order._id} className="hover:bg-[#F9FAFB] transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-[#1F2937]">
                        {order.orderNumber}
                      </td>

                      <td className="py-3.5 px-4">
                        <p className="font-bold text-[#1F2937]">{order.deliveryAddress.fullName}</p>
                        <p className="text-[11px] text-gray-500">
                          {order.deliveryAddress.city}, {order.deliveryAddress.state}
                        </p>
                        <p className="text-[10px] text-gray-400 font-mono">{order.deliveryAddress.phone}</p>
                      </td>

                      <td className="py-3.5 px-4 text-gray-500 whitespace-nowrap">{dateStr}</td>

                      <td className="py-3.5 px-4">
                        <span className="font-bold text-[#1F2937]">{order.items.length}</span>{" "}
                        <span className="text-gray-400">
                          {order.items.length === 1 ? "SKU" : "SKUs"} (
                          {order.items.reduce((sum, it) => sum + it.quantity, 0)} units)
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-bold text-[#1F2937]">
                        {formatPrice(order.total)}
                      </td>

                      <td className="py-3.5 px-4">{getPaymentBadge(order.paymentStatus)}</td>

                      <td className="py-3.5 px-4">{getStatusBadge(order.orderStatus)}</td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedOrder(order)}
                            title="View Full Order Details"
                            className="p-1.5 rounded-lg border border-[#BFC5CE] text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors cursor-pointer"
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => openStatusModal(order)}
                            title="Update Fulfillment Status"
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-gray-900 hover:bg-gray-800 text-white font-semibold text-[11px] transition-colors cursor-pointer"
                          >
                            <Edit size={12} />
                            <span>Update</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── View Order Details Modal ── */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#AEB6C2] max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-[#C5C9D0]">
              <div>
                <h3 className="text-lg font-bold text-[#1F2937] flex items-center gap-2">
                  <span>Order #{selectedOrder.orderNumber}</span>
                  {getPaymentBadge(selectedOrder.paymentStatus)}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Placed on {new Date(selectedOrder.createdAt).toLocaleString("en-IN")}
                </p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Status & Courier Info */}
            <div className="p-4 rounded-xl bg-gray-50 border border-[#BFC5CE] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-600">Fulfillment Status</span>
                {getStatusBadge(selectedOrder.orderStatus)}
              </div>
              {selectedOrder.shipment?.courierName && (
                <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-[#D1D5DB]">
                  <div>
                    <span className="text-gray-400 block text-[11px]">Courier:</span>
                    <strong className="text-gray-800">{selectedOrder.shipment.courierName}</strong>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[11px]">Tracking Number:</span>
                    <strong className="text-gray-800 font-mono">
                      {selectedOrder.shipment.trackingNumber || "—"}
                    </strong>
                  </div>
                </div>
              )}
            </div>

            {/* Shipping Address */}
            <div className="text-xs space-y-1.5 p-4 rounded-xl border border-[#BFC5CE]">
              <div className="flex items-center gap-1.5 font-bold text-gray-900 mb-2">
                <MapPin size={14} className="text-volt-red" />
                <span>Shipping Address</span>
              </div>
              <p className="font-semibold text-gray-800">{selectedOrder.deliveryAddress.fullName}</p>
              <p className="text-gray-600">{selectedOrder.deliveryAddress.street}</p>
              <p className="text-gray-600">
                {selectedOrder.deliveryAddress.city}, {selectedOrder.deliveryAddress.state} -{" "}
                {selectedOrder.deliveryAddress.postalCode}
              </p>
              <p className="text-gray-500 pt-1">Phone: {selectedOrder.deliveryAddress.phone}</p>
            </div>

            {/* Items */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Ordered Products</h4>
              <div className="divide-y divide-[#D1D5DB] border border-[#BFC5CE] rounded-xl overflow-hidden">
                {selectedOrder.items.map((it, idx) => (
                  <div key={idx} className="p-3.5 flex items-center gap-3 text-xs">
                    <img
                      src={it.imageUrl}
                      alt={it.name}
                      onError={(e) => handleImageError(e, it.name)}
                      className="w-12 h-12 rounded-lg object-cover border border-[#BFC5CE] flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 truncate">{it.name}</p>
                      <p className="text-gray-500 text-[11px]">
                        Qty: {it.quantity} × {formatPrice(it.price)}
                      </p>
                    </div>
                    <span className="font-bold text-gray-900">{formatPrice(it.subtotal)}</span>
                  </div>
                ))}
              </div>

              {/* Price Breakdown */}
              <div className="p-4 rounded-xl bg-gray-50 border border-[#BFC5CE] space-y-2 text-xs">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span className="font-semibold text-gray-900">{formatPrice(selectedOrder.subtotal)}</span>
                </div>
                {selectedOrder.discount !== undefined && selectedOrder.discount > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Discount</span>
                    <span className="font-semibold">-{formatPrice(selectedOrder.discount)}</span>
                  </div>
                )}
                {selectedOrder.platformFee !== undefined && selectedOrder.platformFee > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>Platform Fee</span>
                    <span className="font-semibold text-gray-900">{formatPrice(selectedOrder.platformFee)}</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-600">
                  <span>Shipping</span>
                  <span className="font-semibold text-emerald-600">
                    {selectedOrder.shippingFee === 0 ? "FREE" : formatPrice(selectedOrder.shippingFee)}
                  </span>
                </div>
                <div className="pt-2 border-t border-[#D1D5DB] flex justify-between items-baseline font-bold">
                  <span className="text-gray-900">Total Charged</span>
                  <span className="text-sm font-black text-gray-900">{formatPrice(selectedOrder.total)}</span>
                </div>
              </div>
            </div>

            {/* Tracking History */}
            {selectedOrder.trackingHistory && selectedOrder.trackingHistory.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Tracking Event History
                </h4>
                <div className="space-y-2 border border-[#BFC5CE] rounded-xl p-4 text-xs">
                  {selectedOrder.trackingHistory.map((ev, i) => (
                    <div key={i} className="flex items-start justify-between gap-4 py-1.5 border-b last:border-b-0 border-[#D1D5DB]">
                      <div>
                        <span className="font-bold text-gray-900 capitalize block">
                          {ev.status.replace(/_/g, " ")}
                        </span>
                        <p className="text-gray-600 text-[11px]">{ev.description}</p>
                      </div>
                      <span className="text-[10px] text-gray-400 whitespace-nowrap">
                        {new Date(ev.timestamp).toLocaleString("en-IN")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="px-5 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold border border-[#BFC5CE] transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Status Update Modal ── */}
      {statusModalOrder && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleStatusSubmit}
            className="bg-white rounded-2xl border border-[#AEB6C2] max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#C5C9D0]">
              <div>
                <h3 className="text-base font-bold text-[#1F2937]">Update Fulfillment Status</h3>
                <p className="text-xs text-gray-500 font-mono">Order #{statusModalOrder.orderNumber}</p>
              </div>
              <button
                type="button"
                onClick={() => setStatusModalOrder(null)}
                className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800">
                {formError}
              </div>
            )}

            {/* Target Status Select */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">New Status</label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#BFC5CE] text-xs font-semibold text-gray-900 bg-white focus:outline-none focus:border-[#111827] focus:ring-1 focus:ring-[#111827]"
              >
                <option value="confirmed">Confirmed</option>
                <option value="processing">Processing in Warehouse</option>
                <option value="shipped">Shipped</option>
                <option value="out_for_delivery">Out for Delivery</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            {/* Customer-facing description */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                Customer-Facing Status Note
              </label>
              <textarea
                rows={2}
                value={statusDescription}
                onChange={(e) => setStatusDescription(e.target.value)}
                placeholder="e.g. Package dispatched via express linehaul to local hub."
                className="w-full px-3.5 py-2 rounded-xl border border-[#BFC5CE] text-xs text-gray-900 focus:outline-none focus:border-[#111827] focus:ring-1 focus:ring-[#111827]"
              />
            </div>

            {/* Location Note */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">Location / Hub (Optional)</label>
              <input
                type="text"
                value={locationNote}
                onChange={(e) => setLocationNote(e.target.value)}
                placeholder="e.g. Bengaluru Central Hub"
                className="w-full px-3.5 py-2 rounded-xl border border-[#BFC5CE] text-xs text-gray-900 focus:outline-none focus:border-[#111827] focus:ring-1 focus:ring-[#111827]"
              />
            </div>

            {/* Shipment details (useful when shipping) */}
            <div className="p-4 rounded-xl bg-gray-50/80 border border-[#BFC5CE] space-y-3 text-xs">
              <span className="font-bold text-gray-700 block">Courier & Shipment Information</span>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 mb-1">Courier Partner</label>
                  <input
                    type="text"
                    value={courierName}
                    onChange={(e) => setCourierName(e.target.value)}
                    placeholder="e.g. Blue Dart"
                    className="w-full px-3 py-1.5 rounded-lg border border-[#BFC5CE] text-xs bg-white focus:outline-none focus:border-[#111827] focus:ring-1 focus:ring-[#111827]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 mb-1">Waybill / Tracking #</label>
                  <input
                    type="text"
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    placeholder="e.g. BD12345678"
                    className="w-full px-3 py-1.5 rounded-lg border border-[#BFC5CE] text-xs bg-white font-mono focus:outline-none focus:border-[#111827] focus:ring-1 focus:ring-[#111827]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-500 mb-1">Tracking URL</label>
                <input
                  type="url"
                  value={trackingUrl}
                  onChange={(e) => setTrackingUrl(e.target.value)}
                  placeholder="https://track.bluedart.com/..."
                  className="w-full px-3 py-1.5 rounded-lg border border-[#BFC5CE] text-xs bg-white focus:outline-none focus:border-[#111827] focus:ring-1 focus:ring-[#111827]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-500 mb-1">
                  Estimated Delivery Date
                </label>
                <input
                  type="date"
                  value={estimatedDate}
                  onChange={(e) => setEstimatedDate(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-[#BFC5CE] text-xs bg-white focus:outline-none focus:border-[#111827] focus:ring-1 focus:ring-[#111827]"
                />
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setStatusModalOrder(null)}
                className="px-4 py-2 rounded-xl border border-[#BFC5CE] text-xs font-semibold text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={updating}
                className="px-5 py-2 rounded-xl bg-gray-950 hover:bg-gray-800 text-white text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer"
              >
                {updating ? "Saving..." : "Save Status"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
