import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, buildExpenseWhere } from "@/lib/auth";
import { convertToUGX } from "@/lib/currency";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") || "6months";

    const where = buildExpenseWhere(session);

    // Calculate date range
    const now = new Date();
    const startDate = new Date();
    switch (period) {
      case "1month":
        startDate.setMonth(now.getMonth() - 1);
        break;
      case "3months":
        startDate.setMonth(now.getMonth() - 3);
        break;
      case "6months":
        startDate.setMonth(now.getMonth() - 6);
        break;
      case "1year":
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setMonth(now.getMonth() - 6);
    }

    const dateWhere = { ...where, date: { gte: startDate } };

    // Determine if we need top spenders data
    const needTopSpenders = session.role !== "EMPLOYEE";

    // Parallel queries for analytics - all in one batch including user names
    const [
      categoryBreakdown,
      allExpensesInRange,
      recentActivity,
      allSpenderUsers,
      vendorExpenses,
    ] = await Promise.all([
      // Fetch expenses with currency for proper category breakdown
      prisma.expense.findMany({
        where: dateWhere,
        select: { category: true, amount: true, currency: true, amountUGX: true },
      }),
      // Fetch fields for monthly aggregation, totals, status breakdown, and top spenders
      prisma.expense.findMany({
        where: dateWhere,
        select: { amount: true, currency: true, amountUGX: true, date: true, status: true, userId: true },
        orderBy: { date: "asc" },
      }),
      prisma.expense.findMany({
        where: dateWhere,
        orderBy: { updatedAt: "desc" },
        take: 10,
        include: {
          user: { select: { firstName: true, lastName: true } },
        },
      }),
      // Pre-fetch user names in parallel (not after) - avoids sequential roundtrip
      needTopSpenders
        ? prisma.user.findMany({
            where: { isActive: true },
            select: { id: true, firstName: true, lastName: true },
          })
        : Promise.resolve([]),
      // Vendor spending aggregation
      prisma.expense.findMany({
        where: { ...dateWhere, vendor: { not: null } },
        select: { vendor: true, amount: true, currency: true, amountUGX: true },
      }),
    ]);

    // Aggregate monthly data in-memory using UGX amounts
    const monthlyData: Record<string, { month: string; amount: number; count: number; approved: number; rejected: number }> = {};
    for (const e of allExpensesInRange) {
      const ugx = e.amountUGX ?? convertToUGX(e.amount, e.currency);
      const d = new Date(e.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!monthlyData[key]) {
        monthlyData[key] = { month: key, amount: 0, count: 0, approved: 0, rejected: 0 };
      }
      monthlyData[key].amount += ugx;
      monthlyData[key].count += 1;
      if (e.status === "APPROVED") monthlyData[key].approved += ugx;
      if (e.status === "REJECTED") monthlyData[key].rejected += ugx;
    }

    const monthlyTrend = Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month));

    // Aggregate vendor spending in-memory using UGX amounts
    const vendorMap: Record<string, { vendor: string; total: number; count: number }> = {};
    for (const e of vendorExpenses) {
      const v = (e.vendor || "").trim();
      if (!v) continue;
      const ugx = e.amountUGX ?? convertToUGX(e.amount, e.currency);
      if (!vendorMap[v]) vendorMap[v] = { vendor: v, total: 0, count: 0 };
      vendorMap[v].total += ugx;
      vendorMap[v].count += 1;
    }
    const vendorBreakdown = Object.values(vendorMap)
      .sort((a, b) => b.total - a.total)
      .map((v) => ({ ...v, avgAmount: v.count > 0 ? v.total / v.count : 0 }));

    // Resolve top spenders by aggregating from allExpensesInRange for accurate multi-currency totals
    let topSpendersWithNames: Array<{ userId: string; firstName: string; lastName: string; total: number; count: number }> = [];
    if (needTopSpenders && allExpensesInRange.length > 0) {
      const userMap = Object.fromEntries(allSpenderUsers.map((u) => [u.id, u]));
      const spenderMap: Record<string, { total: number; count: number }> = {};
      for (const e of allExpensesInRange) {
        const ugx = e.amountUGX ?? convertToUGX(e.amount, e.currency);
        if (!spenderMap[e.userId]) spenderMap[e.userId] = { total: 0, count: 0 };
        spenderMap[e.userId].total += ugx;
        spenderMap[e.userId].count += 1;
      }
      topSpendersWithNames = Object.entries(spenderMap)
        .sort(([, a], [, b]) => b.total - a.total)
        .slice(0, 10)
        .map(([userId, data]) => ({
          userId,
          firstName: userMap[userId]?.firstName || "Unknown",
          lastName: userMap[userId]?.lastName || "",
          total: data.total,
          count: data.count,
        }));
    }

    // Aggregate category breakdown in UGX from fetched expenses
    const categoryMap: Record<string, { total: number; count: number }> = {};
    for (const e of categoryBreakdown) {
      const ugx = e.amountUGX ?? convertToUGX(e.amount, e.currency);
      if (!categoryMap[e.category]) categoryMap[e.category] = { total: 0, count: 0 };
      categoryMap[e.category].total += ugx;
      categoryMap[e.category].count += 1;
    }
    const categoryBreakdownUGX = Object.entries(categoryMap)
      .map(([category, data]) => ({ category, total: data.total, count: data.count }))
      .sort((a, b) => b.total - a.total);

    // Compute total and average from allExpensesInRange for accurate multi-currency handling
    const totalAmount = allExpensesInRange.reduce(
      (sum, e) => sum + (e.amountUGX ?? convertToUGX(e.amount, e.currency)),
      0
    );
    const totalCount = allExpensesInRange.length;
    const avgAmount = totalCount > 0 ? totalAmount / totalCount : 0;

    // Compute status breakdown from allExpensesInRange for accurate totals
    const statusMap: Record<string, { count: number; total: number }> = {};
    for (const e of allExpensesInRange) {
      const ugx = e.amountUGX ?? convertToUGX(e.amount, e.currency);
      if (!statusMap[e.status]) statusMap[e.status] = { count: 0, total: 0 };
      statusMap[e.status].count += 1;
      statusMap[e.status].total += ugx;
    }

    return NextResponse.json({
      summary: {
        totalAmount,
        avgAmount,
        totalCount,
      },
      categoryBreakdown: categoryBreakdownUGX,
      monthlyTrend,
      statusBreakdown: Object.entries(statusMap).map(([status, data]) => ({
        status,
        count: data.count,
        total: data.total,
      })),
      topSpenders: topSpendersWithNames,
      vendorBreakdown,
      recentActivity: recentActivity.map((e) => ({
        id: e.id,
        title: e.title,
        amount: e.amount,
        currency: e.currency,
        status: e.status,
        date: e.date,
        category: e.category,
        user: e.user,
      })),
    });
  } catch (error) {
    console.error("Analytics error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
