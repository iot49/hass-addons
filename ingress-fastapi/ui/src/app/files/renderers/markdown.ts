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
  const contentHtml = `
    <div style="flex: 1; min-height: 0; overflow: auto;">
      <zero-md src="${path}" no-shadow></zero-md>
    </div>
  `;
  
  setFileContent(filePane, createFileWrapper(contentHtml, path));
  
  // Wait for zero-md to load, then override its link handling
  setTimeout(() => {
    const zeroMdElement = filePane.querySelector('zero-md');
    if (zeroMdElement && zeroMdElement.shadowRoot) {
      // Disable zero-md's internal link resolution by overriding its base href
      const baseElement = zeroMdElement.shadowRoot.querySelector('base');
      if (baseElement) {
        baseElement.remove();
      }
      
      // Add a base element that points to current origin to prevent relative resolution
      const newBase = document.createElement('base');
      newBase.href = window.location.origin + '/';
      zeroMdElement.shadowRoot.appendChild(newBase);
    }
    
    // Set up our custom link handlers
    renderer.setupLinkClickHandler();
  }, 100);
}
