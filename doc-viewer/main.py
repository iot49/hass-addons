import markdown
import textwrap
import os
from fnmatch import fnmatch
from typing import List

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, DirectoryPath, Field

DOCS_ROOT = "/config/docs"

# excludes (may use * and ? wildcards)
EXCLUDE_FILES = [".DS_Store"]
EXCLUDE_FOLDERS = ["__pycache__", ".venv", ".git", ".*cache", "$RECYCLE.BIN"]

def dedent_and_convert_to_html(md_string: str) -> str:
    """
    Dedents a markdown string and converts it to HTML.
    """
    return markdown.markdown(textwrap.dedent(md_string))


# set working directory to documents location (only in Docker container)
if os.path.exists(DOCS_ROOT):
    os.chdir(DOCS_ROOT)
else:
    # For local development, use a test directory or current directory
    print(
        f"Documents directory {DOCS_ROOT} not found, using current directory for development"
    )


def is_folder_empty(folder_path: str) -> bool:
    """Check if a folder is empty (contains no accessible files or folders)"""
    try:
        for item in os.listdir(folder_path):
            item_path = os.path.join(folder_path, item)
            if os.path.isfile(item_path):
                # Check if file should be excluded
                if not any(fnmatch(item, p) for p in EXCLUDE_FILES):
                    return False
            elif os.path.isdir(item_path):
                # Check if folder should be excluded
                if not any(fnmatch(item, p) for p in EXCLUDE_FOLDERS):
                    return False
        return True
    except (OSError, PermissionError):
        # If we can't access the folder, consider it empty
        return True


class FolderModel(BaseModel):
    """Model representing a folder structure with files and subfolders"""

    path: DirectoryPath = Field(
        description=f"Path relative to {DOCS_ROOT} root directory", example="admin/reports"
    )
    folders: List[str] = Field(
        description="Names of accessible sub-folders within this path",
        default=[],
        example=["monthly", "quarterly", "annual"],
    )
    files: List[str] = Field(
        description="Names of files within this path",
        default=[],
        example=["summary.pdf", "data.xlsx", "notes.txt"],
    )

    @property
    def name(self) -> str:
        """Get the display name of this folder"""
        return os.path.normpath(self.path).split(os.sep)[-1]

class HealthResponse(BaseModel):
    """Health check response model"""

    status: str = Field(
        description="Service health status", example="Docs service is healthy"
    )

class ErrorResponse(BaseModel):
    """Error response model"""

    detail: str = Field(
        description="Error message",
    )


app = FastAPI(
    title="Document Service",
    description=dedent_and_convert_to_html(
        """Render files in /config/docs via a REST API."""
    ),
    version="1.0.0",
)

# Mount static files for the UI
app.mount("/ui", StaticFiles(directory="/html/ux"), name="static")

# Serve the main UI at root
@app.get("/")
async def read_root():
    """Serve the main UI application"""
    return FileResponse("/html/ux/index.html")


@app.get(
    "/api/health",
    response_model=HealthResponse,
    summary="Health Check",
    description=dedent_and_convert_to_html(
        "Check if the document service is running and healthy"
    ),
    tags=["Health"],
)
async def health_check() -> HealthResponse:
    """
    Perform a basic health check of the document service.

    Returns:
        HealthResponse: Service health status
    """
    return HealthResponse(status="Docs-addon is healthy")


@app.get(
    "/api/folder/{path:path}",
    response_model=FolderModel,
    summary="Browse Folder Contents",
    description=dedent_and_convert_to_html(
        "Retrieve the contents of a specific folder in the document repository"
    ),
    responses={
        200: {
            "description": "Folder contents successfully retrieved",
            "model": FolderModel,
        },
        404: {"description": "Folder not found", "model": ErrorResponse},
    },
    tags=["Documents"],
)
async def get_folder(path: str) -> FolderModel:
    """
    Browse the contents of a folder in the document repository.

    Returns a list of subfolders and files within the specified path.

    System files and empty folders are automatically filtered out.

    Args:
        path: Folder path relative to the document root (e.g., "rv/reports")

    Returns:
        FolderModel: Folder structure with subfolders and files

    Raises:
        HTTPException: 404 if folder not found

    Example:
        GET /api/folder/rv/reports
        - Returns subfolders and files within rv/reports/
    """
    normalized_path = os.path.normpath(path)

    if not os.path.isdir(normalized_path):
        raise HTTPException(status_code=404, detail=f"Folder not found: {path}")

    try:
        folders = [
            folder
            for folder in os.listdir(normalized_path)
            if os.path.isdir(os.path.join(normalized_path, folder))
            if not any(fnmatch(folder, p) for p in EXCLUDE_FOLDERS)
            if not is_folder_empty(os.path.join(normalized_path, folder))
        ]
        files = [
            file
            for file in os.listdir(normalized_path)
            if os.path.isfile(os.path.join(normalized_path, file))
            if not any(fnmatch(file, p) for p in EXCLUDE_FILES)
        ]
        return FolderModel(
            path=normalized_path, folders=sorted(folders), files=sorted(files)
        )
    except (OSError) as e:
        raise HTTPException(status_code=404, detail=f"Not found: {str(e)}")


@app.get(
    "/api/file/{path:path}",
    summary="Download File",
    description=dedent_and_convert_to_html(
        "Download or view a specific file from the document repository"
    ),
    responses={
        200: {
            "description": "File successfully retrieved",
            "content": {"application/octet-stream": {}},
        },
        404: {"description": "File not found", "model": ErrorResponse},
    },
    tags=["Documents"],
)
async def get_file(path: str):
    """
    Download or view a file from the document repository.

    Args:
        path: File path relative to the document root (e.g., "rv/reports/summary.pdf")

    Returns:
        FileResponse: The requested file for download/viewing

    Raises:
        HTTPException: if file not found

    Example:
        GET /api/file/admin/reports/summary.pdf
    """
    normalized_path = os.path.normpath(path)
    if not os.path.isfile(normalized_path):
        raise HTTPException(status_code=404, detail=f"File not found: {path}")
    return FileResponse(normalized_path)
