import { Router, Request, Response } from "express";
import KnowledgeDocument from "../../database/models/knowledgeDocument";

const router = Router();

// Get all documents
router.get("/", async (_req: Request, res: Response) => {
  try {
    const docs = await KnowledgeDocument.find({});
    res.json(docs);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Get a document by ID
router.get("/:id", async (req: Request, res: Response) : Promise<any> => {
  try {
    const doc = await KnowledgeDocument.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: "Not found" });
    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Create a new document
router.post("/", async (req: Request, res: Response) : Promise<any> => {
  try {
    const doc = new KnowledgeDocument(req.body as IKnowledgeDocument);
    await doc.save();
    res.status(201).json(doc);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

// Update a document by ID
router.put("/:id", async (req: Request, res: Response) : Promise<any> => {
  try {
    const doc = await KnowledgeDocument.findByIdAndUpdate(
      req.params.id,
      req.body as IKnowledgeDocument,
      { new: true }
    );
    if (!doc) return res.status(404).json({ error: "Not found" });
    res.json(doc);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

// Delete a document by ID
router.delete("/:id", async (req: Request, res: Response) : Promise<any> => {
  try {
    const doc = await KnowledgeDocument.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ error: "Not found" });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;