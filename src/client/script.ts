import type { ClientRuntimeConfig } from "./types";

/**
 * 接続状態インジケーターのスクリプト
 */
const connectionIndicatorScript = `
function createConnectionIndicator() {
  let indicator = document.getElementById("kt-connection-status");
  if (!indicator) {
    indicator = document.createElement("div");
    indicator.id = "kt-connection-status";
    indicator.style.cssText = "position:fixed;top:8px;right:8px;padding:4px 8px;border-radius:4px;font-size:12px;z-index:9999;transition:opacity 0.3s;";
    document.body.appendChild(indicator);
  }
  return indicator;
}

function updateConnectionStatus(status, reconnectAttempts, maxReconnectAttempts) {
  const indicator = createConnectionIndicator();
  switch (status) {
    case "connected":
      indicator.textContent = "● Connected";
      indicator.style.background = "#d4edda";
      indicator.style.color = "#155724";
      setTimeout(() => { indicator.style.opacity = "0"; }, 2000);
      break;
    case "connecting":
      indicator.style.opacity = "1";
      indicator.textContent = "◌ Connecting...";
      indicator.style.background = "#fff3cd";
      indicator.style.color = "#856404";
      break;
    case "disconnected":
      indicator.style.opacity = "1";
      indicator.textContent = "○ Disconnected";
      indicator.style.background = "#f8d7da";
      indicator.style.color = "#721c24";
      break;
    case "reconnecting":
      indicator.style.opacity = "1";
      indicator.textContent = "◌ Reconnecting (" + reconnectAttempts + "/" + maxReconnectAttempts + ")...";
      indicator.style.background = "#fff3cd";
      indicator.style.color = "#856404";
      break;
  }
}`;

/**
 * XSS検出スクリプト
 * @note このロジックはsrc/utils/html.ts内のcontainsUnsafeHtml()と同じ。
 *       変更時は両方を同期すること。
 */
const xssDetectionScript = `
// Note: Keep in sync with src/utils/html.ts containsUnsafeHtml()
function isUnsafeHtml(html) {
  var lowerHtml = html.toLowerCase();
  if (!lowerHtml.includes("<") && !lowerHtml.includes("javascript") && !lowerHtml.includes("vbscript") && !lowerHtml.includes("data:")) {
    return false;
  }
  var patterns = [
    /<script[\\s\\S]*?>/i,
    /\\bjavascript\\s*:/i,
    /\\bvbscript\\s*:/i,
    /\\bdata\\s*:[^,]*?base64/i,
    /\\bon[a-z]+\\s*=/i,
    /<iframe[\\s>]/i,
    /<embed[\\s>]/i,
    /<object[\\s>]/i,
    /<base[\\s>]/i,
    /<form[\\s>]/i,
    /<meta[\\s>]/i,
    /<link[\\s>]/i,
    /<svg[\\s\\S]*?on[a-z]+\\s*=/i,
    /<math[\\s\\S]*?on[a-z]+\\s*=/i
  ];
  return patterns.some(function(p) { return p.test(html); });
}`;

/**
 * フォーカス状態の保存・復元スクリプト
 */
const focusManagementScript = `
function saveFocusState() {
  const state = {
    id: null,
    selectionStart: null,
    selectionEnd: null,
    scrollX: window.scrollX,
    scrollY: window.scrollY
  };
  const active = document.activeElement;
  if (!active || active === document.body) return state;
  state.id = active.id;
  if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) {
    try {
      state.selectionStart = active.selectionStart;
      state.selectionEnd = active.selectionEnd;
    } catch (e) { /* 一部のinput typeでは取得不可 */ }
  }
  return state;
}

function restoreFocusState(state, retryCount) {
  if (!state) return;
  if (state.scrollX !== undefined && state.scrollY !== undefined) {
    window.scrollTo(state.scrollX, state.scrollY);
  }
  if (!state.id) return;
  const el = document.getElementById(state.id);
  if (!el) {
    if (retryCount < 3) {
      setTimeout(() => restoreFocusState(state, retryCount + 1), 10);
    }
    return;
  }
  el.focus();
  if ((el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)
      && state.selectionStart !== null) {
    try {
      el.setSelectionRange(state.selectionStart, state.selectionEnd);
    } catch (e) { /* 一部のinput typeでは設定不可 */ }
  }
}`;

/**
 * DOMパッチ適用スクリプト
 * Web標準のtemplate要素とreplaceChildren/insertAdjacentHTMLを活用
 */
const patchApplyScript = `
// template要素を使った安全なHTML→DOM変換（スクリプト実行を防止）
function createElementFromHtml(html) {
  const template = document.createElement("template");
  template.innerHTML = html.trim();
  return template.content.firstElementChild || template.content.firstChild;
}

// 複数の子要素を取得
function createChildNodesFromHtml(html) {
  const template = document.createElement("template");
  template.innerHTML = html;
  return template.content.childNodes;
}

function applyPatch(patch) {
  switch (patch.type) {
    case "replaceRoot": {
      if (isUnsafeHtml(patch.html)) {
        console.error("Blocked potentially unsafe HTML content");
        return;
      }
      const rootId = patch.rootId || "app";
      const root = document.getElementById(rootId);
      if (!root) {
        console.error("Root element not found:", rootId);
        return;
      }
      const nodes = createChildNodesFromHtml(patch.html);
      // replaceChildren()で効率的にバッチ置換
      root.replaceChildren(...nodes);
      break;
    }
    case "replaceNode": {
      if (isUnsafeHtml(patch.html)) {
        console.error("Blocked potentially unsafe HTML content");
        return;
      }
      const el = document.getElementById(patch.id);
      if (el) {
        // フォーカス中のテキスト入力要素、またはそれを含む要素はスキップ（レースコンディション防止）
        // range, checkbox, radio などテキスト入力以外は除外
        const activeEl = document.activeElement;
        if (activeEl && (activeEl instanceof HTMLInputElement || activeEl instanceof HTMLTextAreaElement)) {
          const textInputTypes = ['text', 'search', 'tel', 'url', 'email', 'password', ''];
          const isTextInput = activeEl instanceof HTMLTextAreaElement ||
            (activeEl instanceof HTMLInputElement && textInputTypes.includes(activeEl.type));
          if (isTextInput && (el === activeEl || (el.contains && el.contains(activeEl)))) {
            return;
          }
        }
        const newEl = createElementFromHtml(patch.html);
        if (newEl) el.replaceWith(newEl);
      }
      break;
    }
    case "removeNode": {
      const el = document.getElementById(patch.id);
      if (el) el.remove();
      break;
    }
    case "insertNode": {
      if (isUnsafeHtml(patch.html)) {
        console.error("Blocked potentially unsafe HTML content");
        return;
      }
      const parent = patch.parentId === "__root__"
        ? document.getElementById("app")
        : document.getElementById(patch.parentId);
      if (parent) {
        const newEl = createElementFromHtml(patch.html);
        if (newEl) {
          if (patch.index >= 0 && patch.index < parent.children.length) {
            parent.children[patch.index].before(newEl);
          } else {
            parent.appendChild(newEl);
          }
        }
      }
      break;
    }
    case "streamAppend": {
      if (isUnsafeHtml(patch.html)) {
        console.error("Blocked potentially unsafe HTML content");
        return;
      }
      const app = document.getElementById("app");
      if (app) {
        // insertAdjacentHTMLで効率的に末尾追加
        app.insertAdjacentHTML("beforeend", patch.html);
      }
      break;
    }
  }
}`;

/**
 * チャット自動スクロールスクリプト
 */
const chatAutoScrollScript = `
let userHasScrolled = false;
let lastScrollTop = 0;

function shouldAutoScroll(container) {
  if (!container) return false;
  // ユーザーが上にスクロールした場合は自動スクロールを無効化
  const threshold = 100;
  const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
  return isNearBottom || !userHasScrolled;
}

function scrollToBottom(container) {
  if (!container) return;
  container.scrollTo({
    top: container.scrollHeight,
    behavior: "smooth"
  });
}

function initChatAutoScroll() {
  // data-kt-chat-container 属性を持つ要素を探す
  const containers = document.querySelectorAll("[data-kt-chat-container]");
  containers.forEach((container) => {
    if (container.dataset.ktChatScrollInit) return;
    container.dataset.ktChatScrollInit = "true";

    container.addEventListener("scroll", () => {
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
      if (container.scrollTop < lastScrollTop && !isNearBottom) {
        userHasScrolled = true;
      } else if (isNearBottom) {
        userHasScrolled = false;
      }
      lastScrollTop = container.scrollTop;
    });
  });
}

function autoScrollChat() {
  const containers = document.querySelectorAll("[data-kt-chat-container]");
  containers.forEach((container) => {
    if (shouldAutoScroll(container)) {
      scrollToBottom(container);
    }
  });
}`;

/**
 * サイドバートグルスクリプト
 */
const sidebarToggleScript = `
function initSidebarToggle() {
  const sidebar = document.querySelector(".kt-sidebar");
  // 初期化済み or サイドバーなしの場合はスキップ
  if (!sidebar || sidebar.dataset.ktSidebarInit) return;
  sidebar.dataset.ktSidebarInit = "true";

  const toggle = sidebar.querySelector(".kt-sidebar-toggle");
  const overlay = document.querySelector(".kt-sidebar-overlay");

  if (toggle) {
    toggle.addEventListener("click", () => {
      const currentState = sidebar.getAttribute("data-state");
      const newState = currentState === "expanded" ? "collapsed" : "expanded";
      sidebar.setAttribute("data-state", newState);
    });
  }

  if (overlay) {
    overlay.addEventListener("click", () => {
      sidebar.setAttribute("data-state", "collapsed");
    });
  }
}`;

/**
 * Toast自動消去スクリプト
 */
const toastScript = `
function initToasts() {
  const toasts = document.querySelectorAll(".kt-toast[data-duration]:not([data-toast-initialized])");
  toasts.forEach(function(toast) {
    toast.setAttribute("data-toast-initialized", "true");
    const duration = parseInt(toast.getAttribute("data-duration"), 10) || 4000;
    toast.style.transition = "opacity 0.3s ease-out";
    setTimeout(function() {
      toast.style.opacity = "0";
      setTimeout(function() {
        toast.remove();
      }, 300);
    }, duration);
  });
}`;

/**
 * イベント処理スクリプト（デバウンス付き、IME対応）
 */
const eventHandlingScript = `
const debounceTimers = new Map();
const DEBOUNCE_DELAY = 50;
let isComposing = false;

function sendEventDebounced(widgetId, value, sendFn) {
  const existingTimer = debounceTimers.get(widgetId);
  if (existingTimer) clearTimeout(existingTimer);
  const timer = setTimeout(() => {
    sendFn(widgetId, value);
    debounceTimers.delete(widgetId);
  }, DEBOUNCE_DELAY);
  debounceTimers.set(widgetId, timer);
}

// File upload handling
const FILE_UPLOAD_DEFAULT_MAX_SIZE = 200 * 1024 * 1024;
const FILE_UPLOAD_CHUNK_SIZE = 1 * 1024 * 1024;
const CHUNK_UPLOAD_THRESHOLD = 10 * 1024 * 1024; // 10MB

function shouldUseChunkedUpload(fileSize) {
  return fileSize > CHUNK_UPLOAD_THRESHOLD;
}

function generateUploadId() {
  return 'upload-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

function arrayBufferToBase64(buffer) {
  if (buffer.byteLength === 0) return "";
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function getMaxFileSize(element) {
  const maxSizeStr = element.dataset && element.dataset.maxSize;
  if (!maxSizeStr) return FILE_UPLOAD_DEFAULT_MAX_SIZE;
  const maxSize = parseInt(maxSizeStr, 10);
  if (isNaN(maxSize) || maxSize <= 0) return FILE_UPLOAD_DEFAULT_MAX_SIZE;
  return maxSize;
}

function validateFileSize(fileSize, maxSize) {
  if (fileSize > maxSize) {
    const fileSizeMB = (fileSize / (1024 * 1024)).toFixed(2);
    const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(2);
    return { valid: false, error: "File size (" + fileSizeMB + "MB) exceeds maximum allowed size (" + maxSizeMB + "MB)" };
  }
  return { valid: true };
}

function validateFileType(filename, mimeType, accept) {
  if (!accept) return { valid: true };
  const acceptTypes = accept.split(",").map(function(t) { return t.trim().toLowerCase(); });
  const lowerFilename = filename.toLowerCase();
  const lowerMime = mimeType.toLowerCase();
  for (let i = 0; i < acceptTypes.length; i++) {
    const acceptType = acceptTypes[i];
    if (acceptType.startsWith(".") && lowerFilename.endsWith(acceptType)) return { valid: true };
    if (acceptType.endsWith("/*")) {
      const category = acceptType.slice(0, -2);
      if (lowerMime.startsWith(category + "/")) return { valid: true };
    }
    if (lowerMime === acceptType) return { valid: true };
  }
  return { valid: false, error: 'File type "' + mimeType + '" is not allowed. Accepted types: ' + accept };
}

// Progress UI functions
function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + " GB";
}

function getWidgetContainer(widgetId) {
  return document.getElementById(widgetId + "-container");
}

function updateUploadProgress(widgetId, percent, uploadedBytes, totalBytes) {
  const container = getWidgetContainer(widgetId);
  if (!container) return;

  const progressDiv = container.querySelector(".kt-file-uploader-progress");
  const fill = container.querySelector(".kt-progress-fill");
  const percentText = container.querySelector(".kt-progress-percent");
  const sizeText = container.querySelector(".kt-progress-size");

  if (progressDiv) progressDiv.style.display = "block";
  if (fill) {
    fill.style.width = percent + "%";
    fill.classList.remove("indeterminate");
  }
  if (percentText) percentText.textContent = Math.round(percent) + "%";
  if (sizeText) sizeText.textContent = formatBytes(uploadedBytes) + " / " + formatBytes(totalBytes);
}

function showUploadIndeterminate(widgetId) {
  const container = getWidgetContainer(widgetId);
  if (!container) return;

  const progressDiv = container.querySelector(".kt-file-uploader-progress");
  const fill = container.querySelector(".kt-progress-fill");
  const percentText = container.querySelector(".kt-progress-percent");

  if (progressDiv) progressDiv.style.display = "block";
  if (fill) fill.classList.add("indeterminate");
  if (percentText) percentText.textContent = "Processing...";
}

function hideUploadProgress(widgetId) {
  const container = getWidgetContainer(widgetId);
  if (!container) return;

  const progressDiv = container.querySelector(".kt-file-uploader-progress");
  if (progressDiv) progressDiv.style.display = "none";
}

function showUploadComplete(widgetId, filename, uploadId) {
  const container = getWidgetContainer(widgetId);
  if (!container) return;

  hideUploadProgress(widgetId);

  const completeDiv = container.querySelector(".kt-file-uploader-complete");
  if (completeDiv) {
    completeDiv.style.display = "flex";
    const filenameSpan = completeDiv.querySelector(".kt-file-name");
    if (filenameSpan) filenameSpan.textContent = filename;
    const removeBtn = completeDiv.querySelector(".kt-file-remove");
    if (removeBtn) removeBtn.dataset.uploadId = uploadId;
  }

  container.classList.add("kt-upload-complete");
}

function hideUploadError(widgetId) {
  const container = getWidgetContainer(widgetId);
  if (!container) return;

  const errorDiv = container.querySelector(".kt-file-uploader-error");
  if (errorDiv) errorDiv.style.display = "none";
}

// Map to track pending uploads for completion handling
const pendingUploads = new Map();

// Map to track pending chunk uploads { uploadId -> { widgetId, filename, totalChunks, receivedChunks, resolve, reject } }
const pendingChunkUploads = new Map();

// Handle chunked upload for large files
function handleChunkedUpload(widgetId, file, data) {
  return new Promise(function(resolve, reject) {
    const uploadId = generateUploadId();
    const totalChunks = Math.ceil(data.byteLength / FILE_UPLOAD_CHUNK_SIZE);
    const mimeType = file.type || "application/octet-stream";

    // Store pending chunk upload info
    pendingChunkUploads.set(uploadId, {
      widgetId: widgetId,
      filename: file.name,
      totalChunks: totalChunks,
      receivedChunks: 0,
      resolve: resolve,
      reject: reject
    });

    // Send start message
    const startMessage = {
      type: "chunk_upload_start",
      widgetId: widgetId,
      uploadId: uploadId,
      filename: file.name,
      mimeType: mimeType,
      totalSize: file.size,
      totalChunks: totalChunks,
      chunkSize: FILE_UPLOAD_CHUNK_SIZE,
      sessionId: sessionId
    };

    if (!ws || ws.readyState !== WebSocket.OPEN) {
      pendingChunkUploads.delete(uploadId);
      reject(new Error("WebSocket not connected"));
      return;
    }

    ws.send(JSON.stringify(startMessage));

    // Send chunks
    const bytes = new Uint8Array(data);
    let chunkIndex = 0;

    function sendNextChunk() {
      if (chunkIndex >= totalChunks) {
        // Send end message
        const endMessage = {
          type: "chunk_upload_end",
          uploadId: uploadId
        };
        ws.send(JSON.stringify(endMessage));
        return;
      }

      const start = chunkIndex * FILE_UPLOAD_CHUNK_SIZE;
      const end = Math.min(start + FILE_UPLOAD_CHUNK_SIZE, bytes.length);
      const chunk = bytes.slice(start, end);
      const base64Chunk = arrayBufferToBase64(chunk.buffer);

      const chunkMessage = {
        type: "chunk_upload_data",
        uploadId: uploadId,
        chunkIndex: chunkIndex,
        data: base64Chunk
      };

      ws.send(JSON.stringify(chunkMessage));

      // Update progress
      const progress = 50 + (chunkIndex + 1) / totalChunks * 40; // 50-90%
      const uploadedBytes = Math.min((chunkIndex + 1) * FILE_UPLOAD_CHUNK_SIZE, bytes.length);
      updateUploadProgress(widgetId, progress, uploadedBytes, bytes.length);

      chunkIndex++;

      // Send next chunk after a small delay to avoid overwhelming the connection
      setTimeout(sendNextChunk, 10);
    }

    // Start sending chunks
    sendNextChunk();
  });
}

// Handle chunk upload response from server
function handleChunkUploadResponse(msg) {
  const uploadId = msg.uploadId;
  const pending = pendingChunkUploads.get(uploadId);

  if (!pending) {
    console.warn("Received chunk response for unknown upload:", uploadId);
    return;
  }

  if (msg.status === "error") {
    hideUploadProgress(pending.widgetId);
    const container = getWidgetContainer(pending.widgetId);
    if (container) {
      const errorDiv = container.querySelector(".kt-file-uploader-error");
      if (errorDiv) {
        errorDiv.style.display = "block";
        errorDiv.textContent = msg.error ? msg.error.message : "Upload failed";
      }
    }
    pendingChunkUploads.delete(uploadId);
    pending.reject(new Error(msg.error ? msg.error.message : "Upload failed"));
    return;
  }

  if (msg.status === "chunk_received") {
    pending.receivedChunks++;
    // Progress is already updated when sending chunks
  }

  if (msg.status === "upload_complete") {
    showUploadComplete(pending.widgetId, pending.filename, msg.registeredUploadId);
    pendingChunkUploads.delete(uploadId);
    pending.resolve(msg.registeredUploadId);
  }
}

function handleFileUpload(inputElement) {
  const files = inputElement.files;
  if (!files || files.length === 0) return;

  const widgetId = inputElement.id;
  const maxSize = getMaxFileSize(inputElement);
  const accept = inputElement.accept || undefined;
  const multiple = inputElement.multiple;

  // Clear previous error
  hideUploadError(widgetId);

  // Process files
  const filesToProcess = multiple ? Array.from(files) : [files[0]];

  for (let i = 0; i < filesToProcess.length; i++) {
    const file = filesToProcess[i];

    // Validate size
    const sizeResult = validateFileSize(file.size, maxSize);
    if (!sizeResult.valid) {
      console.error("File upload error:", sizeResult.error);
      showUploadError(inputElement, sizeResult.error);
      continue;
    }

    // Validate type
    const typeResult = validateFileType(file.name, file.type, accept);
    if (!typeResult.valid) {
      console.error("File upload error:", typeResult.error);
      showUploadError(inputElement, typeResult.error);
      continue;
    }

    // Show initial progress
    updateUploadProgress(widgetId, 0, 0, file.size);

    // Read and send file
    const reader = new FileReader();

    // Track reading progress
    reader.onprogress = function(event) {
      if (event.lengthComputable) {
        const percent = (event.loaded / event.total) * 50; // Reading is 0-50%
        updateUploadProgress(widgetId, percent, event.loaded, event.total);
      }
    };

    reader.onload = function() {
      const data = reader.result;
      if (!(data instanceof ArrayBuffer)) {
        console.error("Failed to read file as ArrayBuffer");
        hideUploadProgress(widgetId);
        return;
      }

      // Check if we should use chunked upload for large files
      if (shouldUseChunkedUpload(file.size)) {
        // Use chunked upload for files > 10MB
        updateUploadProgress(widgetId, 50, file.size / 2, file.size);
        handleChunkedUpload(widgetId, file, data).catch(function(error) {
          console.error("Chunked upload failed:", error);
          hideUploadProgress(widgetId);
          showUploadError(inputElement, error.message || "Upload failed");
        });
        return;
      }

      // Show encoding progress (50-75%)
      updateUploadProgress(widgetId, 50, file.size / 2, file.size);

      const base64Data = arrayBufferToBase64(data);

      // Show sending progress (75-90%)
      updateUploadProgress(widgetId, 75, file.size * 0.75, file.size);

      const message = {
        type: "file_upload",
        widgetId: widgetId,
        filename: file.name,
        mimeType: file.type || "application/octet-stream",
        size: file.size,
        data: base64Data,
        isChunked: false,
        sessionId: sessionId
      };

      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
        // Show server processing (90%)
        updateUploadProgress(widgetId, 90, file.size * 0.9, file.size);
        // Store pending upload for completion handling
        pendingUploads.set(widgetId, { filename: file.name, size: file.size });
      } else {
        console.error("WebSocket not connected");
        hideUploadProgress(widgetId);
        showUploadError(inputElement, "Connection lost. Please try again.");
      }
    };

    reader.onerror = function() {
      console.error("Failed to read file:", reader.error);
      hideUploadProgress(widgetId);
      showUploadError(inputElement, "Failed to read file");
    };

    reader.readAsArrayBuffer(file);
  }
}

// Handle upload result from server
function handleUploadResult(msg) {
  const widgetId = msg.widgetId;
  const pending = pendingUploads.get(widgetId);

  if (msg.success && msg.uploadId) {
    const filename = pending ? pending.filename : "File";
    showUploadComplete(widgetId, filename, msg.uploadId);
    pendingUploads.delete(widgetId);
  } else if (msg.error) {
    hideUploadProgress(widgetId);
    const container = getWidgetContainer(widgetId);
    if (container) {
      const errorDiv = container.querySelector(".kt-file-uploader-error");
      if (errorDiv) {
        errorDiv.style.display = "block";
        errorDiv.textContent = msg.error.message || "Upload failed";
      }
    }
    pendingUploads.delete(widgetId);
  }
}

function showUploadError(inputElement, error) {
  const container = inputElement.closest(".kt-file-uploader-container");
  if (!container) return;

  let errorDiv = container.querySelector(".kt-file-uploader-error");
  if (!errorDiv) {
    errorDiv = document.createElement("div");
    errorDiv.className = "kt-file-uploader-error";
    errorDiv.style.cssText = "color:#dc3545;font-size:0.875rem;margin-top:4px;";
    container.appendChild(errorDiv);
  }
  errorDiv.textContent = error;

  // Clear error after 5 seconds
  setTimeout(function() {
    if (errorDiv.parentNode) {
      errorDiv.parentNode.removeChild(errorDiv);
    }
  }, 5000);
}

function setupEventDelegation(sendEvent) {
  const app = document.getElementById("app");

  app.addEventListener("click", (e) => {
    // コピーボタンのハンドリング
    const copyBtn = e.target.closest("[data-kt-copy]");
    if (copyBtn) {
      const codeBlock = copyBtn.closest(".kt-code");
      if (codeBlock && codeBlock.dataset.code) {
        const textToCopy = codeBlock.dataset.code
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&amp;/g, "&")
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'");
        navigator.clipboard.writeText(textToCopy).then(() => {
          const originalText = copyBtn.textContent;
          copyBtn.textContent = "Copied!";
          copyBtn.classList.add("kt-code-copy-success");
          setTimeout(() => {
            copyBtn.textContent = originalText;
            copyBtn.classList.remove("kt-code-copy-success");
          }, 2000);
        }).catch((err) => {
          console.error("Failed to copy code:", err);
        });
      }
      return;
    }

    // ダウンロードボタンのハンドリング（サーバーサイドストリーミング）
    const downloadUrlBtn = e.target.closest("[data-kt-download-url]");
    if (downloadUrlBtn) {
      const url = downloadUrlBtn.dataset.ktDownloadUrl;
      const filename = downloadUrlBtn.dataset.filename || "download";
      // Web標準 fetch API + Blob でストリーミングダウンロード
      fetch(url)
        .then((res) => {
          if (!res.ok) throw new Error("Download failed");
          return res.blob();
        })
        .then((blob) => {
          const blobUrl = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = blobUrl;
          a.download = filename;
          a.click();
          URL.revokeObjectURL(blobUrl);
        })
        .catch((err) => console.error("Download error:", err));
      return;
    }

    const target = e.target.closest("[data-kt-event='click']");
    if (target && target.id) sendEvent(target.id, "clicked");
  });

  app.addEventListener("compositionstart", () => {
    isComposing = true;
  });

  app.addEventListener("compositionend", (e) => {
    isComposing = false;
    const target = e.target;
    if (target.dataset && target.dataset.ktEvent === "input" && target.id) {
      const value = target.dataset.ktType === "number" ? Number(target.value) : target.value;
      sendEventDebounced(target.id, value, sendEvent);
    }
  });

  app.addEventListener("input", (e) => {
    if (isComposing) return;
    const target = e.target;
    if (target.dataset && target.dataset.ktEvent === "input" && target.id) {
      const value = target.dataset.ktType === "number" ? Number(target.value) : target.value;
      sendEventDebounced(target.id, value, sendEvent);
    }
  });

  app.addEventListener("change", (e) => {
    const target = e.target;
    if (!target.dataset || target.dataset.ktEvent !== "change") return;

    // File input handler
    if (target.type === "file" && target.id) {
      handleFileUpload(target);
      return;
    }

    // Checkbox with id (kt.checkbox, kt.toggle)
    if (target.type === "checkbox" && target.id) {
      sendEvent(target.id, target.checked);
      return;
    }

    // Radio button (uses name as widget ID)
    if (target.type === "radio" && target.name) {
      sendEvent(target.name, target.value);
      return;
    }

    // Checkbox without id but with name (multiselect)
    if (target.type === "checkbox" && target.name) {
      const checkboxes = document.querySelectorAll('input[type="checkbox"][name="' + target.name + '"]');
      const values = [];
      checkboxes.forEach((cb) => {
        if (cb.checked) values.push(cb.value);
      });
      sendEvent(target.name, values);
      return;
    }

    // Number input
    if (target.type === "number" && target.id) {
      sendEvent(target.id, Number(target.value));
      return;
    }

    // Default: send target.value with target.id
    if (target.id) {
      sendEvent(target.id, target.value);
    }
  });
}`;

/**
 * クライアントスクリプトを生成
 */
export function generateClientScript(config: ClientRuntimeConfig): string {
	const isBrowserScope = config.scope === "browser";

	// 設定値を注入
	const configScript = `
const __KT_CONFIG__ = ${JSON.stringify(config)};
const isBrowserScope = ${isBrowserScope};
`;

	// WebSocket接続とメッセージ処理
	const websocketScript = `
let ws = null;
let reconnectAttempts = 0;
let lastReceivedSeq = 0;
${isBrowserScope ? "let sessionId = null;" : "let sessionId = localStorage.getItem(__KT_CONFIG__.sessionKey);"}

function connect() {
  updateConnectionStatus("connecting", reconnectAttempts, __KT_CONFIG__.maxReconnectAttempts);
  const wsProtocol = location.protocol === "https:" ? "wss:" : "ws:";
  ws = new WebSocket(\`\${wsProtocol}//\${location.host}/ws\`);

  ws.onopen = () => {
    console.log("Connected to server");
    reconnectAttempts = 0;
    updateConnectionStatus("connected", reconnectAttempts, __KT_CONFIG__.maxReconnectAttempts);
    ${
			isBrowserScope
				? `ws.send(JSON.stringify({ type: "init", lastSeq: lastReceivedSeq || undefined }));`
				: `ws.send(JSON.stringify({ type: "init", sessionId, lastSeq: lastReceivedSeq || undefined }));`
		}
  };

  ws.onmessage = (e) => {
    let msg;
    try { msg = JSON.parse(e.data); }
    catch (err) { console.error("Failed to parse WebSocket message:", err); return; }

    if (msg.type === "ping") {
      ws.send(JSON.stringify({ type: "pong" }));
      return;
    }

    if (msg.type === "error") {
      console.error("Server error:", msg.error?.code, msg.error?.message);
      if (msg.error?.code === "SESSION_NOT_FOUND") {
        ${
					isBrowserScope
						? "ws.close(); location.reload();"
						: "localStorage.removeItem(__KT_CONFIG__.sessionKey); sessionId = null; ws.close(); connect();"
				}
      }
      if (msg.error?.code === "RATE_LIMITED") {
        console.warn("Rate limited, retry after:", msg.error?.retryAfter, "ms");
      }
      return;
    }

    ${
			isBrowserScope
				? ""
				: `if (msg.sessionId) {
      sessionId = msg.sessionId;
      localStorage.setItem(__KT_CONFIG__.sessionKey, sessionId);
    }`
		}

    if (msg.type === "patch" && msg.patches) {
      if (msg.seq !== undefined) lastReceivedSeq = msg.seq;
      const focusState = msg.partial ? null : saveFocusState();
      for (const patch of msg.patches) applyPatch(patch);
      if (focusState) {
        restoreFocusState(focusState, 0);
        requestAnimationFrame(() => restoreFocusState(focusState, 0));
      }
      // Initialize toasts after DOM update
      initToasts();
      // Auto-scroll chat containers
      initChatAutoScroll();
      autoScrollChat();
    }

    if (msg.type === "upload_result") {
      handleUploadResult(msg);
    }

    if (msg.type === "chunk_upload_response") {
      handleChunkUploadResponse(msg);
    }
  };

  ws.onclose = () => {
    console.log("Disconnected from server");
    updateConnectionStatus("disconnected", reconnectAttempts, __KT_CONFIG__.maxReconnectAttempts);
    scheduleReconnect();
  };

  ws.onerror = (error) => console.error("WebSocket error:", error);
}

function scheduleReconnect() {
  if (reconnectAttempts >= __KT_CONFIG__.maxReconnectAttempts) {
    console.error("Max reconnection attempts reached");
    updateConnectionStatus("disconnected", reconnectAttempts, __KT_CONFIG__.maxReconnectAttempts);
    return;
  }
  reconnectAttempts++;
  const delay = Math.min(
    __KT_CONFIG__.baseReconnectDelay * Math.pow(2, reconnectAttempts - 1),
    __KT_CONFIG__.maxReconnectDelay
  );
  console.log("Reconnecting in " + delay + "ms (attempt " + reconnectAttempts + ")");
  updateConnectionStatus("reconnecting", reconnectAttempts, __KT_CONFIG__.maxReconnectAttempts);
  setTimeout(connect, delay);
}

window.sendEvent = (widgetId, value) => {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ${isBrowserScope ? `ws.send(JSON.stringify({ type: "event", widgetId, value }));` : `ws.send(JSON.stringify({ type: "event", widgetId, value, sessionId }));`}
  } else {
    console.warn("WebSocket not connected, event not sent");
  }
};

// 初期化
connect();
setupEventDelegation(window.sendEvent);
initSidebarToggle();
`;

	return [
		configScript,
		connectionIndicatorScript,
		focusManagementScript,
		xssDetectionScript,
		patchApplyScript,
		chatAutoScrollScript,
		sidebarToggleScript,
		toastScript,
		eventHandlingScript,
		websocketScript,
	].join("\n");
}
