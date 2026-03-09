import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Public endpoint - no auth required (used by register page)
export async function GET() {
  try {
    const branches = await prisma.branch.findMany({
      where: { isActive: true },
      select: { id: true, name: true, code: true, location: true },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ branches });
  } catch (error) {
    console.error("Get public branches error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
