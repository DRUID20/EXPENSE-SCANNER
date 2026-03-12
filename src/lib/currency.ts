// Multi-currency conversion with UGX as the primary/base currency
// Fetches live rates from ExchangeRate-API with 24-hour in-memory cache
// Falls back to hardcoded rates if the API is unavailable

export const SUPPORTED_CURRENCIES = ["UGX", "USD", "EUR", "GBP", "KES", "TZS"] as const;
export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number];

// Hardcoded fallback rates (1 unit of currency = X UGX)
const FALLBACK_RATES: Record<CurrencyCode, number> = {
  UGX: 1,
  USD: 3750,
  EUR: 4100,
  GBP: 4750,
  KES: 29,
  TZS: 1.5,
};

// In-memory cache for live rates
let cachedRates: Record<CurrencyCode, number> = { ...FALLBACK_RATES };
let cacheTimestamp = 0;
let fetchInProgress: Promise<void> | null = null;

const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Fetch live exchange rates from ExchangeRate-API (free, no key required)
 * Converts all rates to "X UGX per 1 unit" format
 */
export async function refreshExchangeRates(): Promise<{
  rates: Record<CurrencyCode, number>;
  source: "live" | "fallback";
  updatedAt: number;
}> {
  // If a fetch is already in progress, wait for it
  if (fetchInProgress) {
    await fetchInProgress;
    return { rates: { ...cachedRates }, source: "live", updatedAt: cacheTimestamp };
  }

  fetchInProgress = (async () => {
    try {
      // Use Open ExchangeRate API (free, no key needed, base USD)
      const res = await fetch("https://open.er-api.com/v6/latest/USD", {
        signal: AbortSignal.timeout(10000),
      });

      if (!res.ok) {
        throw new Error(`API returned ${res.status}`);
      }

      const data = await res.json();

      if (data.result !== "success" || !data.rates) {
        throw new Error("Invalid API response");
      }

      // API gives rates as "1 USD = X currency"
      // We need "1 currency = X UGX"
      const usdToUgx = data.rates.UGX;
      if (!usdToUgx) {
        throw new Error("UGX rate not found in API response");
      }

      const newRates: Record<CurrencyCode, number> = { UGX: 1 } as Record<CurrencyCode, number>;

      for (const currency of SUPPORTED_CURRENCIES) {
        if (currency === "UGX") continue;

        const usdToCurrency = data.rates[currency];
        if (usdToCurrency && usdToCurrency > 0) {
          // 1 currency = (usdToUgx / usdToCurrency) UGX
          newRates[currency] = Math.round((usdToUgx / usdToCurrency) * 100) / 100;
        } else {
          // Keep fallback for missing currencies
          newRates[currency] = FALLBACK_RATES[currency];
        }
      }

      cachedRates = newRates;
      cacheTimestamp = Date.now();
      console.log("[Currency] Live rates updated:", newRates);
    } catch (err) {
      console.error("[Currency] Failed to fetch live rates, using cached/fallback:", err);
      // Keep existing cached rates (or fallback if first run)
      if (cacheTimestamp === 0) {
        cachedRates = { ...FALLBACK_RATES };
      }
    } finally {
      fetchInProgress = null;
    }
  })();

  await fetchInProgress;

  return {
    rates: { ...cachedRates },
    source: cacheTimestamp > 0 ? "live" : "fallback",
    updatedAt: cacheTimestamp,
  };
}

/**
 * Trigger a background refresh if the cache is stale.
 * Does not block — returns immediately.
 */
function ensureFreshRates(): void {
  if (Date.now() - cacheTimestamp > CACHE_TTL && !fetchInProgress) {
    // Fire-and-forget refresh
    refreshExchangeRates().catch(() => {});
  }
}

/**
 * Convert an amount from a given currency to UGX
 */
export function convertToUGX(amount: number, currency: string): number {
  ensureFreshRates();
  const rate = cachedRates[currency as CurrencyCode];
  if (!rate) return amount; // fallback: treat as UGX if unknown
  return Math.round(amount * rate);
}

/**
 * Convert an amount from UGX to a target currency
 */
export function convertFromUGX(amountUGX: number, targetCurrency: string): number {
  ensureFreshRates();
  const rate = cachedRates[targetCurrency as CurrencyCode];
  if (!rate || rate === 0) return amountUGX;
  return amountUGX / rate;
}

/**
 * Get the exchange rate for a currency to UGX
 */
export function getExchangeRate(currency: string): number {
  ensureFreshRates();
  return cachedRates[currency as CurrencyCode] ?? 1;
}

/**
 * Get all current rates and cache info
 */
export function getRatesInfo(): {
  rates: Record<CurrencyCode, number>;
  cachedAt: number | null;
  isStale: boolean;
  isFallback: boolean;
} {
  return {
    rates: { ...cachedRates },
    cachedAt: cacheTimestamp || null,
    isStale: Date.now() - cacheTimestamp > CACHE_TTL,
    isFallback: cacheTimestamp === 0,
  };
}

/**
 * Check if a currency code is supported
 */
export function isSupportedCurrency(currency: string): currency is CurrencyCode {
  return SUPPORTED_CURRENCIES.includes(currency as CurrencyCode);
}
