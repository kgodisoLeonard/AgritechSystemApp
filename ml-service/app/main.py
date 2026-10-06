"""FastAPI microservice wrapping the PyTorch profit-forecast model.

Standalone from the Node backend and Spring finance API: it only knows how to
fit+predict on a profit history handed to it over HTTP. The Node backend (or
any other caller) is responsible for fetching a farmer's real income/expense
history and POSTing it here.
"""
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from .model import train_and_predict

app = FastAPI(title="Lema ML Forecast Service", version="1.0.0")


class ForecastRequest(BaseModel):
    history: list[float] = Field(..., min_length=2, description="Monthly profit, oldest first")


class ForecastResponse(BaseModel):
    forecastNextMonth: float
    trainingLoss: float
    monthsUsed: int


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/predict", response_model=ForecastResponse)
def predict(body: ForecastRequest) -> dict:
    try:
        return train_and_predict(body.history)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
