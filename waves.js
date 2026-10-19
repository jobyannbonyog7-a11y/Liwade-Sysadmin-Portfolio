/* Ocean background: layered waves along the bottom of the screen.
   The front wave is a real spring simulation, so it splashes when you click,
   move the mouse over it, or scroll. Droplets fly off the crest. */
(function () {
  const cv = document.getElementById('sea');
  if (!cv) return;
  const ctx = cv.getContext('2d');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const STEP = 8, rnd = (a, b) => a + Math.random() * (b - a);
  let W, H, N, h, v, base, drops = [], t = 0, last = 0, running = true, autoTimer = 2000, lastY = 0, mouseX = 0, mouseY = 0;

  function init() {
    W = cv.width = innerWidth; H = cv.height = innerHeight;
    N = Math.ceil(W / STEP) + 1; h = new Float32Array(N); v = new Float32Array(N);
    base = H - Math.min(H * .2, 190);
  }

  function impulse(x, power, radius = 4) {
    const c = Math.round(x / STEP);
    for (let i = -radius; i <= radius; i++) if (c + i >= 0 && c + i < N) v[c + i] -= power * Math.cos(i / radius * 1.5) * .6;
  }
  function splash(x, power) {
    impulse(x, power);
    const n = Math.min(22, Math.round(power * .6));
    for (let i = 0; i < n; i++) drops.push({ x: x + rnd(-14, 14), y: surfaceY(x), vx: rnd(-2.2, 2.2), vy: -rnd(3, 8) * (power / 20 + .5), r: rnd(1.5, 4), life: 1 });
  }
  const surfaceY = x => base + wave(x, t, 0) + (h[Math.min(N - 1, Math.max(0, Math.round(x / STEP)))] || 0);
  // gentle idle swell (sum of sines)
  const wave = (x, time, phase) => Math.sin(x * .006 + time * .0011 + phase) * 9 + Math.sin(x * .013 - time * .0016 + phase * 2) * 5;

  function physics(dt) {
    for (let i = 0; i < N; i++) v[i] += (-.025 * h[i] - .02 * v[i]) * dt;              // spring + damping
    for (let k = 0; k < 3; k++) {                                                      // spread to neighbours
      for (let i = 1; i < N - 1; i++) { const l = .12 * (h[i - 1] - h[i]), r = .12 * (h[i + 1] - h[i]); v[i - 1] += l * dt; v[i + 1] += r * dt; }
    }
    for (let i = 0; i < N; i++) h[i] += v[i] * dt;
    for (const d of drops) { d.vy += .3 * dt; d.x += d.vx * dt; d.y += d.vy * dt; d.life -= .012 * dt; }
    drops = drops.filter(d => d.life > 0 && d.y < H + 20);
  }

  function layer(offsetY, amp, phase, speed, color, useSim) {
    ctx.beginPath(); ctx.moveTo(0, H);
    for (let i = 0; i < N; i++) {
      const x = i * STEP;
      const y = base + offsetY + wave(x, t * speed, phase) * amp + (useSim ? h[i] : h[i] * .35);
      ctx.lineTo(x, y);
    }
    ctx.lineTo(W, H); ctx.closePath(); ctx.fillStyle = color; ctx.fill();
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    layer(-34, 1.3, 2.2, .7, 'rgba(127,214,223,.40)', false);
    layer(-16, 1.1, 1.1, .9, 'rgba(41,182,201,.45)', false);
    layer(4, 1, 0, 1, 'rgba(10,111,158,.55)', true);
    // foam line on the front crest
    ctx.beginPath();
    for (let i = 0; i < N; i++) { const y = base + 4 + wave(i * STEP, t, 0) + h[i]; i ? ctx.lineTo(i * STEP, y) : ctx.moveTo(0, y); }
    ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 3; ctx.stroke();
    layer(30, .8, 3.4, 1.2, 'rgba(6,48,74,.55)', false);
    // droplets
    for (const d of drops) { ctx.globalAlpha = Math.max(0, d.life); ctx.fillStyle = 'rgba(255,255,255,.95)'; ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, 6.283); ctx.fill(); }
    ctx.globalAlpha = 1;
  }

  function loop(ts) {
    if (!running) return;
    const ms = Math.min(50, ts - last || 16); last = ts; const dt = ms / 16.7; t += ms;
    autoTimer -= ms;
    if (autoTimer <= 0) { splash(rnd(W * .1, W * .9), rnd(10, 26)); autoTimer = rnd(2500, 5500); }  // waves crash by themselves
    physics(dt); draw();
    if (!reduce) requestAnimationFrame(loop);
  }

  addEventListener('resize', init);
  addEventListener('pointermove', e => {
    if (reduce) return;
    const speed = Math.hypot(e.clientX - mouseX, e.clientY - mouseY); mouseX = e.clientX; mouseY = e.clientY;
    if (e.clientY > base - 60 && speed > 6) impulse(e.clientX, Math.min(8, speed * .25), 3);
  });
  addEventListener('pointerdown', e => { if (!reduce) splash(e.clientX, 24); });
  addEventListener('scroll', () => {                                   // scrolling makes the sea swell
    const dy = scrollY - lastY; lastY = scrollY;
    if (reduce || Math.abs(dy) < 4) return;
    for (let i = 0; i < N; i++) v[i] += Math.sin(i * .35 + t * .01) * Math.min(1.6, Math.abs(dy) * .04);
  }, { passive: true });
  document.addEventListener('visibilitychange', () => { running = !document.hidden; if (running && !reduce) { last = performance.now(); requestAnimationFrame(loop); } });

  init();
  if (reduce) { t = 1500; draw(); } else requestAnimationFrame(loop);
})();
