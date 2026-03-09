import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();

    const dept = await prisma.department.findUnique({ where: { id } });
    if (!dept) {
      return NextResponse.json({ error: "Department not found" }, { status: 404 });
    }

    const data: Record<string, unknown> = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.code !== undefined) data.code = body.code;
    if (body.description !== undefined) data.description = body.description;
    if (body.parentId !== undefined) data.parentId = body.parentId || null;
    if (body.managerId !== undefined) data.managerId = body.managerId || null;
    if (body.budget !== undefined) data.budget = body.budget ? parseFloat(body.budget) : null;
    if (body.isActive !== undefined) data.isActive = body.isActive;

    const updated = await prisma.department.update({
      where: { id },
      data,
      include: {
        parent: { select: { id: true, name: true } },
        children: { select: { id: true, name: true, code: true } },
        _count: { select: { users: true } },
      },
    });

    await logAudit({
      action: "DEPT_UPDATE",
      entityType: "DEPARTMENT",
      entityId: id,
      details: data,
      userId: session.userId,
    });

    return NextResponse.json({ department: updated });
  } catch (error) {
    console.error("Update department error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { id } = await params;

    const dept = await prisma.department.findUnique({
      where: { id },
      include: { _count: { select: { users: true, children: true } } },
    });

    if (!dept) {
      return NextResponse.json({ error: "Department not found" }, { status: 404 });
    }

    if (dept._count.users > 0) {
      return NextResponse.json({ error: "Cannot delete department with assigned users. Reassign users first." }, { status: 400 });
    }

    if (dept._count.children > 0) {
      return NextResponse.json({ error: "Cannot delete department with sub-departments. Remove children first." }, { status: 400 });
    }

    await prisma.department.delete({ where: { id } });

    await logAudit({
      action: "DEPT_DELETE",
      entityType: "DEPARTMENT",
      entityId: id,
      details: { name: dept.name },
      userId: session.userId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete department error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
