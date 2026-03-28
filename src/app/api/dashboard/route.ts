import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, buildExpenseWhere } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const where = buildExpenseWhere(session);

    const period = req.nextUrl.searchParams.get("period") || "all";

    let dateFilter: { gte?: Date; lte?: Date } | undefined;
    const now = new Date();
    switch (period) {
      case "week": {
        const start = new Date(now);
        start.setDate(now.getDate() - now.getDay());
        start.setHours(0, 0, 0, 0);
        dateFilter = { gte: start };
        break;
      }
      case "month": {
        dateFilter = { gte: new Date(now.getFullYear(), now.getMonth(), 1) };
        break;
      }
      case "quarter": {
        const qMonth = Math.floor(now.getMonth() / 3) * 3;
        dateFilter = { gte: new Date(now.getFullYear(), qMonth, 1) };
        break;
      }
      case "year": {
        dateFilter = { gte: new Date(now.getFullYear(), 0, 1) };
        break;
      }
      // "all" = no filter
    }

    const filteredWhere = dateFilter ? { ...where, date: dateFilter } : where;

    const [
      pendingCount,
      approvedCount,
      rejectedCount,
      draftCount,
      recentExpenses,
      categoryGrouped,
      totalAggregate,
      pendingApprovals,
      thisMonthAggregate,
    ] = await Promise.all([
      prisma.expense.count({ where: { ...filteredWhere, status: "PENDING" } }),
      prisma.expense.count({ where: { ...filteredWhere, status: "APPROVED" } }),
      prisma.expense.count({ where: { ...filteredWhere, status: "REJECTED" } }),
      prisma.expense.count({ where: { ...filteredWhere, status: "DRAFT" } }),
      prisma.expense.findMany({
        where: filteredWhere,
        orderBy: { createdAt: "desc" },
        take: 5,
        include: {
          user: {
            select: { firstName: true, lastName: true },
          },
        },
      }),
      // Use groupBy for category aggregation instead of fetching all expenses
      prisma.expense.groupBy({
        by: ["category"],
        where: filteredWhere,
        _sum: { amountUGX: true },
        orderBy: { _sum: { amountUGX: "desc" } },
        take: 6,
      }),
      // Use aggregate for total amount instead of fetching all expenses
      prisma.expense.aggregate({
        where: filteredWhere,
        _sum: { amountUGX: true },
      }),
      session.role !== "EMPLOYEE"
        ? prisma.expense.count({ where: { status: "PENDING" } })
        : Promise.resolve(0),
      // Use aggregate for this month total
      prisma.expense.aggregate({
        where: {
          ...filteredWhere,
          date: {
            gte: new Date(now.getFullYear(), now.getMonth(), 1),
          },
        },
        _sum: { amountUGX: true },
      }),
    ]);

    const categoryTotals = categoryGrouped.map((g) => ({
      category: g.category,
      total: g._sum.amountUGX ?? 0,
    }));

    const thisMonthTotal = thisMonthAggregate._sum.amountUGX ?? 0;
    const totalAmount = totalAggregate._sum.amountUGX ?? 0;

    return NextResponse.json({
      stats: {
        totalAmount,
        pendingCount,
        approvedCount,
        rejectedCount,
        draftCount,
        thisMonthTotal,
      },
      pendingApprovals,
      recentExpenses,
      categoryTotals,
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
