import os
import sys
from pathlib import Path

# Ensure root directory is on Python path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from backend.app.config import settings
from backend.app.database import engine, Base
import backend.app.models

# Routers
from backend.app.routers import (
    auth,
    pharmacies,
    medicines,
    suppliers,
    batches,
    inventory,
    customers,
    sales,
    invoices,
    movements,
    ai,
    reports,
    public,
)

from sqlalchemy import text

# Auto-create database tables on startup if not already created
try:
    Base.metadata.create_all(bind=engine)
except Exception as exc:
    print(f"Warning: Database initialization error: {exc}")

app = FastAPI(
    title="MedGuard AI API",
    description="High-Precision Retail Pharmacy Inventory, FEFO Dispensing & AI Scanning Engine",
    version="2.0.0",
)

# Enable CORS for frontend applications
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve storage files (PDFs, scans) locally
storage_path = Path(settings.STORAGE_DIR)
storage_path.mkdir(parents=True, exist_ok=True)
app.mount("/storage", StaticFiles(directory=str(storage_path)), name="storage")

# Health Check Endpoint
@app.get("/api/health", tags=["System"])
def health_check():
    db_status = "disconnected"
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
            db_status = "postgresql_connected" if "postgres" in settings.clean_database_url.lower() else "connected"
    except Exception as exc:
        db_status = f"error: {str(exc)}"

    return {
        "status": "ok",
        "service": "MedGuard AI Core Backend",
        "version": "2.0.0",
        "database": db_status,
    }

# Register Routers
app.include_router(auth.router)
app.include_router(pharmacies.router)
app.include_router(medicines.router)
app.include_router(suppliers.router)
app.include_router(batches.router)
app.include_router(inventory.router)
app.include_router(customers.router)
app.include_router(sales.router)
app.include_router(invoices.router)
app.include_router(movements.router)
app.include_router(ai.router)
app.include_router(reports.router)
app.include_router(public.router)

# Mount Frontend Built SPA (dist/)
dist_path = Path(__file__).resolve().parent.parent.parent / "dist"
if dist_path.exists():
    assets_path = dist_path / "assets"
    if assets_path.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_path)), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    def serve_frontend_spa(full_path: str):
        # Exclude /api, /docs, /openapi.json, /storage
        if full_path.startswith("api/") or full_path == "api" or full_path.startswith("storage/"):
            return FileResponse(str(dist_path / "index.html"))
        target_file = dist_path / full_path
        if full_path and target_file.is_file():
            return FileResponse(str(target_file))
        return FileResponse(str(dist_path / "index.html"))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=True)
