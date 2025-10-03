import { renderMarkdown } from './renderers/markdown';
import { renderImage } from './renderers/image';
import { renderPdf } from './renderers/pdf';
import { renderAudio } from './renderers/audio';
import { renderCode } from './renderers/code';
import { renderJupyterNotebook } from './renderers/ipynb';
import { renderHtml } from './renderers/html';
import { renderFallback } from './renderers/fallback';

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

    this.currentFilePath = path;

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
          await renderMarkdown(this.filePane, path, this);
          return;

        // Image file cases
        case 'jpg':
        case 'jpeg':
        case 'png':
        case 'gif':
        case 'bmp':
        case 'svg':
        case 'webp':
        case 'ico':
          renderImage(this.filePane, path, fileName);
          return;

        case 'pdf':
          renderPdf(this.filePane, path);
          return;

        case 'ipynb':
          await renderJupyterNotebook(this.filePane, path);
          return;

        case 'html':
        case 'htm':
          renderHtml(this.filePane, path);
          return;

        // Audio file cases
        case 'mp3':
        case 'wav':
        case 'ogg':
        case 'aac':
        case 'm4a':
        case 'flac':
        case 'wma':
        case 'opus':
          renderAudio(this.filePane, path, fileName, extension);
          return;

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
          await renderCode(this.filePane, path, extension, this);
          return;
      }

      // Fallback for unhandled file types
      await renderFallback(this.filePane, path);
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
    // console.log(`Found ${links.length} links in zero-md shadow DOM`);
    
    links.forEach((link) => {
      const anchorLink = link as HTMLAnchorElement;
      // Remove existing listeners to avoid duplicates
      anchorLink.removeEventListener('click', this.handleLinkClick);
      // Add click listener
      anchorLink.addEventListener('click', this.handleLinkClick);
      // console.log('Attached click listener to link:', anchorLink.href);
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
        console.log('Shadow DOM changed, reattaching link listeners');
        this.attachLinkListeners(zeroMd);
      }
    });

    // Start observing
    observer.observe(shadowRoot, {
      childList: true,
      subtree: true
    });
  }

  private isRelativeMarkdownLink(_href: string, link: HTMLAnchorElement): boolean {
    const originalHref = link.getAttribute('href') || '';
    return originalHref.endsWith('.md') &&
           (originalHref.startsWith('./') ||
            originalHref.startsWith('../') ||
            (!originalHref.includes('/') && !originalHref.startsWith('http')));
  }

  private resolveRelativePath(relativePath: string, currentFilePath: string): string {
    // Convert relative markdown links to absolute API paths
    // Handle cases like ./file.md, ../folder/file.md, file.md
    const currentDir = currentFilePath.replace('/api/file/', '').split('/').slice(0, -1).join('/');
    
    if (relativePath.startsWith('./')) {
      const targetPath = relativePath.substring(2);
      return currentDir ? `/api/file/${currentDir}/${targetPath}` : `/api/file/${targetPath}`;
    } else if (relativePath.startsWith('../')) {
      const upLevels = (relativePath.match(/\.\.\//g) || []).length;
      const targetPath = relativePath.replace(/\.\.\//g, '');
      const pathParts = currentDir.split('/').filter(part => part.length > 0);
      const newDir = pathParts.slice(0, Math.max(0, pathParts.length - upLevels)).join('/');
      return newDir ? `/api/file/${newDir}/${targetPath}` : `/api/file/${targetPath}`;
    } else {
      // Relative to current directory (just filename)
      return currentDir ? `/api/file/${currentDir}/${relativePath}` : `/api/file/${relativePath}`;
    }
  }

  private handleLinkClick = (event: Event): void => {
    const link = event.target as HTMLAnchorElement;
    if (link && link.href) {
      const url = new URL(link.href);
      let targetPath: string;
      
      if (url.pathname.startsWith('/api/file/')) {
        targetPath = url.pathname;
      } else if (this.isRelativeMarkdownLink(link.href, link)) {
        const originalHref = link.getAttribute('href') || '';
        targetPath = this.resolveRelativePath(originalHref, this.currentFilePath);
      } else {
        // External link or non-markdown link - allow default behavior
        return;
      }
      
      // Prevent default navigation
      event.preventDefault();
      
      // Update browser URL and history
      const fileDisplayPath = targetPath.replace('/api/file/', '');
      const state = { filePath: targetPath };
      window.history.pushState(state, '', `/files/${fileDisplayPath}`);
      
      // Show the linked file in the current file pane
      this.showFile(targetPath);
    }
  };
}