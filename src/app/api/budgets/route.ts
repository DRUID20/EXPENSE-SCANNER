import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { convertToUGX } from "@/lib/currency";

function getPeriodRange(period: string): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);

  if (period === "MONTHLY") {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    end.setMonth(end.getMonth() + 1, 0);
    end.setHours(23, 59, 59, 999);
  } else if (period === "QUARTERLY") {
    const quarter = Math.floor(now.getMonth() / 3);
    start.setMonth(quarter * 3, 1);
    start.setHours(0, 0, 0, 0);
    end.setMonth(quarter * 3 + 3, 0);
    end.setHours(23, 59, 59, 999);
  } else {
    // YEARLY
    start.setMonth(0, 1);
    start.setHours(0, 0, 0, 0);
    end.setMonth(11, 31);
    end.setHours(23, 59, 59, 999);
  }

  return { start, end };
}

// GET — list budgets with spending progress
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const budgets = await prisma.budget.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
    });

    // Calculate spending for each budget
    const budgetsWithProgress = await Promise.all(
      budgets.map(async (budget) => {
        const { start, end } = getPeriodRange(budget.period);

        const where: Record<string, unknown> = {
          status: { in: ["APPROVED", "PENDING"] },
          date: { gte: start, lte: end },
        };

        if (budget.branchId) {
          where.user = { branchId: budget.branchId };
        }
        if (budget.category) {
          where.category = { equals: budget.category, mode: "insensitive" };
        }

        const expenses = await prisma.expense.findMany({
          where,
          select: { amount: true, currency: true, amountUGX: true },
        });

        const spent = expenses.reduce(
          (sum, e) => sum + (e.amountUGX ?? convertToUGX(e.amount, e.currency)),
          0
        );

        // Get branch name if applicable
        let branchName = null;
        if (budget.branchId) {
          const branch = await prisma.branch.findUnique({
            where: { id: budget.branchId },
            select: { name: true },
          });
          branchName = branch?.name || null;
        }

        return {
          ...budget,
          spent,
          remaining: Math.max(0, budget.amount - spent),
          percentage: Math.min(100, Math.round((spent / budget.amount) * 100)),
          periodStart: start,
          periodEnd: end,
          branchName,
        };
      })
    );

    return NextResponse.json({ budgets: budgetsWithProgress });
  } catch (error) {
    console.error("Get budgets error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST — create a new budget (admin only)
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { name, amount, period, branchId, category } = await req.json();

    if (!name || !amount || !period) {
      return NextResponse.json(
        { error: "Name, amount, and period are required" },
        { status: 400 }
      );
    }

    if (!["MONTHLY", "QUARTERLY", "YEARLY"].includes(period)) {
      return NextResponse.json({ error: "Invalid period" }, { status: 400 });
    }

    const budget = await prisma.budget.create({
      data: {
        name,
        amount: parseFloat(amount),
        period,
        branchId: branchId || null,
        category: category || null,
      },
    });

    return NextResponse.json({ budget }, { status: 201 });
  } catch (error) {
    console.error("Create budget error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE — remove a budget (admin only)
export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await req.json();
    await prisma.budget.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete budget error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
