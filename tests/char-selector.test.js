// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest';
import { createCharSelector } from '../public/src/components/char-selector.js';

const CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'; // 36 chars

function mount(slots = 3, charset = CHARSET) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const selector = createCharSelector(container, {
    charset,
    slots,
    onComplete: () => {},
  });
  return { container, selector };
}

function key(container, keyName) {
  const active = container.querySelector('.cs-slot.cs-active') ?? container.querySelector('.cs-slot');
  active?.dispatchEvent(new KeyboardEvent('keydown', {
    key: keyName,
    bubbles: true,
    cancelable: true,
  }));
}

describe('createCharSelector', () => {
  it('renders the correct number of slots', () => {
    const { container } = mount(6);
    expect(container.querySelectorAll('.cs-slot').length).toBe(6);
  });

  it('all slots start with the first charset character', () => {
    const { container } = mount(4, 'XYZ');
    container.querySelectorAll('.cs-char').forEach(el => {
      expect(el.textContent).toBe('X');
    });
  });

  it('ArrowDown cycles forward in the charset', () => {
    const { container } = mount(3, 'ABC');
    key(container, 'ArrowDown');
    const active = container.querySelector('.cs-slot.cs-active .cs-char');
    expect(active.textContent).toBe('B');
  });

  it('ArrowUp cycles backward (wraps around)', () => {
    const { container } = mount(3, 'ABC');
    key(container, 'ArrowUp');
    const active = container.querySelector('.cs-slot.cs-active .cs-char');
    expect(active.textContent).toBe('C'); // 0 - 1 + 3 = 2 → 'C'
  });

  it('ArrowDown wraps from last to first charset char', () => {
    const { container } = mount(2, 'AB');
    key(container, 'ArrowDown'); // A → B
    key(container, 'ArrowDown'); // B → A (wrap)
    const active = container.querySelector('.cs-slot.cs-active .cs-char');
    expect(active.textContent).toBe('A');
  });

  it('ArrowRight advances to the next slot', () => {
    const { container } = mount(3);
    key(container, 'ArrowRight');
    const active = container.querySelector('.cs-slot.cs-active');
    expect(active.dataset.idx).toBe('1');
  });

  it('ArrowLeft moves to the previous slot', () => {
    const { container } = mount(3);
    key(container, 'ArrowRight'); // to slot 1
    key(container, 'ArrowLeft');  // back to slot 0
    const active = container.querySelector('.cs-slot.cs-active');
    expect(active.dataset.idx).toBe('0');
  });

  it('ArrowLeft does nothing on the first slot', () => {
    const { container } = mount(3);
    key(container, 'ArrowLeft');
    const active = container.querySelector('.cs-slot.cs-active');
    expect(active.dataset.idx).toBe('0');
  });

  it('Enter on a non-last slot advances to the next slot', () => {
    const { container } = mount(3);
    key(container, 'Enter');
    const active = container.querySelector('.cs-slot.cs-active');
    expect(active.dataset.idx).toBe('1');
  });

  it('Enter on the last slot fires the complete callback', () => {
    let result = null;
    const container = document.createElement('div');
    document.body.appendChild(container);
    createCharSelector(container, {
      charset: 'AB',
      slots: 2,
      onComplete: (v) => { result = v; },
    });

    key(container, 'ArrowRight'); // advance to slot 1
    key(container, 'Enter');       // complete from last slot
    expect(result).toBe('AA');
  });

  it('ArrowRight past the last slot fires the complete callback', () => {
    let result = null;
    const container = document.createElement('div');
    document.body.appendChild(container);
    createCharSelector(container, {
      charset: 'XY',
      slots: 2,
      onComplete: (v) => { result = v; },
    });

    key(container, 'ArrowRight'); // to slot 1
    key(container, 'ArrowRight'); // past last → complete
    expect(result).toBe('XX');
  });

  it('complete event fires with the assembled value', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    let eventValue = null;
    container.addEventListener('complete', (e) => {
      eventValue = e.detail.value;
    });
    createCharSelector(container, {
      charset: 'AB',
      slots: 1,
      onComplete: () => {},
    });
    key(container, 'Enter');
    expect(eventValue).toBe('A');
  });

  it('getValue returns the current assembled value', () => {
    const { container, selector } = mount(3, 'ABC');
    key(container, 'ArrowDown'); // slot 0 → B
    expect(selector.getValue()).toBe('BAA');
  });

  it('reset restores all slots to first charset char', () => {
    const { container, selector } = mount(3, 'ABC');
    key(container, 'ArrowDown');
    key(container, 'ArrowRight');
    key(container, 'ArrowDown');
    selector.reset();
    expect(selector.getValue()).toBe('AAA');
    expect(container.querySelector('.cs-slot.cs-active').dataset.idx).toBe('0');
  });

  it('shows windowed progress indicator for slots > 8', () => {
    const { container } = mount(10);
    const progress = container.querySelector('.cs-progress');
    expect(progress).not.toBeNull();
    expect(progress.textContent).toBe('1 / 10');
  });

  it('shows only WINDOW_SIZE slots when slot count exceeds it', () => {
    const { container } = mount(44, CHARSET);
    expect(container.querySelectorAll('.cs-slot').length).toBe(8);
  });

  it('window slides right when active slot reaches the edge', () => {
    const { container } = mount(10);
    // Advance 8 times to push the window right
    for (let i = 0; i < 8; i++) key(container, 'ArrowRight');
    const slots = container.querySelectorAll('.cs-slot');
    const firstVisible = parseInt(slots[0].dataset.idx, 10);
    expect(firstVisible).toBeGreaterThan(0);
  });

  it('stops propagation of arrow keys so global handler is not triggered', () => {
    const { container } = mount(3);
    let propagated = false;
    document.addEventListener('keydown', () => { propagated = true; }, { once: true });
    const e = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true });
    container.querySelector('.cs-slot.cs-active')?.dispatchEvent(e);
    expect(e.cancelBubble).toBe(true);
  });
});
