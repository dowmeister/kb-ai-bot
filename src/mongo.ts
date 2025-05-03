import { MongoClient, Db, Collection } from "mongodb";
import { logInfo, logWarning, logError } from "./logger";

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017";
const DB_NAME = process.env.MONGO_DB_NAME || "knowledge_base";
const DISCORD_COLLECTION_NAME =
  process.env.DISCORD_COLLECTION_NAME || "discord_messages";

let client: MongoClient;
let db: Db;
let isConnected = false;

export function getMongoClient(): MongoClient {
  if (!client) {
    throw new Error(
      "MongoDB client is not initialized. Call connectMongo first."
    );
  }
  return client;
}
/**
 * Connect to MongoDB and reuse the connection.
 */
export async function connectMongo(): Promise<Db> {
  if (isConnected && db) {
    return db;
  }

  try {
    client = await MongoClient.connect(MONGO_URI);
    db = client.db(DB_NAME);
    isConnected = true;
    logInfo(`Connected to MongoDB at ${MONGO_URI}`);
    return db;
  } catch (error) {
    logError(`Failed to connect to MongoDB: ${(error as Error).message}`);
    throw error;
  }
}

/**
 * Get the collection for scraped web pages.
 */
export async function getPagesCollection(): Promise<Collection> {
  const db = await connectMongo();
  return db.collection("pages");
}

/**
 * Get the collection for Discord messages.
 */
export async function getDiscordMessagesCollection(): Promise<Collection> {
  const db = await connectMongo();
  return db.collection(DISCORD_COLLECTION_NAME);
}

/**
 * Save or update a scraped page by URL.
 */
export async function saveOrUpdatePage(page: ScrapedPage): Promise<boolean> {
  const collection = await getPagesCollection();

  const existing = await collection.findOne({ url: page.url });

  if (!existing) {
    await collection.insertOne({ ...page, updatedAt: new Date() });
    return true; // New page inserted
  }

  if (existing.content !== page.content) {
    await collection.updateOne(
      { url: page.url },
      {
        $set: {
          title: page.title,
          content: page.content,
          summary: page.summary,
          updatedAt: new Date(),
          content_length: page.content.length,
          siteType: page.siteType,
        },
      }
    );

    return true; // Content changed
  }

  return false; // No changes
}

/**
 * Retrieve all saved pages.
 */
export async function getAllPages(): Promise<any[]> {
  const collection = await getPagesCollection();
  return await collection.find({}).toArray();
}

/**
 * Save a Discord message to the database.
 */
export async function saveDiscordMessage(
  message: DiscordMessage
): Promise<void> {
  const collection = await getDiscordMessagesCollection();

  await collection.updateOne(
    { messageId: message.messageId },
    { $set: message },
    { upsert: true }
  );
}

/**
 * Verify a user message based on a moderator reply.
 */
export async function verifyUserMessage(
  messageId: string,
  moderatorReply: string
): Promise<void> {
  const collection = await getDiscordMessagesCollection();

  const original = await collection.findOne({ messageId });

  if (!original) {
    logWarning(`Original message not found for verification: ${messageId}`);
    return;
  }

  await collection.updateOne(
    { messageId },
    {
      $set: { verifiedAnswer: moderatorReply, verified: true, trustScore: 2.5 },
    }
  );

  logInfo(`Message ${messageId} has been verified by a moderator.`);
}

export async function saveAnswer(message: BotAnswer): Promise<void> {
  const db = await connectMongo();

  const collection = db.collection("answers");

  await collection.insertOne(message);
}

export async function saveMissedAnswer(message: MissedAnswer): Promise<void> {
  const db = await connectMongo();

  const collection = db.collection("missed_answers");

  await collection.insertOne(message);
}

export async function updatePageSummary(
  url: string,
  summary: string
): Promise<void> {
  const db = await connectMongo();

  const collection = db.collection("pages");

  await collection.updateOne({ url }, { $set: { summary } });
}
