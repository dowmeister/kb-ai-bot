# Knowledge Base Scraper, Vector Storage, and LLM Answering System

This project provides a fully local pipeline to scrape a website, clean and process the content, generate vector embeddings, store them in a vector database (Qdrant), and answer user questions in natural language using a local Large Language Model (LLM) via [Ollama](https://ollama.com/) but also other providers are available.

A CLI and a Discord Bot are available for testing direct questions.

Everything runs locally inside Docker containers.

The code is probably not ready for production although has been tested on two different sites and with multiple LLM providers, replies are encouraging and quite correct, depending on the AI Provider used.

OpenAI and Claude are definitely the better ones, while seems Llama, Mistral or Phi via Cloudflare don't give good answers. Llama 3 on Ollama, instead, seems quite good.

Most of the code has been written using AI :)

---

## ✨ Main Features

- 🔎 Recursive web scraping with domain restriction with plugin system
- 🧹 Content extraction with automatic image removal and heading prioritization
- 🧠 Embedding generation using a local HuggingFace model (MiniLM)
- 🗃️ Vector storage and semantic retrieval using Qdrant
- 🗣️ Natural language answering powered by a local LLM (Llama 3 / Mistral) via Ollama, OpenAI, Cloudflare AI or Amazon Bedrock
- 🐳 Fully Dockerized setup (MongoDB, Qdrant, Embedding server, Ollama)
- 🖥️ Command-line interface (CLI) for easy question-and-answer interaction
- 🤖 Discord Bot with Slash Commands and capability to reply automatically to simple questions or what seems a question :)

---

## 🏗️ System Architecture

```plaintext
[ Scraper ] -> [ MongoDB ] -> [ Embedding Server ] -> [ Qdrant ]

                            ↘︎
                    [ CLI User Question ] -> [ Retriever ] -> [ LLM ] -> [ Natural Language Answer ]
```

## Available AI Providers

Ollama with configurable model

OpenAI

Claude

Cloudflare with confgiurable model

Gemini

Amazon Bedrock (not implemented yet)


## Available Scrapers

The Scraping system will detect automatically what kind of extractor can handle the site content, for each page.

Echo Knowledge Base Plugin for Wordpress

Wordpress

Mediawiki

Standard (Generic Content Extractor)

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
DISCORD_GUILD_ID= # for registering commands in a specific Guild
SCRAPING_IGNORE_LIST=/kb/category/,?lang=,?seq= # comma separated list
DEFAULT_AI_PROVIDER=ollama
CLOUDFLARE_API_TOKEN=xxxx
CLOUDFLARE_ACCOUNT_ID=xxxx
ANTHROPIC_API_KEY=sk-ant-xxxxx
CLOUDFLARE_MODEL=@cf/meta/llama-4-scout-17b-16e-instruct
OLLAMA_API_URL=http://localhost:11434
```

## Launche the Docker

Be aware this will launch also the Discor Bot container.

```
docker compose build
docker compose up -d
```

## Launch the Scraper

Scrape the whole site from the START_URL and generate Vector Embeddings

```
npm run scrape
```

## Generate Embeddings

Load all pages from Mongo and generates Vector Embeddings

```
npm run generate-embeddings
```

### Refresh database and scrape

Clean MongoDB and QDrant Collections, scrape the whole site from the START_URL and generate Vector Embeddings
```
npm run refresh-scrape
```

## CLI

Serves a CLI console with input for asking questions

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

Launch the Discord Bot

```
npm run discord-bot
```

### Available Commands

`/ask [query] [user]` : Ask the bot about a specific query, using the optional parameter `user` the bot, replying, will mention the given user

`/kb-add [title] [answer]`: Add a specific answer via Discord improving manually the knowledge for specific answers not found from site scraping

`/kb-delete [id]`: Delete the given answer from QDrant

`/kb-list`: Lists all answers created via Discord for the current Guild

