import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";
import { AIProvider } from "./baseAIProvider";

export class AmazonBedrockAIProvider implements AIProvider {
  private client: BedrockRuntimeClient;

  private region: string = process.env.AWS_REGION || "us-east-1";
  private credentials: any = {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  };

  constructor() {
    this.client = new BedrockRuntimeClient({
      region: this.region,
      credentials: this.credentials,
    });
  }

  async getEmbedding(text: string): Promise<number[]> {
    throw new Error("Bedrock embedding not implemented yet.");
  }

  async completePrompt(prompt: string): Promise<string> {
    const command = new InvokeModelCommand({
      modelId: "anthropic.claude-v2",
      contentType: "application/json",
      body: JSON.stringify({
        prompt,
        max_tokens_to_sample: 300,
      }),
    });

    const response = await this.client.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    return responseBody.completion ?? "";
  }

  public async summarize(text: string): Promise<string> {
    return "";
  }
}
