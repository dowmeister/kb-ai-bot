import { Router, Request, Response, NextFunction } from "express";
import Project from "../../database/models/project";
import ApiResponse from "../../helpers/api-response";
import KnowledgeSource from "../../database/models/knowledgeSource";
import { queueManager } from "../../queue";

const router = Router();

// Get all projects
router.get("/", async (_req: Request, res: Response) => {
  try {
    const projects = await Project.find({});
    const apiResponse = new ApiResponse<IProject[]>(projects);

    res.json(apiResponse);
  } catch (err) {
    res
      .status(500)
      .json(new ApiResponse<IProject[]>([], false, (err as Error).message));
  }
});

// Get a project by ID
router.get("/:id", async (req: Request, res: Response): Promise<any> => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project)
      return res
        .status(404)
        .json(new ApiResponse<IProject>(null, false, "Not found"));

    const apiResponse = new ApiResponse<IProject>(project);
    res.json(apiResponse);
  } catch (err) {
    res
      .status(500)
      .json(new ApiResponse<IProject>(null, false, (err as Error).message));
  }
});

// Create a new project
router.post("/", async (req: Request, res: Response): Promise<any> => {
  try {
    const project = new Project(req.body as IProject);
    await project.save();
    res.status(201).json(new ApiResponse<IProject>(project));
  } catch (err) {
    res
      .status(400)
      .json(new ApiResponse<IProject>(null, false, (err as Error).message));
  }
});

// Update a project by ID
router.put("/:id", async (req: Request, res: Response): Promise<any> => {
  try {
    const project = await Project.findByIdAndUpdate(
      req.params.id,
      req.body as IProject,
      { new: true }
    );
    if (!project)
      return res
        .status(404)
        .json(new ApiResponse<IProject>(null, false, "Not found"));
    res.json(project);
  } catch (err) {
    res
      .status(400)
      .json(new ApiResponse<IProject>(null, false, (err as Error).message));
  }
});

// Delete a project by ID
router.delete("/:id", async (req: Request, res: Response): Promise<any> => {
  try {
    const project = await Project.findByIdAndDelete(req.params.id);
    if (!project)
      return res
        .status(404)
        .json(new ApiResponse<IProject>(null, false, "Not found"));
    res.json({ success: true });
  } catch (err) {
    res
      .status(500)
      .json(new ApiResponse<IProject>(null, false, (err as Error).message));
  }
});

router.get(
  "/:project_id/sources",
  async (req: Request, res: Response): Promise<any> => {
    try {
      const data = await KnowledgeSource.find({
        project: req.params.project_id,
      });
      const apiResponse = new ApiResponse<IKnowledgeSource[]>(data);
      res.json(apiResponse);
    } catch (err) {
      res
        .status(500)
        .json(new ApiResponse<IProject>(null, false, (err as Error).message));
    }
  }
);

router.post(
  "/:project_id/sources",
  async (req: Request, res: Response): Promise<any> => {
    try {
      const data = new KnowledgeSource(req.body as IProject);
      data.project = req.params.project_id;
      await data.save();
      res.status(201).json(new ApiResponse<IKnowledgeSource>(data));
    } catch (err) {
      res
        .status(400)
        .json(new ApiResponse<IProject>(null, false, (err as Error).message));
    }
  }
);

router.delete(
  "/:project_id/sources/:source_id",
  async (req: Request, res: Response): Promise<any> => {
    try {
      const data = await KnowledgeSource.findByIdAndDelete(
        req.params.source_id
      );
      res.status(201).json(new ApiResponse<IKnowledgeSource>(data));
    } catch (err) {
      res
        .status(400)
        .json(new ApiResponse<IProject>(null, false, (err as Error).message));
    }
  }
);

router.post(
  "/:project_id/sources/:source_id/scan",
  async (req: Request, res: Response): Promise<any> => {
    try {
      const source = await KnowledgeSource.findById(req.params.source_id)
        .populate("project")
        .exec();

      if (!source) {
        return res
          .status(404)
          .json(new ApiResponse<IProject>(null, false, "Not found"));
      }

      queueManager.startScrapingSource(source);

      res.status(201).json(new ApiResponse<IKnowledgeSource>(source));
    } catch (err) {
      res
        .status(400)
        .json(new ApiResponse<IProject>(null, false, (err as Error).message));
    }
  }
);

export default router;
