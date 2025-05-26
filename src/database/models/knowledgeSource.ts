import mongoose, { Document, Schema } from "mongoose";

const schema = new Schema(
  {
    type: {
      type: String,
      required: true,
    },
    url: {
      type: String,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
    project: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: false,
    },
    status: {
      type: String,
      enum: ["not-scanned", "scanning", "scan-complete", "scan-failed"],
      default: "not-scanned",
    },
    maxPages: {
      type: Number,
    },
    delay: {
      type: Number,
      default: 1000,
    },
    ignoreList: {
      type: String,
      default: "",
    },
    maxRetries: {
      type: Number,
      default: 3,
    },
    timeout: {
      type: Number,
      default: 30000,
    },
    userAgent: {
      type: String,
      default:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
    },
  },
  { timestamps: true }
);

const KnowledgeSource = mongoose.model<IKnowledgeSource>(
  "KnowledgeSource",
  schema
);

export default KnowledgeSource;
