import { Page } from "playwright";
import { BaseContentExtractor } from "./base-content-extractor";

/**
 * Specialized extractor for Echo Knowledge Base plugin content
 */
export class EchoKnowledgeBaseExtractor extends BaseContentExtractor {
  name = "echo-kb";

  async detect(page: Page): Promise<boolean> {
    return await page.evaluate(() => {
      // Check for Echo Knowledge Base specific elements
      return !!(
        document.querySelector(".eckb-article-content") ||
        document.querySelector(".eckb-article-body") ||
        document.querySelector(".epkb-content-container") ||
        document.querySelector(".epkb-panel-container") ||
        document.querySelector(".eckb-article-toc") ||
        document.querySelector('meta[content*="Echo Knowledge Base"]') ||
        document.querySelector('link[href*="echo-knowledge-base"]')
      );
    });
  }

  async extract(page: Page): Promise<PageContent> {
    return await page.evaluate(() => {
      // Get the page title
      const pageTitle =
        document
          .querySelector(".eckb-article-title, .epkb-article-header__title")
          ?.textContent?.trim() ||
        document.querySelector("h1")?.textContent?.trim();

      // Find main content container - Echo KB uses several possible selectors
      let contentElement =
        document.querySelector(".eckb-article-content") ||
        document.querySelector(".eckb-article-body") ||
        document.querySelector(".epkb-content-container") ||
        document.querySelector(".epkb-panel-container") ||
        document.querySelector(".epkb-article-body");

      if (!contentElement) {
        // Fallback to standard article or content selectors
        contentElement =
          document.querySelector("article") ||
          document.querySelector(".entry-content") ||
          document.querySelector(".post-content") ||
          document.querySelector(".site-content") ||
          document.body;
      }

      // Remove unwanted elements
      const elementsToRemove = [
        ".eckb-article-toc", // Table of contents
        ".eckb-navigation-back", // Back navigation
        ".eckb-article-footer", // Footer elements
        ".eckb-print-button-container", // Print buttons
        ".eckb-article-content-header", // Content header that might duplicate title
        ".epkb-nav-tabs", // Navigation tabs
        ".epkb-rating-element", // Rating elements
        ".epkb-comments-container", // Comments
        ".epkb-article-meta-container", // Meta information
        "#eckb-article-content-breadcrumb-container",
        "#eckb-article-right-sidebar",
        "#eckb-article-content-header-row-3",
        "script", // Scripts
        "style", // Styles,
        "img",
        "noscript",
        "h1",
      ];

      elementsToRemove.forEach((selector) => {
        contentElement.querySelectorAll(selector).forEach((el) => el.remove());
      });

      // convert contentElement html to markdown
      let finalContent = contentElement.innerHTML;

      // Clean up the content
      finalContent = finalContent
        .replace(/&nbsp;/g, " ") // Replace &nbsp; with spaces
        .replace(/\s{3,}/g, "\n\n") // Replace multiple spaces with newlines
        .replace(/\n{3,}/g, "\n\n") // Normalize excess newlines
        .trim();

      return {
        title: pageTitle,
        html: finalContent,
      };
    });
  }
}
