/**
 * Standard Price Bucketing Utilities
 * Strictly implements user specified discrete price bands:
 * - Less than 25K (< ₹25,000)
 * - 25-50K (₹25,000 - ₹49,999)
 * - 50K-1L (₹50,000 - ₹99,999)
 * - 1-2L (₹1,00,000 - ₹1,99,999)
 * - 2-3L (₹2,00,000 - ₹2,99,999)
 * - 3-4L (₹3,00,000 - ₹3,99,999)
 * - 4-5L (₹4,00,000 - ₹4,99,999)
 * - 5L+ (>= ₹5,00,000)
 */

export const PRICE_BUCKETS = [
  "Less than 25K",
  "25-50K",
  "50K-1L",
  "1-2L",
  "2-3L",
  "3-4L",
  "4-5L",
  "5L+"
] as const;

export type PriceBucket = typeof PRICE_BUCKETS[number];

export function getPriceBucket(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value) || value <= 0) {
    return "—";
  }
  if (value < 25000) return "Less than 25K";
  if (value < 50000) return "25-50K";
  if (value < 100000) return "50K-1L";
  if (value < 200000) return "1-2L";
  if (value < 300000) return "2-3L";
  if (value < 400000) return "3-4L";
  if (value < 500000) return "4-5L";
  return "5L+";
}

export function getBucketColorClasses(bucket: string): string {
  switch (bucket) {
    case "Less than 25K":
      return "bg-slate-100 text-slate-700 border-slate-300";
    case "25-50K":
      return "bg-sky-50 text-sky-700 border-sky-200";
    case "50K-1L":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "1-2L":
      return "bg-indigo-50 text-indigo-700 border-indigo-200";
    case "2-3L":
      return "bg-violet-50 text-violet-700 border-violet-200";
    case "3-4L":
      return "bg-purple-50 text-purple-700 border-purple-200";
    case "4-5L":
      return "bg-amber-50 text-amber-800 border-amber-200";
    case "5L+":
      return "bg-rose-50 text-rose-800 border-rose-200";
    default:
      return "bg-slate-100 text-slate-600 border-slate-200";
  }
}
