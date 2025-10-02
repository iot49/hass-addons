/**
 * Streamlined Shoelace configuration
 * Only imports the components that are actually used in the application
 */

// Import both light and dark theme CSS
import '@shoelace-style/shoelace/dist/themes/light.css';
import '@shoelace-style/shoelace/dist/themes/dark.css';

// Import only the components we actually use
import '@shoelace-style/shoelace/dist/components/icon/icon.js';
import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
import '@shoelace-style/shoelace/dist/components/tree/tree.js';
import '@shoelace-style/shoelace/dist/components/tree-item/tree-item.js';
import '@shoelace-style/shoelace/dist/components/split-panel/split-panel.js';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import '@shoelace-style/shoelace/dist/components/dialog/dialog.js';

// Set the base path for Shoelace assets
import { setBasePath } from '@shoelace-style/shoelace/dist/utilities/base-path.js';

// Configure the base path for icons and other assets
// This points to the CDN for icons since we're not bundling them
setBasePath('https://cdn.jsdelivr.net/npm/@shoelace-style/shoelace@2.20.1/cdn/');

// Export types for components we use
export type { SlTreeItem } from '@shoelace-style/shoelace';