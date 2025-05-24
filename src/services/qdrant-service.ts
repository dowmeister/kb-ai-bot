// src/services/qdrant-service.ts

import { QdrantClient } from "@qdrant/js-client-rest";
import { logError, logInfo } from "../helpers/logger";
import { v4 as uuidv4 } from "uuid";

/**
 * A service class for interacting with a Qdrant vector database.
 * Provides methods for initializing collections, upserting vectors,
 * searching for similar vectors, and managing vector data by various criteria.
 *
 * @remarks
 * This service uses the QdrantClient to communicate with the Qdrant database.
 * It supports operations such as creating collections, inserting vectors,
 * searching for vectors, and deleting vectors based on filters or IDs.
 *
 * @example
 * ```typescript
 * const qdrantService = new QdrantService();
 * await qdrantService.initializeCollection();
 *
 * // Upsert a vector
 * await qdrantService.upsert([0.1, 0.2, 0.3], { url: "https://example.com" });
 *
 * // Search for similar vectors
 * const results = await qdrantService.search([0.1, 0.2, 0.3]);
 *
 * // Delete vectors by URL
 * const deletedCount = await qdrantService.deleteVectorsByUrl("https://example.com");
 * ```
 *
 * @class QdrantService
 */
export class QdrantService {
  private client: QdrantClient;
  private collectionName: string;
  private vectorSize: number;

  constructor() {
    const url = process.env.QDRANT_URI || "http://localhost:6333";
    const apiKey = process.env.QDRANT_API_KEY;
    this.collectionName = process.env.QDRANT_COLLECTION || "knowledge_base";
    this.vectorSize = parseInt(process.env.VECTOR_SIZE || "384", 10);

    this.client = new QdrantClient({
      url: url,
      ...(apiKey && { apiKey }),
    });

    this.collectionName = this.collectionName;
    this.vectorSize = this.vectorSize;
  }

  /**
   * Initialize the collection
   */
  async initializeCollection(): Promise<void> {
    try {
      // Check if collection exists
      const collections = await this.client.getCollections();
      const collectionExists = collections.collections.some(
        (c) => c.name === this.collectionName
      );

      if (!collectionExists) {
        await this.client.createCollection(this.collectionName, {
          vectors: {
            size: this.vectorSize,
            distance: "Cosine",
          },
        });
        logInfo(`Collection ${this.collectionName} created successfully.`);
      } else {
        logInfo(`Collection ${this.collectionName} already exists.`);
      }
    } catch (error) {
      logError("Error initializing collection:", error);
      throw error;
    }
  }

  async upsertMany(
    points: Array<{
      id: string;
      vector: number[];
      payload?: Record<string, any>;
    }>
  ): Promise<void> {
    try {
      await this.client.upsert(this.collectionName, {
        points,
        wait: true,
      });
    } catch (error) {
      logError("Error upserting points:", error);
      throw error;
    }
  }

  /**
   * Upserts a vector and its associated payload into the Qdrant collection.
   * If a point with the same ID already exists, it will be updated; otherwise, a new point will be created.
   *
   * @param vector - The numerical vector to be stored in the Qdrant collection.
   * @param payload - (Optional) Additional data to associate with the vector.
   * @returns A promise that resolves when the upsert operation is complete.
   * @throws Will throw an error if the upsert operation fails.
   */
  async upsert(
    vector: number[],
    payload?: QdrantEmbeddingPayload
  ): Promise<void> {
    try {
      await this.client.upsert(this.collectionName, {
        points: [
          {
            id: uuidv4(),
            vector,
            payload,
          },
        ],
        wait: true,
      });
    } catch (error: any) {
      if (error.data && error.data.status && error.data.status.error) {
        logError("Qdrant error:", error.data.status.error);
      } else {
        logError("Error upserting point:", error);
      }
      throw error;
    }
  }

  /**
   * Searches for vectors in the specified collection using the provided query vector.
   *
   * @param queryVector - The vector to search for in the collection.
   * @param limit - The maximum number of results to return. Defaults to 5.
   * @param filter - An optional filter to apply to the search results. Should be a record of key-value pairs.
   * @returns A promise that resolves to an array of search results, each containing the vector and its associated payload.
   * @throws Will throw an error if the search operation fails.
   */
  async search(
    queryVector: number[],
    limit: number = 5,
    filter?: Record<string, any>
  ): Promise<any[]> {
    try {
      const result = await this.client.search(this.collectionName, {
        vector: queryVector,
        limit,
        filter,
        with_payload: true,
        score_threshold: 0.4,
      });
      return result;
    } catch (error) {
      logError("Error searching vectors:", error);
      throw error;
    }
  }

  async deleteCollection(): Promise<void> {
    try {
      await this.client.deleteCollection(this.collectionName);
      logInfo(`Collection ${this.collectionName} deleted successfully.`);
    } catch (error) {
      logError("Error deleting collection:", error);
      throw error;
    }
  }

  /**
   * Finds vector IDs associated with a specific URL in the collection.
   *
   * This method searches the collection for vectors that match the given URL
   * and returns their IDs as strings. The search is performed using a filter
   * that matches the URL exactly.
   *
   * @param url - The URL to search for in the collection.
   * @returns A promise that resolves to an array of vector IDs as strings.
   * @throws Will throw an error if the search operation fails.
   */
  async findVectorsByUrl(url: string): Promise<string[]> {
    try {
      // Create a filter to match the URL exactly
      const filter = {
        must: [
          {
            key: "url",
            match: { value: url },
          },
        ],
      };

      // Search with the filter, asking for IDs only
      const result = await this.client.scroll(this.collectionName, {
        filter,
        limit: 100,
        with_payload: false,
        with_vector: false,
      });

      // Extract and return point IDs
      return result.points.map((point) => point.id.toString());
    } catch (error) {
      logError(`Error finding vectors for URL ${url}:`, error);
      throw error;
    }
  }

  /**
   * Deletes vectors associated with the specified URL from the collection.
   *
   * This method first counts the number of vectors that match the given URL
   * and logs a message if no vectors are found. If matching vectors exist,
   * it proceeds to delete them from the collection.
   *
   * @param url - The URL used to filter and identify the vectors to delete.
   * @returns A promise that resolves to the number of vectors deleted.
   * @throws An error if the deletion process fails.
   */
  async deleteVectorsByUrl(url: string): Promise<number> {
    try {
      // Create a filter to match the URL exactly
      const filter = {
        must: [
          {
            key: "url",
            match: { value: url },
          },
        ],
      };

      // First count how many vectors will be deleted
      const countResult = await this.client.count(this.collectionName, {
        filter,
        exact: true,
      });

      if (countResult.count === 0) {
        logInfo(`No vectors found for url ${url}. Nothing to delete.`);
        return 0;
      }

      // Delete the vectors
      await this.client.delete(this.collectionName, {
        filter,
        wait: true,
      });

      return countResult.count;
    } catch (error) {
      logError(`Error deleting vectors for URL ${url}:`, error);
      throw error;
    }
  }

  /**
   * Delete vectors by Source
   * @param source The source to delete vectors for
   * @returns Number of vectors deleted
   */
  async deleteVectorsBySource(
    source: QdrantEmbeddingPayloadSource
  ): Promise<number> {
    try {
      // Create a filter to match the URL exactly
      const filter = {
        must: [
          {
            key: "source",
            match: { value: source },
          },
        ],
      };

      // First count how many vectors will be deleted
      const countResult = await this.client.count(this.collectionName, {
        filter,
        exact: true,
      });

      if (countResult.count === 0) {
        logInfo(`No vectors found for source ${source}. Nothing to delete.`);
        return 0;
      }

      // Delete the vectors
      await this.client.delete(this.collectionName, {
        filter,
        wait: true,
      });

      return countResult.count;
    } catch (error) {
      logError(`Error deleting vectors for source ${source}:`, error);
      throw error;
    }
  }

  /**
   * Deletes a vector from the collection by its ID.
   *
   * @param id - The unique identifier of the vector to be deleted.
   * @returns A promise that resolves when the vector is successfully deleted.
   * @throws Will throw an error if the deletion operation fails.
   */
  async deleteVectorsById(id: string): Promise<void> {
    try {
      // Delete the points
      await this.client.delete(this.collectionName, {
        points: [id],
        wait: true, // Wait for the operation to complete
      });
    } catch (error) {
      logError(`Error deleting vector with ID ${id}:`, error);
      throw error;
    }
  }

  /**
   * Retrieves all vectors from the Qdrant collection that match the specified source
   * and optionally a guild ID. The method uses a scroll query to fetch the data.
   *
   * @param source - The source identifier to filter the vectors.
   * @param guildId - (Optional) The guild ID to further filter the vectors. Can be null or undefined.
   * @returns A promise that resolves to an array of vectors matching the specified criteria.
   * @throws Will throw an error if the operation fails.
   */
  async getAllVectorsBySource(
    source: QdrantEmbeddingPayloadSource,
    guildId?: string | null
  ): Promise<any[]> {
    try {
      const result = await this.client.scroll(this.collectionName, {
        filter: {
          must: [
            {
              key: "source",
              match: { value: source },
            },
            {
              key: "guild_id",
              match: { value: guildId },
            },
          ],
        },
        limit: 100,
        with_payload: true,
      });
      return result.points;
    } catch (error) {
      logError("Error getting all vectors by source:", error);
      throw error;
    }
  }

  async deleteVectorsByKey(key: string): Promise<number> {
    try {
      // Create a filter to match the URL exactly
      const filter = {
        must: [
          {
            key: "documentKey",
            match: { value: key },
          },
        ],
      };

      // First count how many vectors will be deleted
      const countResult = await this.client.count(this.collectionName, {
        filter,
        exact: true,
      });

      if (countResult.count === 0) {
        logInfo(`No vectors found for DocumentKey ${key}. Nothing to delete.`);
        return 0;
      }

      // Delete the vectors
      await this.client.delete(this.collectionName, {
        filter,
        wait: true,
      });

      return countResult.count;
    } catch (error) {
      logError(`Error deleting vectors for DocumentKey ${key}:`, error);
      throw error;
    }
  }

  async deleteVectorsByKnolwedgeSourceId(
    sourceId: string,
    projectId: string
  ): Promise<number> {
    try {
      // Create a filter to match the URL exactly
      const filter = {
        must: [
          {
            key: "knowledgeSourceId",
            match: { value: sourceId },
          },
          {
            key: "projectId",
            match: { value: projectId },
          },
        ],
      };

      // First count how many vectors will be deleted
      const countResult = await this.client.count(this.collectionName, {
        filter,
        exact: true,
      });

      if (countResult.count === 0) {
        logInfo(`No vectors found for source ${sourceId}. Nothing to delete.`);
        return 0;
      }

      // Delete the vectors
      await this.client.delete(this.collectionName, {
        filter,
        wait: true,
      });

      return countResult.count;
    } catch (error) {
      logError(`Error deleting vectors for source ${sourceId}:`, error);
      throw error;
    }
  }
}

export const qdrantService = new QdrantService();
