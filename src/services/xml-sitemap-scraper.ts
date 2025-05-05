import axios from "axios";
import { logError, logInfo, logSuccess } from "../helpers/logger";
import { PluggableSiteScraper } from "./scraper-service";
import { XMLParser } from "fast-xml-parser";

/**
 * Class for scraping websites using their sitemap.xml
 */
export class SitemapScraper {
  private options: SitemapScraperOptions;
  private processedUrls: Set<string> = new Set();
  private results: any[] = [];

  constructor(options: SitemapScraperOptions = {}) {
    this.options = {
      maxUrls: options.maxUrls || Infinity,
      delay: options.delay || 1000,
      ignorePatterns: options.ignorePatterns || [],
      priorityThreshold: options.priorityThreshold || 0,
      concurrency: options.concurrency || 1,
      scraperOptions: options.scraperOptions || {
        maxPages: 1,
      },
    };

    logInfo(`Initialized SitemapScraper with max ${this.options.maxUrls} URLs`);
  }

  /**
   * Fetches and parses XML from a URL
   */
  private async fetchXml(url: string): Promise<any> {
    try {
      logInfo(`Fetching XML from ${url}`);
      const response = await axios.get(url, {
        headers: {
          "User-Agent": "KnowledgeFox Sitemap Scraper/1.0",
          Accept: "application/xml, text/xml, */*",
        },
        timeout: 30000,
      });

      const parserOptions = {
        ignoreAttributes: false,
        parseAttributeValue: true,
        attributeNamePrefix: "@_",
      };

      const parser = new XMLParser(parserOptions);
      let jObj = parser.parse(response.data);

      return jObj;
    } catch (error) {
      throw new Error(
        `Failed to fetch or parse XML from ${url}: ${(error as Error).message}`
      );
    }
  }

  /**
   * Detects if the given XML is a sitemap index (containing multiple sitemaps)
   */
  private isSitemapIndex(data: any): boolean {
    return (
      data && data.sitemapindex && Array.isArray(data.sitemapindex.sitemap)
    );
  }

  /**
   * Process a sitemap index by fetching all referenced sitemaps
   */
  private async processSitemapIndex(
    sitemapIndex: SitemapIndex
  ): Promise<SitemapUrl[]> {
    const allUrls: SitemapUrl[] = [];

    const sitemaps = Array.isArray(sitemapIndex.sitemapindex.sitemap)
      ? sitemapIndex.sitemapindex.sitemap
      : [sitemapIndex.sitemapindex.sitemap];

    logInfo(`Found sitemap index with ${sitemaps.length} sitemaps`);

    for (const sitemap of sitemaps) {
      try {
        const sitemapData = await this.fetchXml(sitemap.loc);

        if (sitemapData && sitemapData.urlset && sitemapData.urlset.url) {
          const urls = Array.isArray(sitemapData.urlset.url)
            ? sitemapData.urlset.url
            : [sitemapData.urlset.url];

          allUrls.push(...urls);
          logSuccess(`Added ${urls.length} URLs from sitemap ${sitemap.loc}`);
        }

        // Respect delay between sitemap requests
        await new Promise((resolve) => setTimeout(resolve, this.options.delay));
      } catch (error) {
        logError(
          `Error processing sitemap ${sitemap.loc}: ${(error as Error).message}`
        );
      }
    }

    return allUrls;
  }

  /**
   * Process a regular sitemap and extract URLs
   */
  private processSitemap(sitemap: Sitemap): SitemapUrl[] {
    if (!sitemap.urlset || !sitemap.urlset.url) {
      return [];
    }

    const urls = Array.isArray(sitemap.urlset.url)
      ? sitemap.urlset.url
      : [sitemap.urlset.url];

    logInfo(`Found regular sitemap with ${urls.length} URLs`);
    return urls;
  }

  /**
   * Filter URLs based on options (ignore patterns, priority, etc.)
   */
  private filterUrls(urls: SitemapUrl[]): SitemapUrl[] {
    return urls.filter((url) => {
      // Skip already processed URLs
      if (this.processedUrls.has(url.loc)) {
        return false;
      }

      // Skip URLs matching ignore patterns
      if (
        this.options.ignorePatterns!.some((pattern) =>
          url.loc.includes(pattern)
        )
      ) {
        return false;
      }

      // Skip URLs with priority lower than threshold
      if (
        url.priority &&
        parseFloat(url.priority) < this.options.priorityThreshold!
      ) {
        return false;
      }

      return true;
    });
  }

  /**
   * Main method to scrape a website using its sitemap
   */
  public async scrapeFromSitemap(sitemapUrl: string): Promise<ScrapedPage[]> {
    const pages: ScrapedPage[] = [];

    try {
      logInfo(`Starting sitemap scraping from ${sitemapUrl}`);
      const sitemapData = await this.fetchXml(sitemapUrl);

      let urls: SitemapUrl[] = [];

      // Check if this is a sitemap index or a regular sitemap
      if (this.isSitemapIndex(sitemapData)) {
        urls = await this.processSitemapIndex(sitemapData as SitemapIndex);
      } else if (sitemapData.urlset) {
        urls = this.processSitemap(sitemapData as Sitemap);
      } else {
        throw new Error(
          "Invalid sitemap format: neither sitemap index nor regular sitemap"
        );
      }

      // Filter URLs based on options
      const filteredUrls = this.filterUrls(urls);

      // Limit number of URLs to process
      const urlsToProcess = filteredUrls.slice(0, this.options.maxUrls);

      logInfo(
        `Processing ${urlsToProcess.length} URLs out of ${urls.length} total URLs`
      );

      // Process URLs in batches based on concurrency
      const batchSize = this.options.concurrency!;

      const scraper = new PluggableSiteScraper(this.options.scraperOptions);

      for (let i = 0; i < urlsToProcess.length; i += batchSize) {
        const batch = urlsToProcess.slice(i, i + batchSize);

        const batchPromises = batch.map(async (url) => {
          try {
            const scrapedPage = await scraper.scrapeSingleUrl(url.loc);

            if (scrapedPage) {
              this.results.push(scrapedPage);
              this.processedUrls.add(url.loc);
              logSuccess(`Successfully scraped ${url.loc}`);

              pages.push(scrapedPage);
            }
          } catch (error) {
            logError(
              `Failed to scrape ${url.loc}: ${(error as Error).message}`
            );
          }

          // Respect delay between requests
          await new Promise((resolve) =>
            setTimeout(resolve, this.options.delay)
          );
        });

        // Wait for batch to complete
        await Promise.all(batchPromises);        
      }

      await scraper.close();

      logSuccess(
        `Sitemap scraping completed. Processed ${this.processedUrls.size} URLs.`
      );
      return pages;
    } catch (error) {
      logError(`Sitemap scraping failed: ${(error as Error).message}`);
      // Save whatever results we have
      return pages;
    }
  }
}
