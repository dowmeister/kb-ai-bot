import mongoose, { Document, Schema } from "mongoose";
import KnowledgeSource from "./knowledgeSource";

new KnowledgeSource();

const ProjectSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: false,
    },
    guildId: {
      type: String,
      required: false,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
    aiService: {
      type: String,
      required: true,
      default: "gemini",
    },
    aiModel: {
      type: String,
    },
    agentPrompt: {
      type: String,
    },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// Virtual to populate sources
ProjectSchema.virtual("knowledgeSources", {
  ref: "KnowledgeSource",
  localField: "_id",
  foreignField: "project",
});

const Project = mongoose.model<IProject>("Project", ProjectSchema);

export default Project;
