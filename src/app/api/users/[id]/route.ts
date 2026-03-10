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
