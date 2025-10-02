// css
import '../index.css';

// URLPattern polyfill for Safari compatibility
import 'urlpattern-polyfill';

// Set document title from environment variable
document.title = import.meta.env.VITE_TITLE || 'Doc';

// Shoelace configuration - import before components that use it
import './shoelace-config';

// Import only the components we need
import './pw-files-browser'

