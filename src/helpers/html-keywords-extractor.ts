export default class HTMLKeywordExtractor {
  private readonly defaultStopWords = new Set([
    "the",
    "a",
    "an",
    "and",
    "or",
    "but",
    "in",
    "on",
    "at",
    "to",
    "for",
    "of",
    "with",
    "by",
    "from",
    "up",
    "about",
    "into",
    "through",
    "during",
    "before",
    "after",
    "above",
    "below",
    "between",
    "among",
    "is",
    "are",
    "was",
    "were",
    "be",
    "been",
    "being",
    "have",
    "has",
    "had",
    "do",
    "does",
    "did",
    "will",
    "would",
    "could",
    "should",
    "may",
    "might",
    "must",
    "can",
    "this",
    "that",
    "these",
    "those",
    "i",
    "you",
    "he",
    "she",
    "it",
    "we",
    "they",
    "me",
    "him",
    "her",
    "us",
    "them",
    "my",
    "your",
    "his",
    "her",
    "its",
    "our",
    "their",
    "what",
    "which",
    "who",
    "when",
    "where",
    "why",
    "how",
    "all",
    "any",
    "both",
    "each",
    "few",
    "more",
    "most",
    "other",
    "some",
    "such",
    "no",
    "nor",
    "not",
    "only",
    "own",
    "same",
    "so",
    "than",
    "too",
    "very",
    "just",
    "now",
    "also",
    "here",
    "there",
    "then",
  ]);

  extractKeywords(
    htmlContent: string,
    options: ExtractionOptions = {}
  ): KeywordResult {
    const {
      minLength = 3,
      maxKeywords = 50,
      includeNumbers = false,
      customStopWords = [],
      weightTitles = true,
      weightHeaders = true,
    } = options;

    // Combine default and custom stop words
    const stopWords = new Set([
      ...this.defaultStopWords,
      ...customStopWords.map((w) => w.toLowerCase()),
    ]);

    // Extract text with weights based on HTML structure
    const weightedText = this.extractWeightedText(
      htmlContent,
      weightTitles,
      weightHeaders
    );

    // Clean and tokenize
    const tokens = this.tokenizeText(weightedText.text, includeNumbers);

    // Filter and count
    const keywordFreq = new Map<string, number>();
    const keywordWeights = new Map<string, number>();

    tokens.forEach((token, index) => {
      const word = token.toLowerCase();

      if (word.length >= minLength && !stopWords.has(word)) {
        // Update frequency
        keywordFreq.set(word, (keywordFreq.get(word) || 0) + 1);

        // Calculate weight based on position and HTML context
        const positionWeight = this.calculatePositionWeight(
          index,
          tokens.length
        );
        const contextWeight = weightedText.weights[index] || 1;
        const totalWeight = positionWeight * contextWeight;

        keywordWeights.set(
          word,
          Math.max(keywordWeights.get(word) || 0, totalWeight)
        );
      }
    });

    // Create weighted keywords array
    const weightedKeywords = Array.from(keywordFreq.entries())
      .map(([keyword, frequency]) => ({
        keyword,
        weight: (keywordWeights.get(keyword) || 1) * frequency,
        frequency,
      }))
      .sort((a, b) => b.weight - a.weight)
      .slice(0, maxKeywords);

    return {
      keywords: weightedKeywords.map((k) => k.keyword),
      keywordFrequency: keywordFreq,
      weightedKeywords,
    };
  }

  private extractWeightedText(
    html: string,
    weightTitles: boolean,
    weightHeaders: boolean
  ): {
    text: string;
    weights: number[];
  } {
    // Remove script and style tags completely
    let cleaned = html.replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, "");

    const textParts: string[] = [];
    const weights: number[] = [];

    // Extract title with high weight
    if (weightTitles) {
      const titleMatch = cleaned.match(/<title[^>]*>(.*?)<\/title>/i);
      if (titleMatch) {
        const titleWords = this.tokenizeText(titleMatch[1], false);
        titleWords.forEach((word) => {
          textParts.push(word);
          weights.push(3.0); // High weight for title
        });
      }
    }

    // Extract meta description and keywords
    const metaDescMatch = cleaned.match(
      /<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)/i
    );
    if (metaDescMatch) {
      const descWords = this.tokenizeText(metaDescMatch[1], false);
      descWords.forEach((word) => {
        textParts.push(word);
        weights.push(2.5); // High weight for meta description
      });
    }

    const metaKeywordsMatch = cleaned.match(
      /<meta[^>]*name=["']keywords["'][^>]*content=["']([^"']*)/i
    );
    if (metaKeywordsMatch) {
      const keywordWords = this.tokenizeText(metaKeywordsMatch[1], false);
      keywordWords.forEach((word) => {
        textParts.push(word);
        weights.push(2.8); // Very high weight for meta keywords
      });
    }

    // Extract headings with medium-high weight
    if (weightHeaders) {
      const headingMatches = cleaned.match(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi);
      if (headingMatches) {
        headingMatches.forEach((match) => {
          const level = parseInt(match.match(/<h([1-6])/)?.[1] || "6");
          const weight = 2.5 - (level - 1) * 0.3; // h1=2.5, h2=2.2, h3=1.9, etc.
          const text = match.replace(/<[^>]*>/g, "");
          const words = this.tokenizeText(text, false);
          words.forEach((word) => {
            textParts.push(word);
            weights.push(weight);
          });
        });
      }
    }

    // Extract emphasized text with medium weight
    const emphasisMatches = cleaned.match(
      /<(strong|b|em|i)[^>]*>(.*?)<\/\1>/gi
    );
    if (emphasisMatches) {
      emphasisMatches.forEach((match) => {
        const text = match.replace(/<[^>]*>/g, "");
        const words = this.tokenizeText(text, false);
        words.forEach((word) => {
          textParts.push(word);
          weights.push(1.5); // Medium weight for emphasis
        });
      });
    }

    // Extract regular body text
    const bodyText = cleaned
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    const bodyWords = this.tokenizeText(bodyText, false);
    bodyWords.forEach((word) => {
      textParts.push(word);
      weights.push(1.0); // Normal weight for body text
    });

    return {
      text: textParts.join(" "),
      weights,
    };
  }

  private tokenizeText(text: string, includeNumbers: boolean): string[] {
    // Clean the text
    let cleaned = text
      .replace(/[^\w\s-]/g, " ") // Keep only word characters, spaces, and hyphens
      .replace(/\s+/g, " ")
      .trim();

    // Split into tokens
    let tokens = cleaned.split(/\s+/).filter((token) => token.length > 0);

    // Filter out numbers if not included
    if (!includeNumbers) {
      tokens = tokens.filter((token) => !/^\d+$/.test(token));
    }

    // Handle hyphenated words
    const expandedTokens: string[] = [];
    tokens.forEach((token) => {
      if (token.includes("-") && token.length > 3) {
        // Add the full hyphenated word
        expandedTokens.push(token);
        // Add individual parts
        token.split("-").forEach((part) => {
          if (part.length > 2) {
            expandedTokens.push(part);
          }
        });
      } else {
        expandedTokens.push(token);
      }
    });

    return expandedTokens;
  }

  private calculatePositionWeight(index: number, totalTokens: number): number {
    // Give higher weight to words at the beginning and end of the document
    const position = index / totalTokens;
    if (position < 0.1 || position > 0.9) {
      return 1.2; // Boost for beginning and end
    } else if (position < 0.2 || position > 0.8) {
      return 1.1; // Slight boost
    }
    return 1.0; // Normal weight for middle content
  }

  // Extract keywords from specific HTML elements
  extractFromElements(html: string, selectors: string[]): string[] {
    const keywords = new Set<string>();

    selectors.forEach((selector) => {
      // Simple regex-based extraction for common selectors
      let pattern: RegExp;

      if (selector.startsWith("#")) {
        // ID selector
        const id = selector.slice(1);
        pattern = new RegExp(
          `<[^>]*id=["']${id}["'][^>]*>(.*?)<\/[^>]*>`,
          "gi"
        );
      } else if (selector.startsWith(".")) {
        // Class selector
        const className = selector.slice(1);
        pattern = new RegExp(
          `<[^>]*class=["'][^"']*${className}[^"']*["'][^>]*>(.*?)<\/[^>]*>`,
          "gi"
        );
      } else {
        // Tag selector
        pattern = new RegExp(`<${selector}[^>]*>(.*?)<\/${selector}>`, "gi");
      }

      const matches = html.match(pattern);
      if (matches) {
        matches.forEach((match) => {
          const text = match.replace(/<[^>]*>/g, "");
          const tokens = this.tokenizeText(text, false);
          tokens.forEach((token) => {
            if (
              token.length >= 3 &&
              !this.defaultStopWords.has(token.toLowerCase())
            ) {
              keywords.add(token.toLowerCase());
            }
          });
        });
      }
    });

    return Array.from(keywords);
  }
}
