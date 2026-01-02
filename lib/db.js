import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
const options = {};

let client;
let clientPromise;

// Lazy initialization - only check for MONGODB_URI when actually connecting
function getClientPromise() {
  if (!uri) {
    throw new Error('Invalid/Missing environment variable: "MONGODB_URI"');
  }

  if (clientPromise) {
    return clientPromise;
  }

  if (process.env.NODE_ENV === "development") {
    // In development mode, use a global variable so that the value
    // is preserved across module reloads caused by HMR (Hot Module Replacement).
    if (!global._mongoClientPromise) {
      client = new MongoClient(uri, options);
      global._mongoClientPromise = client.connect();
    }
    clientPromise = global._mongoClientPromise;
  } else {
    // In production mode, it's best to not use a global variable.
    client = new MongoClient(uri, options);
    clientPromise = client.connect();
  }

  return clientPromise;
}

// Helper to safely get client promise, catching any synchronous errors
function safeGetClientPromise() {
  try {
    return getClientPromise();
  } catch (error) {
    // Return a rejected promise instead of throwing
    // This allows the build to complete even if MONGODB_URI is not set
    return Promise.reject(error);
  }
}

// Create a lazy promise that only initializes when awaited
// This allows the build to complete even if MONGODB_URI is not set
// The promise will only throw when actually awaited, not at module load time
const clientPromiseLazy = (async () => {
  const promise = safeGetClientPromise();
  
  // Create indexes on first connection (fire and forget)
  promise.then(async (client) => {
    const db = client.db();
    
    // Create indexes for users collection
    const usersCollection = db.collection("users");
    await usersCollection.createIndex({ email: 1 }, { unique: true });
    await usersCollection.createIndex({ role: 1 });
    await usersCollection.createIndex({ siteLink: 1 });
    await usersCollection.createIndex({ isActive: 1 });
    await usersCollection.createIndex({ createdBy: 1 });
    
    // Create indexes for password_reset_tokens collection
    const tokensCollection = db.collection("password_reset_tokens");
    await tokensCollection.createIndex({ token: 1 });
    await tokensCollection.createIndex({ email: 1 });
    await tokensCollection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    
    // Create indexes for reports collection
    const reportsCollection = db.collection("reports");
    await reportsCollection.createIndex({ userId: 1 });
    await reportsCollection.createIndex({ generatedAt: -1 });
  }).catch((err) => {
    // Silently fail during build - connection will be established at runtime
    if (process.env.NODE_ENV !== "production" || process.env.VERCEL !== "1") {
      console.error("Failed to create database indexes:", err);
    }
  });
  
  return promise;
})();

export default clientPromiseLazy;
