import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

// PATCH - Update user (role, department, active status)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();

    const existingUser = await prisma.user.findUnique({ where: { id } });
    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const data: Record<string, unknown> = {};
    const changes: Record<string, unknown> = {};

    if (body.role !== undefined && body.role !== existingUser.role) {
      data.role = body.role;
      changes.role = { from: existingUser.role, to: body.role };

      await logAudit({
        action: "ROLE_CHANGE",
        entityType: "USER",
        entityId: id,
        details: changes,
        userId: session.userId,
      });
    }

    if (body.departmentId !== undefined) {
      data.departmentId = body.departmentId || null;
      changes.departmentId = { from: existingUser.departmentId, to: body.departmentId };

      await logAudit({
        action: "ASSIGN_DEPARTMENT",
        entityType: "USER",
        entityId: id,
        details: changes,
        userId: session.userId,
      });
    }

    if (body.isActive !== undefined && body.isActive !== existingUser.isActive) {
      data.isActive = body.isActive;
      changes.isActive = { from: existingUser.isActive, to: body.isActive };

      await logAudit({
        action: body.isActive ? "ACTIVATE" : "DEACTIVATE",
        entityType: "USER",
        entityId: id,
        details: { email: existingUser.email },
        userId: session.userId,
      });
    }

    if (body.firstName !== undefined) data.firstName = body.firstName;
    if (body.lastName !== undefined) data.lastName = body.lastName;

    const updated = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        departmentId: true,
        isActive: true,
        dept: { select: { id: true, name: true, code: true } },
      },
    });

    return NextResponse.json({ user: updated });
  } catch (error) {
    console.error("Update user error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
