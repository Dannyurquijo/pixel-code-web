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

  const pixieWidget = document.querySelector('[data-pixie-widget]');
  if (pixieWidget) {
    const launcher = pixieWidget.querySelector('[data-pixie-launcher]');
    const panel = pixieWidget.querySelector('[data-pixie-panel]');
    const closeButton = pixieWidget.querySelector('[data-pixie-close]');
    const form = pixieWidget.querySelector('[data-pixie-form]');
    const input = pixieWidget.querySelector('[data-pixie-input]');
    const messages = pixieWidget.querySelector('[data-pixie-messages]');
    const typing = pixieWidget.querySelector('[data-pixie-typing]');
    const greeting = 'Hola, soy Pixie. Puedo orientarte sobre automatización, IA, desarrollo web y cursos de DU Pixel Code. ¿Qué quieres mejorar?';
    const storage = (() => { try { return localStorage; } catch (_) { return null; } })();
    let pixieSession = window.PixieSession?.getOrCreate(storage);
    const conversationStore = window.PixieConversationStore?.create({ storage, session: pixieSession, greeting });
    let waiting = false;

    const setPixieOpen = (open) => {
      launcher?.setAttribute('aria-expanded', String(open));
      panel.hidden = !open;
      panel.setAttribute('aria-hidden', String(!open));
      pixieWidget.classList.toggle('is-open', open);
      if (open) requestAnimationFrame(() => input?.focus());
    };

    const addMessage = (text, role) => {
      const message = document.createElement('div');
      message.className = `pixie-message pixie-message--${role === 'user' ? 'user' : 'bot'}`;
      message.textContent = text;
      messages.appendChild(message);
      messages.scrollTop = messages.scrollHeight;
    };

    const renderConversation = () => {
      if (!conversationStore) return;
      messages.replaceChildren();
      conversationStore.get().messages.forEach((message) => addMessage(message.content, message.role));
    };

    renderConversation();

    launcher?.addEventListener('click', () => setPixieOpen(launcher.getAttribute('aria-expanded') !== 'true'));
    closeButton?.addEventListener('click', () => setPixieOpen(false));
    addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && launcher?.getAttribute('aria-expanded') === 'true') {
        setPixieOpen(false);
        launcher.focus();
      }
    });

    form?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const text = input.value.trim();
      if (!text || waiting) return;

      const userTimestamp = new Date().toISOString();
      const conversation = conversationStore?.append({ role: 'user', content: text, timestamp: userTimestamp });
      pixieSession = window.PixieSession?.touch(storage, pixieSession) || pixieSession;
      addMessage(text, 'user');
      input.value = '';
      waiting = true;
      input.disabled = true;
      form.querySelector('button').disabled = true;
      typing.hidden = false;
      messages.scrollTop = messages.scrollHeight;

      try {
        const response = await fetch('/.netlify/functions/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: text,
            session_id: pixieSession?.session_id,
            created_at: conversation?.created_at,
            conversation: conversation?.messages || [{ role: 'user', content: text, timestamp: userTimestamp }],
            history: (conversation?.messages || []).slice(0, -1).slice(-20).map((message) => ({ role: message.role, text: message.content })),
            notification_state: conversation?.notification,
            page_url: `${location.origin}${location.pathname}`,
            campaign,
            debug: location.hostname === 'localhost' && new URLSearchParams(location.search).get('pixie_debug') === '1'
          })
        });
        if (!response.ok) throw new Error(`Pixie API ${response.status}`);
        const data = await response.json();
        const reply = typeof data.reply === 'string' && data.reply.trim()
          ? data.reply.trim()
          : 'No pude generar una respuesta en este momento. Intenta nuevamente.';
        conversationStore?.append({ role: 'assistant', content: reply, timestamp: new Date().toISOString() });
        if (data.notification?.sent) conversationStore?.updateNotification(data.notification);
        addMessage(reply, 'bot');
        if (data.debug_payload) console.info('[PIXIE] Debug payload', data.debug_payload);
      } catch (_) {
        addMessage('Mis circuitos están tardando más de lo normal. Intenta otra vez en un momento o solicita tu diagnóstico por WhatsApp.', 'bot');
      } finally {
        waiting = false;
        typing.hidden = true;
        input.disabled = false;
        form.querySelector('button').disabled = false;
        input.focus();
      }
    });

    window.PixieV2 = {
      getSession: () => ({ ...pixieSession }),
      getConversation: () => conversationStore?.get() || null,
      startNewSession: () => {
        conversationStore?.clear();
        pixieSession = window.PixieSession?.reset(storage);
        location.reload();
      }
    };
  }
})();
