import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  Star,
  ShoppingBag,
  Layers,
  DollarSign,
  Package,
  Calendar,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  User as UserIcon,
} from "lucide-react";
import { adminGetUserDetails } from "../services/api";
import type {
  UserProfile,
  UserStatistics,
  UserPurchaseOrder,
  UserEarningDetailsResponse,
} from "../types";

function formatEarningCurrency(amt: number): string {
  return `Rs ${Number(amt || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatEarningDate(dateStr?: string): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "—";
  const day = d.getDate().toString().padStart(2, "0");
  const month = d.toLocaleDateString("en-US", { month: "short" });
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}

function formatFullDateTime(dateStr?: string): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "—";
  const day = d.getDate();
  const month = d.toLocaleDateString("en-US", { month: "short" });
  const year = d.getFullYear();
  const time = d
    .toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })
    .toLowerCase();
  return `${day} ${month} ${year}, ${time}`;
}

export default function AdminUserDetailsPage() {
  const { userId } = useParams<{ userId: string }>();

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [user, setUser] = useState<UserProfile | null>(null);
  const [statistics, setStatistics] = useState<UserStatistics | null>(null);
  const [purchaseHistory, setPurchaseHistory] = useState<UserPurchaseOrder[]>([]);

  const loadUserDetails = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);

    try {
      const res: UserEarningDetailsResponse = await adminGetUserDetails(userId);
      if (res.success) {
        setUser(res.user);
        setStatistics(res.statistics);
        setPurchaseHistory(res.purchaseHistory || []);
      } else {
        setError(res.message || "Failed to load customer details.");
      }
    } catch (err: any) {
      console.error("[User Details Load Error]:", err);
      setError(err.message || "Network error loading customer details.");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadUserDetails();
  }, [loadUserDetails]);

  return (
    <div className="space-y-5 sm:space-y-6 max-w-7xl mx-auto font-sans pb-12 w-full">
      {/* ── Top Header Matching Reference Screenshot 1 ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <Link
            to="/admin/manage-earning"
            className="p-2 min-w-[38px] min-h-[38px] flex items-center justify-center rounded-xl bg-white border border-[#BFC5CE] text-slate-600 hover:text-[#E31E24] hover:bg-slate-50 hover:border-[#111827] transition-all shadow-xs focus:outline-none focus:ring-2 focus:ring-[#E31E24]/20 flex-shrink-0"
            title="Back to Manage Earning"
            aria-label="Back to Manage Earning"
          >
            <ArrowLeft size={18} />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight truncate">
              User Details
            </h1>
            <p className="text-xs text-slate-500 mt-0.5 truncate">
              View detailed information about the user.
            </p>
          </div>
        </div>

        <button
          onClick={loadUserDetails}
          disabled={loading}
          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 min-h-[38px] rounded-xl bg-white border border-[#BFC5CE] text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-[#111827] transition-all shadow-xs self-start sm:self-auto cursor-pointer focus:outline-none focus:ring-2 focus:ring-gray-900 flex-shrink-0"
        >
          <RefreshCw size={13} className={loading ? "animate-spin text-[#E31E24]" : ""} />
          <span>Refresh</span>
        </button>
      </div>

      {/* ── Error Banner ── */}
      {error && (
        <div className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-xs font-semibold flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <AlertCircle size={16} className="flex-shrink-0" />
            <span className="truncate">{error}</span>
          </div>
          <button
            onClick={loadUserDetails}
            className="text-xs underline hover:text-rose-950 font-bold cursor-pointer ml-3 flex-shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-28 text-slate-400 text-xs gap-3">
          <div className="w-9 h-9 border-2 border-[#E31E24] border-t-transparent rounded-full animate-spin" />
          <span>Loading customer profile and purchase records...</span>
        </div>
      ) : !user ? (
        <div className="bg-white border border-[#C5C9D0] rounded-xl p-12 text-center shadow-2xs">
          <p className="text-sm font-bold text-slate-700">Customer record not found</p>
          <Link
            to="/admin/manage-earning"
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors shadow-xs"
          >
            <ArrowLeft size={14} /> Back to Manage Earning
          </Link>
        </div>
      ) : (
        <>
          {/* ── Dark Navy User Profile Banner (Reference Screenshot 1) ── */}
          <div className="bg-[#0B132B] border border-slate-800/90 ring-1 ring-white/10 rounded-2xl sm:rounded-3xl p-5 sm:p-8 text-white shadow-md flex flex-col sm:flex-row items-center sm:items-center gap-4 sm:gap-6 w-full overflow-hidden">
            {/* Circular Profile Avatar */}
            <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-full border-2 border-white/20 ring-2 ring-[#E31E24]/40 overflow-hidden flex items-center justify-center bg-gray-800 flex-shrink-0 shadow-md">
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#E31E24] to-[#B91C1C] text-white font-extrabold text-xl sm:text-2xl uppercase tracking-wider">
                  {user.name.charAt(0) || <UserIcon size={28} />}
                </div>
              )}
            </div>

            {/* User Info & Badge */}
            <div className="text-center sm:text-left min-w-0 flex-1 w-full">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h2 className="text-lg sm:text-2xl font-bold tracking-tight text-white break-words">
                  {user.name}
                </h2>
                <span
                  className={`text-[10px] sm:text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider border inline-flex items-center gap-1 flex-shrink-0 ${
                    user.status === "Active"
                      ? "bg-red-950/80 text-red-200 border-red-500/40"
                      : "bg-gray-800 text-gray-300 border-gray-700"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      user.status === "Active" ? "bg-[#E31E24]" : "bg-gray-400"
                    }`}
                  />
                  {user.status}
                </span>
              </div>

              {user.email && (
                <p className="text-xs text-slate-300 mt-1 break-all sm:break-normal truncate sm:overflow-visible">
                  {user.email}
                </p>
              )}

              <p className="text-[11px] sm:text-xs text-slate-400 mt-1.5 flex items-center justify-center sm:justify-start gap-1.5">
                <Calendar size={13} className="text-slate-400 flex-shrink-0" />
                <span>Member since {formatEarningDate(user.memberSince)}</span>
              </p>
            </div>
          </div>

          {/* ── Summary Metric Cards (Reference Screenshot 1) ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-5">
            {/* Card 1: Account Status */}
            <div className="bg-white border border-[#C5C9D0] rounded-xl p-3.5 sm:p-6 text-center shadow-2xs transition-all hover:border-[#BFC5CE] min-w-0">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-red-50 border border-[#BFC5CE] text-[#E31E24] flex items-center justify-center mx-auto mb-2 sm:mb-2.5 shadow-2xs">
                <Star size={15} className="fill-current sm:w-4 sm:h-4" />
              </div>
              <span className="block text-sm sm:text-base md:text-lg font-bold text-slate-900 tracking-tight truncate">
                {statistics?.accountStatus || "Active"}
              </span>
              <span className="block text-[10px] sm:text-[11px] md:text-xs text-slate-500 font-medium mt-0.5 truncate">
                Account Status
              </span>
            </div>

            {/* Card 2: Total Orders */}
            <div className="bg-white border border-[#C5C9D0] rounded-xl p-3.5 sm:p-6 text-center shadow-2xs transition-all hover:border-[#BFC5CE] min-w-0">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-red-50 border border-[#BFC5CE] text-[#E31E24] flex items-center justify-center mx-auto mb-2 sm:mb-2.5 shadow-2xs">
                <ShoppingBag size={15} className="sm:w-4 sm:h-4" />
              </div>
              <span className="block text-sm sm:text-base md:text-lg font-bold text-slate-900 tracking-tight truncate">
                {statistics?.totalOrders ?? 0}
              </span>
              <span className="block text-[10px] sm:text-[11px] md:text-xs text-slate-500 font-medium mt-0.5 truncate">
                Total Orders
              </span>
            </div>

            {/* Card 3: Total Items Purchased */}
            <div className="bg-white border border-[#C5C9D0] rounded-xl p-3.5 sm:p-6 text-center shadow-2xs transition-all hover:border-[#BFC5CE] min-w-0">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-red-50 border border-[#BFC5CE] text-[#E31E24] flex items-center justify-center mx-auto mb-2 sm:mb-2.5 shadow-2xs">
                <Layers size={15} className="sm:w-4 sm:h-4" />
              </div>
              <span className="block text-sm sm:text-base md:text-lg font-bold text-slate-900 tracking-tight truncate">
                {statistics?.totalItemsPurchased ?? 0}
              </span>
              <span className="block text-[10px] sm:text-[11px] md:text-xs text-slate-500 font-medium mt-0.5 truncate">
                Total Items Purchased
              </span>
            </div>

            {/* Card 4: Total Spent */}
            <div className="bg-white border border-[#C5C9D0] rounded-xl p-3.5 sm:p-6 text-center shadow-2xs transition-all hover:border-[#BFC5CE] min-w-0">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-red-50 border border-[#BFC5CE] text-[#E31E24] flex items-center justify-center mx-auto mb-2 sm:mb-2.5 shadow-2xs">
                <DollarSign size={15} className="sm:w-4 sm:h-4" />
              </div>
              <span className="block text-sm sm:text-base md:text-lg font-bold text-slate-900 tracking-tight truncate">
                {formatEarningCurrency(statistics?.totalSpent ?? 0)}
              </span>
              <span className="block text-[10px] sm:text-[11px] md:text-xs text-slate-500 font-medium mt-0.5 truncate">
                Total Spent
              </span>
            </div>
          </div>

          {/* ── Purchase History Section (Below Summary Cards) ── */}
          <div className="bg-white border border-[#C5C9D0] rounded-xl shadow-2xs overflow-hidden p-4 sm:p-6 space-y-4 w-full">
            <div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight">Purchase History</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Customer transaction receipts and order status tracking.
              </p>
            </div>

            {purchaseHistory.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                No purchases recorded for this customer yet.
              </div>
            ) : (
              <div className="overflow-x-auto min-h-[200px] overscroll-x-contain">
                <table className="w-full min-w-[760px] text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#BFC5CE] bg-slate-50/70 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      <th className="py-3 px-3">Order / TxID</th>
                      <th className="py-3 px-3">Items Purchased</th>
                      <th className="py-3 px-3 text-center">Qty</th>
                      <th className="py-3 px-3">Total Amount</th>
                      <th className="py-3 px-3">Payment</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-3">Date</th>
                      <th className="py-3 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D1D5DB]">
                    {purchaseHistory.map((order) => (
                      <tr key={order.id} className="hover:bg-cyan-50/20 transition-colors">
                        {/* Order & Transaction ID */}
                        <td className="py-3.5 px-3">
                          <span className="font-bold text-slate-900 block">
                            #{order.orderNumber}
                          </span>
                          <span className="text-[11px] font-mono text-slate-400 block select-all break-all">
                            {order.transactionId}
                          </span>
                        </td>

                        {/* Items Snapshot */}
                        <td className="py-3.5 px-3 min-w-[200px]">
                          <div className="space-y-1">
                            {order.items.slice(0, 2).map((item, i) => (
                              <div key={i} className="flex items-center gap-2">
                                {item.imageUrl ? (
                                  <img
                                    src={item.imageUrl}
                                    alt={item.name}
                                    className="w-6 h-6 object-cover rounded border border-[#BFC5CE] bg-slate-100 flex-shrink-0 shadow-2xs"
                                  />
                                ) : (
                                  <div className="w-6 h-6 rounded border border-[#BFC5CE] bg-slate-100 flex items-center justify-center text-[9px] text-slate-400 shadow-2xs">
                                    <Package size={12} />
                                  </div>
                                )}
                                <span className="text-xs text-slate-800 font-medium truncate max-w-[170px]">
                                  {item.name}
                                </span>
                                <span className="text-[10px] text-slate-400 font-semibold">
                                  ×{item.quantity}
                                </span>
                              </div>
                            ))}
                            {order.items.length > 2 && (
                              <span className="text-[10px] text-slate-400 font-medium pl-8">
                                +{order.items.length - 2} more item(s)
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Quantity */}
                        <td className="py-3.5 px-3 text-center font-bold text-slate-800">
                          {order.itemsCount}
                        </td>

                        {/* Total Amount */}
                        <td className="py-3.5 px-3 font-bold text-slate-900 whitespace-nowrap">
                          {formatEarningCurrency(order.amount)}
                        </td>

                        {/* Payment Status Badge */}
                        <td className="py-3.5 px-3 whitespace-nowrap">
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full inline-block ${
                              order.paymentStatus === "paid"
                                ? "bg-gray-900 text-white"
                                : order.paymentStatus === "pending"
                                ? "bg-gray-100 text-gray-800 border border-gray-300"
                                : "bg-red-50 text-[#E31E24] border border-red-200"
                            }`}
                          >
                            {order.paymentStatus}
                          </span>
                        </td>

                        {/* Fulfillment Status */}
                        <td className="py-3.5 px-3 whitespace-nowrap">
                          <span className="text-xs font-semibold text-slate-700 capitalize">
                            {order.orderStatus.replace(/_/g, " ")}
                          </span>
                        </td>

                        {/* Purchased Date */}
                        <td className="py-3.5 px-3 text-slate-500 text-[11px] whitespace-nowrap">
                          {formatFullDateTime(order.purchasedAt)}
                        </td>

                        {/* Link to Orders */}
                        <td className="py-3.5 px-3 text-right whitespace-nowrap">
                          <Link
                            to={`/admin/orders`}
                            className="text-[#E31E24] hover:text-[#C9191E] font-semibold text-xs inline-flex items-center gap-1 group py-1 px-1 -mr-1"
                          >
                            <span>View Order</span>
                            <ExternalLink size={12} className="group-hover:translate-x-0.5 transition-transform" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
