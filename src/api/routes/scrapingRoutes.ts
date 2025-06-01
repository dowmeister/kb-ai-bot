import { Request, Response, Router } from "express";
import ApiResponse from "../../helpers/api-response";
import { embeddingService } from "../../services/embedding-service";
import { PluggableSiteScraper } from "../../services/scraper-service";

const router = Router();

router.post("/test", async (_req: Request, res: Response): Promise<any> => {
  try {
    const scraper = new PluggableSiteScraper();
    const scrapedPage = await scraper.scrapeSingleUrl(_req.body.url);

    if (!scrapedPage) {
      return res
        .status(404)
        .json(new ApiResponse(null, false, "Page not found"));
    }

    const chunks = await embeddingService.splitTextIntoChunks(
      scrapedPage.content
    );

    const scrapingResult = {
      page: scrapedPage,
      chunks: chunks,
    };

    res
      .status(200)
      .json(new ApiResponse(scrapingResult, true, "Scraping successful"));
  } catch (err) {
    res
      .status(500)
      .json(new ApiResponse<IProject[]>([], false, (err as Error).message));
  }
});

export default router;
