import mongoose, { Document, Schema } from "mongoose";

const DiscordMessageSchema = new Schema({
  messageId: {
    type: String,
    required: true,
  },
  channelId: {
    type: String,
    required: true,
  },
  authorId: {
    type: String,
    required: true,
  },
  authorUsername: {
    type: String,
    required: true,
  },
  channelName: {
    type: String,
    required: true,
  },
  guildId: {
    type: String,
    required: true,
  },
  content: {
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
  replied: {
    type: Boolean,
    default: false,
  },
  verified: {
    type: Boolean,
    default: false,
  },
  answer: {
    type: String,
    default: null,
  }
});

const DiscordMessage = mongoose.model<IKnowledgeDocument>(
  "DiscordMessage",
  DiscordMessageSchema
);

export default DiscordMessage;
