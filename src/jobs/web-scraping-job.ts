import { Job } from "bullmq";
import { knowledgeService } from "../services/knowledge-service";

export async function webScrapingJob(job: Job) {
  const { url, project }: { url: string; project: IProject } = job.data;
  console.log(`Starting web scraping job for URL: ${url}`);

  try {
    await knowledgeService.scrapeSiteAndEmbed(project, url);
  } catch (error) {
    console.error(`Error in web scraping job for URL: ${url}`, error);
    throw error;
  }
}
