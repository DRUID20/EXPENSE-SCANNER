import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { convertToUGX } from "@/lib/currency";

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

    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");

    const where: Record<string, unknown> = {};
    if (session.role === "EMPLOYEE") {
      where.userId = session.userId;
    }
    if (status && status !== "ALL") where.status = status;
    if (category && category !== "ALL") where.category = category;
    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) (where.date as Record<string, unknown>).gte = new Date(dateFrom);
      if (dateTo) (where.date as Record<string, unknown>).lte = new Date(dateTo);
    }

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
        "ID", "Title", "Description", "Amount", "Currency", "Amount (UGX)", "Exchange Rate",
        "Category", "Vendor", "Date", "Status", "Submitted By", "Email",
        "Approved By", "Approved At", "Notes", "Created At"
      ];

      const rows = expenses.map((e) => [
        e.id,
        `"${(e.title || "").replace(/"/g, '""')}"`,
        `"${(e.description || "").replace(/"/g, '""')}"`,
        e.amount.toFixed(2),
        e.currency,
        (e.amountUGX ?? convertToUGX(e.amount, e.currency)).toFixed(0),
        (e.exchangeRate ?? 1).toString(),
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

    if (format === "pdf") {
      const totalAmount = expenses.reduce((sum, e) => sum + (e.amountUGX ?? convertToUGX(e.amount, e.currency)), 0);
      const approvedTotal = expenses.filter(e => e.status === "APPROVED").reduce((sum, e) => sum + (e.amountUGX ?? convertToUGX(e.amount, e.currency)), 0);
      const pendingTotal = expenses.filter(e => e.status === "PENDING").reduce((sum, e) => sum + (e.amountUGX ?? convertToUGX(e.amount, e.currency)), 0);

      const formatAmt = (amount: number, curr = "UGX") => {
        const noDecimal = ["UGX", "KES", "TZS"];
        const digits = noDecimal.includes(curr) ? 0 : 2;
        return new Intl.NumberFormat("en-US", { style: "currency", currency: curr, minimumFractionDigits: digits, maximumFractionDigits: digits }).format(amount);
      };

      const statusBadge = (s: string) => {
        const colors: Record<string, string> = {
          APPROVED: "color:#16a34a;background:#f0fdf4;",
          REJECTED: "color:#dc2626;background:#fef2f2;",
          PENDING: "color:#d97706;background:#fffbeb;",
          DRAFT: "color:#6b7280;background:#f3f4f6;",
        };
        return `<span style="padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;${colors[s] || colors.DRAFT}">${s}</span>`;
      };

      const filterLabel = [
        status && status !== "ALL" ? `Status: ${status}` : null,
        category && category !== "ALL" ? `Category: ${category}` : null,
        dateFrom ? `From: ${dateFrom}` : null,
        dateTo ? `To: ${dateTo}` : null,
      ].filter(Boolean).join(" | ") || "All expenses";

      const reportDate = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
      const appName = process.env.NEXT_PUBLIC_APP_NAME || "Gasco Energy ExpenseTracker";

      const tableRows = expenses.map((e, i) => `
        <tr style="background:${i % 2 === 0 ? "#fff" : "#fafafa"};">
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:12px;">${new Date(e.date).toISOString().split("T")[0]}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:12px;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(e.title)}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:12px;">${escapeHtml(e.category)}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:12px;">${escapeHtml(e.vendor || "—")}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:12px;">${e.user.firstName} ${e.user.lastName}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:12px;text-align:right;font-weight:600;">${formatAmt(e.amount, e.currency)}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:12px;text-align:center;">${statusBadge(e.status)}</td>
        </tr>`).join("");

      const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Expense Report — ${appName}</title>
  <style>
    @media print {
      body { margin: 0; }
      .no-print { display: none; }
      @page { margin: 15mm; size: A4 landscape; }
    }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1a1a1a; margin: 0; padding: 24px; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #f8fafc; padding: 10px 12px; text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; border-bottom: 2px solid #e2e8f0; }
    th:nth-child(6) { text-align: right; }
    th:nth-child(7) { text-align: center; }
  </style>
</head>
<body>
  <!-- Print button -->
  <div class="no-print" style="text-align:right;margin-bottom:16px;">
    <button onclick="window.print()" style="padding:10px 24px;background:#03D47C;color:white;border:none;border-radius:8px;font-weight:600;cursor:pointer;font-size:14px;">
      Save as PDF / Print
    </button>
  </div>

  <!-- Header -->
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;border-bottom:3px solid #03D47C;padding-bottom:16px;">
    <div>
      <h1 style="margin:0;font-size:22px;color:#002E22;">${appName}</h1>
      <h2 style="margin:4px 0 0;font-size:16px;color:#64748b;font-weight:500;">Expense Report</h2>
    </div>
    <div style="text-align:right;">
      <p style="margin:0;font-size:12px;color:#64748b;">Generated: ${reportDate}</p>
      <p style="margin:4px 0 0;font-size:12px;color:#64748b;">By: ${session.firstName} ${session.lastName}</p>
      <p style="margin:4px 0 0;font-size:11px;color:#94a3b8;">${filterLabel}</p>
    </div>
  </div>

  <!-- Summary Cards -->
  <div style="display:flex;gap:16px;margin-bottom:24px;">
    <div style="flex:1;background:#f0fdf4;border-radius:8px;padding:16px;border-left:4px solid #03D47C;">
      <p style="margin:0;font-size:11px;color:#64748b;text-transform:uppercase;font-weight:600;">Total Amount</p>
      <p style="margin:4px 0 0;font-size:20px;font-weight:700;color:#002E22;">${formatAmt(totalAmount)}</p>
    </div>
    <div style="flex:1;background:#f0fdf4;border-radius:8px;padding:16px;border-left:4px solid #16a34a;">
      <p style="margin:0;font-size:11px;color:#64748b;text-transform:uppercase;font-weight:600;">Approved</p>
      <p style="margin:4px 0 0;font-size:20px;font-weight:700;color:#16a34a;">${formatAmt(approvedTotal)}</p>
    </div>
    <div style="flex:1;background:#fffbeb;border-radius:8px;padding:16px;border-left:4px solid #d97706;">
      <p style="margin:0;font-size:11px;color:#64748b;text-transform:uppercase;font-weight:600;">Pending</p>
      <p style="margin:4px 0 0;font-size:20px;font-weight:700;color:#d97706;">${formatAmt(pendingTotal)}</p>
    </div>
    <div style="flex:1;background:#f8fafc;border-radius:8px;padding:16px;border-left:4px solid #64748b;">
      <p style="margin:0;font-size:11px;color:#64748b;text-transform:uppercase;font-weight:600;">Total Entries</p>
      <p style="margin:4px 0 0;font-size:20px;font-weight:700;color:#1a1a1a;">${expenses.length}</p>
    </div>
  </div>

  <!-- Expense Table -->
  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Title</th>
        <th>Category</th>
        <th>Vendor</th>
        <th>Submitted By</th>
        <th style="text-align:right;">Amount</th>
        <th style="text-align:center;">Status</th>
      </tr>
    </thead>
    <tbody>
      ${tableRows}
    </tbody>
    <tfoot>
      <tr style="background:#f8fafc;">
        <td colspan="5" style="padding:10px 12px;font-weight:700;font-size:13px;border-top:2px solid #e2e8f0;">Grand Total (UGX)</td>
        <td style="padding:10px 12px;font-weight:700;font-size:13px;text-align:right;border-top:2px solid #e2e8f0;">${formatAmt(totalAmount)}</td>
        <td style="border-top:2px solid #e2e8f0;"></td>
      </tr>
    </tfoot>
  </table>

  <!-- Footer -->
  <div style="margin-top:32px;padding-top:16px;border-top:1px solid #e5e7eb;text-align:center;">
    <p style="margin:0;font-size:11px;color:#94a3b8;">&copy; ${new Date().getFullYear()} ${appName}. This report was auto-generated.</p>
  </div>
</body>
</html>`;

      return new NextResponse(html, {
        headers: {
          "Content-Type": "text/html",
          "Content-Disposition": `inline; filename="expense-report_${new Date().toISOString().split("T")[0]}.html"`,
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

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
