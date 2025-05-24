import { Page } from "playwright";
import { BaseContentExtractor } from "./base-content-extractor";

/**
 * MediaWiki content extractor
 */
export class MediaWikiContentExtractor extends BaseContentExtractor {
  name = "mediawiki";
  ignoreList = [
    "?action=edit",
    "?action=history",
    "?action=raw",
    "Special:",
    "Talk:",
    "User:",
    "File:",
    "Category:",
    ":Community_portal",
    "Template:",
    "Help:",
    "Portal:",
    "Draft:",
  ];

  async detect(page: Page): Promise<boolean> {
    return await page.evaluate(() => {
      // Check for MediaWiki-specific elements
      return !!(
        document.querySelector(
          'meta[name="generator"][content*="MediaWiki"]'
        ) ||
        document.querySelector("#mw-content-text") ||
        document.querySelector(".mw-parser-output") ||
        document.querySelector("body.mediawiki") ||
        document.querySelector(".vector-menu-content")
      );
    });
  }

  async extract(page: Page): Promise<PageContent> {
    return await page.evaluate(() => {
      // Get the page title
      const pageTitle =
        document.querySelector("h1#firstHeading")?.textContent?.trim() ||
        document.title.trim().replace(/ - .* Wiki$/, "");

      // Remove unwanted elements
      const elementsToRemove = [
        ".mw-navigation",
        "#mw-panel",
        "#mw-head",
        "#mw-footer",
        ".printfooter",
        ".mw-editsection",
        ".mw-jump-link",
        ".catlinks",
        "script",
        "style",
        ".mw-indicators",
        ".noprint",
        "#p-search",
        ".mw-jumptotop",
        ".mw-redirectedfrom",
        "#privacy-policy-link",
        "#footer",
        ".navigation-not-searchable",
        "img",
        "noscript",
        "script",
        "style",
        "#siteSub",
        "#contentSub",
        "#toc",
        ".mw-references-wrap",
        ".reference",
        "#See_also",
        ".navbox",
        ".notice.metadata.spoiler",
        ".notice",
      ];

      elementsToRemove.forEach((selector) => {
        document.querySelectorAll(selector).forEach((el) => el.remove());
      });

      // Get the main content element
      const contentElement =
        document.querySelector("#mw-content-text") ||
        document.querySelector("#bodyContent") ||
        document.querySelector("#mw-content-text") ||
        document.querySelector(".mw-parser-output") ||
        document.body;

      // Combine all content
      let finalContent = contentElement.innerHTML;

      // Final cleanup
      finalContent = finalContent
        .replace(/\[\d+\]/g, "") // Remove citation numbers [1], [2], etc.
        .replace(/\(edit\)/gi, "") // Remove edit links
        .replace(/Retrieved from.*$/gm, "") // Remove "Retrieved from" footer
        .replace(/\u00A0/g, " ") // Replace non-breaking spaces
        .replace(/\s{3,}/g, "\n\n") // Replace triple+ spaces with double newline
        .replace(/\n{3,}/g, "\n\n") // Replace triple+ newlines with double newline
        .replace(/\n==\s+/g, "\n\n== ") // Ensure headings have space before
        .replace(/\s+==\n/g, " ==\n\n") // Ensure headings have space after
        .trim();

      return {
        title: pageTitle,
        html: finalContent,
      };
    });
  }
}
