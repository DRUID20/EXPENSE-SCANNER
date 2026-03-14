import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create default branches
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
  console.log("Created default branches");

  // Create default Super User (admin)
  const hqBranch = await prisma.branch.findUnique({ where: { code: "HQ" } });
  const hashedPassword = await bcrypt.hash("admin123", 12);

  await prisma.user.upsert({
    where: { email: "Omar@gascoenergy.co.ug" },
    update: {},
    create: {
      email: "Omar@gascoenergy.co.ug",
      password: hashedPassword,
      firstName: "Omar",
      lastName: "Admin",
      role: "ADMIN",
      department: "Operations",
      branchId: hqBranch!.id,
    },
  });
  console.log("Created default Super User: Omar@gascoenergy.co.ug / admin123");

  console.log("Seeding complete!");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
