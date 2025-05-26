
// src/lib/mongodb-candidate-storage.ts
'use server';

import { MongoClient, ServerApiVersion, type Document } from 'mongodb';

interface CandidateDataRecord {
  timestamp: string;
  resumeLanguage: string;
  jobDescriptionSource: 'text' | 'url';
  jobOfferIdentifier: string; // Truncated text or URL
  resumeSource: 'text' | 'file';
  resumeIdentifier: string; // Truncated text or PDF name
  compatibilityScore?: number;
  // Add other fields as needed
}

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME;
const MONGODB_COLLECTION_NAME = process.env.MONGODB_COLLECTION_NAME;

let client: MongoClient | null = null;

async function getMongoClient(): Promise<MongoClient> {
  if (!MONGODB_URI) {
    console.error("MongoDB URI is not defined in environment variables. Cannot connect.");
    throw new Error('MongoDB URI is not defined in environment variables.');
  }
  if (client) {
    try {
      // A lightweight way to check if the client is still connected/usable
      // by sending a ping. If it fails, we'll nullify the client to recreate.
      await client.db('admin').command({ ping: 1 });
      console.log("Reusing existing MongoDB client connection.");
      return client;
    } catch (pingError) {
      console.warn("MongoDB ping failed on existing client, attempting to reconnect.", pingError);
      try {
        await client.close();
      } catch (closeError) {
        console.error("Error closing potentially broken MongoDB client:", closeError);
      }
      client = null; // Force re-creation
    }
  }

  console.log(`Creating new MongoDB client instance for URI: ${MONGODB_URI.substring(0, MONGODB_URI.indexOf('@') > 0 ? MONGODB_URI.indexOf('@') : MONGODB_URI.length)}...`); // Log URI without credentials
  client = new MongoClient(MONGODB_URI, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
    tls: true, // Explicitly enable TLS
  });

  try {
    await client.connect();
    console.log("Successfully connected to MongoDB.");
    // Optional: Ping the database to confirm connection after connect()
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } catch (error) {
    console.error("Failed to connect to MongoDB:", error);
    if (client) {
      try {
        await client.close();
      } catch (closeError) {
        console.error("Error closing MongoDB client after connection failure:", closeError);
      }
    }
    client = null; // Ensure client is null if connection fails
    throw error; // Re-throw to indicate connection failure
  }
  return client;
}


export async function saveCandidateDataToMongoDB(data: Omit<CandidateDataRecord, 'timestamp'>): Promise<void> {
  if (!MONGODB_URI || !MONGODB_DB_NAME || !MONGODB_COLLECTION_NAME) {
    console.error('MongoDB environment variables (MONGODB_URI, MONGODB_DB_NAME, MONGODB_COLLECTION_NAME) are not properly configured. Data will not be saved.');
    return;
  }

  try {
    const mongoClient = await getMongoClient();
    const db = mongoClient.db(MONGODB_DB_NAME);
    const collection = db.collection<Document>(MONGODB_COLLECTION_NAME);

    const newRecord: CandidateDataRecord = {
      ...data,
      timestamp: new Date().toISOString(),
    };

    const result = await collection.insertOne(newRecord);
    console.log(`Candidate data saved to MongoDB with ID: ${result.insertedId} in collection ${MONGODB_COLLECTION_NAME} of database ${MONGODB_DB_NAME}`);
  } catch (error) {
    console.error('Failed to save candidate data to MongoDB:', error);
    // Do not let storage failure break the main AI flow for the user
  }
}

export async function closeMongoDBConnection(): Promise<void> {
  if (client) {
    try {
      await client.close();
      console.log("MongoDB connection closed.");
      client = null;
    } catch (error) {
      console.error("Failed to close MongoDB connection:", error);
    }
  }
}
