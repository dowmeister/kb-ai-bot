import { ClientOptions, OpenAI } from "openai";
import { AIProvider } from "./baseAIProvider";
import { DEFAULT_PROMPT } from "../../helpers/constants";

export class OpenAIProvider implements AIProvider {
  protected client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    } as ClientOptions);
  }

  async getEmbedding(text: string): Promise<number[]> {
    const response = await this.client.embeddings.create({
      model: "text-embedding-ada-002",
      input: text,
    });
    return response.data[0].embedding || [];
  }

  async completePrompt(question: string, context: string): Promise<string> {
    const systemPrompt = `
   ${DEFAULT_PROMPT}
    `.trim();

    const completion = await this.client.chat.completions.create({
      model: "gpt-4", // or 'gpt-4' if you want
      messages: [
        { role: "system", content: systemPrompt + `\n\nContext:\n${context}` },
        { role: "user", content: question },
      ],
      temperature: 0.2,
    });

    return completion.choices[0].message.content || "";
  }

  public async summarize(text: string): Promise<string> {
    return "";
  }
}
