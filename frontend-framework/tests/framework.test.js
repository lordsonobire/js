import { describe, it, expect, beforeEach } from 'vitest';
import { h, mount, createState, createRouter, http } from '../framework/index.js';

describe('h() - Virtual DOM creator', () => {
  it('creates a vNode with tag, props, and children', () => {
    const node = h('div', { class: 'test' }, 'Hello');
    expect(node.tag).toBe('div');
    expect(node.props.class).toBe('test');
    expect(node.children).toEqual(['Hello']);
  });

  it('defaults props to empty object', () => {
    const node = h('span');
    expect(node.props).toEqual({});
    expect(node.children).toEqual([]);
  });

  it('flattens nested children arrays', () => {
    const node = h('ul', {}, [h('li', {}, 'A'), h('li', {}, 'B')]);
    expect(node.children.length).toBe(2);
    expect(node.children[0].tag).toBe('li');
  });
});

describe('mount() - DOM renderer', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
  });

  it('mounts a text node', () => {
    mount('Hello', container);
    expect(container.textContent).toBe('Hello');
  });

  it('mounts a number as text', () => {
    mount(42, container);
    expect(container.textContent).toBe('42');
  });

  it('skips null/undefined/boolean values', () => {
    mount(null, container);
    mount(undefined, container);
    mount(false, container);
    expect(container.childNodes.length).toBe(0);
  });

  it('mounts an element with attributes', () => {
    const node = h('div', { id: 'test', class: 'box' });
    mount(node, container);
    const el = container.querySelector('#test');
    expect(el).not.toBeNull();
    expect(el.className).toBe('box');
  });

  it('mounts nested children', () => {
    const node = h('div', {},
      h('span', {}, 'child1'),
      h('span', {}, 'child2')
    );
    mount(node, container);
    expect(container.querySelectorAll('span').length).toBe(2);
  });

  it('attaches event listeners for on* props', () => {
    let clicked = false;
    const node = h('button', { onclick: () => { clicked = true; } }, 'Click');
    mount(node, container);
    container.querySelector('button').click();
    expect(clicked).toBe(true);
  });
});

describe('createState()', () => {
  it('returns get/set/subscribe interface', () => {
    const state = createState(0);
    expect(typeof state.get).toBe('function');
    expect(typeof state.set).toBe('function');
    expect(typeof state.subscribe).toBe('function');
  });

  it('gets initial value', () => {
    const state = createState(42);
    expect(state.get()).toBe(42);
  });

  it('updates value with set', () => {
    const state = createState('hello');
    state.set('world');
    expect(state.get()).toBe('world');
  });

  it('notifies subscribers on set', () => {
    const state = createState(0);
    let received = null;
    state.subscribe(val => { received = val; });
    state.set(99);
    expect(received).toBe(99);
  });

  it('supports multiple subscribers', () => {
    const state = createState(0);
    const values = [];
    state.subscribe(v => values.push(`a:${v}`));
    state.subscribe(v => values.push(`b:${v}`));
    state.set(1);
    expect(values).toEqual(['a:1', 'b:1']);
  });
});

describe('createRouter()', () => {
  it('returns route/start/resolve interface', () => {
    const router = createRouter();
    expect(typeof router.route).toBe('function');
    expect(typeof router.start).toBe('function');
    expect(typeof router.resolve).toBe('function');
  });

  it('resolves registered routes', () => {
    const router = createRouter();
    const Home = () => 'home';
    const About = () => 'about';
    router.route('/', Home);
    router.route('/about', About);

    window.location.hash = '#/about';
    expect(router.resolve()).toBe(About);
  });

  it('falls back to / for unknown routes', () => {
    const router = createRouter();
    const Home = () => 'home';
    router.route('/', Home);

    window.location.hash = '#/nonexistent';
    expect(router.resolve()).toBe(Home);
  });
});

describe('http()', () => {
  it('returns a promise', () => {
    const result = http('https://dummyjson.com/test');
    expect(result instanceof Promise).toBe(true);
  });
});
