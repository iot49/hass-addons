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
    console.log(`[DEBUG] setupLinkClickHandler - called`);
    const zeroMdElements = this.filePane.querySelectorAll('zero-md');
    console.log(`[DEBUG] setupLinkClickHandler - found ${zeroMdElements.length} zero-md elements`);
    
    zeroMdElements.forEach((zeroMd) => {
      console.log(`[DEBUG] setupLinkClickHandler - setting up listeners for zero-md element`);
      
      // Listen for the zero-md-rendered event to ensure content is loaded
      zeroMd.addEventListener('zero-md-rendered', () => {
        console.log(`[DEBUG] setupLinkClickHandler - zero-md-rendered event fired`);
        this.attachLinkListeners(zeroMd);
      });
      
      // Also check if it's already rendered
      if (zeroMd.shadowRoot) {
        console.log(`[DEBUG] setupLinkClickHandler - shadowRoot already exists, attaching listeners immediately`);
        this.attachLinkListeners(zeroMd);
      } else {
        console.log(`[DEBUG] setupLinkClickHandler - shadowRoot does not exist yet, waiting for event`);
      }
      
      // Add a mutation observer to watch for changes in the shadow DOM
      this.observeShadowDOMChanges(zeroMd);
    });
  }

  private attachLinkListeners(zeroMd: Element): void {
    const shadowRoot = zeroMd.shadowRoot;
    if (!shadowRoot) {
      console.log(`[DEBUG] attachLinkListeners - no shadowRoot found`);
      return;
    }

    // Find all links in the shadow DOM
    const links = shadowRoot.querySelectorAll('a[href]');
    console.log(`[DEBUG] attachLinkListeners - found ${links.length} links in shadow DOM`);
    
    links.forEach((link) => {
      const anchorLink = link as HTMLAnchorElement;
      console.log(`[DEBUG] attachLinkListeners - attaching listener to link: "${anchorLink.getAttribute('href')}"`);
      // Remove existing listeners to avoid duplicates
      anchorLink.removeEventListener('click', this.handleLinkClick);
      // Add click listener
      anchorLink.addEventListener('click', this.handleLinkClick);
    });
  }

  private observeShadowDOMChanges(zeroMd: Element): void {
    console.log(`[DEBUG] observeShadowDOMChanges - setting up observer`);
    
    // Create a mutation observer to watch for changes in the zero-md element itself
    const observer = new MutationObserver((_mutations) => {
      console.log(`[DEBUG] observeShadowDOMChanges - mutation detected ${_mutations.length} mutations`);
      
      // Check if shadow DOM was created
      if (zeroMd.shadowRoot) {
        console.log(`[DEBUG] observeShadowDOMChanges - shadowRoot now available, attaching listeners`);
        this.attachLinkListeners(zeroMd);
        observer.disconnect(); // Stop observing once we have shadow DOM
      }
    });

    // Start observing the zero-md element for shadow DOM creation
    observer.observe(zeroMd, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeOldValue: true
    });
  }


  private handleLinkClick = (event: Event): void => {
    const link = event.target as HTMLAnchorElement;
    if (link && link.href) {
      console.log(`[DEBUG] handleLinkClick - link.href: "${link.href}"`);
      console.log(`[DEBUG] handleLinkClick - link.getAttribute('href'): "${link.getAttribute('href')}"`);
      console.log(`[DEBUG] handleLinkClick - currentFilePath: "${this.currentFilePath}"`);
      
      // Check if this is a relative markdown link
      const originalHref = link.getAttribute('href') || '';
      if (originalHref.endsWith('.md') &&
          (originalHref.startsWith('./') || originalHref.startsWith('../') ||
           (!originalHref.includes('/') && !originalHref.startsWith('http')))) {
        
        // Prevent default navigation
        event.preventDefault();
        
        // Resolve relative path based on current file location
        let resolvedPath = this.resolveRelativeMarkdownPath(originalHref, this.currentFilePath);
        console.log(`[DEBUG] handleLinkClick - resolved path: "${resolvedPath}"`);
        
        // Update browser URL and history
        const fileDisplayPath = resolvedPath.replace(/^\/api\/[^\/]+\//, '');
        const state = { filePath: transformUrl(resolvedPath) };
        window.history.pushState(state, '', `/files/${fileDisplayPath}`);
        
        // Show the linked file
        this.showFile(resolvedPath);
      }
    }
  };

  private resolveRelativeMarkdownPath(relativePath: string, currentFilePath: string): string {
    console.log(`[DEBUG] resolveRelativeMarkdownPath - relativePath: "${relativePath}"`);
    console.log(`[DEBUG] resolveRelativeMarkdownPath - currentFilePath: "${currentFilePath}"`);
    
    // Extract the original path from the transformed URL if needed
    let originalPath = currentFilePath;
    if (currentFilePath.startsWith('?route=')) {
      const routeParam = currentFilePath.substring(7);
      originalPath = decodeURIComponent(routeParam);
    }
    
    console.log(`[DEBUG] resolveRelativeMarkdownPath - originalPath: "${originalPath}"`);
    
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
    
    console.log(`[DEBUG] resolveRelativeMarkdownPath - currentDir: "${currentDir}"`);
    console.log(`[DEBUG] resolveRelativeMarkdownPath - apiPrefix: "${apiPrefix}"`);
    
    let result = '';
    if (relativePath.startsWith('./')) {
      const targetPath = relativePath.substring(2);
      result = currentDir ? `${apiPrefix}${currentDir}/${targetPath}` : `${apiPrefix}${targetPath}`;
    } else if (relativePath.startsWith('../')) {
      const upLevels = (relativePath.match(/\.\.\//g) || []).length;
      const targetPath = relativePath.replace(/\.\.\//g, '');
      const pathParts = currentDir.split('/').filter(part => part.length > 0);
      const newDir = pathParts.slice(0, Math.max(0, pathParts.length - upLevels)).join('/');
      result = newDir ? `${apiPrefix}${newDir}/${targetPath}` : `${apiPrefix}${targetPath}`;
    } else {
      // Relative to current directory (just filename)
      result = currentDir ? `${apiPrefix}${currentDir}/${relativePath}` : `${apiPrefix}${relativePath}`;
    }
    
    console.log(`[DEBUG] resolveRelativeMarkdownPath - result: "${result}"`);
    return result;
  }
}