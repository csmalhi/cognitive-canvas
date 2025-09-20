
import { GoogleGenAI, Type } from "@google/genai";

// Assume process.env.API_KEY is configured in the environment
const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  // In a real app, you'd want to handle this more gracefully.
  // For this context, we can proceed, and calls will fail if no key is provided.
  console.warn("API_KEY environment variable not set for Gemini.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

export const generateSearchQueries = async (text: string): Promise<string[]> => {
  if (!API_KEY) {
    console.log("No API key, returning mock queries.");
    // Return mock data if API key is not available
    const keywords = text.toLowerCase().match(/\b(\w+)\b/g) || [];
    const uniqueKeywords = [...new Set(keywords)];
    return uniqueKeywords.slice(0, 3);
  }
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `From the following sentence, extract up to 3 main keywords or concepts for a search query. Ignore common stop words. Sentence: "${text}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            queries: {
              type: Type.ARRAY,
              items: {
                type: Type.STRING,
              }
            }
          }
        },
      }
    });

    const jsonString = response.text;
    const parsed = JSON.parse(jsonString);
    return parsed.queries || [];

  } catch (error) {
    console.error("Error generating search queries with Gemini:", error);
    // Fallback to simple keyword extraction on error
    return text.toLowerCase().split(' ').slice(0, 3);
  }
};
