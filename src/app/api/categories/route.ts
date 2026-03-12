import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

// Default categories to seed if none exist
const DEFAULT_CATEGORIES = [
  "Fuel & Gas", "Equipment", "Travel", "Supplies", "Meals",
  "Transportation", "Utilities", "Maintenance", "Office", "Other",
];

async function ensureDefaultCategories() {
  const count = await prisma.category.count();
  if (count === 0) {
    await prisma.category.createMany({
      data: DEFAULT_CATEGORIES.map((name) => ({ name, isDefault: true, isActive: true })),
      skipDuplicates: true,
    });
  }
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    await ensureDefaultCategories();

    const categories = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ categories });
  } catch (error) {
    console.error("Get categories error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { name } = await req.json();
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "Category name is required" }, { status: 400 });
    }

    const existing = await prisma.category.findUnique({ where: { name: name.trim() } });
    if (existing) {
      if (!existing.isActive) {
        // Reactivate
        const updated = await prisma.category.update({
          where: { id: existing.id },
          data: { isActive: true },
        });
        return NextResponse.json({ category: updated }, { status: 200 });
      }
      return NextResponse.json({ error: "Category already exists" }, { status: 400 });
    }

    const category = await prisma.category.create({
      data: { name: name.trim() },
    });

    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    console.error("Create category error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Category ID required" }, { status: 400 });
    }

    const category = await prisma.category.findUnique({ where: { id } });
    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }
    if (category.isDefault) {
      return NextResponse.json({ error: "Cannot delete default categories" }, { status: 400 });
    }

    // Soft delete - deactivate instead of removing
    await prisma.category.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete category error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
