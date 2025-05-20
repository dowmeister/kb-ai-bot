import "dotenv/config";
import express, { Application } from "express";
import { initMongoose } from "../mongo";
import knowledgeDocumentRouter from "./routes/knowledgeDocumentRoutes";
import projectRouter from "./routes/projectRoutes";
import chatRouter from "./routes/chatRoutes";
import embeddingsRouter from "./routes/embeddingsRoutes";
import { logSuccess } from "../helpers/logger";
import { queueManager } from "../queue";
import { ExpressAdapter } from "@bull-board/express";
import { createBullBoard } from "@bull-board/api";
const { BullMQAdapter } = require("@bull-board/api/bullMQAdapter");

const app: Application = express();
const port = process.env.API_SERVER_PORT || 3001;

app.use(express.json());

// Register routers
app.use("/api/knowledge", knowledgeDocumentRouter);
app.use("/api/projects", projectRouter);
app.use("/api/chat", chatRouter);
app.use("/api/embeddings", embeddingsRouter);

const queue = queueManager.getWebScrapingQueue();

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath("/admin/queues");

const { addQueue, removeQueue, setQueues, replaceQueues } = createBullBoard({
  queues: [new BullMQAdapter(queue)],
  serverAdapter: serverAdapter,
});

app.use("/admin/queues", serverAdapter.getRouter());

initMongoose().then(() => {
  app.listen(port, () => {
    logSuccess(`API server running at http://localhost:${port}`);
  });
});
