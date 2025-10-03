// URL transformation functions for ingress compatibility
function isIngressMode(): boolean {
  // Check for ingress-specific indicators
  return window.location.pathname.includes('/hassio/ingress/') ||
         window.location.hostname.includes('.leaf49.org') ||
         !!(window as any).__INGRESS_BASE_URL__;
}

function getBaseUrl(): string {
  return (window as any).__INGRESS_BASE_URL__ || '';
}

function transformUrl(originalUrl: string): string {
  console.log('=== URL TRANSFORMATION DEBUG ===');
  console.log('Original URL:', originalUrl);
  console.log('Is ingress mode:', isIngressMode());
  console.log('Base URL:', getBaseUrl());
  console.log('Window location:', window.location.href);
  console.log('__INGRESS_BASE_URL__:', (window as any).__INGRESS_BASE_URL__);
  
  if (!isIngressMode()) {
    console.log('Not in ingress mode, returning original URL');
    return originalUrl;
  }
  
  const baseUrl = getBaseUrl();
  if (baseUrl && !originalUrl.startsWith('http')) {
    const transformedUrl = `${baseUrl}?route=${encodeURIComponent(originalUrl)}`;
    console.log('Transformed URL:', transformedUrl);
    return transformedUrl;
  }
  console.log('No transformation needed, returning original URL');
  return originalUrl;
}

export async function get_json(uri: string) {
  try {
    const transformedUri = transformUrl(uri);
    console.log('=== API CALL DEBUG ===');
    console.log('Original URI:', uri);
    console.log('Transformed URI:', transformedUri);
    console.log('Fetch options: { method: "GET", credentials: "include", mode: "cors" }');
    
    let response: Response;
    try {
      response = await fetch(transformedUri, { method: 'GET', credentials: 'include', mode: 'cors' });
    } catch (error) {
      console.error('Fetch failed:', error);
      throw new Error(`Failed fetching ${transformedUri}`, { cause: error });
    }
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      console.error(`HTTP error! status: ${response.status} for ${transformedUri}`);
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Failed fetching ${uri}`, { cause: error });
  }
}


export async function get_text(uri: string) {
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
    return await response.text();
  } catch (error) {
    console.error(`Failed fetching ${uri}`, { cause: error });
  }
}

export async function post_json(uri: string, data?: any) {
  try {
    const transformedUri = transformUrl(uri);
    let response: Response;
    try {
      response = await fetch(transformedUri, {
        method: 'POST',
        credentials: 'include',
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json',
        },
        body: data ? JSON.stringify(data) : undefined
      });
    } catch (error) {
      console.error(`Failed posting to ${transformedUri}`, { cause: error });
      return;
    }
    if (!response.ok) {
      console.error(`HTTP error! status: ${response.status} for POST ${transformedUri}`);
      return;
    }
    return await response.json();
  } catch (error) {
    console.error(`Failed posting to ${uri}`, { cause: error });
  }
}

export async function put_json(uri: string, data?: any) {
  try {
    const transformedUri = transformUrl(uri);
    let response: Response;
    try {
      response = await fetch(transformedUri, {
        method: 'PUT',
        credentials: 'include',
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json',
        },
        body: data ? JSON.stringify(data) : undefined
      });
    } catch (error) {
      console.error(`Failed putting to ${transformedUri}`, { cause: error });
      return;
    }
    if (!response.ok) {
      console.error(`HTTP error! status: ${response.status} for PUT ${transformedUri}`);
      return;
    }
    return await response.json();
  } catch (error) {
    console.error(`Failed putting to ${uri}`, { cause: error });
  }
}

export async function get_blob(uri: string) {
  try {
    const transformedUri = transformUrl(uri);
    let response: Response;
    try {
      response = await fetch(transformedUri, { method: 'GET', credentials: 'include', mode: 'cors' });
    } catch (error) {
      console.error(`Failed fetching ${transformedUri}`, { cause: error });
      return;
    }
    if (!response.ok) {
      console.error(`HTTP error! status: ${response.status} for GET ${transformedUri}`);
      return;
    }
    return await response.blob();
  } catch (error) {
    console.error(`Failed fetching ${uri}`, { cause: error });
  }
}

export async function delete_json(uri: string) {
  try {
    const transformedUri = transformUrl(uri);
    let response: Response;
    try {
      response = await fetch(transformedUri, {
        method: 'DELETE',
        credentials: 'include',
        mode: 'cors',
      });
    } catch (error) {
      console.error(`Failed deleting ${transformedUri}`, { cause: error });
      return;
    }
    if (!response.ok) {
      console.error(`HTTP error! status: ${response.status} for DELETE ${transformedUri}`);
      return;
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Failed deleting ${uri}`, { cause: error });
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
