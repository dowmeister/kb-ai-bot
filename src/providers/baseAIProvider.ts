export interface AIProvider {
  getEmbedding(text: string): Promise<number[]>;
  completePrompt(question: string, context:string): Promise<string>;
  summarize(text: string): Promise<string>;
}
