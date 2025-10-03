// URL transformation functions for ingress compatibility
function isIngressMode(): boolean {
  // Check for ingress-specific indicators
  return window.location.pathname.includes('/hassio/ingress/') ||
         window.location.hostname.includes('.leaf49.org') ||
         !!(window as any).__INGRESS_BASE_URL__;
}


function transformUrl(originalUrl: string): string {
  if (!isIngressMode()) {
    return originalUrl;
  }
  
  // Use relative URL approach for ingress compatibility
  // TODO: explain not all urls start with http
  if (!originalUrl.startsWith('http')) {
    console.log(`Transforming URL for ingress: ${originalUrl}`);
    return `?route=${encodeURIComponent(originalUrl)}`;
  }
  console.log(`Not transforming URL for ingress (absolute URL): ${originalUrl}`);
  return originalUrl;
}

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
