// src/embeddings/tei-embedder.ts
import axios from "axios";
import { logError, logInfo, logSuccess, logWarning } from "../helpers/logger";
import { splitTextIntoChunks } from "../helpers/utils";
import { qdrantService } from "./qdrant-service";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { appConfigService } from "./app-config-service";

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
   * Preprocesses the input text to remove unnecessary formatting and extract meaningful content.
   *
   * This method cleans up the text by removing markdown links, HTML tags, images, code blocks,
   * and other formatting elements that do not contribute to the semantic meaning of the text.
   *
   * @param text - The input text to be preprocessed.
   * @returns A cleaned-up version of the input text, ready for further processing or embedding.
   */
  preprocess(text: string): string {
    return (
      text
        // Remove markdown links - extract only the link text
        .replace(/\[([^\]]*)\]\([^)]+\)/g, "$1")

        // Remove HTML links - extract only the inner text
        .replace(/<a[^>]*>([^<]*)<\/a>/gi, "$1")

        // Clean up any remaining anchor tags
        .replace(/<\/?a[^>]*>/gi, "")

        // Remove image references completely (they don't add semantic value)
        .replace(/!\[([^\]]*)\]\([^)]+\)/g, "")
        .replace(/<img[^>]*>/gi, "")

        // Remove markdown horizontal rules and separators
        .replace(/^\s*[-*_=]{3,}\s*$/gm, "")

        // Convert setext-style heading underlines to the heading text only
        .replace(/^(.+)\n[=]{2,}\s*$/gm, "$1")
        .replace(/^(.+)\n[-]{2,}\s*$/gm, "$1")

        // Remove bold and italic formatting
        .replace(/\*\*([^*]+)\*\*/g, "$1")
        .replace(/\*([^*]+)\*/g, "$1")
        .replace(/__([^_]+)__/g, "$1")
        .replace(/_([^_]+)_/g, "$1")

        // Remove hashtag headers but keep the text
        .replace(/^#{1,6}\s+/gm, "")

        // Remove code blocks entirely (they're often not useful for semantic search)
        .replace(/```[\s\S]*?```/g, "")
        .replace(/`([^`]+)`/g, "$1")

        // Remove list markers but keep the content
        .replace(/^\s*[-*+]\s+/gm, "")
        .replace(/^\s*\d+\.\s+/gm, "")

        // Remove table formatting
        .replace(/\|/g, " ")
        .replace(/^\s*[-:]+\s*$/gm, "")

        // Remove citation/reference markers
        .replace(/\[\d+\]/g, "")
        .replace(/\(\d+\)/g, "")

        // Remove wiki-specific markup
        .replace(/\{\{[^}]*\}\}/g, "")
        .replace(/\[\[([^\]|]+)(\|[^\]]+)?\]\]/g, "$1")

        // Remove HTML tags while preserving content
        .replace(/<(?!\/?(h[1-6]|p|div|br))[^>]*>/gi, " ")
        .replace(/<\/?(h[1-6]|p|div|br)[^>]*>/gi, " ")

        // Clean up multiple consecutive newlines
        .replace(/\n{3,}/g, "\n\n")

        // Normalize whitespace
        .replace(/[ \t]+/g, " ")
        .replace(/\n\s+/g, "\n")

        // Remove empty lines at start and end
        .trim()
    );
  }

  getSplitter() {
    return new RecursiveCharacterTextSplitter({
      chunkSize: appConfigService.config?.vector_size || 512, // Default chunk size
      chunkOverlap: 0,
      separators: [
        "\n## ", // Split on h2 headers first
        "\n### ", // Then h3 headers
        "\n#### ", // Then h4 headers
        "\n##### ", // Then h5 headers
        "\n\n", // Paragraph breaks
        "\n", // Line breaks
        ". ", // Sentences
        " ", // Words
        "", // Characters
      ],
    });
  }

  async splitTextIntoChunks(text: string) {
    const splitter = this.getSplitter();
    const preprocessedText = this.preprocess(text);
    const chunks = await splitter.splitText(preprocessedText);
    return chunks;
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
    const chunks = await this.splitTextIntoChunks(document);

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
  async generateEmbeddingsFromPages(pages: IKnowledgeDocument[]) {
    let embeddingsCount = 0;
    let chunksCount = 0;

    for (const page of pages) {
      try {
        await qdrantService.deleteVectorsByUrl(page.key);

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
            documentKey: page.key,
            isSummary: true,
            source: "web-scraper",
            projectId: page.projectId,
            knowledgeSourceId: page.knowledgeSourceId,
            knowledgeDocumentId: page._id,
          });
        }

        chunksCount += contentChunks.length;

        for (let i = 0; i < contentChunks.length; i++) {
          const chunk = contentChunks[i];
          await qdrantService.upsert(chunk.embedding, {
            url: page.url,
            title: page.title,
            text: chunk.text,
            chunkIndex: i,
            documentKey: page.key,
            isSummary: false,
            source: "web-scraper",
            projectId: page.projectId,
            knowledgeSourceId: page.knowledgeSourceId,
            knowledgeDocumentId: page._id,
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
