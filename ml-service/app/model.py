"""A small PyTorch model that forecasts a farmer's next-month profit.

Unlike backend/src/forecast.js (plain OLS linear regression in Node), this is a
real PyTorch neural network: a tiny feedforward net trained on the farmer's own
monthly profit history and used to predict the next point. It is intentionally
small (a handful of parameters) since each request trains its own model from
scratch on a short per-farmer series - there is no large shared dataset to
pre-train a single global checkpoint on yet.
"""
from __future__ import annotations

import torch
from torch import nn


class ProfitForecastNet(nn.Module):
    """Maps a normalized month index -> predicted profit."""

    def __init__(self, hidden_size: int = 8) -> None:
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(1, hidden_size),
            nn.Tanh(),
            nn.Linear(hidden_size, hidden_size),
            nn.Tanh(),
            nn.Linear(hidden_size, 1),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.net(x)


def train_and_predict(history: list[float], epochs: int = 300, lr: float = 0.05) -> dict:
    """Fits a fresh ProfitForecastNet to `history` and forecasts the next value.

    `history` is a list of monthly profit figures ordered oldest -> newest.
    Returns a dict with the forecast and the training loss curve's final value,
    so callers can gauge fit quality.
    """
    if len(history) < 2:
        raise ValueError("Need at least 2 months of history to train a forecast model")

    torch.manual_seed(0)

    n = len(history)
    # Normalize both axes so the tiny net trains fast and stays numerically stable.
    x = torch.tensor([[i / max(n - 1, 1)] for i in range(n)], dtype=torch.float32)
    mean = sum(history) / n
    std = (sum((v - mean) ** 2 for v in history) / n) ** 0.5 or 1.0
    y = torch.tensor([[(v - mean) / std] for v in history], dtype=torch.float32)

    model = ProfitForecastNet()
    optimizer = torch.optim.Adam(model.parameters(), lr=lr)
    loss_fn = nn.MSELoss()

    model.train()
    final_loss = float("nan")
    for _ in range(epochs):
        optimizer.zero_grad()
        pred = model(x)
        loss = loss_fn(pred, y)
        loss.backward()
        optimizer.step()
        final_loss = loss.item()

    model.eval()
    with torch.no_grad():
        next_x = torch.tensor([[n / max(n - 1, 1)]], dtype=torch.float32)
        next_pred = model(next_x).item()

    forecast = next_pred * std + mean
    return {
        "forecastNextMonth": round(forecast, 2),
        "trainingLoss": round(final_loss, 6),
        "monthsUsed": n,
    }
