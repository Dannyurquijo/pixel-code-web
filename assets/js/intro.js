(() => {
  'use strict';

  const intro = document.querySelector('[data-site-intro]');
  const canvas = document.getElementById('intro-canvas');
  if (!intro || !canvas) return;

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let introSeen = false;
  try { introSeen = sessionStorage.getItem('du:intro-seen') === '1'; } catch (_) { /* Storage can be blocked. */ }
  if (reduced || introSeen) {
    intro.remove();
    return;
  }
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) {
    intro.remove();
    window.dispatchEvent(new CustomEvent('du:intro-complete'));
    return;
  }
  const counter = intro.querySelector('[data-intro-counter]');
  const skip = intro.querySelector('[data-intro-skip]');
  let width = 0;
  let height = 0;
  let dpr = 1;
  let start = 0;
  let raf = 0;
  let finished = false;
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  const particleCount = matchMedia('(max-width: 700px)').matches ? 52 : 84;
  const particles = Array.from({ length: particleCount }, () => ({
    x: (Math.random() - .5) * 18,
    y: (Math.random() - .5) * 11,
    z: .8 + Math.random() * 17,
    length: .25 + Math.random() * .85,
    size: .45 + Math.random() * 1.2
  }));

  document.body.classList.add('intro-lock');

  function resize() {
    width = innerWidth;
    height = innerHeight;
    dpr = Math.min(devicePixelRatio || 1, width < 700 ? 1 : 1.5);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  const project = (x, y, z, focal = Math.min(width, height) * .68) => ({
    x: width * .5 + (x + pointer.x * z * .018) * focal / z,
    y: height * .5 + (y + pointer.y * z * .012) * focal / z
  });

  function rotatePoint(point, ax, ay) {
    const cosY = Math.cos(ay); const sinY = Math.sin(ay);
    const cosX = Math.cos(ax); const sinX = Math.sin(ax);
    const x = point[0] * cosY - point[2] * sinY;
    const z = point[0] * sinY + point[2] * cosY;
    return [x, point[1] * cosX - z * sinX, point[1] * sinX + z * cosX + 7];
  }

  function drawCore(time, reveal) {
    const size = 1.18;
    const points = [[-size,-size,-size],[size,-size,-size],[size,size,-size],[-size,size,-size],[-size,-size,size],[size,-size,size],[size,size,size],[-size,size,size]];
    const edges = [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]];
    const rotation = time * .00022;
    const transformed = points.map(point => rotatePoint(point, -.25 + pointer.y * .025, rotation + pointer.x * .035));
    ctx.lineWidth = 1;
    for (const [a,b] of edges) {
      const pa = project(...transformed[a]);
      const pb = project(...transformed[b]);
      ctx.strokeStyle = `rgba(240,213,138,${.08 + reveal * .65})`;
      ctx.beginPath(); ctx.moveTo(pa.x,pa.y); ctx.lineTo(pb.x,pb.y); ctx.stroke();
    }
    for (const point of transformed) {
      const p = project(...point);
      ctx.fillStyle = `rgba(240,213,138,${.3 + reveal * .65})`;
      ctx.beginPath(); ctx.arc(p.x,p.y,1.2 + reveal * 1.1,0,Math.PI*2); ctx.fill();
    }
  }

  function render(now) {
    if (!start) start = now;
    const elapsed = now - start;
    const progress = Math.min(elapsed / 1500, 1);
    const reveal = Math.max(0, Math.min((elapsed - 100) / 650, 1));
    pointer.x += (pointer.tx - pointer.x) * .035;
    pointer.y += (pointer.ty - pointer.y) * .035;
    ctx.fillStyle = '#030303';
    ctx.fillRect(0,0,width,height);

    const glow = ctx.createRadialGradient(width*.5,height*.5,0,width*.5,height*.5,Math.min(width,height)*.52);
    glow.addColorStop(0,`rgba(197,160,89,${.07 + reveal*.05})`);
    glow.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle = glow; ctx.fillRect(0,0,width,height);

    for (const particle of particles) {
      particle.z -= .032 + progress * .075;
      if (particle.z < .55) {
        particle.z = 17;
        particle.x = (Math.random() - .5) * 18;
        particle.y = (Math.random() - .5) * 11;
      }
      const head = project(particle.x,particle.y,particle.z);
      const tail = project(particle.x,particle.y,particle.z + particle.length + progress * .8);
      const alpha = Math.min(.62,(1 - particle.z/18) * .78) * reveal;
      ctx.strokeStyle = `rgba(197,160,89,${alpha})`;
      ctx.lineWidth = particle.size;
      ctx.beginPath(); ctx.moveTo(tail.x,tail.y); ctx.lineTo(head.x,head.y); ctx.stroke();
      ctx.fillStyle = `rgba(240,213,138,${alpha + .12})`;
      ctx.beginPath(); ctx.arc(head.x,head.y,particle.size*.65,0,Math.PI*2); ctx.fill();
    }
    drawCore(elapsed, reveal);

    const numeric = Math.min(100, Math.round(progress * 100));
    if (counter) counter.textContent = String(numeric).padStart(3,'0');
    intro.style.setProperty('--intro-progress', `${numeric}%`);
    if (!finished) raf = requestAnimationFrame(render);
  }

  function finish() {
    if (finished) return;
    finished = true;
    cancelAnimationFrame(raf);
    intro.classList.add('is-exiting');
    document.body.classList.remove('intro-lock');
    try { sessionStorage.setItem('du:intro-seen', '1'); } catch (_) { /* Storage can be blocked. */ }
    window.dispatchEvent(new CustomEvent('du:intro-complete'));
    setTimeout(() => intro.remove(), 760);
  }

  addEventListener('pointermove', event => {
    pointer.tx = (event.clientX / width - .5) * 2;
    pointer.ty = (event.clientY / height - .5) * 2;
  }, { passive: true });
  addEventListener('resize', resize, { passive: true });
  skip?.addEventListener('click', finish);
  addEventListener('keydown', event => { if (event.key === 'Escape') finish(); });

  resize();
  raf = requestAnimationFrame(render);
  setTimeout(finish, 1850);
})();
