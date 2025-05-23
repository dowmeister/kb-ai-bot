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
  },
  { timestamps: true }
);

const KnowledgeSource = mongoose.model<IKnowledgeSource>(
  "KnowledgeSource",
  schema
);

export default KnowledgeSource;
