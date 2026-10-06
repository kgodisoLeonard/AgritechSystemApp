# Lema ML Forecast Service

A standalone FastAPI + PyTorch microservice. Given a farmer's monthly profit
history, it trains a small feedforward neural network on the fly and returns
a next-month profit forecast.

This is intentionally separate from `backend/src/forecast.js` (plain OLS
linear regression used for the in-app Loan Readiness score): this service
exists to satisfy "deploy a PyTorch-based ML model" as its own deployable
artifact, with its own Dockerfile and `docker-compose` entry.

## API

- `GET /health` -> `{"status": "ok"}`
- `POST /predict` with body `{"history": [1200.0, 1500.0, 900.0, 2000.0]}`
  (oldest month first, at least 2 months) -> `{"forecastNextMonth": ..., "trainingLoss": ..., "monthsUsed": ...}`

## Local development

```
pip install -r requirements.txt --extra-index-url https://download.pytorch.org/whl/cpu
uvicorn app.main:app --reload --port 8000
```

## Notes

PyTorch's native DLLs may be blocked by Windows Application Control / WDAC
policies on locked-down machines (`OSError: ... Application Control policy
has blocked this file ... torch\lib\shm.dll`). This is an OS security policy,
not a bug in this service - it runs normally in the Docker image (Linux) used
for the VPS deploy and in standard, unrestricted developer machines.
