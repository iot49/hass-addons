// css
import '../index.css';

// URLPattern polyfill for Safari compatibility
import 'urlpattern-polyfill';

// Log all base URL information when app loads
console.log('----------------------------------------------')
for (let i=0; i<10; i++) console.log('\n')
console.log('=== APP STARTUP - BASE URL INFORMATION ===');
console.log('window.location.href:', window.location.href);
console.log('window.location.origin:', window.location.origin);
console.log('window.location.pathname:', window.location.pathname);
console.log('window.location.search:', window.location.search);
console.log('window.location.hash:', window.location.hash);
console.log('document.baseURI:', document.baseURI);
console.log('import.meta.url:', import.meta.url);
console.log('=== END BASE URL INFORMATION ===');

// Set document title from environment variable
document.title = import.meta.env.VITE_TITLE || 'Doc';

// Shoelace configuration - import before components that use it
import './shoelace-config';

// Import only the components we need
import './pw-files-browser'

