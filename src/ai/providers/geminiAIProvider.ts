import { DEFAULT_PROMPT } from "../../helpers/constants";
import { AIProvider } from "./baseAIProvider";
import { createUserContent, GoogleGenAI } from "@google/genai";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { buildPrompt } from "../../helpers/utils";
import { appConfigService } from "../../services/app-config-service";

export default class GeminiAIProvider implements AIProvider {
  private apiKey: string = process.env.GEMINI_API_KEY || "";
  protected client: GoogleGenAI;

  constructor() {
    this.client = new GoogleGenAI({
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

  async completePrompt(
    question: string,
    context: string,
    prompt?: string
  ): Promise<string> {
    const systemPrompt = buildPrompt(context, prompt || DEFAULT_PROMPT);

    const chat = this.client.chats.create({
      config: {
        systemInstruction: systemPrompt,
      },
      model:
        appConfigService.config?.gemini.default_model || "gemini-2.0-flash",
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
