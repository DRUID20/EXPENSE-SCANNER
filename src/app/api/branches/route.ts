import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

// GET all branches
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const branches = await prisma.branch.findMany({
      include: {
        _count: { select: { users: true } },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ branches });
  } catch (error) {
    console.error("Get branches error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST - Create a new branch (admin only)
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { name, code, location } = await req.json();

    if (!name || !code || !location) {
      return NextResponse.json({ error: "Name, code, and location are required" }, { status: 400 });
    }

    const existing = await prisma.branch.findUnique({ where: { code: code.toUpperCase() } });
    if (existing) {
      return NextResponse.json({ error: "Branch code already exists" }, { status: 409 });
    }

    const branch = await prisma.branch.create({
      data: {
        name,
        code: code.toUpperCase(),
        location,
      },
    });

    await prisma.auditLog.create({
      data: {
        action: "CREATE",
        entity: "BRANCH",
        entityId: branch.id,
        details: JSON.stringify({ name, code, location }),
        userId: session.userId,
      },
    });

    return NextResponse.json({ branch }, { status: 201 });
  } catch (error) {
    console.error("Create branch error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
