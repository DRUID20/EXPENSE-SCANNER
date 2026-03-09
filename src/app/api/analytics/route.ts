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
    const months = parseInt(searchParams.get("months") || "12");

    const where: Record<string, unknown> =
      session.role === "EMPLOYEE" ? { userId: session.userId } : {};

    // Monthly spending for the last N months
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);

    const allExpenses = await prisma.expense.findMany({
      where: {
        ...where,
        date: { gte: startDate },
        status: { in: ["APPROVED", "PENDING"] },
      },
      select: {
        id: true,
        amount: true,
        currency: true,
        category: true,
        date: true,
        status: true,
        vendor: true,
        userId: true,
        user: {
          select: { id: true, firstName: true, lastName: true, email: true, role: true },
        },
      },
      orderBy: { date: "asc" },
    });

    // Build monthly data
    const monthlyMap = new Map<string, { month: string; amount: number; count: number; approved: number; pending: number }>();
    for (let i = 0; i < months; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - months + 1 + i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleString("en-US", { month: "short", year: "2-digit" });
      monthlyMap.set(key, { month: label, amount: 0, count: 0, approved: 0, pending: 0 });
    }

    for (const exp of allExpenses) {
      const d = new Date(exp.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const entry = monthlyMap.get(key);
      if (entry) {
        entry.amount += exp.amount;
        entry.count += 1;
        if (exp.status === "APPROVED") entry.approved += exp.amount;
        if (exp.status === "PENDING") entry.pending += exp.amount;
      }
    }
    const monthlySpending = Array.from(monthlyMap.values());

    // Category breakdown (all time, including all statuses for comprehensive view)
    const categoryData = await prisma.expense.groupBy({
      by: ["category"],
      where,
      _sum: { amount: true },
      _count: true,
      orderBy: { _sum: { amount: "desc" } },
    });

    const categoryBreakdown = categoryData.map((c) => ({
      category: c.category,
      amount: c._sum.amount || 0,
      count: c._count,
    }));

    // Status distribution
    const statusData = await prisma.expense.groupBy({
      by: ["status"],
      where,
      _sum: { amount: true },
      _count: true,
    });

    const statusBreakdown = statusData.map((s) => ({
      status: s.status,
      amount: s._sum.amount || 0,
      count: s._count,
    }));

    // Top vendors
    const vendorData = await prisma.expense.groupBy({
      by: ["vendor"],
      where: { ...where, vendor: { not: null } },
      _sum: { amount: true },
      _count: true,
      orderBy: { _sum: { amount: "desc" } },
      take: 10,
    });

    const topVendors = vendorData
      .filter((v) => v.vendor)
      .map((v) => ({
        vendor: v.vendor!,
        amount: v._sum.amount || 0,
        count: v._count,
      }));

    // Employee spending (admin/manager only)
    let employeeSpending: Array<{
      id: string;
      name: string;
      email: string;
      amount: number;
      count: number;
    }> = [];

    if (session.role === "ADMIN" || session.role === "MANAGER") {
      const userData = await prisma.expense.groupBy({
        by: ["userId"],
        _sum: { amount: true },
        _count: true,
        orderBy: { _sum: { amount: "desc" } },
        take: 20,
      });

      const userIds = userData.map((u) => u.userId);
      const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, firstName: true, lastName: true, email: true },
      });

      const userMap = new Map(users.map((u) => [u.id, u]));
      employeeSpending = userData.map((u) => {
        const usr = userMap.get(u.userId);
        return {
          id: u.userId,
          name: usr ? `${usr.firstName} ${usr.lastName}` : "Unknown",
          email: usr?.email || "",
          amount: u._sum.amount || 0,
          count: u._count,
        };
      });
    }

    // Summary stats
    const totalAll = await prisma.expense.aggregate({
      where,
      _sum: { amount: true },
      _count: true,
      _avg: { amount: true },
    });

    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const [thisMonthTotal, lastMonthTotal] = await Promise.all([
      prisma.expense.aggregate({
        where: { ...where, date: { gte: thisMonth } },
        _sum: { amount: true },
      }),
      prisma.expense.aggregate({
        where: { ...where, date: { gte: lastMonth, lte: lastMonthEnd } },
        _sum: { amount: true },
      }),
    ]);

    const thisMonthAmount = thisMonthTotal._sum.amount || 0;
    const lastMonthAmount = lastMonthTotal._sum.amount || 0;
    const monthOverMonth =
      lastMonthAmount > 0
        ? ((thisMonthAmount - lastMonthAmount) / lastMonthAmount) * 100
        : 0;

    return NextResponse.json({
      summary: {
        totalAmount: totalAll._sum.amount || 0,
        totalCount: totalAll._count || 0,
        averageAmount: totalAll._avg.amount || 0,
        thisMonthAmount,
        lastMonthAmount,
        monthOverMonth: Math.round(monthOverMonth * 10) / 10,
      },
      monthlySpending,
      categoryBreakdown,
      statusBreakdown,
      topVendors,
      employeeSpending,
    });
  } catch (error) {
    console.error("Analytics error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
