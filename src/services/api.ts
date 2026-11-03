// ─── Admin API Service Layer ──────────────────────────────────────────────────
// Dedicated API client for PLUXPC Admin Portal communicating with Express API.

import type { Product, Category, ApiResponse, PlatformFeeInput, AuditLogRecord, AuditLogStats, AuditLogQueryParams, AuditLogListResponse, Blog, BlogInput, BlogStats, BlogAdminListResponse } from "../types";

export const DEFAULT_PRODUCTION_API_URL = "https://pluxpc-api.onrender.com";

/**
 * Resolves the backend API base URL with sensible defaults:
 * - If VITE_API_URL is configured (e.g. via Vercel env), use it (trimmed, without trailing slash)
 * - In production mode (Vercel builds), fall back to the live Render backend rather than an empty string
 * - In development mode, fall back to "" to leverage Vite's local dev proxy (/api -> localhost:5000)
 */
export function resolveBaseUrl(): string {
  const env = (typeof import.meta !== "undefined" && (import.meta as any).env) || {};
  const processEnv = (typeof globalThis !== "undefined" && (globalThis as any).process?.env) || {};
  const envUrl = (env.VITE_API_URL || processEnv.VITE_API_URL || "").trim();
  if (envUrl) {
    return envUrl.replace(/\/+$/, "");
  }
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return "http://localhost:5000";
    }
  }
  if (env.DEV) {
    return "";
  }
  return DEFAULT_PRODUCTION_API_URL;
}

const BASE_URL = resolveBaseUrl();

function authHeaders(token?: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const activeToken = token || localStorage.getItem("voltix_admin_token");
  if (activeToken) {
    headers["Authorization"] = `Bearer ${activeToken}`;
  }
  return headers;
}

export interface AdminAuthResponse {
  success: boolean;
  message?: string;
  token?: string;
  admin?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

export class ApiError extends Error {
  status?: number;
  data?: any;

  constructor(message: string, status?: number, data?: any) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

/**
 * Safely parses the response body without throwing unhandled SyntaxErrors on empty / non-JSON responses.
 */
async function parseResponse<T = any>(res: Response): Promise<T> {
  const contentType = res.headers.get("content-type") || "";
  let data: any = null;

  if (contentType.includes("application/json")) {
    try {
      data = await res.json();
    } catch {
      data = null;
    }
  } else {
    const text = await res.text().catch(() => "");
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = null;
      }
    }
  }

  if (!res.ok) {
    // If backend provided a structured error object with a message, preserve it
    if (data && typeof data === "object" && typeof data.message === "string") {
      return {
        success: false,
        ...data,
      } as T;
    }

    let detail = "Server request failed.";
    if (res.status === 405) {
      detail = "Method Not Allowed (405). The request was sent to a static host or invalid route.";
    } else if (res.status === 404) {
      detail = "Endpoint Not Found (404). Please verify backend URL.";
    } else if (res.status === 401 || res.status === 403) {
      detail = "Authentication failed or access denied.";
    } else if (res.status === 502 || res.status === 503) {
      detail = "Backend server is temporarily unavailable or starting up (cold start). Please retry in 30 seconds.";
    }

    const message = data?.message || data?.error || detail;
    throw new ApiError(message, res.status, data);
  }

  if (data === null) {
    return { success: true } as T;
  }

  return data as T;
}

/**
 * Centralized fetch wrapper ensuring:
 * - Proper URL resolution with BASE_URL
 * - Network & CORS failure detection
 * - Safe response parsing
 */
export async function apiFetch<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = endpoint.startsWith("http://") || endpoint.startsWith("https://")
    ? endpoint
    : `${BASE_URL}${endpoint}`;

  try {
    const res = await fetch(url, options);
    return await parseResponse<T>(res);
  } catch (err: any) {
    if (err instanceof ApiError) {
      throw err;
    }

    // Network or CORS failure
    if (
      err.name === "TypeError" &&
      (err.message?.toLowerCase().includes("fetch") || err.message?.toLowerCase().includes("network"))
    ) {
      throw new ApiError(
        `Unable to reach backend API at ${BASE_URL || "configured URL"}. Please check network connection, server health, and CORS permissions.`,
        0
      );
    }

    throw err;
  }
}

// ── Auth ──
export async function adminLogin(email: string, password: string): Promise<AdminAuthResponse> {
  return apiFetch<AdminAuthResponse>("/api/admin/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
}

export async function adminGetMe(token?: string) {
  return apiFetch("/api/admin/auth/me", {
    headers: authHeaders(token),
  });
}

// ── Dashboard Metrics ──
export async function adminGetDashboard(token?: string) {
  return apiFetch("/api/admin/dashboard", {
    headers: authHeaders(token),
  });
}

export async function adminGetDashboardStats(token?: string) {
  return apiFetch("/api/admin/dashboard/stats", {
    headers: authHeaders(token),
  });
}

// ── Products CRUD ──
export async function adminGetProducts(params?: { q?: string; category?: string; inStock?: string; status?: string }) {
  const query = new URLSearchParams(params as Record<string, string>).toString();
  return apiFetch(`/api/admin/products${query ? `?${query}` : ""}`, {
    headers: authHeaders(),
  });
}

export async function adminGetProductById(id: string) {
  return apiFetch(`/api/admin/products/${id}`, {
    headers: authHeaders(),
  });
}

export async function adminCreateProduct(data: Partial<Product>) {
  return apiFetch("/api/admin/products", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
}

export async function adminUpdateProduct(id: string, data: Partial<Product>) {
  return apiFetch(`/api/admin/products/${id}`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
}

export async function adminDeleteProduct(id: string, reason?: string) {
  return apiFetch(`/api/admin/products/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
    body: reason ? JSON.stringify({ reason }) : undefined,
  });
}

export async function adminRestoreProduct(id: string) {
  return apiFetch(`/api/admin/products/${id}/restore`, {
    method: "PATCH",
    headers: authHeaders(),
  });
}

// ── Categories CRUD ──
export async function adminGetCategories(params?: { q?: string; status?: string }) {
  const query = new URLSearchParams(params as Record<string, string>).toString();
  return apiFetch(`/api/admin/categories${query ? `?${query}` : ""}`, {
    headers: authHeaders(),
  });
}

export async function adminCreateCategory(data: { name: string; slug?: string; imageUrl: string; description?: string }) {
  return apiFetch("/api/admin/categories", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
}

export async function adminUpdateCategory(id: string, data: Partial<Category>) {
  return apiFetch(`/api/admin/categories/${id}`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
}

export async function adminDeleteCategory(id: string, reason?: string) {
  return apiFetch(`/api/admin/categories/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
    body: reason ? JSON.stringify({ reason }) : undefined,
  });
}

export async function adminRestoreCategory(id: string) {
  return apiFetch(`/api/admin/categories/${id}/restore`, {
    method: "PATCH",
    headers: authHeaders(),
  });
}

// ── SubCategories CRUD ──
export async function adminGetSubCategories(params?: { q?: string; category?: string; status?: string }) {
  const cleanParams: Record<string, string> = {};
  if (params?.q) cleanParams.q = params.q;
  if (params?.category) cleanParams.category = params.category;
  if (params?.status) cleanParams.status = params.status;
  const query = new URLSearchParams(cleanParams).toString();
  return apiFetch(`/api/admin/subcategories${query ? `?${query}` : ""}`, {
    headers: authHeaders(),
  });
}

export async function adminCreateSubCategory(data: {
  name: string;
  slug?: string;
  category: string;
  categoryName?: string;
  imageUrl: string;
  description?: string;
}) {
  return apiFetch("/api/admin/subcategories", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
}

export async function adminUpdateSubCategory(
  id: string,
  data: {
    name?: string;
    slug?: string;
    category?: string;
    categoryName?: string;
    imageUrl?: string;
    description?: string;
  }
) {
  return apiFetch(`/api/admin/subcategories/${id}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
}

export async function adminDeleteSubCategory(id: string, reason?: string) {
  return apiFetch(`/api/admin/subcategories/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
    body: reason ? JSON.stringify({ reason }) : undefined,
  });
}

export async function adminRestoreSubCategory(id: string) {
  return apiFetch(`/api/admin/subcategories/${id}/restore`, {
    method: "PATCH",
    headers: authHeaders(),
  });
}

export async function fetchCategories(): Promise<ApiResponse<Category[]>> {
  try {
    const data = await apiFetch<any>("/api/categories");
    if (data?.success && Array.isArray(data.data)) {
      return { success: true, data: data.data };
    }
  } catch (err) {
    console.warn("[PLUXPC Admin API] Categories lookup error:", err);
  }
  return { success: false, data: [] };
}

// ── Orders Management API ──
export async function adminGetOrders(params?: {
  q?: string;
  status?: string;
  paymentStatus?: string;
  page?: number;
  limit?: number;
}) {
  const cleanParams: Record<string, string> = {};
  if (params?.q) cleanParams.q = params.q;
  if (params?.status && params.status !== "all") cleanParams.status = params.status;
  if (params?.paymentStatus && params.paymentStatus !== "all") cleanParams.paymentStatus = params.paymentStatus;
  if (params?.page) cleanParams.page = String(params.page);
  if (params?.limit) cleanParams.limit = String(params.limit);

  const query = new URLSearchParams(cleanParams).toString();
  return apiFetch(`/api/admin/orders${query ? `?${query}` : ""}`, {
    headers: authHeaders(),
  });
}

export async function adminGetOrderById(orderId: string) {
  return apiFetch(`/api/admin/orders/${orderId}`, {
    headers: authHeaders(),
  });
}

export async function adminUpdateOrderStatus(
  orderId: string,
  data: {
    status: string;
    description?: string;
    location?: string;
    courierName?: string;
    trackingNumber?: string;
    trackingUrl?: string;
    estimatedDeliveryDate?: string;
  }
) {
  return apiFetch(`/api/admin/orders/${orderId}/status`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// PROMOTIONS & DISCOUNT MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

export async function adminGetPromotions(params: { q?: string; status?: string; discountType?: string } = {}) {
  const query = new URLSearchParams();
  if (params.q) query.append("q", params.q);
  if (params.status && params.status !== "all") query.append("status", params.status);
  if (params.discountType && params.discountType !== "all") query.append("discountType", params.discountType);

  return apiFetch(`/api/admin/promotions?${query.toString()}`, {
    headers: authHeaders(),
  });
}

export async function adminGetPromotionById(id: string) {
  return apiFetch(`/api/admin/promotions/${id}`, {
    headers: authHeaders(),
  });
}

export async function adminCreatePromotion(data: any) {
  return apiFetch("/api/admin/promotions", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
}

export async function adminUpdatePromotion(id: string, data: any) {
  return apiFetch(`/api/admin/promotions/${id}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
}

export async function adminTogglePromotion(id: string) {
  return apiFetch(`/api/admin/promotions/${id}/toggle`, {
    method: "PATCH",
    headers: authHeaders(),
  });
}

export async function adminDeletePromotion(id: string, reason?: string) {
  return apiFetch(`/api/admin/promotions/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
    body: reason ? JSON.stringify({ reason }) : undefined,
  });
}

export async function adminRestorePromotion(id: string) {
  return apiFetch(`/api/admin/promotions/${id}/restore`, {
    method: "PATCH",
    headers: authHeaders(),
  });
}

export async function adminPreviewDiscount(params: {
  discountType: "percentage" | "fixed";
  discountValue: number;
  maxDiscountAmount?: number | null;
  productIds?: string[];
  appliesTo?: "all" | "specific";
}) {
  const query = new URLSearchParams();
  query.append("discountType", params.discountType);
  query.append("discountValue", String(params.discountValue));
  if (params.maxDiscountAmount) query.append("maxDiscountAmount", String(params.maxDiscountAmount));
  if (params.appliesTo) query.append("appliesTo", params.appliesTo);
  if (params.productIds && params.productIds.length > 0) {
    query.append("productIds", params.productIds.join(","));
  }

  return apiFetch(`/api/admin/promotions/preview?${query.toString()}`, {
    headers: authHeaders(),
  });
}

// ── Platform Fee Settings API ──
export async function adminGetPlatformFeeSettings() {
  return apiFetch("/api/admin/settings/platform-fee", {
    headers: authHeaders(),
  });
}

export async function adminUpdatePlatformFeeSettings(data: PlatformFeeInput) {
  return apiFetch("/api/admin/settings/platform-fee", {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
}

export async function adminTogglePlatformFee() {
  return apiFetch("/api/admin/settings/platform-fee/toggle", {
    method: "PATCH",
    headers: authHeaders(),
  });
}

// ── Manage Earning & User Details API ──
export async function adminGetEarnings(params?: { q?: string; page?: number; limit?: number }) {
  const query = new URLSearchParams();
  if (params?.q) query.set("q", params.q);
  if (params?.page) query.set("page", String(params.page));
  if (params?.limit) query.set("limit", String(params.limit));

  const qs = query.toString();
  return apiFetch(`/api/admin/earnings${qs ? `?${qs}` : ""}`, {
    headers: authHeaders(),
  });
}

export async function adminGetUserDetails(userId: string) {
  return apiFetch(`/api/admin/earnings/users/${encodeURIComponent(userId)}`, {
    headers: authHeaders(),
  });
}

// ── Audit Logs API ──
export async function adminGetAuditLogs(params?: AuditLogQueryParams): Promise<AuditLogListResponse> {
  const query = new URLSearchParams();
  if (params?.page) query.set("page", String(params.page));
  if (params?.limit) query.set("limit", String(params.limit));
  if (params?.q) query.set("q", params.q);
  if (params?.module && params.module !== "all") query.set("module", params.module);
  if (params?.action && params.action !== "all") query.set("action", params.action);
  if (params?.role && params.role !== "all") query.set("role", params.role);
  if (params?.startDate) query.set("startDate", params.startDate);
  if (params?.endDate) query.set("endDate", params.endDate);
  if (params?.tab && params.tab !== "all") query.set("tab", params.tab);

  const qs = query.toString();
  return apiFetch(`/api/admin/audit-logs${qs ? `?${qs}` : ""}`, {
    headers: authHeaders(),
  });
}

export async function adminGetAuditLogStats(): Promise<{ success: boolean; stats: AuditLogStats }> {
  return apiFetch("/api/admin/audit-logs/stats", {
    headers: authHeaders(),
  });
}

export async function adminGetAuditLogById(id: string): Promise<{ success: boolean; log: AuditLogRecord }> {
  return apiFetch(`/api/admin/audit-logs/${encodeURIComponent(id)}`, {
    headers: authHeaders(),
  });
}

// ── Blog Management APIs ──
export async function adminGetBlogStats(): Promise<{ success: boolean; stats: BlogStats }> {
  return apiFetch("/api/admin/blogs/stats", {
    headers: authHeaders(),
  });
}

export async function adminGetBlogs(params?: {
  page?: number;
  limit?: number;
  status?: string;
  category?: string;
  q?: string;
}): Promise<BlogAdminListResponse> {
  const query = new URLSearchParams();
  if (params?.page) query.set("page", String(params.page));
  if (params?.limit) query.set("limit", String(params.limit));
  if (params?.status && params.status !== "all") query.set("status", params.status);
  if (params?.category && params.category !== "all") query.set("category", params.category);
  if (params?.q) query.set("q", params.q);

  const qs = query.toString();
  return apiFetch(`/api/admin/blogs${qs ? `?${qs}` : ""}`, {
    headers: authHeaders(),
  });
}

export async function adminGetBlogById(id: string): Promise<{ success: boolean; blog: Blog }> {
  return apiFetch(`/api/admin/blogs/${encodeURIComponent(id)}`, {
    headers: authHeaders(),
  });
}

export async function adminCreateBlog(data: BlogInput): Promise<{ success: boolean; blog: Blog; message?: string }> {
  return apiFetch("/api/admin/blogs", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
}

export async function adminUpdateBlog(id: string, data: Partial<BlogInput>): Promise<{ success: boolean; blog: Blog; message?: string }> {
  return apiFetch(`/api/admin/blogs/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
}

export async function adminToggleBlogStatus(id: string, status: "draft" | "published"): Promise<{ success: boolean; blog: Blog; message?: string }> {
  return apiFetch(`/api/admin/blogs/${encodeURIComponent(id)}/status`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify({ status }),
  });
}

export async function adminDeleteBlog(id: string): Promise<{ success: boolean; message?: string }> {
  return apiFetch(`/api/admin/blogs/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
}

export { BASE_URL };


