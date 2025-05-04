import { AIProvider } from "./baseAIProvider";
import { DEFAULT_PROMPT } from "../constants";
import { createUserContent, GoogleGenAI } from "@google/genai";

export default class GeminiAIProvider implements AIProvider {
  private apiKey: string = process.env.GEMINI_API_KEY || "";
  protected client: GoogleGenAI;

  constructor() {
    this.client = new GoogleGenAI({
      apiKey: this.apiKey,
    });
  }

  async getEmbedding(text: string): Promise<number[]> {
    const result = await this.client.models.embedContent({
      contents: text,
      model: "text-embedding-004",
    });
    return (result.embeddings && result.embeddings[0]?.values) || [];
  }

  async completePrompt(question: string, context: string): Promise<string> {
    const systemPrompt = `
  ${DEFAULT_PROMPT}
    `.trim();

    const chat = this.client.chats.create({
      config: {
        systemInstruction: systemPrompt + `\n\nContext:\n${context}`,
      },
      model: process.env.GEMINI_MODEL || "gemini-2.0-flash",
    });

    const response = await chat.sendMessage({
      message: question,
    });

    return response.text || "";
  }

  public async summarize(text: string): Promise<string> {
    return "";
  }
}
