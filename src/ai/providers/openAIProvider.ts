import { ClientOptions, OpenAI } from "openai";
import { AIProvider } from "./baseAIProvider";
import { DEFAULT_PROMPT } from "../../helpers/constants";
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { buildPrompt } from "../../helpers/utils";

export class OpenAIProvider implements AIProvider {
  protected client: ChatOpenAI;

  constructor() {
    this.client = new ChatOpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_MODEL || "gpt-4",
    } as ClientOptions);
  }

  async getEmbedding(text: string): Promise<number[]> {
    /*
    const response = await this.client.embeddings.create({
      model: "text-embedding-ada-002",
      input: text,
    });
    return response.data[0].embedding || [];
    */
    return [];
  }

  async completePrompt(question: string, context: string): Promise<string> {
    /*    const systemPrompt = `
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
