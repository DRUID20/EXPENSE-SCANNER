import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, buildExpenseWhere } from "@/lib/auth";

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
      totalStats,
      categoryBreakdown,
      allExpensesInRange,
      statusCounts,
      topSpenders,
      recentActivity,
      // Pre-fetch all users if we need top spenders (avoids sequential N+1)
      allSpenderUsers,
      vendorExpenses,
    ] = await Promise.all([
      prisma.expense.aggregate({
        where: dateWhere,
        _sum: { amount: true },
        _avg: { amount: true },
        _count: true,
      }),
      prisma.expense.groupBy({
        by: ["category"],
        where: dateWhere,
        _sum: { amount: true },
        _count: true,
        orderBy: { _sum: { amount: "desc" } },
      }),
      // Fetch only needed fields for monthly aggregation
      prisma.expense.findMany({
        where: dateWhere,
        select: { amount: true, date: true, status: true },
        orderBy: { date: "asc" },
      }),
      prisma.expense.groupBy({
        by: ["status"],
        where: dateWhere,
        _count: true,
        _sum: { amount: true },
      }),
      needTopSpenders
        ? prisma.expense.groupBy({
            by: ["userId"],
            where: dateWhere,
            _sum: { amount: true },
            _count: true,
            orderBy: { _sum: { amount: "desc" } },
            take: 10,
          })
        : Promise.resolve([]),
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
        select: { vendor: true, amount: true },
      }),
    ]);

    // Aggregate monthly data in-memory (lightweight - just amount/status/date)
    const monthlyData: Record<string, { month: string; amount: number; count: number; approved: number; rejected: number }> = {};
    for (const e of allExpensesInRange) {
      const d = new Date(e.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!monthlyData[key]) {
        monthlyData[key] = { month: key, amount: 0, count: 0, approved: 0, rejected: 0 };
      }
      monthlyData[key].amount += e.amount;
      monthlyData[key].count += 1;
      if (e.status === "APPROVED") monthlyData[key].approved += e.amount;
      if (e.status === "REJECTED") monthlyData[key].rejected += e.amount;
    }

    const monthlyTrend = Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month));

    // Aggregate vendor spending in-memory
    const vendorMap: Record<string, { vendor: string; total: number; count: number }> = {};
    for (const e of vendorExpenses) {
      const v = (e.vendor || "").trim();
      if (!v) continue;
      if (!vendorMap[v]) vendorMap[v] = { vendor: v, total: 0, count: 0 };
      vendorMap[v].total += e.amount;
      vendorMap[v].count += 1;
    }
    const vendorBreakdown = Object.values(vendorMap)
      .sort((a, b) => b.total - a.total)
      .map((v) => ({ ...v, avgAmount: v.count > 0 ? v.total / v.count : 0 }));

    // Resolve top spenders with pre-fetched user names
    let topSpendersWithNames: Array<{ userId: string; firstName: string; lastName: string; total: number; count: number }> = [];
    if (Array.isArray(topSpenders) && topSpenders.length > 0) {
      const userMap = Object.fromEntries(allSpenderUsers.map((u) => [u.id, u]));
      topSpendersWithNames = topSpenders.map((s) => ({
        userId: s.userId,
        firstName: userMap[s.userId]?.firstName || "Unknown",
        lastName: userMap[s.userId]?.lastName || "",
        total: s._sum.amount || 0,
        count: s._count,
      }));
    }

    return NextResponse.json({
      summary: {
        totalAmount: totalStats._sum.amount || 0,
        avgAmount: totalStats._avg.amount || 0,
        totalCount: totalStats._count,
      },
      categoryBreakdown: categoryBreakdown.map((c) => ({
        category: c.category,
        total: c._sum.amount || 0,
        count: c._count,
      })),
      monthlyTrend,
      statusBreakdown: statusCounts.map((s) => ({
        status: s.status,
        count: s._count,
        total: s._sum.amount || 0,
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
