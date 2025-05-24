import { Embed, EmbedBuilder } from "discord.js";
import { encode, decode } from "gpt-tokenizer";
import { DEFAULT_PROMPT } from "./constants";

/**
 * Splits a given text into smaller chunks, ensuring each chunk does not exceed
 * the specified maximum number of tokens. The function attempts to preserve
 * word boundaries by avoiding splitting words across chunks.
 *
 * @param text - The input text to be split into chunks.
 * @param maxTokens - The maximum number of tokens allowed per chunk. Defaults to 200.
 * @returns An array of text chunks, each containing up to `maxTokens` tokens.
 *
 * @remarks
 * - The function uses `encode` to tokenize the input text and `decode` to convert tokens back to text.
 * - If the input text is shorter than or equal to `maxTokens`, it is returned as a single chunk.
 * - Word boundaries are respected by adjusting the chunk size to avoid splitting words.
 * - Empty chunks are not included in the result.
 */
export function splitTextIntoChunks(
  text: string,
  maxTokens: number = 200
): string[] {
  // First tokenize the entire text
  const tokens = encode(text);
  const chunks: string[] = [];

  if (tokens.length <= maxTokens) {
    // If the text is already smaller than maxTokens, return it as a single chunk
    return [text];
  }

  let startIndex = 0;

  while (startIndex < tokens.length) {
    // Calculate the end index for this chunk (don't exceed tokens length)
    let endIndex = Math.min(startIndex + maxTokens, tokens.length);

    // If we're not at the end of the tokens and not exactly at maxTokens
    if (endIndex < tokens.length) {
      // Get the text up to the proposed end index
      const proposedChunk = decode(tokens.slice(startIndex, endIndex));

      // Find the last space in the chunk to avoid cutting words
      const lastSpaceIndex = proposedChunk.lastIndexOf(" ");

      if (lastSpaceIndex > 0) {
        // Adjust the end index to respect word boundaries
        const adjustedLength = encode(
          proposedChunk.substring(0, lastSpaceIndex)
        ).length;
        endIndex = startIndex + adjustedLength;
      }
    }

    // Extract the chunk tokens and convert back to text
    const chunkTokens = tokens.slice(startIndex, endIndex);
    const chunkText = decode(chunkTokens).trim();

    // Only add non-empty chunks
    if (chunkText.length > 0) {
      chunks.push(chunkText);
    }

    // Move to the next chunk
    startIndex = endIndex;
  }

  return chunks;
}

/**
 * Determines if a given text is a simple help request based on its structure.
 *
 * This function checks if the input text ends with a question mark (`?`) or
 * starts with common question words such as "who", "what", "why", etc.
 *
 * @param text - The input string to evaluate.
 * @returns `true` if the text is identified as a help request; otherwise, `false`.
 */
export function isHelpRequestSimple(text: string): boolean {
  const starters =
    /^(who|what|why|where|when|how|which|can|should|would|is|are|do|does)\b/i;
  const textTrimmed = text.trim().toLowerCase();
  return textTrimmed.endsWith("?") || starters.test(textTrimmed);
}

/**
 * Constructs an EmbedBuilder instance containing a formatted reply based on the provided AIAnswer.
 *
 * @param answer - The AIAnswer object containing the response text and optional URLs.
 *   - `answer.answer` (string): The main text of the answer.
 *   - `answer.urls` (string[] | undefined): An optional array of URLs to be appended as references.
 *
 * @returns An EmbedBuilder instance with the formatted reply, including the answer text and
 *          any associated URLs as clickable links.
 */
export function buildReply(answer: AIAnswer): EmbedBuilder {
  let answerText = answer.answer;

  if (answer.urls && answer.urls.length > 0) {
    answer.urls.forEach((url, index) => {
      answerText += ` [[${index + 1}]](${url})`;
    });
  }

  const embed = new EmbedBuilder({
    description: answerText,
    color: 0x0099ff,
  });

  return embed;
}

export function buildPrompt(context: string): string {
  return DEFAULT_PROMPT.replace("{context}", context);
}

// Example cleaning function
export function cleanForEmbedding(text: string) {
  return text
    .replace(/```[\s\S]*?```/g, "") // Remove code blocks
    .replace(/`([^`]+)`/g, "$1") // Remove inline code backticks
    .replace(/\*\*([^*]+)\*\*/g, "$1") // Remove bold
    .replace(/\*([^*]+)\*/g, "$1") // Remove italic
    .replace(/<[^>]*>/g, "") // Remove HTML tags
    .replace(/#+\s/g, "") // Remove heading markers
    .replace(/^\s*[-*+]\s/gm, "") // Remove list markers
    .replace(/\n{2,}/g, "\n") // Normalize whitespace
    .trim();
}
