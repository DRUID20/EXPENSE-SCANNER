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

    const data: Record<string, unknown> = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.description !== undefined) data.description = body.description;
    if (body.maxAmount !== undefined) data.maxAmount = parseFloat(body.maxAmount);
    if (body.maxMonthly !== undefined) data.maxMonthly = body.maxMonthly ? parseFloat(body.maxMonthly) : null;
    if (body.categories !== undefined) data.categories = body.categories ? JSON.stringify(body.categories) : null;
    if (body.roles !== undefined) data.roles = body.roles ? JSON.stringify(body.roles) : null;
    if (body.departmentId !== undefined) data.departmentId = body.departmentId || null;
    if (body.isActive !== undefined) data.isActive = body.isActive;

    const updated = await prisma.spendingPolicy.update({
      where: { id },
      data,
      include: { department: { select: { id: true, name: true } } },
    });

    await logAudit({
      action: "POLICY_UPDATE",
      entityType: "POLICY",
      entityId: id,
      details: data,
      userId: session.userId,
    });

    return NextResponse.json({ policy: updated });
  } catch (error) {
    console.error("Update policy error:", error);
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
    const policy = await prisma.spendingPolicy.findUnique({ where: { id } });
    if (!policy) {
      return NextResponse.json({ error: "Policy not found" }, { status: 404 });
    }

    await prisma.spendingPolicy.delete({ where: { id } });

    await logAudit({
      action: "POLICY_DELETE",
      entityType: "POLICY",
      entityId: id,
      details: { name: policy.name },
      userId: session.userId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete policy error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
