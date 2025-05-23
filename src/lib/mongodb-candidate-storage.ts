
// src/lib/mongodb-candidate-storage.ts
'use server';

import { MongoClient, ServerApiVersion, type Document } from 'mongodb';

interface CandidateDataRecord {
  timestamp: string;
  resumeLanguage: string;
  jobDescriptionSource: 'text' | 'url';
  jobOfferIdentifier: string; // Truncated text or URL
  resumeSource: 'text' | 'pdf';
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
    throw new Error('MongoDB URI is not defined in environment variables.');
  }
  if (client && client.topology && client.topology.isConnected()) {
    return client;
  }
  client = new MongoClient(MONGODB_URI, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    }
  });
  try {
    await client.connect();
    console.log("Successfully connected to MongoDB.");
  } catch (error) {
    console.error("Failed to connect to MongoDB", error);
    // Optionally, you might want to reset the client to null to allow retries
    // client = null; 
    throw error; // Re-throw to indicate connection failure
  }
  return client;
}


export async function saveCandidateDataToMongoDB(data: Omit<CandidateDataRecord, 'timestamp'>): Promise<void> {
  if (!MONGODB_URI || !MONGODB_DB_NAME || !MONGODB_COLLECTION_NAME) {
    console.error('MongoDB environment variables (MONGODB_URI, MONGODB_DB_NAME, MONGODB_COLLECTION_NAME) are not properly configured.');
    // In a real app, you might throw an error or have a more robust error handling
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
    console.log(`Candidate data saved to MongoDB with ID: ${result.insertedId}`);
  } catch (error) {
    console.error('Failed to save candidate data to MongoDB:', error);
    // Do not let storage failure break the main AI flow for the user
    // In a production app, you might add more sophisticated error handling/logging here
  }
  // Note: It's generally better to manage client connections (open/close) carefully.
  // For serverless functions, you might connect once per function invocation or use a global client.
  // Here, we keep the client connected for subsequent calls in the same instance lifecycle.
  // await client.close(); // Consider if/when to close the client connection based on your app's lifecycle.
}

// Optional: A function to gracefully close the MongoDB connection when the app shuts down
// This is more relevant for long-running server applications than serverless functions.
export async function closeMongoDBConnection(): Promise<void> {
  if (client) {
    try {
      await client.close();
      console.log("MongoDB connection closed.");
      client = null;
    } catch (error) {
      console.error("Failed to close MongoDB connection", error);
    }
  }
}
