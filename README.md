# No-Show Prediction MLOps Pipeline

A GitHub-ready MLOps deployment project for a medical appointment "no-show" prediction API.

This repository contains the model training, MLflow registry integration, and a FastAPI inference service packaged for cloud deployment.

## Project Overview
- **Framework**: FastAPI
- **ML Backend**: XGBoost models tracked with MLflow
- **Entrypoint**: `src.predict:app`
- **Serving**: `uvicorn` on `0.0.0.0`
- **Containerization**: Docker
- **CI/CD**: GitHub Actions
- **Cloud target**: Render

## Files and Structure
- `src/` - Python application code, model training, feature engineering, and prediction API
- `data/` - Dataset artifacts used for local training
- `Dockerfile` - Production-ready container image definition
- `.dockerignore` - Docker build exclusions
- `.github/workflows/` - CI/CD workflows for build, test, and deployment validation
- `README.md` - Deployment and usage instructions

## How the application works
1. The API receives a POST request at `/predict` with patient appointment data.
2. On startup and on each request, the service loads the latest Production model from MLflow.
3. It applies the same preprocessing and feature engineering pipeline used during training.
4. Predictions are returned as a probability and binary no-show decision.
5. `/health` provides a ready-check endpoint for containers and cloud load balancers.

## Local setup
1. Create a Python virtual environment:
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   ```
2. Install dependencies:
   ```bash
   python -m pip install --upgrade pip
   pip install -r requirements.txt
   ```
3. Start the API locally:
   ```bash
   uvicorn src.predict:app --host 0.0.0.0 --port 8000
   ```
4. Visit the health endpoint:
   ```bash
   curl http://127.0.0.1:8000/health
   ```

## Docker usage
Build the production image:
```bash
docker build -t mlops-project .
```
Run the container locally:
```bash
docker run -p 8000:8000 mlops-project
```
Verify the app is running:
```bash
curl http://127.0.0.1:8000/health
```

### Docker image behavior
- Exposes the application on `0.0.0.0`
- Reads `PORT` from the environment with a default of `8000`
- Sets defaults:
  - `MLFLOW_TRACKING_URI=file:///app/mlruns`
  - `MODEL_NAME=noshow-prediction-model`

## GitHub Actions CI/CD
A new workflow is added at `.github/workflows/deploy.yml`.
It runs on push to `main` and performs:
- Checkout source code
- Install Python dependencies
- Validate import and module compilation
- Build the Docker image
- Launch a smoke-test container
- Check `/health`

Existing CI workflows are also available in `.github/workflows/ci.yml` and `.github/workflows/deploy-gcp.yml`.

## Render deployment
Render can deploy this app directly from GitHub using the root `Dockerfile`.

### Recommended Render setup
1. Connect your GitHub repository to Render.
2. Create a new **Web Service**.
3. Choose **Docker** and point Render at the repository root.
4. Use branch `main`.
5. Set the environment variables:
   - `MLFLOW_TRACKING_URI=file:///app/mlruns`
   - `MLFLOW_ALLOW_FILE_STORE=true` (required for MLflow file store on Render demos)
   - `MODEL_NAME=noshow-prediction-model`
6. Deploy.

> Note: `file:///app/mlruns` is for local/demo use only. For production, use a remote MLflow tracking backend or a database-backed store such as `sqlite:///mlflow.db`.

Render will build the Docker image and start the app on the port it provides via `$PORT`.

## Architecture overview
User
 ↓
Cloud-hosted application
 ↓
Docker container
 ↓
ML backend/model

### Cloud architecture components
- GitHub repository stores source, Dockerfile, and CI workflows
- GitHub Actions validates build and container health
- Render builds and deploys the Docker container
- FastAPI exposes prediction and health endpoints
- MLflow stores model artifacts inside `/app/mlruns`

## Demo instructions
1. Deploy the service to Render or run it locally
2. Check service health:
   ```bash
   curl http://<service-url>/health
   ```
3. Call the prediction endpoint:
   ```bash
   curl -X POST http://<service-url>/predict \
     -H "Content-Type: application/json" \
     -d '{"patient_id": 123, "gender": "M", "age": 40, "scheduled_day": "2026-05-20T10:00:00", "appointment_day": "2026-05-25T10:00:00", "neighbourhood": "JARDIM DA PENHA", "scholarship": false, "hypertension": false, "diabetes": false, "alcoholism": false, "handicap": 0, "sms_received": true}'
   ```

## Frontend deployment (Node)

This repository includes a React frontend and a Node server that can run without the Python ML backend.

- `npm run build` builds the client and server into `dist/`
- `npm start` runs the production server on port `5000`
- If `DATABASE_URL` is not set, the app uses in-memory storage so predictions still work in demo mode.
- Use `Dockerfile.render` for a Node-based Render deployment when you want to deploy via Docker.

## Notes
- The service defaults to a local MLflow artifact store at `/app/mlruns`.
- For production, point `MLFLOW_TRACKING_URI` to an external MLflow backend.
- The `Dockerfile` uses multi-stage build to keep the runtime image minimal.
