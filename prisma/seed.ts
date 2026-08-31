import { PrismaClient } from "@prisma/client";
import { ADMIN_EMAILS, EMPLOYEES, HOLIDAYS_2026 } from "../src/lib/constants";
import { splitSalary } from "../src/lib/attendance-rules";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  for (const holiday of HOLIDAYS_2026) {
    await prisma.holiday.upsert({
      where: { date: holiday.date },
      update: { name: holiday.name, type: holiday.type },
      create: holiday,
    });
  }
  console.log(`Seeded ${HOLIDAYS_2026.length} holidays`);

  for (const adminEmail of ADMIN_EMAILS) {
    const name = adminEmail.includes("anil") ? "Anil Bajpai" : "Divya Shukla";
    await prisma.user.upsert({
      where: { email: adminEmail.toLowerCase() },
      update: { role: "ADMIN", name },
      create: {
        email: adminEmail.toLowerCase(),
        name,
        role: "ADMIN",
        baseSalary: 0,
        fixedSalary: 0,
        variableSalary: 0,
      },
    });
  }
  console.log(`Seeded ${ADMIN_EMAILS.length} admins`);

  for (const emp of EMPLOYEES) {
    const { fixed, variable } = splitSalary(emp.baseSalary);
    await prisma.user.upsert({
      where: { email: emp.email.toLowerCase() },
      update: {
        name: emp.name,
        baseSalary: emp.baseSalary,
        fixedSalary: fixed,
        variableSalary: variable,
      },
      create: {
        email: emp.email.toLowerCase(),
        name: emp.name,
        role: "EMPLOYEE",
        baseSalary: emp.baseSalary,
        fixedSalary: fixed,
        variableSalary: variable,
      },
    });
  }
  console.log(`Seeded ${EMPLOYEES.length} employees`);

  console.log("Seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
