import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { firstName, lastName } = await req.json();

    if (!firstName || !lastName) {
      return NextResponse.json({ error: "First name and last name are required" }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id: session.userId },
      data: {
        firstName,
        lastName,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        avatar: true,
        isActive: true,
        branchId: true,
        branch: { select: { id: true, name: true, code: true } },
        createdAt: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        action: "UPDATE",
        entity: "USER",
        entityId: session.userId,
        details: JSON.stringify({ firstName, lastName }),
        userId: session.userId,
      },
    });

    return NextResponse.json({ user: updated });
  } catch (error) {
    console.error("Update profile error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
