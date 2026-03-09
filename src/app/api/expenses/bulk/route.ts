import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await req.json();
    const { action, ids } = body as { action: string; ids: string[] };

    if (!action || !ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "Action and expense IDs are required" },
        { status: 400 }
      );
    }

    if (ids.length > 100) {
      return NextResponse.json(
        { error: "Cannot process more than 100 expenses at once" },
        { status: 400 }
      );
    }

    // Fetch all targeted expenses
    const expenses = await prisma.expense.findMany({
      where: { id: { in: ids } },
    });

    if (expenses.length === 0) {
      return NextResponse.json({ error: "No expenses found" }, { status: 404 });
    }

    let updatedCount = 0;

    switch (action) {
      case "approve": {
        if (session.role === "EMPLOYEE") {
          return NextResponse.json(
            { error: "Only managers and admins can approve expenses" },
            { status: 403 }
          );
        }

        const pendingIds = expenses
          .filter((e) => e.status === "PENDING")
          .map((e) => e.id);

        if (pendingIds.length === 0) {
          return NextResponse.json(
            { error: "No pending expenses to approve" },
            { status: 400 }
          );
        }

        const result = await prisma.expense.updateMany({
          where: { id: { in: pendingIds } },
          data: {
            status: "APPROVED",
            approvedById: session.userId,
            approvedAt: new Date(),
          },
        });
        updatedCount = result.count;
        break;
      }

      case "reject": {
        if (session.role === "EMPLOYEE") {
          return NextResponse.json(
            { error: "Only managers and admins can reject expenses" },
            { status: 403 }
          );
        }

        const pendingIds = expenses
          .filter((e) => e.status === "PENDING")
          .map((e) => e.id);

        if (pendingIds.length === 0) {
          return NextResponse.json(
            { error: "No pending expenses to reject" },
            { status: 400 }
          );
        }

        const rejectionReason = body.rejectionReason || null;

        const result = await prisma.expense.updateMany({
          where: { id: { in: pendingIds } },
          data: {
            status: "REJECTED",
            approvedById: session.userId,
            approvedAt: new Date(),
            rejectionReason,
          },
        });
        updatedCount = result.count;
        break;
      }

      case "submit": {
        // Only owners can submit their own drafts
        const draftIds = expenses
          .filter((e) => e.status === "DRAFT" && e.userId === session.userId)
          .map((e) => e.id);

        if (draftIds.length === 0) {
          return NextResponse.json(
            { error: "No draft expenses to submit" },
            { status: 400 }
          );
        }

        const result = await prisma.expense.updateMany({
          where: { id: { in: draftIds } },
          data: { status: "PENDING" },
        });
        updatedCount = result.count;
        break;
      }

      case "delete": {
        // Employees can delete their own drafts; admins can delete any
        let deletableIds: string[];
        if (session.role === "ADMIN") {
          deletableIds = expenses.map((e) => e.id);
        } else {
          deletableIds = expenses
            .filter((e) => e.status === "DRAFT" && e.userId === session.userId)
            .map((e) => e.id);
        }

        if (deletableIds.length === 0) {
          return NextResponse.json(
            { error: "No expenses can be deleted" },
            { status: 400 }
          );
        }

        const result = await prisma.expense.deleteMany({
          where: { id: { in: deletableIds } },
        });
        updatedCount = result.count;
        break;
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      action,
      updatedCount,
    });
  } catch (error) {
    console.error("Bulk action error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
