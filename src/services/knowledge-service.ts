import KnowledgeDocument from "../database/models/knowledgeDocument";
import { logInfo, logSuccess, logWarning } from "../helpers/logger";
import { embeddingService } from "./embedding-service";
import { qdrantService } from "./qdrant-service";
import { scrapeSite } from "./scraper-service";

export class KnowledgeService {
  async scrapeSiteAndEmbed(project: IProject, startUrl?: string) {
    const startUrls = [];

    if (!startUrl) {
      if (!project.knowledgeSources) {
        logWarning("No knowledge sources found. Exiting...");
        return;
      }

      startUrls.push(
        ...project.knowledgeSources.map((source) => {
          if (source.type === "web") {
            return source.url;
          }
        })
      );
    } else {
      startUrls.push(startUrl);
    }

    if (startUrls.length === 0) {
      logWarning("No URLs found to scrape. Exiting...");
      return;
    }

    for (const url of startUrls) {
      if (!url) {
        logWarning("No URL found to scrape. Skipping...");
        continue;
      }

      let pages: ScrapedPage[] = [];

      logInfo(`Starting scraping from ${startUrl}...`);

      pages = await scrapeSite(url, project as IProject);

      logSuccess(`Indexed ${pages.length} pages.`);

      await qdrantService.initializeCollection();

      const pagesToEmbed: IKnowledgeDocument[] = [];

      for (const page of pages) {
        let existingPage = await KnowledgeDocument.findOne({
          key: page.url,
          project: project._id,
        });

        if (existingPage) {
          if (existingPage.content !== page.content) {
            pagesToEmbed.push(existingPage);
          }
        } else {
          existingPage = await KnowledgeDocument.create({
            title: page.title,
            content: page.content,
            key: page.url,
            url: page.url,
            isSummary: false,
            source: "web-scraper",
            project: project._id,
            contentLength: page.content.length,
          });

          await existingPage.save();
          pagesToEmbed.push(existingPage);
        }
      }

      await embeddingService.generateEmbeddingsFromPages(pagesToEmbed);
    }

    logSuccess("Done!");
  }
}

export const knowledgeService = new KnowledgeService();
