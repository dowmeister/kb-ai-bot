import { Router, Request, Response } from "express";
import { askQuestion } from "../../ai/ask";

const router = Router();

router.post("/", async (req: Request, res: Response): Promise<any> => {
  try {
    const { question } = req.body;
    if (!question) {
      return res
        .status(400)
        .json({ error: "Question and context are required" });
    }

    const answer = await askQuestion(question);

    res.json({ answer });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;