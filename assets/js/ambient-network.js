(() => {
  'use strict';

  const canvas = document.getElementById('ambient-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const coarsePointer = window.matchMedia('(pointer: coarse)');
  const GOLD = [197, 160, 89];
  const CYAN = [240, 213, 138];
  const modes = {
    hero:           { cyan: .62, links: .22, pull: .00004, swirl: .0008, speed: .26 },
    fragmented:     { cyan: .20, links: .11, pull: -.00001, swirl: 0, speed: .18 },
    convergence:    { cyan: .72, links: .29, pull: .00012, swirl: .0012, speed: .22 },
    architecture:   { cyan: .48, links: .18, pull: .00003, swirl: 0, speed: .16 },
    orbit:          { cyan: .78, links: .27, pull: .00008, swirl: .0022, speed: .22 },
    data:           { cyan: .86, links: .22, pull: .00002, swirl: 0, speed: .28 },
    human:          { cyan: .42, links: .16, pull: 0, swirl: 0, speed: .14 },
    finale:         { cyan: .35, links: .31, pull: .00016, swirl: .0011, speed: .2 }
  };

  const sections = [
    ['#inicio', 'hero'], ['#problema', 'fragmented'], ['.transformation', 'convergence'],
    ['#soluciones', 'architecture'], ['#ecosistema', 'orbit'], ['.cases', 'data'],
    ['#proceso', 'human'], ['#tecnologia', 'data'], ['#contacto', 'finale']
  ].map(([selector, mode]) => [document.querySelector(selector), mode]).filter(([element]) => element);

  let width = 0;
  let height = 0;
  let dpr = 1;
  let nodes = [];
  let raf = 0;
  let lastTime = performance.now();
  let lastFrame = 0;
  let activeMode = 'hero';
  let modeBlend = { ...modes.hero };
  let visible = !document.hidden;
  const pointer = { x: 0, y: 0, active: false, strength: 0 };
  const ripples = [];

  const randomNode = () => {
    const depth = .35 + Math.random() * .65;
    const angle = Math.random() * Math.PI * 2;
    const velocity = .08 + Math.random() * .22;
    return {
      x: Math.random() * width,
      y: Math.random() * height,
      vx: Math.cos(angle) * velocity,
      vy: Math.sin(angle) * velocity,
      depth,
      size: .55 + depth * 1.35,
      phase: Math.random() * Math.PI * 2,
      cyan: Math.random()
    };
  };

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, width < 768 ? 1 : 1.25);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const areaCount = Math.round((width * height) / 28000);
    const minimum = width < 520 ? 16 : width < 768 ? 24 : 36;
    const target = Math.max(minimum, Math.min(width < 768 ? 28 : 48, areaCount));
    if (nodes.length > target) nodes.length = target;
    while (nodes.length < target) nodes.push(randomNode());
  }

  function updateMode() {
    const focus = window.scrollY + height * .52;
    let closest = Infinity;
    for (const [element, mode] of sections) {
      const center = element.offsetTop + element.offsetHeight * .5;
      const distance = Math.abs(center - focus);
      if (distance < closest) {
        closest = distance;
        activeMode = mode;
      }
    }
  }

  const rgba = (color, alpha) => `rgba(${color[0]},${color[1]},${color[2]},${alpha})`;
  const mix = (a, b, amount) => a.map((value, index) => Math.round(value + (b[index] - value) * amount));

  function draw(time) {
    if (!visible) return;
    const frameInterval = coarsePointer.matches ? 50 : 33.3;
    if (lastFrame && time - lastFrame < frameInterval) {
      raf = requestAnimationFrame(draw);
      return;
    }
    lastFrame = time;
    const delta = Math.min(2, (time - lastTime) / 16.67 || 1);
    lastTime = time;
    const target = modes[activeMode];
    for (const key of Object.keys(target)) modeBlend[key] += (target[key] - modeBlend[key]) * .025 * delta;
    pointer.strength += ((pointer.active ? 1 : 0) - pointer.strength) * .065 * delta;

    ctx.clearRect(0, 0, width, height);
    const centerX = width * .5;
    const centerY = height * .5;
    const motion = reducedMotion.matches ? 0 : 1;

    if (pointer.strength > .01) {
      const halo = ctx.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, 150);
      halo.addColorStop(0, `rgba(197,160,89,${.045 * pointer.strength})`);
      halo.addColorStop(1, 'rgba(197,160,89,0)');
      ctx.fillStyle = halo;
      ctx.fillRect(pointer.x - 150, pointer.y - 150, 300, 300);
    }

    for (const node of nodes) {
      const dxCenter = centerX - node.x;
      const dyCenter = centerY - node.y;
      node.vx += dxCenter * modeBlend.pull * delta;
      node.vy += dyCenter * modeBlend.pull * delta;
      node.vx += -dyCenter * modeBlend.swirl * .0008 * delta;
      node.vy += dxCenter * modeBlend.swirl * .0008 * delta;

      if (pointer.strength > .01) {
        const dx = node.x - pointer.x;
        const dy = node.y - pointer.y;
        const distance = Math.hypot(dx, dy) || 1;
        if (distance < 175) {
          const force = (1 - distance / 175) * .018 * pointer.strength * node.depth;
          node.vx += (dx / distance) * force * delta;
          node.vy += (dy / distance) * force * delta;
        }
      }

      const maxVelocity = .52;
      const velocity = Math.hypot(node.vx, node.vy);
      if (velocity > maxVelocity) {
        node.vx = node.vx / velocity * maxVelocity;
        node.vy = node.vy / velocity * maxVelocity;
      }
      node.vx *= .998;
      node.vy *= .998;
      node.x += node.vx * modeBlend.speed * delta * motion;
      node.y += node.vy * modeBlend.speed * delta * motion;
      if (node.x < -30) node.x = width + 30;
      if (node.x > width + 30) node.x = -30;
      if (node.y < -30) node.y = height + 30;
      if (node.y > height + 30) node.y = -30;
      node.renderDepth = Math.max(.18, Math.min(1.12, node.depth + Math.sin(time * .00018 + node.phase) * .1));
      const perspective = .82 + node.renderDepth * .28;
      node.px = centerX + (node.x - centerX) * perspective - (pointer.x - centerX) * .026 * node.renderDepth * pointer.strength;
      node.py = centerY + (node.y - centerY) * perspective - (pointer.y - centerY) * .018 * node.renderDepth * pointer.strength;
    }

    const linkDistance = width < 768 ? 128 : 165;
    ctx.lineWidth = .6;
    for (let i = 0; i < nodes.length; i += 1) {
      for (let j = i + 1; j < nodes.length; j += 1) {
        const a = nodes[i];
        const b = nodes[j];
        const distance = Math.hypot(a.px - b.px, a.py - b.py);
        if (distance > linkDistance) continue;
        const proximity = 1 - distance / linkDistance;
        const pointerBoost = pointer.strength * Math.max(0, 1 - Math.hypot((a.px + b.px) * .5 - pointer.x, (a.py + b.py) * .5 - pointer.y) / 230);
        const tone = ((a.cyan + b.cyan) * .5 + modeBlend.cyan) * .5;
        ctx.strokeStyle = rgba(mix(GOLD, CYAN, tone), (proximity * modeBlend.links + pointerBoost * .12) * Math.min(a.depth, b.depth));
        ctx.beginPath();
        ctx.moveTo(a.px, a.py);
        ctx.lineTo(b.px, b.py);
        ctx.stroke();
      }
    }

    for (const node of nodes) {
      const flicker = .72 + Math.sin(time * .0008 + node.phase) * .18;
      const tone = (node.cyan + modeBlend.cyan) * .5;
      const color = mix(GOLD, CYAN, tone);
      ctx.fillStyle = rgba(color, (.31 + node.depth * .39) * flicker);
      ctx.beginPath();
      ctx.arc(node.px, node.py, node.size * (.72 + node.renderDepth * .5), 0, Math.PI * 2);
      ctx.fill();
      if (node.depth > .82) {
        ctx.fillStyle = rgba(color, .05);
        ctx.beginPath();
        ctx.arc(node.px, node.py, node.size * 4.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    for (let i = ripples.length - 1; i >= 0; i -= 1) {
      const ripple = ripples[i];
      ripple.radius += 2.1 * delta;
      ripple.alpha -= .009 * delta;
      if (ripple.alpha <= 0) {
        ripples.splice(i, 1);
        continue;
      }
      ctx.strokeStyle = `rgba(197,160,89,${ripple.alpha})`;
      ctx.lineWidth = .75;
      ctx.beginPath();
      ctx.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (!reducedMotion.matches) raf = requestAnimationFrame(draw);
  }

  function start() {
    cancelAnimationFrame(raf);
    lastTime = performance.now();
    lastFrame = 0;
    if (reducedMotion.matches) draw(lastTime);
    else raf = requestAnimationFrame(draw);
  }

  window.addEventListener('pointermove', event => {
    if (coarsePointer.matches || reducedMotion.matches) return;
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    pointer.active = true;
  }, { passive: true });
  document.documentElement.addEventListener('pointerleave', () => { pointer.active = false; });
  window.addEventListener('pointerdown', event => {
    if (coarsePointer.matches || reducedMotion.matches) return;
    ripples.push({ x: event.clientX, y: event.clientY, radius: 8, alpha: .24 });
  }, { passive: true });
  window.addEventListener('scroll', updateMode, { passive: true });
  window.addEventListener('resize', () => { resize(); updateMode(); start(); }, { passive: true });
  document.addEventListener('visibilitychange', () => {
    visible = !document.hidden;
    if (visible) start();
    else cancelAnimationFrame(raf);
  });
  reducedMotion.addEventListener?.('change', start);

  resize();
  updateMode();
  start();
})();
