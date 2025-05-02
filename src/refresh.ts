import { configDotenv } from "dotenv";
import { connectMongo, getMongoClient } from "./mongo";
import { logInfo, logSuccess, logWarning, logError } from "./logger";
import { QdrantService } from "./services/qdrant-service";

configDotenv();

async function refreshDatabase() {
  logInfo("Starting database refresh...");

  const db = await connectMongo();
  const qdrant = new QdrantService();

  try {
    // Drop the MongoDB collection
    await db.collection("pages").deleteMany({});

    logSuccess("MongoDB pages collection cleared.");

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
    // Close the MongoDB connection
    await getMongoClient().close();
  }
}

refreshDatabase();
