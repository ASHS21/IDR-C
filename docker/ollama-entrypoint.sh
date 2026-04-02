#!/bin/sh
set -e

MODEL="${OLLAMA_MODEL:-qwen2.5:7b}"

echo "[ollama] Starting Ollama server..."
ollama serve &
SERVER_PID=$!

# Wait for server to be ready (use wget as fallback if curl unavailable)
echo "[ollama] Waiting for server to be ready..."
for i in $(seq 1 120); do
  if command -v curl >/dev/null 2>&1; then
    curl -sf http://localhost:11434/api/tags >/dev/null 2>&1 && break
  elif command -v wget >/dev/null 2>&1; then
    wget -qO- http://localhost:11434/api/tags >/dev/null 2>&1 && break
  else
    # Last resort: try a raw TCP check via shell
    (echo > /dev/tcp/localhost/11434) 2>/dev/null && break
  fi
  if [ "$i" -eq 120 ]; then
    echo "[ollama] ERROR: Server did not start within 120 seconds."
    exit 1
  fi
  sleep 1
done
echo "[ollama] Server is ready."

# Check if model is already pulled
if ollama list 2>/dev/null | grep -q "$MODEL"; then
  echo "[ollama] Model '$MODEL' already available."
else
  echo "[ollama] Pulling model '$MODEL' (this may take several minutes on first run)..."
  ollama pull "$MODEL"
  echo "[ollama] Model '$MODEL' pulled successfully."
fi

# Signal readiness by creating a marker file (used by healthcheck)
touch /tmp/.ollama-ready

echo "[ollama] Ready to serve requests."

# Keep the server process in the foreground
wait $SERVER_PID
