-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

-- Seed default categories
INSERT INTO "Category" ("id", "name", "isActive", "isDefault", "updatedAt") VALUES
  (gen_random_uuid()::text, 'Fuel & Gas', true, true, NOW()),
  (gen_random_uuid()::text, 'Equipment', true, true, NOW()),
  (gen_random_uuid()::text, 'Travel', true, true, NOW()),
  (gen_random_uuid()::text, 'Supplies', true, true, NOW()),
  (gen_random_uuid()::text, 'Meals', true, true, NOW()),
  (gen_random_uuid()::text, 'Transportation', true, true, NOW()),
  (gen_random_uuid()::text, 'Utilities', true, true, NOW()),
  (gen_random_uuid()::text, 'Maintenance', true, true, NOW()),
  (gen_random_uuid()::text, 'Office', true, true, NOW()),
  (gen_random_uuid()::text, 'Other', true, true, NOW());
