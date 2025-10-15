# KnowledgeFox AI Instructions

## Architecture Overview

This is a **knowledge base scraping and AI answering system** running in a unified Docker container:

- **Scraper Pipeline**: `PluggableSiteScraper` → MongoDB → Embedding Server → Qdrant
- **Query Pipeline**: User Question → Vector Search → LLM → Natural Language Answer  
- **Interfaces**: CLI (`src/cli.ts`), Discord Bot (`src/discord/`), REST API (`src/api/`)
- **Internal Services**: MongoDB (documents), Qdrant (vectors), Redis (queues), HuggingFace (embeddings)

## Key Components

### AI Provider Abstraction (`src/ai/`)
All AI providers implement `AIProvider` interface with `getEmbedding()`, `completePrompt()`, and `summarize()`. The `AIRouter` dynamically loads providers based on environment variables and routes requests via `getProvider(name)` or `getDefaultProvider()`.

### Content Extraction (`src/contentProviders/`)
Pluggable extractors extending `BaseContentExtractor` with `detect()` and `extract()` methods. System auto-detects appropriate extractor per page: Echo KB, WordPress, MediaWiki, or Standard fallback.

### Queue System (`src/queue.ts`)
Uses BullMQ with Redis for background scraping jobs. `QueueManager` handles web scraping tasks with the pattern: `startScrapingSource()` → `webScrapingJob` → embedding generation.

### Database Models (`src/database/models/`)
- `KnowledgeSource`: Scraping configuration and status
- `KnowledgeDocument`: Individual scraped pages with content
- `Project`: Groups knowledge sources for multi-tenant support

## Development Workflows

### Essential Scripts
```bash
# Unified container setup
npm run docker:start                   # Start unified container
npm run docker:logs                    # View container logs
npm run docker:stop                    # Stop container

# Container operations
npm run docker:scrape                  # Scrape from START_URL
npm run docker:cli                     # Interactive Q&A in container
npm run docker:exec                    # Shell access to container

# Local development (requires services running)
npm run refresh-scrape                 # Clean + scrape + embed
npm run api-server                     # REST API with Bull dashboard
```

### Configuration Pattern
Environment variables drive all integrations. Check `README.md` for required vars. Services are conditionally initialized in constructors based on API key presence (see `AIRouter` constructor).

## Project-Specific Conventions

### Service Layer Pattern
Services are singletons exported as lowercase instances: `embeddingService`, `qdrantService`, `appConfigService`. Import and use directly without instantiation.

### Error Handling Strategy
Use structured logging via `helpers/logger.ts` with `logInfo()`, `logWarning()`, `logError()`. Services return boolean success indicators rather than throwing exceptions.

### Document Processing Pipeline
1. **Scrape**: Extract content via pluggable extractors
2. **Chunk**: Split large content for embedding limits  
3. **Embed**: Generate vectors via HuggingFace service
4. **Store**: Save to Qdrant with metadata payload
5. **Query**: Vector similarity search → LLM context

### Discord Integration Pattern
Commands in `src/discord/commands/` export arrays of objects with `data` (SlashCommandBuilder) and `execute` functions. Bot mentions trigger `askQuestion()` with automatic context retrieval.

## Key Integration Points

### Vector Search Configuration
Qdrant collections use 384-dimension vectors from `sentence-transformers/all-MiniLM-L6-v2`. Payloads include `documentKey`, `projectId`, `guildId` for multi-tenant filtering.

### AI Provider Switching  
Set `DEFAULT_AI_PROVIDER` environment variable. Each provider handles its own model configuration (e.g., `CLOUDFLARE_MODEL`, `OLLAMA_MODEL`).

### Content Extraction Detection
Extractors use `detect()` method on Playwright page objects. System tries extractors in order until one returns `true`, then calls `extract()`.

When adding new providers or extractors, follow the established interface patterns and registration systems.