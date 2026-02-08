# kantan-ui

A Streamlit-style UI framework that depends only on Web standards and [Hono](https://hono.dev/).

## Features

- **Simple** - Declarative API like Streamlit (`kt.button()`, `kt.slider()`, etc.)
- **Real-time** - Instant UI updates via WebSocket with multi-tab sync support
- **Lightweight** - Depends only on Hono, supports multiple runtimes (Bun, Node.js, Deno)
- **Session Management** - Automatic state management for multiple users
- **Connection Stability** - Ping/Pong, auto-reconnect, sequence-based patch recovery
- **Streaming** - Progressive rendering for large UIs
- **Security** - Magic byte validation, polyglot detection, and XSS protection for file uploads

## Quick Start

### Requirements

- [Bun](https://bun.sh/) v1.0+ (recommended)
- Or Node.js v18+, Deno

### Installation

```bash
bun install
```

### Start Development Server

```bash
bun run dev
```

Open `http://localhost:3000` in your browser to see the demo app.

## Usage

### Basic App (Declarative API)

```typescript
import { createApp, kt, createTypedSessionState } from "kantan-ui";

// Define type-safe session state
type AppState = {
  count: number;
};

const state = createTypedSessionState<AppState>({
  count: 0,  // Default value
});

const script = () => {
  kt.title("Counter App");

  // Button returns true when clicked
  if (kt.button("+ Increment")) {
    state.count++;  // Type-safe! No type assertion needed
  }

  kt.write(`Count: ${state.count}`);

  // Return undefined when using declarative API
  return undefined;
};

// All runtimes: create app with await createApp
export default await createApp(script, { port: 3000 });
```

### Starting the Server

**Bun (Recommended)**

```bash
bun run src/index.ts
```

Bun automatically starts a server when `export default` returns an object with `fetch`/`websocket`/`port`.

**Node.js**

```typescript
import { createApp } from "kantan-ui";
import { serve } from "kantan-ui/serve";

const app = await createApp(script);
serve(app, { port: 3000 });
```

### kt API (Declarative API)

The `kt` object lets you build UI intuitively like Streamlit. Each function automatically outputs HTML and returns appropriate values.

#### Output API

```typescript
import { kt } from "kantan-ui";

kt.title("Title");           // <h1>
kt.header("Header");         // <h2>
kt.subheader("Subheader");   // <h3>
kt.write("Text");            // Text output
kt.text("Text");             // Alias for write
kt.divider();                // Horizontal rule <hr>
kt.html("<div>Raw HTML</div>"); // Raw HTML output (caution: XSS risk)
kt.markdown("**Bold** text");   // Markdown rendering
kt.caption("Small annotation text");  // Small caption text (supports Markdown)
kt.code("const x = 1;", "typescript"); // Code block with syntax highlighting
kt.json({ key: "value" });   // Collapsible JSON viewer

// Link button - opens URL in new tab
kt.link_button("Visit Docs", "https://docs.example.com");
kt.link_button("Disabled", "https://example.com", { disabled: true });
kt.link_button("Full Width", "https://example.com", { use_container_width: true });
```

#### Streaming API

Display text progressively from streaming sources (ideal for LLM responses).

```typescript
// AsyncGenerator (LLM-style streaming)
async function* generateResponse() {
  yield "Hello, ";
  await new Promise(r => setTimeout(r, 100));
  yield "World!";
}
const fullText = await kt.write_stream(generateResponse());

// Array (instant display)
await kt.write_stream(["Item 1, ", "Item 2, ", "Item 3"]);

// With Markdown rendering on completion
await kt.write_stream(["# Title\n", "\nThis is **bold** text."], {
  markdown: true,
});

// Custom CSS class
await kt.write_stream(chunks, { className: "my-stream" });

// ReadableStream (Web standard)
const stream = new ReadableStream<string>({
  start(controller) {
    controller.enqueue("Streaming...");
    controller.close();
  }
});
await kt.write_stream(stream);

// Response from fetch
const response = await fetch("/api/stream");
await kt.write_stream(response);
```

**Supported Sources:**
- `AsyncIterable<string>` - async generators, LLM streams
- `Iterable<string>` - arrays, iterators
- `ReadableStream<string>` - Web standard streams
- `Response` - fetch API responses
- Factory functions returning any of the above

**Options:**
- `markdown: boolean` - Render as Markdown when stream completes
- `className: string` - Custom CSS class for styling

**Features:**
- Blinking cursor during streaming
- Automatic cursor removal on completion
- XSS-safe text rendering
- Multiple concurrent streams supported

#### Alert API

```typescript
kt.success("Operation completed!");
kt.error("Something went wrong");
kt.warning("Please check your input");
kt.info("Here's some information");
```

#### Feedback API

```typescript
// Progress bar (0-1 or 0-100 auto-detected)
kt.progress(0.75);
kt.progress(75, { label: "Downloading..." });

// Loading spinner
kt.spinner("Processing...");

// Toast notification
kt.toast("Saved successfully!");
kt.toast("Error occurred", { type: "error" });
```

#### Data Display API

```typescript
// Table - supports various data formats
kt.table([
  { name: "Alice", age: 30 },
  { name: "Bob", age: 25 },
]);

// 2D array format
kt.table([
  ["Name", "Age"],
  ["Alice", 30],
  ["Bob", 25],
]);

// Explicit header specification
kt.table({
  columns: ["Name", "Age"],
  data: [["Alice", 30], ["Bob", 25]],
});

// Dataframe - interactive data table with sort, search, and row selection
kt.dataframe([
  { name: "Alice", age: 30, city: "Tokyo" },
  { name: "Bob", age: 25, city: "Osaka" },
]);

// With options
const selection = kt.dataframe(data, {
  height: 400,              // Container height in px
  hideIndex: true,           // Hide row index column
  columnOrder: ["city", "name"], // Reorder columns
  onSelect: "rerun",         // Enable row selection ("ignore" | "rerun")
  selectionMode: "multi-row", // "single-row" | "multi-row"
  key: "my_dataframe",
});

if (selection) {
  kt.write(`Selected rows: ${selection.rows.join(", ")}`);
}

// Metric - KPI display with optional delta
kt.metric("Revenue", "$1,234");
kt.metric("Revenue", "$1,234", { delta: "+12%" });
kt.metric("Response Time", "120ms", { delta: "+15ms", delta_color: "inverse" });
```

#### Page Config API

```typescript
// Page settings (title, layout, etc.)
kt.set_page_config({
  title: "My App",
  layout: "wide",  // "centered" | "wide"
  icon: "🚀",
});

// Force script re-execution
kt.rerun();
```

#### Widget API

```typescript
// Button - returns true when clicked
if (kt.button("Click me", { key: "my_button" })) {
  // Handle button click
}

// Slider - returns current value
const volume = kt.slider("Volume", 0, 100, 50, { key: "volume" });

// Text input - returns current input value
const name = kt.text_input("Your name", "Default", { key: "name" });

// Selectbox - returns selected value
const color = kt.selectbox("Color", ["Red", "Green", "Blue"], "Blue", { key: "color" });

// Download button - triggers file download
kt.download_button("Download CSV", "name,age\nAlice,30", "data.csv", {
  mime: "text/csv",
});

// Checkbox - returns boolean
const agreed = kt.checkbox("I agree", false, { key: "agree" });

// Toggle - returns boolean (switch style)
const darkMode = kt.toggle("Dark mode", false, { key: "dark_mode" });

// Radio buttons - returns selected value
const size = kt.radio("Size", ["S", "M", "L"], "M", { key: "size" });

// Number input - returns number
const age = kt.number_input("Age", 0, 120, 25, { key: "age", step: 1 });

// Text area - returns multiline text
const bio = kt.text_area("Bio", "Tell us about yourself...", { key: "bio" });

// Multiselect - returns array of selected values
const tags = kt.multiselect("Tags", ["Tech", "Design", "Business"], [], { key: "tags" });

// Date input - returns "YYYY-MM-DD" string
const birthday = kt.date_input("Birthday", "2000-01-15", {
  min: "1900-01-01",
  max: "2024-12-31",
});

// Time input - returns "HH:MM" string
const alarm = kt.time_input("Alarm", "08:30", { step: 60 });

// File uploader - returns UploadedFile object
const file = kt.file_uploader("Upload file", { accept: "image/*", maxSize: 5 * 1024 * 1024 });
if (file) {
  kt.write(`Uploaded: ${file.name} (${file.size} bytes)`);
  const content = file.text();  // or file.arrayBuffer()
}

// Multiple files
const files = kt.file_uploader("Upload files", { multiple: true });
for (const f of files) {
  kt.write(`${f.name}: ${f.type}`);
}

// Color picker - returns hex color string
const color = kt.color_picker("Pick a color", "#ff0000", { key: "color_pick" });
kt.write(`Selected: ${color}`);
```

#### Chart API

```typescript
// Simple number array
kt.line_chart([10, 20, 15, 30, 25]);

// Object array (auto-detects series)
kt.line_chart([
  { month: "Jan", sales: 100, profit: 50 },
  { month: "Feb", sales: 120, profit: 60 },
  { month: "Mar", sales: 150, profit: 80 },
]);

// With configuration
kt.line_chart(data, {
  x: "month",
  y: ["sales", "profit"],
  x_label: "Month",
  y_label: "Amount ($)",
  color: ["#ff6384", "#36a2eb"],
  height: 300,
});
```

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| data | `LineChartData` | - | Number array, object array, 2D array, or columnar format |
| config.x | `string` | auto | X-axis column name |
| config.y | `string \| string[]` | auto | Y-axis column name(s) |
| config.x_label | `string` | - | X-axis label |
| config.y_label | `string` | - | Y-axis label |
| config.color | `string \| string[]` | palette | Line color(s) in HEX |
| config.height | `number` | `400` | Chart height in pixels |
| config.use_container_width | `boolean` | `true` | Fit to container width |

```typescript
// Bar chart - simple number array
kt.bar_chart([10, 20, 15, 30, 25]);

// Key-value pairs
kt.bar_chart({ A: 10, B: 20, C: 30 });

// Multi-series with stacking (default)
kt.bar_chart([
  { month: "Jan", revenue: 100, cost: 50 },
  { month: "Feb", revenue: 120, cost: 60 },
], { x: "month" });

// Grouped bars (side by side)
kt.bar_chart(data, { x: "month", stack: false });

// Horizontal bars with sorting
kt.bar_chart(data, {
  x: "category",
  horizontal: true,
  sort: "descending",
  title: "Sales by Category",
});
```

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| data | `BarChartData` | - | Number array, key-value object, object array, 2D array, or columnar format |
| config.x | `string` | auto | Category column name |
| config.y | `string \| string[]` | auto | Value column name(s) |
| config.x_label | `string` | - | X-axis label |
| config.y_label | `string` | - | Y-axis label |
| config.color | `string \| string[]` | palette | Bar color(s) - Tableau 10 palette |
| config.height | `number` | `400` | Chart height in pixels |
| config.stack | `boolean` | `true` | Stack multiple series (false for grouped) |
| config.horizontal | `boolean` | `false` | Render horizontal bars |
| config.sort | `"ascending" \| "descending"` | - | Sort bars by value |
| config.title | `string` | - | Chart title |

```typescript
// Area chart - filled line chart for showing quantities over time
kt.area_chart([10, 20, 15, 30, 25]);

// Multi-series with overlay (default)
kt.area_chart([
  { month: "Jan", revenue: 100, cost: 50 },
  { month: "Feb", revenue: 120, cost: 60 },
], { x: "month" });

// Stacked area chart
kt.area_chart(data, { x: "month", stack: true });

// With custom colors and labels
kt.area_chart(data, {
  x: "month",
  y: ["revenue", "cost"],
  color: ["#FF000080", "#0000FF80"],
  x_label: "Month",
  y_label: "Amount ($)",
  title: "Revenue vs Cost",
});
```

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| data | `AreaChartData` | - | Number array, object array, 2D array, or columnar format |
| config.x | `string` | auto | X-axis column name |
| config.y | `string \| string[]` | auto | Y-axis column name(s) |
| config.x_label | `string` | - | X-axis label |
| config.y_label | `string` | - | Y-axis label |
| config.color | `string \| string[]` | palette | Area color(s) - Tableau 10 palette |
| config.height | `number` | `400` | Chart height in pixels |
| config.stack | `boolean` | `false` | Stack multiple series (false for overlay) |
| config.use_container_width | `boolean` | `true` | Fit to container width |
| config.title | `string` | - | Chart title |

#### Media API

```typescript
// Image display
kt.image("https://example.com/photo.jpg");
kt.image("https://example.com/photo.jpg", { caption: "Photo caption" });

// Audio player
kt.audio("https://example.com/sound.mp3");
kt.audio(audioBytes, { mimeType: "audio/wav", loop: true });

// Video player
kt.video("https://example.com/movie.mp4");

// With poster and subtitles
kt.video("https://example.com/movie.mp4", {
  poster: "https://example.com/thumbnail.jpg",
  subtitles: { src: "/subs/ja.vtt", srclang: "ja", label: "日本語" },
});

// Multiple subtitle tracks
kt.video("https://example.com/movie.mp4", {
  subtitles: [
    { src: "/subs/ja.vtt", srclang: "ja", label: "日本語" },
    { src: "/subs/en.vtt", srclang: "en", label: "English" },
  ],
});

// Playback options
kt.video("https://example.com/demo.mp4", {
  autoplay: true,
  muted: true,
  loop: true,
});

// Time range (Media Fragment URI)
kt.video("https://example.com/long-video.mp4", {
  startTime: 30,
  endTime: 120,
});

// Binary data
kt.video(videoBytes, { mimeType: "video/mp4" });
```

#### Layout API

```typescript
// Tabs - organize content in multiple tabs
const [tab1, tab2, tab3] = kt.tabs(["Overview", "Data", "Settings"]);

tab1(() => {
  kt.header("Overview");
  kt.write("This is the overview tab.");
});

tab2(() => {
  kt.header("Data");
  kt.table(data);
});

tab3(() => {
  kt.header("Settings");
  kt.write("Configure your preferences here.");
});

// Columns - create multi-column layout
kt.columns([
  () => kt.write("Left"),
  () => kt.write("Right"),
]);

// With ratios (1:2:1 = 25%:50%:25%)
kt.columns(
  [
    () => kt.write("Sidebar"),
    () => kt.write("Main content"),
    () => kt.write("Sidebar"),
  ],
  { ratios: [1, 2, 1] }
);

// Container - group content
kt.container(() => {
  kt.write("Grouped content");
  kt.button("Action");
}, { border: true });

// Expander - collapsible section
kt.expander("See details", () => {
  kt.write("Hidden content");
});

// Expanded by default
kt.expander("Important notice", () => {
  kt.write("Please read this!");
}, { expanded: true });
```

#### Sidebar API

```typescript
// Callback notation
kt.sidebar(() => {
  kt.title("Settings");
  kt.button("Reset");
});

// Object notation
kt.sidebar.title("Settings");
kt.sidebar.button("Reset");

// Custom width
kt.sidebar(() => {
  kt.title("Wide Sidebar");
}, { width: "350px" });
```

#### Form API

```typescript
// Form with submit button
kt.form("login_form", () => {
  const username = kt.text_input("Username");
  const password = kt.text_input("Password", "", { type: "password" });
  if (kt.form_submit_button("Login")) {
    // Handle form submission
  }
});

// Validation errors
kt.form("contact", () => {
  const email = kt.text_input("Email");
  if (kt.form_submit_button("Send")) {
    if (!email.includes("@")) {
      kt.validation_error("Please enter a valid email address");
      return;
    }
    // Process valid form data
  }
});

// Multiple validation errors
kt.form("signup", () => {
  const name = kt.text_input("Name");
  const email = kt.text_input("Email");
  if (kt.form_submit_button("Sign Up")) {
    const errors = [];
    if (!name) errors.push("Name is required");
    if (!email) errors.push("Email is required");
    if (errors.length > 0) {
      kt.validation_errors(errors);
      return;
    }
  }
});
```

#### Chat API

```typescript
import { kt, createTypedSessionState } from "kantan-ui";

// Message history type definition
type ChatState = {
  messages: Array<{ role: "user" | "assistant"; content: string }>;
};

const state = createTypedSessionState<ChatState>({
  messages: [],
});

// Chat container (with auto-scroll)
kt.chat_container(() => {
  for (const msg of state.messages) {
    kt.chat_message(msg.role, msg.content);
  }
}, { height: "400px" });

// Individual chat messages
kt.chat_message("user", "Hello!");
kt.chat_message("assistant", "Hi! How can I help you?");

// Custom avatar and name
kt.chat_message("user", "What is **TypeScript**?", {
  name: "Alice",
  avatar: "🧑‍💻",
});

// System message
kt.chat_message("system", "Session started at 10:00 AM");

// Chat input - returns submitted text (null when no submission)
const userInput = kt.chat_input("Type a message...", { key: "chat" });
if (userInput) {
  state.messages.push({ role: "user", content: userInput });
}
```

**Features:**
- Role-based styling (user / assistant / system)
- Markdown content support
- Customizable avatar and display name
- Auto-scroll (pauses when user scrolls up)
- Chat input with pinned-to-bottom positioning

#### Empty Placeholder API

Create dynamically updatable placeholders. Similar to Streamlit's `st.empty()`.

```typescript
// Create placeholder
const status = kt.empty({ key: "status" });

// Dynamically change content on button click
if (kt.button("Start Process")) {
  status.spinner("Processing...");
}

if (kt.button("Complete")) {
  status.success("Done!");
}

if (kt.button("Show Error")) {
  status.error("Something went wrong!");
}

if (kt.button("Clear")) {
  status.empty();  // Clear content
}

// Show progress bar
const progress = kt.empty({ key: "progress" });
if (kt.button("Show Progress")) {
  progress.progress(0.75, { text: "75% complete" });
}
```

**Placeholder Object Methods:**
- `write(content)` - Display text/number/boolean
- `text(content)` - Display plain text
- `markdown(content)` - Display Markdown
- `html(content)` - Display raw HTML
- `json(data)` - Display formatted JSON
- `code(content, language?)` - Display code block
- `success(message)` - Success alert
- `error(message)` - Error alert
- `warning(message)` - Warning alert
- `info(message)` - Info alert
- `progress(value, config?)` - Progress bar (0.0-1.0)
- `spinner(text?)` - Loading spinner
- `empty()` - Clear content

### Session State Management

Manage per-user session state. Similar to Streamlit's `st.session_state`.

#### createTypedSessionState (Recommended)

Create type-safe session state. Access safely without type assertions, with IDE completion support.

```typescript
import { createTypedSessionState } from "kantan-ui";

// Define type and specify defaults
type AppState = {
  counter: number;
  name: string;
  items: string[];
};

const state = createTypedSessionState<AppState>({
  counter: 0,
  name: "World",
  items: [],
});

// Type-safe access
state.counter++;           // OK - number type
state.name = "Hello";      // OK - string type
state.items.push("item");  // OK - string[] type
// state.unknown = 1;      // Compile error!
```

#### session_state (Legacy)

For dynamic keys, the traditional `session_state` is also available.

```typescript
import { session_state } from "kantan-ui";

// Initialize
if (session_state.myValue === undefined) {
  session_state.myValue = "initial";
}

// Read (type assertion required)
const value = session_state.myValue as string;

// Write
session_state.myValue = "new value";
```

### Cache API

Cache expensive function results to improve performance. Similar to Streamlit's `@st.cache_data` and `@st.cache_resource`.

#### cache_data

For serializable data (API results, computed values):

```typescript
import { kt } from "kantan-ui";

// Basic usage
const fetchUsers = kt.cache_data(async (limit: number) => {
  const res = await fetch(`/api/users?limit=${limit}`);
  return res.json();
});

const users = await fetchUsers(10);  // Cached on subsequent calls

// With TTL (expires in 1 hour)
const fetchWeather = kt.cache_data(async (city: string) => {
  return await weatherApi.get(city);
}, { ttl: 3600 });

// With max entries (LRU eviction)
const searchProducts = kt.cache_data(async (query: string) => {
  return await productApi.search(query);
}, { max_entries: 50 });

// Clear cache
fetchUsers.clear();
```

#### cache_resource

For non-serializable resources (database connections, ML models):

```typescript
// Returns the same instance on every call
const getDb = kt.cache_resource(() => {
  return new DatabaseConnection(process.env.DB_URL);
});

const db1 = getDb();
const db2 = getDb();
console.log(db1 === db2); // true
```

#### Global cache clear

```typescript
kt.cache_data.clear();      // Clear all cache_data caches
kt.cache_resource.clear();  // Clear all cache_resource caches
kt.clear_all_caches();      // Clear all caches
```

### Imperative API (Low-level API)

For finer control, imperative APIs are also available.

```typescript
import { button, renderButton, slider, renderSlider } from "kantan-ui";

// Functional API (returns true when pressed)
const pressed = button("Click me", { key: "my_button" });

// For rendering (returns HTML)
const html = renderButton("Click me", { key: "my_button" });
```

## Project Structure

```
src/
├── index.ts          # Entry point (exports)
├── app.ts            # createApp function
├── server.ts         # Demo server
├── client/           # Client script generation
│   ├── script.ts     # WebSocket/event handling script
│   ├── dataframe-script.ts # Dataframe client-side interactions
│   ├── types.ts      # Client config types
│   └── index.ts
├── config/           # Configuration management
│   ├── defaults.ts   # Default settings
│   ├── types.ts      # Config types
│   └── index.ts
├── kt/               # Declarative API (Streamlit-style)
│   ├── context.ts    # Render context
│   ├── config.ts     # Page config (set_page_config)
│   ├── control.ts    # Control API (rerun)
│   ├── charts.ts     # Chart API (line_chart, bar_chart, area_chart)
│   ├── chart/        # Chart modules
│   │   ├── types.ts      # Type definitions (BaseChartConfig, NormalizeConfig, etc.)
│   │   ├── colors.ts     # Color palette & validation
│   │   ├── normalize.ts  # Data normalization
│   │   ├── scale.ts      # Axis scale calculation (niceScale, calculateAxisScale)
│   │   ├── shared.ts     # Common chart pipeline (prepareChartData, sanitizeConfig)
│   │   ├── render-utils.ts # Shared rendering utilities (grid, axes, legend)
│   │   ├── bar-chart.ts  # Bar chart SVG rendering
│   │   └── area-chart.ts # Area chart SVG rendering
│   ├── chat.ts       # Chat API (chat_message, chat_container)
│   ├── data.ts       # Data display (table, dataframe)
│   ├── empty.ts      # Empty placeholder
│   ├── feedback.ts   # Feedback API (progress, spinner, toast)
│   ├── form.ts       # Form API
│   ├── layout.ts     # Layout (tabs, columns, container, expander)
│   ├── media.ts      # Media API (image, audio, video)
│   ├── sidebar.ts    # Sidebar API
│   ├── output.ts     # Output API (title, write, header, etc.)
│   ├── stream.ts     # Streaming API (write_stream)
│   ├── stream-utils.ts   # Stream normalization utilities
│   ├── stream-registry.ts # Pending stream management
│   ├── widgets.ts    # Widget API (button, slider, etc.)
│   └── index.ts
├── runtime/          # Runtime context management
│   ├── context.ts    # getContext/setContext
│   ├── rerun.ts      # Script re-execution logic
│   ├── stream-processor.ts # Stream processing engine
│   └── index.ts
├── session/          # Session management
│   ├── manager.ts    # SessionManager (multi-tab support)
│   ├── state.ts      # session_state (Proxy implementation)
│   ├── types.ts      # Type definitions
│   └── index.ts
├── utils/            # Utilities
│   ├── html.ts       # HTML escaping, etc.
│   ├── sanitize.ts   # Filename sanitization
│   ├── magic-bytes.ts # Magic byte validation
│   ├── polyglot-detection.ts # Polyglot detection
│   ├── file-validation.ts # File validation integration
│   └── type-guards.ts
├── websocket/        # WebSocket handling
│   ├── handler.ts    # WebSocket handler
│   ├── types.ts      # Message type definitions
│   └── index.ts
└── widgets/          # UI widgets (imperative API)
    ├── dataframe.ts
    ├── button.ts
    ├── slider.ts
    ├── text-input.ts
    ├── text-area.ts
    ├── selectbox.ts
    ├── download-button.ts
    ├── checkbox.ts
    ├── toggle.ts
    ├── radio.ts
    ├── number-input.ts
    ├── multiselect.ts
    ├── date-input.ts
    ├── time-input.ts
    ├── file-uploader.ts
    ├── uploaded-file.ts
    ├── line-chart.ts
    ├── image.ts
    ├── audio.ts
    ├── video.ts
    ├── placeholder.ts
    ├── core.ts
    ├── registry.ts
    ├── types.ts
    └── index.ts
```

## NPM Scripts

| Command | Description |
|---------|-------------|
| `bun run dev` | Start development server (hot reload) |
| `bun run build` | Production build |
| `bun run test` | Run unit tests (Vitest) |
| `bun run test:watch` | Unit tests (watch mode) |
| `bun run test:coverage` | Tests with coverage |
| `bun run test:e2e` | E2E tests (Playwright) |
| `bun run lint` | Lint check with Biome |
| `bun run lint:fix` | Auto-fix lint issues |
| `bun run ci` | CI pipeline (lint + build + test:coverage) |

## How It Works

1. Client loads the page and establishes WebSocket connection
2. Server creates a session and sends initial HTML
3. When user interacts with widgets, `sendEvent` notifies the server (with debounce)
4. Server updates `session_state` and re-executes the script (rerun)
5. New HTML is sent to client via WebSocket (streaming supported)
6. Client updates DOM (preserving focus state)

### Connection Management

- **Ping/Pong**: Server periodically sends ping to monitor connection state
- **Auto-reconnect**: Exponential backoff retry on disconnect
- **Sequence Numbers**: Recover missed patches on reconnect
- **Multi-tab**: Broadcast state changes to all tabs of the same session

## License

MIT
