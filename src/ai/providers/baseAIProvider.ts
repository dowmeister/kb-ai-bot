/**
 * Interface representing an AI provider with methods for generating embeddings,
 * completing prompts, and summarizing text.
 */
export interface AIProvider {
  /**
   * Generates a numerical embedding for the given text.
   * 
   * @param text - The input text to generate the embedding for.
   * @returns A promise that resolves to an array of numbers representing the embedding.
   */
  getEmbedding(text: string): Promise<number[]>;

  /**
   * Completes a given prompt based on the provided question and context.
   * 
   * @param question - The question or prompt to be completed.
   * @param context - Additional context to guide the completion.
   * @returns A promise that resolves to the completed prompt as a string.
   */
  completePrompt(question: string, context: string, prompt?:string): Promise<string>;

  /**
   * Summarizes the given text into a concise representation.
   * 
   * @param text - The input text to summarize.
   * @returns A promise that resolves to the summarized text as a string.
   */
  summarize(text: string): Promise<string>;
}
