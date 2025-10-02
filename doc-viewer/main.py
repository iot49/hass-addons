import mimetypes
import os
import shutil
import textwrap
from fnmatch import fnmatch
from typing import List

import markdown
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, DirectoryPath, Field

# Check for container environment first, then fall back to local development
if os.path.exists("/config/docs"):
    DOCS_ROOT = "/config/docs"
else:
    DOCS_ROOT = "/"

# excludes (may use * and ? wildcards)
EXCLUDE_FILES = [".DS_Store"]
EXCLUDE_FOLDERS = ["__pycache__", ".venv", ".git", ".*cache", "$RECYCLE.BIN"]


def dedent_and_convert_to_html(md_string: str) -> str:
    """
    Dedents a markdown string and converts it to HTML.
    """
    return markdown.markdown(textwrap.dedent(md_string))


# set working directory to documents location
if os.path.exists(DOCS_ROOT):
    os.chdir(DOCS_ROOT)
    print(f"Using documents directory: {DOCS_ROOT}")
else:
    # Fallback to current directory if neither path exists
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
        description=f"Path relative to {DOCS_ROOT} root directory",
        example="admin/reports",
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


# Configure MIME types for proper static file serving
mimetypes.add_type("text/css", ".css")
mimetypes.add_type("application/javascript", ".js")
mimetypes.add_type("application/javascript", ".mjs")

# Mount static files for the UI - check for container vs local development
if os.path.exists("/html/ux"):
    UI_DIR = "/html/ux"
else:
    # For local development, use absolute path to the built UI
    script_dir = os.path.dirname(os.path.abspath(__file__))
    UI_DIR = os.path.join(script_dir, "html", "ux")


# Custom static file handler for better MIME type handling
class CustomStaticFiles(StaticFiles):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

    def file_response(self, *args, **kwargs):
        response = super().file_response(*args, **kwargs)
        # Ensure proper MIME types
        if hasattr(response, "path"):
            path = str(response.path)
            if path.endswith(".css"):
                response.headers["content-type"] = "text/css"
            elif path.endswith(".js") or path.endswith(".mjs"):
                response.headers["content-type"] = "application/javascript"
        return response


app.mount("/ui", CustomStaticFiles(directory=UI_DIR), name="static")


# Serve the main UI at root
@app.get("/")
async def read_root():
    """Serve the main UI application"""
    return FileResponse(f"{UI_DIR}/index.html")


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
    except OSError as e:
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


def copy_upload(source_dir: str, target_dir: str) -> dict:
    """
    Copy uploaded content to target directory, completely replacing existing content.

    This function completely replaces the target directory with the source content,
    ensuring that deleted files in the source are also removed from the target.

    Args:
        source_dir: Source directory path (temporary upload directory)
        target_dir: Target directory path (relative to DOCS_ROOT)

    Returns:
        dict: Summary of operations performed
    """
    target_path = os.path.join(DOCS_ROOT, target_dir) if target_dir else DOCS_ROOT
    operations = {"copied": [], "deleted": [], "errors": []}

    try:
        # If target directory exists, remove it completely first
        if os.path.exists(target_path) and target_dir:  # Don't remove DOCS_ROOT itself
            try:
                shutil.rmtree(target_path)
                operations["deleted"].append(
                    f"Removed existing directory: {target_dir}"
                )
            except Exception as e:
                operations["errors"].append(
                    f"Failed to remove existing directory {target_dir}: {str(e)}"
                )
                return operations

        # Ensure target directory exists
        os.makedirs(target_path, exist_ok=True)

        # Copy all files from source to target
        for root, dirs, files in os.walk(source_dir):
            # Skip excluded directories
            dirs[:] = [
                d for d in dirs if not any(fnmatch(d, p) for p in EXCLUDE_FOLDERS)
            ]

            for file in files:
                # Skip excluded files
                if any(fnmatch(file, p) for p in EXCLUDE_FILES):
                    continue

                source_file_path = os.path.join(root, file)
                rel_path = os.path.relpath(source_file_path, source_dir)
                target_file_path = os.path.join(target_path, rel_path)

                # Create target directory if it doesn't exist
                target_file_dir = os.path.dirname(target_file_path)
                os.makedirs(target_file_dir, exist_ok=True)

                try:
                    shutil.copy2(source_file_path, target_file_path)
                    operations["copied"].append(rel_path)
                except Exception as e:
                    operations["errors"].append(f"Failed to copy {rel_path}: {str(e)}")

    except Exception as e:
        operations["errors"].append(f"General error: {str(e)}")

    return operations


class UploadResponse(BaseModel):
    """Upload response model"""

    message: str = Field(description="Upload result message")
    operations: dict = Field(description="Summary of operations performed")


@app.post(
    "/api/upload",
    response_model=UploadResponse,
    summary="Upload Files",
    description=dedent_and_convert_to_html(
        "Upload files to the document repository, completely replacing existing content"
    ),
    responses={
        200: {
            "description": "Files uploaded successfully",
            "model": UploadResponse,
        },
        400: {"description": "Upload error", "model": ErrorResponse},
    },
    tags=["Documents"],
)
async def upload_files(
    files: List[UploadFile] = File(...), target_path: str = Form(default="")
) -> UploadResponse:
    """
    Upload files to the document repository.

    This endpoint accepts multiple files and uploads them to the specified target path
    within the document root. It completely replaces the target directory:
    - Removes existing content in the target directory
    - Copies all uploaded files to the target directory
    - Preserves directory structure from uploaded files

    Args:
        files: List of files to upload
        target_path: Target directory path relative to document root

    Returns:
        UploadResponse: Upload result with operation summary

    Raises:
        HTTPException: 400 if upload fails
    """
    import tempfile

    if not files:
        raise HTTPException(status_code=400, detail="No files provided")

    # Create temporary directory for uploaded files
    with tempfile.TemporaryDirectory() as temp_dir:
        try:
            # Save uploaded files to temporary directory
            for file in files:
                if file.filename:
                    # Preserve directory structure from filename if it contains paths
                    file_path = os.path.join(temp_dir, file.filename)
                    file_dir = os.path.dirname(file_path)
                    os.makedirs(file_dir, exist_ok=True)

                    with open(file_path, "wb") as buffer:
                        content = await file.read()
                        buffer.write(content)

            # Perform copy operation
            operations = copy_upload(temp_dir, target_path)

            total_operations = len(operations["copied"]) + len(operations["deleted"])
            message = f"Upload completed. {len(operations['copied'])} files copied, {len(operations['deleted'])} files deleted"

            if operations["errors"]:
                message += f", {len(operations['errors'])} errors occurred"

            return UploadResponse(message=message, operations=operations)

        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Upload failed: {str(e)}")
