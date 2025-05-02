declare namespace NodeJS {
    interface ProcessEnv {
        QDRANT_URI: string;
        QDRANT_API_KEY?: string;
        QDRANT_COLLECTION: string;
        VECTOR_SIZE?: string;
        OPENAI_API_KEY?: string;
        EMBEDDING_SERVER_URL?: string;
        MONGO_URI: string;
        START_URL: string;
        HUGGINGFACE_API_KEY?: string;
        DISCORD_TOKEN: string;
        QUESTION_CLASSIFICATION_MODEL?: string;
        REPLY_LLM_MODEL: string;
        DISCORD_TESTING_CHANNEL_ID: string;
        DISCORD_GUILD_ID: string;
        SCRAPING_IGNORE_LIST?: string;
        PAGES_COLLECTION_NAME: string;
        DEFAULT_AI_PROVIDER: string;
        CLOUDFLARE_API_TOKEN?: string;
        CLOUDFLARE_ACCOUNT_ID?: string;       
    }
  }