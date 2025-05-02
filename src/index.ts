import { scrapeSite } from "./services/scraper-service";
import { saveOrUpdatePage, getAllPages } from "./mongo";
import { configDotenv } from "dotenv";
import { logInfo, logSuccess, logWarning, logError } from "./logger";
import { Command } from "commander";
import { embeddingService } from "./services/embedding-service";
import { qdrantService } from "./services/qdrant-service";

configDotenv(); // Carica le variabili da .env

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

  let embeddingsCount = 0;
  let chunksCount = 0;

  await qdrantService.deleteCollection();
  await qdrantService.initializeCollection();

  for (const page of pages) {
    if (page.shouldUpdate) {
      logInfo(
        `Content for ${page.url} needs updating. Removing old vectors...`
      );

      // Delete all existing vectors for this URL
      const deletedCount = await qdrantService.deleteVectorsByUrl(page.url);
      logInfo(`Deleted ${deletedCount} existing vectors for ${page.url}`);
    }

    try {
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

      const contentChunks = await embeddingService.embedDocument(page.content);

      let summaryEmbedding = [];

      if (page.summary) {
        summaryEmbedding = await embeddingService.generateEmbedding(
          page.summary
        );

        await qdrantService.upsert(summaryEmbedding, {
          url: page.url,
          title: page.title,
          text: page.summary,
          key: `${Buffer.from(page.url).toString("base64")}-summary`,
          is_summary: true,
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

  logSuccess(`Indexed ${pages.length} pages.`);
  logSuccess(`Created ${embeddingsCount} embeddings.`);
  logSuccess(`Indexed ${chunksCount} chunks.`);
  logSuccess("Done!");
}

main()
  .catch((err) => {
    console.error("Error:", err);
  })
  .then(() => {
    process.exit(0);
  });
