import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

async function createTables() {
  // Create tables using raw SQL if they don't exist
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Branch" (
      "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
      "name" TEXT NOT NULL,
      "code" TEXT NOT NULL,
      "location" TEXT NOT NULL,
      "isActive" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Branch_pkey" PRIMARY KEY ("id")
    );
  `);
  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "Branch_code_key" ON "Branch"("code");
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "User" (
      "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
      "email" TEXT NOT NULL,
      "password" TEXT NOT NULL,
      "firstName" TEXT NOT NULL,
      "lastName" TEXT NOT NULL,
      "role" TEXT NOT NULL DEFAULT 'EMPLOYEE',
      "avatar" TEXT,
      "department" TEXT,
      "isActive" BOOLEAN NOT NULL DEFAULT true,
      "spendingLimit" DOUBLE PRECISION,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "branchId" TEXT,
      CONSTRAINT "User_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "User_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE
    );
  `);
  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Expense" (
      "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
      "title" TEXT NOT NULL,
      "description" TEXT,
      "amount" DOUBLE PRECISION NOT NULL,
      "currency" TEXT NOT NULL DEFAULT 'UGX',
      "category" TEXT NOT NULL,
      "vendor" TEXT,
      "date" TIMESTAMP(3) NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'DRAFT',
      "receiptUrl" TEXT,
      "receiptData" TEXT,
      "notes" TEXT,
      "rejectionReason" TEXT,
      "userId" TEXT NOT NULL,
      "approvedById" TEXT,
      "approvedAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Expense_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "Expense_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
      CONSTRAINT "Expense_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "SpendingPolicy" (
      "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
      "name" TEXT NOT NULL,
      "maxAmount" DOUBLE PRECISION NOT NULL,
      "category" TEXT,
      "role" TEXT,
      "requireApproval" BOOLEAN NOT NULL DEFAULT true,
      "isActive" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "SpendingPolicy_pkey" PRIMARY KEY ("id")
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "AuditLog" (
      "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
      "action" TEXT NOT NULL,
      "entity" TEXT NOT NULL,
      "entityId" TEXT,
      "details" TEXT,
      "userId" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Notification" (
      "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
      "type" TEXT NOT NULL,
      "title" TEXT NOT NULL,
      "message" TEXT NOT NULL,
      "isRead" BOOLEAN NOT NULL DEFAULT false,
      "userId" TEXT NOT NULL,
      "linkUrl" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Notification_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
    );
  `);
}

async function seedData() {
  // Create branches
  const branches = [
    { name: "Head Office", code: "HQ", location: "Kampala" },
    { name: "Jinja Branch", code: "JNJ", location: "Jinja" },
    { name: "Mbarara Branch", code: "MBR", location: "Mbarara" },
    { name: "Gulu Branch", code: "GLU", location: "Gulu" },
    { name: "Entebbe Branch", code: "ENT", location: "Entebbe" },
  ];

  for (const branch of branches) {
    await prisma.branch.upsert({
      where: { code: branch.code },
      update: {},
      create: branch,
    });
  }

  // Create admin user
  const hqBranch = await prisma.branch.findUnique({ where: { code: "HQ" } });
  const hashedPassword = await bcrypt.hash("admin123", 12);

  await prisma.user.upsert({
    where: { email: "admin@gasco.energy" },
    update: {},
    create: {
      email: "admin@gasco.energy",
      password: hashedPassword,
      firstName: "Super",
      lastName: "Admin",
      role: "ADMIN",
      department: "Operations",
      branchId: hqBranch!.id,
    },
  });

  // Create default spending policy
  const existingPolicies = await prisma.spendingPolicy.count();
  if (existingPolicies === 0) {
    await prisma.spendingPolicy.create({
      data: {
        name: "General Expense Limit",
        maxAmount: 5000000,
        requireApproval: true,
      },
    });
  }
}

export async function GET() {
  try {
    // Step 1: Create tables
    await createTables();

    // Step 2: Seed data
    await seedData();

    return NextResponse.json({
      success: true,
      message: "Database initialized and seeded! Login with admin@gasco.energy / admin123",
    });
  } catch (error) {
    console.error("Setup error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
