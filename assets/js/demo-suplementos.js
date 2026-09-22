(() => {
  const products = [
    { id:'whey', name:'Core Whey 24', category:'recuperacion', label:'Recuperación', price:899, servings:'30 porciones', detail:'24 g proteína', image:0, badge:'Más elegido' },
    { id:'creatine', name:'Pure Creatine', category:'fuerza', label:'Fuerza', price:429, servings:'60 porciones', detail:'5 g creatina', image:1, badge:'Monohidratada' },
    { id:'electro', name:'Hydra Elements', category:'energia', label:'Energía', price:389, servings:'20 sobres', detail:'Electrolitos', image:2, badge:'Sin azúcar' },
    { id:'recovery', name:'Recovery PM', category:'recuperacion', label:'Recuperación', price:579, servings:'30 porciones', detail:'Magnesio + zinc', image:3, badge:'Rutina nocturna' },
    { id:'daily', name:'Daily Foundations', category:'bienestar', label:'Bienestar', price:349, servings:'60 cápsulas', detail:'Uso diario', image:4, badge:'Esenciales' },
    { id:'plant', name:'Plant Protein', category:'recuperacion', label:'Recuperación', price:749, servings:'25 porciones', detail:'22 g proteína', image:5, badge:'Origen vegetal' }
  ];
  const descriptions = { whey:'Mezcla de proteína para complementar tu plan de alimentación.', creatine:'Formato simple para integrar a una rutina de fuerza.', electro:'Hidratación práctica para sesiones demandantes.', recovery:'Micronutrientes para una rutina nocturna organizada.', daily:'Complemento general para hábitos consistentes.', plant:'Alternativa vegetal de textura suave y sabor neutro.' };
  const grid = document.querySelector('[data-product-grid]');
  const count = document.querySelector('[data-product-count]');
  const filters = [...document.querySelectorAll('[data-filter]')];
  const goalButtons = [...document.querySelectorAll('[data-goal]')];
  const finderResult = document.querySelector('[data-finder-result]');
  const cartDrawer = document.querySelector('[data-cart]');
  const backdrop = document.querySelector('[data-cart-backdrop]');
  const cartItems = document.querySelector('[data-cart-items]');
  const cartCount = document.querySelectorAll('[data-cart-count]');
  const cartTotal = document.querySelector('[data-cart-total]');
  const checkout = document.querySelector('[data-checkout]');
  const checkoutForm = document.querySelector('[data-checkout-form]');
  const checkoutResult = document.querySelector('[data-checkout-result]');
  let activeFilter = 'todos';
  const cart = new Map();

  const money = (value) => new Intl.NumberFormat('es-MX', { style:'currency', currency:'MXN', maximumFractionDigits:0 }).format(value);
  const renderProducts = () => {
    if (!grid) return;
    const visible = activeFilter === 'todos' ? products : products.filter((product) => product.category === activeFilter);
    grid.innerHTML = visible.map((product) => `<article class="product-card reveal is-visible" data-image="${product.image}"><div class="product-card__image" role="img" aria-label="Presentación conceptual de ${product.name}"><span class="product-card__badge">${product.badge}</span></div><div class="product-card__body"><span class="product-card__category">${product.label}</span><h3>${product.name}</h3><p>${descriptions[product.id]}</p><div class="product-card__meta"><span>${product.servings}</span><span>${product.detail}</span></div><div class="product-card__price"><strong>${money(product.price)}</strong><button class="add-button" type="button" data-add="${product.id}">Agregar</button></div></div></article>`).join('');
    if (count) count.textContent = `${visible.length} productos demo`;
  };

  const renderCart = () => {
    const rows = [...cart.entries()];
    const units = rows.reduce((total, [,qty]) => total + qty, 0);
    const total = rows.reduce((sum,[id,qty]) => sum + products.find((product) => product.id === id).price * qty, 0);
    cartCount.forEach((node) => { node.textContent = String(units); });
    if (cartTotal) cartTotal.textContent = money(total);
    if (cartItems) cartItems.innerHTML = rows.length ? rows.map(([id,qty]) => {
      const product = products.find((item) => item.id === id);
      return `<div class="cart-item"><strong>${product.name}</strong><small>${money(product.price * qty)}</small><div class="cart-item__actions"><button type="button" data-qty="${id}" data-delta="-1" aria-label="Restar uno">−</button><span>${qty}</span><button type="button" data-qty="${id}" data-delta="1" aria-label="Agregar uno">+</button><button class="cart-item__remove" type="button" data-remove="${id}">Quitar</button></div></div>`;
    }).join('') : '<p class="cart-empty">Tu carrito demo está vacío.<br>Explora el catálogo y agrega un producto.</p>';
    document.querySelector('[data-checkout-open]')?.toggleAttribute('disabled', !rows.length);
  };

  const setCartOpen = (open) => {
    cartDrawer?.classList.toggle('is-open', open);
    if (backdrop instanceof HTMLElement) backdrop.hidden = !open;
    document.body.style.overflow = open ? 'hidden' : '';
    cartDrawer?.setAttribute('aria-hidden', String(!open));
  };

  filters.forEach((button) => button.addEventListener('click', () => {
    activeFilter = button.dataset.filter || 'todos';
    filters.forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
    renderProducts();
  }));
  goalButtons.forEach((button) => button.addEventListener('click', () => {
    const goal = button.dataset.goal || 'recuperacion';
    const messages = { fuerza:'Pure Creatine es la selección conceptual para una rutina orientada a fuerza.', recuperacion:'Core Whey 24 y Plant Protein encajan como complementos de recuperación.', energia:'Hydra Elements destaca para acompañar sesiones demandantes.', bienestar:'Daily Foundations organiza una rutina general de micronutrientes.' };
    goalButtons.forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
    if (finderResult) finderResult.textContent = messages[goal];
    activeFilter = goal;
    filters.forEach((item) => item.setAttribute('aria-pressed', String(item.dataset.filter === goal)));
    renderProducts();
    document.querySelector('#catalogo')?.scrollIntoView({ behavior:'smooth', block:'start' });
  }));
  grid?.addEventListener('click', (event) => {
    const button = event.target instanceof Element ? event.target.closest('[data-add]') : null;
    if (!button) return;
    const id = button.dataset.add;
    cart.set(id, (cart.get(id) || 0) + 1);
    renderCart();
    button.textContent = 'Agregado ✓';
    setTimeout(() => { button.textContent = 'Agregar'; }, 900);
  });
  document.querySelectorAll('[data-cart-open]').forEach((button) => button.addEventListener('click', () => setCartOpen(true)));
  document.querySelector('[data-cart-close]')?.addEventListener('click', () => setCartOpen(false));
  backdrop?.addEventListener('click', () => setCartOpen(false));
  cartItems?.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target : null;
    const qtyButton = target?.closest('[data-qty]');
    const removeButton = target?.closest('[data-remove]');
    if (qtyButton) {
      const id = qtyButton.dataset.qty;
      const next = (cart.get(id) || 0) + Number(qtyButton.dataset.delta || 0);
      next > 0 ? cart.set(id,next) : cart.delete(id);
    }
    if (removeButton) cart.delete(removeButton.dataset.remove);
    renderCart();
  });
  document.querySelector('[data-checkout-open]')?.addEventListener('click', () => {
    setCartOpen(false);
    if (checkout instanceof HTMLElement) checkout.hidden = false;
    document.body.style.overflow = 'hidden';
  });
  document.querySelector('[data-checkout-close]')?.addEventListener('click', () => {
    if (checkout instanceof HTMLElement) checkout.hidden = true;
    document.body.style.overflow = '';
  });
  checkoutForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    const name = String(new FormData(checkoutForm).get('name') || 'Cliente');
    checkoutForm.hidden = true;
    if (checkoutResult instanceof HTMLElement) {
      checkoutResult.hidden = false;
      checkoutResult.innerHTML = `<strong>Orden demo preparada.</strong><br>${name}, este flujo conectaría inventario, pago, confirmación y seguimiento. No se cobró ni transmitió información.`;
    }
    cart.clear();
    renderCart();
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event:'supplements_demo_checkout' });
  });
  addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    setCartOpen(false);
    if (checkout instanceof HTMLElement) checkout.hidden = true;
    document.body.style.overflow = '';
  });

  renderProducts();
  renderCart();
})();
