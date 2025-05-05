import 'dotenv/config';

import { SitemapScraper } from "../services/xml-sitemap-scraper";

async function main() {
    const scraper = new SitemapScraper();
    const pages = await scraper.scrapeFromSitemap("https://truckymods.io/sitemap.xml");
}

main()
  .catch((err) => {
    console.error("Error:", err);
  })
  .then(() => {
    process.exit(0);
  });