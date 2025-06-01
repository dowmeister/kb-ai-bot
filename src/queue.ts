import { Job, Queue, Worker } from "bullmq";
import { webScrapingJob } from "./jobs/web-scraping-job";
import IORedis from "ioredis";

export class QueueManager {
  webScrapingQueue: Queue;
  webScrapingWorker: Worker;

  public constructor() {
    const connection = new IORedis({ maxRetriesPerRequest: null });
    this.webScrapingQueue = new Queue("web-scraping", {
      connection: connection,
    });

    this.webScrapingWorker = new Worker("web-scraping", webScrapingJob, {
      connection: connection,
    });
  }

  getWebScrapingQueue() {
    return this.webScrapingQueue;
  }

  public startScrapingSource(source: IKnowledgeSource) {
    if (!source) {
      throw new Error("Invalid source data");
    }

    this.webScrapingQueue.add("web-scraping", {
      url: source.url,
      project: source.project,
      source: source,
    });
  }

  public startScrapingProject(project: IProject) {
    if (!project) {
      throw new Error("Invalid project data");
    }

    project.knowledgeSources.forEach((knowledgeSource) => {
      if (knowledgeSource.type === "web") {
        const url = knowledgeSource.url;
        if (url) {
          this.webScrapingQueue.add("web-scraping", {
            url: url,
            project: project,
            source: knowledgeSource
          });
        }
      }
    });
  }

  public async startScrapingUrl(project: IProject, url: string) {
    if (!url) {
      throw new Error("Invalid URL");
    }

    this.webScrapingQueue.add("web-scraping", {
      url: url,
      project: project,
    });
  }
}

export const queueManager = new QueueManager();
