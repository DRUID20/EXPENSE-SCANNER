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

    const where: Record<string, unknown> = {};
    if (session.role === "EMPLOYEE") {
      where.userId = session.userId;
    }
    if (status && status !== "ALL") where.status = status;
    if (category && category !== "ALL") where.category = category;

    const expenses = await prisma.expense.findMany({
      where,
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
        approvedBy: { select: { firstName: true, lastName: true } },
      },
      orderBy: { date: "desc" },
    });

    if (format === "csv") {
      const headers = [
        "ID", "Title", "Description", "Amount", "Currency", "Category",
        "Vendor", "Date", "Status", "Submitted By", "Email",
        "Approved By", "Approved At", "Notes", "Created At"
      ];

      const rows = expenses.map((e) => [
        e.id,
        `"${(e.title || "").replace(/"/g, '""')}"`,
        `"${(e.description || "").replace(/"/g, '""')}"`,
        e.amount.toFixed(2),
        e.currency,
        e.category,
        `"${(e.vendor || "").replace(/"/g, '""')}"`,
        new Date(e.date).toISOString().split("T")[0],
        e.status,
        `${e.user.firstName} ${e.user.lastName}`,
        e.user.email,
        e.approvedBy ? `${e.approvedBy.firstName} ${e.approvedBy.lastName}` : "",
        e.approvedAt ? new Date(e.approvedAt).toISOString().split("T")[0] : "",
        `"${(e.notes || "").replace(/"/g, '""')}"`,
        new Date(e.createdAt).toISOString().split("T")[0],
      ]);

      const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="expenses_${new Date().toISOString().split("T")[0]}.csv"`,
        },
      });
    }

    // JSON export
    return NextResponse.json({ expenses });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
