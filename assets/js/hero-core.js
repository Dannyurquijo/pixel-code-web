(() => {
  const canvas = document.getElementById('core-canvas');
  const stage = document.querySelector('[data-core-stage]');
  if (!canvas || !stage) return;

  const gl = canvas.getContext('webgl', { alpha: true, antialias: true, powerPreference: 'low-power' });
  if (!gl) return;

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const compact = matchMedia('(max-width: 800px)').matches;
  const vertexSource = `
    attribute vec3 aPosition;
    uniform float uTime;
    uniform vec2 uPointer;
    uniform float uPointSize;
    uniform float uMotion;
    uniform float uIntro;
    varying float vDepth;
    void main() {
      float ay = uTime * .09 * uMotion + uPointer.x * .10;
      float ax = -.18 + uPointer.y * .07;
      mat3 ry = mat3(cos(ay),0.,sin(ay), 0.,1.,0., -sin(ay),0.,cos(ay));
      mat3 rx = mat3(1.,0.,0., 0.,cos(ax),-sin(ax), 0.,sin(ax),cos(ax));
      vec3 p = rx * ry * (aPosition * mix(.08, 1., uIntro));
      float perspective = 3.8 / (5.2 - p.z);
      gl_Position = vec4(p.x * perspective, p.y * perspective, 0., 1.);
      gl_PointSize = uPointSize * perspective;
      vDepth = clamp((p.z + 2.4) / 4.8, 0., 1.);
    }`;
  const fragmentSource = `
    precision mediump float;
    uniform vec4 uColor;
    uniform float uRound;
    varying float vDepth;
    void main() {
      if (uRound > .5) {
        vec2 c = gl_PointCoord - .5;
        if (dot(c,c) > .25) discard;
        float halo = smoothstep(.25, .015, dot(c,c));
        gl_FragColor = vec4(uColor.rgb, uColor.a * halo * (.38 + vDepth * .62));
        return;
      }
      gl_FragColor = vec4(uColor.rgb, uColor.a * (.38 + vDepth * .62));
    }`;

  const compile = (type, source) => {
    const shader = gl.createShader(type); gl.shaderSource(shader, source); gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
    return shader;
  };

  let program;
  try {
    program = gl.createProgram(); gl.attachShader(program, compile(gl.VERTEX_SHADER, vertexSource)); gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragmentSource)); gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
  } catch (error) { console.warn('Digital Business Core fallback:', error); return; }

  document.documentElement.classList.add('webgl-ready');
  gl.useProgram(program); gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE); gl.disable(gl.DEPTH_TEST);
  const loc = {
    position: gl.getAttribLocation(program, 'aPosition'), time: gl.getUniformLocation(program, 'uTime'),
    pointer: gl.getUniformLocation(program, 'uPointer'), size: gl.getUniformLocation(program, 'uPointSize'),
    color: gl.getUniformLocation(program, 'uColor'), round: gl.getUniformLocation(program, 'uRound'), motion: gl.getUniformLocation(program, 'uMotion'), intro: gl.getUniformLocation(program, 'uIntro')
  };

  const seeded = (() => { let seed = 2947; return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646; })();
  const count = compact ? 18 : 34;
  const nodes = [[0,0,0]];
  for (let i = 0; i < count; i++) {
    const theta = seeded() * Math.PI * 2;
    const phi = Math.acos(2 * seeded() - 1);
    const radius = 1.25 + seeded() * 1.05;
    nodes.push([Math.sin(phi) * Math.cos(theta) * radius, Math.cos(phi) * radius, Math.sin(phi) * Math.sin(theta) * radius]);
  }

  const edgeVertices = [];
  nodes.slice(1).forEach((node, index) => {
    if (index < (compact ? 10 : 22) || index % 3 === 0) edgeVertices.push(0,0,0, ...node);
    const next = nodes[1 + ((index + 5) % count)];
    if (index % 2 === 0) edgeVertices.push(...node, ...next);
  });

  const cube = [];
  const s = .38;
  const corners = [[-s,-s,-s],[s,-s,-s],[s,s,-s],[-s,s,-s],[-s,-s,s],[s,-s,s],[s,s,s],[-s,s,s]];
  [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]].forEach(([a,b]) => cube.push(...corners[a],...corners[b]));
  const octahedron = [];
  const octa = [[0,.58,0],[.58,0,0],[0,0,.58],[-.58,0,0],[0,0,-.58],[0,-.58,0]];
  [[0,1],[0,2],[0,3],[0,4],[5,1],[5,2],[5,3],[5,4],[1,2],[2,3],[3,4],[4,1]].forEach(([a,b]) => octahedron.push(...octa[a],...octa[b]));
  const rings = [];
  const ringSegments = compact ? 42 : 72;
  for (let ring = 0; ring < 3; ring++) {
    for (let i = 0; i < ringSegments; i++) {
      const a = (i / ringSegments) * Math.PI * 2; const b = ((i + 1) / ringSegments) * Math.PI * 2; const radius = 1.02 + ring * .34;
      if (ring === 0) rings.push(Math.cos(a)*radius,Math.sin(a)*radius,0,Math.cos(b)*radius,Math.sin(b)*radius,0);
      if (ring === 1) rings.push(Math.cos(a)*radius,0,Math.sin(a)*radius,Math.cos(b)*radius,0,Math.sin(b)*radius);
      if (ring === 2) rings.push(0,Math.cos(a)*radius,Math.sin(a)*radius,0,Math.cos(b)*radius,Math.sin(b)*radius);
    }
  }

  const makeBuffer = (values, dynamic = false) => {
    const buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(values), dynamic ? gl.DYNAMIC_DRAW : gl.STATIC_DRAW); return buffer;
  };
  const edgeBuffer = makeBuffer(edgeVertices); const nodeBuffer = makeBuffer(nodes.flat()); const cubeBuffer = makeBuffer(cube); const octaBuffer = makeBuffer(octahedron); const ringBuffer = makeBuffer(rings); const streamBuffer = makeBuffer(new Array((compact ? 8 : 16) * 3).fill(0), true);
  const streamCount = compact ? 8 : 16;
  const streams = Array.from({ length: streamCount }, (_, i) => ({ target: 1 + (i * 7) % count, offset: seeded() }));

  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  if (!reduced) stage.addEventListener('pointermove', (event) => {
    const rect = stage.getBoundingClientRect(); pointer.tx = ((event.clientX - rect.left) / rect.width - .5) * 2; pointer.ty = ((event.clientY - rect.top) / rect.height - .5) * 2;
  }, { passive: true });
  stage.addEventListener('pointerleave', () => { pointer.tx = 0; pointer.ty = 0; }, { passive: true });

  const draw = (buffer, mode, vertices, color, size = 1, round = 0, intro = 1) => {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer); gl.enableVertexAttribArray(loc.position); gl.vertexAttribPointer(loc.position, 3, gl.FLOAT, false, 0, 0);
    gl.uniform4fv(loc.color, color); gl.uniform1f(loc.size, size); gl.uniform1f(loc.round, round); gl.uniform1f(loc.intro, intro); gl.drawArrays(mode, 0, vertices);
  };
  let visible = true; let raf = 0; let startTime = 0;
  const resize = () => {
    const dpr = Math.min(devicePixelRatio || 1, compact ? 1 : 1.5); const width = Math.round(canvas.clientWidth * dpr); const height = Math.round(canvas.clientHeight * dpr);
    if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; gl.viewport(0,0,width,height); }
  };
  const render = (now = 0) => {
    if (!visible || document.hidden) { raf = 0; return; }
    if (!startTime) startTime = now;
    resize(); pointer.x += (pointer.tx - pointer.x) * .045; pointer.y += (pointer.ty - pointer.y) * .045;
    gl.clearColor(0,0,0,0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform1f(loc.time, now / 1000); gl.uniform2f(loc.pointer, pointer.x, pointer.y); gl.uniform1f(loc.motion, reduced ? 0 : 1);
    const phase = reduced ? 1 : Math.min((now - startTime) / 2400, 1);
    const ease = 1 - Math.pow(1 - phase, 4);
    const edgeAlpha = .2 * Math.max(0, Math.min((phase - .18) * 2.3, 1));
    const coreAlpha = Math.max(0, Math.min((phase - .36) * 2.7, 1));
    draw(ringBuffer, gl.LINES, rings.length / 3, [.77,.63,.35,.11 * coreAlpha], 1, 0, ease);
    draw(edgeBuffer, gl.LINES, edgeVertices.length / 3, [.77,.63,.35,edgeAlpha], 1, 0, ease);
    draw(cubeBuffer, gl.LINES, cube.length / 3, [.77,.63,.35,.88 * coreAlpha], 1, 0, ease);
    draw(octaBuffer, gl.LINES, octahedron.length / 3, [.94,.79,.44,.62 * coreAlpha], 1, 0, ease);
    draw(nodeBuffer, gl.POINTS, nodes.length, [.94,.79,.44,.94], compact ? 7 : 9, 1, ease);
    const streamValues = [];
    streams.forEach((stream) => { const target = nodes[stream.target]; const t = reduced ? .65 : ((now / 3600 + stream.offset) % 1); streamValues.push(target[0] * t, target[1] * t, target[2] * t); });
    gl.bindBuffer(gl.ARRAY_BUFFER, streamBuffer); gl.bufferSubData(gl.ARRAY_BUFFER, 0, new Float32Array(streamValues));
    draw(streamBuffer, gl.POINTS, streamCount, [.91,.78,.46,Math.max(0,(phase-.58)*2.4)], compact ? 5 : 7, 1, ease);
    if (!reduced) raf = requestAnimationFrame(render);
  };

  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; if (visible && !raf) raf = requestAnimationFrame(render); }, { threshold: .01 }).observe(stage);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && visible && !raf) raf = requestAnimationFrame(render); });
  addEventListener('resize', resize, { passive: true });
  if (reduced) render(0); else raf = requestAnimationFrame(render);
})();
