import { h, mount, createState, createRouter, http } from '../framework/index.js';

// --- STATE ---
const snippets = createState([], 'my_snippets');

// --- ACTIONS ---
function addSnippet(title, code) {
    const currentList = snippets.get();
    const newSnippet = {
        id: Date.now(),
        title,
        code,
        createdAt: new Date().toLocaleString()
    };
    snippets.set([...currentList, newSnippet]);
}

function removeSnippet(id) {
    const currentList = snippets.get();
    const newList = currentList.filter(snippet => snippet.id !== id);
    snippets.set(newList);
}

// --- SHARED COMPONENTS ---
function Navbar() {
    return h('nav', { class: 'navbar' },
        h('div', { class: 'nav-brand' }, 'SnippetVault'),
        h('div', { class: 'nav-links' },
            h('a', { href: '#/', class: 'nav-item' }, '📂 Vault'),
            h('a', { href: '#/about', class: 'nav-item' }, 'ℹ️ About')
        )
    );
}

function SnippetList() {
    return h('div', {
        class: 'snippet-list',
        // EVENT DELEGATION: One listener handles all delete buttons
        onclick: (event) => {
            if (event.target.classList.contains('btn-delete')) {
                const id = Number(event.target.dataset.id);
                removeSnippet(id);
            }
        }
    },
        ...snippets.get().map(snippet =>
            h('div', { class: 'card' },
                h('div', { style: 'display: flex; justify-content: space-between; align-items: center;' },
                    h('div', {},
                        h('h3', { style: 'margin: 0;' }, snippet.title),
                        h('small', { style: 'color: #94a3b8; font-size: 0.8rem;' }, snippet.createdAt || new Date(snippet.id).toLocaleString())
                    ),
                    h('button', {
                        class: 'btn-delete',
                        style: 'margin: 0; padding: 5px 10px;',
                        'data-id': snippet.id
                    }, 'Delete')
                ),
                h('pre', {}, snippet.code)
            )
        )
    );
}

function SnippetForm() {
    let tempTitle = '';
    let tempCode = '';
    function fetchQuote() {
        http('https://dummyjson.com/quotes/random')
            .then(data => {
                const quoteText = `// "${data.quote}"\n// - ${data.author}`;

                // AUTO-FILL THE UI
                document.getElementById('input-title').value = "Inspiration";
                document.getElementById('input-code').value = quoteText;
                // UPDATE OUR VARIABLES
                tempTitle = "Inspiration";
                tempCode = quoteText;
            })
            .catch(err => {
                console.error(err);
                alert("Could not fetch quote.");
            });
    }
    return h('div', { class: 'form-container' },
        h('input', {
            id: 'input-title',
            placeholder: 'Snippet Title',
            oninput: (e) => tempTitle = e.target.value
        }),
        h('textarea', {
            id: 'input-code',
            placeholder: 'Paste code here...',
            oninput: (e) => tempCode = e.target.value
        }),
        h('div', { style: 'display: flex; gap: 10px;' },
            h('button', {
                onclick: () => {
                    if (tempTitle && tempCode) {
                        addSnippet(tempTitle, tempCode);
                        // Clear form after save
                        document.getElementById('input-title').value = '';
                        document.getElementById('input-code').value = '';
                        tempTitle = '';
                        tempCode = '';
                    }
                }
            }, 'Save Snippet'),

            h('button', {
                style: 'background: #475569;',
                onclick: (e) => {
                    e.preventDefault();
                    fetchQuote();
                }
            }, '🤖 Inspire Me')
        )
    );
}

// --- PAGES ---

function HomePage() {
    return h('div', { id: 'app-container' },
        Navbar(),
        h('h1', { style: 'margin-bottom: 20px;' }, 'Snippet Vault 🔒'),
        SnippetForm(),
        h('hr', { style: 'border-color: #334155; margin: 30px 0;' }),
        SnippetList()
    );
}

function AboutPage() {
    return h('div', { id: 'app-container' },
        Navbar(),
        h('h1', {}, 'About this App'),
        h('div', { class: 'card' },
            h('p', {}, 'This application was built from scratch using a custom JavaScript framework.'),
            h('ul', { style: 'margin-top: 10px; padding-left: 20px; line-height: 1.6;' },
                h('li', {}, 'Virtual DOM rendering'),
                h('li', {}, 'Centralized State Management'),
                h('li', {}, 'Client-side Routing'),
                h('li', {}, 'LocalStorage Persistence'),
                h('li', {}, 'HTTP Requests')
            ),
            h('hr', { style: 'border-color: #334155; margin: 20px 0;' }),
            h('h3', {}, 'Performance Test'),
            h('p', {}, 'Add 1,000 items to test rendering speed and memory usage.'),
            h('button', {
                onclick: () => {
                    const longList = [];
                    for (let i = 0; i < 1000; i++) {
                        longList.push({ id: Date.now() + i, title: `Benchmark Item ${i}`, code: `console.log("Speed ${i}");` });
                    }
                    // Updating state triggers a massive re-render
                    snippets.set([...snippets.get(), ...longList]);
                    alert('Added 1,000 items! Go to Vault to check smoothness.');
                }
            }, '⚡ Run Stress Test')
        )
    );
}

// --- ROUTING & MOUNTING ---

const router = createRouter();

// Define Pages
router.route('/', HomePage);
router.route('/about', AboutPage);

const root = document.getElementById('app');

function renderApp() {
    root.innerHTML = '';
    // Ask the router: "Which page should I show?"
    const CurrentPage = router.resolve();
    mount(CurrentPage(), root);
}

// Listen for interactions
snippets.subscribe(renderApp);
router.start(renderApp); 