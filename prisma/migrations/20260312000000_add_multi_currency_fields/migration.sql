-- AlterTable: Add multi-currency conversion fields
ALTER TABLE "Expense" ADD COLUMN "amountUGX" DOUBLE PRECISION;
ALTER TABLE "Expense" ADD COLUMN "exchangeRate" DOUBLE PRECISION;

-- Backfill: Set amountUGX = amount for existing UGX expenses
UPDATE "Expense" SET "amountUGX" = "amount", "exchangeRate" = 1 WHERE "currency" = 'UGX';

-- Backfill: Convert known currencies (approximate rates)
UPDATE "Expense" SET "amountUGX" = "amount" * 3750, "exchangeRate" = 3750 WHERE "currency" = 'USD' AND "amountUGX" IS NULL;
UPDATE "Expense" SET "amountUGX" = "amount" * 4100, "exchangeRate" = 4100 WHERE "currency" = 'EUR' AND "amountUGX" IS NULL;
UPDATE "Expense" SET "amountUGX" = "amount" * 4750, "exchangeRate" = 4750 WHERE "currency" = 'GBP' AND "amountUGX" IS NULL;
UPDATE "Expense" SET "amountUGX" = "amount" * 29, "exchangeRate" = 29 WHERE "currency" = 'KES' AND "amountUGX" IS NULL;
UPDATE "Expense" SET "amountUGX" = "amount" * 1.5, "exchangeRate" = 1.5 WHERE "currency" = 'TZS' AND "amountUGX" IS NULL;

-- Fallback: Any remaining unknown currencies treated as UGX
UPDATE "Expense" SET "amountUGX" = "amount", "exchangeRate" = 1 WHERE "amountUGX" IS NULL;
