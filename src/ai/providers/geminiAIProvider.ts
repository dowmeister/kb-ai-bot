import { DEFAULT_PROMPT } from "../../helpers/constants";
import { AIProvider } from "./baseAIProvider";
import { createUserContent, GoogleGenAI } from "@google/genai";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { buildPrompt } from "../../helpers/utils";

export default class GeminiAIProvider implements AIProvider {
  private apiKey: string = process.env.GEMINI_API_KEY || "";
  protected client: ChatGoogleGenerativeAI;

  constructor() {
    this.client = new ChatGoogleGenerativeAI({
      model: process.env.GEMINI_MODEL || "gemini-2.0-flash",
      apiKey: this.apiKey,
    });
  }

  async getEmbedding(text: string): Promise<number[]> {
    /*
    const result = await this.client.models.embedContent({
      contents: text,
      model: "text-embedding-004",
    });
    return (result.embeddings && result.embeddings[0]?.values) || [];
    */
    return [];
  }

  async completePrompt(question: string, context: string): Promise<string> {
    /*
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

    */
    const messages = [
      new SystemMessage(buildPrompt(context)),
      new HumanMessage(question),
    ];

    const result = await this.client.invoke(messages);

    return result.content.toString() || "";
  }

  public async summarize(text: string): Promise<string> {
    return "";
  }
}
