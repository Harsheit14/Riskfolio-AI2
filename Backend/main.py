from fastapi import FastAPI
from pydantic import BaseModel
from typing import Dict

app = FastAPI()

class Portfolio(BaseModel):
    assets: Dict[str, float]

@app.get("/")
def home():
    return {"message": "Riskfolio AI running"}

@app.post("/analyze")
@app.post("/analyze")
def analyze_portfolio(portfolio: Portfolio):
    total = sum(portfolio.assets.values())

    weights = {}

    for asset, value in portfolio.assets.items():
        weights[asset] = round((value / total) * 100, 2)

    return {
        "total_value": total,
        "weights_percent": weights,
        "message": "Basic portfolio analysis complete"
    }
