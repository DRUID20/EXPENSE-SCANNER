import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, buildExpenseWhere } from "@/lib/auth";
import { convertToUGX } from "@/lib/currency";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const where = buildExpenseWhere(session);

    const [totalExpenses, pendingCount, approvedCount, rejectedCount, draftCount, recentExpenses, allExpenses, pendingApprovals, thisMonthExpenses] =
      await Promise.all([
        prisma.expense.aggregate({
          where,
          _sum: { amountUGX: true, amount: true },
        }),
        prisma.expense.count({ where: { ...where, status: "PENDING" } }),
        prisma.expense.count({ where: { ...where, status: "APPROVED" } }),
        prisma.expense.count({ where: { ...where, status: "REJECTED" } }),
        prisma.expense.count({ where: { ...where, status: "DRAFT" } }),
        prisma.expense.findMany({
          where,
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
          where,
          select: { category: true, amount: true, currency: true, amountUGX: true },
        }),
        session.role !== "EMPLOYEE"
          ? prisma.expense.count({ where: { status: "PENDING" } })
          : Promise.resolve(0),
        prisma.expense.findMany({
          where: {
            ...where,
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
