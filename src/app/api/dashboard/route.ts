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

    const [totalExpenses, pendingCount, approvedCount, rejectedCount, draftCount, recentExpenses, allExpenses, pendingApprovals, thisMonthExpenses] =
      await Promise.all([
        prisma.expense.aggregate({
          where: filteredWhere,
          _sum: { amountUGX: true, amount: true },
        }),
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
        // Fetch for category totals with currency info for proper conversion
        prisma.expense.findMany({
          where: filteredWhere,
          select: { category: true, amount: true, currency: true, amountUGX: true },
        }),
        session.role !== "EMPLOYEE"
          ? prisma.expense.count({ where: { status: "PENDING" } })
          : Promise.resolve(0),
        prisma.expense.findMany({
          where: {
            ...filteredWhere,
            date: {
              gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            },
          },
          select: { amount: true, currency: true, amountUGX: true },
        }),
      ]);

    // Aggregate category totals in UGX
    const categoryMap: Record<string, number> = {};
    for (const e of allExpenses) {
      const ugx = e.amountUGX ?? convertToUGX(e.amount, e.currency);
      categoryMap[e.category] = (categoryMap[e.category] || 0) + ugx;
    }
    const categoryTotals = Object.entries(categoryMap)
      .map(([category, total]) => ({ category, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);

    // This month total in UGX
    const thisMonthTotal = thisMonthExpenses.reduce(
      (sum, e) => sum + (e.amountUGX ?? convertToUGX(e.amount, e.currency)),
      0
    );

    // Total amount in UGX (use amountUGX sum if available, fallback to amount sum)
    const totalAmount = totalExpenses._sum.amountUGX ?? totalExpenses._sum.amount ?? 0;

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
