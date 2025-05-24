import { Page } from "playwright";
import { BaseContentExtractor } from "./base-content-extractor";

/**
 * WordPress content extractor
 */
export class WordPressContentExtractor extends BaseContentExtractor {
  name = "wordpress";

  async detect(page: Page): Promise<boolean> {
    return await page.evaluate(() => {
      // Check for WordPress-specific elements
      return !!(
        document.querySelector(
          'meta[name="generator"][content*="WordPress"]'
        ) ||
        document.querySelector("#wpadminbar") ||
        document.body.classList.contains("wp-") ||
        document.querySelector(".wp-block-") ||
        document.querySelector('link[rel="https://api.w.org/"]')
      );
    });
  }

  async extract(page: Page): Promise<PageContent> {
    return await page.evaluate(() => {
      // Get the page title
      const pageTitle =
        document
          .querySelector(".entry-title, .post-title")
          ?.textContent?.trim() ||
        document.querySelector("h1")?.textContent?.trim() ||
        document.title.trim();

      // Find main content container
      let contentElement = document.querySelector(
        ".entry-content, .post-content, article"
      );

      if (
        !contentElement ||
        !contentElement.textContent ||
        contentElement.textContent.trim().length < 20
      ) {
        // Fallback to common WordPress content selectors
        const selectors = [
          ".entry-content",
          ".post-content",
          "article",
          "#content",
          ".content",
          ".post",
          ".page",
          ".type-post",
          ".type-page",
        ];

        for (const selector of selectors) {
          const element = document.querySelector(selector);
          if (
            element &&
            element.textContent &&
            element.textContent.trim().length >= 20
          ) {
            contentElement = element;
            break;
          }
        }
      }

      // Fallback to body if still not found
      if (!contentElement) {
        contentElement = document.body;
      }

      const elementsToRemove = [
        "header",
        "footer",
        ".header",
        "nav",
        ".footer",
        ".sidebar",
        "img",
        "noscript",
        "script",
        "style",
        "input",
        "button",
        "select",
        "h1",
      ];

      elementsToRemove.forEach((selector) => {
        contentElement.querySelectorAll(selector).forEach((el) => el.remove());
      });

      // Join with newlines
      let finalContent = contentElement.innerHTML;

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
