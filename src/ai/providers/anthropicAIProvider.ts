import Anthropic from "@anthropic-ai/sdk";
import { AIProvider } from "./baseAIProvider";
import { DEFAULT_PROMPT } from "../../helpers/constants";
import { embeddingService } from "../../services/embedding-service";
import { ChatAnthropic } from "@langchain/anthropic";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { buildPrompt } from "../../helpers/utils";

export class ClaudeProvider implements AIProvider {
  protected client: ChatAnthropic;

  constructor() {
    this.client = new ChatAnthropic({
      model: process.env.CLAUDE_MODEL || "claude-3-5-sonnet-20240620",
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  async getEmbedding(text: string): Promise<number[]> {
    return embeddingService.generateEmbedding(text);
  }

  async completePrompt(
    question: string,
    context: string,
    prompt?: string
  ): Promise<string> {
    /*
    const systemPrompt = `
    ${DEFAULT_PROMPT}
    `.trim();

    try {
      const completion = await this.client.messages.create({
        model: process.env.CLAUDE_MODEL || "claude-3-5-sonnet-20240620",
        system: systemPrompt + `\n\nContext:\n${context}`,
        messages: [{ role: "user", content: question }],
        temperature: 0.2,
        max_tokens: 4000,
      });

      // Extract the text content from the completion
      return completion.content
        .filter((block) => block.type === "text")
        .map((block) => block.text)
        .join("");
    } catch (error) {
      console.error("Error completing prompt with Claude:", error);
      throw new Error(`Failed to complete prompt: ${(error as Error).message}`);
    }
      */

    const messages = [
      new SystemMessage(buildPrompt(context, prompt || DEFAULT_PROMPT)),
      new HumanMessage(question),
    ];

    const result = await this.client.invoke(messages);

    return result.content.toString() || "";
  }

  public async summarize(text: string): Promise<string> {
    /*
    if (!text || text.trim().length === 0) {
      return "";
    }

    try {
      const completion = await this.client.messages.create({
        model: process.env.CLAUDE_MODEL || "claude-3-5-sonnet-20240620",
        system:
          "You are a highly efficient summarizer. Create concise, informative 3-5 sentence summaries that capture the key information, focusing on the most important facts, concepts, and conclusions. Your summaries should be clear, objective, and retain the essential meaning of the original content.",
        messages: [
          {
            role: "user",
            content: `Please summarize the following content in 3-5 concise sentences:\n\n${text}`,
          },
        ],
        temperature: 0.1,
        max_tokens: 150,
      });

      // Extract the text content from the completion
      return completion.content
        .filter((block) => block.type === "text")
        .map((block) => block.text)
        .join("");
    } catch (error) {
      console.error("Error summarizing with Claude:", error);
      // Return a truncated version as fallback
      return text.substring(0, 300) + "...";
    }
      */
    return "";
  }
}
