import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

// GET all spending policies
export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const policies = await prisma.spendingPolicy.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ policies });
  } catch (error) {
    console.error("Get policies error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST - Create a new policy
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { name, maxAmount, category, role, requireApproval } = await req.json();

    if (!name || !maxAmount) {
      return NextResponse.json({ error: "Name and max amount are required" }, { status: 400 });
    }

    const policy = await prisma.spendingPolicy.create({
      data: {
        name,
        maxAmount: parseFloat(maxAmount),
        category: category || null,
        role: role || null,
        requireApproval: requireApproval !== false,
      },
    });

    await prisma.auditLog.create({
      data: {
        action: "CREATE",
        entity: "POLICY",
        entityId: policy.id,
        details: JSON.stringify({ name, maxAmount }),
        userId: session.userId,
      },
    });

    return NextResponse.json({ policy }, { status: 201 });
  } catch (error) {
    console.error("Create policy error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE - Remove a policy
export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await req.json();

    await prisma.spendingPolicy.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        action: "DELETE",
        entity: "POLICY",
        entityId: id,
        userId: session.userId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete policy error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
