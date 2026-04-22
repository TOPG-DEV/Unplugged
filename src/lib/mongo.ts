import { MongoClient } from "mongodb";

// Extend Node's global type so we can cache the Mongo client across
// hot-reloads in development without using `any`. See Next.js guidance:
// https://vercel.com/guides/nextjs-prisma-postgres#using-an-orm-or-database-client
declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

const uri = process.env.MONGODB_URI;
const options = {};

if (!uri) {
  throw new Error("Please add your Mongo URI to .env");
}

let clientPromise: Promise<MongoClient>;

async function connectAndPing(client: MongoClient): Promise<MongoClient> {
  const connected = await client.connect();
  try {
    await connected.db("admin").command({ ping: 1 });
    console.log("✅ MongoDB connected successfully");
  } catch (error) {
    console.error("❌ MongoDB connection ping failed:", error);
    throw error;
  }
  return connected;
}

if (process.env.NODE_ENV === "development") {
  if (!global._mongoClientPromise) {
    const client = new MongoClient(uri, options);
    global._mongoClientPromise = connectAndPing(client);
  }
  clientPromise = global._mongoClientPromise;
} else {
  const client = new MongoClient(uri, options);
  clientPromise = connectAndPing(client);
}

export default clientPromise;
