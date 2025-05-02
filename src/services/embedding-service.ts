// src/embeddings/tei-embedder.ts
import axios from "axios";
import { logError } from "../logger";
import { splitTextIntoChunks } from "../utils";

export class TextEmbeddingsInferenceService {
  private apiUrl: string;

  constructor() {
    this.apiUrl = process.env.EMBEDDING_SERVER_URL || "http://localhost:8080";
  }

  /**
   * Generate embedding for a single text
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await axios.post(`${this.apiUrl}/embed`, {
        inputs: [text],
      });

      return response.data[0];
    } catch (error) {
      logError("Error generating embedding:", error);
      throw error;
    }
  }

  /**
   * Generate embeddings for multiple texts in batch
   */
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    try {
      // TEI handles batches efficiently
      const response = await axios.post(`${this.apiUrl}/embed`, {
        inputs: texts,
      });

      return response.data;
    } catch (error: any) {
      if (error.response) {
        logError("Error response from server:", error.response.data);
      } else {
        logError("Error generating embeddings in batch:", error);
      }
      throw error;
    }
  }

  /**
   * Split and process long text
   */
  async embedDocument(
    document: string
  ): Promise<Array<{ text: string; embedding: number[] }>> {
    // Split the document into chunks
    const chunks = splitTextIntoChunks(document);

    const result: Array<{ text: string; embedding: number[] }> = [];

    for (const chunk of chunks) {
      try {
        const embedding = await this.generateEmbedding(chunk);
        result.push({ text: chunk, embedding });
      } catch (error) {
        logError("Error generating embedding for chunk:", error);
      }
    }

    return result;
  }
}

export const embeddingService = new TextEmbeddingsInferenceService();
