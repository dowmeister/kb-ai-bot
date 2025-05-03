import { Page } from "playwright";

/**
 * Base abstract class for content extractors
 */
export abstract class BaseContentExtractor implements ContentExtractor {
  abstract name: string;
  abstract detect(page: Page): Promise<boolean>;
  abstract extract(page: Page): Promise<PageContent>;
  
  protected cleanText(text: string): string {
    return text
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/\s{3,}/g, '\n\n') // Replace multiple spaces with newlines
      .trim();
  }
}