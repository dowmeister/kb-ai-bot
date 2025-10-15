# Unified Container Setup Guide

## Quick Start

The entire KnowledgeFox system now runs in a single Docker container with all services included:

```bash
# Build and start the unified container
npm run docker:start

# Or use the convenience script
./start-unified.sh  # Linux/Mac
start-unified.bat   # Windows
```

## What's Included

The unified container includes:
- **MongoDB** (port 27017) - Document storage
- **Qdrant** (port 6333) - Vector database  
- **Redis** (port 6379) - Queue management
- **HuggingFace Embedding Server** (port 8088) - Text embeddings
- **API Server** (port 3001) - REST API and Bull dashboard
- **Discord Bot** - Auto-starts if `DISCORD_TOKEN` is provided

## Container Management

```bash
# View logs
npm run docker:logs

# Access container shell
npm run docker:exec

# Run operations inside container
npm run docker:scrape       # Scrape websites
npm run docker:cli          # Interactive Q&A

# Stop container
npm run docker:stop
```

## Service URLs

When the container is running:
- **API Server**: http://localhost:3001
- **Queue Dashboard**: http://localhost:3001/admin/queues  
- **Qdrant API**: http://localhost:6333
- **Embedding Server**: http://localhost:8088

## Environment Variables

All environment variables are loaded from your `.env` file. Key variables:

```env
# Required for basic operation
START_URL=https://your-knowledge-base.com
MONGO_URI=mongodb://localhost:27017  # Auto-configured
QDRANT_URI=http://localhost:6333     # Auto-configured

# AI Providers (at least one required)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
CLOUDFLARE_API_TOKEN=...
DEFAULT_AI_PROVIDER=openai

# Discord (optional)  
DISCORD_TOKEN=...
DISCORD_CLIENT_ID=...
DISCORD_GUILD_ID=...
```

## Data Persistence

Container data is persisted in Docker volumes:
- `app_data` - MongoDB data
- `app_qdrant` - Qdrant vector storage
- `app_models` - Downloaded ML models

## Troubleshooting

```bash
# Check if all services started correctly
docker compose logs knowledgefox-all-in-one

# Restart if services failed
npm run docker:stop
npm run docker:start

# Check specific service logs inside container
npm run docker:exec
tail -f /var/log/mongodb.out.log
tail -f /var/log/qdrant.out.log
```