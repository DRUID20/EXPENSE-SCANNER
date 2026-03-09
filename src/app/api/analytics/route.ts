import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") || "6months";

    const where = session.role === "EMPLOYEE" ? { userId: session.userId } : {};

    // Calculate date range
    const now = new Date();
    let startDate = new Date();
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

    // Parallel queries for analytics
    const [
      totalStats,
      categoryBreakdown,
      allExpensesInRange,
      statusCounts,
      topSpenders,
      recentActivity,
    ] = await Promise.all([
      // Total stats
      prisma.expense.aggregate({
        where: dateWhere,
        _sum: { amount: true },
        _avg: { amount: true },
        _count: true,
      }),
      // Category breakdown
      prisma.expense.groupBy({
        by: ["category"],
        where: dateWhere,
        _sum: { amount: true },
        _count: true,
        orderBy: { _sum: { amount: "desc" } },
      }),
      // All expenses in range for monthly aggregation
      prisma.expense.findMany({
        where: dateWhere,
        select: { amount: true, date: true, status: true, category: true },
        orderBy: { date: "asc" },
      }),
      // Status counts
      prisma.expense.groupBy({
        by: ["status"],
        where: dateWhere,
        _count: true,
        _sum: { amount: true },
      }),
      // Top spenders (admin/manager only)
      session.role !== "EMPLOYEE"
        ? prisma.expense.groupBy({
            by: ["userId"],
            where: dateWhere,
            _sum: { amount: true },
            _count: true,
            orderBy: { _sum: { amount: "desc" } },
            take: 10,
          })
        : Promise.resolve([]),
      // Recent activity
      prisma.expense.findMany({
        where: dateWhere,
        orderBy: { updatedAt: "desc" },
        take: 10,
        include: {
          user: { select: { firstName: true, lastName: true } },
        },
      }),
    ]);

    // Aggregate monthly data
    const monthlyData: Record<string, { month: string; amount: number; count: number; approved: number; rejected: number }> = {};
    allExpensesInRange.forEach((e) => {
      const d = new Date(e.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!monthlyData[key]) {
        monthlyData[key] = { month: key, amount: 0, count: 0, approved: 0, rejected: 0 };
      }
      monthlyData[key].amount += e.amount;
      monthlyData[key].count += 1;
      if (e.status === "APPROVED") monthlyData[key].approved += e.amount;
      if (e.status === "REJECTED") monthlyData[key].rejected += e.amount;
    });

    const monthlyTrend = Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month));

    // Resolve top spenders with user names
    let topSpendersWithNames: Array<{ userId: string; firstName: string; lastName: string; total: number; count: number }> = [];
    if (Array.isArray(topSpenders) && topSpenders.length > 0) {
      const userIds = topSpenders.map((s) => s.userId);
      const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, firstName: true, lastName: true },
      });
      const userMap = Object.fromEntries(users.map((u) => [u.id, u]));
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
