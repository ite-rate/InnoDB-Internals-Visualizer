import { GoogleGenAI } from "@google/genai";
import { EngineState } from "../types";

export const analyzeEngineState = async (state: EngineState): Promise<string> => {
  if (!process.env.API_KEY) {
    return "API Key is missing. Cannot generate explanation.";
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Prepare a simplified JSON representation for the LLM
    const simplePages = state.pages.map(p => ({
      page_id: p.id,
      records: p.records.map(r => r.id),
      next_page: p.nextPageId,
      prev_page: p.prevPageId,
      status: p.records.length >= 4 ? "FULL" : "HAS_SPACE"
    }));

    const prompt = `
      You are an expert Database Engineer. Analyze the following simplified InnoDB Leaf Node structure (Linked List of Pages).
      State: ${JSON.stringify(simplePages, null, 2)}
      
      Explain the current state of the storage engine to a student.
      Focus on:
      1. How the data is distributed across pages.
      2. The sorting order (Primary Key).
      3. Any recent splits or full pages (Capacity is 4).
      4. The structure of the Doubly Linked List.
      
      Keep it concise (max 3 sentences) and encouraging.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "Could not generate analysis.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Failed to connect to AI assistant. Please check your API key or try again.";
  }
};