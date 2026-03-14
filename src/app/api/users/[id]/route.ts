import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

// PATCH - Update user (admin only)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { role, isActive, spendingLimit, branchId } = body;

    // Ensure employees always have a branch
    const effectiveRole = role !== undefined ? role : user.role;
    const effectiveBranchId = branchId !== undefined ? branchId : user.branchId;
    if (effectiveRole === "EMPLOYEE" && !effectiveBranchId) {
      return NextResponse.json({ error: "Employees must be assigned to a branch" }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(role !== undefined && { role }),
        ...(isActive !== undefined && { isActive }),
        ...(spendingLimit !== undefined && { spendingLimit: spendingLimit ? parseFloat(spendingLimit) : null }),
        ...(branchId !== undefined && { branchId }),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        spendingLimit: true,
        branchId: true,
        branch: { select: { id: true, name: true, code: true } },
        createdAt: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        action: "UPDATE",
        entity: "USER",
        entityId: id,
        details: JSON.stringify(body),
        userId: session.userId,
      },
    });

    return NextResponse.json({ user: updated });
  } catch (error) {
    console.error("Update user error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE - Permanently delete user (admin only, only if no transactions)
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    // Prevent deleting yourself
    if (id === session.userId) {
      return NextResponse.json({ error: "You cannot delete your own account" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if user has any expenses (submitted or draft)
    const expenseCount = await prisma.expense.count({ where: { userId: id } });
    if (expenseCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete user — they have ${expenseCount} expense(s). Deactivate them instead.` },
        { status: 400 }
      );
    }

    // Check if user has approved any expenses
    const approvedCount = await prisma.expense.count({ where: { approvedById: id } });
    if (approvedCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete user — they have approved ${approvedCount} expense(s). Deactivate them instead.` },
        { status: 400 }
      );
    }

    // Safe to delete — clean up related records first
    await prisma.notification.deleteMany({ where: { userId: id } });
    await prisma.pushSubscription.deleteMany({ where: { userId: id } });
    await prisma.auditLog.deleteMany({ where: { userId: id } });

    // Delete the user
    await prisma.user.delete({ where: { id } });

    // Log the deletion under the admin's ID
    await prisma.auditLog.create({
      data: {
        action: "DELETE",
        entity: "USER",
        entityId: id,
        details: JSON.stringify({ email: user.email, firstName: user.firstName, lastName: user.lastName }),
        userId: session.userId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete user error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
