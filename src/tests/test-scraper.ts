import "dotenv/config";

import { PluggableSiteScraper } from "../services/scraper-service";

async function main() {
  const scraper = new PluggableSiteScraper({
    maxPages: 1,
  });
  const result = await scraper.scrape(
    "https://truckersmp.com/knowledge-base/article/19"
  );

  if (result) {
    console.log(result[0].content); // Print the text of the first content item
  }
}

main()
  .catch((err) => {
    console.error("Error:", err);
  })
  .then(() => {
    process.exit(0);
  });
