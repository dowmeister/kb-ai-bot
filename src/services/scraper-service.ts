import { Browser, BrowserContext, Page, chromium } from "playwright";
import { saveOrUpdatePage, updatePageSummary } from "../mongo";
import { logInfo, logSuccess, logWarning, logError } from "../logger";
import { summarize } from "../summarize";
import { log } from "@tensorflow/tfjs-node";

export class SiteScraper {
  private visited = new Set<string>();
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private results: ScrapedPage[] = [];
  private ignoreList: string[] = [];

  constructor(
    private startUrl: string,
    private options: {
      maxPages?: number;
      delay?: number;
      ignoreList?: string;
    } = {}
  ) {
    this.ignoreList =
      options.ignoreList?.split(",") ||
      process.env.SCRAPING_IGNORE_LIST?.split(",") ||
      [];
  }

  private isSameDomain(url: URL, domain: string): boolean {
    return url.hostname === domain;
  }

  private isInSameRoot(url: URL, rootPath: string): boolean {
    return url.pathname.startsWith(rootPath);
  }

  private shouldIgnoreUrl(url: string): boolean {
    return this.ignoreList.some((ignoreUrl) => url.includes(ignoreUrl));
  }

  private async extractContent(page: Page): Promise<PageContent> {
    return await page.evaluate(() => {
      // Get the page title (prefer h1, fallback to title)
      const h1Element = document.querySelector("h1");
      const pageTitle =
        h1Element?.textContent?.trim() || document.title.trim() || "No Title";

      // First, clean up the page by removing unwanted elements
      const elementsToRemove = [
        "script",
        "style",
        "noscript",
        "svg",
        "img",
        "video",
        "audio",
        "iframe",
        "nav",
        "footer",
        "header",
        "aside",
        "form",
        ".navigation",
        ".sidebar",
        ".menu",
        ".ads",
        ".comments",
        "button",
        "input",
        "select",
        "textarea",
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
        'div[class*="kb"]',
        ".page-content",
        "#main-content",
      ];

      // Try to find the main content container
      let mainContentElement: Element | null = null;

      for (const selector of mainContentSelectors) {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          // Find the element with the most content
          mainContentElement = Array.from(elements).reduce((best, current) => {
            const bestLength = best.textContent
              ? best.textContent.trim().length
              : 0;
            const currentLength = current.textContent
              ? current.textContent.trim().length
              : 0;
            return currentLength > bestLength ? current : best;
          });

          // Check if we found a good content container (with proper TypeScript null checking)
          const contentLength = mainContentElement.textContent
            ? mainContentElement.textContent.trim().length
            : 0;
          if (contentLength > 20) {
            break; // Found a good content container
          }
        }
      }

      // If no main container found, use body as fallback
      if (
        !mainContentElement ||
        !mainContentElement.textContent ||
        mainContentElement.textContent.trim().length <= 20
      ) {
        mainContentElement = document.body;
      }

      // Specifically target text-containing elements, avoiding hidden elements
      const contentElements = Array.from(
        mainContentElement.querySelectorAll(
          "h1, h2, h3, h4, h5, h6, p, li, td, th, div, span"
        )
      ).filter((el) => {
        const style = window.getComputedStyle(el);
        const textLength = el.textContent ? el.textContent.trim().length : 0;
        return (
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          textLength > 0
        );
      });

      // Use a Set to track processed text to avoid duplication
      const processedTexts = new Set<string>();
      const contentParts: string[] = [];

      // Process each content element
      contentElements.forEach((element) => {
        // Get the direct text of this element (excluding child elements)
        let textContent = "";

        // Iterate through child nodes to get only text nodes
        for (let i = 0; i < element.childNodes.length; i++) {
          const node = element.childNodes[i];
          if (node.nodeType === Node.TEXT_NODE) {
            textContent += node.textContent || "";
          }
        }

        // Also get the full text (including child elements)
        const fullText = element.textContent ? element.textContent.trim() : "";

        // If this element only contains other elements (no direct text)
        // and it's not a heading or paragraph element, skip it to avoid duplication
        const isHeaderOrParagraph = /^(h[1-6]|p)$/i.test(element.tagName);
        if (textContent.trim().length === 0 && !isHeaderOrParagraph) {
          return;
        }

        // For headings and paragraphs, prefer the full text
        const textToUse = isHeaderOrParagraph ? fullText : textContent.trim();

        // Skip very short text or already processed text - lowered threshold to 20
        if (textToUse.length < 20 || processedTexts.has(textToUse)) {
          return;
        }

        // Check if this is a subset of any existing text (likely a duplicate)
        let isSubset = false;
        processedTexts.forEach((existingText) => {
          if (existingText.includes(textToUse) && existingText !== textToUse) {
            isSubset = true;
          }
        });

        if (!isSubset) {
          processedTexts.add(textToUse);
          contentParts.push(textToUse);
        }
      });

      // Join with newlines and clean up
      let finalContent = contentParts.join("\n\n");

      // Final cleanup
      finalContent = finalContent
        .replace(/<[^>]*>/g, "") // Remove any remaining HTML tags
        .replace(/&nbsp;/g, " ") // Replace &nbsp; with spaces
        .replace(/&amp;/g, "&") // Replace &amp; with &
        .replace(/&lt;/g, "<") // Replace &lt; with
        .replace(/&gt;/g, ">") // Replace &gt; with >
        .replace(/&quot;/g, '"') // Replace &quot; with "
        .replace(/\s{3,}/g, "\n\n") // Replace multiple spaces with newlines
        .trim();

      return {
        title: pageTitle,
        content: finalContent,
      };
    });
  }

  async initialize(): Promise<void> {
    this.browser = await chromium.launch();
    this.context = await this.browser.newContext({
      userAgent: "Mozilla/5.0 SiteScraperBot/1.0",
    });
    this.page = await this.context.newPage();
  }

  async close(): Promise<void> {
    if (this.context) await this.context.close();
    if (this.browser) await this.browser.close();
  }

  async scrape(): Promise<ScrapedPage[]> {
    if (!this.browser || !this.page) {
      await this.initialize();
    }

    const startUrlParsed = new URL(this.startUrl);
    const domainOnly = startUrlParsed.hostname;
    const rootPath = startUrlParsed.pathname.endsWith("/")
      ? startUrlParsed.pathname
      : startUrlParsed.pathname + "/";

    const delay = this.options.delay || 1000;
    const maxPages = this.options.maxPages || 100;

    const pendingUrls: string[] = [this.startUrl];

    logInfo(`Starting scraping from: ${this.startUrl}`);

    while (pendingUrls.length > 0 && this.results.length < maxPages) {
      const currentUrl = pendingUrls.shift()!;
      const parsedUrl = new URL(currentUrl);

      // Remove any fragment (#...)
      parsedUrl.hash = "";
      const cleanUrlString = parsedUrl.toString();

      if (this.visited.has(cleanUrlString)) {
        continue;
      }

      // Add to visited before processing to prevent re-adding
      this.visited.add(cleanUrlString);

      if (!this.isSameDomain(parsedUrl, domainOnly)) {
        logWarning(`Skipping different domain: ${parsedUrl.href}`);
        continue;
      }

      if (!this.isInSameRoot(parsedUrl, rootPath)) {
        continue;
      }

      if (this.shouldIgnoreUrl(cleanUrlString)) {
        logWarning(`Ignoring URL in ignore list: ${cleanUrlString}`);
        continue;
      }

      try {
        logInfo(`Navigating to: ${cleanUrlString}`);
        await this.page!.goto(cleanUrlString, {
          waitUntil: "domcontentloaded",
        });

        // Wait a moment for any dynamic content
        await this.page!.waitForTimeout(500);

        const content = await this.extractContent(this.page!);

        logInfo(
          `Extracted content from: ${cleanUrlString}: ${content.content.length} characters`
        );

        if (content.content.length > 20) {
          // Only store pages with meaningful content
          const scrapedPage: ScrapedPage = {
            url: cleanUrlString,
            content: content.content,
            title: content.title,
            content_length: content.content.length,
          };

          const shouldUpdate = await saveOrUpdatePage(scrapedPage);
          scrapedPage.shouldUpdate = shouldUpdate;

          if (shouldUpdate) {
            logInfo(`Page ${cleanUrlString} contet has changed`);
            // You can uncomment this if you want to generate summaries

            /*
            const summary = await summarize(scrapedPage.content);

            if (summary && summary.length > 0) {
              await updatePageSummary(cleanUrlString, summary);
              scrapedPage.summary = summary;
              logInfo(
                `Updated summary for: ${cleanUrlString}: ${summary.length} characters`
              );
            }
              */
          }

          this.results.push(scrapedPage);

          logSuccess(`Saved/Updated content for: ${cleanUrlString}`);
        } else {
          logWarning(`No meaningful content found at: ${cleanUrlString}`);
        }

        // Collect links
        const links = await this.page!.evaluate(() => {
          return Array.from(document.querySelectorAll("a[href]"))
            .map((a) => (a as HTMLAnchorElement).href)
            .filter((href) => href && href.startsWith("http"));
        });

        logInfo(`Found ${links.length} links on ${cleanUrlString}`);

        // Add unvisited links to the queue
        for (const link of links) {
          const linkUrl = new URL(link);
          linkUrl.hash = ""; // Remove fragment
          const cleanLink = linkUrl.toString();

          if (
            !this.visited.has(cleanLink) &&
            this.isSameDomain(linkUrl, domainOnly) &&
            this.isInSameRoot(linkUrl, rootPath) &&
            !this.shouldIgnoreUrl(cleanLink)
          ) {
            pendingUrls.push(cleanLink);
          }
        }

        // Respect delay between requests
        await new Promise((resolve) => setTimeout(resolve, delay));
      } catch (error) {
        logError(
          `Failed to scrape ${cleanUrlString}: ${(error as Error).message}`
        );
      }
    }

    logSuccess("Scraping completed.");
    return this.results;
  }
}

// Function-based approach for backward compatibility
export async function scrapeSite(startUrl: string): Promise<ScrapedPage[]> {
  const scraper = new SiteScraper(startUrl);
  try {
    return await scraper.scrape();
  } finally {
    await scraper.close();
  }
}
