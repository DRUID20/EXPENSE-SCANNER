import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Resend } from "resend";
import { convertToUGX } from "@/lib/currency";

// Called by Vercel Cron — weekly digest (every Monday 8am)
// vercel.json: { "crons": [{ "path": "/api/cron/digest", "schedule": "0 8 * * 1" }] }
export async function GET(req: NextRequest) {
  // Verify cron secret to prevent unauthorized calls
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: "Email not configured" }, { status: 500 });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const FROM_EMAIL = process.env.EMAIL_FROM || "Gasco ExpenseTracker <noreply@gasco.ug>";
  const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "Gasco Energy ExpenseTracker";
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  try {
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);

    // Get all active admins
    const admins = await prisma.user.findMany({
      where: { role: "ADMIN", isActive: true },
      select: { id: true, email: true, firstName: true },
    });

    // Get weekly stats
    const [pendingCount, weekExpenses, approvedThisWeek, rejectedThisWeek] = await Promise.all([
      prisma.expense.count({ where: { status: "PENDING" } }),
      prisma.expense.findMany({
        where: { createdAt: { gte: weekAgo } },
        select: { amount: true, currency: true, amountUGX: true, status: true, category: true },
      }),
      prisma.expense.count({ where: { status: "APPROVED", approvedAt: { gte: weekAgo } } }),
      prisma.expense.count({ where: { status: "REJECTED", approvedAt: { gte: weekAgo } } }),
    ]);

    const totalSubmitted = weekExpenses.length;
    const totalSpent = weekExpenses
      .filter(e => e.status === "APPROVED")
      .reduce((sum, e) => sum + (e.amountUGX ?? convertToUGX(e.amount, e.currency)), 0);

    // Category breakdown
    const categoryMap = new Map<string, number>();
    for (const e of weekExpenses) {
      const amt = e.amountUGX ?? convertToUGX(e.amount, e.currency);
      categoryMap.set(e.category, (categoryMap.get(e.category) || 0) + amt);
    }
    const topCategories = Array.from(categoryMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const formatAmt = (amount: number) =>
      new Intl.NumberFormat("en-US", { style: "currency", currency: "UGX", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);

    const categoryRows = topCategories.map(([cat, amt]) =>
      `<tr><td style="padding:8px 12px;font-size:13px;color:#334155;">${cat}</td><td style="padding:8px 12px;font-size:13px;color:#334155;text-align:right;font-weight:600;">${formatAmt(amt)}</td></tr>`
    ).join("");

    // Send to each admin
    let sent = 0;
    for (const admin of admins) {
      try {
        await resend.emails.send({
          from: FROM_EMAIL,
          to: admin.email,
          subject: `${APP_NAME} — Weekly Expense Digest`,
          html: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:520px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#03D47C,#00C271);padding:28px 24px;text-align:center;">
      <h1 style="color:#fff;font-size:18px;margin:0;">${APP_NAME}</h1>
      <p style="color:rgba(255,255,255,0.85);font-size:13px;margin:6px 0 0;">Weekly Expense Digest</p>
    </div>

    <div style="padding:28px 24px;">
      <p style="color:#002E22;font-size:15px;margin:0 0 20px;">Hi ${admin.firstName},</p>

      <!-- Stats Grid -->
      <div style="display:flex;gap:12px;margin-bottom:24px;">
        <div style="flex:1;background:#fef2f2;border-radius:10px;padding:14px;text-align:center;">
          <p style="margin:0;font-size:24px;font-weight:700;color:#dc2626;">${pendingCount}</p>
          <p style="margin:4px 0 0;font-size:11px;color:#64748b;text-transform:uppercase;font-weight:600;">Pending</p>
        </div>
        <div style="flex:1;background:#f0fdf4;border-radius:10px;padding:14px;text-align:center;">
          <p style="margin:0;font-size:24px;font-weight:700;color:#16a34a;">${approvedThisWeek}</p>
          <p style="margin:4px 0 0;font-size:11px;color:#64748b;text-transform:uppercase;font-weight:600;">Approved</p>
        </div>
        <div style="flex:1;background:#f8fafc;border-radius:10px;padding:14px;text-align:center;">
          <p style="margin:0;font-size:24px;font-weight:700;color:#334155;">${totalSubmitted}</p>
          <p style="margin:4px 0 0;font-size:11px;color:#64748b;text-transform:uppercase;font-weight:600;">Submitted</p>
        </div>
      </div>

      <!-- Total Spending -->
      <div style="background:#f0fdf4;border-radius:10px;padding:16px;margin-bottom:24px;border-left:4px solid #03D47C;">
        <p style="margin:0;font-size:11px;color:#64748b;text-transform:uppercase;font-weight:600;">Total Approved This Week</p>
        <p style="margin:6px 0 0;font-size:22px;font-weight:700;color:#002E22;">${formatAmt(totalSpent)}</p>
      </div>

      ${topCategories.length > 0 ? `
      <!-- Top Categories -->
      <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#334155;">Top Spending Categories</p>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
        <thead><tr style="border-bottom:2px solid #e2e8f0;">
          <th style="padding:8px 12px;text-align:left;font-size:11px;color:#64748b;text-transform:uppercase;">Category</th>
          <th style="padding:8px 12px;text-align:right;font-size:11px;color:#64748b;text-transform:uppercase;">Amount</th>
        </tr></thead>
        <tbody>${categoryRows}</tbody>
      </table>` : ""}

      ${pendingCount > 0 ? `
      <div style="text-align:center;margin:24px 0;">
        <a href="${APP_URL}/dashboard/approvals" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#03D47C,#00C271);color:#fff;text-decoration:none;border-radius:12px;font-weight:600;font-size:14px;">
          Review ${pendingCount} Pending Expense${pendingCount > 1 ? "s" : ""}
        </a>
      </div>` : ""}
    </div>

    <div style="padding:16px 24px;background:#fafafa;text-align:center;">
      <p style="color:#a1a1aa;font-size:11px;margin:0;">&copy; ${new Date().getFullYear()} ${APP_NAME}</p>
    </div>
  </div>
</body>
</html>`,
        });
        sent++;
      } catch (err) {
        console.error(`Digest email failed for ${admin.email}:`, err);
      }
    }

    return NextResponse.json({ success: true, sent, admins: admins.length });
  } catch (error) {
    console.error("Digest cron error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
