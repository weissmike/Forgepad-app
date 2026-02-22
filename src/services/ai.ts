import { GoogleGenAI } from "@google/genai";
import { AIProvider, storage } from "./storage";

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export class AIService {
  private static instance: AIService;
  
  private constructor() {}

  static getInstance() {
    if (!AIService.instance) {
      AIService.instance = new AIService();
    }
    return AIService.instance;
  }

  async sendMessage(messages: Message[], provider?: AIProvider) {
    const creds = storage.getCredentials();
    const activeProvider = provider || creds.defaultProvider;

    if (activeProvider === 'gemini') {
      return this.callGemini(messages);
    } else if (activeProvider === 'openai') {
      return this.callOpenAI(messages, creds.openaiKey);
    } else if (activeProvider === 'anthropic') {
      return this.callAnthropic(messages, creds.anthropicKey);
    }
    
    throw new Error(`Provider ${activeProvider} not implemented or configured.`);
  }

  private async callGemini(messages: Message[]) {
    // Use the platform provided key if available, otherwise fallback to user provided
    const apiKey = process.env.GEMINI_API_KEY || storage.getCredentials().geminiKey;
    if (!apiKey) throw new Error("Gemini API Key missing");

    const ai = new GoogleGenAI({ apiKey });
    const model = ai.models.generateContent({
      model: "gemini-2.0-flash-exp", // Using a stable flash model
      contents: messages.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      })),
    });

    const response = await model;
    return response.text;
  }

  private async callOpenAI(messages: Message[], key?: string) {
    if (!key) throw new Error("OpenAI API Key missing");
    // Mocking OpenAI call for demo purposes as we don't have the SDK installed
    // In a real app, we'd use the openai package
    return "OpenAI response (Mocked): ForgePad is ready to build.";
  }

  private async callAnthropic(messages: Message[], key?: string) {
    if (!key) throw new Error("Anthropic API Key missing");
    // Mocking Anthropic call
    return "Claude response (Mocked): I can help you with your code.";
  }

  async validateKey(provider: AIProvider, key: string): Promise<boolean> {
    if (!key) return false;
    // Simple validation logic
    if (provider === 'gemini') {
      try {
        const ai = new GoogleGenAI({ apiKey: key });
        await ai.models.generateContent({
          model: "gemini-2.0-flash-exp",
          contents: "hi",
        });
        return true;
      } catch (e) {
        return false;
      }
    }
    // For others, we just check length for now in this demo
    return key.length > 20;
  }
}
