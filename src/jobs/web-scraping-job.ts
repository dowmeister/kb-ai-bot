import { Job } from "bullmq";
import { knowledgeService } from "../services/knowledge-service";
import KnowledgeSource from "../database/models/knowledgeSource";

export async function webScrapingJob(job: Job) {
  const {
    url,
    project,
    source,
  }: { url: string; project: IProject; source: IKnowledgeSource } = job.data;

  console.log(`Starting web scraping job for URL: ${url}`);

  try {
    await KnowledgeSource.findByIdAndUpdate(
      source._id,
      { $set: { status: "scanning" } },
      { new: true }
    );

    await knowledgeService.scrapeSiteAndEmbed(project, source);

    console.log(`Successfully scraped and embedded data from URL: ${url}`);

    await KnowledgeSource.findByIdAndUpdate(
      source._id,
      { $set: { status: "scan-complete" } },
      { new: true }
    );
  } catch (error) {
    await KnowledgeSource.findByIdAndUpdate(
      source._id,
      { $set: { status: "scan-failed" } },
      { new: true }
    );

    console.error(`Error in web scraping job for URL: ${url}`, error);
    throw error;
  }
}
