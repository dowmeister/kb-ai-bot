declare namespace NodeJS {
    /**
     * Represents the environment variables used in the application.
     * Each property corresponds to a specific configuration value.
     * 
     * @interface ProcessEnv
     * 
     * @property {string} QDRANT_URI - The URI for the Qdrant vector database.
     * @property {string} [QDRANT_API_KEY] - Optional API key for authenticating with Qdrant.
     * @property {string} [QDRANT_COLLECTION] - Optional name of the Qdrant collection to use.
     * @property {string} [VECTOR_SIZE] - Optional size of the vectors used in Qdrant.
     * @property {string} [OPENAI_API_KEY] - Optional API key for accessing OpenAI services.
     * @property {string} [EMBEDDING_SERVER_URL] - Optional URL for the embedding server.
     * @property {string} MONGO_URI - The URI for connecting to the MongoDB database.
     * @property {string} START_URL - The starting URL for the application.
     * @property {string} [HUGGINGFACE_API_KEY] - Optional API key for Hugging Face services.
     * @property {string} DISCORD_TOKEN - The token for authenticating with Discord.
     * @property {string} [QUESTION_CLASSIFICATION_MODEL] - Optional model for question classification.
     * @property {string} REPLY_LLM_MODEL - The model used for generating replies.
     * @property {string} DISCORD_TESTING_CHANNEL_ID - The ID of the Discord testing channel.
     * @property {string} DISCORD_CLIENT_ID - The client ID for the Discord application.
     * @property {string} DISCORD_GUILD_ID - The guild ID for the Discord server.
     * @property {string} [SCRAPING_IGNORE_LIST] - Optional list of URLs to ignore during scraping.
     * @property {string} PAGES_COLLECTION_NAME - The name of the MongoDB collection for pages.
     * @property {string} DEFAULT_AI_PROVIDER - The default AI provider to use.
     * @property {string} [CLOUDFLARE_API_TOKEN] - Optional API token for Cloudflare services.
     * @property {string} [CLOUDFLARE_ACCOUNT_ID] - Optional account ID for Cloudflare.
     * @property {string} [CLOUDFLARE_MODEL] - Optional model used for Cloudflare services.
     * @property {string} [OLLAMA_API_URL] - Optional URL for the Ollama API.
     */
    interface ProcessEnv {
        QDRANT_URI: string;
        QDRANT_API_KEY?: string;
        QDRANT_COLLECTION?: string;
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
        DISCORD_CLIENT_ID: string;
        DISCORD_GUILD_ID: string;
        SCRAPING_IGNORE_LIST?: string;
        PAGES_COLLECTION_NAME: string;
        DEFAULT_AI_PROVIDER: string;
        CLOUDFLARE_API_TOKEN?: string;
        CLOUDFLARE_ACCOUNT_ID?: string;       
        CLOUDFLARE_MODEL?: string;
        OLLAMA_API_URL?: string;
    }
  }