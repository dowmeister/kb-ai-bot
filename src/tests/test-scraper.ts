import { PluggableSiteScraper } from "../services/scraper-service";

async function main() {
  const scraper = new PluggableSiteScraper(
    "https://trucksimulator.wiki.gg/wiki/States",
    {
      maxPages: 1,
    }
  );
  const result = await scraper.scrapeSingleUrl(
    "https://trucksimulator.wiki.gg/wiki/States"
  );

  if (result) {
    console.log(result.content);
  }
}

main()
  .catch((err) => {
    console.error("Error:", err);
  })
  .then(() => {
    process.exit(0);
  });
