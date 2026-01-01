import { MongoClient } from "mongodb";

if (!process.env.MONGODB_URI) {
  throw new Error('Invalid/Missing environment variable: "MONGODB_URI"');
}

const uri = process.env.MONGODB_URI;
const options = {};

let client;
let clientPromise;

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

// Create indexes on first connection
clientPromise.then(async (client) => {
  const db = client.db();
  
  // Create indexes for users collection
  const usersCollection = db.collection("users");
  await usersCollection.createIndex({ email: 1 }, { unique: true });
  
  // Create indexes for password_reset_tokens collection
  const tokensCollection = db.collection("password_reset_tokens");
  await tokensCollection.createIndex({ token: 1 });
  await tokensCollection.createIndex({ email: 1 });
  await tokensCollection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  
  // Create indexes for reports collection
  const reportsCollection = db.collection("reports");
  await reportsCollection.createIndex({ userId: 1 });
  await reportsCollection.createIndex({ generatedAt: -1 });
});

export default clientPromise;
