import "dotenv/config";
import { scrapeSite } from "./services/scraper-service";
import { saveOrUpdatePage, getAllPages } from "./mongo";
import { logInfo, logSuccess, logWarning, logError } from "./logger";
import { Command } from "commander";
import { embeddingService } from "./services/embedding-service";
import { qdrantService } from "./services/qdrant-service";

const program = new Command();

program
  .option(
    "--skip-scrape",
    "Skip scraping and use existing pages from MongoDB",
    false
  )
  .option("--force-embedding-update", "Force update of embeddings", false)
  .parse(process.argv);

const options = program.opts();

async function main() {
  const startUrl: string | undefined = process.env.START_URL;
  const skipScrape: boolean = options.skipScrape;

  if (!startUrl) {
    throw new Error("Missing START_URL in .env file");
  }

  let pages: ScrapedPage[] = [];

  if (skipScrape) {
    logInfo("Skipping scraping phase. Loading pages from MongoDB...");
    pages = await getAllPages();
  } else {
    logInfo(`Starting scraping from ${startUrl}...`);
    pages = await scrapeSite(startUrl);
    logInfo(`Found ${pages.length} pages.`);
  }

  logSuccess(`Indexed ${pages.length} pages.`);

  await qdrantService.initializeCollection();

  const pagesToUpdate = pages.filter((page) => page.shouldUpdate);

  if (pagesToUpdate.length === 0) {
    logInfo("No pages to update. Exiting...");
    return;
  }

  await embeddingService.generateEmbeddingsFromPages(
    pages.filter((page) => page.shouldUpdate)
  );

  logSuccess("Done!");
}

main()
  .catch((err) => {
    console.error("Error:", err);
  })
  .then(() => {
    process.exit(0);
  });
