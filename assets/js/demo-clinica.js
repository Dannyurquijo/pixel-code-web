(() => {
  const form = document.querySelector('[data-booking-form]');
  const timeButtons = [...document.querySelectorAll('[data-time]')];
  const modal = document.querySelector('[data-booking-modal]');
  const summary = document.querySelector('[data-booking-summary]');
  const close = document.querySelector('[data-booking-close]');
  const dateInput = document.querySelector('[name="appointmentDate"]');
  let selectedTime = '';

  if (dateInput instanceof HTMLInputElement) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    dateInput.min = tomorrow.toISOString().slice(0, 10);
  }

  timeButtons.forEach((button) => button.addEventListener('click', () => {
    selectedTime = button.dataset.time || '';
    timeButtons.forEach((option) => option.setAttribute('aria-pressed', String(option === button)));
  }));

  const hideModal = () => {
    if (!(modal instanceof HTMLElement)) return;
    modal.hidden = true;
    document.body.style.overflow = '';
  };

  form?.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!selectedTime) {
      timeButtons[0]?.focus();
      timeButtons[0]?.setCustomValidity?.('Selecciona un horario');
      setTimeout(() => timeButtons[0]?.setCustomValidity?.(''), 1000);
      return;
    }
    const data = new FormData(form);
    const service = String(data.get('service') || 'Valoración inicial');
    const date = String(data.get('appointmentDate') || '');
    const name = String(data.get('name') || 'Visitante');
    const readableDate = date ? new Intl.DateTimeFormat('es-MX', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`)) : '';
    if (summary) summary.textContent = `${name}: ${service}, ${readableDate} a las ${selectedTime}.`;
    if (modal instanceof HTMLElement) {
      modal.hidden = false;
      document.body.style.overflow = 'hidden';
      close?.focus();
    }
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: 'clinic_demo_booking', service, date, time: selectedTime });
  });

  close?.addEventListener('click', hideModal);
  modal?.addEventListener('click', (event) => { if (event.target === modal) hideModal(); });
  addEventListener('keydown', (event) => { if (event.key === 'Escape') hideModal(); });
})();
