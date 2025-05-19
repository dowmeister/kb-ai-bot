import { Job, Queue, Worker } from "bullmq";
import { scrapeSite } from "./services/scraper-service";
import { webScrapingJob } from "./jobs/web-scraping-job";

export class QueueManager {
  webScrapingQueue: Queue;
  webScrapingWorker: Worker;

  public constructor() {
    this.webScrapingQueue = new Queue("web-scraping");
    this.webScrapingWorker = new Worker("web-scraping", webScrapingJob);
  }

  public async startScrapingProject(project: IProject) {
    if (!project) {
      throw new Error("Invalid project data");
    }

    project.knowledgeSources.forEach(async (knowledgeSource) => {
      if (knowledgeSource.type === "web") {
        const url = knowledgeSource.url;
        if (url) {
          this.webScrapingQueue.add("web-scraping", {
            url: url,
          });
        }
      }
    });
  }

  public async startScrapingUrl(url: string) {
    if (!url) {
      throw new Error("Invalid URL");
    }

    this.webScrapingQueue.add("web-scraping", {
      url: url,
    });
  }
}

export const queueManager = new QueueManager();
