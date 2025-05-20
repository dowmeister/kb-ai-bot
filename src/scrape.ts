import "dotenv/config";
import { scrapeSite } from "./services/scraper-service";
import { initMongoose } from "./mongo";
import { logInfo, logSuccess, logWarning, logError } from "./helpers/logger";
import { Command } from "commander";
import { embeddingService } from "./services/embedding-service";
import { qdrantService } from "./services/qdrant-service";
import KnowledgeDocument from "./database/models/knowledgeDocument";
import Project from "./database/models/project";
import { knowledgeService } from "./services/knowledge-service";

const program = new Command();

program
  .option(
    "--skip-scrape",
    "Skip scraping and use existing pages from MongoDB",
    false
  )
  .option("--start-url <url>", "URL to start scraping from")
  .option(
    "--project <project>",
    "Project ID to scrape. If not provided, will scrape all projects."
  )
  .option("--force-embedding-update", "Force update of embeddings", false);

program.parse();

const options = program.opts();

async function main() {
  await initMongoose();

  if (!options.project) {
    throw new Error("No project ID provided");
  }

  const project = await Project.findById(options.project).populate('knowledgeSources');

  if (!project) {
    throw new Error("Project not found");
  }

  const startUrl: string | undefined = options.start_url;

  await knowledgeService.scrapeSiteAndEmbed(project, startUrl);
}

main()
  .catch((err) => {
    console.error("Error:", err);
  })
  .then(() => {
    process.exit(0);
  });
