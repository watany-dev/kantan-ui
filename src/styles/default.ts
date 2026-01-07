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
	formStyles,
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
	formStyles,
};
