import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const where = session.role === "EMPLOYEE" ? { userId: session.userId } : {};

    const [totalExpenses, pendingCount, approvedCount, rejectedCount, draftCount, recentExpenses, categoryTotals, pendingApprovals, thisMonthTotal] =
      await Promise.all([
        prisma.expense.aggregate({
          where,
          _sum: { amount: true },
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
        prisma.expense.groupBy({
          by: ["category"],
          where,
          _sum: { amount: true },
          orderBy: { _sum: { amount: "desc" } },
          take: 6,
        }),
        session.role !== "EMPLOYEE"
          ? prisma.expense.count({ where: { status: "PENDING" } })
          : Promise.resolve(0),
        prisma.expense.aggregate({
          where: {
            ...where,
            date: {
              gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            },
          },
          _sum: { amount: true },
        }),
      ]);

    return NextResponse.json({
      stats: {
        totalAmount: totalExpenses._sum.amount || 0,
        pendingCount,
        approvedCount,
        rejectedCount,
        draftCount,
        thisMonthTotal: thisMonthTotal._sum.amount || 0,
      },
      pendingApprovals,
      recentExpenses,
      categoryTotals: categoryTotals.map((c) => ({
        category: c.category,
        total: c._sum.amount || 0,
      })),
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
