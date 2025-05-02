import { AmazonBedrockAIProvider } from "./providers/amazonBedrockAIProvider";
import { ClaudeProvider } from "./providers/anthropicAIProvider";
import { AIProvider } from "./providers/baseAIProvider";
import CloudflareAIProvider from "./providers/cloudflareAIProvider";
import OllamaAIProvider from "./providers/ollamaAIProvicer";
import { OpenAIProvider } from "./providers/openAIProvider";

export class AIRouter {
  private providers: Record<string, AIProvider> = {};

  constructor() {
    this.providers["openai"] = new OpenAIProvider();
    this.providers["cloudflare"] = new CloudflareAIProvider();
    this.providers["bedrock"] = new AmazonBedrockAIProvider();
    this.providers["ollama"] = new OllamaAIProvider();
    this.providers["claude"] = new ClaudeProvider();
  }

  getProvider(name: string): AIProvider {
    const provider = this.providers[name];
    if (!provider) {
      throw new Error(`AI provider ${name} not registered`);
    }
    return provider;
  }

  getDefaultProvider(): AIProvider {
    return this.getProvider(process.env.DEFAULT_AI_PROVIDER || "ollama");
  }
}

export const aiRouter = new AIRouter();