#!/bin/bash

# Start Ollama server in background
ollama serve &

# Wait a few seconds to ensure Ollama server is up
sleep 5

# Automatically start the llama3 model
ollama run llama3

# Keep the container running
tail -f /dev/null
