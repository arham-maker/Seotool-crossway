import prisma from "./prisma";

function ensureDatabaseUrl() {
  if (!process.env.DATABASE_URL) {
    throw new Error('Invalid/Missing environment variable: "DATABASE_URL"');
  }
}

export async function checkDatabaseConnection() {
  ensureDatabaseUrl();
  await prisma.$queryRaw`SELECT 1`;
  return true;
}

export default prisma;
