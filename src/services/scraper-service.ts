import { Browser, BrowserContext, Page, chromium } from "playwright";
import { logError, logInfo, logSuccess, logWarning } from "../helpers/logger";
import { MediaWikiContentExtractor } from "../contentProviders/mediawiki-content-extractor";
import { WordPressContentExtractor } from "../contentProviders/wordpress-content-extractor";
import { StandardContentExtractor } from "../contentProviders/standard-content-extractor";
import { EchoKnowledgeBaseExtractor } from "../contentProviders/echo-kb-content-extractor";
const TurndownService = require("turndown");
/**
 * A flexible, extensible web scraper that supports pluggable content extractors for different site types.
 *
 * The `PluggableSiteScraper` class uses Playwright to navigate web pages, extract content, and follow links within the same domain and root path.
 * It supports registering multiple content extractors, each capable of detecting and extracting content from specific site types (e.g., MediaWiki, WordPress).
 *
 * Features:
 * - Pluggable extractor architecture: Register custom or built-in extractors for different site types.
 * - Domain and root path restriction: Only scrapes pages within the same domain and root path as the starting URL.
 * - Ignore list: Skips URLs matching patterns in a configurable ignore list.
 * - Automatic content extraction: Detects the appropriate extractor for each page and extracts meaningful content.
 * - Link discovery: Recursively follows links found on each page, subject to domain/root/ignore constraints.
 * - Rate limiting: Supports configurable delay between requests to avoid overloading servers.
 * - Persistence: Saves or updates extracted content in a knowledge document database.
 * - Logging: Logs progress, warnings, and errors throughout the scraping process.
 *
 * Usage:
 * 1. Instantiate with optional configuration (user agent, delay, max pages, timeout, ignore list).
 * 2. Register additional extractors if needed.
 * 3. Call `scrape()` to crawl from a starting URL, or `scrapeSingleUrl()` to extract a single page.
 * 4. Call `close()` to release browser resources when done.
 *
 * Example:
 * ```typescript
 * const scraper = new PluggableSiteScraper({ maxPages: 50, delay: 2000 });
 * await scraper.scrape('https://example.com', project);
 * await scraper.close();
 * ```
 *
 * @remarks
 * - Requires Playwright and a set of extractor implementations.
 * - Designed for extensibility and safe, respectful scraping.
 *
 * @see ContentExtractor
 * @see WebScraperResults
 * @see IKnowledgeDocument
 */
export class PluggableSiteScraper {
  private visited = new Set<string>();
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private results: ScrapedPage[] = [];
  private ignoreList: string[] = [];
  private extractors: ContentExtractor[] = [];

  constructor(private options: SiteScraperOptions = {}) {
    this.ignoreList =
      options.ignoreList?.split(",") ||
      process.env.SCRAPING_IGNORE_LIST?.split(",") ||
      [];

    // Register default extractors
    this.registerExtractor(new MediaWikiContentExtractor());
    this.registerExtractor(new EchoKnowledgeBaseExtractor());
    this.registerExtractor(new WordPressContentExtractor());
    this.registerExtractor(new StandardContentExtractor());
  }

  /**
   * Register a content extractor
   */
  public registerExtractor(extractor: ContentExtractor): void {
    this.extractors.push(extractor);
    logInfo(`Registered ${extractor.name} content extractor`);
  }

  /**
   * Initialize the browser and page
   */
  async initialize(): Promise<void> {
    logInfo("Initializing browser and page for scraping...");

    this.browser = await chromium.launch();
    this.context = await this.browser.newContext({
      userAgent: this.options.userAgent || "KnowledgeFox Scraper/1.0",
    });
    this.page = await this.context.newPage();

    logInfo("Browser and page initialized successfully.");
  }

  /**
   * Close browser and resources
   */
  async close(): Promise<void> {
    if (this.context) await this.context.close();
    if (this.browser) await this.browser.close();

    logInfo("Browser and resources closed successfully.");
  }

  /**
   * Check if URL should be ignored
   */
  private isSameDomain(url: URL, domain: string): boolean {
    return url.hostname === domain;
  }

  private isInSameRoot(url: URL, rootPath: string): boolean {
    return url.pathname.startsWith(rootPath);
  }

  private shouldIgnoreUrl(url: string): boolean {
    return this.ignoreList.some((ignoreUrl) => url.includes(ignoreUrl));
  }

  /**
   * Extracts content from a given web page using a specific extractor based on the site type.
   * If no matching extractor is found for the provided site type, it falls back to the "standard" extractor.
   * Logs relevant information or warnings during the extraction process.
   *
   * @param page - The Puppeteer `Page` instance representing the web page to extract content from.
   * @param siteType - A string representing the type of site to determine the appropriate extractor.
   * @returns A promise that resolves to the extracted `PageContent` or `null` if no suitable extractor is found
   *          or an error occurs during extraction.
   */
  private async extractContent(
    page: Page,
    siteType: string
  ): Promise<MarkdownPageContent | null> {
    let extractor = this.extractors.find((e) => e.name === siteType);

    if (!extractor) {
      // Fallback to the first registered extractor if no specific one is found
      extractor = this.extractors.find((e) => e.name === "standard");
    }

    if (extractor) {
      try {
        const isMatch = await extractor.detect(page);
        if (isMatch) {
          logInfo(`Using ${extractor.name} extractor for content extraction`);

          const markdownPageContent: MarkdownPageContent = {
            html: "",
            title: "",
            markdown: "",
          };

          const pageContent = await extractor.extract(page);

          markdownPageContent.html = pageContent.html || "";
          markdownPageContent.title = pageContent.title || "";

          const turndownService = new TurndownService();
          markdownPageContent.markdown = turndownService.turndown(
            pageContent.html,
            {
              headingStyle: "atx",
              bulletListMarker: "-",
              codeBlockStyle: "fenced",
              emDelimiter: "*",
            }
          );

          return markdownPageContent;
        }
      } catch (error) {
        logWarning(
          `Error with ${extractor.name} extractor: ${(error as Error).message}`
        );
      }
    } else {
      logWarning(`No suitable extractor found for ${siteType}`);
    }

    return null;
  }

  /**
   * Scrapes a website starting from the given URL and returns an array of scraped pages.
   *
   * This method navigates through the website, extracts content using registered extractors,
   * and follows links within the same domain and root path. It respects the ignore list and
   * limits the number of pages scraped based on the provided options.
   *
   * @param startUrl - The URL of the website to start scraping from.
   * @param project - The project associated with the scraped content.
   * @returns A promise that resolves to an object containing an array of scraped pages.
   */
  public async scrape(startUrl: string): Promise<ScrapedPage[]> {
    if (!this.browser || !this.page) {
      await this.initialize();
    }

    const startUrlParsed = new URL(startUrl);
    const domainOnly = startUrlParsed.hostname;
    const rootPath = startUrlParsed.pathname;

    const delay = this.options.delay || 1000;
    const maxPages = this.options.maxPages || 999999999;
    const timeout = this.options.timeout || 30000;

    const pendingUrls: string[] = [startUrl];

    logInfo(`Starting scraping from: ${startUrl}`);

    while (pendingUrls.length > 0 && this.results.length < maxPages) {
      const currentUrl = pendingUrls.shift()!;
      const parsedUrl = new URL(currentUrl);

      // Remove any fragment
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
          timeout: timeout,
        });

        // Wait for content to stabilize
        await this.page!.waitForTimeout(500);

        let siteType = "unknown";

        for (const extractor of this.extractors) {
          if (await extractor.detect(this.page!)) {
            siteType = extractor.name;
            break;
          }
        }

        // Extract content using the appropriate extractor
        const content = await this.extractContent(this.page!, siteType);

        if (!content) {
          logWarning(`No content extracted from: ${cleanUrlString}`);
          continue;
        }

        logInfo(
          `Extracted content from: ${cleanUrlString} (${siteType}): ${content.markdown.length} characters`
        );

        if (content.markdown.length > 20) {
          const scrapedPage: ScrapedPage = {
            url: cleanUrlString,
            content: content.markdown,
            title: content.title,
            siteType: siteType,
            html: content.html,
          };

          this.results.push(scrapedPage);

          //logSuccess(`Saved/Updated content for: ${cleanUrlString}`);
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

          if (this.visited.has(cleanLink)) {
            //logWarning(`Already visited: ${cleanLink}`);
            continue;
          }

          if (!this.isSameDomain(linkUrl, domainOnly)) {
            logWarning(`Skipping different domain link: ${cleanLink}`);
            this.visited.add(cleanLink); // Mark as visited to avoid re-adding
            continue;
          }

          if (!this.isInSameRoot(linkUrl, rootPath)) {
            logWarning(`Skipping different root link: ${cleanLink}`);
            this.visited.add(cleanLink); // Mark as visited to avoid re-adding
            continue;
          }

          if (this.shouldIgnoreUrl(cleanLink)) {
            logWarning(`Ignoring URL in ignore list: ${cleanLink}`);
            this.visited.add(cleanLink); // Mark as visited to avoid re-adding
            continue;
          }

          pendingUrls.push(cleanLink);
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

  /**
   * Scrapes a single URL and extracts content using the appropriate extractor.
   *
   * This method navigates to the specified URL, waits for the page to stabilize,
   * and uses a set of extractors to identextify the site type and extract relevant content.
   * If the extracted content is meaningful (length > 20 characters), it returns a `ScrapedPage` object.
   * Otherwise, it logs a warning and returns `null`.
   *
   * @param url - The URL to scrape.
   * @returns A promise that resolves to a `ScrapedPage` object containing the URL, content, title, and site type,
   *          or `null` if no meaningful content is found or an error occurs.
   *
   * @throws Will log an error message if the scraping process fails.
   */
  public async scrapeSingleUrl(url: string): Promise<ScrapedPage | null> {
    let result: ScrapedPage | null = null;

    if (!this.browser || !this.page) {
      await this.initialize();
    }

    try {
      logInfo(`Navigating to single URL: ${url}`);
      await this.page!.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: this.options.timeout || 30000,
      });

      // Wait for content to stabilize
      await this.page!.waitForTimeout(500);

      let siteType = "unknown";

      for (const extractor of this.extractors) {
        if (await extractor.detect(this.page!)) {
          siteType = extractor.name;
          break;
        }
      }

      // Extract content using the appropriate extractor
      const content = await this.extractContent(this.page!, siteType);

      if (!content) {
        logWarning(`No content extracted from: ${url}`);
        return null;
      }

      if (content.markdown.length > 20) {
        result = {
          url: url,
          content: content.markdown,
          title: content.title,
          siteType: siteType,
          html: content.html,
        };

        logSuccess(
          `Extracted content from single URL: ${url} (${siteType}): ${content.markdown.length} characters`
        );
        return result;
      } else {
        logWarning(`No meaningful content found at: ${url}`);
        return null;
      }
    } catch (error) {
      logError(
        `Failed to scrape single URL ${url}: ${(error as Error).message}`
      );
      return null;
    }
  }
}

/**
 * Scrapes a website starting from the given URL and returns an array of scraped pages.
 *
 * @param startUrl - The URL of the website to start scraping from.
 * @returns A promise that resolves to an array of `ScrapedPage` objects containing the scraped data.
 * @throws Any errors encountered during the scraping process.
 */
export async function scrapeSite(
  startUrl: string,
  project: IProject
): Promise<ScrapedPage[]> {
  const scraper = new PluggableSiteScraper();
  try {
    return await scraper.scrape(startUrl);
  } finally {
    await scraper.close();
  }
}

export const scrapingService = new PluggableSiteScraper();
