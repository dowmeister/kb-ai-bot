import { aiRouter } from "./aiRouter";

/**
 * Summarizes the given text using an AI provider.
 *
 * @param text - The input text to be summarized.
 * @returns A promise that resolves to the summarized text.
 * @throws Will throw an error if the AI provider fails to summarize the text.
 */
export async function summarize(text: string): Promise<string> {
  const provider = aiRouter.getProvider("ollama");

  const result = await provider.summarize(text);

  return result;
}
