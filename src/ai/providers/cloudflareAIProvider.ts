import axios from "axios";
import { AIProvider } from "./baseAIProvider";
import { OpenAIProvider } from "./openAIProvider";
import OpenAI, { ClientOptions } from "openai";
import { DEFAULT_PROMPT } from "../../helpers/constants";

export default class CloudflareAIProvider implements AIProvider {
  private accountId: string = process.env.CLOUDFLARE_ACCOUNT_ID || "";
  private apiToken: string = process.env.CLOUDFLARE_API_TOKEN || "";
  protected client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      apiKey: this.apiToken,
      baseURL: `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/ai/v1`,
    } as ClientOptions);
  }

  async getEmbedding(text: string): Promise<number[]> {
    const result = await this.client.embeddings.create({
      model: "@cf/baai/bge-large-en-v1.5",
      input: text,
    });
    return result.data[0].embedding || [];
  }

  async completePrompt(question: string, context: string): Promise<string> {
    const systemPrompt = `
  ${DEFAULT_PROMPT}
    `.trim();

    const result = await this.client.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt + `\n\nContext:\n${context}` },
        { role: "user", content: question },
      ],
      temperature: 0.2,
      model: process.env.CLOUDFLARE_MODEL || "@hf/meta-llama/meta-llama-3-8b-instruct",
    });

    return result.choices[0].message.content || "";
  }

  public async summarize(text: string): Promise<string> {
    return "";
  }
}
