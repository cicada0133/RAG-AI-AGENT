#!/bin/bash
# pull_model.sh — Downloads the configured model into Ollama at first start.
# Run this on the HOST machine (not inside docker) after `docker compose up -d`.

MODEL="${MODEL_NAME:-qwen2.5:7b}"
OLLAMA_URL="http://localhost:11434"

echo "⏳ Waiting for Ollama to be ready..."
until curl -s "$OLLAMA_URL/api/tags" > /dev/null 2>&1; do
  sleep 2
done

echo "✅ Ollama is up. Pulling model: $MODEL"
curl -s "$OLLAMA_URL/api/pull" -d "{\"name\": \"$MODEL\"}" | grep -o '"status":"[^"]*"' | tail -1

echo "🎉 Model $MODEL is ready! You can now use the platform."
