import "dotenv/config";
import { queueManager } from "../queue";
import { initMongoose } from "../mongo";
import Project from "../database/models/project";
import mongoose from "mongoose";

mongoose.set("debug", true);

async function main() {
  await initMongoose();

  const project = await Project.findById("68284e769c041b4bc635c96d")
    .populate("knowledgeSources")
    .exec();

  // Start the queue manager
  queueManager.startScrapingProject(project as IProject);
}

main()
  .catch((err) => {
    console.error("Error:", err);
  })
  .then(() => {
    process.exit(0);
  });
