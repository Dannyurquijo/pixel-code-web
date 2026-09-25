(() => {
  if (globalThis.lucide?.createIcons) globalThis.lucide.createIcons();

  const reveal = () => {
    const threshold = innerHeight - 100;
    document.querySelectorAll('.reveal').forEach((element) => {
      if (element.getBoundingClientRect().top < threshold) element.classList.add('active');
    });
  };
  addEventListener('scroll', reveal, { passive: true });
  reveal();

  const form = document.getElementById('webinarForm');
  const status = document.getElementById('webinar-status');
  if (!form || !status) return;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    const submitButton = form.querySelector('button[type="submit"]');
    const originalText = submitButton.textContent;
    submitButton.textContent = 'Procesando…';
    submitButton.disabled = true;
    submitButton.classList.add('opacity-70', 'cursor-not-allowed');
    status.textContent = '';

    const values = new FormData(form);
    const payload = {
      name: values.get('name'),
      specialty: values.get('specialty'),
      phone: values.get('phone'),
      email: values.get('email'),
      consent: values.get('consent') === 'on',
      website: values.get('website')
    };

    try {
      const response = await fetch('/api/webinar-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.accepted) throw new Error(result.error || 'No fue posible completar el registro.');
      location.assign('gracias.html');
    } catch (error) {
      status.textContent = error instanceof Error ? error.message : 'No fue posible completar el registro. Intenta de nuevo.';
      submitButton.textContent = originalText;
      submitButton.disabled = false;
      submitButton.classList.remove('opacity-70', 'cursor-not-allowed');
    }
  });
})();
