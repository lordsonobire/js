# KoodJS Framework

A lightweight, dependency-free JavaScript framework for building Single Page Applications (SPAs). It features a Virtual DOM, detailed internal state management with persistence, and client-side routing.

## 🛠 Running the Example (Important!)

Because this framework uses ES Modules (`import`/`export`) and fetches external data, **you cannot simply open `index.html` in your file explorer**. Browsers block these features for security reasons (CORS) when opening files directly.

You must view the project through a **local web server**.

### Option A: Using Python (Mac, Linux, Windows)
If you have Python installed (most Macs/Linux do):
1. Open your terminal.
2. Navigate to the project root.
3. Run: `python3 -m http.server 8080`
4. Open your browser to: `http://localhost:8080/example/`

### Option B: Using Node.js (Mac, Linux, Windows)
If you have Node.js and `npx` installed:
1. Open your terminal in the project root.
2. Run: `npx http-server .`
3. Click the link shown in the terminal (usually `http://127.0.0.1:8080`).

### Option C: VS Code "Live Server"
1. Install the "Live Server" extension for VS Code.
2. Right-click `example/index.html` and select "Open with Live Server".

---

## 🏗 Architecture & Design Principles

KoodJS is built on the "Component-State-View" pattern, emphasizing simplicity and transparency.

1.  **Virtual DOM**: Uses a lightweight Virtual DOM implementation (`h` function) to describe UI state in pure JavaScript objects. This decouples the logic from the heavy DOM API.
2.  **Centralized State**: State is managed outside of components. When state changes, subscriptions trigger a predictable re-render.
3.  **One-Way Data Flow**: Data flows down from state to components. Actions allow components to request state updates.
4.  **No Magic**: Every part of the framework (routing, finding elements) is explicit, avoiding "black box" magic found in larger libraries.

---

## 📦 Installation

Simply copy the `framework` directory into your project. There are no npm dependencies.

```javascript
// Import functions directly from the module
import { h, mount, createState, createRouter, http } from './framework/index.js';
```

---

## 🚀 Getting Started

### 1. Initialize State
Create a reactive state container. Optionally pass a key to enable `localStorage` persistence.

```javascript
const count = createState(0, 'my_counter');
```

### 2. Create Components
Components are just functions that ask for data and return a Virtual DOM node (`h`).

```javascript
function Counter() {
    return h('div', { class: 'counter-box' },
        h('h1', {}, `Count: ${count.get()}`),
        h('button', { onclick: () => count.set(count.get() + 1) }, 'Increment')
    );
}
```

### 3. Mount the App
Bind the application to a real DOM element and subscribe to changes.

```javascript
const root = document.getElementById('app');

function render() {
    root.innerHTML = '';
    mount(Counter(), root);
}

// Re-render whenever state changes
count.subscribe(render);
render(); // Initial render
```

---

## 📚 Feature Reference

### `h(tag, props, ...children)`
Creates a Virtual DOM node.
- **tag**: String (e.g., 'div', 'span')
- **props**: Object of attributes (e.g., `{ class: 'red', onclick: fn }`)
- **children**: Child nodes or strings.

### `createState(initialValue, storageKey?)`
Creates a reactive store.
- **get()**: Returns current value.
- **set(newValue)**: Updates value, saves to localStorage (if key provided), and notifies listeners.
- **subscribe(fn)**: Register a function to run on updates.

### `createRouter()`
Handles client-side navigation.
- **route(path, component)**: Register a URL path (e.g., `'/about'`).
- **start(renderFn)**: Begin listening for hash changes.

### `http(url)`
A wrapper around `fetch` that handles JSON parsing and error checking.
- Returns a Promise resolving to the JSON data.

---

## 💡 Best Practices

1.  **Separate State from UI**: Keep your `createState` logic separate from your render functions.
2.  **Use Unique Keys**: When using persistence, ensure your `storageKey` is unique to avoid conflicts.
3.  **Component Purity**: Components should read data (`get()`) but only change data via Actions/Setters, never directly mutating variables.
