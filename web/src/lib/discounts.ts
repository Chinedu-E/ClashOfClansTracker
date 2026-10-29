export interface GlobalDiscounts {
  /** Percent off upgrade costs (0–100). Example: 20 → pay 80%. */
  costPercent: number
  /** Percent off upgrade times (0–100). Example: 20 → 80% duration. */
  timePercent: number
}

export const DEFAULT_DISCOUNTS: GlobalDiscounts = {
  costPercent: 0,
  timePercent: 0,
}

export function clampDiscount(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(100, Math.max(0, value))
}

export function applyCostDiscount(cost: number, discounts: GlobalDiscounts): number {
  const factor = 1 - clampDiscount(discounts.costPercent) / 100
  return Math.max(0, Math.floor(cost * factor))
}

export function applyTimeDiscount(seconds: number, discounts: GlobalDiscounts): number {
  const factor = 1 - clampDiscount(discounts.timePercent) / 100
  return Math.max(0, Math.floor(seconds * factor))
}
