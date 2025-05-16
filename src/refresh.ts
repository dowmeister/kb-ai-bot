import { configDotenv } from "dotenv";
import { initMongoose } from "./mongo";
import { logInfo, logSuccess, logWarning, logError } from "./helpers/logger";
import { QdrantService } from "./services/qdrant-service";
import { init } from "openai/_shims";
import KnowledgeDocument from "./database/models/knowledgeDocument";
import mongoose from "mongoose";

configDotenv();

/**
 * Refreshes the database by performing the following actions:
 * - Clears the "pages" collection in MongoDB.
 * - Attempts to delete the "pages" collection in Qdrant.
 * - Logs the progress and any warnings or errors encountered during the process.
 *
 * This function ensures that the database is reset to a clean state for further operations.
 * It handles errors gracefully and logs appropriate messages for debugging purposes.
 *
 * @async
 * @function
 * @throws {Error} Logs and handles any errors that occur during the database refresh process.
 */
async function refreshDatabase() {
  logInfo("Starting database refresh...");

  await initMongoose();
  const qdrant = new QdrantService();

  try {
    // Drop the MongoDB collection
    await KnowledgeDocument.deleteMany();

    logSuccess("MongoDB KnowledgeDocuments collection cleared.");

    // Drop the Qdrant collection
    try {
      qdrant.deleteCollection();
    } catch (error) {
      logWarning(
        `Qdrant collection "pages" did not exist or could not be deleted.`
      );
    }

    logSuccess("Database refresh completed successfully!");
  } catch (error) {
    logError(
      `Fatal error during database refresh: ${(error as Error).message}`
    );
  } finally {
    await mongoose.connection.close();
  }
}

refreshDatabase();
