import logging
import os
import re
import shutil
import tempfile
import textwrap
import urllib.parse
from fnmatch import fnmatch
from typing import List

from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from markdown import markdown
from pydantic import BaseModel, DirectoryPath, Field

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


def dedent_and_convert_to_html(md_string: str) -> str:
    """
    Dedents a markdown string and converts it to HTML.
    """
    return markdown(textwrap.dedent(md_string))


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
    title="FastAPI addon ingress test",
    description="""Serve documents with FastAPI behind Home Assistant Ingress.""",
    version="1.0.0",
)


@app.middleware("http")
async def route_parser_middleware(request: Request, call_next):
    """Middleware to handle query parameter routing for ingress compatibility"""
    route_param = request.query_params.get("route")
    ui_param = request.query_params.get("ui")

    print("=== MIDDLEWARE DEBUG ===")
    print(f"Request URL: {request.url}")
    print(f"Request path: {request.url.path}")
    print(f"Request method: {request.method}")
    print(f"All query params: {dict(request.query_params)}")
    print(f"Route param: {route_param}")
    print(f"UI param: {ui_param}")

    # Only process route parameter if there's no ui parameter
    # ui parameter requests should be handled directly by the root handler
    if route_param and not ui_param:
        # Decode the route parameter
        decoded_route = urllib.parse.unquote(route_param)

        # Store original path and query params
        request.state.original_path = request.scope["path"]
        request.state.original_query_params = request.query_params

        # Create a new request with the decoded route as the path
        request.scope["path"] = decoded_route
        request.scope["query_string"] = b""  # Clear query string for internal routing

        print(
            f"Route middleware: transforming {request.state.original_path}?route={route_param} -> {decoded_route}"
        )
    else:
        print("Middleware: passing through request unchanged")

    return await call_next(request)


# Specific handler for UI assets with query parameters
@app.get("/", dependencies=[])
async def root_with_ui_param(request: Request, ui: str = None):
    """Handle UI asset requests with ui query parameter"""
    if ui:
        static_file_path = os.path.join(UI_DIR, ui)
        print("=== UI ASSET HANDLER ===")
        print(f"UI param: {ui}")
        print(f"File path: {static_file_path}")
        print(f"File exists: {os.path.exists(static_file_path)}")

        if os.path.exists(static_file_path) and os.path.isfile(static_file_path):
            # Set correct MIME type based on file extension
            media_type = None
            if static_file_path.endswith(".js"):
                media_type = "application/javascript"
            elif static_file_path.endswith(".css"):
                media_type = "text/css"
            elif static_file_path.endswith(".html"):
                media_type = "text/html"
            elif static_file_path.endswith(".json"):
                media_type = "application/json"

            print(f"SUCCESS: Serving {static_file_path} with MIME type: {media_type}")
            return FileResponse(static_file_path, media_type=media_type)
        else:
            print(f"ERROR: Static file not found: {static_file_path}")
            raise HTTPException(status_code=404, detail="Static file not found")

    # If no ui parameter, fall through to main handler
    return await route_handler_main(request)


# Main root handler for ingress compatibility
async def route_handler_main(request: Request):
    """Handle root requests with query parameter routing for ingress compatibility"""

    # Get ALL query parameters for debugging
    all_params = dict(request.query_params)
    print("=== ROOT HANDLER DEBUG ===")
    print(f"Full URL: {request.url}")
    print(f"All query params: {all_params}")
    print(f"Request path: {request.url.path}")
    print(f"Request method: {request.method}")

    # Get query parameters directly from request
    route_param = request.query_params.get("route")

    print(f"Extracted route param: {route_param}")

    # Handle API routes via 'route' parameter (will be processed by middleware)
    if route_param:
        print(f"ROUTE REQUEST: route={route_param}")
        # This will be handled by the middleware that rewrites the path
        # Should not reach here due to middleware path rewriting
        print(f"Route parameter detected but not handled by middleware: {route_param}")
        raise HTTPException(status_code=404, detail="Route not found")

    # Default: serve main UI with modified asset URLs
    else:
        print("DEFAULT REQUEST: Serving main UI")
        # Serve main UI with modified asset URLs
        index_path = os.path.join(UI_DIR, "index.html")

        if not os.path.exists(index_path):
            raise HTTPException(status_code=404, detail="UI not found")

        # Read and modify HTML content
        with open(index_path, "r", encoding="utf-8") as f:
            html_content = f.read()

        # Get the current base path from the request, preserving protocol
        base_path = str(request.url).split("?")[0]
        # Ensure we preserve HTTPS if the original request was HTTPS
        if (
            request.headers.get("x-forwarded-proto") == "https"
            or request.url.scheme == "https"
        ):
            base_path = base_path.replace("http://", "https://")

        # Replace asset URLs: /ui/assets/file.js -> ?ui=assets/file.js
        # Using separate 'ui' parameter for clarity
        html_content = re.sub(
            r'(src|href)="(/ui/([^"]*)")', rf'\1="{base_path}?ui=\3"', html_content
        )

        # Inject base URL configuration for JavaScript
        base_url_script = f'''
        <script>
            window.__INGRESS_BASE_URL__ = "{base_path}";
        </script>
        '''
        html_content = html_content.replace("</head>", f"{base_url_script}</head>")

        print(f"Serving modified index.html with base URL: {base_path}")
        return HTMLResponse(content=html_content)


# Serve the main UI at /file (backward compatibility)
@app.get("/file")
async def read_root():
    """Serve the main UI application (backward compatibility)"""
    return FileResponse(f"{UI_DIR}/index.html")


# Keep the static files mount for backward compatibility - MOVED TO END
# This should be after all other routes to avoid conflicts
app.mount("/ui", StaticFiles(directory=UI_DIR), name="static")


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


class UploadResponse(BaseModel):
    """Upload response model"""

    message: str = Field(description="Upload result message")


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
    Upload folder to the document repository.

    This endpoint accepts files from a folder upload and copies the entire folder
    structure to the target path, completely replacing existing content.

    Args:
        files: List of files from folder upload
        target_path: Target directory path relative to document root

    Returns:
        UploadResponse: Upload result message

    Raises:
        HTTPException: 400 if upload fails
    """

    if not files:
        raise HTTPException(status_code=400, detail="No files provided")

    # Create temporary directory for uploaded files
    with tempfile.TemporaryDirectory() as temp_dir:
        try:
            # Save uploaded files to temporary directory, preserving folder structure
            for file in files:
                if file.filename:
                    file_path = os.path.join(temp_dir, file.filename)
                    file_dir = os.path.dirname(file_path)
                    os.makedirs(file_dir, exist_ok=True)

                    with open(file_path, "wb") as buffer:
                        content = await file.read()
                        buffer.write(content)

            # Copy the entire folder structure using shutil.copytree
            target_full_path = (
                os.path.join(DOCS_ROOT, target_path) if target_path else DOCS_ROOT
            )
            if (
                os.path.exists(target_full_path) and target_path
            ):  # Don't remove DOCS_ROOT itself
                shutil.rmtree(target_full_path)
            shutil.copytree(temp_dir, target_full_path, dirs_exist_ok=True)

            return UploadResponse(
                message=f"Folder uploaded successfully to {target_path or 'root'}"
            )

        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Upload failed: {str(e)}")
