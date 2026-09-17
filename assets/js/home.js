(() => {
  const header = document.querySelector('[data-header]');
  const menuButton = document.querySelector('[data-menu-button]');
  const mobileMenu = document.querySelector('[data-mobile-menu]');
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const progress = document.querySelector('.scroll-progress i');

  const activateMotion = () => {
    if (reduceMotion || document.body.classList.contains('motion-active')) return;
    document.body.classList.add('motion-ready');
    requestAnimationFrame(() => requestAnimationFrame(() => document.body.classList.add('motion-active')));
  };
  if (document.querySelector('[data-site-intro]')) addEventListener('du:intro-complete', activateMotion, { once: true });
  else activateMotion();

  const updatePageState = () => {
    header?.classList.toggle('is-scrolled', scrollY > 24);
    const available = document.documentElement.scrollHeight - innerHeight;
    if (progress) progress.style.transform = `scaleX(${available > 0 ? Math.min(scrollY / available, 1) : 0})`;
  };
  let pageStateFrame = 0;
  const schedulePageState = () => {
    if (pageStateFrame) return;
    pageStateFrame = requestAnimationFrame(() => {
      updatePageState();
      pageStateFrame = 0;
    });
  };
  updatePageState();
  addEventListener('scroll', schedulePageState, { passive: true });
  addEventListener('resize', schedulePageState, { passive: true });

  const closeMenu = () => {
    if (!menuButton || !mobileMenu) return;
    menuButton.setAttribute('aria-expanded', 'false');
    mobileMenu.hidden = true;
    document.body.style.overflow = '';
  };

  menuButton?.addEventListener('click', () => {
    const open = menuButton.getAttribute('aria-expanded') === 'true';
    menuButton.setAttribute('aria-expanded', String(!open));
    mobileMenu.hidden = open;
    document.body.style.overflow = open ? '' : 'hidden';
  });
  mobileMenu?.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMenu));
  addEventListener('keydown', (event) => { if (event.key === 'Escape') closeMenu(); });

  document.querySelectorAll('[data-year]').forEach((node) => { node.textContent = new Date().getFullYear(); });

  let campaign = {};
  try { campaign = JSON.parse(sessionStorage.getItem('du:campaign') || '{}'); } catch (_) { campaign = {}; }
  const campaignKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'];
  const query = new URLSearchParams(location.search);
  campaignKeys.forEach((key) => {
    const value = query.get(key);
    if (value) campaign[key] = value;
  });
  try { sessionStorage.setItem('du:campaign', JSON.stringify(campaign)); } catch (_) { /* Storage can be blocked. */ }
  document.addEventListener('click', (event) => {
    const element = event.target instanceof Element ? event.target.closest('[data-track]') : null;
    if (!element) return;
    const detail = {
      event: element.dataset.track,
      location: element.dataset.trackLocation || 'unknown',
      label: element.textContent.trim().replace(/\s+/g, ' '),
      page: location.pathname,
      ...campaign
    };
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(detail);
    window.dispatchEvent(new CustomEvent('du:track', { detail }));
  });

  const activeScenes = document.querySelectorAll('.system-architecture,.intelligence-system,.ecosystem-stage');
  if ('IntersectionObserver' in window && !reduceMotion) {
    const sceneObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => entry.target.classList.toggle('is-in-view', entry.isIntersecting));
    }, { rootMargin: '12% 0px', threshold: .01 });
    activeScenes.forEach((scene) => sceneObserver.observe(scene));
  } else {
    activeScenes.forEach((scene) => scene.classList.add('is-in-view'));
  }

  if (!reduceMotion && !matchMedia('(pointer: coarse)').matches) {
    document.querySelectorAll('[data-tilt]').forEach((stage) => {
      stage.addEventListener('pointermove', (event) => {
        const rect = stage.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - .5;
        const y = (event.clientY - rect.top) / rect.height - .5;
        stage.style.setProperty('--rx', `${(-y * 3.2).toFixed(2)}deg`);
        stage.style.setProperty('--ry', `${(x * 4.2).toFixed(2)}deg`);
      }, { passive: true });
      stage.addEventListener('pointerleave', () => {
        stage.style.setProperty('--rx', '0deg');
        stage.style.setProperty('--ry', '0deg');
      }, { passive: true });
    });
  }

  const revealItems = document.querySelectorAll('.reveal');
  if (reduceMotion || !('IntersectionObserver' in window)) {
    revealItems.forEach((item) => item.classList.add('is-visible'));
  } else {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    revealItems.forEach((item) => observer.observe(item));
  }
})();
