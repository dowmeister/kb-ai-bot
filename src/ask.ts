import { configDotenv } from "dotenv";
import { QdrantClient } from "@qdrant/js-client-rest";
import { logInfo, logSuccess, logWarning, logError } from "./logger";
import { aiRouter } from "./aiRouter";
import { embeddingService } from "./services/embedding-service";
import { qdrantService } from "./services/qdrant-service";

const client = new QdrantClient({
  url: process.env.QDRANT_URI || "http://localhost:6333",
});

interface AIAnswer {
  answer: string;
  urls: string[];
}
/**
 * Find relevant documents for a question and generate a natural language answer using an LLM.
 */
export async function askQuestion(question: string): Promise<AIAnswer> {
  logInfo(`Embedding your question: "${question}"`);

  try {
    const embedding = await embeddingService.generateEmbedding(question);

    const searchResult = await qdrantService.search(embedding, 3);

    if (searchResult.length === 0) {
      logWarning("No matching documents found.");
      return {
        answer: "Sorry, I could not find any relevant information.",
        urls: [],
      };
    }

    logSuccess(`Found ${searchResult.length} matching chunks.`);

    let context: string = "";
    const answers: Record<string, any[]> = {};

    // group hits and payload by URL
    for (let i = 0; i < searchResult.length; i++) {
      const hit = searchResult[i];
      const payload = hit.payload as any;

      if (!payload) {
        continue;
      }

      if (!(payload as any).text) {
        continue;
      }

      if (answers[payload.url]) {
        answers[payload.url].push(payload);
      } else {
        answers[payload.url] = [payload];
      }
    }

    logInfo(`Found ${Object.keys(answers).length} unique URLs.`);

    // concatenate the content of the hits for each URL - url is the key and build the context with Article {n}: Title: {title} Content: {content}
    for (let index = 0; index < Object.keys(answers).length; index++) {
      const url = Object.keys(answers)[index];
      const answersByUrl = answers[url];

      logInfo(`Found ${answersByUrl.length} answers for URL: ${url}`);

      const title = answersByUrl[0].title || "No Title";

      context += `# ${title}\n`;

      for (const element of answersByUrl) {
        context += `${element.text} `;
      }

      context += `\n\n`;
    }

    context = context.trim(); 

    if (context.length === 0) {
      logWarning("No content found in the search results.");
      return {
        answer: "Sorry, I could not find any relevant information.",
        urls: [],
      };
    }

    logInfo(`Context for LLM:\n${context}`);

    const provider = aiRouter.getDefaultProvider();
    // Generate a natural language answer using the LLM
    const answer = await provider.completePrompt(question, context);

    return {
      answer,
      urls: searchResult
        .map((hit) => (hit.payload as any)?.url)
        .filter((url: string) => url !== undefined),
    };
  } catch (error) {
    logError(
      `Error while processing the question: ${(error as Error).message}`
    );
    return {
      answer: `Error while processing the question: ${
        (error as Error).message
      }`,
      urls: [],
    };
  }
}
