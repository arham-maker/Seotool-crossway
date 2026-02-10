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

// Create a lazy promise that only initializes when actually awaited
// This allows the build to complete even if MONGODB_URI is not set
// The promise will only throw when actually awaited, not at module load time
function createLazyPromise() {
  let promise = null;
  
  // Return a thenable object that only initializes when accessed
  return {
    then(onFulfilled, onRejected) {
      if (!promise) {
        // Only initialize when promise is actually accessed
        try {
          promise = getClientPromise();
          
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
            
            // Create indexes for email_verification_tokens collection
            const verificationTokensCollection = db.collection("email_verification_tokens");
            await verificationTokensCollection.createIndex({ token: 1 }, { unique: true });
            await verificationTokensCollection.createIndex({ email: 1 });
            await verificationTokensCollection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
            
            // Create indexes for verification_logs collection
            const verificationLogsCollection = db.collection("verification_logs");
            await verificationLogsCollection.createIndex({ email: 1 });
            await verificationLogsCollection.createIndex({ attemptedAt: -1 });
            
          }).catch((err) => {
            // Silently fail during build - connection will be established at runtime
            if (process.env.NODE_ENV !== "production" || process.env.VERCEL !== "1") {
              console.error("Failed to create database indexes:", err);
            }
          });
        } catch (error) {
          // If MONGODB_URI is missing, create a rejected promise
          promise = Promise.reject(error);
        }
      }
      return promise.then(onFulfilled, onRejected);
    },
    catch(onRejected) {
      return this.then(null, onRejected);
    },
    finally(onFinally) {
      return this.then(
        (value) => Promise.resolve(onFinally()).then(() => value),
        (reason) => Promise.resolve(onFinally()).then(() => Promise.reject(reason))
      );
    }
  };
}

const clientPromiseLazy = createLazyPromise();

export default clientPromiseLazy;
