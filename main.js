/* Main interactions: translator, navigation, cards, skills, frame effects */
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- toast ---------- */
  const toast = $('#toast'); let tt;
  function say(msg) { toast.textContent = msg; toast.classList.add('show'); clearTimeout(tt); tt = setTimeout(() => toast.classList.remove('show'), 1800); }

  /* ---------- translator ---------- */
  let lang = 'en', words = [], typed = { w: 0, c: 0, del: false, timer: 0 };
  function setLang(l, announce) {
    if (!I18N[l]) l = 'en';
    lang = l;
    $$('[data-i18n]').forEach(el => {
      const v = I18N[l][el.dataset.i18n];
      if (v !== undefined) el.innerHTML = v;
    });
    $$('.lang button').forEach(b => { const on = b.dataset.lang === l; b.classList.toggle('active', on); b.setAttribute('aria-pressed', on); });
    document.documentElement.lang = l === 'fil' ? 'fil' : 'en';
    words = I18N[l]['hero.words']; typed = { w: 0, c: 0, del: false, timer: typed.timer };
    try { localStorage.setItem('lang', l); } catch (e) {}
    if (announce) say(I18N[l]['toast.lang']);
  }
  $$('.lang button').forEach(b => b.addEventListener('click', () => setLang(b.dataset.lang, true)));

  /* ---------- typing effect ---------- */
  const typedEl = $('#typed');
  function tick() {
    const word = words[typed.w] || '';
    if (reduce) { typedEl.textContent = word; return; }
    typed.c += typed.del ? -1 : 1;
    typedEl.textContent = word.slice(0, typed.c);
    let delay = typed.del ? 35 : 80;
    if (!typed.del && typed.c >= word.length) { typed.del = true; delay = 1500; }
    else if (typed.del && typed.c <= 0) { typed.del = false; typed.w = (typed.w + 1) % words.length; delay = 350; }
    typed.timer = setTimeout(tick, delay);
  }

  /* ---------- mobile menu + active link ---------- */
  const nav = $('#nav'), menuBtn = $('#menuBtn');
  menuBtn.addEventListener('click', () => {
    const open = nav.classList.toggle('open'); menuBtn.setAttribute('aria-expanded', open);
  });
  nav.addEventListener('click', e => { if (e.target.tagName === 'A') { nav.classList.remove('open'); menuBtn.setAttribute('aria-expanded', false); } });

  const links = $$('#nav a');
  const spy = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) links.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + e.target.id));
  }), { rootMargin: '-45% 0px -50% 0px' });
  $$('main section[id]').forEach(s => spy.observe(s));

  /* ---------- role cards ---------- */
  $$('.flip').forEach(c => c.addEventListener('click', () => {
    const open = c.classList.toggle('open'); c.setAttribute('aria-expanded', open);
  }));

  /* ---------- skills: animated bars + filter ---------- */
  const barObs = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { $$('.skill', e.target).forEach(s => $('i', s).style.width = s.dataset.level + '%'); }
  }), { threshold: .25 });
  barObs.observe($('.skills'));
  $$('.tabs button').forEach(b => b.addEventListener('click', () => {
    $$('.tabs button').forEach(x => x.classList.toggle('active', x === b));
    $$('.skill').forEach(s => s.classList.toggle('hide', b.dataset.filter !== 'all' && s.dataset.type !== b.dataset.filter));
  }));

  /* ---------- copy command ---------- */
  $$('.cmd').forEach(b => b.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(b.dataset.copy); } catch (e) {}
    say(I18N[lang]['toast.copied']);
  }));

  /* ---------- picture frame: 3D tilt + moving shine ---------- */
  const wrap = $('#frame'), frame = $('.frame', wrap), shine = $('.shine', wrap);
  if (!reduce && matchMedia('(hover:hover)').matches) {
    wrap.addEventListener('pointermove', e => {
      const r = wrap.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      frame.style.setProperty('--rx', ((.5 - y) * 18).toFixed(1) + 'deg');
      frame.style.setProperty('--ry', ((x - .5) * 22).toFixed(1) + 'deg');
      shine.style.setProperty('--mx', x * 100 + '%'); shine.style.setProperty('--my', y * 100 + '%');
    });
    wrap.addEventListener('pointerleave', () => { frame.style.setProperty('--rx', '0deg'); frame.style.setProperty('--ry', '0deg'); });
  }

  /* ---------- sparkle trail (desktop only) ---------- */
  if (!reduce && matchMedia('(hover:hover)').matches) {
    let last = 0; const colors = ['#8fc98d', '#f5a6c0', '#7fd8b8', '#5fae6a'];
    addEventListener('pointermove', e => {
      const now = performance.now(); if (now - last < 70) return; last = now;
      const s = document.createElement('span'); s.className = 'spark'; 
      s.style.cssText = `left:${e.clientX}px;top:${e.clientY}px;--dx:${(Math.random() - .5) * 40}px;--dy:${-50 - Math.random() * 70}px`;
      document.body.appendChild(s); setTimeout(() => s.remove(), 1500);
    });
  }

  /* ---------- gentle reveal for key blocks (one-time) ---------- */
  if (!reduce) {
    const rv = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); rv.unobserve(e.target); } }), { threshold: .15 });
    $$('.intro-strip article, .about-card, .term').forEach(el => { el.classList.add('reveal'); rv.observe(el); });
  }

  /* ---------- init ---------- */
  $('#year').textContent = new Date().getFullYear();
  let saved = 'en'; try { saved = localStorage.getItem('lang') || 'en'; } catch (e) {}
  setLang(saved, false); tick();
})();
