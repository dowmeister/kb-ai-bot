import { Browser, BrowserContext, Page, chromium } from "playwright";
import { logError, logInfo, logSuccess, logWarning } from "../helpers/logger";
import { MediaWikiContentExtractor } from "../contentProviders/mediawiki-content-extractor";
import { WordPressContentExtractor } from "../contentProviders/wordpress-content-extractor";
import { StandardContentExtractor } from "../contentProviders/standard-content-extractor";
import { saveOrUpdatePage } from "../mongo";
import { EchoKnowledgeBaseExtractor } from "../contentProviders/echo-kb-content-extractor";

/**
 * A pluggable site scraper that can scrape web pages, extract content, and follow links
 * within the same domain and root path. It supports multiple content extractors and
 * allows for customization through options.
 *
 * The scraper uses Playwright to navigate web pages and extract content. It can scrape
 * multiple pages starting from a given URL or scrape a single URL without following links.
 *
 * @class PluggableSiteScraper
 * @example
 * ```typescript
 * const scraper = new PluggableSiteScraper("https://example.com", {
 *   maxPages: 50,
 *   delay: 2000,
 *   userAgent: "CustomUserAgent/1.0",
 * });
 * await scraper.scrape();
 * ```
 *
 * @remarks
 * - The scraper supports registering custom content extractors.
 * - It respects an ignore list to skip specific URLs.
 * - It ensures that only pages within the same domain and root path are scraped.
 *
 * @param startUrl - The starting URL for the scraper.
 * @param options - Configuration options for the scraper.
 *
 * @property visited - A set of visited URLs to prevent duplicate scraping.
 * @property browser - The Playwright browser instance.
 * @property context - The Playwright browser context.
 * @property page - The Playwright page instance.
 * @property results - The list of scraped pages.
 * @property ignoreList - A list of URL patterns to ignore during scraping.
 * @property extractors - A list of registered content extractors.
 *
 * @method registerExtractor - Registers a new content extractor.
 * @method initialize - Initializes the browser and page.
 * @method close - Closes the browser and releases resources.
 * @method scrape - Scrapes multiple pages starting from the `startUrl`.
 * @method scrapeSingleUrl - Scrapes a single URL without following links.
 */
export class PluggableSiteScraper {
  private visited = new Set<string>();
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private results: ScrapedPage[] = [];
  private ignoreList: string[] = [];
  private extractors: ContentExtractor[] = [];

  constructor(
    private startUrl: string,
    private options: SiteScraperOptions = {}
  ) {
    this.ignoreList =
      options.ignoreList?.split(",") ||
      process.env.SCRAPING_IGNORE_LIST?.split(",") ||
      [];

    // Register default extractors
    this.registerExtractor(new MediaWikiContentExtractor());
    this.registerExtractor(new EchoKnowledgeBaseExtractor());
    this.registerExtractor(new WordPressContentExtractor());
    this.registerExtractor(new StandardContentExtractor());

    logInfo(`Initialized PluggableSiteScraper for ${startUrl}`);
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
    this.browser = await chromium.launch();
    this.context = await this.browser.newContext({
      userAgent: this.options.userAgent || "Mozilla/5.0 SiteScraperBot/1.0",
    });
    this.page = await this.context.newPage();
  }

  /**
   * Close browser and resources
   */
  async close(): Promise<void> {
    if (this.context) await this.context.close();
    if (this.browser) await this.browser.close();
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
   * Scrapes web pages starting from the specified `startUrl` and collects content
   * and links within the same domain and root path. The method respects the
   * configured delay, maximum pages, and timeout options.
   *
   * @returns {Promise<ScrapedPage[]>} A promise that resolves to an array of scraped pages.
   *
   * @remarks
   * - The method initializes the browser and page if they are not already initialized.
   * - It ensures that only pages within the same domain and root path are scraped.
   * - URLs in the ignore list are skipped.
   * - Extracted content is saved or updated using the `saveOrUpdatePage` function.
   * - Links from the current page are collected and added to the queue if they meet the criteria.
   * - A delay is respected between requests to avoid overloading the server.
   *
   * @throws {Error} If navigation or content extraction fails for a specific URL.
   *
   * @example
   * ```typescript
   * const scraperService = new ScraperService({
   *   startUrl: "https://example.com",
   *   options: { delay: 2000, maxPages: 50, timeout: 30000 },
   * });
   * const results = await scraperService.scrape();
   * console.log(results);
   * ```
   */
  public async scrape(): Promise<ScrapedPage[]> {
    if (!this.browser || !this.page) {
      await this.initialize();
    }

    const startUrlParsed = new URL(this.startUrl);
    const domainOnly = startUrlParsed.hostname;
    const rootPath = startUrlParsed.pathname;

    const delay = this.options.delay || 1000;
    const maxPages = this.options.maxPages || 100;
    const timeout = this.options.timeout || 30000;

    const pendingUrls: string[] = [this.startUrl];

    logInfo(`Starting scraping from: ${this.startUrl}`);

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
        };

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
  const scraper = new PluggableSiteScraper(startUrl);
  try {
    return await scraper.scrape();
  } finally {
    await scraper.close();
  }
}
