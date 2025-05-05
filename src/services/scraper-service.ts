import { Browser, BrowserContext, Page, chromium } from "playwright";
import { logError, logInfo, logSuccess, logWarning } from "../helpers/logger";
import { MediaWikiContentExtractor } from "../contentProviders/mediawiki-content-extractor";
import { WordPressContentExtractor } from "../contentProviders/wordpress-content-extractor";
import { StandardContentExtractor } from "../contentProviders/standard-content-extractor";
import { saveOrUpdatePage } from "../mongo";
import { EchoKnowledgeBaseExtractor } from "../contentProviders/echo-kb-content-extractor";

/**
 * The `PluggableSiteScraper` class provides a flexible and extensible web scraping service
 * that supports multiple content extractors for different site types. It allows scraping
 * of web pages starting from a given URL, extracting meaningful content, and collecting links
 * for further scraping within the same domain and root path.
 *
 * ### Features:
 * - Supports pluggable content extractors for different site types.
 * - Handles domain and root path restrictions to limit scraping scope.
 * - Respects configurable options such as delay, maximum pages, and timeout.
 * - Maintains a visited URL set to avoid duplicate processing.
 * - Provides methods for scraping multiple pages or a single URL.
 *
 * ### Usage:
 * ```typescript
 * const scraper = new PluggableSiteScraper({
 *   delay: 2000,
 *   maxPages: 50,
 *   timeout: 30000,
 *   ignoreList: "example.com,ignore.com",
 * });
 *
 * const results = await scraper.scrape("https://example.com");
 * console.log(results);
 *
 * const singleResult = await scraper.scrapeSingleUrl("https://example.com/page");
 * console.log(singleResult);
 * ```
 *
 * ### Constructor:
 * @param options - Configuration options for the scraper, including delay, maxPages, timeout, and ignoreList.
 *
 * ### Methods:
 * - `registerExtractor(extractor: ContentExtractor): void`
 *   Registers a new content extractor to handle specific site types.
 *
 * - `initialize(): Promise<void>`
 *   Initializes the browser and page for scraping.
 *
 * - `close(): Promise<void>`
 *   Closes the browser and releases resources.
 *
 * - `scrape(startUrl: string): Promise<ScrapedPage[]>`
 *   Scrapes web pages starting from the specified URL, collecting content and links.
 *
 * - `scrapeSingleUrl(url: string): Promise<ScrapedPage | null>`
 *   Scrapes a single URL and extracts content using the appropriate extractor.
 *
 * ### Private Methods:
 * - `isSameDomain(url: URL, domain: string): boolean`
 *   Checks if a URL belongs to the same domain.
 *
 * - `isInSameRoot(url: URL, rootPath: string): boolean`
 *   Checks if a URL is within the same root path.
 *
 * - `shouldIgnoreUrl(url: string): boolean`
 *   Determines if a URL should be ignored based on the ignore list.
 *
 * - `extractContent(page: Page, siteType: string): Promise<PageContent | null>`
 *   Extracts content from a web page using the appropriate content extractor.
 *
 * ### Remarks:
 * - The scraper uses Playwright for browser automation.
 * - Extracted content is saved or updated using the `saveOrUpdatePage` function.
 * - The class is designed to be extensible by registering custom content extractors.
 *
 * ### Dependencies:
 * - Playwright (`chromium`, `Browser`, `BrowserContext`, `Page`).
 * - Custom content extractors implementing the `ContentExtractor` interface.
 *
 * ### Example:
 * ```typescript
 * const scraper = new PluggableSiteScraper({
 *   delay: 1000,
 *   maxPages: 10,
 *   timeout: 20000,
 * });
 *
 * await scraper.initialize();
 * const results = await scraper.scrape("https://example.com");
 * console.log(results);
 * await scraper.close();
 * ```
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
  ): Promise<PageContent | null> {
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
          return await extractor.extract(page);
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
   * Scrapes web pages starting from the given URL and collects content and links
   * based on specified criteria. The method ensures that only pages within the
   * same domain and root path are processed, and it respects a delay between
   * requests to avoid overloading the server.
   *
   * @param startUrl - The starting URL for the scraping process.
   * @returns A promise that resolves to an array of `ScrapedPage` objects containing
   *          the scraped content, title, URL, and site type.
   *
   * The scraping process includes:
   * - Navigating to the specified URL and extracting content using registered extractors.
   * - Filtering links to ensure they belong to the same domain and root path.
   * - Ignoring URLs based on a predefined ignore list.
   * - Respecting a maximum number of pages to scrape and a timeout for page navigation.
   *
   * The method logs progress, warnings, and errors during the scraping process.
   * It also saves or updates the scraped content using the `saveOrUpdatePage` function.
   *
   * @throws An error if the scraping process encounters issues, such as navigation timeouts
   *         or content extraction failures.
   */
  public async scrape(startUrl: string): Promise<ScrapedPage[]> {
    if (!this.browser || !this.page) {
      await this.initialize();
    }

    const startUrlParsed = new URL(startUrl);
    const domainOnly = startUrlParsed.hostname;
    const rootPath = startUrlParsed.pathname;

    const delay = this.options.delay || 1000;
    const maxPages = this.options.maxPages || 100;
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
          `Extracted content from: ${cleanUrlString} (${siteType}): ${content.content.length} characters`
        );

        if (content.content.length > 20) {
          const scrapedPage: ScrapedPage = {
            url: cleanUrlString,
            content: content.content,
            title: content.title,
            siteType,
            content_length: content.content.length,
          };

          const shouldUpdate = await saveOrUpdatePage(scrapedPage);
          scrapedPage.shouldUpdate = shouldUpdate;

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
   * and uses a set of extractors to identify the site type and extract relevant content.
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

      if (content.content.length > 20) {
        const scrapedPage: ScrapedPage = {
          url: url,
          content: content.content,
          title: content.title,
          siteType,
          content_length: content.content.length,
        };

        const shouldUpdate = await saveOrUpdatePage(scrapedPage);
        scrapedPage.shouldUpdate = shouldUpdate;

        logSuccess(
          `Extracted content from single URL: ${url} (${siteType}): ${content.content.length} characters`
        );
        return scrapedPage;
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
export async function scrapeSite(startUrl: string): Promise<ScrapedPage[]> {
  const scraper = new PluggableSiteScraper();
  try {
    return await scraper.scrape(startUrl);
  } finally {
    await scraper.close();
  }
}
