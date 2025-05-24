import mongoose, { Document, Schema } from "mongoose";

const KnowledgeDocumentSchema = new Schema(
  {
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
    type: {
      type: String,
      required: true,
    },
    guildId: {
      type: String,
      default: null,
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
    },
    knowledgeSourceId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    projectId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    siteType: {
      type: String,
      required: false,
    },
  },
  { timestamps: true }
);

KnowledgeDocumentSchema.virtual("knowledgeSource", {
  ref: "KnowledgeSource",
  localField: "knowledgeSourceId",
  foreignField: "_id",
});

KnowledgeDocumentSchema.virtual("project", {
  ref: "Project",
  localField: "projectId",
  foreignField: "_id",
});

const KnowledgeDocument = mongoose.model<IKnowledgeDocument>(
  "KnowledgeDocument",
  KnowledgeDocumentSchema
);

export default KnowledgeDocument;
