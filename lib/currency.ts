// lib/currency.ts
// Utility functions for handling currency values to avoid floating-point precision issues

/**
 * Safely parses a currency value and rounds it to 2 decimal places
 * @param value - The value to parse (string or number)
 * @returns The parsed and rounded currency value
 */
export function parseCurrency(value: string | number | undefined | null): number {
  if (value === undefined || value === null || value === "") {
    return 0;
  }
  
  const parsed = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(parsed)) {
    return 0;
  }
  
  // Round to 2 decimal places to avoid floating-point precision issues
  return Math.round(parsed * 100) / 100;
}

/**
 * Safely adds two currency values and rounds the result
 * @param a - First currency value
 * @param b - Second currency value
 * @returns The sum rounded to 2 decimal places
 */
export function addCurrency(a: number, b: number): number {
  return Math.round((a + b) * 100) / 100;
}

/**
 * Safely subtracts two currency values and rounds the result
 * @param a - First currency value
 * @param b - Second currency value
 * @returns The difference rounded to 2 decimal places
 */
export function subtractCurrency(a: number, b: number): number {
  return Math.round((a - b) * 100) / 100;
}

/**
 * Safely multiplies two currency values and rounds the result
 * @param a - First currency value
 * @param b - Second currency value
 * @returns The product rounded to 2 decimal places
 */
export function multiplyCurrency(a: number, b: number): number {
  return Math.round((a * b) * 100) / 100;
}


