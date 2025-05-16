import "dotenv/config";
import { scrapeSite } from "./services/scraper-service";
import { initMongoose } from "./mongo";
import { logInfo, logSuccess, logWarning, logError } from "./helpers/logger";
import { Command } from "commander";
import { embeddingService } from "./services/embedding-service";
import { qdrantService } from "./services/qdrant-service";
import KnowledgeDocument from "./database/models/knowledgeDocument";
import mongoose, { connect } from "mongoose";

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

  await initMongoose();

  const startUrl: string | undefined = process.env.START_URL;
  const skipScrape: boolean = options.skipScrape;

  if (!startUrl) {
    throw new Error("Missing START_URL in .env file");
  }

  let scrapingResult: WebScraperResults = {
    pages: [],
  };

  if (skipScrape) {
    logInfo("Skipping scraping phase. Loading pages from MongoDB...");
    scrapingResult.pages = await KnowledgeDocument.find({});
  } else {
    logInfo(`Starting scraping from ${startUrl}...`);
    scrapingResult = await scrapeSite(startUrl);
  }

  logSuccess(`Indexed ${scrapingResult.pages.length} pages.`);

  await qdrantService.initializeCollection();

  const pagesToUpdate = scrapingResult.pages.filter(
    (page) => page.shouldUpdate
  );

  if (pagesToUpdate.length === 0) {
    logInfo("No pages to update. Exiting...");
    return;
  }

  const pagesToEmbed: IKnowledgeDocument[] = [];

  scrapingResult.pages.forEach((page) => {
    if (page.shouldUpdate) {
      pagesToEmbed.push(page.document);
    }
  });

  await embeddingService.generateEmbeddingsFromPages(pagesToEmbed);

  logSuccess("Done!");
}

main()
  .catch((err) => {
    console.error("Error:", err);
  })
  .then(() => {
    process.exit(0);
  });
