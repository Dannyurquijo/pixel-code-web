"use client";

import { useEffect, useRef } from "react";

type NetworkNode = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  depth: number;
  size: number;
  phase: number;
  tone: number;
  px?: number;
  py?: number;
  renderDepth?: number;
};

type Ripple = { x: number; y: number; radius: number; alpha: number };

const GOLD = [197, 160, 89] as const;
const IVORY = [240, 213, 138] as const;

export function AmbientNetwork() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d", { alpha: true });
    if (!context) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const coarsePointer = window.matchMedia("(pointer: coarse)");
    const pointer = { x: 0, y: 0, active: false, strength: 0 };
    const ripples: Ripple[] = [];
    let nodes: NetworkNode[] = [];
    let width = 0;
    let height = 0;
    let dpr = 1;
    let frame = 0;
    let lastTime = performance.now();
    let lastFrame = 0;
    let visible = !document.hidden;

    const rgba = (color: readonly number[], alpha: number) =>
      `rgba(${color[0]},${color[1]},${color[2]},${alpha})`;
    const mix = (amount: number) =>
      GOLD.map((value, index) => Math.round(value + (IVORY[index] - value) * amount));

    const randomNode = (): NetworkNode => {
      const depth = 0.35 + Math.random() * 0.65;
      const angle = Math.random() * Math.PI * 2;
      const velocity = 0.08 + Math.random() * 0.22;
      return {
        x: Math.random() * width,
        y: Math.random() * height,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity,
        depth,
        size: 0.55 + depth * 1.35,
        phase: Math.random() * Math.PI * 2,
        tone: Math.random(),
      };
    };

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, width < 768 ? 1 : 1.25);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      const areaCount = Math.round((width * height) / 28000);
      const minimum = width < 520 ? 16 : width < 768 ? 24 : 36;
      const target = Math.max(minimum, Math.min(width < 768 ? 28 : 48, areaCount));
      if (nodes.length > target) nodes.length = target;
      while (nodes.length < target) nodes.push(randomNode());
    };

    const draw = (time: number) => {
      if (!visible) return;
      const frameInterval = coarsePointer.matches ? 50 : 33.3;
      if (lastFrame && time - lastFrame < frameInterval) {
        frame = requestAnimationFrame(draw);
        return;
      }
      lastFrame = time;
      const delta = Math.min(2, (time - lastTime) / 16.67 || 1);
      lastTime = time;
      pointer.strength += ((pointer.active ? 1 : 0) - pointer.strength) * 0.065 * delta;
      context.clearRect(0, 0, width, height);
      const centerX = width * 0.5;
      const centerY = height * 0.5;
      const motion = reducedMotion.matches ? 0 : 1;

      if (pointer.strength > 0.01) {
        const halo = context.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, 150);
        halo.addColorStop(0, `rgba(197,160,89,${0.045 * pointer.strength})`);
        halo.addColorStop(1, "rgba(197,160,89,0)");
        context.fillStyle = halo;
        context.fillRect(pointer.x - 150, pointer.y - 150, 300, 300);
      }

      for (const node of nodes) {
        const dxCenter = centerX - node.x;
        const dyCenter = centerY - node.y;
        node.vx += dxCenter * 0.00004 * delta;
        node.vy += dyCenter * 0.00004 * delta;
        node.vx += -dyCenter * 0.0008 * 0.0008 * delta;
        node.vy += dxCenter * 0.0008 * 0.0008 * delta;
        if (pointer.strength > 0.01) {
          const dx = node.x - pointer.x;
          const dy = node.y - pointer.y;
          const distance = Math.hypot(dx, dy) || 1;
          if (distance < 175) {
            const force = (1 - distance / 175) * 0.018 * pointer.strength * node.depth;
            node.vx += (dx / distance) * force * delta;
            node.vy += (dy / distance) * force * delta;
          }
        }
        const velocity = Math.hypot(node.vx, node.vy);
        if (velocity > 0.52) {
          node.vx = (node.vx / velocity) * 0.52;
          node.vy = (node.vy / velocity) * 0.52;
        }
        node.vx *= 0.998;
        node.vy *= 0.998;
        node.x += node.vx * 0.26 * delta * motion;
        node.y += node.vy * 0.26 * delta * motion;
        if (node.x < -30) node.x = width + 30;
        if (node.x > width + 30) node.x = -30;
        if (node.y < -30) node.y = height + 30;
        if (node.y > height + 30) node.y = -30;
        node.renderDepth = Math.max(0.18, Math.min(1.12, node.depth + Math.sin(time * 0.00018 + node.phase) * 0.1));
        const perspective = 0.82 + node.renderDepth * 0.28;
        node.px = centerX + (node.x - centerX) * perspective - (pointer.x - centerX) * 0.026 * node.renderDepth * pointer.strength;
        node.py = centerY + (node.y - centerY) * perspective - (pointer.y - centerY) * 0.018 * node.renderDepth * pointer.strength;
      }

      const linkDistance = width < 768 ? 128 : 165;
      context.lineWidth = 0.6;
      for (let i = 0; i < nodes.length; i += 1) {
        for (let j = i + 1; j < nodes.length; j += 1) {
          const a = nodes[i];
          const b = nodes[j];
          const distance = Math.hypot((a.px ?? 0) - (b.px ?? 0), (a.py ?? 0) - (b.py ?? 0));
          if (distance > linkDistance) continue;
          const proximity = 1 - distance / linkDistance;
          const midpointX = ((a.px ?? 0) + (b.px ?? 0)) * 0.5;
          const midpointY = ((a.py ?? 0) + (b.py ?? 0)) * 0.5;
          const pointerBoost = pointer.strength * Math.max(0, 1 - Math.hypot(midpointX - pointer.x, midpointY - pointer.y) / 230);
          context.strokeStyle = rgba(mix((a.tone + b.tone + 0.62) / 3), (proximity * 0.22 + pointerBoost * 0.12) * Math.min(a.depth, b.depth));
          context.beginPath();
          context.moveTo(a.px ?? 0, a.py ?? 0);
          context.lineTo(b.px ?? 0, b.py ?? 0);
          context.stroke();
        }
      }

      for (const node of nodes) {
        const flicker = 0.72 + Math.sin(time * 0.0008 + node.phase) * 0.18;
        const color = mix((node.tone + 0.62) * 0.5);
        context.fillStyle = rgba(color, (0.31 + node.depth * 0.39) * flicker);
        context.beginPath();
        context.arc(node.px ?? 0, node.py ?? 0, node.size * (0.72 + (node.renderDepth ?? 1) * 0.5), 0, Math.PI * 2);
        context.fill();
      }

      for (let i = ripples.length - 1; i >= 0; i -= 1) {
        const ripple = ripples[i];
        ripple.radius += 2.1 * delta;
        ripple.alpha -= 0.009 * delta;
        if (ripple.alpha <= 0) {
          ripples.splice(i, 1);
          continue;
        }
        context.strokeStyle = `rgba(197,160,89,${ripple.alpha})`;
        context.lineWidth = 0.75;
        context.beginPath();
        context.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2);
        context.stroke();
      }
      if (!reducedMotion.matches) frame = requestAnimationFrame(draw);
    };

    const start = () => {
      cancelAnimationFrame(frame);
      lastTime = performance.now();
      lastFrame = 0;
      if (reducedMotion.matches) draw(lastTime);
      else frame = requestAnimationFrame(draw);
    };
    const onPointerMove = (event: PointerEvent) => {
      if (coarsePointer.matches || reducedMotion.matches) return;
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      pointer.active = true;
    };
    const onPointerDown = (event: PointerEvent) => {
      if (coarsePointer.matches || reducedMotion.matches) return;
      ripples.push({ x: event.clientX, y: event.clientY, radius: 8, alpha: 0.24 });
    };
    const onResize = () => { resize(); start(); };
    const onVisibility = () => {
      visible = !document.hidden;
      if (visible) start();
      else cancelAnimationFrame(frame);
    };
    const onPointerLeave = () => { pointer.active = false; };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerdown", onPointerDown, { passive: true });
    window.addEventListener("resize", onResize, { passive: true });
    document.documentElement.addEventListener("pointerleave", onPointerLeave);
    document.addEventListener("visibilitychange", onVisibility);
    reducedMotion.addEventListener?.("change", start);
    resize();
    start();

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("resize", onResize);
      document.documentElement.removeEventListener("pointerleave", onPointerLeave);
      document.removeEventListener("visibilitychange", onVisibility);
      reducedMotion.removeEventListener?.("change", start);
    };
  }, []);

  return <canvas ref={canvasRef} id="ambient-canvas" aria-hidden="true" />;
}
