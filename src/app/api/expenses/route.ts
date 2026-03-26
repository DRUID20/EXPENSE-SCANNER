import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, buildExpenseWhere } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { existsSync } from "fs";
import { sendPushToUsers } from "@/lib/push";
import { convertToUGX, getExchangeRate } from "@/lib/currency";
import { formatCurrency } from "@/lib/utils";

const RECEIPTS_DIR = path.join(process.cwd(), "private", "receipts");

function sanitizeCategory(category: string): string {
  return category.replace(/[^a-zA-Z0-9&\s-]/g, "").replace(/\s+/g, "-").toLowerCase();
}

async function saveReceiptImage(base64Data: string, category: string, expenseId: string): Promise<string | null> {
  try {
    const matches = base64Data.match(/^data:image\/(jpeg|png|webp|gif);base64,(.+)$/);
    if (!matches) return null;

    const ext = matches[1] === "jpeg" ? "jpg" : matches[1];
    const buffer = Buffer.from(matches[2], "base64");
    const categoryDir = sanitizeCategory(category || "other");
    const dirPath = path.join(RECEIPTS_DIR, categoryDir);

    if (!existsSync(dirPath)) {
      await mkdir(dirPath, { recursive: true });
    }

    const filename = `${expenseId}.${ext}`;
    const filePath = path.join(dirPath, filename);
    await writeFile(filePath, buffer);

    return `/receipts/${categoryDir}/${filename}`;
  } catch (error) {
    console.error("Failed to save receipt image:", error);
    return null;
  }
}

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

    const where: Record<string, unknown> = buildExpenseWhere(session);
    const branchFilter = searchParams.get("branchId");

    if (session.role === "ADMIN" && branchFilter && branchFilter !== "ALL") {
      where.user = { branchId: branchFilter };
    }

    if (status && status !== "ALL") {
      where.status = status;
    }

    if (category && category !== "ALL") {
      where.category = { equals: category, mode: "insensitive" };
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
        select: {
          id: true,
          title: true,
          description: true,
          amount: true,
          currency: true,
          amountUGX: true,
          exchangeRate: true,
          category: true,
          vendor: true,
          date: true,
          status: true,
          receiptPath: true,
          notes: true,
          rejectionReason: true,
          approvedById: true,
          approvedAt: true,
          createdAt: true,
          updatedAt: true,
          userId: true,
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

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0 || !isFinite(parsedAmount)) {
      return NextResponse.json(
        { error: "Amount must be a positive number" },
        { status: 400 }
      );
    }

    // Fetch policies and user limit in parallel
    const [policies, currentUser] = await Promise.all([
      prisma.spendingPolicy.findMany({ where: { isActive: true } }),
      prisma.user.findUnique({
        where: { id: session.userId },
        select: { spendingLimit: true, branchId: true },
      }),
    ]);

    // Convert amount to UGX for policy comparison
    const expenseCurrency = currency || "UGX";
    const amountInUGX = convertToUGX(parsedAmount, expenseCurrency);
    const exchangeRate = getExchangeRate(expenseCurrency);

    // Spending policy enforcement (policies are always in UGX)
    for (const policy of policies) {
      const categoryMatch = !policy.category || policy.category.toLowerCase() === category?.toLowerCase();
      const roleMatch = !policy.role || policy.role === session.role;

      if (categoryMatch && roleMatch && amountInUGX > policy.maxAmount) {
        return NextResponse.json(
          {
            error: `Expense exceeds spending policy "${policy.name}". Maximum allowed: ${formatCurrency(policy.maxAmount)} for ${policy.category || "all categories"}.${expenseCurrency !== "UGX" ? ` (Your expense: ${formatCurrency(parsedAmount, expenseCurrency)} = ${formatCurrency(amountInUGX)})` : ""}`,
            policyViolation: true,
            policyName: policy.name,
            maxAmount: policy.maxAmount,
          },
          { status: 400 }
        );
      }
    }

    if (currentUser?.spendingLimit && amountInUGX > currentUser.spendingLimit) {
      return NextResponse.json(
        {
          error: `Expense exceeds your personal spending limit of ${formatCurrency(currentUser.spendingLimit)}.${expenseCurrency !== "UGX" ? ` (Your expense: ${formatCurrency(parsedAmount, expenseCurrency)} = ${formatCurrency(amountInUGX)})` : ""}`,
          policyViolation: true,
        },
        { status: 400 }
      );
    }

    // Duplicate expense detection — check within a 7-day window
    const expenseDate = new Date(date);
    const rangeStart = new Date(expenseDate);
    rangeStart.setDate(rangeStart.getDate() - 3);
    rangeStart.setHours(0, 0, 0, 0);
    const rangeEnd = new Date(expenseDate);
    rangeEnd.setDate(rangeEnd.getDate() + 3);
    rangeEnd.setHours(23, 59, 59, 999);

    const duplicateCheck: Record<string, unknown> = {
      userId: session.userId,
      amount: parsedAmount,
      date: { gte: rangeStart, lte: rangeEnd },
    };
    if (vendor) {
      duplicateCheck.vendor = { equals: vendor, mode: "insensitive" };
    }

    const duplicates = await prisma.expense.findMany({
      where: duplicateCheck,
      select: { id: true, title: true, amount: true, vendor: true, date: true },
      take: 1,
    });

    let duplicateWarning = null;
    if (duplicates.length > 0) {
      const dupDate = new Date(duplicates[0].date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
      duplicateWarning = {
        message: `Possible duplicate: "${duplicates[0].title}" with same amount${vendor ? " and vendor" : ""} on ${dupDate} already exists.`,
        existingId: duplicates[0].id,
      };
    }

    const expense = await prisma.expense.create({
      data: {
        title,
        description: description || null,
        amount: parsedAmount,
        currency: expenseCurrency,
        amountUGX: amountInUGX,
        exchangeRate: exchangeRate,
        category,
        vendor: vendor ? vendor.trim().replace(/\b\w/g, (c: string) => c.toUpperCase()) : null,
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

    // Save receipt image permanently if base64 data provided
    if (receiptUrl && receiptUrl.startsWith("data:image/")) {
      const savedPath = await saveReceiptImage(receiptUrl, category, expense.id);
      if (savedPath) {
        await prisma.expense.update({
          where: { id: expense.id },
          data: { receiptPath: savedPath },
        });
      }
    }

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

    // If submitted, notify admins
    if (status === "PENDING") {
      const admins = await prisma.user.findMany({
        where: {
          isActive: true,
          role: "ADMIN",
          id: { not: session.userId },
        },
        select: { id: true },
      });
      if (admins.length > 0) {
        const amountDisplay = expenseCurrency !== "UGX"
          ? `${formatCurrency(parsedAmount, expenseCurrency)} (${formatCurrency(amountInUGX)})`
          : formatCurrency(parsedAmount);

        await prisma.notification.createMany({
          data: admins.map((m) => ({
            type: "EXPENSE_SUBMITTED",
            title: "New Expense Submitted",
            message: `${session.firstName} ${session.lastName} submitted "${title}" for ${amountDisplay}`,
            userId: m.id,
            linkUrl: `/dashboard/expenses/${expense.id}`,
          })),
        });

        // Send push notifications to admins
        sendPushToUsers(
          admins.map((m) => m.id),
          {
            title: "New Expense Submitted",
            message: `${session.firstName} ${session.lastName} submitted "${title}" for ${amountDisplay}`,
            url: `/dashboard/expenses/${expense.id}`,
          }
        ).catch(() => {});
      }
    }

    return NextResponse.json({ expense, duplicateWarning }, { status: 201 });
  } catch (error) {
    console.error("Create expense error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
