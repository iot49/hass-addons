import { renderMarkdown } from './renderers/markdown';
import { renderImage } from './renderers/image';
import { renderPdf } from './renderers/pdf';
import { renderAudio } from './renderers/audio';
import { renderCode } from './renderers/code';
import { renderJupyterNotebook } from './renderers/ipynb';
import { renderHtml } from './renderers/html';
import { renderFallback } from './renderers/fallback';
import { transformUrl } from '../../transformUrl';

export class FileRenderer {
  private filePane: HTMLDivElement;
  private currentFilePath: string = '';

  constructor(filePane: HTMLDivElement) {
    this.filePane = filePane;

    // Listen for theme changes to update markdown rendering
    window.addEventListener('theme-changed', () => {
      this.updateMarkdownTheme();
    });
  }

  async showFile(path: string | null) {
    if (!path) {
      this.filePane.innerHTML = '<p>No file selected</p>';
      this.currentFilePath = '';
      return;
    }

    // Always transform the path for API calls
    const transformedPath = transformUrl(path);
    this.currentFilePath = transformedPath;

    try {
      // Extract file extension to determine how to render
      const fileName = path.split('/').pop() || '';
      const extension = fileName.split('.').pop()?.toLowerCase() || '';

      // Show loading indicator
      this.filePane.innerHTML = '<sl-spinner></sl-spinner> Loading...';

      // Render file content based on extension
      switch (extension) {
        case 'md':
        case 'qmd':
          await renderMarkdown(this.filePane, transformedPath, this);
          break;

        // Image file cases
        case 'jpg':
        case 'jpeg':
        case 'png':
        case 'gif':
        case 'bmp':
        case 'svg':
        case 'webp':
        case 'ico':
          renderImage(this.filePane, transformedPath, fileName);
          break;

        case 'pdf':
          renderPdf(this.filePane, transformedPath);
          break;

        case 'ipynb':
          await renderJupyterNotebook(this.filePane, transformedPath);
          break;

        case 'html':
        case 'htm':
          renderHtml(this.filePane, transformedPath);
          break;

        // Audio file cases
        case 'mp3':
        case 'wav':
        case 'ogg':
        case 'aac':
        case 'm4a':
        case 'flac':
        case 'wma':
        case 'opus':
          renderAudio(this.filePane, transformedPath, fileName, extension);
          break;

        // Code file cases
        case 'js':
        case 'ts':
        case 'jsx':
        case 'tsx':
        case 'py':
        case 'cpp':
        case 'c':
        case 'h':
        case 'hpp':
        case 'java':
        case 'cs':
        case 'php':
        case 'rb':
        case 'go':
        case 'rs':
        case 'swift':
        case 'kt':
        case 'scala':
        case 'sh':
        case 'bash':
        case 'zsh':
        case 'fish':
        case 'sql':
        case 'css':
        case 'scss':
        case 'sass':
        case 'less':
        case 'json':
        case 'xml':
        case 'yaml':
        case 'yml':
        case 'toml':
        case 'ini':
        case 'cfg':
        case 'conf':
        case 'dockerfile':
        case 'makefile':
        case 'cmake':
          await renderCode(this.filePane, transformedPath, extension, this);
          break;

        default:
          // Fallback for unhandled file types
          await renderFallback(this.filePane, transformedPath);
          break;
      }
    } catch (error) {
      console.error('Error loading file:', error);
      this.filePane.innerHTML = `<p>Error loading file: ${error}</p>`;
    }
  }

  private updateMarkdownTheme(): void {
    // Find all zero-md elements in the file pane and update their theme
    const zeroMdElements = this.filePane.querySelectorAll('zero-md');
    zeroMdElements.forEach((element) => {
      // Remove existing theme template
      const existingTemplate = element.querySelector('template');
      if (existingTemplate) {
        existingTemplate.remove();
      }
    });
  }

  setupLinkClickHandler(): void {
    const zeroMdElements = this.filePane.querySelectorAll('zero-md');
    zeroMdElements.forEach((zeroMd) => {
      // Listen for the zero-md-rendered event to ensure content is loaded
      zeroMd.addEventListener('zero-md-rendered', () => {
        this.attachLinkListeners(zeroMd);
      });

      // Also check if it's already rendered
      if (zeroMd.shadowRoot) {
        this.attachLinkListeners(zeroMd);
      }

      // Add a mutation observer to watch for changes in the shadow DOM
      this.observeShadowDOMChanges(zeroMd);
    });
  }

  private attachLinkListeners(zeroMd: Element): void {
    const shadowRoot = zeroMd.shadowRoot;
    if (!shadowRoot) return;

    // Find all links in the shadow DOM
    const links = shadowRoot.querySelectorAll('a[href]');

    links.forEach((link) => {
      const anchorLink = link as HTMLAnchorElement;
      // Remove existing listeners to avoid duplicates
      anchorLink.removeEventListener('click', this.handleLinkClick);
      // Add click listener
      anchorLink.addEventListener('click', this.handleLinkClick);
    });
  }

  private observeShadowDOMChanges(zeroMd: Element): void {
    const shadowRoot = zeroMd.shadowRoot;
    if (!shadowRoot) return;

    // Create a mutation observer to watch for changes in the shadow DOM
    const observer = new MutationObserver((mutations) => {
      let shouldReattach = false;
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          // Check if any added nodes contain links
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element;
              if (element.tagName === 'A' || element.querySelectorAll('a[href]').length > 0) {
                shouldReattach = true;
              }
            }
          });
        }
      });

      if (shouldReattach) {
        this.attachLinkListeners(zeroMd);
      }
    });

    // Start observing
    observer.observe(shadowRoot, {
      childList: true,
      subtree: true,
    });
  }

  /* 404 error diagnosis
  zero-md@3?register:1 
      GET https://bv.leaf49.org/api/file/rv/manuals/generator/index.md?route=%2Fapi%2Ffile%2Frv%2Fmanuals%2Fgenerator%2Findex.md 404 (Not Found)
 
 CORRECT: https://bv.leaf49.org/api/hassio_ingress/nJXxJnCdxkwJNyJ4ABkQdr2_CMsBmHg8InJ-4bjNj9E/?route=%2Fapi%2Ffile%2Frv%2Fmanuals%2Fgenerator%2Findex.md

handleclick gets the correct href: [DEBUG] href: "https://bv.leaf49.org/api/hassio_ingress/nJXxJnCdxkwJNyJ4ABkQdr2_CMsBmHg8InJ-4bjNj9E/generator/index.md"
*/

  private handleLinkClick = (event: Event): void => {
    const link = event.target as HTMLAnchorElement;
    console.log(`[DEBUG] handleLinkClick ${link} - href: "${link?.href}"`);
    /* if /api/hassio_ingress/ is in link.href
    if (link && link.href && link.href.includes('/api/hassio_ingress/')) {
      transform to ?route=/api/file/<path of md file><link address in md file>
      since we were called from correct href ?route will be expanded correctly
      route=%2Fapi%2Ffile%2Frv%2Fmanuals%2Fgenerator%2Findex.md
      <path of md file>=rv/manuals/
      <link address>=generator/index.md
      */
    if (link && link.href) {
      // Check if this is a link to a document file that we should handle internally
      const url = new URL(link.href);
      
      // Check if this is an internal link (same origin) that should be handled
      if (url.origin === window.location.origin) {
        // Extract the relative path from the link href
        let relativePath = '';
        
        if (url.pathname.startsWith('/api/hassio_ingress/')) {
          // Extract the file path after the ingress token
          const ingressMatch = url.pathname.match(/\/api\/hassio_ingress\/[^\/]+\/(.+)/);
          if (ingressMatch) {
            relativePath = ingressMatch[1];
          }
        } else if (url.pathname.startsWith('/files/api/file/')) {
          // Legacy pattern support
          relativePath = url.pathname.replace('/files/api/file/', '');
        } else if (url.pathname.startsWith('/api/file/')) {
          // Direct API pattern
          relativePath = url.pathname.replace('/api/file/', '');
        }

        if (relativePath) {
          // Prevent default navigation
          event.preventDefault();

          // Resolve the full API path for the target file using the existing logic
          // Pass just the relative path, not prefixed with /api/file/
          const resolvedApiPath = this.resolveRelativeMarkdownPath(relativePath, this.currentFilePath);

          // Construct the proper browser URL that maintains the ingress path
          // Extract the ingress base from current location
          const currentUrl = window.location.href;
          let browserUrl = resolvedApiPath;
          
          // If we're in an ingress environment, maintain the ingress base URL
          if (currentUrl.includes('/api/hassio_ingress/')) {
            const ingressMatch = currentUrl.match(/(https?:\/\/[^\/]+\/api\/hassio_ingress\/[^\/]+)/);
            if (ingressMatch) {
              const ingressBase = ingressMatch[1];
              browserUrl = `${ingressBase}/${transformUrl(resolvedApiPath)}`;
            }
          }

          console.log(`[DEBUG] handleLinkClick - resolvedApiPath: "${resolvedApiPath}"`);
          console.log(`[DEBUG] handleLinkClick - browserUrl: "${browserUrl}"`);

          // Push state with proper history entry
          const state = {
            filePath: resolvedApiPath,
            uiPath: browserUrl,
          };
          window.history.pushState(state, '', browserUrl);

          // Show the linked file in the current file pane
          this.showFile(resolvedApiPath);
        }
      }
    }
  };

  private resolveRelativeMarkdownPath(relativePath: string, currentFilePath: string): string {
    console.log('[DEBUG] Resolving relative path:', relativePath, 'from current file path:', currentFilePath);
    // Extract the original path from the transformed URL if needed
    let originalPath = currentFilePath;
    if (currentFilePath.startsWith('?route=')) {
      const routeParam = currentFilePath.substring(7);
      originalPath = decodeURIComponent(routeParam);
    }

    // Extract directory from the original path
    let currentDir = '';
    let apiPrefix = '/api/file/';

    if (originalPath.startsWith('/api/file/')) {
      currentDir = originalPath.replace('/api/file/', '').split('/').slice(0, -1).join('/');
    } else if (originalPath.startsWith('/api/hassio_ingress/')) {
      // Extract the ingress token and path
      const ingressMatch = originalPath.match(/\/api\/hassio_ingress\/([^\/]+)\/(.+)/);
      if (ingressMatch) {
        apiPrefix = `/api/hassio_ingress/${ingressMatch[1]}/`;
        currentDir = ingressMatch[2].split('/').slice(0, -1).join('/');
      }
    }

    let result = '';
    if (relativePath.startsWith('./')) {
      const targetPath = relativePath.substring(2);
      result = currentDir ? `${apiPrefix}${currentDir}/${targetPath}` : `${apiPrefix}${targetPath}`;
    } else if (relativePath.startsWith('../')) {
      const upLevels = (relativePath.match(/\.\.\//g) || []).length;
      const targetPath = relativePath.replace(/\.\.\//g, '');
      const pathParts = currentDir.split('/').filter((part) => part.length > 0);
      const newDir = pathParts.slice(0, Math.max(0, pathParts.length - upLevels)).join('/');
      result = newDir ? `${apiPrefix}${newDir}/${targetPath}` : `${apiPrefix}${targetPath}`;
    } else {
      // Relative to current directory (just filename)
      result = currentDir ? `${apiPrefix}${currentDir}/${relativePath}` : `${apiPrefix}${relativePath}`;
    }

    return result;
  }
}
