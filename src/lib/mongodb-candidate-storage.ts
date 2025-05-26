
// src/lib/mongodb-candidate-storage.ts
'use server';

import { MongoClient, ServerApiVersion, type Document } from 'mongodb';

// Define interfaces for nested structures
interface ExperienciaLaboral {
  puesto?: string;
  empresa?: string;
  fechas?: string;
  descripcion?: string;
}

interface Educacion {
  titulo?: string;
  institucion?: string;
  fechas?: string;
}

// Updated CandidateDataRecord interface
interface CandidateDataRecord {
  timestamp: string;
  jobDescriptionSource: 'text' | 'url';
  jobOfferIdentifier: string;
  resumeSource: 'text' | 'file';
  resumeIdentifier: string;
  compatibilityScore?: number;
  compatibilityExplanation?: string;
  
  // New structured fields from candidate's CV
  nombre?: string;
  email?: string;
  experienciaLaboral?: ExperienciaLaboral[];
  educacion?: Educacion[];
  habilidades?: string[];
  cvTextoCrudo?: string; // Raw text of the CV
  
  // Retained for context if needed, or could be part of jobOfferIdentifier
  fullJobDescriptionText?: string; 
  resumeLanguage?: string; // Language of the resume provided by user
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

  console.log(`Creating new MongoDB client instance for URI: ${MONGODB_URI.substring(0, MONGODB_URI.indexOf('@') > 0 ? MONGODB_URI.indexOf('@') : MONGODB_URI.length)}...`);
  client = new MongoClient(MONGODB_URI, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
    tls: true,
  });

  try {
    await client.connect();
    console.log("Successfully connected to MongoDB.");
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
    client = null;
    throw error;
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
