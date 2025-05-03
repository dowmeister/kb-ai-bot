// src/embeddings/tei-embedder.ts
import axios from "axios";
import { logError, logInfo, logSuccess, logWarning } from "../logger";
import { splitTextIntoChunks } from "../utils";
import { qdrantService } from "./qdrant-service";

export class TextEmbeddingsInferenceService {
  private apiUrl: string;

  /**
   * Initializes the EmbeddingService instance by setting the API URL.
   * The API URL is retrieved from the `EMBEDDING_SERVER_URL` environment variable.
   * If the environment variable is not set, it defaults to "http://localhost:8088".
   */
  constructor() {
    this.apiUrl = process.env.EMBEDDING_SERVER_URL || "http://localhost:8088";
  }

  /**
   * Generates an embedding for the given text using an external embedding service.
   *
   * @param text - The input text for which the embedding is to be generated.
   * @returns A promise that resolves to an array of numbers representing the embedding.
   * @throws Will throw an error if the embedding generation fails.
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
   * Generates embeddings for an array of input texts by sending a request to the embedding service.
   *
   * @param texts - An array of strings for which embeddings need to be generated.
   * @returns A promise that resolves to a 2D array of numbers, where each inner array represents
   *          the embedding for a corresponding input text.
   * @throws Will throw an error if the request to the embedding service fails.
   *
   * The method handles errors by logging them. If the error originates from the server,
   * the server's response data is logged. Otherwise, a generic error message is logged.
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
   * Asynchronously generates embeddings for a given document by splitting it into chunks.
   *
   * @param document - The input document as a string to be processed and embedded.
   * @returns A promise that resolves to an array of objects, where each object contains:
   *          - `text`: The chunk of text from the document.
   *          - `embedding`: The embedding vector (array of numbers) corresponding to the chunk.
   *
   * @remarks
   * - The document is split into smaller chunks using the `splitTextIntoChunks` function.
   * - For each chunk, an embedding is generated using the `generateEmbedding` method.
   * - If an error occurs while generating an embedding for a chunk, it is logged using `logError`,
   *   and the process continues for the remaining chunks.
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

  /**
   * Generates embeddings from an array of scraped pages and stores them in the Qdrant vector database.
   *
   * This method processes each page by embedding its content and optionally its summary.
   * The embeddings are then upserted into the Qdrant database with associated metadata.
   *
   * @param pages - An array of `ScrapedPage` objects containing the content and metadata of the pages to process.
   *
   * @throws Will log an error if processing a page fails.
   *
   * The method performs the following steps:
   * - Deletes existing vectors in Qdrant associated with the "web-scraper" source.
   * - Iterates through the provided pages:
   *   - Skips pages with no content.
   *   - Embeds the page content into chunks and optionally embeds the summary.
   *   - Upserts the embeddings into Qdrant with metadata such as URL, title, text, and source.
   * - Logs the number of embeddings and chunks created.
   */
  async generateEmbeddingsFromPages(pages: ScrapedPage[]) {
    let embeddingsCount = 0;
    let chunksCount = 0;

    for (const page of pages) {
      try {
        await qdrantService.deleteVectorsByUrl(page.url);

        /*
        if (!page.summary || page.summary.length === 0) {
          logWarning(`No summary found for ${page.url}. Skipping...`);
          continue;
        }
          */

        if (!page.content || page.content.length === 0) {
          logWarning(`No content found for ${page.url}. Skipping...`);
          continue;
        }

        const contentChunks = await this.embedDocument(page.content);

        let summaryEmbedding = [];

        if (page.summary) {
          summaryEmbedding = await this.generateEmbedding(page.summary);

          await qdrantService.upsert(summaryEmbedding, {
            url: page.url,
            title: page.title,
            text: page.summary,
            key: `${Buffer.from(page.url).toString("base64")}-summary`,
            is_summary: true,
            source: "web-scraper",
          });
        }

        chunksCount += contentChunks.length;

        for (let i = 0; i < contentChunks.length; i++) {
          const chunk = contentChunks[i];
          await qdrantService.upsert(chunk.embedding, {
            url: page.url,
            title: page.title,
            text: chunk.text,
            chunk_index: i,
            key: `${Buffer.from(page.url).toString("base64")}-${i}`,
            is_summary: false,
            source: "web-scraper",
          });

          embeddingsCount++;
        }

        logInfo(
          `Processed page ${page.url} with ${contentChunks.length} chunks.`
        );
      } catch (error) {
        logError(
          `Failed to process page ${page.url}: ${(error as Error).message}`
        );
      }
    }

    logSuccess(`Created ${embeddingsCount} embeddings.`);
    logSuccess(`Indexed ${chunksCount} chunks.`);
  }
}

export const embeddingService = new TextEmbeddingsInferenceService();
