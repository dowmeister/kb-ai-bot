import { PluggableSiteScraper } from "../services/scraper-service";

async function main() {
  const scraper = new PluggableSiteScraper(
    "https://truckersmp.com/knowledge-base/article/19",
    {
      maxPages: 1,
    }
  );
  const result = await scraper.scrape();

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
