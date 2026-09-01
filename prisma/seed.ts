// DATABASE SEED DISABLED — employees and holidays are in src/lib/constants.ts
// Attendance is stored in Google Sheets.
//
// import { PrismaClient } from "@prisma/client";
// import { ADMIN_EMAILS, EMPLOYEES, HOLIDAYS_2026 } from "../src/lib/constants";
// import { splitSalary } from "../src/lib/attendance-rules";
//
// const prisma = new PrismaClient();
//
// async function main() {
//   console.log("Seeding database...");
//   // ... see git history for full seed script
// }
//
// main()
//   .catch((e) => {
//     console.error(e);
//     process.exit(1);
//   })
//   .finally(async () => {
//     await prisma.$disconnect();
//   });
