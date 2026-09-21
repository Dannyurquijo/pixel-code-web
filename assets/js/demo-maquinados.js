(() => {
  'use strict';
  const products = [
    { id: 'AX-SC-20', mark: 'SC', category: 'SUJECIÓN', name: 'Collarín de eje 20 mm', detail: 'Acero inoxidable 304 · Tornillo M5', price: 428 },
    { id: 'AX-BR-40', mark: 'BR', category: 'MONTAJE', name: 'Soporte escuadra 40 × 40', detail: 'Aluminio 6061-T6 · Anodizado natural', price: 685 },
    { id: 'AX-SP-12', mark: 'SP', category: 'ESPACIADOR', name: 'Espaciador anodizado 12 mm', detail: 'Aluminio 6061 · Lote de 4 piezas', price: 516 },
    { id: 'AX-FL-50', mark: 'FL', category: 'TRANSMISIÓN', name: 'Brida compacta 50 mm', detail: 'Acero 4140 · Acabado rectificado', price: 1290 },
    { id: 'AX-BU-25', mark: 'BU', category: 'GUIADO', name: 'Buje de precisión 25 mm', detail: 'Bronce SAE 40 · Tolerancia H7', price: 742 },
    { id: 'AX-AD-08', mark: 'AD', category: 'CONEXIÓN', name: 'Adaptador roscado 1/2 in', detail: 'Latón · Rosca NPT', price: 368 }
  ];
  const currency = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });
  const cart = new Map();
  const grid = document.querySelector('[data-product-grid]');
  const drawer = document.querySelector('[data-cart-drawer]');
  const cartBackdrop = document.querySelector('[data-cart-backdrop]');
  const cartItems = document.querySelector('[data-cart-items]');
  const countNode = document.querySelector('[data-cart-count]');
  const totalNode = document.querySelector('[data-cart-total]');
  const checkoutButton = document.querySelector('[data-start-checkout]');
  const checkoutDialog = document.querySelector('[data-checkout-dialog]');
  const checkoutBackdrop = document.querySelector('[data-checkout-backdrop]');

  const renderProducts = () => {
    if (!grid) return;
    grid.innerHTML = products.map((product) => `<article class="product-card"><div class="product-card__icon">${product.mark}</div><small>${product.category} · ${product.id}</small><h3>${product.name}</h3><p>${product.detail}</p><div class="product-card__buy"><strong>${currency.format(product.price)}</strong><button type="button" data-add-product="${product.id}">Agregar +</button></div></article>`).join('');
  };
  const cartQuantity = () => [...cart.values()].reduce((sum, quantity) => sum + quantity, 0);
  const cartTotal = () => [...cart.entries()].reduce((sum, [id, quantity]) => sum + products.find((product) => product.id === id).price * quantity, 0);
  const renderCart = () => {
    const entries = [...cart.entries()];
    countNode.textContent = String(cartQuantity());
    totalNode.textContent = `${currency.format(cartTotal())} MXN`;
    checkoutButton.disabled = entries.length === 0;
    cartItems.innerHTML = entries.length ? entries.map(([id, quantity]) => {
      const product = products.find((item) => item.id === id);
      return `<article class="cart-item"><div><strong>${product.name}</strong><br><small>${quantity} × ${currency.format(product.price)}</small></div><button type="button" data-remove-product="${id}" aria-label="Quitar ${product.name}">Quitar</button></article>`;
    }).join('') : '<p class="cart-empty">Tu carrito está vacío.<br>Agrega un componente del catálogo.</p>';
  };
  const setDrawer = (open) => {
    drawer.hidden = !open; cartBackdrop.hidden = !open; document.body.style.overflow = open ? 'hidden' : '';
    if (open) drawer.querySelector('[data-close-cart]')?.focus();
  };
  document.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target : null;
    const add = target?.closest('[data-add-product]');
    if (add) { const id = add.getAttribute('data-add-product'); cart.set(id, (cart.get(id) || 0) + 1); renderCart(); add.textContent = 'Agregado ✓'; setTimeout(() => { add.textContent = 'Agregar +'; }, 900); }
    const remove = target?.closest('[data-remove-product]');
    if (remove) { cart.delete(remove.getAttribute('data-remove-product')); renderCart(); }
    if (target?.closest('[data-open-cart]')) setDrawer(true);
    if (target?.closest('[data-close-cart]') || target === cartBackdrop) setDrawer(false);
  });

  const setCheckout = (open) => {
    checkoutDialog.hidden = !open; checkoutBackdrop.hidden = !open; document.body.style.overflow = open ? 'hidden' : '';
    if (open) checkoutDialog.querySelector('input')?.focus();
  };
  checkoutButton?.addEventListener('click', () => { if (cart.size) { setDrawer(false); setCheckout(true); } });
  document.querySelector('[data-close-checkout]')?.addEventListener('click', () => setCheckout(false));
  checkoutBackdrop?.addEventListener('click', () => setCheckout(false));
  document.querySelector('[data-checkout-form]')?.addEventListener('submit', (event) => {
    event.preventDefault();
    checkoutDialog.querySelector('[data-checkout-step]').hidden = true;
    const success = checkoutDialog.querySelector('[data-checkout-success]'); success.hidden = false;
    success.querySelector('[data-order-ref]').textContent = `AX-DEMO-${String(Date.now()).slice(-6)}`;
    cart.clear(); renderCart();
  });
  document.querySelector('[data-finish-checkout]')?.addEventListener('click', () => {
    setCheckout(false); checkoutDialog.querySelector('[data-checkout-step]').hidden = false; checkoutDialog.querySelector('[data-checkout-success]').hidden = true;
  });
  document.querySelector('[data-quote-form]')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const status = document.querySelector('[data-quote-status]');
    status.textContent = `Solicitud demo ${`DFM-${String(Date.now()).slice(-5)}`} generada. En un sistema real, el equipo técnico recibiría ahora el expediente estructurado.`;
  });

  const pixiePanel = document.querySelector('[data-pixie-panel]');
  const pixieLauncher = document.querySelector('[data-pixie-launcher]');
  const pixieMessages = document.querySelector('[data-pixie-messages]');
  const pixieInput = document.querySelector('[data-pixie-input]');
  const setPixie = (open) => { pixiePanel.hidden = !open; pixieLauncher.setAttribute('aria-expanded', String(open)); if (open) pixieInput.focus(); };
  const addMessage = (text, user = false) => { const node = document.createElement('div'); node.className = `industrial-message${user ? ' industrial-message--user' : ''}`; node.textContent = text; pixieMessages.appendChild(node); pixieMessages.scrollTop = pixieMessages.scrollHeight; };
  const answer = (question) => {
    const value = question.toLowerCase();
    if (/material|alumin|acero|bronce|lat[oó]n/.test(value)) return 'Para piezas ligeras y mecanizables suele funcionar aluminio 6061-T6. Para desgaste o carga, revisaría acero 4140; para corrosión, inoxidable 304. La elección final depende de esfuerzo, ambiente, acabado y volumen.';
    if (/toler|precisi|0\.0/.test(value)) return 'Podemos plantear ±0.01 mm en características críticas, pero no conviene aplicarlo a toda la pieza: eleva costo y tiempo. Indica ajuste funcional, datum y proceso de inspección para recomendar una tolerancia producible.';
    if (/tiempo|tarda|entrega|urgente/.test(value)) return 'El catálogo demo marca salida de 24–72 h. Una pieza especial suele requerir 3–12 días después de aprobar DFM, material y plano. Series o tratamientos externos cambian la fecha.';
    if (/compr|precio|producto|collar|soporte|brida|buje/.test(value)) return 'El catálogo superior incluye collarines, soportes, espaciadores, bridas, bujes y adaptadores. Puedes agregarlos al carrito y completar una compra simulada sin datos financieros.';
    if (/plano|cotiz|archivo|pieza/.test(value)) return 'Para cotizar pediría material, cantidad, revisión del plano, tolerancias críticas, acabado y fecha objetivo. Usa el formulario de “Pieza especial”; esta demo no carga ni transmite archivos.';
    return 'Puedo ayudarte a definir material, tolerancia, tiempo de entrega, producto de catálogo o datos necesarios para cotizar. Cuéntame qué función cumple la pieza y cuántas necesitas.';
  };
  const askPixie = (question) => { const clean = question.trim(); if (!clean) return; addMessage(clean, true); pixieInput.value = ''; setTimeout(() => addMessage(answer(clean)), 480); };
  pixieLauncher?.addEventListener('click', () => setPixie(pixiePanel.hidden));
  document.querySelector('[data-open-pixie]')?.addEventListener('click', () => setPixie(true));
  document.querySelector('[data-close-pixie]')?.addEventListener('click', () => setPixie(false));
  document.querySelector('[data-pixie-form]')?.addEventListener('submit', (event) => { event.preventDefault(); askPixie(pixieInput.value); });
  document.querySelectorAll('[data-pixie-suggestion]').forEach((button) => button.addEventListener('click', () => askPixie(button.getAttribute('data-pixie-suggestion'))));
  addEventListener('keydown', (event) => { if (event.key === 'Escape') { setDrawer(false); setCheckout(false); setPixie(false); } });
  renderProducts(); renderCart();
})();
