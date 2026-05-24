const WINDOW_SIZE = 8;

/**
 * Arrow-key character selector for MRBD input.
 *
 * @param {HTMLElement} container  - Element to mount into (replaced on each render)
 * @param {object}      config
 * @param {string}      config.charset    - String of valid characters
 * @param {number}      config.slots      - Number of character slots
 * @param {function}    config.onComplete - Called with the assembled string
 */
export function createCharSelector(container, { charset, slots, onComplete }) {
  const values = new Array(slots).fill(0); // indices into charset
  let activeIdx = 0;
  let windowStart = 0;

  // ── Window management ──────────────────────────────────────
  function updateWindow() {
    if (slots <= WINDOW_SIZE) return;
    if (activeIdx < windowStart) {
      windowStart = activeIdx;
    } else if (activeIdx >= windowStart + WINDOW_SIZE) {
      windowStart = activeIdx - WINDOW_SIZE + 1;
    }
  }

  function windowRange() {
    const start = slots <= WINDOW_SIZE ? 0 : windowStart;
    const end   = Math.min(start + (slots <= WINDOW_SIZE ? slots : WINDOW_SIZE), slots);
    return { start, end };
  }

  // ── Render ─────────────────────────────────────────────────
  function render() {
    const { start, end } = windowRange();
    const windowed = slots > WINDOW_SIZE;

    let slotsHtml = '';
    for (let i = start; i < end; i++) {
      const isActive = i === activeIdx;
      slotsHtml += `
        <div class="cs-slot${isActive ? ' cs-active focusable' : ''}"
             tabindex="${isActive ? '0' : '-1'}"
             data-idx="${i}">
          <span class="cs-arrow">↑</span>
          <span class="cs-char">${charset[values[i]]}</span>
          <span class="cs-arrow">↓</span>
        </div>`;
    }

    container.innerHTML = `
      <div class="char-selector">
        ${windowed ? `<div class="cs-progress">${activeIdx + 1} / ${slots}</div>` : ''}
        <div class="cs-slots">${slotsHtml}</div>
      </div>`;

    container.querySelector('.cs-slot.cs-active')?.focus();
  }

  // ── State mutations ─────────────────────────────────────────
  function cycleChar(delta) {
    const len = charset.length;
    values[activeIdx] = (values[activeIdx] + delta + len) % len;
    render();
  }

  function goToSlot(idx) {
    if (idx < 0 || idx >= slots) return;
    activeIdx = idx;
    updateWindow();
    render();
  }

  function tryComplete() {
    const value = values.map(i => charset[i]).join('');
    onComplete?.(value);
    container.dispatchEvent(new CustomEvent('complete', {
      detail: { value },
      bubbles: true,
    }));
  }

  // ── Keyboard handler (event delegation) ────────────────────
  container.addEventListener('keydown', (e) => {
    if (!e.target.closest('.cs-slot')) return;

    switch (e.key) {
      case 'ArrowUp':
        e.stopPropagation(); e.preventDefault();
        cycleChar(-1);
        break;
      case 'ArrowDown':
        e.stopPropagation(); e.preventDefault();
        cycleChar(1);
        break;
      case 'ArrowLeft':
        e.stopPropagation(); e.preventDefault();
        goToSlot(activeIdx - 1);
        break;
      case 'ArrowRight':
        e.stopPropagation(); e.preventDefault();
        if (activeIdx < slots - 1) goToSlot(activeIdx + 1);
        else tryComplete();
        break;
      case 'Enter':
        e.stopPropagation(); e.preventDefault();
        if (activeIdx === slots - 1) tryComplete();
        else goToSlot(activeIdx + 1);
        break;
    }
  });

  render();

  return {
    getValue: () => values.map(i => charset[i]).join(''),
    reset() { values.fill(0); activeIdx = 0; windowStart = 0; render(); },
  };
}
