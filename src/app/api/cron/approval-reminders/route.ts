import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendPushToUsers } from "@/lib/push";

// Called by Vercel Cron every 3 hours
// Reminds admins about expenses pending for more than 6 hours
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);

    // Find expenses pending for over 6 hours
    const overdueExpenses = await prisma.expense.findMany({
      where: {
        status: "PENDING",
        updatedAt: { lt: sixHoursAgo },
      },
      select: {
        id: true,
        title: true,
        amount: true,
        currency: true,
        createdAt: true,
        user: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "asc" },
      take: 20,
    });

    if (overdueExpenses.length === 0) {
      return NextResponse.json({ success: true, reminders: 0 });
    }

    // Get all active admins
    const admins = await prisma.user.findMany({
      where: { role: "ADMIN", isActive: true },
      select: { id: true },
    });

    if (admins.length === 0) {
      return NextResponse.json({ success: true, reminders: 0 });
    }

    const adminIds = admins.map((a) => a.id);

    // Calculate hours pending for the oldest
    const oldestHours = Math.round(
      (Date.now() - new Date(overdueExpenses[0].createdAt).getTime()) / (1000 * 60 * 60)
    );

    const message =
      overdueExpenses.length === 1
        ? `"${overdueExpenses[0].title}" from ${overdueExpenses[0].user.firstName} has been pending for ${oldestHours}h`
        : `${overdueExpenses.length} expenses awaiting approval (oldest: ${oldestHours}h)`;

    // Check if we already sent a reminder in the last 3 hours to avoid spam
    const recentReminder = await prisma.notification.findFirst({
      where: {
        type: "APPROVAL_REMINDER",
        createdAt: { gt: new Date(Date.now() - 3 * 60 * 60 * 1000) },
      },
    });

    if (recentReminder) {
      return NextResponse.json({ success: true, reminders: 0, skipped: "recent reminder exists" });
    }

    // Create in-app notifications for all admins
    await prisma.notification.createMany({
      data: adminIds.map((userId) => ({
        type: "APPROVAL_REMINDER",
        title: "Pending Approvals Reminder",
        message,
        userId,
        linkUrl: "/dashboard/approvals",
      })),
    });

    // Send push notifications
    sendPushToUsers(adminIds, {
      title: "Pending Approvals Reminder",
      message,
      url: "/dashboard/approvals",
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      reminders: overdueExpenses.length,
      adminsNotified: adminIds.length,
    });
  } catch (error) {
    console.error("Approval reminder cron error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
