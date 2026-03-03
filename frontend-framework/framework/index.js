
// 1. The Virtual DOM Creator
// This function lets us write "HTML" in JavaScript. 
// Instead of writing <div class="red">Hello</div>, we write h('div', { class: 'red' }, 'Hello')
export function h(tag, props = {}, ...children) {
    return {
        tag,          // The HTML tag properly (e.g., 'div', 'h1')
        props,        // The attributes (e.g., { class: 'btn', id: 'my-btn' })
        children: children.flat() // Example: ['Click Me', h('span', {}, '!')]
    };
}


// 2. The Renderer (Updated for Events)
export function mount(vNode, container) {
    if (vNode == null || typeof vNode === 'boolean') return;
    if (typeof vNode === 'string' || typeof vNode === 'number') {
        return container.appendChild(document.createTextNode(String(vNode)));
    }

    const element = document.createElement(vNode.tag);

    for (const [key, value] of Object.entries(vNode.props || {})) {
        // EVENT HANDLING
        if (key.startsWith('on')) {
            // "onclick" -> "click"
            const eventName = key.substring(2).toLowerCase();
            element.addEventListener(eventName, value);
        } 
        // NORMAL ATTRIBUTES
        else {
            element.setAttribute(key, value);
        }
    }

    vNode.children.forEach(child => mount(child, element));
    return container.appendChild(element);
}


export function createState(initialValue, storageKey = null) {
    let startValue = initialValue; 
    
    // --- LOAD ---
    if (storageKey) {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
            // We add a try-catch to prevent crashing if data is corrupted
            try {
                startValue = JSON.parse(saved);
            } catch (e) {
               console.error("Failed to parse saved state");
            }
        }
    }

    let state = startValue;
    const listeners = [];

    function get() { return state; }

    function set(newValue) {
        state = newValue;
        // --- SAVE ---
        if (storageKey) {
            localStorage.setItem(storageKey, JSON.stringify(state));
        }
        listeners.forEach(callback => callback(state));
    }

    function subscribe(callback) { listeners.push(callback); }

    return { get, set, subscribe };
}

export function createRouter() {
    // Holds our page components: { '/': Home, '/about': About }
    const routes = {}; 

    // Register a new route
    function route(path, component) {
        routes[path] = component;
    }

    // specific logic to handle URL changes
    function start(onLocationChange) {
        // Listen for "Back" button or manual URL changes
        window.addEventListener('hashchange', () => {
             onLocationChange();
        });
        
        // Handle the initial page load
        onLocationChange();
    }

    // Figure out which component to show right now
    function resolve() {
        // "http://site.com/#/about" -> "/about"
        const path = window.location.hash.slice(1) || '/';
        return routes[path] || routes['/'];
    }

    return { route, start, resolve };
}

export function http(url) {
    return fetch(url).then(response => {
        if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        return response.json();
    });
}