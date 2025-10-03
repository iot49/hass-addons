/**
 * Central URL transformation for ingress compatibility
 * Transforms server URLs to ?route= format, leaves external URLs unchanged
 */
export function transformUrl(url: string): string {
  // Check if already transformed to avoid double encoding
  if (isTransformedUrl(url)) {
    return url;
  }
  
  if (url.startsWith('http')) {
    try {
      const urlObj = new URL(url);
      if (urlObj.origin === window.location.origin) {
        const transformed = `?route=${encodeURIComponent(urlObj.pathname)}`;
        console.log(`URL transform: "${url}" -> "${transformed}"`);
        return transformed;
      }
      // External URL - leave unchanged
      return url;
    } catch (error) {
      // Invalid URL, no change
      return url;
    }
  } else {
    // Relative URL - always transform
    const transformed = `?route=${encodeURIComponent(url)}`;
    console.log(`URL transform: "${url}" -> "${transformed}"`);
    return transformed;
  }
}

/**
 * Check if a URL is a transformed route URL
 */
export function isTransformedUrl(url: string): boolean {
  return url.includes('?route=') || url.includes('&route=');
}

/**
 * Extract original path from transformed URL
 * Used internally for link click handling
 */
function extractOriginalPath(url: string): string {
  try {
    const urlObj = new URL(url, window.location.origin);
    const routeParam = urlObj.searchParams.get('route');
    return routeParam ? decodeURIComponent(routeParam) : urlObj.pathname;
  } catch {
    return url;
  }
}

/**
 * Check if a path should be handled internally (server URLs)
 * Used internally for link click handling
 */
function isServerPath(path: string): boolean {
  return path.startsWith('/api/file/') ||
         path.endsWith('.md') ||
         path.startsWith('/api/') ||
         path.startsWith('/ui/');
}

/**
 * Handle internal link clicks with proper path extraction and navigation
 * This combines the utility functions to avoid code duplication
 */
export function handleInternalLinkClick(event: Event, showFileCallback: (path: string) => void): boolean {
  const link = event.target as HTMLAnchorElement;
  if (!link || !link.href) return false;
  
  // Extract original path from potentially transformed URL
  const targetPath = extractOriginalPath(link.href);
  
  // Check if it's a server URL that should be handled internally
  if (isServerPath(targetPath)) {
    event.preventDefault();
    
    // Update browser URL and history
    const fileDisplayPath = targetPath.replace('/api/file/', '');
    const state = { filePath: transformUrl(targetPath) };
    window.history.pushState(state, '', `/files/${fileDisplayPath}`);
    
    showFileCallback(targetPath);
    return true;
  }
  
  return false; // External link - allow default behavior
}

/**
 * Transform all links in HTML content using DOM parsing
 * Note: This only covers HTML attributes, not JavaScript fetch() calls in scripts
 */
export function transformHtmlLinks(htmlContent: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, 'text/html');
  
  // Transform all href attributes
  doc.querySelectorAll('a[href]').forEach(link => {
    const href = link.getAttribute('href');
    if (href) {
      link.setAttribute('href', transformUrl(href));
    }
  });
  
  // Transform all src attributes for images/assets that point to server
  doc.querySelectorAll('img[src], script[src], link[href]').forEach(element => {
    const attr = element.hasAttribute('src') ? 'src' : 'href';
    const url = element.getAttribute(attr);
    if (url) {
      element.setAttribute(attr, transformUrl(url));
    }
  });
  
  return doc.documentElement.innerHTML;
}