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
    const prefs = storage.getPreferences();
    const activeProvider = provider || prefs.defaultProvider;

    if (activeProvider === 'gemini') {
      return this.callGemini(messages);
    }

    if (activeProvider === 'openai') {
      return storage.withProviderApiKey('openai', (key) => this.callOpenAI(messages, key));
    }

    if (activeProvider === 'anthropic') {
      return storage.withProviderApiKey('anthropic', (key) => this.callAnthropic(messages, key));
    }

    throw new Error(`Provider ${activeProvider} not implemented or configured.`);
  }

  private async callGemini(messages: Message[]) {
    const envKey = process.env.GEMINI_API_KEY;

    const invokeGemini = async (apiKey: string) => {
      const ai = new GoogleGenAI({ apiKey });
      const model = ai.models.generateContent({
        model: "gemini-2.0-flash-exp",
        contents: messages.map((m) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        })),
      });

      const response = await model;
      return response.text;
    };

    if (envKey) {
      return invokeGemini(envKey);
    }

    return storage.withProviderApiKey('gemini', invokeGemini);
  }

  private async callOpenAI(messages: Message[], key: string) {
    if (!key) throw new Error("OpenAI API Key missing");
    return "OpenAI response (Mocked): ForgePad is ready to build.";
  }

  private async callAnthropic(messages: Message[], key: string) {
    if (!key) throw new Error("Anthropic API Key missing");
    return "Claude response (Mocked): I can help you with your code.";
  }

  async validateKey(provider: AIProvider, key: string): Promise<boolean> {
    if (!key) return false;
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
    return key.length > 20;
  }
}
