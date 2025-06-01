import mongoose, { Schema } from "mongoose";

const appConfigSchema = new Schema<IAppConfig>({
  default_ai_provider: {
    type: String,
    default: "gemini",
  },
  gemini: {
    default_model: {
      type: String,
      default: "gemini-2.0-flash",
    },
  },
  openai: {
    default_model: {
      type: String,
      default: "gpt-4o",
    },
  },
  anthropic: {
    default_model: {
      type: String,
      default: "claude-3-5-sonnet-20240620",
    },
  },
  ollama: {
    default_model: {
      type: String,
      default: "llama3",
    },
  },
  min_score_threshold: {
    type: Number,
    default: 0.5,
  },
  max_vectors_results_size: {
    type: Number,
    default: 3,
  },
  max_vectors_group_size: {
    type: Number,
    default: 3,
  },
  vector_size: {
    type: Number,
    default: 512,
  },
});

const AppConfig = mongoose.model<IAppConfig>("AppConfig", appConfigSchema);

export default AppConfig;
