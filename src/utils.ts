import { encode, decode } from "gpt-tokenizer";

/**
 * Split text into chunks without cutting words in the middle
 * @param text The text to split into chunks
 * @param maxTokens Maximum tokens per chunk
 * @returns Array of text chunks
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

// Extracts meaningful content from the page
function extractContent(): string {
  const mainContentSelectors = [
    "article",
    "section",
    'div[class*="content"]',
    'div[class*="article"]',
    'div[class*="kb"]',
    "main",
  ];

  let elements: Element[] = [];

  mainContentSelectors.forEach((selector) => {
    elements.push(...Array.from(document.querySelectorAll(selector)));
  });

  const contentTexts = elements.flatMap((el) => {
    return Array.from(el.querySelectorAll("h1, h2, h3, h4, h5, p, li")).map(
      (child) => child.textContent?.trim() ?? ""
    );
  });

  return contentTexts
    .filter((text) => text.length > 20) // avoid very short texts
    .join("\n");
}

export function isHelpRequestSimple(text: string): boolean {
  const starters =
    /^(who|what|why|where|when|how|which|can|should|would|is|are|do|does)\b/i;
  const textTrimmed = text.trim().toLowerCase();
  return textTrimmed.endsWith("?") || starters.test(textTrimmed);
}
