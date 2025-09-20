import { GoogleGenAI, Type } from "@google/genai";

// Use the API Key provided by the user. In a production app, this should
// be managed securely, for example, through environment variables.
export const API_KEY = "AIzaSyAHHm1Tsy8Sd9KrKhlGbmq7EaA2y7wTaDI";

if (!API_KEY) {
  // This warning is unlikely to be triggered now but is kept for good practice.
  console.warn("API_KEY is not set.");
}

// The API key might be undefined here if not set, but the GoogleGenAI client can be initialized.
// Subsequent API calls will fail, which is handled in the functions using it.
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