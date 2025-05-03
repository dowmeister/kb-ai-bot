import "dotenv/config";
import { embeddingService } from "./services/embedding-service";
import { getAllPages } from "./mongo";
import { logInfo } from "./logger";
import { qdrantService } from "./services/qdrant-service";

async function main() {
  const pages: ScrapedPage[] = await getAllPages();

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
