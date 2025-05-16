import { logSuccess } from "./helpers/logger";
import mongoose from "mongoose";

export async function initMongoose() : Promise<void> {
  await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/knoweledgefox");
  logSuccess("Connected to MongoDB with Mongoose");
}