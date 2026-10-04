# Single-container build (used by Render, see render.yaml): builds the React frontend,
# then serves it and the FastAPI backend together on $PORT (default 7860).

FROM node:20-slim AS frontend
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM python:3.11-slim
RUN useradd -m -u 1000 user
WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY --chown=user backend/ ./backend/
COPY --chown=user --from=frontend /app/frontend/dist ./frontend/dist
USER user

# No LLM server in the container: cached explanations are served, anything else uses the
# template text. To enable live explanations, set LLM_DISABLED=0 plus LLM_BASE_URL,
# LLM_MODEL and OPENAI_API_KEY as environment variables (any OpenAI-compatible endpoint).
ENV LLM_DISABLED=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app/backend
EXPOSE 7860
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-7860}
