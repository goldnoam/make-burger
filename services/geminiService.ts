import { GoogleGenAI } from "@google/genai";

// Initialize Gemini
// NOTE: In a real production app, these calls should be proxied through a backend.
// For this demo, we use process.env.API_KEY as per instructions.

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateFiredNotice = async (level: number, salary: number, failureReason: string): Promise<string> => {
  try {
    const model = ai.models;
    const response = await model.generateContent({
      model: 'gemini-2.5-flash',
      contents: `
        You are a ruthless, angry, shouting restaurant owner (like Gordon Ramsay).
        Write a short, funny, and mean "Fired Notice" for a chef who failed at level ${level}.
        They earned a salary of $${salary}.
        The reason they failed: ${failureReason}.
        Keep it under 50 words. Start with "YOU ARE FIRED!".
      `,
      config: {
        temperature: 0.9,
      }
    });
    return response.text.trim();
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "YOU ARE FIRED! GET OUT OF MY KITCHEN! (AI Connection Lost)";
  }
};

export const generatePromotionMessage = async (level: number, bonus: number): Promise<string> => {
  try {
    const model = ai.models;
    const response = await model.generateContent({
      model: 'gemini-2.5-flash',
      contents: `
        You are a supportive but demanding restaurant owner.
        Congratulate a chef for completing level ${level}.
        Mention they earned a bonus of $${bonus}.
        Give them a weird, random tip for the next level involving burgers.
        Keep it under 40 words.
      `,
      config: {
        temperature: 0.8,
      }
    });
    return response.text.trim();
  } catch (error) {
    console.error("Gemini API Error:", error);
    return `Great job! Here is your bonus of $${bonus}. Get ready for the next rush!`;
  }
};