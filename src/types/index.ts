// ─── Global TypeScript types ──────────────────────────────────────────────────

export interface Product {
  id: string;
  name: string;
  slug: string;
  category: string;          // slug of the category
  categoryLabel: string;     // display label
  price: number;
  originalPrice?: number;
  rating: number;
  reviewCount: number;
  imageUrl: string;
  images?: string[];
  galleryImages?: string[];
  promotionalPosters?: Array<{
    image: string;
    alt?: string;
    title?: string;
    description?: string;
    tag?: string;
    sortOrder?: number;
  }>;
  badge?: string;            // "New Launch", "Bestseller", "Extra ₹100 Off" …
  badgeIcon?: string;        // emoji/icon prefix for badge
  featureTag?: string;       // "40 Hrs Playback", "BT Calling" …
  inStock: boolean;
  stockQuantity?: number;
  description?: string;
  overview?: string;
  keyFeatures?: string[];
  highlights?: Array<{ icon?: string; title: string; description: string }>;
  useCases?: Array<{ title: string; description: string; badge?: string }>;
  inTheBox?: string[];
  compatibility?: string[];
  warrantyDetails?: string;
  specs?: Record<string, string>;
  colors?: string[];         // tailwind bg class names for color dots
  section?: string[];        // which homepage sections this product appears in
  isNew?: boolean;
  isTrending?: boolean;
  isDeleted?: boolean;
  deletedAt?: string | null;
  deletedReason?: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  imageUrl: string;
  productCount?: number;
  description?: string;
  isDeleted?: boolean;
  deletedAt?: string | null;
  deletedReason?: string;
}

export interface SubCategory {
  id: string;
  name: string;
  slug: string;
  category: string;
  categoryName?: string;
  imageUrl: string;
  description?: string;
  productCount?: number;
  isDeleted?: boolean;
  deletedAt?: string | null;
  deletedReason?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface WishlistItem {
  product: Product;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

export interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  imageUrl: string;
  date: string;
  category: string;
  readTime: string;
  tab: "popular" | "latest";
}

export interface HeroBanner {
  id: string;
  tag: string;
  headline: string;
  subheadline: string;
  features: string[];
  imageUrl: string;
  bgFrom: string;
  bgTo: string;
  ctaLabel: string;
  ctaLink: string;
}

// API response shape — ready for MERN backend integration
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

export type SortOption = "featured" | "price-asc" | "price-desc" | "rating" | "newest";

export interface FilterState {
  category?: string;
  priceMin?: number;
  priceMax?: number;
  sort: SortOption;
  inStock?: boolean;
}

export interface DashboardMetrics {
  totalProducts: number;
  totalCategories: number;
  inStockCount: number;
  outOfStockCount: number;
  lowStockCount: number;
  totalInventoryUnits: number;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
}

export interface DatabaseStatus {
  connected: boolean;
  databaseName: string;
  host: string;
}

export interface DashboardData {
  metrics: DashboardMetrics;
  databaseStatus: DatabaseStatus;
  recentProducts: Product[];
  categories: Category[];
}

export interface DeliveryAddress {
  fullName: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country?: string;
}

export interface OrderItem {
  product: string;
  name: string;
  slug: string;
  imageUrl: string;
  price: number;
  quantity: number;
  subtotal: number;
}

export interface TrackingEvent {
  status: string;
  timestamp: string;
  description: string;
  location?: string;
  actor?: "system" | "customer" | "admin";
}

export interface ShipmentDetails {
  courierName?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  estimatedDeliveryDate?: string;
  shippedAt?: string;
  deliveredAt?: string;
}

export interface AdminOrder {
  _id: string;
  orderNumber: string;
  customer?: {
    _id: string;
    name: string;
    email: string;
  };
  items: OrderItem[];
  subtotal: number;
  shippingFee: number;
  platformFee?: number;
  platformFeeType?: "fixed" | "percentage" | null;
  platformFeeValue?: number;
  platformFeeEnabledAtPurchase?: boolean;
  discount: number;
  total: number;
  currency: string;
  deliveryAddress: DeliveryAddress;
  paymentStatus: "pending" | "paid" | "failed" | "refunded";
  orderStatus: "placed" | "confirmed" | "processing" | "shipped" | "out_for_delivery" | "delivered" | "cancelled";
  trackingHistory?: TrackingEvent[];
  shipment?: ShipmentDetails;
  paymentMethod: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  paidAt?: string;
  failedAt?: string;
  failureReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PromotionProduct {
  _id?: string;
  id?: string;
  name: string;
  price: number;
  slug?: string;
  category?: string;
  categoryLabel?: string;
  imageUrl?: string;
}

export interface Promotion {
  _id: string;
  id?: string;
  name: string;
  code: string;
  description?: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  appliesTo: "all" | "specific";
  products?: PromotionProduct[] | string[];
  isActive: boolean;
  startDate: string;
  endDate?: string | null;
  minPurchaseAmount?: number;
  maxDiscountAmount?: number | null;
  maxUsageLimit?: number | null;
  perCustomerLimit?: number;
  usedCount: number;
  computedStatus?: "active" | "inactive" | "scheduled" | "expired" | "archived";
  isDeleted?: boolean;
  deletedAt?: string | null;
  deletedReason?: string;
  productCount?: number | string;
  createdAt: string;
  updatedAt: string;
}

export interface PromotionInput {
  name: string;
  code: string;
  description?: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  appliesTo: "all" | "specific";
  products: string[];
  isActive: boolean;
  startDate: string;
  endDate?: string | null;
  minPurchaseAmount?: number;
  maxDiscountAmount?: number | null;
  maxUsageLimit?: number | null;
  perCustomerLimit?: number;
}

export interface DiscountPreviewItem {
  id: string;
  name: string;
  price: number;
  discount: number;
  discountedPrice: number;
  savingsPercent: number;
}

export interface PlatformFeeSettings {
  _id?: string;
  enabled: boolean;
  feeType: "fixed" | "percentage";
  feeValue: number;
  minFee?: number | null;
  maxFee?: number | null;
  updatedAt?: string;
}

export interface PlatformFeeInput {
  enabled: boolean;
  feeType: "fixed" | "percentage";
  feeValue: number;
  minFee?: number | null;
  maxFee?: number | null;
}

// ── Manage Earning & User Details Types ──

export interface EarningUser {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

export interface EarningItemSummary {
  name: string;
  quantity: number;
  imageUrl?: string;
  price?: number;
  subtotal?: number;
}

export interface EarningTransaction {
  sNo: number;
  id: string;
  orderNumber: string;
  transactionId: string;
  paymentId?: string | null;
  user: EarningUser;
  itemsCount: number;
  itemsSummary?: EarningItemSummary[];
  amount: number;
  currency: string;
  paymentStatus: "paid" | "pending" | "failed" | "refunded";
  orderStatus: "placed" | "confirmed" | "processing" | "shipped" | "out_for_delivery" | "delivered" | "cancelled";
  purchasedAt: string;
  createdAt: string;
}

export interface EarningsSummaryResponse {
  success: boolean;
  totalRevenue: number;
  todayRevenue: number;
  totalTransactions: number;
  page: number;
  limit: number;
  totalPages: number;
  transactions: EarningTransaction[];
  message?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: string;
  status: "Active" | "Inactive";
  isDeleted: boolean;
  memberSince: string;
}

export interface UserStatistics {
  accountStatus: string;
  totalOrders: number;
  paidOrdersCount: number;
  totalItemsPurchased: number;
  totalSpent: number;
}

export interface UserPurchaseItem {
  name: string;
  slug?: string;
  imageUrl?: string;
  price: number;
  quantity: number;
  subtotal: number;
}

export interface UserPurchaseOrder {
  id: string;
  orderNumber: string;
  transactionId: string;
  itemsCount: number;
  amount: number;
  currency: string;
  paymentStatus: "paid" | "pending" | "failed" | "refunded";
  orderStatus: "placed" | "confirmed" | "processing" | "shipped" | "out_for_delivery" | "delivered" | "cancelled";
  items: UserPurchaseItem[];
  purchasedAt: string;
  createdAt: string;
}

export interface UserEarningDetailsResponse {
  success: boolean;
  user: UserProfile;
  statistics: UserStatistics;
  purchaseHistory: UserPurchaseOrder[];
  message?: string;
}

// ─── Audit Log Types ──────────────────────────────────────────────────────────

export interface AuditLogRecord {
  id: string;
  actorId?: string | null;
  actorType: "admin" | "customer" | "system" | "anonymous";
  actorRole: "admin" | "customer" | "system" | "unauthenticated";
  actorName: string;
  actorEmail: string;
  action: string;
  actionLabel: string;
  module: string;
  moduleLabel: string;
  entityType?: string;
  entityId?: string;
  entityTitle?: string;
  description: string;
  result: "success" | "failure";
  failureReason?: string;
  changedFields: string[];
  requestMethod: string;
  requestPath: string;
  ipAddress: string;
  userAgent: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface AuditLogStats {
  totalLogs: number;
  todayActivity: number;
  adminActions: number;
  customerActivity: number;
  failedActions: number;
  tabs: {
    all: number;
    admin: number;
    customer: number;
    auth: number;
    products: number;
    orders: number;
    settings: number;
    failed: number;
  };
}

export interface AuditLogQueryParams {
  page?: number;
  limit?: number;
  q?: string;
  module?: string;
  action?: string;
  role?: string;
  startDate?: string;
  endDate?: string;
  tab?: string;
}

export interface AuditLogListResponse {
  success: boolean;
  logs: AuditLogRecord[];
  totalCount: number;
  page: number;
  limit: number;
  totalPages: number;
  message?: string;
}

// ─── Blog Types ─────────────────────────────────────────────────────────────
export interface Blog {
  _id: string;
  id?: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImage: string;
  category: string;
  categorySlug?: string;
  author: string;
  authorRole?: string;
  authorAvatar?: string;
  tags?: string[];
  status: "draft" | "published";
  readTime: string;
  views: number;
  isFeatured: boolean;
  metaTitle?: string;
  metaDescription?: string;
  publishedAt: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface BlogInput {
  title: string;
  slug?: string;
  excerpt: string;
  content: string;
  coverImage: string;
  category: string;
  author?: string;
  authorRole?: string;
  authorAvatar?: string;
  tags?: string[];
  status?: "draft" | "published";
  readTime?: string;
  isFeatured?: boolean;
  metaTitle?: string;
  metaDescription?: string;
  publishedAt?: string;
}

export interface BlogStats {
  total: number;
  published: number;
  draft: number;
  totalViews: number;
}

export interface BlogAdminListResponse {
  success: boolean;
  blogs: Blog[];
  total: number;
  page: number;
  totalPages: number;
}


