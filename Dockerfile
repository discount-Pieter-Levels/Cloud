# syntax=docker/dockerfile:1

FROM python:3.11-slim AS builder
WORKDIR /app

# Install build tools for compiling any binary dependencies
RUN apt-get update \
    && apt-get install -y --no-install-recommends gcc g++ \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --no-cache-dir --user -r requirements.txt

FROM python:3.11-slim
WORKDIR /app

# Copy installed packages from the builder stage
COPY --from=builder /root/.local /root/.local
ENV PATH=/root/.local/bin:$PATH

# Copy application code
COPY . .

# Create runtime directories for MLflow artifacts and model storage
RUN mkdir -p /app/mlruns /app/models

ENV PYTHONUNBUFFERED=1 \
    PORT=8000 \
    MLFLOW_TRACKING_URI=file:///app/mlruns \
    MODEL_NAME=noshow-prediction-model

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD python -c "import urllib.request, os; port=os.getenv('PORT','8000'); urllib.request.urlopen(f'http://localhost:{port}/health')"

ENTRYPOINT ["sh", "-c"]
CMD ["uvicorn src.predict:app --host 0.0.0.0 --port ${PORT:-8000} --log-level info"]
