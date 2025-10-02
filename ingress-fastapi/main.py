import os

from fastapi import FastAPI, Request

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


@app.route("/{full_path:path}")
async def catch_all(request: Request, full_path: str):
    print("full_path: " + full_path)
    return f"<html><body><p>Fast API catch_all {full_path}</p></body></html>"
