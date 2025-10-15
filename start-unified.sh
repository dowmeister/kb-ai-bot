#!/bin/bash

# Build and run the unified KnowledgeFox container

echo "Building unified KnowledgeFox container..."
docker compose build

echo "Starting unified KnowledgeFox container..."
docker compose up -d

echo "Waiting for services to start..."
sleep 10

echo "Checking service status..."
docker compose logs knowledgefox-all-in-one --tail=50

echo ""
echo "🦊 KnowledgeFox unified container is starting!"
echo ""
echo "Available services:"
echo "  🌐 API Server:       http://localhost:3001"
echo "  📊 Queue Dashboard:  http://localhost:3001/admin/queues"
echo "  🗄️  MongoDB:         localhost:27017"
echo "  🔍 Qdrant:          http://localhost:6333"
echo "  🧠 Embedding Server: http://localhost:8088"
echo "  📝 Redis:            localhost:6379"
echo ""
echo "Environment variables loaded from .env file"
echo "To view logs: docker compose logs -f knowledgefox-all-in-one"
echo "To stop: docker compose down"