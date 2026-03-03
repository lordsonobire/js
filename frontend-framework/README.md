# Frontend Framework

A lightweight custom virtual DOM framework built from scratch — no React, no Vue, no dependencies. Implements the core primitives needed to build single-page applications: virtual DOM rendering, reactive state management, hash-based routing, and HTTP utilities.

## Features

- **`h(tag, props, ...children)`** — Virtual DOM node creator (JSX-like syntax in plain JS)
- **`mount(vNode, container)`** — Renders virtual DOM trees to real DOM with event binding (`onclick`, etc.)
- **`createState(initial, storageKey?)`** — Reactive state with `get/set/subscribe` and optional `localStorage` persistence
- **`createRouter()`** — Hash-based SPA router with `route()`, `start()`, and `resolve()`
- **`http(url)`** — Fetch wrapper with error handling, returns parsed JSON

## Quick Start

```bash
# Install dev dependencies
npm install

# Serve the demo app
npm run serve
# Open http://localhost:8080 (redirects to /example/)

# Run tests
npm test
```

## Docker

```bash
docker build -t frontend-framework .
docker run -p 8080:8080 frontend-framework
```

## Project Structure

```
framework/
  index.js          # Core framework (h, mount, createState, createRouter, http)
example/
  index.html        # Demo app using the framework
  app.js            # Demo application logic
  styles.css        # Glass UI styling
tests/
  framework.test.js # 18 unit tests (vitest + jsdom)
```

## Usage Example

```js
import { h, mount, createState } from './framework/index.js';

const count = createState(0);

function render() {
  const app = document.getElementById('app');
  // Clear and re-render
  while (app.firstChild) app.removeChild(app.firstChild);
  mount(
    h('div', {},
      h('h1', {}, `Count: ${count.get()}`),
      h('button', { onclick: () => count.set(count.get() + 1) }, '+1')
    ),
    app
  );
}

count.subscribe(render);
render();
```

## Tests

18 tests covering all 5 framework functions:

```
npm test

 ✓ tests/framework.test.js (18 tests)
   ✓ h() — creates virtual DOM nodes
   ✓ mount() — renders to real DOM, binds events
   ✓ createState() — reactive get/set/subscribe
   ✓ createRouter() — hash-based route resolution
   ✓ http() — fetch with error handling
```
