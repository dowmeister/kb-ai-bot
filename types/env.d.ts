declare namespace NodeJS {
    /**
     * Represents the environment variables used in the application.
     * 
     * @property QDRANT_URI - The URI for the Qdrant vector database.
     * @property QDRANT_API_KEY - (Optional) The API key for authenticating with Qdrant.
     * @property QDRANT_COLLECTION - (Optional) The name of the Qdrant collection to use.
     * @property VECTOR_SIZE - (Optional) The size of the vectors used in the application.
     * @property OPENAI_API_KEY - (Optional) The API key for accessing OpenAI services.
     * @property EMBEDDING_SERVER_URL - (Optional) The URL of the embedding server.
     * @property MONGO_URI - The URI for connecting to the MongoDB database.
     * @property START_URL - The starting URL for the application.
     * @property HUGGINGFACE_API_KEY - (Optional) The API key for accessing Hugging Face services.
     * @property DISCORD_TOKEN - The token for authenticating with the Discord API.
     * @property QUESTION_CLASSIFICATION_MODEL - (Optional) The model used for question classification.
     * @property REPLY_LLM_MODEL - The model used for generating replies.
     * @property DISCORD_TESTING_CHANNEL_ID - The ID of the Discord testing channel.
     * @property DISCORD_CLIENT_ID - The client ID for the Discord application.
     * @property DISCORD_GUILD_ID - The guild ID for the Discord server.
     * @property SCRAPING_IGNORE_LIST - (Optional) A list of URLs to ignore during scraping.
     * @property PAGES_COLLECTION_NAME - The name of the MongoDB collection for storing pages.
     * @property DEFAULT_AI_PROVIDER - The default AI provider to use.
     * @property CLOUDFLARE_API_TOKEN - (Optional) The API token for accessing Cloudflare services.
     * @property CLOUDFLARE_ACCOUNT_ID - (Optional) The account ID for Cloudflare.
     * @property CLOUDFLARE_MODEL - (Optional) The model used for Cloudflare services.
     * @property OLLAMA_API_URL - (Optional) The API URL for accessing Ollama services.
     * @property GEMINI_API_KEY - (Optional) The API key for accessing Gemini services.
     * @property GEMINI_MODEL - (Optional) The model used for Gemini services.
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
        GEMINI_API_KEY?: string;
        GEMINI_MODEL?: string;
        API_SERVER_PORT?: string;
    }
  }