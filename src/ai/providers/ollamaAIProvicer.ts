import axios from "axios";
import { AIProvider } from "./baseAIProvider";
import { DEFAULT_PROMPT } from "../../helpers/constants";
import { appConfigService } from "../../services/app-config-service";
import { buildPrompt } from "../../helpers/utils";

export default class OllamaAIProvider implements AIProvider {
  private baseUrl: string = "http://localhost:11434";

  constructor() {
    // Constructor logic if needed
    this.baseUrl = process.env.OLLAMA_API_URL || this.baseUrl;
  }

  async getEmbedding(text: string): Promise<number[]> {
    const response = await axios.post(`${this.baseUrl}/api/embeddings`, {
      model: "nomic-embed-text",
      prompt: text,
    });
    return response.data.embedding;
  }

  async completePrompt(
    question: string,
    context: string,
    prompt?: string
  ): Promise<string> {
    const response = await axios.post(`${this.baseUrl}/api/chat`, {
      model: appConfigService.config?.ollama.default_model || "llama3",
      messages: [
        {
          role: "system",
          content: buildPrompt(context, prompt || DEFAULT_PROMPT),
        },
        { role: "user", content: question },
      ],
      stream: false,
    });

    console.log("LLM response:", response.data);

    return response.data.message.content;
  }

  public async summarize(text: string): Promise<string> {
    const response = await axios.post(`${this.baseUrl}/api/generate`, {
      model: process.env.REPLY_LLM_MODEL || "llama3",
      prompt: `Summarize the following content in 3-5 concise sentences, focusing on the main information and key points, without comments or forewords, straight to the summary:\n\n${text}`,
      stream: false,
    });

    return response.data.response;
  }
}
