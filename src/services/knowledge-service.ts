import KnowledgeDocument from "../database/models/knowledgeDocument";
import { logInfo, logSuccess, logWarning } from "../helpers/logger";
import { embeddingService } from "./embedding-service";
import { qdrantService } from "./qdrant-service";
import { scrapeSite, scrapingService } from "./scraper-service";

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

      const scrapedPage = await scrapingService.scrapeSingleUrl(
        knowledgeDocument.url
      );

      if (!scrapedPage) {
        logWarning(`Failed to scrape ${knowledgeDocument.url}. Skipping...`);
        return false;
      }

      logInfo(`Scraped content from ${knowledgeDocument.url}.`);

      knowledgeDocument.content = scrapedPage.content;
      knowledgeDocument.title = scrapedPage.title;
      knowledgeDocument.contentLength = scrapedPage.content.length;
      knowledgeDocument.siteType = scrapedPage.siteType;

      await knowledgeDocument.save();

      await embeddingService.generateEmbeddingsFromPages([knowledgeDocument]);

      return knowledgeDocument;
    } catch (error) {
      logWarning(`Error scraping document: ${(error as Error).message}`);
      return false;
    }
  }

  async scrapeSiteAndEmbed(project: IProject, source?: IKnowledgeSource) {
    if (!source?.url) {
      logWarning("No URL found to scrape. Skipping...");
      return;
    }

    let pages: ScrapedPage[] = [];

    logInfo(`Starting scraping from ${source.url}...`);

    pages = await scrapeSite(source.url, project as IProject);

    logSuccess(`Indexed ${pages.length} pages.`);

    await qdrantService.initializeCollection();

    const pagesToEmbed: IKnowledgeDocument[] = [];

    for (const page of pages) {
      let existingPage = await KnowledgeDocument.findOne({
        key: page.url,
        project: project._id,
        knowledgeSourceId: source._id,
      });

      if (existingPage) {
        // update existing page content
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
        });

        await existingPage.save();
      }

      pagesToEmbed.push(existingPage);
    }

    await embeddingService.generateEmbeddingsFromPages(pagesToEmbed);

    logSuccess("Done!");
  }
}

export const knowledgeService = new KnowledgeService();
