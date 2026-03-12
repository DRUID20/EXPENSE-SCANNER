import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { sendPushToUser } from "@/lib/push";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id } = await params;

    const expense = await prisma.expense.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true, role: true },
        },
        approvedBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    if (!expense) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    // Employees can only see their own expenses
    if (session.role === "EMPLOYEE" && expense.userId !== session.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ expense });
  } catch (error) {
    console.error("Get expense error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();

    const expense = await prisma.expense.findUnique({ where: { id } });
    if (!expense) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    // Only owner can edit DRAFT expenses; Admins can approve/reject
    if (session.role === "EMPLOYEE" && expense.userId !== session.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Handle approval/rejection by admins
    if (body.status === "APPROVED" || body.status === "REJECTED") {
      if (session.role !== "ADMIN") {
        return NextResponse.json({ error: "Only admins can approve expenses" }, { status: 403 });
      }

      const updateData: Record<string, unknown> = {
        status: body.status,
        approvedById: session.userId,
        approvedAt: new Date(),
      };

      if (body.status === "REJECTED" && body.rejectionReason) {
        updateData.rejectionReason = body.rejectionReason;
      }

      const updated = await prisma.expense.update({
        where: { id },
        data: updateData,
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      });

      // Audit log
      await prisma.auditLog.create({
        data: {
          action: body.status === "APPROVED" ? "APPROVE" : "REJECT",
          entity: "EXPENSE",
          entityId: id,
          details: JSON.stringify({ title: expense.title, amount: expense.amount }),
          userId: session.userId,
        },
      });

      // Notify expense owner
      const notifTitle = body.status === "APPROVED" ? "Expense Approved" : "Expense Rejected";
      const notifMessage = body.status === "APPROVED"
        ? `Your expense "${expense.title}" has been approved`
        : `Your expense "${expense.title}" has been rejected${body.rejectionReason ? `: ${body.rejectionReason}` : ""}`;

      await prisma.notification.create({
        data: {
          type: body.status === "APPROVED" ? "EXPENSE_APPROVED" : "EXPENSE_REJECTED",
          title: notifTitle,
          message: notifMessage,
          userId: expense.userId,
          linkUrl: `/dashboard/expenses/${id}`,
        },
      });

      // Send push notification to expense owner
      sendPushToUser(expense.userId, {
        title: notifTitle,
        message: notifMessage,
        url: `/dashboard/expenses/${id}`,
      }).catch(() => {});

      return NextResponse.json({ expense: updated });
    }

    // Regular edit (only DRAFT expenses)
    if (expense.status !== "DRAFT" && session.role === "EMPLOYEE") {
      return NextResponse.json({ error: "Can only edit draft expenses" }, { status: 400 });
    }

    const { title, description, amount, currency, category, vendor, date, notes, status } = body;

    if (amount !== undefined) {
      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0 || !isFinite(parsedAmount)) {
        return NextResponse.json({ error: "Amount must be a positive number" }, { status: 400 });
      }
    }

    const updated = await prisma.expense.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(amount !== undefined && { amount: parseFloat(amount) }),
        ...(currency !== undefined && { currency }),
        ...(category !== undefined && { category }),
        ...(vendor !== undefined && { vendor }),
        ...(date !== undefined && { date: new Date(date) }),
        ...(notes !== undefined && { notes }),
        ...(status !== undefined && { status }),
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    return NextResponse.json({ expense: updated });
  } catch (error) {
    console.error("Update expense error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id } = await params;

    const expense = await prisma.expense.findUnique({ where: { id } });
    if (!expense) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    // Only owner or admin can delete; only DRAFT expenses can be deleted
    if (expense.userId !== session.userId && session.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (expense.status !== "DRAFT" && session.role !== "ADMIN") {
      return NextResponse.json({ error: "Can only delete draft expenses" }, { status: 400 });
    }

    await prisma.expense.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        action: "DELETE",
        entity: "EXPENSE",
        entityId: id,
        details: JSON.stringify({ title: expense.title, amount: expense.amount }),
        userId: session.userId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete expense error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
