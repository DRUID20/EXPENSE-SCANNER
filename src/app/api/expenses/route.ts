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
    const status = searchParams.get("status");
    const category = searchParams.get("category");
    const search = searchParams.get("search");
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = (searchParams.get("sortOrder") || "desc") as "asc" | "desc";
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const where: Record<string, unknown> = {};
    const branchFilter = searchParams.get("branchId");

    if (session.role === "EMPLOYEE") {
      where.userId = session.userId;
    } else if (session.role === "MANAGER") {
      // Managers see only their branch expenses
      const currentUser = await prisma.user.findUnique({ where: { id: session.userId }, select: { branchId: true } });
      if (currentUser?.branchId) {
        where.user = { branchId: currentUser.branchId };
      }
    }
    // ADMIN (Super User) sees all — optionally filter by branch
    if (session.role === "ADMIN" && branchFilter && branchFilter !== "ALL") {
      where.user = { branchId: branchFilter };
    }

    if (status && status !== "ALL") {
      where.status = status;
    }

    if (category && category !== "ALL") {
      where.category = category;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { vendor: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) (where.date as Record<string, unknown>).gte = new Date(dateFrom);
      if (dateTo) (where.date as Record<string, unknown>).lte = new Date(dateTo);
    }

    const validSortFields = ["createdAt", "amount", "date", "title", "status"];
    const orderField = validSortFields.includes(sortBy) ? sortBy : "createdAt";

    const [expenses, total] = await Promise.all([
      prisma.expense.findMany({
        where,
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true, role: true },
          },
        },
        orderBy: { [orderField]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.expense.count({ where }),
    ]);

    return NextResponse.json({
      expenses,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get expenses error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await req.json();
    const { title, description, amount, currency, category, vendor, date, receiptUrl, receiptData, notes, status } = body;

    if (!title || !amount || !category || !date) {
      return NextResponse.json(
        { error: "Title, amount, category, and date are required" },
        { status: 400 }
      );
    }

    const expense = await prisma.expense.create({
      data: {
        title,
        description: description || null,
        amount: parseFloat(amount),
        currency: currency || "UGX",
        category,
        vendor: vendor || null,
        date: new Date(date),
        receiptUrl: receiptUrl || null,
        receiptData: receiptData ? JSON.stringify(receiptData) : null,
        notes: notes || null,
        status: status || "DRAFT",
        userId: session.userId,
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: "CREATE",
        entity: "EXPENSE",
        entityId: expense.id,
        details: JSON.stringify({ title, amount, category }),
        userId: session.userId,
      },
    });

    // If submitted, notify managers
    if (status === "PENDING") {
      // Notify managers in the same branch + all admins (super users)
      const currentUser = await prisma.user.findUnique({ where: { id: session.userId }, select: { branchId: true } });
      const managers = await prisma.user.findMany({
        where: {
          isActive: true,
          id: { not: session.userId },
          OR: [
            { role: "ADMIN" },
            { role: "MANAGER", branchId: currentUser?.branchId },
          ],
        },
        select: { id: true },
      });
      if (managers.length > 0) {
        await prisma.notification.createMany({
          data: managers.map((m) => ({
            type: "EXPENSE_SUBMITTED",
            title: "New Expense Submitted",
            message: `${session.firstName} ${session.lastName} submitted "${title}" for UGX ${parseFloat(amount).toLocaleString()}`,
            userId: m.id,
            linkUrl: `/dashboard/expenses/${expense.id}`,
          })),
        });
      }
    }

    return NextResponse.json({ expense }, { status: 201 });
  } catch (error) {
    console.error("Create expense error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
