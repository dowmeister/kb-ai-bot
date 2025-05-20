import mongoose, { Document, Schema } from "mongoose";

const KnowledgeDocumentSchema = new Schema({
  title: {
    type: String,
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  key: {
    type: String,
    required: true,
  },
  url: {
    type: String,
    default: null,
  },
  isSummary: {
    type: Boolean,
    default: false,
  },
  source: {
    type: String,
    required: true,
  },
  guildId: {
    type: String,
    default: null,
  },
  projectId: {
    type: String,
    required: false,
  },
  project: {
    type: Schema.Types.ObjectId,
    ref: "Project",
    required: true,
  },
  pageType: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  contentLength: {
    type: Number,
    required: true,
  },
  summary: {
    type: String,
    default: null,
  }
}, { timestamps: true });


const KnowledgeDocument = mongoose.model<IKnowledgeDocument>(
  "KnowledgeDocument",
  KnowledgeDocumentSchema
);

export default KnowledgeDocument;
