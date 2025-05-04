import { ClaudeProvider } from "./providers/anthropicAIProvider";
import { AIProvider } from "./providers/baseAIProvider";
import CloudflareAIProvider from "./providers/cloudflareAIProvider";
import GeminiAIProvider from "./providers/geminiAIProvider";
import OllamaAIProvider from "./providers/ollamaAIProvicer";
import { OpenAIProvider } from "./providers/openAIProvider";

export class AIRouter {
  private providers: Record<string, AIProvider> = {};

  constructor() {
    if (process.env.OPENAI_API_KEY) {
      this.providers["openai"] = new OpenAIProvider();
    }

    if (process.env.CLOUDFLARE_API_KEY) {
      this.providers["cloudflare"] = new CloudflareAIProvider();
    }

    if (process.env.OLLAMA_API_URL) {
      this.providers["ollama"] = new OllamaAIProvider();
    }

    if (process.env.ANTHROPIC_API_KEY) {
      this.providers["claude"] = new ClaudeProvider();
    }

    if (process.env.GEMINI_API_KEY) {
      this.providers["gemini"] = new GeminiAIProvider();
    }
  }

  /**
   * Retrieves an AI provider by its name.
   *
   * @param name - The name of the AI provider to retrieve.
   * @returns The AIProvider instance associated with the given name.
   * @throws {Error} If no provider is registered with the specified name.
   */
  getProvider(name: string): AIProvider {
    const provider = this.providers[name];
    if (!provider) {
      throw new Error(`AI provider ${name} not registered`);
    }
    return provider;
  }

  /**
   * Retrieves the default AI provider based on the environment variable `DEFAULT_AI_PROVIDER`.
   * If the environment variable is not set, it defaults to using "ollama" as the provider.
   *
   * @returns {AIProvider} The default AI provider instance.
   */
  getDefaultProvider(): AIProvider {
    return this.getProvider(process.env.DEFAULT_AI_PROVIDER || "ollama");
  }
}

export const aiRouter = new AIRouter();
