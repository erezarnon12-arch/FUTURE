"""
FUTURE API — application entry point.

Responsibilities (only):
  • FastAPI app creation and CORS configuration
  • Router registration
  • Startup lifecycle (table creation + auto-seed)
  • /health and /seed system endpoints
"""

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from database import create_tables, get_db
from routers import advisor, analytics, assets, clients, goals, liabilities, market_data, retirement_simulation, stock_analysis
from routers import owner
from seed.demo_data import seed as seed_demo

app = FastAPI(
    title="FUTURE API",
    version="2.0.0",
    description="AI-powered financial planning platform — 3-ring portfolio model",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:3001", "http://127.0.0.1:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Core portfolio routers ────────────────────────────────────────────────────
app.include_router(clients.router)                # /clients/…
app.include_router(assets.router)                 # /clients/{id}/assets/…
app.include_router(liabilities.router)            # /clients/{id}/liabilities/…
app.include_router(goals.router)                  # /clients/{id}/goals/…
app.include_router(analytics.router)              # /clients/{id}/analytics/…

# ── Feature routers ───────────────────────────────────────────────────────────
app.include_router(market_data.router)            # /market-data/…
app.include_router(stock_analysis.router)         # /stock-analysis/…
app.include_router(retirement_simulation.router)  # /retirement-simulation/{id}/…
app.include_router(advisor.router)                # /ai-advice/{id}/…
app.include_router(owner.router)                  # /owner/clients — owner protected


# ── Lifecycle ─────────────────────────────────────────────────────────────────

@app.on_event("startup")
def startup():
    create_tables()
    db = next(get_db())
    try:
        from models import Client
        if db.query(Client).count() == 0:
            seed_demo(db)
            print("[FUTURE] Auto-seeded 4 demo clients.")
    except Exception as e:
        print(f"[FUTURE] Auto-seed error (non-fatal): {e}")
    finally:
        db.close()


# ── System endpoints ──────────────────────────────────────────────────────────

@app.get("/health", tags=["system"])
def health():
    return {"status": "ok", "service": "FUTURE API", "version": "2.0.0"}


@app.post("/seed", status_code=201, tags=["system"])
def seed_demo_data(db: Session = Depends(get_db)):
    """Populate the database with realistic demo clients and portfolios."""
    results = seed_demo(db)
    return {"results": results, "client_id": results[0]["client_id"]}


@app.post("/reseed", status_code=201, tags=["system"])
def reseed_demo_data(db: Session = Depends(get_db)):
    """Delete all clients and re-seed fresh demo data (useful after translation updates)."""
    from models import Client
    db.query(Client).delete()
    db.commit()
    results = seed_demo(db)
    return {"results": results, "seeded": len(results)}
