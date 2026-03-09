import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const policies = await prisma.spendingPolicy.findMany({
      include: {
        department: { select: { id: true, name: true, code: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ policies });
  } catch (error) {
    console.error("List policies error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const body = await req.json();
    const { name, description, maxAmount, maxMonthly, categories, roles, departmentId } = body;

    if (!name || !maxAmount) {
      return NextResponse.json({ error: "Name and max amount are required" }, { status: 400 });
    }

    const policy = await prisma.spendingPolicy.create({
      data: {
        name,
        description: description || null,
        maxAmount: parseFloat(maxAmount),
        maxMonthly: maxMonthly ? parseFloat(maxMonthly) : null,
        categories: categories ? JSON.stringify(categories) : null,
        roles: roles ? JSON.stringify(roles) : null,
        departmentId: departmentId || null,
      },
      include: {
        department: { select: { id: true, name: true } },
      },
    });

    await logAudit({
      action: "POLICY_CREATE",
      entityType: "POLICY",
      entityId: policy.id,
      details: { name, maxAmount },
      userId: session.userId,
    });

    return NextResponse.json({ policy }, { status: 201 });
  } catch (error) {
    console.error("Create policy error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
