# Riskfolio AI - Copilot Instructions

## Project Overview
Riskfolio AI is a portfolio analysis application built with:
- **Backend**: FastAPI (Python) at `Backend/main.py`
- **Frontend**: Placeholder directory (empty)
- **Docs**: Placeholder directory (empty)

The core functionality currently provides basic portfolio weight analysis by calculating asset allocation percentages.

## Architecture & Data Flow

### Backend API Structure
- Uses FastAPI framework for REST API
- `Portfolio` Pydantic model: accepts `assets` dict mapping asset names to values
- Two endpoints:
  - `GET /`: Health check returning `{"message": "Riskfolio AI running"}`
  - `POST /analyze`: Portfolio analysis endpoint

### Portfolio Analysis Workflow
The `/analyze` endpoint:
1. Receives `Portfolio` object with `assets: Dict[str, float]`
2. Calculates total portfolio value by summing all asset values
3. Computes weight percentages for each asset: `(asset_value / total) * 100`
4. Returns total value and weight distribution as percentages (rounded to 2 decimals)

**Example request/response:**
```python
# Request: {"assets": {"AAPL": 5000, "GOOGL": 3000}}
# Response: {
#   "total_value": 8000,
#   "weights_percent": {"AAPL": 62.5, "GOOGL": 37.5},
#   "message": "Basic portfolio analysis complete"
# }
```

## Development Workflow

### Running the Backend
```bash
# Start FastAPI development server (runs on http://localhost:8000 by default)
cd Backend
python -m uvicorn main:app --reload
```

### Project Dependencies
- **FastAPI**: API framework
- **Pydantic**: Data validation and modeling
- **Uvicorn**: ASGI server

Virtual environment located at `Backend/venv/` (Python 3.11).

## Conventions & Patterns

### Code Style
- Use type hints with Pydantic models for request validation
- Endpoint responses use dictionary return format
- Calculation precision: round portfolio weights to 2 decimal places

### Adding New Features
1. Define new Pydantic models for request bodies in main.py
2. Add endpoint functions decorated with `@app.post()` or `@app.get()`
3. Return standardized response dicts with status messages
4. Keep analysis logic self-contained within endpoint functions for now

### Known Issues & TODOs
- Duplicate decorator bug: `@app.post("/analyze")` is declared twice (line 14-15) - remove one
- Frontend is not implemented
- No error handling for empty portfolios or invalid asset values
- No persistence layer or database

## File Structure
```
.github/
  agents/          # Custom agent definitions
  copilot-instructions.md  # This file
Backend/
  main.py          # FastAPI application entry point
  venv/            # Virtual environment
Frontend/          # Not yet implemented
Docs/              # Not yet implemented
```

## Integration Points
- No external APIs integrated currently
- No database connections
- No cross-component communication patterns (backend-frontend not connected)
- Application is self-contained in `Backend/main.py`

## Tips for Agents
- When adding portfolio analysis features, extend the `analyze_portfolio()` function or create new endpoints
- Always validate numeric inputs to prevent division by zero (portfolio value = 0)
- Consider adding risk metrics (standard deviation, Sharpe ratio) as next features
- Frontend integration will require CORS configuration when implemented
