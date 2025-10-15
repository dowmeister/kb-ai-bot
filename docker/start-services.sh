#!/bin/bash

# Wait for services to be ready
wait_for_service() {
    local host=$1
    local port=$2
    local service_name=$3
    
    echo "Waiting for $service_name to be ready..."
    while ! nc -z $host $port 2>/dev/null; do
        sleep 1
    done
    echo "$service_name is ready!"
}

# Create storage directories
mkdir -p /qdrant/storage /data/db

# Start supervisor to manage all services
/usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf &

# Wait for core services to be ready
wait_for_service localhost 27017 "MongoDB"
wait_for_service localhost 6379 "Redis" 
wait_for_service localhost 6333 "Qdrant"

# Pre-download embedding model to cache it
echo "Ensuring embedding model is cached..."
python3 -c "
from sentence_transformers import SentenceTransformer
import os
model_name = os.getenv('MODEL_ID', 'sentence-transformers/all-MiniLM-L6-v2')
print(f'Caching model: {model_name}')
SentenceTransformer(model_name)
print('Model cached successfully!')
" || echo "Model download will happen on first embedding request"

wait_for_service localhost 8088 "Embedding Server"

echo "All services are ready!"

# Enable Discord bot if token is provided
if [ ! -z "$DISCORD_TOKEN" ]; then
    echo "Starting Discord bot..."
    supervisorctl start discord-bot
fi

# Keep container running
tail -f /var/log/*.log