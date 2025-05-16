import { Router, Request, Response, NextFunction } from "express";
import Project from "../../database/models/project";

const router = Router();

// Get all projects
router.get("/", async (_req: Request, res: Response) => {
  try {
    const projects = await Project.find({});
    res.json(projects);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Get a project by ID
router.get("/:id", async (req: Request, res: Response): Promise<any> => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ error: "Not found" });
    res.json(project);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Create a new project
router.post("/", async (req: Request, res: Response): Promise<any> => {
  try {
    const project = new Project(req.body as IProject);
    await project.save();
    res.status(201).json(project);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
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
    if (!project) return res.status(404).json({ error: "Not found" });
    res.json(project);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

// Delete a project by ID
router.delete("/:id", async (req: Request, res: Response): Promise<any> => {
  try {
    const project = await Project.findByIdAndDelete(req.params.id);
    if (!project) return res.status(404).json({ error: "Not found" });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
