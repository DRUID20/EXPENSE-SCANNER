import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { refreshExchangeRates, getRatesInfo, SUPPORTED_CURRENCIES } from "@/lib/currency";

// GET: View current exchange rates and cache status
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const info = getRatesInfo();

    return NextResponse.json({
      rates: info.rates,
      currencies: SUPPORTED_CURRENCIES,
      cachedAt: info.cachedAt ? new Date(info.cachedAt).toISOString() : null,
      isStale: info.isStale,
      isFallback: info.isFallback,
    });
  } catch (error) {
    console.error("Exchange rates error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST: Force refresh exchange rates (admin only)
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    if (session.role !== "ADMIN") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const result = await refreshExchangeRates();

    return NextResponse.json({
      rates: result.rates,
      source: result.source,
      updatedAt: result.updatedAt ? new Date(result.updatedAt).toISOString() : null,
    });
  } catch (error) {
    console.error("Exchange rates refresh error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
