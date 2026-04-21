import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis;

const log =
  process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"];

function newPrismaClient() {
  return new PrismaClient({ log });
}

let prisma = globalForPrisma.prisma;

if (!prisma) {
  prisma = newPrismaClient();
} else if (
  process.env.NODE_ENV !== "production" &&
  typeof prisma.approval === "undefined"
) {
  // Dev server keeps `globalThis.prisma` across hot reloads; after `prisma generate` adds
  // models, the old client has no `approval` delegate → "Cannot read properties of undefined (reading 'findMany')".
  prisma.$disconnect().catch(() => {});
  prisma = newPrismaClient();
}

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
