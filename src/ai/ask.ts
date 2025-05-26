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
export async function askQuestion(
  question: string,
  project: IProject,
  minScore: number = 0.5
): Promise<AIAnswer> {
  logInfo(`Embedding your question: "${question}"`);

  try {
    const embedding = await embeddingService.generateEmbedding(question);

    const searchResult = await qdrantService.queryGroups(
      embedding,
      3,
      minScore,
      {
        must: [
          {
            key: "projectId",
            match: {
              value: project._id.toString(),
            },
          },
        ],
      }
    );

    if (!searchResult.groups) {
      logWarning("No search results found.");
      return {
        answer: "Sorry, I could not find any relevant information.",
        urls: [],
      };
    }

    if (searchResult.groups.length === 0) {
      logWarning("No matching documents found.");
      return {
        answer: "Sorry, I could not find any relevant information.",
        urls: [],
      };
    }

    logSuccess(`Found ${searchResult.groups.length} matching groups.`);

    let context: string = "";

    const allHits = searchResult.groups
      .flatMap((group: QdrantQueryGroupResultGroup) => group.hits)
      .sort(
        (a: QdrantQueryGroupResultHit, b: QdrantQueryGroupResultHit) =>
          b.score - a.score
      )
      .filter((hit: QdrantQueryGroupResultHit) => hit.score > minScore);

    logInfo(`Found ${allHits.length} relevant hits.`);

    context = allHits.map((m) => m.payload.text).join("\n\n");

    if (context.length === 0) {
      logWarning("No content found in the search results.");
      return {
        answer: "Sorry, I could not find any relevant information.",
        urls: [],
        replied: false,
      };
    }

    logInfo(`Context for LLM:\n${context}`);

    const provider = aiRouter.getProvider(project.aiService);
    // Generate a natural language answer using the LLM
    const answer = await provider.completePrompt(
      question,
      context,
      project.agentPrompt
    );

    logInfo(`Answer from LLM: ${answer}`);

    return {
      answer,
      replied: true,
      urls: [],
      hits: allHits,
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
