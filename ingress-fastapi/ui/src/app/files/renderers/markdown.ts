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
  console.log('renderMarkdown called with path:', path);
  console.log('Is path already transformed?', path.includes('?route='));
  
  const contentHtml = `
    <div style="flex: 1; min-height: 0; overflow: auto;">
      <zero-md src="${path}"></zero-md>
    </div>
  `;
  
  setFileContent(filePane, createFileWrapper(contentHtml, path));
  
  // Add event listener to detect zero-md loading issues
  const zeroMdElement = filePane.querySelector('zero-md');
  if (zeroMdElement) {
    zeroMdElement.addEventListener('zero-md-error', (event: any) => {
      console.error('Zero-MD error:', event.detail);
    });
    zeroMdElement.addEventListener('zero-md-rendered', () => {
      console.log('Zero-MD successfully rendered content');
    });
  }
  // Link click handler and HTML transformation handled by renderer.ts
  // This sets up click handlers for links within the rendered markdown content

  // Question: is this used only for markdown? If so, can this code be moved to markdown.ts?
  renderer.setupLinkClickHandler();
}
