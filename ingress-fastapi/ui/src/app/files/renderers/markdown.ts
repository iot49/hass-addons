import { createFileWrapper, setFileContent, transformFileUrl } from './utils';

export interface MarkdownRenderer {
  setupLinkClickHandler: () => void;
}

function transformRelativeLinks(markdownContent: string, currentPath: string): string {
  // Extract the directory path from the current file path
  const currentDir = currentPath.replace('/api/file/', '').split('/').slice(0, -1).join('/');
  console.log(`Current directory for relative links: ${currentPath} -> ${currentDir}`);

  // Transform relative markdown links and image links
  return markdownContent.replace(
    /(\[.*?\]\()((?:\.\/|\.\.\/|[^\/\s\)]+\.(?:md|png|jpg|jpeg|gif|svg|webp|ico|bmp)))\)/g,
    (match, prefix, relativePath) => {
      // Skip if it's already an absolute URL
      if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
        return match;
      }

      let absolutePath: string;

      if (relativePath.startsWith('./')) {
        // Current directory relative
        const targetPath = relativePath.substring(2);
        absolutePath = currentDir ? `/api/file/${currentDir}/${targetPath}` : `/api/file/${targetPath}`;
      } else if (relativePath.startsWith('../')) {
        // Parent directory relative
        const upLevels = (relativePath.match(/\.\.\//g) || []).length;
        const targetPath = relativePath.replace(/\.\.\//g, '');
        const pathParts = currentDir.split('/').filter((part) => part.length > 0);
        const newDir = pathParts.slice(0, Math.max(0, pathParts.length - upLevels)).join('/');
        absolutePath = newDir ? `/api/file/${newDir}/${targetPath}` : `/api/file/${targetPath}`;
      } else {
        // Relative to current directory (just filename)
        absolutePath = currentDir ? `/api/file/${currentDir}/${relativePath}` : `/api/file/${relativePath}`;
      }

      console.log(`Transformed relative path: ${relativePath} -> ${absolutePath}`);

      // Transform to ingress-compatible URL
      const transformedUrl = transformFileUrl(absolutePath);
      return `${prefix}${transformedUrl})`;
    }
  );
}

export async function renderMarkdown(filePane: HTMLDivElement, path: string, renderer: MarkdownRenderer): Promise<void> {
  try {
    // Extract the original API path from the transformed path if needed
    let fetchPath = path;
    if (path.startsWith('?route=')) {
      // Decode the route parameter to get the original path
      const urlParams = new URLSearchParams(path);
      const routeParam = urlParams.get('route');
      if (routeParam) {
        fetchPath = decodeURIComponent(routeParam);
      }
    }

    // Fetch the markdown content using the original API path
    const response = await fetch(fetchPath);
    if (!response.ok) {
      throw new Error(`Failed to fetch markdown: ${response.status} ${response.statusText}`);
    }

    const markdownContent = await response.text();

    // Transform relative links in the markdown content using the original path
    const transformedContent = transformRelativeLinks(markdownContent, fetchPath);

    // Create zero-md element with inline content instead of src
    const contentHtml = `
      <div style="flex: 1; min-height: 0; overflow: auto;">
        <zero-md>
          <script type="text/markdown">${transformedContent}</script>
        </zero-md>
      </div>
    `;

    setFileContent(filePane, createFileWrapper(contentHtml, path));
    // Add link click handler after zero-md is rendered
    renderer.setupLinkClickHandler();
  } catch (error) {
    console.error('Error rendering markdown:', error);
    const errorHtml = `
      <div style="flex: 1; min-height: 0; overflow: auto; padding: 1rem;">
        <p style="color: red;">Error loading markdown file: ${error}</p>
      </div>
    `;
    setFileContent(filePane, createFileWrapper(errorHtml, path));
  }
}
