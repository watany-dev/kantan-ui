import { createApp } from "./app";
import { getContext } from "./runtime";
import { session_state } from "./session";

// デモスクリプト - Widget API と session_state を使用
const script = () => {
	const context = getContext();

	// カウンターの初期化
	if (session_state.counter === undefined) {
		session_state.counter = 0;
	}

	// 名前の初期化
	if (session_state.name === undefined) {
		session_state.name = "World";
	}

	// スライダー値の初期化
	if (session_state.sliderValue === undefined) {
		session_state.sliderValue = 50;
	}

	// カラーの初期化
	if (session_state.color === undefined) {
		session_state.color = "blue";
	}

	// ボタンイベント処理
	if (context?.event?.widgetId === "btn_inc") {
		session_state.counter = (session_state.counter as number) + 1;
	}
	if (context?.event?.widgetId === "btn_dec") {
		session_state.counter = Math.max(0, (session_state.counter as number) - 1);
	}
	if (context?.event?.widgetId === "btn_reset") {
		session_state.counter = 0;
	}

	// 入力値の更新
	if (context?.event?.widgetId === "name_input") {
		session_state.name = context.event.value as string;
	}
	if (context?.event?.widgetId === "slider") {
		session_state.sliderValue = context.event.value as number;
	}
	if (context?.event?.widgetId === "color_select") {
		session_state.color = context.event.value as string;
	}

	const name = session_state.name as string;
	const counter = session_state.counter as number;
	const sliderValue = session_state.sliderValue as number;
	const color = session_state.color as string;

	return `
    <div style="padding: 20px; font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: ${color};">Hello, ${escapeHtml(name)}!</h1>

      <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h2>Counter: ${counter}</h2>
        <div style="display: flex; gap: 10px;">
          <button id="btn_inc" onclick="sendEvent('btn_inc', 'clicked')" class="kt-button" style="background: #4CAF50; color: white; border: none;">
            + Increment
          </button>
          <button id="btn_dec" onclick="sendEvent('btn_dec', 'clicked')" class="kt-button" style="background: #f44336; color: white; border: none;">
            - Decrement
          </button>
          <button id="btn_reset" onclick="sendEvent('btn_reset', 'clicked')" class="kt-button" style="background: #9e9e9e; color: white; border: none;">
            Reset
          </button>
        </div>
      </div>

      <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3>Text Input</h3>
        <div class="kt-text-input-container">
          <label for="name_input" class="kt-text-input-label">Your Name:</label>
          <input
            type="text"
            id="name_input"
            value="${escapeHtml(name)}"
            oninput="sendEvent('name_input', this.value)"
            class="kt-text-input"
            style="padding: 8px; width: 200px; border: 1px solid #ccc; border-radius: 4px;"
          />
        </div>
      </div>

      <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3>Slider</h3>
        <div class="kt-slider-container">
          <label for="slider" class="kt-slider-label">Value: ${sliderValue}</label>
          <input
            type="range"
            id="slider"
            min="0"
            max="100"
            value="${sliderValue}"
            oninput="sendEvent('slider', Number(this.value))"
            class="kt-slider"
            style="width: 200px;"
          />
        </div>
        <div style="margin-top: 10px; height: 20px; background: linear-gradient(to right, #e0e0e0 0%, ${color} ${sliderValue}%, #e0e0e0 ${sliderValue}%); border-radius: 4px;"></div>
      </div>

      <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3>Selectbox</h3>
        <div class="kt-selectbox-container">
          <label for="color_select" class="kt-selectbox-label">Color Theme:</label>
          <select
            id="color_select"
            onchange="sendEvent('color_select', this.value)"
            class="kt-selectbox"
            style="padding: 8px; border: 1px solid #ccc; border-radius: 4px;"
          >
            <option value="blue" ${color === "blue" ? "selected" : ""}>Blue</option>
            <option value="green" ${color === "green" ? "selected" : ""}>Green</option>
            <option value="red" ${color === "red" ? "selected" : ""}>Red</option>
            <option value="purple" ${color === "purple" ? "selected" : ""}>Purple</option>
          </select>
        </div>
      </div>

      <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; margin-top: 20px;">
        <h4 style="margin: 0 0 10px 0;">Session State Debug</h4>
        <pre style="margin: 0; font-size: 12px; overflow-x: auto;">${escapeHtml(JSON.stringify({ counter, name, sliderValue, color }, null, 2))}</pre>
      </div>
    </div>
  `;
};

function escapeHtml(text: string): string {
	return text
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
}

const { app, websocket } = createApp(script);

export default {
	fetch: app.fetch,
	websocket,
};
