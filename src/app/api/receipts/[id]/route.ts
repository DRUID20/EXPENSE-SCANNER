import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { readFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

const PRIVATE_RECEIPTS_DIR = path.join(process.cwd(), "private", "receipts");

const MIME_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".pdf": "application/pdf",
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id } = await params;

    // Find expense and verify access
    const expense = await prisma.expense.findUnique({
      where: { id },
      select: {
        id: true,
        receiptPath: true,
        receiptUrl: true,
        userId: true,
      },
    });

    if (!expense) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    // Employees can only view their own receipts
    if (session.role !== "ADMIN" && expense.userId !== session.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Try serving from private disk storage
    if (expense.receiptPath) {
      const filePath = path.join(PRIVATE_RECEIPTS_DIR, path.basename(path.dirname(expense.receiptPath)), path.basename(expense.receiptPath));
      if (existsSync(filePath)) {
        const data = await readFile(filePath);
        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || "application/octet-stream";

        return new NextResponse(data, {
          headers: {
            "Content-Type": contentType,
            "Cache-Control": "private, max-age=3600",
            "Content-Disposition": `inline; filename="receipt-${id}${ext}"`,
          },
        });
      }
    }

    // Fallback: serve from base64 receiptUrl (legacy data)
    if (expense.receiptUrl && (expense.receiptUrl.startsWith("data:image/") || expense.receiptUrl.startsWith("data:application/pdf"))) {
      const matches = expense.receiptUrl.match(/^data:(image\/(jpeg|png|webp|gif)|application\/pdf);base64,(.+)$/);
      if (matches) {
        const contentType = matches[1];
        const buffer = Buffer.from(matches[3], "base64");
        const isPdf = contentType === "application/pdf";
        const ext = isPdf ? "pdf" : (matches[2] === "jpeg" ? "jpg" : matches[2]);

        return new NextResponse(buffer, {
          headers: {
            "Content-Type": contentType,
            "Cache-Control": "private, max-age=3600",
            "Content-Disposition": `inline; filename="receipt-${id}.${ext}"`,
          },
        });
      }
    }

    return NextResponse.json({ error: "Receipt not found" }, { status: 404 });
  } catch (error) {
    console.error("Receipt serve error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
