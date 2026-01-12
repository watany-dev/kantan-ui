/**
 * デフォルトスタイル定義
 *
 * kantan-ui コンポーネントの基本スタイルを提供
 */

/** ベーススタイル（フォーム要素、レイアウト） */
const baseStyles = `
  /* Layout */
  .kt-layout-centered { max-width: 800px; margin: 0 auto; padding: 0 1rem; }
  .kt-layout-wide { width: 100%; padding: 0 1rem; }

  /* Button */
  .kt-button { padding: 8px 16px; cursor: pointer; }

  /* Slider */
  .kt-slider-container { margin: 10px 0; }
  .kt-slider-label { display: block; margin-bottom: 4px; }
  .kt-slider { width: 200px; }

  /* Text Input */
  .kt-text-input-container { margin: 10px 0; }
  .kt-text-input-label { display: block; margin-bottom: 4px; }
  .kt-text-input { padding: 8px; width: 200px; }

  /* Selectbox */
  .kt-selectbox-container { margin: 10px 0; }
  .kt-selectbox-label { display: block; margin-bottom: 4px; }
  .kt-selectbox { padding: 8px; }
`;

/** アラートスタイル */
const alertStyles = `
  /* Alert Base */
  .kt-alert {
    padding: 0.75rem 1rem;
    border-radius: 4px;
    margin: 0.5rem 0;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  /* Alert Types */
  .kt-alert-success { background: #d4edda; border: 1px solid #c3e6cb; color: #155724; }
  .kt-alert-error { background: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; }
  .kt-alert-warning { background: #fff3cd; border: 1px solid #ffeeba; color: #856404; }
  .kt-alert-info { background: #d1ecf1; border: 1px solid #bee5eb; color: #0c5460; }
`;

/** JSONビューワースタイル */
const jsonStyles = `
  /* JSON Viewer */
  .kt-json { font-family: monospace; font-size: 0.875rem; line-height: 1.4; }
  .kt-json details { margin-left: 1rem; }
  .kt-json details > summary { cursor: pointer; list-style: none; }
  .kt-json details > summary::-webkit-details-marker { display: none; }
  .kt-json details > summary::before { content: '▶ '; }
  .kt-json details[open] > summary::before { content: '▼ '; }
  .kt-json-null { color: #6c757d; }
  .kt-json-boolean { color: #d63384; }
  .kt-json-number { color: #0d6efd; }
  .kt-json-string { color: #198754; }
  .kt-json-key { color: #6f42c1; }
  .kt-json-item { margin-left: 1rem; }
`;

/** コードブロックスタイル */
const codeStyles = `
  /* Code Block */
  .kt-code {
    position: relative;
    margin: 0.5rem 0;
    background: #f8f9fa;
    border: 1px solid #e9ecef;
    border-radius: 4px;
    overflow: hidden;
  }
  .kt-code pre { margin: 0; padding: 1rem; overflow-x: auto; }
  .kt-code code { font-family: 'SF Mono', Monaco, Consolas, monospace; font-size: 0.875rem; }
  .kt-code-wrap pre { white-space: pre-wrap; word-wrap: break-word; }
  .kt-code-line-numbers {
    float: left;
    padding: 1rem 0.5rem 1rem 1rem;
    text-align: right;
    color: #6c757d;
    border-right: 1px solid #e9ecef;
    user-select: none;
  }
  .kt-code-line-numbers span { display: block; }
  .kt-code-content { display: block; }

  /* Copy Button */
  .kt-code-copy {
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    padding: 4px 8px;
    font-size: 0.75rem;
    background: #fff;
    border: 1px solid #e9ecef;
    border-radius: 4px;
    cursor: pointer;
    opacity: 0.7;
    transition: opacity 0.2s, background 0.2s;
  }
  .kt-code-copy:hover { opacity: 1; background: #f8f9fa; }
  .kt-code-copy-success { background: #d4edda; border-color: #c3e6cb; color: #155724; }

  /* Syntax Highlighting */
  .kt-hl-keyword { color: #d73a49; }
  .kt-hl-string { color: #032f62; }
  .kt-hl-number { color: #005cc5; }
  .kt-hl-comment { color: #6a737d; font-style: italic; }
  .kt-hl-function { color: #6f42c1; }
  .kt-hl-operator { color: #d73a49; }
  .kt-hl-punctuation { color: #24292e; }
  .kt-hl-type { color: #22863a; }
  .kt-hl-tag { color: #22863a; }
  .kt-hl-attribute { color: #6f42c1; }
  .kt-hl-value { color: #032f62; }
  .kt-hl-selector { color: #6f42c1; }
  .kt-hl-property { color: #005cc5; }
`;

/** Markdownスタイル */
const markdownStyles = `
  /* Markdown */
  .kt-markdown { line-height: 1.6; }
  .kt-markdown h1 {
    font-size: 2rem;
    margin: 1rem 0 0.5rem;
    border-bottom: 1px solid #e9ecef;
    padding-bottom: 0.3rem;
  }
  .kt-markdown h2 {
    font-size: 1.5rem;
    margin: 1rem 0 0.5rem;
    border-bottom: 1px solid #e9ecef;
    padding-bottom: 0.3rem;
  }
  .kt-markdown h3 { font-size: 1.25rem; margin: 1rem 0 0.5rem; }
  .kt-markdown h4, .kt-markdown h5, .kt-markdown h6 { font-size: 1rem; margin: 1rem 0 0.5rem; }
  .kt-markdown p { margin: 0.5rem 0; }
  .kt-markdown code {
    background: #f1f3f5;
    padding: 0.125rem 0.25rem;
    border-radius: 3px;
    font-family: monospace;
    font-size: 0.875em;
  }
  .kt-markdown pre {
    background: #f8f9fa;
    border: 1px solid #e9ecef;
    border-radius: 4px;
    padding: 1rem;
    overflow-x: auto;
  }
  .kt-markdown pre code { background: none; padding: 0; }
  .kt-markdown blockquote {
    border-left: 4px solid #e9ecef;
    margin: 0.5rem 0;
    padding: 0.5rem 1rem;
    color: #6c757d;
  }
  .kt-markdown ul, .kt-markdown ol { margin: 0.5rem 0; padding-left: 2rem; }
  .kt-markdown li { margin: 0.25rem 0; }
  .kt-markdown a { color: #0d6efd; text-decoration: none; }
  .kt-markdown a:hover { text-decoration: underline; }
  .kt-markdown img { max-width: 100%; height: auto; }
  .kt-markdown hr { border: none; border-top: 1px solid #e9ecef; margin: 1rem 0; }
`;

/** フィードバックスタイル（Progress, Spinner, Toast） */
const feedbackStyles = `
  /* Progress Bar */
  .kt-progress { margin: 0.5rem 0; }
  .kt-progress-label { margin-bottom: 0.25rem; font-size: 0.875rem; }
  .kt-progress-bar {
    background: #e0e0e0;
    border-radius: 4px;
    height: 8px;
    overflow: hidden;
  }
  .kt-progress-fill {
    height: 100%;
    transition: width 0.3s ease;
  }
  .kt-progress-animated {
    background-image: linear-gradient(
      45deg,
      rgba(255, 255, 255, 0.15) 25%,
      transparent 25%,
      transparent 50%,
      rgba(255, 255, 255, 0.15) 50%,
      rgba(255, 255, 255, 0.15) 75%,
      transparent 75%,
      transparent
    );
    background-size: 1rem 1rem;
    animation: kt-progress-stripes 1s linear infinite;
  }
  @keyframes kt-progress-stripes {
    from { background-position: 1rem 0; }
    to { background-position: 0 0; }
  }

  /* Spinner */
  .kt-spinner {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin: 0.5rem 0;
  }
  .kt-spinner-icon {
    border: 2px solid #e0e0e0;
    border-top-color: #3498db;
    border-radius: 50%;
    animation: kt-spin 1s linear infinite;
  }
  @keyframes kt-spin { to { transform: rotate(360deg); } }

  /* Toast */
  .kt-toast {
    padding: 12px 16px;
    border-radius: 4px;
    margin: 8px 0;
    display: flex;
    align-items: center;
  }
  .kt-toast-icon { margin-right: 8px; }
  .kt-toast-success { background: #d4edda; border: 1px solid #c3e6cb; }
  .kt-toast-info { background: #d1ecf1; border: 1px solid #bee5eb; }
  .kt-toast-warning { background: #fff3cd; border: 1px solid #ffeeba; }
  .kt-toast-error { background: #f8d7da; border: 1px solid #f5c6cb; }
`;

/** レイアウトスタイル（Columns, Expander, Container） */
const layoutStyles = `
  /* Columns */
  .kt-columns { display: flex; }
  .kt-column { min-width: 0; }

  /* Responsive Columns */
  @media (max-width: 768px) {
    .kt-columns-responsive { flex-direction: column; }
    .kt-columns-responsive .kt-column { flex: 0 0 100% !important; }
  }

  /* Expander */
  .kt-expander {
    border: 1px solid #e9ecef;
    border-radius: 4px;
    margin: 0.5rem 0;
  }
  .kt-expander-header {
    padding: 0.75rem 1rem;
    cursor: pointer;
    background: #f8f9fa;
    border-radius: 4px;
  }
  .kt-expander[open] .kt-expander-header {
    border-bottom: 1px solid #e9ecef;
    border-radius: 4px 4px 0 0;
  }
  .kt-expander-content { padding: 1rem; }

  /* Container */
  .kt-container { margin: 0.5rem 0; }

  /* Tabs */
  .kt-tabs { margin: 0.5rem 0; }
  .kt-tabs-header {
    display: flex;
    border-bottom: 1px solid #e9ecef;
  }
  .kt-tab {
    padding: 0.5rem 1rem;
    border: none;
    background: none;
    cursor: pointer;
    border-bottom: 2px solid transparent;
  }
  .kt-tab:hover { background: #f8f9fa; }
  .kt-tab-active {
    border-bottom-color: #0d6efd;
    color: #0d6efd;
  }
  .kt-tab-panel { padding: 1rem 0; }
`;

/** テーブルスタイル */
const tableStyles = `
  /* Table */
  .kt-table {
    width: 100%;
    border-collapse: collapse;
    margin: 0.5rem 0;
    font-size: 0.875rem;
  }
  .kt-table th,
  .kt-table td {
    padding: 0.5rem 0.75rem;
    text-align: left;
    border-bottom: 1px solid #e9ecef;
  }
  .kt-table th {
    background: #f8f9fa;
    font-weight: 600;
    border-bottom: 2px solid #dee2e6;
  }
  .kt-table tbody tr:hover {
    background: #f8f9fa;
  }
`;

/** チャットスタイル */
const chatStyles = `
  /* Chat Message */
  .kt-chat-message {
    display: flex;
    gap: 0.75rem;
    margin: 0.5rem 0;
    padding: 0.75rem;
    border-radius: 8px;
  }

  /* Role-based styling */
  .kt-chat-message-user {
    background: #f0f4f8;
    flex-direction: row-reverse;
  }
  .kt-chat-message-assistant {
    background: #ffffff;
    border: 1px solid #e9ecef;
  }
  .kt-chat-message-system {
    background: #fff8e6;
    border: 1px solid #ffeeba;
    font-style: italic;
  }

  /* Avatar */
  .kt-chat-avatar {
    flex-shrink: 0;
    width: 2rem;
    height: 2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.25rem;
    background: #e9ecef;
    border-radius: 50%;
  }
  .kt-chat-message-user .kt-chat-avatar {
    background: #d1e7dd;
  }
  .kt-chat-message-assistant .kt-chat-avatar {
    background: #cfe2ff;
  }
  .kt-chat-message-system .kt-chat-avatar {
    background: #fff3cd;
  }

  /* Body */
  .kt-chat-body {
    flex: 1;
    min-width: 0;
  }
  .kt-chat-message-user .kt-chat-body {
    text-align: right;
  }

  /* Name */
  .kt-chat-name {
    font-weight: 600;
    font-size: 0.875rem;
    margin-bottom: 0.25rem;
    color: #495057;
  }

  /* Content */
  .kt-chat-content {
    line-height: 1.5;
  }
  .kt-chat-content p {
    margin: 0 0 0.5rem;
  }
  .kt-chat-content p:last-child {
    margin-bottom: 0;
  }
  .kt-chat-content code {
    background: #f1f3f5;
    padding: 0.125rem 0.25rem;
    border-radius: 3px;
    font-family: monospace;
    font-size: 0.875em;
  }
  .kt-chat-content pre {
    background: #f8f9fa;
    border: 1px solid #e9ecef;
    border-radius: 4px;
    padding: 0.75rem;
    overflow-x: auto;
    margin: 0.5rem 0;
  }
  .kt-chat-content pre code {
    background: none;
    padding: 0;
  }

  /* Chat Input */
  .kt-chat-input-wrapper {
    width: 100%;
    background: #ffffff;
    padding: 0.75rem;
    border-top: 1px solid #e9ecef;
    box-sizing: border-box;
  }

  .kt-chat-input-pinned {
    position: sticky;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 100;
    box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.05);
  }

  .kt-chat-input-container {
    display: flex;
    gap: 0.5rem;
    align-items: flex-end;
    max-width: 800px;
    margin: 0 auto;
  }

  .kt-chat-input-field {
    flex: 1;
    min-height: 44px;
    max-height: 200px;
    padding: 0.625rem 0.75rem;
    border: 1px solid #ced4da;
    border-radius: 22px;
    font-family: inherit;
    font-size: 1rem;
    line-height: 1.5;
    resize: none;
    overflow-y: auto;
    box-sizing: border-box;
  }

  .kt-chat-input-field:focus {
    outline: none;
    border-color: #4a90d9;
    box-shadow: 0 0 0 2px rgba(74, 144, 217, 0.2);
  }

  .kt-chat-input-field:disabled {
    background: #f8f9fa;
    color: #6c757d;
    cursor: not-allowed;
  }

  .kt-chat-input-field::placeholder {
    color: #adb5bd;
  }

  .kt-chat-input-submit {
    flex-shrink: 0;
    height: 44px;
    min-width: 44px;
    padding: 0 1.25rem;
    background: #4a90d9;
    color: white;
    border: none;
    border-radius: 22px;
    font-family: inherit;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.15s ease;
  }

  .kt-chat-input-submit:hover:not(:disabled) {
    background: #357abd;
  }

  .kt-chat-input-submit:focus {
    outline: none;
    box-shadow: 0 0 0 2px rgba(74, 144, 217, 0.4);
  }

  .kt-chat-input-submit:disabled {
    background: #adb5bd;
    cursor: not-allowed;
  }

  @media (max-width: 640px) {
    .kt-chat-input-wrapper {
      padding: 0.5rem;
    }

    .kt-chat-input-container {
      gap: 0.375rem;
    }

    .kt-chat-input-field {
      padding: 0.5rem 0.625rem;
      font-size: 16px;
    }

    .kt-chat-input-submit {
      padding: 0 0.75rem;
      font-size: 0.8125rem;
    }
  }
`;

/** サイドバースタイル */
const sidebarStyles = `
  /* CSS変数（サイドバー用） */
  :root {
    --kt-sidebar-width: 280px;
    --kt-sidebar-bg: #f8f9fa;
    --kt-sidebar-border-color: #e9ecef;
    --kt-sidebar-z-index: 100;
    --kt-sidebar-toggle-z-index: 101;
    --kt-sidebar-overlay-z-index: 99;
  }

  /* サイドバーレイアウトコンテナ */
  .kt-layout-sidebar {
    display: flex;
    min-height: 100vh;
  }

  /* サイドバー */
  .kt-sidebar {
    position: relative;
    flex: 0 0 var(--kt-sidebar-width);
    background: var(--kt-sidebar-bg);
    border-right: 1px solid var(--kt-sidebar-border-color);
    display: flex;
    flex-direction: column;
    height: 100vh;
    overflow-y: auto;
    transition: flex-basis 0.3s ease;
  }

  .kt-sidebar[data-state="collapsed"] {
    flex-basis: 0;
    overflow: visible;
    pointer-events: none;
  }

  .kt-sidebar[data-state="collapsed"] .kt-sidebar-content {
    display: none;
  }

  .kt-sidebar[data-state="collapsed"] .kt-sidebar-toggle {
    pointer-events: auto;
  }

  /* サイドバーコンテンツ */
  .kt-sidebar-content {
    padding: 1rem;
    flex: 1;
  }

  /* サイドバートグルボタン */
  .kt-sidebar-toggle {
    position: absolute;
    top: 1rem;
    right: -12px;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: white;
    border: 1px solid var(--kt-sidebar-border-color);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: var(--kt-sidebar-toggle-z-index);
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }

  .kt-sidebar[data-state="collapsed"] .kt-sidebar-toggle {
    right: -36px;
  }

  .kt-sidebar-toggle:hover {
    background: var(--kt-sidebar-bg);
  }

  .kt-sidebar-toggle-icon {
    width: 6px;
    height: 6px;
    border-left: 2px solid #495057;
    border-bottom: 2px solid #495057;
    transform: rotate(45deg);
    transition: transform 0.2s;
  }

  .kt-sidebar[data-state="collapsed"] .kt-sidebar-toggle-icon {
    transform: rotate(-135deg);
  }

  /* メインエリア（サイドバーレイアウト時） */
  .kt-layout-sidebar .kt-main {
    flex: 1;
    padding: 0 1rem;
    min-width: 0;
  }

  /* レスポンシブ対応 */
  @media (max-width: 768px) {
    .kt-sidebar {
      position: fixed;
      left: 0;
      top: 0;
      flex-basis: var(--kt-sidebar-width);
      z-index: var(--kt-sidebar-z-index);
      box-shadow: 2px 0 8px rgba(0,0,0,0.15);
    }

    .kt-sidebar[data-state="collapsed"] {
      transform: translateX(-100%);
      flex-basis: var(--kt-sidebar-width);
    }

    .kt-sidebar-toggle {
      right: -40px;
      width: 40px;
      height: 40px;
      border-radius: 0 4px 4px 0;
    }

    /* オーバーレイ */
    .kt-sidebar-overlay {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.5);
      z-index: var(--kt-sidebar-overlay-z-index);
    }

    .kt-sidebar:not([data-state="collapsed"]) ~ .kt-sidebar-overlay {
      display: block;
    }

    .kt-layout-sidebar .kt-main {
      width: 100%;
    }
  }
`;

/** 画像スタイル */
const imageStyles = `
  /* Image */
  .kt-image {
    margin: 0;
    padding: 0;
    display: inline-block;
    max-width: 100%;
  }

  .kt-image-img {
    display: block;
    width: var(--kt-image-width, auto);
    max-width: 100%;
    height: auto;
    border-radius: 4px;
  }

  .kt-image-caption {
    margin-top: 0.5rem;
    font-size: 0.875rem;
    color: var(--kt-text-secondary, #6b7280);
    text-align: center;
  }

  /* Container width */
  .kt-image-container-width {
    display: block;
    width: 100%;
  }

  .kt-image-container-width .kt-image-img {
    width: 100%;
  }

  /* Gallery (multiple images) */
  .kt-image-gallery {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    align-items: flex-start;
  }

  .kt-image-gallery .kt-image {
    flex: 0 0 auto;
  }
`;

/** メトリクススタイル */
const metricStyles = `
  /* Metric */
  .kt-metric {
    padding: 1rem;
    border-radius: 0.5rem;
    background: #f8f9fa;
    margin: 0.5rem 0;
  }

  /* Label */
  .kt-metric-label {
    font-size: 0.875rem;
    color: #6c757d;
    margin-bottom: 0.25rem;
  }

  /* Value */
  .kt-metric-value {
    font-size: 2rem;
    font-weight: 600;
    color: #212529;
    line-height: 1.2;
  }

  /* Delta container */
  .kt-metric-delta {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.875rem;
    margin-top: 0.25rem;
  }

  /* Delta colors */
  .kt-metric-delta-positive {
    color: #28a745;
  }

  .kt-metric-delta-negative {
    color: #dc3545;
  }

  .kt-metric-delta-neutral {
    color: #6c757d;
  }

  /* Delta icon */
  .kt-metric-delta-icon {
    font-size: 0.75rem;
  }

  /* Help tooltip */
  .kt-metric-help {
    display: inline-block;
    margin-left: 0.25rem;
    cursor: help;
    color: #6c757d;
    font-size: 0.75rem;
    width: 1rem;
    height: 1rem;
    line-height: 1rem;
    text-align: center;
    border-radius: 50%;
    background: #e9ecef;
  }

  /* Screen reader only */
  .kt-sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
`;

/** フォームスタイル */
const formStyles = `
  /* Form */
  .kt-form { margin: 0.5rem 0; }
  .kt-form-submit {
    padding: 8px 16px;
    cursor: pointer;
    background: #0d6efd;
    color: white;
    border: none;
    border-radius: 4px;
  }
  .kt-form-submit:hover { background: #0b5ed7; }
  .kt-form-submit:disabled {
    background: #6c757d;
    cursor: not-allowed;
  }

  /* Validation Errors */
  .kt-validation-error {
    color: #721c24;
    background: #f8d7da;
    border: 1px solid #f5c6cb;
    padding: 0.5rem 0.75rem;
    border-radius: 4px;
    margin: 0.5rem 0;
    font-size: 0.875rem;
  }
  .kt-validation-errors {
    color: #721c24;
    background: #f8d7da;
    border: 1px solid #f5c6cb;
    padding: 0.5rem 0.75rem;
    border-radius: 4px;
    margin: 0.5rem 0;
    font-size: 0.875rem;
  }
  .kt-validation-errors ul {
    margin: 0;
    padding-left: 1.5rem;
  }
  .kt-validation-errors li {
    margin: 0.25rem 0;
  }
`;

/** Empty Placeholder Styles */
const emptyStyles = `
  /* Empty Placeholder Container */
  .kt-empty {
    display: contents;
  }

  /* Empty placeholder when truly empty */
  .kt-empty:empty {
    display: none;
  }

  /* Spinner in placeholder */
  .kt-spinner {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0;
  }

  .kt-spinner::before {
    content: "";
    width: 1rem;
    height: 1rem;
    border: 2px solid var(--kt-color-border, #dee2e6);
    border-top-color: var(--kt-color-primary, #0d6efd);
    border-radius: 50%;
    animation: kt-spin 0.8s linear infinite;
  }

  .kt-spinner-text {
    color: var(--kt-color-text, #212529);
  }

  @keyframes kt-spin {
    to { transform: rotate(360deg); }
  }

  /* Progress in placeholder */
  .kt-progress-container {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    margin: 0.5rem 0;
  }

  .kt-progress-text {
    font-size: 0.875rem;
    color: var(--kt-color-text-secondary, #6c757d);
  }

  .kt-progress {
    width: 100%;
    height: 0.5rem;
    border-radius: 0.25rem;
    appearance: none;
    background: var(--kt-color-border, #dee2e6);
  }

  .kt-progress::-webkit-progress-bar {
    background: var(--kt-color-border, #dee2e6);
    border-radius: 0.25rem;
  }

  .kt-progress::-webkit-progress-value {
    background: var(--kt-color-primary, #0d6efd);
    border-radius: 0.25rem;
    transition: width 0.2s ease;
  }

  .kt-progress::-moz-progress-bar {
    background: var(--kt-color-primary, #0d6efd);
    border-radius: 0.25rem;
  }
`;

/** ストリーミングスタイル（write_stream用） */
const streamStyles = `
  /* Stream Container */
  .kt-stream {
    margin: 0.5rem 0;
    line-height: 1.6;
  }

  /* Stream Content */
  .kt-stream-content {
    white-space: pre-wrap;
    word-wrap: break-word;
  }

  /* Blinking Cursor */
  .kt-stream-cursor {
    display: inline-block;
    width: 0.5em;
    height: 1.1em;
    vertical-align: text-bottom;
    background: var(--kt-color-text, #212529);
    margin-left: 2px;
    animation: kt-cursor-blink 1s step-end infinite;
  }

  @keyframes kt-cursor-blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0; }
  }

  /* Completed Stream (cursor removed) */
  .kt-stream-complete .kt-stream-content {
    /* Completed content styling if needed */
  }

  /* Markdown rendering in stream */
  .kt-stream[data-markdown="true"].kt-stream-complete .kt-stream-content {
    /* After markdown rendering */
  }

  .kt-stream[data-markdown="true"].kt-stream-complete .kt-stream-content h1,
  .kt-stream[data-markdown="true"].kt-stream-complete .kt-stream-content h2,
  .kt-stream[data-markdown="true"].kt-stream-complete .kt-stream-content h3 {
    margin-top: 0.5rem;
  }

  .kt-stream[data-markdown="true"].kt-stream-complete .kt-stream-content h1:first-child,
  .kt-stream[data-markdown="true"].kt-stream-complete .kt-stream-content h2:first-child,
  .kt-stream[data-markdown="true"].kt-stream-complete .kt-stream-content h3:first-child {
    margin-top: 0;
  }

  .kt-stream[data-markdown="true"].kt-stream-complete .kt-stream-content p {
    margin: 0.5rem 0;
  }

  .kt-stream[data-markdown="true"].kt-stream-complete .kt-stream-content p:first-child {
    margin-top: 0;
  }

  .kt-stream[data-markdown="true"].kt-stream-complete .kt-stream-content p:last-child {
    margin-bottom: 0;
  }

  .kt-stream[data-markdown="true"].kt-stream-complete .kt-stream-content code {
    background: #f1f3f5;
    padding: 0.125rem 0.25rem;
    border-radius: 3px;
    font-family: monospace;
    font-size: 0.875em;
  }

  .kt-stream[data-markdown="true"].kt-stream-complete .kt-stream-content pre {
    background: #f8f9fa;
    border: 1px solid #e9ecef;
    border-radius: 4px;
    padding: 0.75rem;
    overflow-x: auto;
    margin: 0.5rem 0;
  }

  .kt-stream[data-markdown="true"].kt-stream-complete .kt-stream-content pre code {
    background: none;
    padding: 0;
  }
`;

/** ファイルアップローダースタイル */
const fileUploaderStyles = `
  /* File Uploader Container */
  .kt-file-uploader-container {
    margin: 0.5rem 0;
    position: relative;
  }

  .kt-file-uploader-label {
    display: block;
    margin-bottom: 0.25rem;
    font-weight: 500;
  }

  .kt-file-uploader {
    padding: 0.5rem;
    border: 1px solid #e9ecef;
    border-radius: 4px;
    width: 100%;
    cursor: pointer;
  }

  .kt-file-uploader:hover {
    border-color: #adb5bd;
  }

  .kt-file-uploader:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .kt-file-uploader-help {
    margin-top: 0.25rem;
    font-size: 0.875rem;
    color: #6c757d;
  }

  /* Progress Indicator */
  .kt-file-uploader-progress {
    margin-top: 0.5rem;
    padding: 0.5rem;
    background: #f8f9fa;
    border-radius: 4px;
  }

  .kt-file-uploader-progress .kt-progress-bar {
    height: 6px;
    background: #e9ecef;
    border-radius: 3px;
    overflow: hidden;
  }

  .kt-file-uploader-progress .kt-progress-fill {
    height: 100%;
    background: #0d6efd;
    transition: width 0.2s ease;
  }

  .kt-file-uploader-progress .kt-progress-fill.indeterminate {
    width: 30% !important;
    animation: kt-progress-shimmer 1.5s infinite ease-in-out;
  }

  @keyframes kt-progress-shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(400%); }
  }

  .kt-file-uploader-progress .kt-progress-text {
    display: flex;
    justify-content: space-between;
    margin-top: 0.25rem;
    font-size: 0.75rem;
    color: #6c757d;
  }

  /* Complete Display */
  .kt-file-uploader-complete {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-top: 0.5rem;
    padding: 0.5rem 0.75rem;
    background: #d4edda;
    border: 1px solid #c3e6cb;
    border-radius: 4px;
    color: #155724;
  }

  .kt-file-uploader-complete .kt-file-name {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .kt-file-uploader-complete .kt-file-remove {
    padding: 0.125rem 0.375rem;
    background: transparent;
    border: 1px solid #c3e6cb;
    border-radius: 3px;
    cursor: pointer;
    font-size: 0.875rem;
    color: #155724;
    line-height: 1;
  }

  .kt-file-uploader-complete .kt-file-remove:hover {
    background: #c3e6cb;
  }

  /* Error Display */
  .kt-file-uploader-error {
    margin-top: 0.5rem;
    padding: 0.5rem 0.75rem;
    background: #f8d7da;
    border: 1px solid #f5c6cb;
    border-radius: 4px;
    color: #721c24;
    font-size: 0.875rem;
  }

  /* Upload Complete State */
  .kt-upload-complete .kt-file-uploader {
    border-color: #c3e6cb;
    background: #f8fff9;
  }
`;

/**
 * 全デフォルトスタイルを結合
 */
export const defaultStyles = [
	baseStyles,
	alertStyles,
	jsonStyles,
	codeStyles,
	markdownStyles,
	feedbackStyles,
	layoutStyles,
	tableStyles,
	chatStyles,
	sidebarStyles,
	imageStyles,
	metricStyles,
	formStyles,
	emptyStyles,
	streamStyles,
	fileUploaderStyles,
].join("\n");

/**
 * 個別スタイルをexport（必要に応じて使用）
 */
export {
	baseStyles,
	alertStyles,
	jsonStyles,
	codeStyles,
	markdownStyles,
	feedbackStyles,
	layoutStyles,
	sidebarStyles,
	imageStyles,
	formStyles,
};
