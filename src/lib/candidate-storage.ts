
// src/lib/candidate-storage.ts
'use server';

import fs from 'fs/promises';
import path from 'path';

const LOCAL_DATABASE_FILE = 'local_candidate_database.json';
// IMPORTANT: In a serverless environment like Firebase App Hosting, 
// writing to the project root directory will likely fail or be ephemeral.
// For production, use a proper database (e.g., Firestore).
// This path points to the project root during local development.
const dbFilePath = path.join(process.cwd(), LOCAL_DATABASE_FILE);

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

export async function saveCandidateData(data: Omit<CandidateDataRecord, 'timestamp'>): Promise<void> {
  console.log(`Attempting to save candidate data to local JSON: ${dbFilePath}`);
  try {
    let records: CandidateDataRecord[] = [];
    try {
      const fileContent = await fs.readFile(dbFilePath, 'utf-8');
      records = JSON.parse(fileContent) as CandidateDataRecord[];
      if (!Array.isArray(records)) { // Basic validation
        console.warn('Database file was not an array, re-initializing.');
        records = [];
      }
    } catch (error: any) {
      // If file doesn't exist or is invalid JSON, start with an empty array
      if (error.code === 'ENOENT') {
        console.log('Local database file not found, will create a new one.');
      } else {
        console.warn('Error reading or parsing local database file, will re-initialize:', error.message);
      }
      records = [];
    }

    const newRecord: CandidateDataRecord = {
      ...data,
      timestamp: new Date().toISOString(),
    };
    records.push(newRecord);

    await fs.writeFile(dbFilePath, JSON.stringify(records, null, 2), 'utf-8');
    console.log('Candidate data saved successfully to local JSON.');
  } catch (error: any) {
    // Log the error but don't let it break the main AI flow
    console.error('CRITICAL: Failed to save candidate data to local JSON:', error.message);
    console.error('IMPORTANT: This local JSON storage method WILL NOT WORK reliably in a deployed Firebase App Hosting environment. Use Firestore or another database for production.');
  }
}
