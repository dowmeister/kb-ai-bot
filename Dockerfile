# Multi-stage build for a unified container
FROM node:22-bullseye as app-builder

# Set the working directory
WORKDIR /usr/src/app

# Copy package files and install Node.js dependencies
COPY package*.json ./
RUN npm install

# Copy application code
COPY . .

# Final unified container using Ubuntu
FROM ubuntu:22.04

# Prevent interactive prompts during installation
ENV DEBIAN_FRONTEND=noninteractive

# Install Node.js, MongoDB, Redis, Python and system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    wget \
    gnupg \
    supervisor \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js 22
RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

# Install MongoDB
RUN curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg && \
    echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-7.0.list && \
    apt-get update && \
    apt-get install -y mongodb-org && \
    rm -rf /var/lib/apt/lists/*

# Install Redis
RUN apt-get update && \
    apt-get install -y redis-server && \
    rm -rf /var/lib/apt/lists/*

# Install Python and pip
RUN apt-get update && \
    apt-get install -y python3 python3-pip python3-venv && \
    rm -rf /var/lib/apt/lists/*

# Install Qdrant (real database with built-in UI)
RUN wget https://github.com/qdrant/qdrant/releases/download/v1.12.5/qdrant-x86_64-unknown-linux-gnu.tar.gz && \
    tar -xzf qdrant-x86_64-unknown-linux-gnu.tar.gz && \
    mv qdrant /usr/local/bin/ && \
    rm qdrant-x86_64-unknown-linux-gnu.tar.gz && \
    chmod +x /usr/local/bin/qdrant

# Install Python packages for embedding server
RUN pip3 install --no-cache-dir torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu && \
    pip3 install --no-cache-dir sentence-transformers transformers flask requests numpy

# Set working directory for the app
WORKDIR /usr/src/app

# Copy Node.js app from builder stage
COPY --from=app-builder /usr/src/app .

# Create data directories
RUN mkdir -p /data/db /var/lib/redis /qdrant/storage /models

# Copy supervisor configuration
COPY docker/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Copy Qdrant configuration
COPY docker/qdrant-config.yaml /qdrant/config.yaml

# Copy startup script and embedding server
COPY docker/start-services.sh /usr/local/bin/start-services.sh
COPY docker/embedding-server.py /usr/src/app/docker/embedding-server.py
RUN chmod +x /usr/local/bin/start-services.sh

# Expose all necessary ports
EXPOSE 3001 27017 6333 6379 8088 11434

# Set environment variables
ENV MONGO_URI=mongodb://localhost:27017
ENV QDRANT_URI=http://localhost:6333
ENV EMBEDDING_SERVER_URL=http://localhost:8088/embed
ENV REDIS_URL=redis://localhost:6379
ENV MODEL_ID=sentence-transformers/all-MiniLM-L6-v2
ENV MAX_INPUT_LENGTH=512

# Start all services using supervisor
CMD ["/usr/local/bin/start-services.sh"]