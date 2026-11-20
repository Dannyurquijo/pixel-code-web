(() => {
  'use strict';

  const canvas = document.getElementById('engineering-canvas');
  const scene = canvas.parentElement;
  const hero = scene.closest('.hero');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = matchMedia('(max-width: 850px), (pointer: coarse)');
  const connection = navigator.connection;
  let unmount = null;

  function buildMesh(compact) {
    const levels = [
      { y: -1.15, r: 1.34 },
      { y: -.67, r: 1.16 },
      { y: -.19, r: .97 },
      { y: .29, r: .78 },
      { y: .77, r: .59 },
      { y: 1.25, r: .4 },
    ];
    const vertices = [];
    const outlines = [];
    const grid = [];
    const edgeNodes = [];
    const markers = [];
    const axis = [];
    const steps = compact ? 2 : 4;

    levels.forEach(({ y, r }, level) => {
      const start = vertices.length;
      const stride = steps + 1;

      for (let row = 0; row <= steps; row++) {
        for (let column = 0; column <= steps; column++) {
          const index = vertices.length;
          vertices.push([r * (2 * column / steps - 1), y, r * (2 * row / steps - 1)]);
          if (column < steps) (row === 0 || row === steps ? outlines : grid).push([index, index + 1]);
          if (row < steps) (column === 0 || column === steps ? outlines : grid).push([index, index + stride]);
        }
      }

      const corners = [start, start + steps, start + steps * stride, vertices.length - 1];
      const middle = start + steps / 2 * (stride + 1);
      const previousMiddle = middle - stride * stride;
      edgeNodes.push(...corners);
      markers.push(middle, corners[level % corners.length]);
      axis.push(middle);

      if (level > 0) {
        const offset = stride * stride;
        for (const corner of corners) {
          grid.push([corner, corner - offset]);
          if (!compact) grid.push([corner, previousMiddle]);
        }
        outlines.push([middle, previousMiddle]);
      }
    });

    return { vertices, outlines, grid, edgeNodes, markers, axis };
  }

  function paint(context, mesh, projected, width, height, time, pointerX, pointerY) {
    const yaw = .67 + Math.sin(time * .39) * .17 + pointerX * .1;
    const pitch = .43 + Math.sin(time * .56) * .042 + pointerY * .08;
    const sinYaw = Math.sin(yaw);
    const cosYaw = Math.cos(yaw);
    const sinPitch = Math.sin(pitch);
    const cosPitch = Math.cos(pitch);
    const scale = Math.min(width * .24, height * .25);
    const centerX = width * .51;
    const centerY = height * .45 + Math.sin(time * .7) * scale * .04;

    context.clearRect(0, 0, width, height);
    mesh.vertices.forEach(([x, y, z], index) => {
      const depth = z * cosYaw - x * sinYaw;
      const distance = 5.8 / (5.8 - depth * cosPitch - y * sinPitch);
      const point = projected[index];
      point.x = centerX + (x * cosYaw + z * sinYaw) * scale * distance;
      point.y = centerY - (y * cosPitch - depth * sinPitch) * scale * distance;
    });

    function stroke(segments, color, lineWidth) {
      context.beginPath();
      for (const [start, end] of segments) {
        context.moveTo(projected[start].x, projected[start].y);
        context.lineTo(projected[end].x, projected[end].y);
      }
      context.strokeStyle = color;
      context.lineWidth = lineWidth;
      context.stroke();
    }

    function dots(nodes, color, radius) {
      context.beginPath();
      for (const index of nodes) {
        const { x, y } = projected[index];
        context.moveTo(x + radius, y);
        context.arc(x, y, radius, 0, Math.PI * 2);
      }
      context.fillStyle = color;
      context.fill();
    }

    stroke(mesh.outlines, 'rgba(197, 160, 89, .09)', 5);
    stroke(mesh.grid, 'rgba(197, 160, 89, .28)', .8);
    stroke(mesh.outlines, 'rgba(216, 181, 106, .68)', 1.15);
    dots(mesh.edgeNodes, 'rgba(240, 213, 138, .89)', 1.6);
    dots(mesh.markers, 'rgba(197, 160, 89, .16)', 4.5);
    dots(mesh.markers, `rgba(240, 213, 138, ${.73 + .11 * Math.sin(time * 1.2)})`, 2);

    // A short pulse travels along the vertical connections of the mesh.
    if (time === 0) return;
    const cycle = time % 5.8 / 5.8;
    const step = cycle * (mesh.axis.length - 1);
    const level = Math.floor(step);
    const start = projected[mesh.axis[level]];
    const end = projected[mesh.axis[level + 1]];
    const fraction = step - level;
    const x = start.x + (end.x - start.x) * fraction;
    const y = start.y + (end.y - start.y) * fraction;
    const glow = Math.sin(cycle * Math.PI);
    context.beginPath();
    context.arc(x, y, 9, 0, Math.PI * 2);
    context.fillStyle = `rgba(197, 160, 89, ${glow * .2})`;
    context.fill();
    context.beginPath();
    context.arc(x, y, 2.8, 0, Math.PI * 2);
    context.fillStyle = `rgba(255, 237, 184, ${glow * .95})`;
    context.fill();
  }

  function mount() {
    const context = canvas.getContext('2d', { alpha: true });
    if (!context) return null;

    const events = new AbortController();
    const passive = { signal: events.signal, passive: true };
    const compact = mobile.matches;
    const mesh = buildMesh(compact);
    const projected = mesh.vertices.map(() => ({ x: 0, y: 0 }));
    const interval = compact ? 1000 / 24 : 1000 / 30;
    let visible = false;
    let frame = 0;
    let lastFrame = 0;
    let time = 0;
    let slowFrames = 0;
    let width = 0;
    let height = 0;
    let targetX = 0;
    let targetY = 0;
    let pointerX = 0;
    let pointerY = 0;

    function render(now) {
      const elapsed = lastFrame ? now - lastFrame : interval;

      if (elapsed >= interval - 2) {
        lastFrame = now;
        slowFrames = elapsed > 75 ? slowFrames + 1 : Math.max(0, slowFrames - 1);
        if (slowFrames >= 16) {
          stop();
          return;
        }

        time += Math.min(elapsed, 75) / 1000;
        pointerX += (targetX - pointerX) * .09;
        pointerY += (targetY - pointerY) * .09;
        paint(context, mesh, projected, width, height, time, pointerX, pointerY);
      }
      frame = requestAnimationFrame(render);
    }

    function resize() {
      width = scene.clientWidth;
      height = scene.clientHeight;
      const dpr = Math.min(devicePixelRatio || 1, compact ? 1 : 1.5);
      canvas.width = Math.ceil(width * dpr);
      canvas.height = Math.ceil(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (width && height) paint(context, mesh, projected, width, height, time, pointerX, pointerY);
    }

    function sync() {
      if (visible && !document.hidden) {
        if (!frame) frame = requestAnimationFrame(render);
      } else {
        cancelAnimationFrame(frame);
        frame = 0;
        lastFrame = 0;
      }
    }

    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      sync();
    });
    const size = new ResizeObserver(resize);
    const removal = new MutationObserver(() => {
      if (!scene.isConnected || !canvas.isConnected) stop();
    });

    intersection.observe(hero);
    size.observe(scene);
    removal.observe(document.body, { childList: true, subtree: true });
    document.addEventListener('visibilitychange', sync, passive);
    hero.addEventListener('pointermove', (event) => {
      if (event.pointerType !== 'mouse') return;
      const rect = hero.getBoundingClientRect();
      targetX = (event.clientX - rect.left) / rect.width * 2 - 1;
      targetY = (event.clientY - rect.top) / rect.height * 2 - 1;
    }, passive);
    hero.addEventListener('pointerleave', () => {
      targetX = 0;
      targetY = 0;
    }, passive);

    resize();
    scene.classList.add('is-animated');

    return () => {
      events.abort();
      intersection.disconnect();
      size.disconnect();
      removal.disconnect();
      cancelAnimationFrame(frame);
      scene.classList.remove('is-animated');
      canvas.width = 0;
      canvas.height = 0;
    };
  }

  function stop() {
    unmount?.();
    unmount = null;
  }

  function configure() {
    stop();
    const slow = connection?.saveData || ['slow-2g', '2g', '3g'].includes(connection?.effectiveType);
    if (!reducedMotion.matches && !slow && canvas.isConnected) unmount = mount();
  }

  reducedMotion.addEventListener('change', configure);
  mobile.addEventListener('change', configure);
  connection?.addEventListener('change', configure);
  addEventListener('pagehide', stop);
  addEventListener('pageshow', (event) => {
    if (event.persisted) configure();
  });
  configure();
})();
