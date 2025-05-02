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

interface DiscordMessage {
  guildId: string | null;
  content: string;
  authorId: string;
  authorUsername: string;
  isModerator: boolean;
  timestamp: Date;
  channelId: string;
  messageId: string;
  parentMessageId?: string;
  trustScore: number;
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
