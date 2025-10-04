import { createFileWrapper, setFileContent } from './utils';

export interface MarkdownRenderer {
  setupLinkClickHandler: () => void;
}

/**
 * Renders markdown content using the zero-md web component.
 *
 * The setupLinkClickHandler() call is crucial for handling internal links:
 * - It intercepts clicks on links within the rendered markdown
 * - Converts relative markdown links (like ./file.md, ../folder/file.md) to path relative to DOC_DIR - correct?
 * - Handles navigation within the app without full page reloads
 * - Transforms URLs to work with the ingress routing system (?route= format)
 *
 * The zero-md component fetches the markdown file from the provided src URL,
 * renders it to HTML, and displays it in the shadow DOM. The link click handler
 * then processes any links within that rendered content.
 */
export function renderMarkdown(
  filePane: HTMLDivElement,
  path: string,
  renderer: MarkdownRenderer
): void {
  // Convert the transformed path to a full absolute URL for zero-md
  const fullUrl = path.startsWith('?')
    ? `${window.location.origin}${window.location.pathname}${path}`
    : path;

  const resolvedUrl = new URL(path, window.location.href);
  
  console.log(`[DEBUG] renderMarkdown - window.location: "${window.location.href}"`);
  console.log(`[DEBUG] renderMarkdown - path: "${path}"`);
  console.log(`[DEBUG] renderMarkdown - resolvedUrl: "${resolvedUrl.href}"`);  
  console.log(`[DEBUG] renderMarkdown - fullUrl: "${fullUrl}"`);

  const contentHtml = `
    <div style="flex: 1; min-height: 0; overflow: auto;">
      <zero-md src="${fullUrl}"></zero-md>
    </div>
  `;
  
  setFileContent(filePane, createFileWrapper(contentHtml, path));
  
  // Add link click handler after zero-md is rendered
  renderer.setupLinkClickHandler();
}
