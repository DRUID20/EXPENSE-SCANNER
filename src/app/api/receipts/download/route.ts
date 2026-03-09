import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, buildExpenseWhere } from "@/lib/auth";
import { readFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

// Simple ZIP file creator (no external dependencies)
function createZip(files: { name: string; data: Buffer }[]): Buffer {
  const localHeaders: Buffer[] = [];
  const centralHeaders: Buffer[] = [];
  let offset = 0;

  for (const file of files) {
    const nameBuffer = Buffer.from(file.name, "utf-8");
    const crc = crc32(file.data);
    const size = file.data.length;

    // Local file header
    const local = Buffer.alloc(30 + nameBuffer.length);
    local.writeUInt32LE(0x04034b50, 0); // signature
    local.writeUInt16LE(20, 4);         // version needed
    local.writeUInt16LE(0, 6);          // flags
    local.writeUInt16LE(0, 8);          // compression (store)
    local.writeUInt16LE(0, 10);         // mod time
    local.writeUInt16LE(0, 12);         // mod date
    local.writeUInt32LE(crc, 14);       // crc32
    local.writeUInt32LE(size, 18);      // compressed size
    local.writeUInt32LE(size, 22);      // uncompressed size
    local.writeUInt16LE(nameBuffer.length, 26); // name length
    local.writeUInt16LE(0, 28);         // extra length
    nameBuffer.copy(local, 30);

    localHeaders.push(local);
    localHeaders.push(file.data);

    // Central directory header
    const central = Buffer.alloc(46 + nameBuffer.length);
    central.writeUInt32LE(0x02014b50, 0); // signature
    central.writeUInt16LE(20, 4);         // version made by
    central.writeUInt16LE(20, 6);         // version needed
    central.writeUInt16LE(0, 8);          // flags
    central.writeUInt16LE(0, 10);         // compression
    central.writeUInt16LE(0, 12);         // mod time
    central.writeUInt16LE(0, 14);         // mod date
    central.writeUInt32LE(crc, 16);       // crc32
    central.writeUInt32LE(size, 20);      // compressed size
    central.writeUInt32LE(size, 24);      // uncompressed size
    central.writeUInt16LE(nameBuffer.length, 28); // name length
    central.writeUInt16LE(0, 30);         // extra length
    central.writeUInt16LE(0, 32);         // comment length
    central.writeUInt16LE(0, 34);         // disk number
    central.writeUInt16LE(0, 36);         // internal attributes
    central.writeUInt32LE(0, 38);         // external attributes
    central.writeUInt32LE(offset, 42);    // local header offset
    nameBuffer.copy(central, 46);

    centralHeaders.push(central);
    offset += local.length + file.data.length;
  }

  const centralDirSize = centralHeaders.reduce((sum, b) => sum + b.length, 0);

  // End of central directory
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralDirSize, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);

  return Buffer.concat([...localHeaders, ...centralHeaders, end]);
}

function crc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");

    const where: Record<string, unknown> = {
      ...buildExpenseWhere(session),
      receiptPath: { not: null },
    };

    if (category && category !== "ALL") {
      where.category = category;
    }

    const expenses = await prisma.expense.findMany({
      where,
      select: {
        id: true,
        title: true,
        category: true,
        date: true,
        receiptPath: true,
        vendor: true,
      },
      orderBy: { date: "desc" },
    });

    if (expenses.length === 0) {
      return NextResponse.json({ error: "No receipts found for the selected filter" }, { status: 404 });
    }

    const files: { name: string; data: Buffer }[] = [];
    const publicDir = path.join(process.cwd(), "public");

    for (const expense of expenses) {
      if (!expense.receiptPath) continue;
      const filePath = path.join(publicDir, expense.receiptPath);
      if (!existsSync(filePath)) continue;

      try {
        const data = await readFile(filePath);
        const ext = path.extname(expense.receiptPath);
        const dateStr = new Date(expense.date).toISOString().split("T")[0];
        const safeName = (expense.title || "receipt").replace(/[^a-zA-Z0-9-_ ]/g, "").slice(0, 40);
        const fileName = `${dateStr}_${safeName}${ext}`;
        files.push({ name: fileName, data });
      } catch {
        // Skip files that can't be read
      }
    }

    if (files.length === 0) {
      return NextResponse.json({ error: "No receipt files found on disk" }, { status: 404 });
    }

    const zipBuffer = createZip(files);
    const label = category && category !== "ALL" ? category.toLowerCase().replace(/\s+/g, "-") : "all";

    return new NextResponse(new Uint8Array(zipBuffer), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="receipts-${label}-${new Date().toISOString().split("T")[0]}.zip"`,
      },
    });
  } catch (error) {
    console.error("Receipt download error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
