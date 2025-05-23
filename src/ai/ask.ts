import { logInfo, logSuccess, logWarning, logError } from "../helpers/logger";
import { aiRouter } from "./aiRouter";
import { embeddingService } from "../services/embedding-service";
import { qdrantService } from "../services/qdrant-service";

/**
 * Asks a question and retrieves an answer using an AI model.
 * 
 * This function processes the given question by generating an embedding,
 * searching for relevant documents, and constructing a context from the
 * search results. It then uses a language model to generate a natural
 * language answer based on the context.
 * 
 * @param question - The question to be asked as a string.
 * @returns A promise that resolves to an `AIAnswer` object containing:
 * - `answer`: The generated answer as a string.
 * - `urls`: An array of URLs related to the search results.
 * - `replied` (optional): A boolean indicating if a valid answer was generated.
 * 
 * The function handles errors gracefully and logs relevant information
 * during the process. If no relevant information is found, a default
 * response is returned.
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
        replied: false,
      };
    }

    logInfo(`Context for LLM:\n${context}`);

    const provider = aiRouter.getDefaultProvider();
    // Generate a natural language answer using the LLM
    const answer = await provider.completePrompt(question, context);

    logInfo(`Answer from LLM: ${answer}`);

    return {
      answer,
      replied: true,
      urls: [
        ...new Set(
          searchResult
            .map((hit) => (hit.payload as any)?.url)
            .filter((url: string) => url !== undefined)
        ),
      ],
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
