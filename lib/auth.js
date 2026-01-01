import bcrypt from "bcryptjs";
import clientPromise from "./db";

export async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password, hashedPassword) {
  return bcrypt.compare(password, hashedPassword);
}

export async function getUserByEmail(email) {
  const client = await clientPromise;
  const db = client.db();
  const usersCollection = db.collection("users");
  
  const user = await usersCollection.findOne({ email });
  return user;
}

export async function createUser(email, password, name) {
  const client = await clientPromise;
  const db = client.db();
  const usersCollection = db.collection("users");
  
  try {
    const result = await usersCollection.insertOne({
      email,
      password,
      name: name || null,
      createdAt: new Date(),
    });
    
    return {
      id: result.insertedId.toString(),
      email,
      name: name || null,
    };
  } catch (error) {
    if (error.code === 11000) {
      // MongoDB duplicate key error (unique index violation)
      throw new Error("Email already exists");
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
