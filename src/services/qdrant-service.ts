// src/services/qdrant-service.ts

import { QdrantClient } from "@qdrant/js-client-rest";
import { logError, logInfo } from "../logger";
import { v4 as uuidv4 } from "uuid";

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

  /**
   * Upsert vectors into the collection
   */
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
   * Upsert a single vector into the collection
   */
  async upsert(vector: number[], payload?: Record<string, any>): Promise<void> {
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
   * Search for similar vectors
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
   * Find vectors by URL in payload
   * @param url The URL to search for
   * @returns Array of point IDs matching the URL
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
      console.error(`Error finding vectors for URL ${url}:`, error);
      throw error;
    }
  }

  /**
   * Delete vectors by URL
   * @param url The URL to delete vectors for
   * @returns Number of vectors deleted
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

      // Delete the vectors
      await this.client.delete(this.collectionName, {
        filter,
        wait: true,
      });

      return countResult.count;
    } catch (error) {
      console.error(`Error deleting vectors for URL ${url}:`, error);
      throw error;
    }
  }
}

export const qdrantService = new QdrantService();
