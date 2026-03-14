import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, hashPassword } from "@/lib/auth";
import { sendWelcomeEmail } from "@/lib/email";

// GET all users (admin only)
export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const users = await prisma.user.findMany({
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
        _count: { select: { expenses: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error("Get users error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST - Invite/create a new user (admin only)
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { email, firstName, lastName, role, password, spendingLimit, branchId } = await req.json();

    if (!email || !firstName || !lastName || !password) {
      return NextResponse.json({ error: "Email, name, and password are required" }, { status: 400 });
    }

    const userRole = role || "EMPLOYEE";
    if (userRole === "EMPLOYEE" && !branchId) {
      return NextResponse.json({ error: "Employees must be assigned to a branch" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "User with this email already exists" }, { status: 409 });
    }

    const hashedPassword = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        email,
        firstName,
        lastName,
        password: hashedPassword,
        role: role || "EMPLOYEE",
        spendingLimit: spendingLimit ? parseFloat(spendingLimit) : null,
        branchId: branchId || null,
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
        createdAt: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        action: "CREATE",
        entity: "USER",
        entityId: user.id,
        details: JSON.stringify({ email, role: role || "EMPLOYEE" }),
        userId: session.userId,
      },
    });

    // Send welcome email with credentials (don't block response if it fails)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || req.headers.get("origin") || "http://localhost:3000";
    sendWelcomeEmail(email, firstName, password, `${baseUrl}/login`).catch(() => {});

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    console.error("Create user error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
