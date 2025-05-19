import "dotenv/config";
import express, { Application } from "express";
import { initMongoose } from "../mongo";
import knowledgeDocumentRouter from "./routes/knowledgeDocumentRoutes";
import projectRouter from "./routes/projectRoutes";
import chatRouter from "./routes/chatRoutes";
import embeddingsRouter from "./routes/embeddingsRoutes";
import { logSuccess } from "../helpers/logger";

const app: Application = express();
const port = process.env.API_SERVER_PORT || 3001;

app.use(express.json());

// Register routers
app.use("/api/knowledge", knowledgeDocumentRouter);
app.use("/api/projects", projectRouter);
app.use("/api/chat", chatRouter);
app.use("/api/embeddings", embeddingsRouter);

initMongoose().then(() => {
  app.listen(port, () => {
    logSuccess(`API server running at http://localhost:${port}`);
  });
});
