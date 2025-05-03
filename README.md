# Knowledge Base Scraper, Vector Storage, and LLM Answering System

This project provides a fully local pipeline to scrape a website, clean and process the content, generate vector embeddings, store them in a vector database (Qdrant), and answer user questions in natural language using a local Large Language Model (LLM) via [Ollama](https://ollama.com/) but also other providers are available.

Everything runs locally inside Docker containers.

---

## ✨ Main Features

- 🔎 Recursive web scraping with domain restriction
- 🧹 Content extraction with automatic image removal and heading prioritization
- 🧠 Embedding generation using a local HuggingFace model (MiniLM)
- 🗃️ Vector storage and semantic retrieval using Qdrant
- 🗣️ Natural language answering powered by a local LLM (Llama 3 / Mistral) via Ollama, OpenAI, Cloudflare AI or Amazon Bedrock
- 🐳 Fully Dockerized setup (MongoDB, Qdrant, Embedding server, Ollama)
- 🖥️ Command-line interface (CLI) for easy question-and-answer interaction

---

## 🏗️ System Architecture

```plaintext
[ Scraper ] -> [ MongoDB ] -> [ Embedding Server ] -> [ Qdrant ]

                            ↘︎
                    [ CLI User Question ] -> [ Retriever ] -> [ LLM ] -> [ Natural Language Answer ]
```

## env

```
MONGO_URI=mongodb://localhost:27017
QDRANT_URI=http://localhost:6333
START_URL=https://truckyapp.com/kb/
EMBEDDING_SERVER_URL=http://localhost:8088/embed
OPENAI_API_KEY=sk-xxxxx
HUGGINGFACE_API_KEY=hf_xxxxx
DISCORD_TOKEN=xxxxxxx
QUESTION_CLASSIFICATION_MODEL=phi
REPLY_LLM_MODEL=llama3
DISCORD_CLIENT_ID= # for registering slash commands
DISCORD_TESTING_CHANNEL_ID= # the bot will reply in this channel also to moderators
DISCORD_GUILD_ID= # for old message retrieval
SCRAPING_IGNORE_LIST=/kb/category/,?lang=,?seq= # comma separated list
DEFAULT_AI_PROVIDER=ollama
CLOUDFLARE_API_TOKEN=xxxx
CLOUDFLARE_ACCOUNT_ID=xxxx
ANTHROPIC_API_KEY=sk-ant-xxxxx
CLOUDFLARE_MODEL=@cf/meta/llama-4-scout-17b-16e-instruct
```

## Launche the Docker

```
docker-compose up -d
```

## Launch the Scraper

```
npm run scrape
```

### Refresh database and scrape

```
npm run refresh-scrape
```

## CLI

```
npm run cli
```

```
[INFO] Welcome to the Knowledge Base Assistant!
[INFO] Type your question below or type "exit" to quit.

> i dont see my server in convoy browser, why?
Assistant: According to the context, if your server has more than 8 slots and you're still having trouble finding it, it might be because your server doesn't have a Steam Logon Token. Without this token, the server won't appear in Convoy Browser.
```

## Discord Bot

```
npm run discord-bot
```

### Available Commands

`/ask` query user
`/kb-add` title answer
`/kb-delete` id
`/kb-list`

