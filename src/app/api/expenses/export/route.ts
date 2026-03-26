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
    const format = searchParams.get("format") || "csv";
    const status = searchParams.get("status");
    const category = searchParams.get("category");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const where: Record<string, unknown> = {};

    if (session.role === "EMPLOYEE") {
      where.userId = session.userId;
    }

    if (status && status !== "ALL") {
      where.status = status;
    }
    if (category && category !== "ALL") {
      where.category = { equals: category, mode: "insensitive" };
    }
    if (from || to) {
      where.date = {};
      if (from) (where.date as Record<string, unknown>).gte = new Date(from);
      if (to) (where.date as Record<string, unknown>).lte = new Date(to);
    }

    const expenses = await prisma.expense.findMany({
      where,
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
        approvedBy: { select: { firstName: true, lastName: true } },
      },
      orderBy: { date: "desc" },
      take: 5000, // Safety limit
    });

    if (format === "csv") {
      const headers = [
        "ID",
        "Title",
        "Description",
        "Amount",
        "Currency",
        "Category",
        "Vendor",
        "Date",
        "Status",
        "Submitted By",
        "Email",
        "Approved By",
        "Approved At",
        "Rejection Reason",
        "Notes",
        "Created At",
      ];

      const rows = expenses.map((e) => [
        e.id,
        escCsv(e.title),
        escCsv(e.description || ""),
        e.amount.toFixed(2),
        e.currency,
        escCsv(e.category),
        escCsv(e.vendor || ""),
        new Date(e.date).toISOString().split("T")[0],
        e.status,
        `${e.user.firstName} ${e.user.lastName}`,
        e.user.email,
        e.approvedBy ? `${e.approvedBy.firstName} ${e.approvedBy.lastName}` : "",
        e.approvedAt ? new Date(e.approvedAt).toISOString().split("T")[0] : "",
        escCsv(e.rejectionReason || ""),
        escCsv(e.notes || ""),
        new Date(e.createdAt).toISOString().split("T")[0],
      ]);

      const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="expenses-${new Date().toISOString().split("T")[0]}.csv"`,
        },
      });
    }

    // JSON export fallback
    return NextResponse.json({ expenses });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function escCsv(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
