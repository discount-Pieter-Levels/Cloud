# Project & Cloud Deployment Guide

This document explains the No-Show Prediction Cloud project and how to run and deploy it to the cloud (Render and CI/CD via GitHub Actions).

**Project Summary**

- Framework: FastAPI
- Entrypoint: `src.predict:app` (served with `uvicorn`)
- Runtime: Python 3.11
- Model backend: XGBoost models tracked with MLflow
- Local artifact store (default): `/app/mlruns`
- Main runtime ports: `PORT` (default `8000` in this repo)
- Key environment variables:
  - `MLFLOW_TRACKING_URI` (default `file:///app/mlruns`)
  - `MODEL_NAME` (default `noshow-prediction-model`)
  - `PORT` (default `8000`)

**How the app works**

- On startup the FastAPI app attempts to load the latest Production model from the MLflow Model Registry using `MLFLOW_TRACKING_URI` and `MODEL_NAME`.
- The `/predict` endpoint accepts a JSON payload, applies the same preprocessing as training, and returns a probability and binary no-show prediction.
- The `/health` endpoint reports service and model status and is used by load-balancers/health checks.

**Run locally (quick)**

```bash
# create venv
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
pip install -r requirements.txt

# run server
uvicorn src.predict:app --host 0.0.0.0 --port 8000
```

**Docker (production-ready)**

The repository contains a root `Dockerfile` that uses a multi-stage build to keep the runtime image small.

Build:

```bash
docker build -t cloud-project .
```

Run:

```bash
docker run -p 8000:8000 \
  -e PORT=8000 \
  -e MLFLOW_TRACKING_URI=file:///app/mlruns \
  -e MODEL_NAME=noshow-prediction-model \
  cloud-project
```

Notes:
- The container listens on `0.0.0.0` and reads `PORT` from the environment (default 8000).
- For production MLflow storage, set `MLFLOW_TRACKING_URI` to a remote backend (e.g., an S3 bucket or an MLflow server URL).

**GitHub Actions (CI/CD)**

Workflows in `.github/workflows/` include:

- `ci.yml` — code quality and tests; builds a Docker image for validation.
- `deploy.yml` — build + smoke-test Docker image on push to `main` (added by this project).
- `deploy-gcp.yml` — an example workflow that builds and deploys to Google Cloud Run when configured with the required secrets.

The CI/CD pipeline performs these steps:
1. Checkout
2. Install dependencies
3. Validate imports and run tests (if present)
4. Build Docker image
5. Run a smoke container and call `/health`
6. (Optional) Push to container registry and deploy to cloud (GCP Cloud Run workflow uses secrets)

If you want GitHub to automatically deploy to Render, you can add a workflow step to push a tagged Docker image to a registry Render can pull, or use Render's GitHub integration to build from the `Dockerfile` automatically.

**Render deployment (step-by-step)**

1. In Render dashboard click "New" → "Web Service".
2. Connect your GitHub account and select this repository and the `main` branch.
3. Choose "Docker" (Render will build from the repository root `Dockerfile`).
4. Set the following environment variables in Render:
   - `PORT` (Render will provide a port, but the container should read `$PORT` — no change required if using default)
   - `MLFLOW_TRACKING_URI=file:///app/mlruns` (or a remote tracking URI)
   - `MODEL_NAME=noshow-prediction-model`
5. If you use remote MLflow (recommended for production), provide credentials and network access for that backend (S3 credentials, cloud DB, or an MLflow server endpoint).
6. Deploy and monitor the build logs.

Important Render tips:
- The `Dockerfile` must be at the repository root for Render to detect it when choosing "Dockerfile".
- Ensure large artifacts (`mlruns`, `data/`) are not checked into Git. Use remote stores.
- If you require persistent MLflow storage, configure S3 or a managed file store and set `MLFLOW_TRACKING_URI` accordingly.

**Endpoints**

- `GET /` — root service status and quick validation.
- `GET /health` — returns JSON with `status`, `model_loaded`, `model_info`, and `mlflow_uri`.
- `POST /predict` — accepts the prediction payload and returns `probability`, `is_no_show`, `model_name`, `model_version`, `prediction_timestamp`.

Example curl (predict):

```bash
curl -X POST http://<service-url>/predict \
  -H "Content-Type: application/json" \
  -d '{"patient_id": 123, "gender": "M", "age": 40, "scheduled_day": "2026-05-20T10:00:00", "appointment_day": "2026-05-25T10:00:00", "neighbourhood": "JARDIM DA PENHA", "scholarship": false, "hypertension": false, "diabetes": false, "alcoholism": false, "handicap": 0, "sms_received": true}'
```

**CI/CD secrets and cloud configs**

- For `deploy-gcp.yml` you must set GitHub secrets:
  - `GCP_SA_KEY` (service account JSON)
  - `GCP_PROJECT_ID`
  - `GCP_SERVICE_ACCOUNT_EMAIL`
  - `GCP_REGION` (workflow already sets `asia-south1` by default)
- For Render: Connect GitHub and set any environment variables via the Render dashboard. No extra secrets are required for simple demos.

**Troubleshooting notes**

- Dependency resolution: `mlflow` requires `pandas<3`. The repo has been updated to `pandas>=2.2.6,<3.0` to avoid conflicts.
- `numpy` and other binary deps may require build tools during Docker build. The `Dockerfile` installs minimal build tools in the builder stage and performs installation with `pip --user` to a local prefix which is copied into the runtime image.
- If Render build fails with `open Dockerfile: no such file or directory` — ensure the `Dockerfile` is present at the repository root and pushed to the target branch.

**Production recommendations**

- Use a remote MLflow backend (S3 for artifacts + a DB for tracking) instead of the default `file:///app/mlruns` when running multiple instances or in production.
- Use an external feature store or database for patient history features referenced by the model.
- Secure model reload and registry access using authenticated MLflow server or RBAC for cloud storage.

**Architecture (simple)**

```
User
 ↓
Cloud-hosted application (FastAPI)
 ↓
Docker container (this repo's Dockerfile)
 ↓
ML backend / MLflow model artifacts
```

**Files of interest**

- `src/predict.py` — API implementation and model loading (entrypoint)
- `Dockerfile` — root dockerfile used by CI and Render
- `.github/workflows/deploy.yml` — CI build + smoke test
- `.github/workflows/deploy-gcp.yml` — example GCP Cloud Run deploy workflow
- `requirements.txt` / `pyproject.toml` — Python dependencies

---

If you'd like, I can also:
- Add a `render.yaml` manifest for automated Render service creation
- Add a GitHub Actions job that triggers Render's deploy API (requires Render API key)
- Produce a minimal `docker-compose.yml` for local dev with an MLflow backend


