// lib/prisma.ts
import { PrismaClient } from "@/generated/prisma"; 

declare global {
  // allow re-use of PrismaClient in dev to avoid exhausting DB connections
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

export const prisma =
  global.prisma ??
  new PrismaClient({
    log: ["query"], // remove or change in production
  });

if (process.env.NODE_ENV !== "production") global.prisma = prisma;

export default prisma;
