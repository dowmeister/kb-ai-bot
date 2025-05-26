import { Router, Request, Response } from "express";
import { askQuestion } from "../../ai/ask";
import ApiResponse from "../../helpers/api-response";
import Project from "../../database/models/project";

const router = Router();

router.post(
  "/:project_id/completions",
  async (req: Request, res: Response): Promise<any> => {
    try {
      const { message } = req.body;
      if (!message) {
        return res
          .status(400)
          .json({ error: "Question and context are required" });
      }

      const project = await Project.findById(req.params.project_id);

      const answer = await askQuestion(message, project as IProject);

      res.json(new ApiResponse(answer, true, "Question answered successfully"));
    } catch (err) {
      res
        .status(500)
        .json(new ApiResponse(null, false, (err as Error).message));
    }
  }
);

export default router;
