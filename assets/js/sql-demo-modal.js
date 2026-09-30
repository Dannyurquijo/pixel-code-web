/**
 * DU PIXEL CODE - SQL & Analítica 360° Interactive Demo Modal Controller
 */
(() => {
  const DEMO_URL = 'https://dupixelcode.github.io/evaluacion-360/';
  let modalBackdrop = null;
  let modalWindow = null;
  let iframe = null;
  let loader = null;
  let isFullscreen = false;

  const createModalMarkup = () => {
    if (document.getElementById('sql-demo-modal')) return;

    const modalHTML = `
      <div id="sql-demo-modal" class="sql-modal-backdrop" aria-hidden="true" role="dialog" aria-modal="true" aria-labelledby="sql-modal-title">
        <div class="sql-modal-window" role="document">
          <header class="sql-modal-header">
            <div class="sql-modal-title-wrap">
              <span class="sql-modal-badge"><i></i> SQL Wasm Demo</span>
              <h2 id="sql-modal-title" class="sql-modal-title">Integraciones SQL & Analítica BI 360°</h2>
            </div>
            <div class="sql-modal-controls">
              <button class="sql-modal-btn sql-modal-btn--fullscreen" type="button" data-sql-fullscreen title="Pantalla completa" aria-label="Pantalla completa">⤢</button>
              <button class="sql-modal-btn sql-modal-btn--close" type="button" data-sql-close title="Cerrar demostración" aria-label="Cerrar demostración">✕</button>
            </div>
          </header>

          <div class="sql-notice-bar">
            <div class="sql-notice-content">
              <span class="sql-notice-tag">CLAVE DE PRUEBA: 123456789</span>
              <p class="sql-notice-copy">Demostración en vivo: ingresa la clave de prueba <strong>123456789</strong> para interactuar con la base de datos SQL.</p>
            </div>
            <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
              <button class="sql-copy-btn" type="button" data-sql-copy-key>Copiar clave</button>
              <button class="sql-copy-btn" type="button" data-open-sql-quote style="background: rgba(255, 215, 0, 0.15); color: #ffd700; border-color: rgba(255, 215, 0, 0.4);">💬 Cotizar Integración SQL</button>
            </div>
          </div>

          <div class="sql-modal-body">
            <div class="sql-iframe-loader" data-sql-loader>
              <div class="sql-spinner"></div>
              <span class="sql-loader-text">Inicializando Motor SQLite WebAssembly…</span>
            </div>
            <iframe 
              class="sql-demo-iframe" 
              data-sql-iframe 
              title="Sistema de Evaluación 360° - Motor SQL WebAssembly"
              sandbox="allow-scripts allow-same-origin allow-forms allow-downloads"
              referrerpolicy="strict-origin-when-cross-origin"
              allow="fullscreen; clipboard-write"
            ></iframe>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
  };

  const initModal = () => {
    createModalMarkup();

    modalBackdrop = document.getElementById('sql-demo-modal');
    if (!modalBackdrop) return;

    modalWindow = modalBackdrop.querySelector('.sql-modal-window');
    iframe = modalBackdrop.querySelector('[data-sql-iframe]');
    loader = modalBackdrop.querySelector('[data-sql-loader]');

    const closeBtn = modalBackdrop.querySelector('[data-sql-close]');
    const fullscreenBtn = modalBackdrop.querySelector('[data-sql-fullscreen]');
    const copyKeyBtn = modalBackdrop.querySelector('[data-sql-copy-key]');

    // Event handlers
    closeBtn?.addEventListener('click', closeModal);
    fullscreenBtn?.addEventListener('click', toggleFullscreen);
    
    modalBackdrop.addEventListener('click', (e) => {
      if (e.target === modalBackdrop) closeModal();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modalBackdrop.classList.contains('is-active')) {
        closeModal();
      }
    });

    copyKeyBtn?.addEventListener('click', () => {
      navigator.clipboard.writeText('123456789').then(() => {
        const originalText = copyKeyBtn.textContent;
        copyKeyBtn.textContent = '¡Copiado!';
        copyKeyBtn.style.background = 'rgba(16, 185, 129, 0.25)';
        copyKeyBtn.style.color = '#10b981';
        setTimeout(() => {
          copyKeyBtn.textContent = originalText;
          copyKeyBtn.style.background = '';
          copyKeyBtn.style.color = '';
        }, 2000);
      }).catch(() => {});
    });

    if (iframe) {
      iframe.addEventListener('load', () => {
        loader?.classList.add('is-hidden');
      });
    }

    // Delegated click handler for opening modal
    document.addEventListener('click', (e) => {
      const demoTrigger = e.target.closest('[data-open-sql-demo], .js-open-sql-demo');
      if (demoTrigger) {
        e.preventDefault();
        openModal();
        return;
      }

      const quoteTrigger = e.target.closest('[data-open-sql-quote], .btn-sql-quote');
      if (quoteTrigger) {
        e.preventDefault();
        closeModal();
        const promptText = "Hola Pixie, me interesa cotizar una integración de bases de datos SQL & Analítica BI 360° para mi empresa. ¿Qué datos de contacto y detalles de mi proyecto necesitas?";
        if (typeof window.openPixieWithPrompt === 'function') {
          window.openPixieWithPrompt(promptText, true);
        } else if (window.PixieV2 && typeof window.PixieV2.openWithPrompt === 'function') {
          window.PixieV2.openWithPrompt(promptText, true);
        }
      }
    });
  };

  const openModal = () => {
    if (!modalBackdrop) initModal();
    if (!modalBackdrop) return;

    // Set iframe src lazy load
    if (iframe && (!iframe.src || iframe.src === 'about:blank' || iframe.src !== DEMO_URL)) {
      loader?.classList.remove('is-hidden');
      iframe.src = DEMO_URL;
    }

    modalBackdrop.classList.add('is-active');
    modalBackdrop.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    // Focus management
    setTimeout(() => {
      modalBackdrop.querySelector('[data-sql-close]')?.focus();
    }, 100);
  };

  const closeModal = () => {
    if (!modalBackdrop) return;
    modalBackdrop.classList.remove('is-active');
    modalBackdrop.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    
    if (isFullscreen) {
      toggleFullscreen();
    }
  };

  const toggleFullscreen = () => {
    if (!modalWindow) return;
    isFullscreen = !isFullscreen;
    modalWindow.classList.toggle('is-fullscreen', isFullscreen);
    const fullscreenBtn = modalBackdrop.querySelector('[data-sql-fullscreen]');
    if (fullscreenBtn) {
      fullscreenBtn.textContent = isFullscreen ? '🗗' : '⤢';
    }
  };

  // Check URL parameters or hash to auto-open modal on page load
  const checkAutoOpen = () => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const demoParam = urlParams.get('demo');
      const hash = window.location.hash.toLowerCase();
      
      if (demoParam === 'sql' || demoParam === 'sql-360' || demoParam === 'evaluacion-360' || hash === '#demo-sql' || hash === '#sql-demo') {
        setTimeout(() => openModal(), 400);
      }
    } catch (_) {}
  };

  // Expose API globally
  window.DUPixelSQLDemo = {
    open: openModal,
    close: closeModal
  };

  const handleInit = () => {
    initModal();
    checkAutoOpen();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', handleInit);
  } else {
    handleInit();
  }
})();
