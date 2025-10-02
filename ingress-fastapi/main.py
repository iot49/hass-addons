import logging
import os
from urllib.parse import urlparse

from fastapi import FastAPI, Request
from fastapi.responses import FileResponse

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

# excludes (may use * and ? wildcards)
EXCLUDE_FILES = [".DS_Store"]
EXCLUDE_FOLDERS = ["__pycache__", ".venv", ".git", ".*cache", "$RECYCLE.BIN"]

DOCS_ROOT = "/config/docs"
UI_DIR = "/html/ux"

logger.info(f"DOCS_ROOT: {DOCS_ROOT}, UI_DIR: {UI_DIR}")

try:
    os.makedirs(DOCS_ROOT, exist_ok=True)
    os.chdir(DOCS_ROOT)
except Exception as e:
    logger.error(f"Error accessing documents directory {DOCS_ROOT}: {e}")

app = FastAPI(
    title="FastAPI addon ingress test",
    description="""Serve documents with FastAPI behind Home Assistant Ingress.""",
    version="1.0.0",
)


# Serve the main UI at root
@app.get("/file")
async def read_root():
    """Serve the main UI application"""
    return FileResponse(f"{UI_DIR}/index.html")


@app.get("/{full_path:path}")
async def catch_all_get(request: Request, full_path: str):
    # e.g. https://bv.leaf49.org/hassio/ingress/c5db6b11_ingress-fastapi?hello=12345
    referer = request.headers.get("referer", "")
    parsed = urlparse(referer)
    query = parsed.query
    path = parsed.path
    return f"path={path}, query={query}, full_path={full_path}"
