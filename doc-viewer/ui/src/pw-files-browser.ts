import { LitElement, PropertyValues, css, html } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import { get_json, upload_files } from './app/api.ts';
import { SlTreeItem } from './shoelace-config';
import { FileRenderer } from './app/files/renderer';
import { iconForFilename } from './app/files/icons';

interface FolderModelInterface {
  path: string;
  folders: string[];
  files: string[];
}

class FolderModel implements FolderModelInterface {
  // from files/app/main.py
  path: string;
  folders: string[];
  files: string[];

  constructor(path: string, folders: string[] = [], files: string[] = []) {
    this.path = path;
    this.folders = folders;
    this.files = files;
  }

  /** Get the first part of the normalized path (realm) */
  get realm(): string {
    const normalizedPath = this.path.replace(/\\/g, '/').replace(/\/+/g, '/');
    return normalizedPath.split('/')[0];
  }

  /** Get the last part of the normalized path (name) */
  get name(): string {
    const normalizedPath = this.path.replace(/\\/g, '/').replace(/\/+/g, '/');
    const parts = normalizedPath.split('/');
    return parts[parts.length - 1];
  }
}

@customElement('pw-files-browser')
export class PwFilesBrowser extends LitElement {
  static styles = css`
    :host {
      display: block;
      height: 100vh;
      overflow: hidden;
      font-family: sans-serif;
    }

    * {
      box-sizing: border-box;
    }

    sl-split-panel {
      height: 100vh;
    }

    sl-split-panel::part(divider) {
      background-color: var(--sl-color-neutral-300);
    }

    sl-split-panel [slot="start"] {
      height: 100%;
      display: flex;
      flex-direction: column;
    }

    sl-split-panel [slot="end"] {
      height: 100%;
      display: flex;
      flex-direction: column;
    }

    #treePane {
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow: hidden;
    }

    #treeContainer {
      flex: 1;
      overflow: auto;
      min-height: 0;
    }

    #filePane {
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow: hidden;
    }

    #fileContent {
      flex: 1;
      overflow: auto;
      min-height: 0;
    }

    #fileBottomBar {
      height: 1.5em;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: var(--sl-color-neutral-100);
      border-top: 1px solid var(--sl-color-neutral-300);
      font-size: 0.875rem;
      color: var(--sl-color-neutral-700);
    }

    sl-tree-item {
      --indent-size: 0.4rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      line-height: 1.2;
    }

    sl-tree-item::part(base) {
      padding: 0.125rem 0.25rem 0.125rem 0.3125rem;
      min-height: 1.25rem;
    }

    sl-tree-item::part(item) {
      padding: 0;
    }

    sl-tree-item::part(label) {
      padding: 0;
      font-size: 0.8rem;
    }

    sl-tree-item::part(expand-button) {
      padding: 0.125rem;
      width: 0.875rem;
      height: 0.875rem;
    }

    sl-tree-item sl-icon {
      font-size: 0.7rem;
      margin-right: 0.25rem;
      color: var(--sl-color-primary-500);
    }

    #uploadSection {
      padding: 1rem;
      border-top: 1px solid var(--sl-color-neutral-300);
      background-color: var(--sl-color-neutral-50);
      flex-shrink: 0;
    }

    #uploadButton {
      width: 100%;
    }

    #uploadDialog {
      --width: 500px;
    }

    #uploadProgress {
      margin-top: 1rem;
      display: none;
    }

    #currentFileDisplay {
      margin-top: 0.5rem;
      font-size: 0.875rem;
      color: var(--sl-color-neutral-600);
      text-align: center;
      min-height: 1.2rem;
    }

    #fileInput {
      margin-bottom: 1rem;
    }

    .upload-status {
      margin-top: 1rem;
      padding: 0.5rem;
      border-radius: 4px;
      font-size: 0.875rem;
    }

    .upload-status.success {
      background-color: var(--sl-color-success-50);
      color: var(--sl-color-success-700);
      border: 1px solid var(--sl-color-success-200);
    }

    .upload-status.error {
      background-color: var(--sl-color-danger-50);
      color: var(--sl-color-danger-700);
      border: 1px solid var(--sl-color-danger-200);
    }

  `;

  @state() root!: FolderModel;
  @property() selectedFilePath?: string;
  @state() private currentFilePath?: string;
  @state() private uploadProgress = 0;
  @state() private isUploading = false;
  @state() private uploadStatus = '';
  @state() private uploadStatusType: 'success' | 'error' | '' = '';
  @state() private currentUploadingFile = '';
  private fileRenderer!: FileRenderer;

  @query('#treePane') treePane!: HTMLDivElement;
  @query('#treeContainer') treeContainer!: HTMLDivElement;
  @query('#fileContent') fileContent!: HTMLDivElement;
  @query('#uploadDialog') uploadDialog!: any;
  @query('#fileInput') fileInput!: HTMLInputElement;
  @query('#uploadProgress') uploadProgressEl!: any;

  async connectedCallback() {
    await super.connectedCallback();
    const rj = await get_json('/api/folder/');
    this.root = new FolderModel(rj.path, rj.folders, rj.files);
    
    // Listen for pw-file-path events
    window.addEventListener('pw-file-path', this.handleFilePathEvent as EventListener);
    
    // Listen for pageshow event to handle back/forward cache restoration
    window.addEventListener('pageshow', this.handlePageShow as EventListener);
    
    // Listen for popstate events to handle back/forward navigation
    window.addEventListener('popstate', this.handlePopState as EventListener);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('pw-file-path', this.handleFilePathEvent as EventListener);
    window.removeEventListener('pageshow', this.handlePageShow as EventListener);
    window.removeEventListener('popstate', this.handlePopState as EventListener);
  }

  private handleFilePathEvent = (event: Event) => {
    const customEvent = event as CustomEvent;
    this.currentFilePath = customEvent.detail.path;
  };

  private handlePageShow = (event: PageTransitionEvent) => {
    console.log('PageShow event in files browser:', {
      persisted: event.persisted,
      currentPath: window.location.pathname,
      selectedFilePath: this.selectedFilePath,
      hasFileRenderer: !!this.fileRenderer
    });
    
    // Handle back/forward cache restoration
    if (event.persisted && this.fileRenderer && this.currentFilePath) {
      console.log('Syncing file display after pageshow:', this.currentFilePath);
      this.fileRenderer.showFile(this.currentFilePath);
    }
  };

  private handlePopState = (event: PopStateEvent) => {
    // Handle back/forward navigation using stored state
    if (event.state?.filePath && this.fileRenderer) {
      console.log('Showing file after popstate:', event.state.filePath);
      this.fileRenderer.showFile(event.state.filePath);
    }
  };

  protected firstUpdated(_changedProperties: PropertyValues): void {
    super.firstUpdated(_changedProperties);
    this.fileRenderer = new FileRenderer(this.fileContent);

    // If a file path was provided via routing, show it immediately
    if (this.selectedFilePath) {
      this.fileRenderer.showFile(this.selectedFilePath);
    }

    this.treeContainer.addEventListener('sl-lazy-load', async (event) => {
      const target = event.target as SlTreeItem;
      const path = target.getAttribute('data-path');
      const name = target.getAttribute('data-folder');
      
      try {
        // Construct the folder path properly - handle empty root path
        const folderPath = path && path !== '' ? `${path}/${name}` : name;
        
        // For API calls, encode each path segment separately to avoid double-encoding
        const pathSegments = folderPath ? folderPath.split('/').map((segment: string) => encodeURIComponent(segment)) : [];
        const encodedApiPath = pathSegments.join('/');
        const folder = await get_json(`/api/folder/${encodedApiPath}`);
        
        // Check if folder data is valid
        if (!folder || !folder.folders) {
          console.error('Invalid folder data received:', folder);
          return;
        }
        
        for (const folderName of folder.folders) {
          const treeItem = document.createElement('sl-tree-item') as SlTreeItem;
          treeItem.innerText = folderName;
          treeItem.className = 'folder-item';
          treeItem.lazy = true;
          // Store the full path without encoding for data attributes
          treeItem.setAttribute('data-path', folderPath || '');
          treeItem.setAttribute('data-folder', folderName);
          target.append(treeItem);
        }
        
        for (const fileName of folder.files) {
          const treeItem = document.createElement('sl-tree-item') as SlTreeItem;
          // Construct the file path properly - encode each segment separately
          const filePath = folderPath ? `${folderPath}/${fileName}` : fileName;
          const filePathSegments = filePath.split('/').map((segment: string) => encodeURIComponent(segment));
          const encodedFilePath = filePathSegments.join('/');
          const dataPath = `/api/file/${encodedFilePath}`;
          console.log(`pw-files-browser: adding file ${dataPath}`);
          
          // Create icon element
          const icon = document.createElement('sl-icon');
          icon.setAttribute('name', iconForFilename(fileName));

          // Add icon and filename to tree item
          treeItem.appendChild(icon);
          treeItem.appendChild(document.createTextNode(fileName));

          treeItem.className = 'file-item';
          treeItem.setAttribute('data-path', dataPath);
          treeItem.addEventListener('click', (event) => {
            const target = event.target as HTMLElement;
            const path = target?.getAttribute('data-path');
            if (path) {
              // Push state for browser history
              const state = {
                filePath: path
              };
              window.history.pushState(state, '', window.location.pathname);
              this.fileRenderer.showFile(path);
            }
          });
          target.append(treeItem);
          if (fileName === 'index.md') {
            this.fileRenderer.showFile(dataPath);
          }
        }
        target.lazy = false;
      } catch (error) {
        console.error('Error loading folder contents:', error);
        // Optionally show user-friendly error message
        target.lazy = false;
      }
    });

    this.fileRenderer.showFile(`/api/file/index.md`);
  }

  protected updated(changedProperties: PropertyValues): void {
    super.updated(changedProperties);

    // If selectedFilePath changed, show the new file
    if (changedProperties.has('selectedFilePath') && this.selectedFilePath && this.fileRenderer) {
      console.log('Showing file due to selectedFilePath change:', this.selectedFilePath);
      this.fileRenderer.showFile(this.selectedFilePath);
    }
  }

  private async handleUploadClick() {
    this.uploadDialog.show();
  }

  private async handleUploadSubmit() {
    const files = this.fileInput.files;
    if (!files || files.length === 0) {
      this.uploadStatus = 'Please select files to upload';
      this.uploadStatusType = 'error';
      return;
    }

    this.isUploading = true;
    this.uploadProgress = 0;
    this.uploadStatus = '';
    this.uploadStatusType = '';
    this.currentUploadingFile = '';
    this.uploadProgressEl.style.display = 'block';

    try {
      // Simulate progress for user feedback with file name cycling
      let fileIndex = 0;
      const fileNames = Array.from(files).map(f => f.name);
      
      const progressInterval = setInterval(() => {
        if (this.uploadProgress < 90) {
          this.uploadProgress += 10;
          // Cycle through file names to show current processing
          if (fileNames.length > 0) {
            this.currentUploadingFile = fileNames[fileIndex % fileNames.length];
            fileIndex++;
          }
        } else {
          // After cycling through files, show finalizing message
          this.currentUploadingFile = 'Finalizing upload...';
        }
      }, 200);

      const result = await upload_files(files, '');
      
      clearInterval(progressInterval);
      this.uploadProgress = 100;

      if (result) {
        this.uploadStatus = result.message;
        this.uploadStatusType = 'success';
        
        // Refresh the file tree after successful upload
        setTimeout(async () => {
          const rj = await get_json('/api/folder/');
          this.root = new FolderModel(rj.path, rj.folders, rj.files);
          this.requestUpdate();
        }, 1000);
      } else {
        this.uploadStatus = 'Upload failed. Please try again.';
        this.uploadStatusType = 'error';
      }
    } catch (error) {
      this.uploadStatus = `Upload failed: ${error}`;
      this.uploadStatusType = 'error';
    } finally {
      this.isUploading = false;
      setTimeout(() => {
        this.uploadProgressEl.style.display = 'none';
        this.uploadProgress = 0;
        this.currentUploadingFile = '';
      }, 2000);
    }
  }

  private handleUploadCancel() {
    this.uploadDialog.hide();
    this.fileInput.value = '';
    this.uploadStatus = '';
    this.uploadStatusType = '';
    this.uploadProgress = 0;
    this.currentUploadingFile = '';
    this.uploadProgressEl.style.display = 'none';
  }

  override render() {
    return html`
      <sl-split-panel position-in-pixels="250">
        <div id="treePane" slot="start">
          <div id="treeContainer">
            ${this.root == null ? html`Loading ... <sl-spinner></sl-spinner>` : html` ${this.treeTemplate(this.root)}`}
          </div>
          <div id="uploadSection">
            <sl-button id="uploadButton" variant="primary" @click=${this.handleUploadClick}>
              <sl-icon slot="prefix" name="upload"></sl-icon>
              Upload Files
            </sl-button>
          </div>
        </div>
        <div id="filePane" slot="end">
          <div id="fileContent">Choose file to display ...</div>
          <div id="fileBottomBar">
            ${this.currentFilePath
              ? html`<a href="${this.currentFilePath}" target="_blank" style="color: var(--sl-color-primary-600); text-decoration: none;">Click here to open the file in a new tab</a>`
              : 'Select a file to view'}
          </div>
        </div>
      </sl-split-panel>

      <sl-dialog id="uploadDialog" label="Upload Files" class="dialog-overview">
        <div>
          <p>Select files or folders to upload to the document repository. This will sync the files (copy new/changed files and remove files that don't exist in your selection).</p>
          
          <input
            id="fileInput"
            type="file"
            multiple
            webkitdirectory
            style="margin-bottom: 1rem;"
          />
          
          <sl-progress-bar
            id="uploadProgress"
            value=${this.uploadProgress}
            style="display: none;"
          ></sl-progress-bar>

          <div id="currentFileDisplay">
            ${this.currentUploadingFile ? `Processing: ${this.currentUploadingFile}` : ''}
          </div>

          ${this.uploadStatus ? html`
            <div class="upload-status ${this.uploadStatusType}">
              ${this.uploadStatus}
            </div>
          ` : ''}
        </div>

        <div slot="footer">
          <sl-button variant="default" @click=${this.handleUploadCancel}>Cancel</sl-button>
          <sl-button
            variant="primary"
            @click=${this.handleUploadSubmit}
            ?disabled=${this.isUploading}
          >
            ${this.isUploading ? 'Uploading...' : 'Upload'}
          </sl-button>
        </div>
      </sl-dialog>
    `;
  }

  private treeTemplate(folder: FolderModel) {
    // Normalize the root path - remove leading dots and slashes
    const normalizedPath = folder.path === '.' || folder.path === './' ? '' : folder.path;
    
    return html` <sl-tree>
      ${folder.folders.map(
        (folderName: string) =>
          html` <sl-tree-item class="folder-item" data-path=${normalizedPath} data-folder=${folderName} lazy> ${folderName} </sl-tree-item>`
      )}
    </sl-tree>`;
  }
}
