// ─── Utility helpers ──────────────────────────────────────────────────────────

/** Format a price in INR locale */
export function formatPrice(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Calculate discount percentage */
export function discountPercent(original: number, sale: number): number {
  return Math.round(((original - sale) / original) * 100);
}

/** Clamp a number between min and max */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Slugify a string */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Truncate text to a max length with ellipsis */
export function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen).trim() + "…";
}

/** Generate star rating string, e.g. 4.5 → "★★★★½" */
export function starsFromRating(rating: number): string {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5 ? 1 : 0;
  const empty = 5 - full - half;
  return "★".repeat(full) + (half ? "½" : "") + "☆".repeat(empty);
}

/**
 * Creates a clean, reliable, self-contained SVG Data URI placeholder for a product or category.
 * Fully immune to external network failures, CORS, 404s, or ad-blockers.
 */
export function getProductFallbackImage(label?: string): string {
  const cleanLabel = (label || "PLUXPC Product").replace(/[<>&"]/g, "");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">
    <rect width="600" height="600" fill="#F1F3F5"/>
    <g transform="translate(240, 210)">
      <circle cx="60" cy="60" r="50" fill="#E5E7EB"/>
      <path d="M55 35 L40 65 L60 65 L50 95 L85 55 L65 55 Z" fill="#9CA3AF"/>
    </g>
    <text x="300" y="360" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="18" font-weight="600" fill="#4B5563" text-anchor="middle">PLUXPC</text>
    <text x="300" y="390" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="500" fill="#9CA3AF" text-anchor="middle">${cleanLabel}</text>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/**
 * Image error handler that replaces a broken image with a fallback while strictly preventing infinite loops.
 */
export function handleImageError(
  e: React.SyntheticEvent<HTMLImageElement, Event>,
  fallbackLabel?: string
) {
  const target = e.currentTarget;
  target.onerror = null; // Strictly prevents infinite loops
  target.src = getProductFallbackImage(fallbackLabel);
}

