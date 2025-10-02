import os
from typing import Annotated

from fastapi import FastAPI, Header

# excludes (may use * and ? wildcards)
EXCLUDE_FILES = [".DS_Store"]
EXCLUDE_FOLDERS = ["__pycache__", ".venv", ".git", ".*cache", "$RECYCLE.BIN"]

DOCS_ROOT = "/config/docs"
UI_DIR = "/html/ux"

try:
    os.makedirs(DOCS_ROOT, exist_ok=True)
    os.chdir(DOCS_ROOT)
except Exception as e:
    print(f"Error accessing documents directory {DOCS_ROOT}: {e}")

app = FastAPI(
    title="FastAPI addon ingress test",
    description="""Serve documents with FastAPI behind Home Assistant Ingress.""",
    version="1.0.0",
)


@app.get("/")
async def read_root(user_agent: Annotated[str | None, Header()] = None):
    """Serve the main UI application"""
    return "<html><body><p>Fast API root</p></body></html>"


@app.get("/api/health")
async def health_check():
    return "FastAPI-addon is healthy"
