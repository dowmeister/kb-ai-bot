import { Page } from "playwright";
import { BaseContentExtractor } from "./base-content-extractor";

/**
 * Default content extractor for standard websites
 */
export class StandardContentExtractor extends BaseContentExtractor {
  name = "standard";
  ignoreList?: string[] | undefined;

  async detect(page: Page): Promise<boolean> {
    // This is the fallback extractor, so always return true
    // Custom extractors should be checked before this one
    return true;
  }

  async extract(page: Page): Promise<PageContent> {
    return await page.evaluate(() => {
      // Get the page title
      const pageTitle =
        document.querySelector("h1")?.textContent?.trim() ||
        document.title.trim();

      // Clean up the page by removing unwanted elements
      const elementsToRemove = [
        "script",
        "style",
        "noscript",
        "svg",
        "img",
        "video",
        "iframe",
        "nav",
        "footer",
        "header",
        "aside",
        ".navigation",
        ".sidebar",
        ".menu",
        ".ads",
        ".comments",
        "button",
        "input",
        "select",
        "textarea",
        "[role='alert']",
        ".alert",
      ];

      elementsToRemove.forEach((selector) => {
        document.querySelectorAll(selector).forEach((el) => el.remove());
      });

      // Define content selectors in priority order
      const mainContentSelectors = [
        "article",
        "main",
        "section",
        'div[class*="content"]',
        'div[class*="article"]',
        'div[class*="post"]',
        ".page-content",
        "#main-content",
      ];

      // Find the main content container
      let mainContentElement: Element | null = null;

      for (const selector of mainContentSelectors) {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          // Find the element with the most text content
          mainContentElement = Array.from(elements).reduce((best, current) => {
            const bestLength = best.textContent
              ? best.textContent.trim().length
              : 0;
            const currentLength = current.textContent
              ? current.textContent.trim().length
              : 0;
            return currentLength > bestLength ? current : best;
          });

          const contentLength = mainContentElement.textContent
            ? mainContentElement.textContent.trim().length
            : 0;
          if (contentLength > 20) {
            break;
          }
        }
      }

      // Fallback to body if no suitable content container found
      if (
        !mainContentElement ||
        !mainContentElement.textContent ||
        mainContentElement.textContent.trim().length <= 20
      ) {
        mainContentElement = document.body;
      }

      // Join with newlines and clean up
      let finalContent = mainContentElement.innerHTML;

      // Final cleanup
      finalContent = finalContent
        .replace(/&nbsp;/g, " ") // Replace &nbsp; with spaces
        .replace(/&amp;/g, "&") // Replace &amp; with &
        .replace(/&lt;/g, "<") // Replace &lt; with
        .replace(/&gt;/g, ">") // Replace &gt; with >
        .replace(/&quot;/g, '"') // Replace &quot; with "
        .replace(/\s{3,}/g, "\n\n") // Replace multiple spaces with newlines
        .trim();

      return {
        title: pageTitle,
        html: finalContent,
      };
    });
  }
}
