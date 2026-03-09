import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

// GET - List all departments with hierarchy
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const departments = await prisma.department.findMany({
      include: {
        parent: { select: { id: true, name: true, code: true } },
        children: { select: { id: true, name: true, code: true, isActive: true } },
        _count: { select: { users: true, policies: true } },
      },
      orderBy: [{ parentId: "asc" }, { name: "asc" }],
    });

    return NextResponse.json({ departments });
  } catch (error) {
    console.error("List departments error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST - Create department (admin only)
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const body = await req.json();
    const { name, code, description, parentId, managerId, budget } = body;

    if (!name) {
      return NextResponse.json({ error: "Department name is required" }, { status: 400 });
    }

    const existing = await prisma.department.findUnique({ where: { name } });
    if (existing) {
      return NextResponse.json({ error: "A department with this name already exists" }, { status: 409 });
    }

    const department = await prisma.department.create({
      data: {
        name,
        code: code || null,
        description: description || null,
        parentId: parentId || null,
        managerId: managerId || null,
        budget: budget ? parseFloat(budget) : null,
      },
      include: {
        parent: { select: { id: true, name: true } },
        _count: { select: { users: true } },
      },
    });

    await logAudit({
      action: "DEPT_CREATE",
      entityType: "DEPARTMENT",
      entityId: department.id,
      details: { name, parentId },
      userId: session.userId,
    });

    return NextResponse.json({ department }, { status: 201 });
  } catch (error) {
    console.error("Create department error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
