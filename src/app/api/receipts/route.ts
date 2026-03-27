import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { existsSync } from "fs";

const RECEIPTS_DIR = path.join(process.cwd(), "private", "receipts");

function sanitizeCategory(category: string): string {
  return category.replace(/[^a-zA-Z0-9&\s-]/g, "").replace(/\s+/g, "-").toLowerCase();
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { imageBase64, category, expenseId } = await req.json();

    if (!imageBase64 || !expenseId) {
      return NextResponse.json({ error: "Image and expense ID are required" }, { status: 400 });
    }

    // Parse base64 data URL (images + PDFs)
    const matches = imageBase64.match(/^data:(image\/(jpeg|png|webp|gif)|application\/pdf);base64,(.+)$/);
    if (!matches) {
      return NextResponse.json({ error: "Invalid file data" }, { status: 400 });
    }

    const isPdf = matches[1] === "application/pdf";
    const ext = isPdf ? "pdf" : (matches[2] === "jpeg" ? "jpg" : matches[2]);
    const base64Data = matches[3];
    const buffer = Buffer.from(base64Data, "base64");

    // Create directory structure: /receipts/{category}/{expenseId}.{ext}
    const categoryDir = sanitizeCategory(category || "other");
    const dirPath = path.join(RECEIPTS_DIR, categoryDir);

    if (!existsSync(dirPath)) {
      await mkdir(dirPath, { recursive: true });
    }

    const filename = `${expenseId}.${ext}`;
    const filePath = path.join(dirPath, filename);
    await writeFile(filePath, buffer);

    // Return the public URL path
    const publicPath = `/receipts/${categoryDir}/${filename}`;

    return NextResponse.json({ path: publicPath });
  } catch (error) {
    console.error("Receipt upload error:", error);
    return NextResponse.json({ error: "Failed to save receipt" }, { status: 500 });
  }
}
