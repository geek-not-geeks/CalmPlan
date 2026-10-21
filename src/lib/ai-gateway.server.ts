import { createGoogleGenerativeAI } from "@ai-sdk/google";

/**
 * Gemini provider for syllabus / whiteboard OCR parsing. Calls Google's
 * Generative Language API directly with the server-side GEMINI_API_KEY.
 */
export function createGeminiProvider(apiKey: string) {
  return createGoogleGenerativeAI({ apiKey });
}
