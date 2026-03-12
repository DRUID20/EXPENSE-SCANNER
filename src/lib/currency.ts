// Multi-currency conversion with UGX as the primary/base currency
// Exchange rates: 1 unit of foreign currency = X UGX

export const SUPPORTED_CURRENCIES = ["UGX", "USD", "EUR", "GBP", "KES", "TZS"] as const;
export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number];

// Approximate exchange rates to UGX (as of early 2026)
// These should ideally be fetched from a live API in production
const EXCHANGE_RATES_TO_UGX: Record<CurrencyCode, number> = {
  UGX: 1,
  USD: 3750,
  EUR: 4100,
  GBP: 4750,
  KES: 29,
  TZS: 1.5,
};

/**
 * Convert an amount from a given currency to UGX
 */
export function convertToUGX(amount: number, currency: string): number {
  const rate = EXCHANGE_RATES_TO_UGX[currency as CurrencyCode];
  if (!rate) return amount; // fallback: treat as UGX if unknown
  return Math.round(amount * rate);
}

/**
 * Convert an amount from UGX to a target currency
 */
export function convertFromUGX(amountUGX: number, targetCurrency: string): number {
  const rate = EXCHANGE_RATES_TO_UGX[targetCurrency as CurrencyCode];
  if (!rate || rate === 0) return amountUGX;
  return amountUGX / rate;
}

/**
 * Get the exchange rate for a currency to UGX
 */
export function getExchangeRate(currency: string): number {
  return EXCHANGE_RATES_TO_UGX[currency as CurrencyCode] ?? 1;
}

/**
 * Check if a currency code is supported
 */
export function isSupportedCurrency(currency: string): currency is CurrencyCode {
  return SUPPORTED_CURRENCIES.includes(currency as CurrencyCode);
}
