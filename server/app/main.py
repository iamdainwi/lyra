from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import contextlib

from app.core.config import settings
from app.database.client import init_db
from app.api.routes import research

@contextlib.asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield

app = FastAPI(title=settings.app_name, lifespan=lifespan)

# Allow CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://lyra.iamdainwi.dev/", "https://lyra.iamdainwi.dev"], # In production, restrict this
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(research.router, prefix="/api/research", tags=["Research"])

@app.get("/")
def health_check():
    return {"status": "ok", "app": settings.app_name}
