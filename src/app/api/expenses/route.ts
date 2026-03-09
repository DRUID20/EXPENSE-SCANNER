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
    const sortOrder = searchParams.get("sortOrder") || "desc";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const where: Record<string, unknown> = {};

    // Employees see only their own expenses; Admins/Managers see all
    if (session.role === "EMPLOYEE") {
      where.userId = session.userId;
    }

    if (status && status !== "ALL") {
      where.status = status;
    }

    if (category && category !== "ALL") {
      where.category = category;
    }

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { vendor: { contains: search } },
        { description: { contains: search } },
      ];
    }

    const [expenses, total] = await Promise.all([
      prisma.expense.findMany({
        where,
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true, role: true },
          },
        },
        orderBy: { [["title", "amount", "date", "status", "category", "createdAt"].includes(sortBy) ? sortBy : "createdAt"]: sortOrder === "asc" ? "asc" : "desc" },
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
        currency: currency || "USD",
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

    return NextResponse.json({ expense }, { status: 201 });
  } catch (error) {
    console.error("Create expense error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
