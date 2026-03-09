import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

// PATCH - Update a branch (admin only)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { name, code, location, isActive } = body;

    const existing = await prisma.branch.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Branch not found" }, { status: 404 });
    }

    // Check unique code if changing
    if (code && code.toUpperCase() !== existing.code) {
      const codeExists = await prisma.branch.findUnique({ where: { code: code.toUpperCase() } });
      if (codeExists) {
        return NextResponse.json({ error: "Branch code already exists" }, { status: 409 });
      }
    }

    const branch = await prisma.branch.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(code !== undefined && { code: code.toUpperCase() }),
        ...(location !== undefined && { location }),
        ...(isActive !== undefined && { isActive }),
      },
      include: { _count: { select: { users: true } } },
    });

    await prisma.auditLog.create({
      data: {
        action: "UPDATE",
        entity: "BRANCH",
        entityId: id,
        details: JSON.stringify(body),
        userId: session.userId,
      },
    });

    return NextResponse.json({ branch });
  } catch (error) {
    console.error("Update branch error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE - Delete a branch (admin only)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const branch = await prisma.branch.findUnique({
      where: { id },
      include: { _count: { select: { users: true } } },
    });

    if (!branch) {
      return NextResponse.json({ error: "Branch not found" }, { status: 404 });
    }

    if (branch._count.users > 0) {
      return NextResponse.json(
        { error: `Cannot delete branch with ${branch._count.users} assigned user(s). Reassign them first.` },
        { status: 400 }
      );
    }

    await prisma.branch.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        action: "DELETE",
        entity: "BRANCH",
        entityId: id,
        details: JSON.stringify({ name: branch.name, code: branch.code }),
        userId: session.userId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete branch error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
