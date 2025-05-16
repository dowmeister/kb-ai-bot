import "dotenv/config";
import { embeddingService } from "./services/embedding-service";
import { initMongoose } from "./mongo";
import { logInfo } from "./helpers/logger";
import { qdrantService } from "./services/qdrant-service";
import KnowledgeDocument from "./database/models/knowledgeDocument";

async function main() {

  await initMongoose();

  const pages: IKnowledgeDocument[] = await KnowledgeDocument.find({});

  logInfo(`Found ${pages.length} pages.`);

  await qdrantService.initializeCollection();

  await embeddingService.generateEmbeddingsFromPages(pages);
}

main()
  .catch((err) => {
    console.error("Error:", err);
  })
  .then(() => {
    process.exit(0);
  });
