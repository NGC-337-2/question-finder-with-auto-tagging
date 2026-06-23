"""
main.py — FastAPI application entry point.

Registers:
- CORS middleware (allows Vercel frontend + local dev)
- Auth router (/auth/signup, /auth/login)
- Questions router (/questions/search, /questions/history)
- /health endpoint for Render health checks
- MongoDB index creation on startup
"""
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from database import create_indexes
from routers.auth import router as auth_router
from routers.questions import router as questions_router
from auth_utils import limiter
from slowapi.errors import RateLimitExceeded
from slowapi import _rate_limit_exceeded_handler

load_dotenv()

app = FastAPI(
    title="Similar Question Finder API",
    description="Find semantically similar study questions with auto-tagging using sentence-transformers.",
    version="1.0.0",
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


# ── CORS ────────────────────────────────────────────────────────────────────
# Allow requests from the deployed Vercel frontend and local Vite dev server.
# Update ALLOWED_ORIGINS with your actual Vercel URL before deploying.
ALLOWED_ORIGINS = os.getenv(
    "ALLOWED_ORIGINS",
    "https://queryl-black.vercel.app,http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173,http://127.0.0.1:3000",
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Startup ──────────────────────────────────────────────────────────────────
@app.on_event("startup")
async def startup_event():
    await create_indexes()


# ── Routers ──────────────────────────────────────────────────────────────────
app.include_router(auth_router)
app.include_router(questions_router)


# ── Health check (required by Render) ────────────────────────────────────────
@app.get("/health", tags=["meta"])
async def health():
    return {"status": "ok"}


@app.get("/", tags=["meta"])
async def root():
    return {"message": "Similar Question Finder API is running"}
