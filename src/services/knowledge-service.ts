import KnowledgeDocument from "../database/models/knowledgeDocument";
import KnowledgeDocumentRetrievalError from "../database/models/knowledgeDocumentRetrievalError";
import { logInfo, logSuccess, logWarning } from "../helpers/logger";
import { embeddingService } from "./embedding-service";
import { qdrantService } from "./qdrant-service";
import { PluggableSiteScraper } from "./scraper-service";

export class KnowledgeService {
  async scrapeDocumentAndEmbed(knowledgeDocumentId: string) {
    try {
      const knowledgeDocument = await KnowledgeDocument.findById(
        knowledgeDocumentId
      );

      if (!knowledgeDocument) {
        logWarning(
          `Knowledge document with ID ${knowledgeDocumentId} not found.`
        );
        return false;
      }

      if (!knowledgeDocument.url) {
        logWarning(
          `No URL found for knowledge document with ID ${knowledgeDocumentId}. Skipping...`
        );
        return false;
      }

      const scraper = new PluggableSiteScraper({
        delay: knowledgeDocument.knowledgeSource?.delay,
        maxPages: knowledgeDocument.knowledgeSource?.maxPages,
        ignoreList: knowledgeDocument.knowledgeSource?.ignoreList,
        maxRetries: knowledgeDocument.knowledgeSource?.maxRetries,
        timeout: knowledgeDocument.knowledgeSource?.timeout,
        userAgent: knowledgeDocument.knowledgeSource?.userAgent,
      });

      const scrapedPage = await scraper.scrapeSingleUrl(knowledgeDocument.url);

      if (!scrapedPage) {
        logWarning(`Failed to scrape ${knowledgeDocument.url}. Skipping...`);
        return false;
      }

      logInfo(`Scraped content from ${knowledgeDocument.url}.`);

      knowledgeDocument.content = scrapedPage.content;
      knowledgeDocument.title = scrapedPage.title;
      knowledgeDocument.contentLength = scrapedPage.content.length;
      knowledgeDocument.siteType = scrapedPage.siteType;
      knowledgeDocument.keywords = scrapedPage.keywords || [];

      await knowledgeDocument.save();

      await embeddingService.generateEmbeddingsFromPages([knowledgeDocument]);

      return knowledgeDocument;
    } catch (error) {
      logWarning(`Error scraping document: ${(error as Error).message}`);
      return false;
    }
  }

  async scrapeSiteAndEmbed(project: IProject, source?: IKnowledgeSource) {
    await qdrantService.initializeCollection();

    if (!source?.url) {
      logWarning("No URL found to scrape. Skipping...");
      return;
    }

    const scraper = new PluggableSiteScraper({
      delay: source?.delay,
      maxPages: source?.maxPages,
      ignoreList: source?.ignoreList,
      maxRetries: source?.maxRetries,
      timeout: source?.timeout,
      userAgent: source?.userAgent,
    });

    let pages: ScrapedPage[] = [];

    logInfo(`Starting scraping from ${source.url}...`);

    pages = await scraper.scrape(
      source.url,
      async (page: ScrapedPage) => {
        try {
          let existingPage = await KnowledgeDocument.findOne({
            key: page.url,
            projectId: project._id,
            knowledgeSourceId: source._id,
          });

          if (existingPage) {
            // update existing page content
            existingPage.title = page.title;
            existingPage.content = page.content;
            existingPage.contentLength = page.content.length;
            existingPage.siteType = page.siteType;
            existingPage.keywords = page.keywords || [];

            await existingPage.save();
          } else {
            existingPage = await KnowledgeDocument.create({
              title: page.title,
              content: page.content,
              key: page.url,
              url: page.url,
              isSummary: false,
              type: "web-scraper",
              projectId: project._id,
              contentLength: page.content.length,
              knowledgeSourceId: source._id,
              siteType: page.siteType,
              keywords: page.keywords || [],
            });

            await existingPage.save();
          }

          await embeddingService.generateEmbeddingsFromPages([existingPage]);
        } catch (error) {
          logWarning(
            `Error processing page ${page.url}: ${(error as Error).message}`
          );
        }
      },
      async (error: Error, url: string) => {
        await KnowledgeDocumentRetrievalError.create({
          url,
          error: (error as Error).message,
          knowledgeSourceId: source._id,
          projectId: project._id,
        });
        logWarning(`Error retrieving page ${url}: ${(error as Error).message}`);
      }
    );

    logSuccess(`Indexed ${pages.length} pages.`);
    logSuccess("Done!");
  }
}

export const knowledgeService = new KnowledgeService();
