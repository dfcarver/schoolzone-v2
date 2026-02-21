/**
 * Clamp a value to [0, 1].
 */
export function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

/**
 * Compute the arithmetic mean of an array of numbers.
 * Returns 0 for empty arrays.
 */
export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/**
 * Compute the population variance of an array of numbers.
 * Returns 0 for arrays with fewer than 2 elements.
 */
export function variance(values: number[]): number {
  if (values.length < 2) return 0;
  const avg = mean(values);
  return values.reduce((sum, v) => sum + (v - avg) ** 2, 0) / values.length;
}

/**
 * Normalize a raw score using a sigmoid-like function to map to [0, 1].
 * The midpoint parameter controls where the curve centers.
 */
export function sigmoidNormalize(value: number, midpoint: number = 1): number {
  if (!Number.isFinite(value)) return 0;
  return clamp01(value / (value + midpoint));
}
