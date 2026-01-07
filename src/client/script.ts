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
 */
const xssDetectionScript = `
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
 */
const patchApplyScript = `
function applyPatch(patch) {
  switch (patch.type) {
    case "replaceRoot": {
      if (isUnsafeHtml(patch.html)) {
        console.error("Blocked potentially unsafe HTML content");
        return;
      }
      document.getElementById("app").innerHTML = patch.html;
      break;
    }
    case "replaceNode": {
      if (isUnsafeHtml(patch.html)) {
        console.error("Blocked potentially unsafe HTML content");
        return;
      }
      const el = document.getElementById(patch.id);
      if (el) {
        const temp = document.createElement("div");
        temp.innerHTML = patch.html;
        const newEl = temp.firstElementChild || temp.firstChild;
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
        const temp = document.createElement("div");
        temp.innerHTML = patch.html;
        const newEl = temp.firstElementChild || temp.firstChild;
        if (newEl) {
          if (patch.index >= 0 && patch.index < parent.children.length) {
            parent.insertBefore(newEl, parent.children[patch.index]);
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
        const temp = document.createElement("div");
        temp.innerHTML = patch.html;
        while (temp.firstChild) {
          app.appendChild(temp.firstChild);
        }
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
${isBrowserScope ? "" : "let sessionId = localStorage.getItem(__KT_CONFIG__.sessionKey);"}

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
`;

	return [
		configScript,
		connectionIndicatorScript,
		focusManagementScript,
		xssDetectionScript,
		patchApplyScript,
		chatAutoScrollScript,
		toastScript,
		eventHandlingScript,
		websocketScript,
	].join("\n");
}
