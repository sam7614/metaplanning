
import { GoogleGenAI, Type } from "@google/genai";

// Create a new GoogleGenAI instance right before making an API call to ensure it always uses the most up-to-date API key.
// The API key is obtained exclusively from process.env.API_KEY.
const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export const breakdownGoal = async (goalText: string) => {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview', // Use Pro model for higher-quality reasoning tasks
      contents: `목표: "${goalText}". 이 목표를 달성하기 위한 구체적이고 실행 가능한 4가지 세부 작업을 JSON 형식으로 나누어주세요.`,
      config: {
        thinkingConfig: { thinkingBudget: 4000 },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              task: { type: Type.STRING, description: "실행 가능한 작업 내용" },
              priority: { type: Type.STRING, description: "우선순위 (A, B, 또는 C)" },
            },
            required: ["task", "priority"]
          }
        }
      }
    });

    // Access the text property directly (not a method).
    const text = response.text;
    return JSON.parse(text || "[]");
  } catch (error) {
    console.error("Gemini breakdown error:", error);
    return [];
  }
};

export const getDailyInspiration = async (coreValues: string[]) => {
  const ai = getAI();
  try {
    const valuesContext = coreValues.length > 0 
      ? `나의 핵심 가치: ${coreValues.join(", ")}.` 
      : "성장과 몰입을 중시합니다.";
      
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview', // Use Flash model for faster responses for simple tasks
      contents: `${valuesContext} 오늘 하루의 몰입을 돕는 강력하고 영감을 주는 짧은 명언 한 문장을 작성해주세요.`,
    });
    // Access the text property directly.
    const text = response.text;
    return text ? text.replace(/"/g, '') : "오늘의 집중이 내일의 성공을 만듭니다.";
  } catch (error) {
    console.error("Gemini inspiration error:", error);
    return "당신의 오늘이 어제보다 더 빛나기를 응원합니다.";
  }
};
