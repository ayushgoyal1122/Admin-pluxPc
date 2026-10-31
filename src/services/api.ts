// ─── Admin API Service Layer ──────────────────────────────────────────────────
// Dedicated API client for PLUXPC Admin Portal communicating with Express API.

import type { Product, Category, ApiResponse, PlatformFeeInput } from "../types";

const BASE_URL = import.meta.env.VITE_API_URL ?? "";

function authHeaders(token?: string | null) {
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

// ── Auth ──
export async function adminLogin(email: string, password: string): Promise<AdminAuthResponse> {
  const res = await fetch(`${BASE_URL}/api/admin/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return res.json();
}

export async function adminGetMe(token?: string) {
  const res = await fetch(`${BASE_URL}/api/admin/auth/me`, {
    headers: authHeaders(token),
  });
  return res.json();
}

// ── Dashboard Metrics ──
export async function adminGetDashboard(token?: string) {
  const res = await fetch(`${BASE_URL}/api/admin/dashboard`, {
    headers: authHeaders(token),
  });
  return res.json();
}

export async function adminGetDashboardStats(token?: string) {
  const res = await fetch(`${BASE_URL}/api/admin/dashboard/stats`, {
    headers: authHeaders(token),
  });
  return res.json();
}

// ── Products CRUD ──
export async function adminGetProducts(params?: { q?: string; category?: string; inStock?: string; status?: string }) {
  const query = new URLSearchParams(params as Record<string, string>).toString();
  const res = await fetch(`${BASE_URL}/api/admin/products${query ? `?${query}` : ""}`, {
    headers: authHeaders(),
  });
  return res.json();
}

export async function adminGetProductById(id: string) {
  const res = await fetch(`${BASE_URL}/api/admin/products/${id}`, {
    headers: authHeaders(),
  });
  return res.json();
}

export async function adminCreateProduct(data: Partial<Product>) {
  const res = await fetch(`${BASE_URL}/api/admin/products`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function adminUpdateProduct(id: string, data: Partial<Product>) {
  const res = await fetch(`${BASE_URL}/api/admin/products/${id}`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function adminDeleteProduct(id: string, reason?: string) {
  const res = await fetch(`${BASE_URL}/api/admin/products/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
    body: reason ? JSON.stringify({ reason }) : undefined,
  });
  return res.json();
}

export async function adminRestoreProduct(id: string) {
  const res = await fetch(`${BASE_URL}/api/admin/products/${id}/restore`, {
    method: "PATCH",
    headers: authHeaders(),
  });
  return res.json();
}

// ── Categories CRUD ──
export async function adminGetCategories(params?: { q?: string; status?: string }) {
  const query = new URLSearchParams(params as Record<string, string>).toString();
  const res = await fetch(`${BASE_URL}/api/admin/categories${query ? `?${query}` : ""}`, {
    headers: authHeaders(),
  });
  return res.json();
}

export async function adminCreateCategory(data: { name: string; slug?: string; imageUrl: string; description?: string }) {
  const res = await fetch(`${BASE_URL}/api/admin/categories`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function adminUpdateCategory(id: string, data: Partial<Category>) {
  const res = await fetch(`${BASE_URL}/api/admin/categories/${id}`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function adminDeleteCategory(id: string, reason?: string) {
  const res = await fetch(`${BASE_URL}/api/admin/categories/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
    body: reason ? JSON.stringify({ reason }) : undefined,
  });
  return res.json();
}

export async function adminRestoreCategory(id: string) {
  const res = await fetch(`${BASE_URL}/api/admin/categories/${id}/restore`, {
    method: "PATCH",
    headers: authHeaders(),
  });
  return res.json();
}

// ── SubCategories CRUD ──
export async function adminGetSubCategories(params?: { q?: string; category?: string; status?: string }) {
  const cleanParams: Record<string, string> = {};
  if (params?.q) cleanParams.q = params.q;
  if (params?.category) cleanParams.category = params.category;
  if (params?.status) cleanParams.status = params.status;
  const query = new URLSearchParams(cleanParams).toString();
  const res = await fetch(`${BASE_URL}/api/admin/subcategories${query ? `?${query}` : ""}`, {
    headers: authHeaders(),
  });
  return res.json();
}

export async function adminCreateSubCategory(data: {
  name: string;
  slug?: string;
  category: string;
  categoryName?: string;
  imageUrl: string;
  description?: string;
}) {
  const res = await fetch(`${BASE_URL}/api/admin/subcategories`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  return res.json();
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
  const res = await fetch(`${BASE_URL}/api/admin/subcategories/${id}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function adminDeleteSubCategory(id: string, reason?: string) {
  const res = await fetch(`${BASE_URL}/api/admin/subcategories/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
    body: reason ? JSON.stringify({ reason }) : undefined,
  });
  return res.json();
}

export async function adminRestoreSubCategory(id: string) {
  const res = await fetch(`${BASE_URL}/api/admin/subcategories/${id}/restore`, {
    method: "PATCH",
    headers: authHeaders(),
  });
  return res.json();
}

export async function fetchCategories(): Promise<ApiResponse<Category[]>> {
  try {
    const res = await fetch(`${BASE_URL}/api/categories`);
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        return { success: true, data: data.data };
      }
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
  const res = await fetch(`${BASE_URL}/api/admin/orders${query ? `?${query}` : ""}`, {
    headers: authHeaders(),
  });
  return res.json();
}

export async function adminGetOrderById(orderId: string) {
  const res = await fetch(`${BASE_URL}/api/admin/orders/${orderId}`, {
    headers: authHeaders(),
  });
  return res.json();
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
  const res = await fetch(`${BASE_URL}/api/admin/orders/${orderId}/status`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  return res.json();
}

// ─────────────────────────────────────────────────────────────────────────────
// PROMOTIONS & DISCOUNT MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

export async function adminGetPromotions(params: { q?: string; status?: string; discountType?: string } = {}) {
  const query = new URLSearchParams();
  if (params.q) query.append("q", params.q);
  if (params.status && params.status !== "all") query.append("status", params.status);
  if (params.discountType && params.discountType !== "all") query.append("discountType", params.discountType);

  const res = await fetch(`${BASE_URL}/api/admin/promotions?${query.toString()}`, {
    headers: authHeaders(),
  });
  return res.json();
}

export async function adminGetPromotionById(id: string) {
  const res = await fetch(`${BASE_URL}/api/admin/promotions/${id}`, {
    headers: authHeaders(),
  });
  return res.json();
}

export async function adminCreatePromotion(data: any) {
  const res = await fetch(`${BASE_URL}/api/admin/promotions`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function adminUpdatePromotion(id: string, data: any) {
  const res = await fetch(`${BASE_URL}/api/admin/promotions/${id}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function adminTogglePromotion(id: string) {
  const res = await fetch(`${BASE_URL}/api/admin/promotions/${id}/toggle`, {
    method: "PATCH",
    headers: authHeaders(),
  });
  return res.json();
}

export async function adminDeletePromotion(id: string, reason?: string) {
  const res = await fetch(`${BASE_URL}/api/admin/promotions/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
    body: reason ? JSON.stringify({ reason }) : undefined,
  });
  return res.json();
}

export async function adminRestorePromotion(id: string) {
  const res = await fetch(`${BASE_URL}/api/admin/promotions/${id}/restore`, {
    method: "PATCH",
    headers: authHeaders(),
  });
  return res.json();
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

  const res = await fetch(`${BASE_URL}/api/admin/promotions/preview?${query.toString()}`, {
    headers: authHeaders(),
  });
  return res.json();
}

// ── Platform Fee Settings API ──
export async function adminGetPlatformFeeSettings() {
  const res = await fetch(`${BASE_URL}/api/admin/settings/platform-fee`, {
    headers: authHeaders(),
  });
  return res.json();
}

export async function adminUpdatePlatformFeeSettings(data: PlatformFeeInput) {
  const res = await fetch(`${BASE_URL}/api/admin/settings/platform-fee`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function adminTogglePlatformFee() {
  const res = await fetch(`${BASE_URL}/api/admin/settings/platform-fee/toggle`, {
    method: "PATCH",
    headers: authHeaders(),
  });
  return res.json();
}

export { BASE_URL };

