import mongoose, { Document, Schema } from "mongoose";

const knowledgeDocumentRetrievalErrorSchema = new Schema(
  {
    url: {
      type: String,
    },
    error: {
      type: String,
      required: true,
    },
    knowledgeSourceId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    projectId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

const KnowledgeDocumentRetrievalError = mongoose.model(
  "KnowledgeDocumentRetrievalError",
  knowledgeDocumentRetrievalErrorSchema
);

export default KnowledgeDocumentRetrievalError;