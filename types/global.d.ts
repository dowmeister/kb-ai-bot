interface BotAnswer {
  guildId: string | null;
  answer: string;
  question: string;
  questionMessageId: string;
  questionUserId: string;
  questionUsername: string;
  urls: string[];
  answerMessageId: string;
  channelId: string;
}

interface MissedAnswer {
  guildId: string | null;
  question: string;
  questionUserId: string;
  questionUsername: string;
  messageId: string;
  urls: string[];
  channelId: string;
}

interface IDiscordMessage {
  guildId: string | null;
  content: string;
  authorId: string;
  authorUsername: string;
  channelId: string;
  channelName: string;
  messageId: string;
  verified?: boolean;
  verifiedAnswer?: string;
}

interface ScrapedPage {
  url: string;
  content: string;
  shouldUpdate?: boolean;
  title?: string;
  summary?: string;
  update_at?: Date;
  content_length?: number;
  siteType?: string;
}

interface PageContent {
  content: string;
  title?: string;
}

interface VectorEmbed {
  id: string;
  vector: number[];
  payload: {
    url: string;
    content: string;
    title?: string;
  };
}

interface EmbedContent {
  url: string;
  content: string;
  title?: string;
  embedding: number[];
}

interface DiscordCommand {
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}

interface AIAnswer {
  answer: string;
  urls: string[];
  replied?: boolean;
}

type QdrantEmbeddingPayload = Record<string, any> & {
  url?: string;
  text: string;
  title?: string;
  documentKey: string;
  source?: QdrantEmbeddingPayloadSource;
  isSummary?: boolean;
  chunkIndex?: number;
  guildId?: string | null;
};

type QdrantEmbeddingPayloadSource = "discord" | "web-scraper";

/**
 * Interface for content extractors
 */
interface ContentExtractor {
  name: SiteType;
  detect(page: Page): Promise<boolean>;
  extract(page: Page): Promise<PageContent>;
}

/**
 * Interface for site scraper options
 */
interface SiteScraperOptions {
  maxPages?: number;
  delay?: number;
  ignoreList?: string;
  maxRetries?: number;
  timeout?: number;
  userAgent?: string;
}

/**
 * Interface for sitemap URLs
 */
interface SitemapUrl {
  loc: string;
  lastmod?: string;
  changefreq?: string;
  priority?: string;
}

/**
 * Interface for sitemap index
 */
interface SitemapIndex {
  sitemapindex: {
    sitemap: Array<{
      loc: string;
      lastmod?: string;
    }>;
  };
}

/**
 * Interface for regular sitemap
 */
interface Sitemap {
  urlset: {
    url: SitemapUrl[] | SitemapUrl;
  };
}

/**
 * Options for the sitemap scraper
 */
interface SitemapScraperOptions {
  maxUrls?: number;
  delay?: number;
  ignorePatterns?: string[];
  priorityThreshold?: number;
  concurrency?: number;
  scraperOptions?: SiteScraperOptions;
}

interface IKnowledgeDocument {
  title?: string;
  content: string;
  key: string;
  url?: string;
  isSummary?: boolean;
  source: "web-scraper" | "discord" | "manual" | "pdf-document";
  guildId?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
  projectId?: string;
  contentLength: number;
  pageType?: string;
  summary?: string;
  knowledgeSource?: IKnowledgeSource | string;
  project?: IProject | string;
}

type WebScraperResults = {
  pages: Array<{
    document: IKnowledgeDocument;
    shouldUpdate: boolean;
  }>;
};

interface IProject extends Document {
  _id: string;
  name: string;
  description: string;
  guildId?: string;
  createdAt: Date;
  updatedAt: Date;
  knowledgeSources: Array<IKnowledgeSource>;
}

interface IKnowledgeSource {
  type: "web";
  url: string;
  project: IProject | string;
  createdAt?: Date;
  updatedAt?: Date;
}
