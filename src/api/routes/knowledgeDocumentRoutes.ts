import { Router, Request, Response } from "express";
import KnowledgeDocument from "../../database/models/knowledgeDocument";
import ApiResponse from "../../helpers/api-response";
import { knowledgeService } from "../../services/knowledge-service";
import { qdrantService } from "../../services/qdrant-service";

const router = Router();

type KnowledgeDocumentQuery = {
  projectId: string;
  knowledgeSourceId?: string;
  title?: RegExp;
  content?: RegExp;
  url?: RegExp;
  siteType?: string;
};

// Get all documents
router.get("/:project_id/documents", async (_req: Request, res: Response) => {
  try {
    const parameters: KnowledgeDocumentQuery = {
      projectId: _req.params.project_id,
    };

    if (_req.query.knowledgeSourceId && _req.query.knowledgeSourceId != "") {
      parameters.knowledgeSourceId = _req.query.knowledgeSourceId as string;
    }

    if (_req.query.title && _req.query.title != "") {
      parameters.title = new RegExp(_req.query.title.toString(), "i");
    }

    if (_req.query.content && _req.query.content != "") {
      parameters.content = new RegExp(_req.query.content.toString(), "im");
    }

    if (_req.query.url && _req.query.url != "") {
      parameters.url = new RegExp(_req.query.url.toString(), "i");
    }

    if (_req.query.siteType && _req.query.siteType != "") {
      parameters.siteType = _req.query.siteType as string;
    }

    const docs = await KnowledgeDocument.find(parameters)
      .populate("knowledgeSource")
      .populate("project")
      .exec();

    res.json(new ApiResponse(docs));
  } catch (err) {
    res.status(500).json(new ApiResponse([], false, (err as Error).message));
  }
});

// Get a document by ID
router.get(
  "/:project_id/documents/:id",
  async (req: Request, res: Response): Promise<any> => {
    try {
      const doc = await KnowledgeDocument.findOne({
        _id: req.params.id,
        projectId: req.params.project_id,
      })
        .populate("knowledgeSource")
        .populate("project")
        .exec();

      if (!doc)
        return res.status(404).json(new ApiResponse(null, false, "Not found"));

      res.json(new ApiResponse(doc));
    } catch (err) {
      res
        .status(500)
        .json(new ApiResponse(null, false, (err as Error).message));
    }
  }
);

// Create a new document
router.post(
  "/:project_id/documents",
  async (req: Request, res: Response): Promise<any> => {
    try {
      const doc = new KnowledgeDocument(req.body as IKnowledgeDocument);
      await doc.save();
      res.status(201).json(new ApiResponse(doc));
    } catch (err) {
      res
        .status(400)
        .json(new ApiResponse(null, false, (err as Error).message));
    }
  }
);

// Update a document by ID
router.put(
  "/:project_id/documents/:id",
  async (req: Request, res: Response): Promise<any> => {
    try {
      const doc = await KnowledgeDocument.findByIdAndUpdate(
        req.params.id,
        req.body as IKnowledgeDocument,
        { new: true }
      );
      if (!doc)
        return res.status(404).json(new ApiResponse(null, false, "Not found"));
      res.json(new ApiResponse(doc));
    } catch (err) {
      res
        .status(400)
        .json(new ApiResponse(null, false, (err as Error).message));
    }
  }
);

// Delete a document by ID
router.delete(
  "/:project_id/documents/:id",
  async (req: Request, res: Response): Promise<any> => {
    try {
      const doc = await KnowledgeDocument.findOneAndDelete({
        _id: req.params.id,
        projectId: req.params.project_id,
      });
      if (!doc)
        return res.status(404).json(new ApiResponse(null, false, "Not found"));
      res.json(new ApiResponse(doc));
    } catch (err) {
      res
        .status(500)
        .json(new ApiResponse(null, false, (err as Error).message));
    }
  }
);

// Create a new document
router.post(
  "/:project_id/documents/:id/refresh",
  async (req: Request, res: Response): Promise<any> => {
    try {
      const document = await knowledgeService.scrapeDocumentAndEmbed(
        req.params.id
      );

      if (!document) {
        return res
          .status(404)
          .json(
            new ApiResponse(
              null,
              false,
              "Document not found or no URL to scrape"
            )
          );
      }

      res
        .status(200)
        .json(new ApiResponse(document, true, "Document refreshed"));
    } catch (err) {
      res
        .status(400)
        .json(new ApiResponse(null, false, (err as Error).message));
    }
  }
);

// Get a document by ID
router.get(
  "/:project_id/documents/:id/vectors",
  async (req: Request, res: Response): Promise<any> => {
    try {
      const vectors = await qdrantService.findVectorsByKnolwedgeDocumentId(
        req.params.id
      );

      return res.json(
        new ApiResponse(vectors, true, "Vectors retrieved successfully")
      );
    } catch (err) {
      res
        .status(500)
        .json(new ApiResponse(null, false, (err as Error).message));
    }
  }
);

export default router;
