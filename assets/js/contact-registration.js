(() => {
  const form = document.getElementById('project-form');
  const status = document.getElementById('project-form-status');
  if (!form || !status) return;
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const button = form.querySelector('button[type="submit"]');
    const original = button.textContent;
    button.disabled = true;
    button.textContent = 'Enviando…';
    status.textContent = '';
    const data = new FormData(form);
    try {
      const response = await fetch('/api/contact-register', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: data.get('name'), company: data.get('company'), email: data.get('email'), phone: data.get('phone'), service: data.get('service'), message: data.get('message'), consent: data.get('consent') === 'on', website: data.get('website') })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.accepted) throw new Error(result.error || 'No fue posible enviar la solicitud.');
      location.assign('gracias.html');
    } catch (error) {
      status.textContent = error instanceof Error ? error.message : 'No fue posible enviar la solicitud.';
      button.disabled = false;
      button.textContent = original;
    }
  });
})();
