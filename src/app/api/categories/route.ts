import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

// Default categories
const DEFAULT_CATEGORIES = [
  "Fuel & Gas", "Equipment", "Office Supplies", "Meals",
  "Transport & Accommodation", "Utilities", "Repair & Maintenance",
  "Vehicle Repairs & Maintenance", "Generator Expenses", "Other",
];

// Renames from old category names to new ones
const CATEGORY_RENAMES: Record<string, string> = {
  "Maintenance": "Repair & Maintenance",
  "Transportation": "Transport & Accommodation",
};

// Old categories to remove (merged into others)
const CATEGORIES_TO_REMOVE = ["Travel", "Supplies", "Office"];

async function ensureDefaultCategories() {
  const count = await prisma.category.count();
  if (count === 0) {
    await prisma.category.createMany({
      data: DEFAULT_CATEGORIES.map((name) => ({ name, isDefault: true, isActive: true })),
      skipDuplicates: true,
    });
    return;
  }

  // Migrate: rename old categories to new names
  for (const [oldName, newName] of Object.entries(CATEGORY_RENAMES)) {
    const existing = await prisma.category.findUnique({ where: { name: oldName } });
    const newExists = await prisma.category.findUnique({ where: { name: newName } });
    if (existing && !newExists) {
      await prisma.category.update({ where: { id: existing.id }, data: { name: newName } });
    } else if (existing && newExists) {
      // New name already exists, just deactivate the old one
      await prisma.category.update({ where: { id: existing.id }, data: { isActive: false } });
    }
  }

  // Deactivate removed categories
  for (const name of CATEGORIES_TO_REMOVE) {
    const existing = await prisma.category.findUnique({ where: { name } });
    if (existing && existing.isActive) {
      await prisma.category.update({ where: { id: existing.id }, data: { isActive: false } });
    }
  }

  // Add any new default categories that don't exist yet
  for (const name of DEFAULT_CATEGORIES) {
    const existing = await prisma.category.findUnique({ where: { name } });
    if (!existing) {
      await prisma.category.create({ data: { name, isDefault: true, isActive: true } });
    } else if (!existing.isActive) {
      // Reactivate if it was deactivated
      await prisma.category.update({ where: { id: existing.id }, data: { isActive: true, isDefault: true } });
    }
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
