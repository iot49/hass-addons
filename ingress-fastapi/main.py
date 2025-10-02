import logging
import os

from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse

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


@app.get("/{full_path:path}")
async def catch_all_get(request: Request, full_path: str):
    logger.error("DIAGNOSTIC: GET route handler called")
    # full_path = request.base_url
    logger.info(f"1 --------------------- full_path: {full_path}")
    logger.error(f"2 --------------------- full_path: {full_path}")
    print(f"3 --------------------- full_path: {full_path}")
    logger.error(f"request.url: {request.url}")
    logger.error(f"request.scope: {request.scope}")
    logger.error(f"request.headers: {request.headers}")

    # DIAGNOSTIC: Log what type of response we're about to return
    logger.error("DIAGNOSTIC: About to return HTML response")

    html_content = f"<html><body><p>Fast API catch_all full_path = '{full_path}' referer='{request.referer}' headers = {request.headers} url = {request.url}</p></body></html>"
    logger.error(f"DIAGNOSTIC: HTML content length: {len(html_content)}")

    return HTMLResponse(content=html_content)
