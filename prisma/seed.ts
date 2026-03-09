import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Create root department: Gasco Energy HQ
  const hq = await prisma.department.upsert({
    where: { name: "Gasco Energy HQ" },
    update: {},
    create: {
      name: "Gasco Energy HQ",
      code: "HQ",
      description: "Gasco Energy Headquarters - All company expenses roll up here",
      budget: 500000,
    },
  });

  // Create station branches under HQ
  const stations = [
    { name: "Station Alpha", code: "STN-A", description: "Northern Region Gas Station", budget: 50000 },
    { name: "Station Bravo", code: "STN-B", description: "Southern Region Gas Station", budget: 45000 },
    { name: "Station Charlie", code: "STN-C", description: "Eastern Region Gas Station", budget: 40000 },
    { name: "Station Delta", code: "STN-D", description: "Western Region Gas Station", budget: 55000 },
    { name: "Station Echo", code: "STN-E", description: "Central Hub Station", budget: 60000 },
  ];

  for (const station of stations) {
    await prisma.department.upsert({
      where: { name: station.name },
      update: {},
      create: {
        ...station,
        parentId: hq.id,
      },
    });
  }

  // Create a default global spending policy
  await prisma.spendingPolicy.upsert({
    where: { id: "default-policy" },
    update: {},
    create: {
      id: "default-policy",
      name: "Global Expense Limit",
      description: "Default spending policy for all employees",
      maxAmount: 5000,
      maxMonthly: 20000,
    },
  });

  console.log("Seed complete: HQ + 5 stations + default policy created");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
