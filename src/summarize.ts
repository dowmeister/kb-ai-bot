import { aiRouter } from "./aiRouter";

export async function summarize(text: string): Promise<string> {
  const provider = aiRouter.getProvider("ollama");

  const result = await provider.summarize(text);

  return result;
}
