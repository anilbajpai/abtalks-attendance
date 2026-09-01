// Database (Prisma) is disabled — attendance is stored in Google Sheets.
// Re-enable by uncommenting below and restoring DATABASE_URL in .env
//
// import { PrismaClient } from "@prisma/client";
//
// const globalForPrisma = globalThis as unknown as {
//   prisma: PrismaClient | undefined;
// };
//
// export const prisma =
//   globalForPrisma.prisma ??
//   new PrismaClient({
//     log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
//   });
//
// if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export {};
