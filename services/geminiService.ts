import { GoogleGenAI, Type } from "@google/genai";
import { GOOGLE_API_KEY } from "../config";

const ai = new GoogleGenAI({ apiKey: GOOGLE_API_KEY });

export const generateSearchQueries = async (text: string): Promise<string[]> => {
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
    console.log("Falling back to simple keyword extraction due to an error with the Gemini API.");
    const keywords = text.toLowerCase().match(/\b(\w+)\b/g) || [];
    const uniqueKeywords = [...new Set(keywords)];
    return uniqueKeywords.slice(0, 3);
  }
};