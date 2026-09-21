(() => {
  'use strict';
  const form = document.querySelector('[data-booking-form]');
  const dateInput = document.querySelector('#booking-date');
  const selectedTime = document.querySelector('[data-selected-time]');
  const status = document.querySelector('[data-booking-status]');
  const dialog = document.querySelector('[data-booking-dialog]');
  const backdrop = document.querySelector('[data-booking-backdrop]');
  const today = new Date();
  const localDate = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().split('T')[0];
  dateInput.min = localDate;
  dateInput.value = localDate;

  document.querySelectorAll('.time-slot').forEach((button) => button.addEventListener('click', () => {
    document.querySelectorAll('.time-slot').forEach((slot) => slot.setAttribute('aria-pressed', 'false'));
    button.setAttribute('aria-pressed', 'true');
    selectedTime.value = button.textContent.trim();
    status.textContent = '';
  }));

  const closeDialog = () => { dialog.hidden = true; backdrop.hidden = true; document.body.style.overflow = ''; };
  document.querySelectorAll('[data-close-booking]').forEach((button) => button.addEventListener('click', closeDialog));
  backdrop.addEventListener('click', closeDialog);
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!selectedTime.value) { status.textContent = 'Selecciona uno de los horarios disponibles para continuar.'; document.querySelector('.time-slot')?.focus(); return; }
    const service = document.querySelector('#booking-service').value;
    const barber = document.querySelector('#booking-barber').value;
    const name = document.querySelector('#booking-name').value.trim() || 'Cliente Demo';
    const date = new Intl.DateTimeFormat('es-MX', { dateStyle: 'long' }).format(new Date(`${dateInput.value}T12:00:00`));
    dialog.querySelector('[data-booking-summary]').textContent = `${name}: ${service} con ${barber}, ${date} a las ${selectedTime.value}.`;
    dialog.querySelector('[data-booking-ref]').textContent = `NB-DEMO-${String(Date.now()).slice(-6)}`;
    dialog.hidden = false; backdrop.hidden = false; document.body.style.overflow = 'hidden';
    dialog.querySelector('[data-close-booking]')?.focus();
  });
  addEventListener('keydown', (event) => { if (event.key === 'Escape') closeDialog(); });
})();
