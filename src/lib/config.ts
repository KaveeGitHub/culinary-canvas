
'use server';

/**
 * Checks if the Gemini API key is present in the environment variables.
 * @returns {boolean} True if the API key is configured, false otherwise.
 */
export async function isGeminiConfigured(): Promise<boolean> {
  return !!process.env.GEMINI_API_KEY;
}
