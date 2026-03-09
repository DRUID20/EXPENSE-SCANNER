import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, hashPassword } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

// GET - List all users (admin only)
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");
    const role = searchParams.get("role");
    const departmentId = searchParams.get("departmentId");
    const active = searchParams.get("active");

    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { email: { contains: search } },
      ];
    }
    if (role && role !== "ALL") where.role = role;
    if (departmentId && departmentId !== "ALL") where.departmentId = departmentId;
    if (active === "true") where.isActive = true;
    if (active === "false") where.isActive = false;

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        department: true,
        departmentId: true,
        isActive: true,
        createdAt: true,
        dept: { select: { id: true, name: true, code: true } },
        _count: { select: { expenses: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error("List users error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST - Create/invite a new user (admin only)
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const body = await req.json();
    const { email, firstName, lastName, role, password, departmentId } = body;

    if (!email || !firstName || !lastName || !password) {
      return NextResponse.json({ error: "Email, name, and password are required" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "A user with this email already exists" }, { status: 409 });
    }

    const hashedPassword = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        email,
        firstName,
        lastName,
        role: role || "EMPLOYEE",
        password: hashedPassword,
        departmentId: departmentId || null,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        departmentId: true,
        isActive: true,
        createdAt: true,
      },
    });

    await logAudit({
      action: "CREATE",
      entityType: "USER",
      entityId: user.id,
      details: { email, role: role || "EMPLOYEE", departmentId },
      userId: session.userId,
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    console.error("Create user error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
