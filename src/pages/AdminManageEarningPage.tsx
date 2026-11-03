import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  DollarSign,
  TrendingUp,
  Search,
  RefreshCw,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Package,
  X,
} from "lucide-react";
import { adminGetEarnings } from "../services/api";
import type { EarningTransaction, EarningsSummaryResponse } from "../types";

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
  const day = d.getDate();
  const month = d.toLocaleDateString("en-US", { month: "short" });
  const year = d.getFullYear();
  const time = d
    .toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })
    .toLowerCase();
  return `${day} ${month} ${year}, ${time}`;
}

export default function AdminManageEarningPage() {
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [totalRevenue, setTotalRevenue] = useState<number>(0);
  const [todayRevenue, setTodayRevenue] = useState<number>(0);
  const [transactions, setTransactions] = useState<EarningTransaction[]>([]);
  const [totalTransactions, setTotalTransactions] = useState<number>(0);

  const [searchVal, setSearchVal] = useState<string>("");
  const [appliedSearch, setAppliedSearch] = useState<string>("");
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const res: EarningsSummaryResponse = await adminGetEarnings({
        q: appliedSearch,
        page,
        limit: 10,
      });

      if (res.success) {
        setTotalRevenue(res.totalRevenue || 0);
        setTodayRevenue(res.todayRevenue || 0);
        setTransactions(res.transactions || []);
        setTotalTransactions(res.totalTransactions || 0);
        setTotalPages(res.totalPages || 1);
      } else {
        setError(res.message || "Failed to load earnings data.");
      }
    } catch (err: any) {
      console.error("[Manage Earning Load Error]:", err);
      setError(err.message || "Network error loading earnings data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [appliedSearch, page]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Debounce or form submit search
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setAppliedSearch(searchVal.trim());
  };

  const handleClearSearch = () => {
    setSearchVal("");
    setPage(1);
    setAppliedSearch("");
  };

  return (
    <div className="space-y-5 sm:space-y-6 max-w-7xl mx-auto font-sans pb-12 w-full">
      {/* ── Page Header Matching Reference Screenshot 2 ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight truncate">
            Manage Earning
          </h1>
          <p className="text-xs text-gray-500 mt-0.5 sm:mt-1">
            View purchase transactions and payment history.
          </p>
        </div>

        <button
          onClick={() => loadData(true)}
          disabled={loading || refreshing}
          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 min-h-[38px] rounded-xl bg-white border border-[#BFC5CE] text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-all shadow-xs self-start sm:self-auto cursor-pointer focus:outline-none focus:ring-2 focus:ring-gray-900"
        >
          <RefreshCw size={13} className={loading || refreshing ? "animate-spin text-[#E31E24]" : ""} />
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
            onClick={() => loadData()}
            className="text-xs underline hover:text-rose-950 font-bold cursor-pointer ml-3 flex-shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* ── Revenue Summary Cards (Reference Screenshot 2) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-6">
        {/* Total Revenue Card */}
        <div className="bg-white border border-[#C5C9D0] rounded-xl p-4 sm:p-6 shadow-2xs flex items-center gap-3.5 sm:gap-4 transition-all hover:border-[#BFC5CE] min-w-0">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-red-50 border border-[#BFC5CE] text-[#E31E24] flex items-center justify-center flex-shrink-0 shadow-2xs">
            <DollarSign size={20} className="sm:w-[22px] sm:h-[22px] stroke-[2.5]" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="block text-xs font-medium text-slate-500 truncate">
              Total Revenue
            </span>
            <span className="block text-lg sm:text-2xl font-bold text-slate-900 mt-0.5 tracking-tight truncate">
              {formatEarningCurrency(totalRevenue)}
            </span>
          </div>
        </div>

        {/* Today's Revenue Card */}
        <div className="bg-white border border-[#C5C9D0] rounded-xl p-4 sm:p-6 shadow-2xs flex items-center gap-3.5 sm:gap-4 transition-all hover:border-[#BFC5CE] min-w-0">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-red-50 border border-[#BFC5CE] text-[#E31E24] flex items-center justify-center flex-shrink-0 shadow-2xs">
            <TrendingUp size={20} className="sm:w-[22px] sm:h-[22px] stroke-[2.5]" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="block text-xs font-medium text-slate-500 truncate">
              Today's Revenue
            </span>
            <span className="block text-lg sm:text-2xl font-bold text-slate-900 mt-0.5 tracking-tight truncate">
              {formatEarningCurrency(todayRevenue)}
            </span>
          </div>
        </div>
      </div>

      {/* ── Searchable Transaction Table Card (Reference Screenshot 2) ── */}
      <div className="bg-white border border-[#C5C9D0] rounded-xl shadow-2xs overflow-hidden w-full">
        {/* Search Header Bar */}
        <div className="p-3.5 sm:p-5 border-b border-[#C5C9D0] bg-white">
          <form onSubmit={handleSearchSubmit} className="relative w-full max-w-md">
            <Search
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <input
              type="text"
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              placeholder="Search payment id or description..."
              className="w-full pl-9 pr-24 sm:pr-32 py-2.5 rounded-xl border border-[#BFC5CE] text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#111827] focus:ring-1 focus:ring-[#111827] transition-all bg-white shadow-2xs"
            />
            {searchVal && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-[68px] sm:right-[74px] top-1/2 -translate-y-1/2 inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-slate-700 px-1.5 py-1 rounded-md hover:bg-slate-100 transition-colors cursor-pointer min-h-[28px]"
                title="Clear search"
                aria-label="Clear search"
              >
                <X size={12} className="stroke-[2.5]" />
                <span className="hidden sm:inline">Clear</span>
              </button>
            )}
            <button
              type="submit"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 sm:px-3 py-1.5 bg-[#E31E24] text-white text-[11px] font-bold rounded-lg hover:bg-[#C9191E] transition-colors shadow-2xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#E31E24]/30 min-h-[30px]"
            >
              Search
            </button>
          </form>
        </div>

        {/* Transactions Table with controlled horizontal scroll */}
        <div className="overflow-x-auto min-h-[280px] overscroll-x-contain">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 text-xs gap-3">
              <div className="w-8 h-8 border-2 border-[#E31E24] border-t-transparent rounded-full animate-spin" />
              <span>Loading purchase transactions...</span>
            </div>
          ) : transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-[#BFC5CE] text-slate-400 flex items-center justify-center mb-3">
                <Package size={22} />
              </div>
              <p className="text-sm font-bold text-slate-700">No transactions found</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                {appliedSearch
                  ? `No purchase transactions matched "${appliedSearch}". Try clearing the search.`
                  : "Verified customer payments and order receipts will appear here automatically."}
              </p>
              {appliedSearch && (
                <button
                  onClick={handleClearSearch}
                  className="mt-4 px-4 py-2 bg-slate-100 border border-[#BFC5CE] text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  Clear Search
                </button>
              )}
            </div>
          ) : (
            <table className="w-full min-w-[720px] text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#BFC5CE] bg-slate-50/70 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 pl-5 sm:pl-6 pr-3 w-16">S.No</th>
                  <th className="py-3.5 px-3 min-w-[140px]">User</th>
                  <th className="py-3.5 px-3 min-w-[200px]">Transaction ID</th>
                  <th className="py-3.5 px-3 min-w-[80px] text-center">Items</th>
                  <th className="py-3.5 px-3 min-w-[110px]">Amount</th>
                  <th className="py-3.5 pl-3 pr-5 sm:pr-6 min-w-[180px]">
                    Purchased Date & Time
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D1D5DB]">
                {transactions.map((tx, idx) => {
                  const isEven = idx % 2 === 0;
                  return (
                    <tr
                      key={tx.id}
                      className={`transition-colors hover:bg-red-50/20 ${
                        isEven ? "bg-white" : "bg-slate-50/40"
                      }`}
                    >
                      {/* S.No */}
                      <td className="py-4 pl-5 sm:pl-6 pr-3 font-medium text-slate-500">
                        {tx.sNo}
                      </td>

                      {/* User (Clickable red link navigating to User Details Page) */}
                      <td className="py-4 px-3 font-medium">
                        {tx.user?.id ? (
                          <Link
                            to={`/admin/view-user/${tx.user.id}`}
                            className="text-[#E31E24] hover:text-[#C9191E] hover:underline font-semibold transition-colors inline-flex items-center gap-1 group"
                            title={`View details for ${tx.user.name}`}
                          >
                            <span className="truncate max-w-[130px] sm:max-w-none">{tx.user.name}</span>
                            <ExternalLink
                              size={11}
                              className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                            />
                          </Link>
                        ) : (
                          <span className="text-slate-900 font-semibold">{tx.user?.name || "Customer"}</span>
                        )}
                        {tx.user?.email && (
                          <span className="block text-[10px] text-slate-400 font-normal truncate max-w-[140px]">
                            {tx.user.email}
                          </span>
                        )}
                      </td>

                      {/* Transaction ID */}
                      <td className="py-4 px-3 font-mono text-[11px] text-slate-700">
                        <span className="select-all font-medium break-all">{tx.transactionId}</span>
                        {tx.orderNumber && tx.orderNumber !== tx.transactionId && (
                          <span className="block text-[10px] text-slate-400 font-sans mt-0.5">
                            Order #{tx.orderNumber}
                          </span>
                        )}
                      </td>

                      {/* Items (Total product quantity, replacing Tokens) */}
                      <td className="py-4 px-3 text-center">
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold text-slate-800 bg-slate-100 border border-[#BFC5CE]">
                          {tx.itemsCount}
                        </span>
                      </td>

                      {/* Amount */}
                      <td className="py-4 px-3 font-bold text-slate-900 whitespace-nowrap">
                        {formatEarningCurrency(tx.amount)}
                      </td>

                      {/* Purchased Date & Time */}
                      <td className="py-4 pl-3 pr-5 sm:pr-6 text-slate-500 whitespace-nowrap">
                        {formatEarningDate(tx.purchasedAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Table Footer & Pagination ── */}
        {!loading && totalTransactions > 0 && (
          <div className="p-3.5 sm:p-5 border-t border-[#C5C9D0] bg-slate-50/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <div className="text-center sm:text-left text-[11px] sm:text-xs">
              Showing <span className="font-bold text-slate-800">{transactions.length}</span> of{" "}
              <span className="font-bold text-slate-800">{totalTransactions}</span> transactions
              {appliedSearch && <span> (filtered)</span>}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-1.5 self-center sm:self-auto">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="p-2 sm:p-1.5 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg border border-[#BFC5CE] bg-white text-slate-600 hover:bg-slate-100 hover:border-[#111827] disabled:opacity-35 disabled:cursor-not-allowed transition-all shadow-2xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-gray-900"
                  aria-label="Previous page"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white rounded-lg border border-[#BFC5CE] shadow-2xs">
                  Page {page} of {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="p-2 sm:p-1.5 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg border border-[#BFC5CE] bg-white text-slate-600 hover:bg-slate-100 hover:border-[#111827] disabled:opacity-35 disabled:cursor-not-allowed transition-all shadow-2xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-gray-900"
                  aria-label="Next page"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

