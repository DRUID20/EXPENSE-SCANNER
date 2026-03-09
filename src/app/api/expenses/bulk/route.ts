import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

// Bulk operations on expenses
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { action, ids } = await req.json();

    if (!action || !ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "Action and expense IDs are required" }, { status: 400 });
    }

    // Verify all expenses exist and user has access
    const expenses = await prisma.expense.findMany({
      where: { id: { in: ids } },
    });

    if (expenses.length !== ids.length) {
      return NextResponse.json({ error: "Some expenses not found" }, { status: 404 });
    }

    switch (action) {
      case "submit": {
        // Only owners can submit their own drafts
        const drafts = expenses.filter(
          (e) => e.status === "DRAFT" && (e.userId === session.userId || session.role === "ADMIN")
        );
        if (drafts.length === 0) {
          return NextResponse.json({ error: "No eligible draft expenses to submit" }, { status: 400 });
        }

        await prisma.expense.updateMany({
          where: { id: { in: drafts.map((e) => e.id) } },
          data: { status: "PENDING" },
        });

        // Create notifications for managers
        const managers = await prisma.user.findMany({
          where: { role: { in: ["MANAGER", "ADMIN"] }, isActive: true },
          select: { id: true },
        });

        if (managers.length > 0) {
          await prisma.notification.createMany({
            data: managers.map((m) => ({
              type: "EXPENSE_SUBMITTED",
              title: "Expenses Submitted for Review",
              message: `${drafts.length} expense(s) submitted for approval`,
              userId: m.id,
              linkUrl: "/dashboard/approvals",
            })),
          });
        }

        // Audit log
        await prisma.auditLog.create({
          data: {
            action: "BULK_SUBMIT",
            entity: "EXPENSE",
            details: JSON.stringify({ count: drafts.length, ids: drafts.map((e) => e.id) }),
            userId: session.userId,
          },
        });

        return NextResponse.json({ success: true, affected: drafts.length });
      }

      case "approve": {
        if (session.role === "EMPLOYEE") {
          return NextResponse.json({ error: "Only managers/admins can approve" }, { status: 403 });
        }

        const pending = expenses.filter((e) => e.status === "PENDING");
        if (pending.length === 0) {
          return NextResponse.json({ error: "No pending expenses to approve" }, { status: 400 });
        }

        await prisma.expense.updateMany({
          where: { id: { in: pending.map((e) => e.id) } },
          data: { status: "APPROVED", approvedById: session.userId, approvedAt: new Date() },
        });

        // Notify expense owners
        const ownerIds = [...new Set(pending.map((e) => e.userId))];
        await prisma.notification.createMany({
          data: ownerIds.map((uid) => ({
            type: "EXPENSE_APPROVED",
            title: "Expenses Approved",
            message: `${pending.filter((e) => e.userId === uid).length} expense(s) have been approved`,
            userId: uid,
            linkUrl: "/dashboard/expenses",
          })),
        });

        await prisma.auditLog.create({
          data: {
            action: "BULK_APPROVE",
            entity: "EXPENSE",
            details: JSON.stringify({ count: pending.length, ids: pending.map((e) => e.id) }),
            userId: session.userId,
          },
        });

        return NextResponse.json({ success: true, affected: pending.length });
      }

      case "reject": {
        if (session.role === "EMPLOYEE") {
          return NextResponse.json({ error: "Only managers/admins can reject" }, { status: 403 });
        }

        const pendingToReject = expenses.filter((e) => e.status === "PENDING");
        if (pendingToReject.length === 0) {
          return NextResponse.json({ error: "No pending expenses to reject" }, { status: 400 });
        }

        await prisma.expense.updateMany({
          where: { id: { in: pendingToReject.map((e) => e.id) } },
          data: { status: "REJECTED", approvedById: session.userId, approvedAt: new Date() },
        });

        const rejectOwnerIds = [...new Set(pendingToReject.map((e) => e.userId))];
        await prisma.notification.createMany({
          data: rejectOwnerIds.map((uid) => ({
            type: "EXPENSE_REJECTED",
            title: "Expenses Rejected",
            message: `${pendingToReject.filter((e) => e.userId === uid).length} expense(s) have been rejected`,
            userId: uid,
            linkUrl: "/dashboard/expenses",
          })),
        });

        await prisma.auditLog.create({
          data: {
            action: "BULK_REJECT",
            entity: "EXPENSE",
            details: JSON.stringify({ count: pendingToReject.length, ids: pendingToReject.map((e) => e.id) }),
            userId: session.userId,
          },
        });

        return NextResponse.json({ success: true, affected: pendingToReject.length });
      }

      case "delete": {
        const deletable = expenses.filter(
          (e) =>
            (e.status === "DRAFT" && e.userId === session.userId) ||
            session.role === "ADMIN"
        );
        if (deletable.length === 0) {
          return NextResponse.json({ error: "No eligible expenses to delete" }, { status: 400 });
        }

        await prisma.expense.deleteMany({
          where: { id: { in: deletable.map((e) => e.id) } },
        });

        await prisma.auditLog.create({
          data: {
            action: "BULK_DELETE",
            entity: "EXPENSE",
            details: JSON.stringify({ count: deletable.length, ids: deletable.map((e) => e.id) }),
            userId: session.userId,
          },
        });

        return NextResponse.json({ success: true, affected: deletable.length });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Bulk operation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
