export function createSparkline(container, opts = {}) {
  const cssW = opts.width  || container.clientWidth  || 560;
  const cssH = opts.height || 80;
  const pad  = 10; // canvas-space padding

  const wrapper = document.createElement('div');
  wrapper.className = 'sparkline-wrapper';
  wrapper.style.cssText = `position:relative;width:${cssW}px;height:${cssH}px;flex-shrink:0;`;

  const canvas = document.createElement('canvas');
  canvas.width  = cssW * 2;   // 2× DPR
  canvas.height = cssH * 2;
  canvas.style.cssText = `width:${cssW}px;height:${cssH}px;display:block;`;

  const dot = document.createElement('div');
  dot.className  = 'sparkline-dot';
  dot.style.display = 'none';

  wrapper.appendChild(canvas);
  wrapper.appendChild(dot);
  container.appendChild(wrapper);

  const ctx = canvas.getContext('2d');
  let _rafId = 0;

  function _draw(points) {
    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    if (!points || points.length < 2) {
      dot.style.display = 'none';
      return;
    }

    const vals  = points.map(p => p.p);
    const min   = Math.min(...vals);
    const max   = Math.max(...vals);
    const span  = max - min || 1;
    const color = vals[vals.length - 1] >= vals[0] ? '#00FFA3' : '#FF4757';
    const rgb   = color === '#00FFA3' ? '0,255,163' : '255,71,87';

    const xOf = (i) => (i / (vals.length - 1)) * (W - pad * 2) + pad;
    const yOf = (v) => H - pad - ((v - min) / span) * (H - pad * 2);

    // Line
    ctx.beginPath();
    ctx.moveTo(xOf(0), yOf(vals[0]));
    for (let i = 1; i < vals.length; i++) ctx.lineTo(xOf(i), yOf(vals[i]));
    ctx.strokeStyle = color;
    ctx.lineWidth   = 3;
    ctx.lineJoin    = 'round';
    ctx.lineCap     = 'round';
    ctx.stroke();

    // Gradient fill
    const endX = xOf(vals.length - 1);
    const grad  = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, `rgba(${rgb},0.28)`);
    grad.addColorStop(1, `rgba(${rgb},0)`);

    ctx.beginPath();
    ctx.moveTo(xOf(0), yOf(vals[0]));
    for (let i = 1; i < vals.length; i++) ctx.lineTo(xOf(i), yOf(vals[i]));
    ctx.lineTo(endX, H);
    ctx.lineTo(xOf(0), H);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // CSS dot (canvas coords → CSS coords: divide by 2)
    const dotSize = 10;
    const dotCssX = endX / 2;
    const dotCssY = yOf(vals[vals.length - 1]) / 2;
    dot.style.display    = 'block';
    dot.style.left       = `${dotCssX - dotSize / 2}px`;
    dot.style.top        = `${dotCssY - dotSize / 2}px`;
    dot.style.background = color;
    dot.style.boxShadow  = `0 0 6px ${color}, 0 0 12px ${color}`;
  }

  return {
    update(points) {
      if (_rafId) cancelAnimationFrame(_rafId);
      _rafId = requestAnimationFrame(() => {
        _rafId = 0;
        _draw(points || []);
      });
    },
    destroy() {
      if (_rafId) cancelAnimationFrame(_rafId);
      wrapper.remove();
    },
  };
}
