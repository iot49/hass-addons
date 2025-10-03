

import { transformUrl } from './src/transformUrl';

// Replace existing transformUrl function with import

export async function get_json(uri: string) {
  try {
    const transformedUri = transformUrl(uri);
    let response: Response;
    try {
      response = await fetch(transformedUri, { method: 'GET', credentials: 'include', mode: 'cors' });
    } catch (error) {
      throw new Error(`Failed fetching ${transformedUri}`, { cause: error });
    }
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Failed fetching ${uri}`, { cause: error });
  }
}

export async function get_text(uri: string) {
  console.log(`get_text called with uri: ${uri}`);
  console.log(`Current window.location.href: ${window.location.href}`);
  console.log(`Current window.location.origin: ${window.location.origin}`);
  console.log(`Current window.location.pathname: ${window.location.pathname}`);
  
  try {
    const transformedUri = transformUrl(uri);
    console.log(`transformUrl result: ${transformedUri}`);
    
    // Log how fetch will resolve the URL
    const resolvedUrl = new URL(transformedUri, window.location.href);
    console.log(`Resolved absolute URL for fetch: ${resolvedUrl.href}`);
    
    let response: Response;
    try {
      response = await fetch(transformedUri, { method: 'GET', credentials: 'include', mode: 'cors' });
    } catch (error) {
      console.error(`Fetch failed for ${transformedUri} (resolved to ${resolvedUrl.href})`, error);
      throw new Error(`Failed fetching ${transformedUri}`, { cause: error });
    }
    if (!response.ok) {
      console.error(`HTTP error! status: ${response.status} for ${transformedUri} (resolved to ${resolvedUrl.href})`);
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.text();
  } catch (error) {
    console.error(`Failed fetching ${uri}`, { cause: error });
  }
}


export async function upload_files(files: FileList, targetPath: string = '') {
  try {
    const formData = new FormData();
    
    // Add all files to form data
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }
    
    // Add target path
    formData.append('target_path', targetPath);
    
    const uploadUrl = transformUrl('/api/upload');
    let response: Response;
    try {
      response = await fetch(uploadUrl, {
        method: 'POST',
        credentials: 'include',
        mode: 'cors',
        body: formData
      });
    } catch (error) {
      console.error(`Failed uploading files`, { cause: error });
      return;
    }
    
    if (!response.ok) {
      console.error(`HTTP error! status: ${response.status} for POST ${uploadUrl}`);
      return;
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Failed uploading files`, { cause: error });
  }
}
