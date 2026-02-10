import bcrypt from "bcryptjs";
import crypto from "crypto";
import clientPromise from "./db";

export async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password, hashedPassword) {
  return bcrypt.compare(password, hashedPassword);
}

/**
 * Hash a verification token for secure storage
 * @param {string} token - Raw token
 * @returns {string} SHA-256 hashed token
 */
export function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function getUserByEmail(email) {
  try {
    const client = await clientPromise;
    const db = client.db();
    const usersCollection = db.collection("users");
    
    const user = await usersCollection.findOne({ email });
    return user;
  } catch (error) {
    // Re-throw with more context
    if (error.message?.includes("MONGODB_URI") || error.message?.includes("Invalid/Missing")) {
      throw new Error("Database configuration error: MONGODB_URI is not properly configured");
    }
    if (error.message?.includes("connection") || error.message?.includes("timeout")) {
      throw new Error("Database connection error: Unable to connect to MongoDB");
    }
    throw error;
  }
}

export async function getUserById(userId) {
  const client = await clientPromise;
  const db = client.db();
  const usersCollection = db.collection("users");
  
  const { ObjectId } = await import("mongodb");
  const user = await usersCollection.findOne({ _id: new ObjectId(userId) });
  return user;
}

export async function getAllUsers(includeInactive = false) {
  const client = await clientPromise;
  const db = client.db();
  const usersCollection = db.collection("users");
  
  const query = includeInactive ? {} : { isActive: true };
  const users = await usersCollection
    .find(query, { projection: { password: 0 } })
    .sort({ createdAt: -1 })
    .toArray();
  
  return users.map((user) => ({
    id: user._id.toString(),
    email: user.email,
    name: user.name,
    role: user.role || "user",
    siteLink: user.siteLink || null,
    accessibleSites: user.accessibleSites || [],
    isActive: user.isActive !== false,
    emailVerified: user.emailVerified || false,
    status: user.status || (user.emailVerified ? "active" : "pending"),
    createdAt: user.createdAt,
    createdBy: user.createdBy || null,
  }));
}

export async function updateUser(userId, updates) {
  const client = await clientPromise;
  const db = client.db();
  const usersCollection = db.collection("users");
  
  const { ObjectId } = await import("mongodb");
  const updateData = { ...updates, updatedAt: new Date() };
  
  // Don't allow password updates through this function
  delete updateData.password;
  
  const result = await usersCollection.updateOne(
    { _id: new ObjectId(userId) },
    { $set: updateData }
  );
  
  return result.modifiedCount > 0;
}

export async function deleteUser(userId) {
  const client = await clientPromise;
  const db = client.db();
  const usersCollection = db.collection("users");
  
  const { ObjectId } = await import("mongodb");
  // Soft delete - mark as inactive
  const result = await usersCollection.updateOne(
    { _id: new ObjectId(userId) },
    { $set: { isActive: false, deletedAt: new Date() } }
  );
  
  return result.modifiedCount > 0;
}

export async function assignSiteLink(userId, siteLink) {
  const client = await clientPromise;
  const db = client.db();
  const usersCollection = db.collection("users");
  
  const { ObjectId } = await import("mongodb");
  const result = await usersCollection.updateOne(
    { _id: new ObjectId(userId) },
    { 
      $set: { 
        siteLink,
        updatedAt: new Date(),
      },
      $addToSet: { accessibleSites: siteLink }
    }
  );
  
  return result.modifiedCount > 0;
}

export async function assignAccessibleSites(userId, siteLinks) {
  const client = await clientPromise;
  const db = client.db();
  const usersCollection = db.collection("users");
  
  const { ObjectId } = await import("mongodb");
  const result = await usersCollection.updateOne(
    { _id: new ObjectId(userId) },
    { 
      $set: { 
        accessibleSites: Array.isArray(siteLinks) ? siteLinks : [siteLinks],
        updatedAt: new Date(),
      }
    }
  );
  
  return result.modifiedCount > 0;
}

export async function createUser(email, password, name, role = "user", siteLink = null, createdBy = null, options = {}) {
  const { skipVerification = false } = options;
  try {
    const client = await clientPromise;
    const db = client.db();
    const usersCollection = db.collection("users");
    
    try {
      const result = await usersCollection.insertOne({
        email,
        password,
        name: name || null,
        role: role || "user",
        siteLink: siteLink || null,
        accessibleSites: siteLink ? [siteLink] : [],
        createdAt: new Date(),
        createdBy: createdBy || null,
        isActive: !skipVerification ? false : true, // Inactive until verified
        emailVerified: skipVerification ? true : false,
        status: skipVerification ? "active" : "pending",
      });
      
      return {
        id: result.insertedId.toString(),
        email,
        name: name || null,
        role: role || "user",
        siteLink: siteLink || null,
        emailVerified: skipVerification ? true : false,
        status: skipVerification ? "active" : "pending",
      };
    } catch (error) {
      if (error.code === 11000) {
        // MongoDB duplicate key error (unique index violation)
        throw new Error("Email already exists");
      }
      throw error;
    }
  } catch (error) {
    // Re-throw with more context
    if (error.message?.includes("MONGODB_URI") || error.message?.includes("Invalid/Missing")) {
      throw new Error("Database configuration error: MONGODB_URI is not properly configured");
    }
    if (error.message?.includes("connection") || error.message?.includes("timeout")) {
      throw new Error("Database connection error: Unable to connect to MongoDB");
    }
    // Re-throw original error if it's already a known error
    if (error.message === "Email already exists") {
      throw error;
    }
    throw error;
  }
}

export async function createPasswordResetToken(email, token, expiresAt) {
  const client = await clientPromise;
  const db = client.db();
  const tokensCollection = db.collection("password_reset_tokens");
  
  await tokensCollection.insertOne({
    email,
    token,
    expiresAt: new Date(expiresAt),
    used: false,
    createdAt: new Date(),
  });
}

export async function getPasswordResetToken(token) {
  const client = await clientPromise;
  const db = client.db();
  const tokensCollection = db.collection("password_reset_tokens");
  
  const resetToken = await tokensCollection.findOne({
    token,
    used: false,
    expiresAt: { $gt: new Date() },
  });
  
  return resetToken;
}

export async function markTokenAsUsed(token) {
  const client = await clientPromise;
  const db = client.db();
  const tokensCollection = db.collection("password_reset_tokens");
  
  await tokensCollection.updateOne(
    { token },
    { $set: { used: true } }
  );
}

export async function updateUserPassword(email, newPassword) {
  const client = await clientPromise;
  const db = client.db();
  const usersCollection = db.collection("users");
  
  await usersCollection.updateOne(
    { email },
    { $set: { password: newPassword } }
  );
}

// ==========================================
// Email Verification Token Functions
// ==========================================

/**
 * Create an email verification token
 * @param {string} email - User email
 * @param {string} hashedToken - SHA-256 hashed token (stored in DB)
 * @param {Date|string} expiresAt - Expiration date
 */
export async function createEmailVerificationToken(email, hashedToken, expiresAt) {
  const client = await clientPromise;
  const db = client.db();
  const tokensCollection = db.collection("email_verification_tokens");

  // Invalidate any existing tokens for this email
  await tokensCollection.updateMany(
    { email, used: false },
    { $set: { used: true, invalidatedAt: new Date() } }
  );

  await tokensCollection.insertOne({
    email,
    token: hashedToken,
    expiresAt: new Date(expiresAt),
    used: false,
    createdAt: new Date(),
  });
}

/**
 * Get a valid (non-expired, non-used) email verification token
 * @param {string} hashedToken - SHA-256 hashed token
 * @returns {Object|null} Token document or null
 */
export async function getEmailVerificationToken(hashedToken) {
  const client = await clientPromise;
  const db = client.db();
  const tokensCollection = db.collection("email_verification_tokens");

  const token = await tokensCollection.findOne({
    token: hashedToken,
    used: false,
    expiresAt: { $gt: new Date() },
  });

  return token;
}

/**
 * Mark an email verification token as used
 * @param {string} hashedToken - SHA-256 hashed token
 */
export async function markVerificationTokenAsUsed(hashedToken) {
  const client = await clientPromise;
  const db = client.db();
  const tokensCollection = db.collection("email_verification_tokens");

  await tokensCollection.updateOne(
    { token: hashedToken },
    { $set: { used: true, usedAt: new Date() } }
  );
}

/**
 * Verify a user's email and activate the account
 * @param {string} email - User email
 * @returns {Object|null} Updated user or null
 */
export async function verifyUserEmail(email) {
  const client = await clientPromise;
  const db = client.db();
  const usersCollection = db.collection("users");

  const result = await usersCollection.findOneAndUpdate(
    { email },
    {
      $set: {
        emailVerified: true,
        status: "active",
        isActive: true,
        emailVerifiedAt: new Date(),
        updatedAt: new Date(),
      },
    },
    { returnDocument: "after" }
  );

  return result;
}

/**
 * Log a verification attempt (for auditing)
 * @param {Object} logEntry - Log data
 */
export async function logVerificationAttempt(logEntry) {
  try {
    const client = await clientPromise;
    const db = client.db();
    const logsCollection = db.collection("verification_logs");

    await logsCollection.insertOne({
      ...logEntry,
      attemptedAt: new Date(),
    });
  } catch (error) {
    // Don't fail the verification if logging fails
    console.error("Failed to log verification attempt:", error.message);
  }
}

/**
 * Get all super admin users (for notifications)
 * @returns {Array} Array of super admin users
 */
export async function getSuperAdmins() {
  const client = await clientPromise;
  const db = client.db();
  const usersCollection = db.collection("users");

  const admins = await usersCollection
    .find({ role: "super_admin", isActive: true }, { projection: { email: 1, name: 1 } })
    .toArray();

  return admins;
}

/**
 * Delete pending (unverified) users older than specified days
 * @param {number} days - Number of days after which to clean up
 * @returns {number} Number of deleted users
 */
export async function cleanupExpiredPendingUsers(days = 7) {
  const client = await clientPromise;
  const db = client.db();
  const usersCollection = db.collection("users");

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  const result = await usersCollection.deleteMany({
    status: "pending",
    emailVerified: false,
    createdAt: { $lt: cutoffDate },
  });

  return result.deletedCount;
}
