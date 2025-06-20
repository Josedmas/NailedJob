
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// Check for API key presence (basic check)
if (!process.env.GOOGLE_API_KEY || process.env.GOOGLE_API_KEY === "TU_API_KEY_DE_GOOGLE_AI_AQUÍ") {
  console.warn(`
****************************************************************************************
* WARNING: GOOGLE_API_KEY is not set or is still a placeholder in your .env file.      *
* Genkit AI features will not work correctly. Please set a valid GOOGLE_API_KEY.       *
* This could also lead to instability or startup issues if AI services fail to init.   *
****************************************************************************************
  `);
}

export const ai = genkit({
  plugins: [googleAI()],
  model: 'googleai/gemini-2.0-flash',
});

