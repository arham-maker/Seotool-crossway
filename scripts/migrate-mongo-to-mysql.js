/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const path = require("path");
const { MongoClient } = require("mongodb");
const { PrismaClient } = require("@prisma/client");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx === -1) continue;

    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function toDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function toId(value) {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (value.toString) return value.toString();
  return null;
}

async function main() {
  const root = process.cwd();
  loadEnvFile(path.join(root, ".env.local"));

  const mongoUri = process.env.MIGRATION_MONGODB_URI || process.env.MONGODB_URI;
  const databaseUrl = process.env.DATABASE_URL;

  if (!mongoUri) {
    throw new Error("Missing MongoDB source URI. Set MIGRATION_MONGODB_URI for migration.");
  }

  if (!databaseUrl) {
    throw new Error("Missing DATABASE_URL for MySQL target.");
  }

  const mongo = new MongoClient(mongoUri, { serverSelectionTimeoutMS: 15000 });
  const prisma = new PrismaClient();

  await mongo.connect();
  await prisma.$connect();

  const dbName = (() => {
    try {
      const parsed = new URL(mongoUri);
      return parsed.pathname.replace("/", "") || "crossway";
    } catch {
      return "crossway";
    }
  })();

  const db = mongo.db(dbName);
  console.log(`Connected to MongoDB database: ${db.databaseName}`);

  // 1) Users
  const mongoUsers = await db.collection("users").find({}).toArray();
  const knownUserIds = new Set();
  const createdByBackfill = [];

  for (const row of mongoUsers) {
    const userId = toId(row._id);
    if (!userId) continue;

    const normalizedEmail = String(row.email || "").toLowerCase().trim();
    if (!normalizedEmail) continue;

    knownUserIds.add(userId);
    createdByBackfill.push({
      id: userId,
      createdBy: toId(row.createdBy),
    });

    await prisma.user.upsert({
      where: { email: normalizedEmail },
      update: {
        password: row.password || "",
        name: row.name || null,
        role: row.role || "user",
        siteLink: row.siteLink || null,
        isActive: row.isActive !== false,
        emailVerified: row.emailVerified === true,
        status: row.status || (row.emailVerified ? "active" : "pending"),
        emailVerifiedAt: toDate(row.emailVerifiedAt),
        createdAt: toDate(row.createdAt) || new Date(),
        updatedAt: toDate(row.updatedAt) || new Date(),
        deletedAt: toDate(row.deletedAt),
      },
      create: {
        id: userId,
        email: normalizedEmail,
        password: row.password || "",
        name: row.name || null,
        role: row.role || "user",
        siteLink: row.siteLink || null,
        isActive: row.isActive !== false,
        emailVerified: row.emailVerified === true,
        status: row.status || (row.emailVerified ? "active" : "pending"),
        emailVerifiedAt: toDate(row.emailVerifiedAt),
        createdAt: toDate(row.createdAt) || new Date(),
        updatedAt: toDate(row.updatedAt) || new Date(),
        deletedAt: toDate(row.deletedAt),
      },
    });

    const siteSet = new Set([
      ...(Array.isArray(row.accessibleSites) ? row.accessibleSites : []),
      ...(row.siteLink ? [row.siteLink] : []),
    ]);

    for (const siteLink of siteSet) {
      if (!siteLink) continue;
      await prisma.userAccessibleSite.upsert({
        where: {
          userId_siteLink: {
            userId,
            siteLink: String(siteLink),
          },
        },
        update: {},
        create: {
          userId,
          siteLink: String(siteLink),
        },
      });
    }
  }

  for (const item of createdByBackfill) {
    if (!item.createdBy || !knownUserIds.has(item.createdBy)) continue;
    await prisma.user.updateMany({
      where: { id: item.id },
      data: { createdBy: item.createdBy },
    });
  }

  // 2) Password reset tokens
  const mongoResetTokens = await db.collection("password_reset_tokens").find({}).toArray();
  for (const row of mongoResetTokens) {
    if (!row.token) continue;
    const normalizedEmail = String(row.email || "").toLowerCase().trim();
    if (!normalizedEmail) continue;

    await prisma.passwordResetToken.upsert({
      where: { token: row.token },
      update: {
        email: normalizedEmail,
        expiresAt: toDate(row.expiresAt) || new Date(),
        used: row.used === true,
        usedAt: toDate(row.usedAt),
        createdAt: toDate(row.createdAt) || new Date(),
      },
      create: {
        id: toId(row._id) || undefined,
        email: normalizedEmail,
        token: row.token,
        expiresAt: toDate(row.expiresAt) || new Date(),
        used: row.used === true,
        usedAt: toDate(row.usedAt),
        createdAt: toDate(row.createdAt) || new Date(),
      },
    });
  }

  // 3) Email verification tokens
  const mongoVerificationTokens = await db.collection("email_verification_tokens").find({}).toArray();
  for (const row of mongoVerificationTokens) {
    if (!row.token) continue;
    const normalizedEmail = String(row.email || "").toLowerCase().trim();
    if (!normalizedEmail) continue;

    await prisma.emailVerificationToken.upsert({
      where: { token: row.token },
      update: {
        email: normalizedEmail,
        expiresAt: toDate(row.expiresAt) || new Date(),
        used: row.used === true,
        usedAt: toDate(row.usedAt),
        invalidatedAt: toDate(row.invalidatedAt),
        createdAt: toDate(row.createdAt) || new Date(),
      },
      create: {
        id: toId(row._id) || undefined,
        email: normalizedEmail,
        token: row.token,
        expiresAt: toDate(row.expiresAt) || new Date(),
        used: row.used === true,
        usedAt: toDate(row.usedAt),
        invalidatedAt: toDate(row.invalidatedAt),
        createdAt: toDate(row.createdAt) || new Date(),
      },
    });
  }

  // 4) Verification logs
  const mongoLogs = await db.collection("verification_logs").find({}).toArray();
  for (const row of mongoLogs) {
    const userId = toId(row.userId);
    await prisma.verificationLog.create({
      data: {
        id: toId(row._id) || undefined,
        token: row.token ? String(row.token) : null,
        email: String(row.email || "unknown").toLowerCase().trim(),
        userId: userId && knownUserIds.has(userId) ? userId : null,
        success: row.success === true,
        reason: row.reason ? String(row.reason) : null,
        ip: row.ip ? String(row.ip) : null,
        attemptedAt: toDate(row.attemptedAt) || new Date(),
      },
    }).catch(async (error) => {
      // Keep migration idempotent for logs.
      if (error.code === "P2002") return;
      throw error;
    });
  }

  console.log("Migration completed successfully.");
  console.log(`Users: ${mongoUsers.length}`);
  console.log(`Password reset tokens: ${mongoResetTokens.length}`);
  console.log(`Email verification tokens: ${mongoVerificationTokens.length}`);
  console.log(`Verification logs: ${mongoLogs.length}`);

  await prisma.$disconnect();
  await mongo.close();
}

main().catch(async (error) => {
  console.error("Migration failed:", error.message);
  process.exitCode = 1;
});
