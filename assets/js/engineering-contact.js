(() => {
  'use strict';

  const form = document.getElementById('engineering-contact');
  const notice = document.getElementById('aviso-privacidad');
  const profile = form.elements.namedItem('profile');
  const phone = form.elements.namedItem('phone');
  const priority = form.elements.namedItem('priority');
  const timeline = form.elements.namedItem('timeline');

  document.querySelector('a[href="#aviso-privacidad"]').addEventListener('click', () => {
    notice.open = true;
  });

  profile.addEventListener('input', () => profile.setCustomValidity(''));
  phone.addEventListener('input', () => phone.setCustomValidity(''));

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const identity = profile.value.trim();
    const number = phone.value.trim();
    const digits = number.replace(/\D/g, '');
    profile.setCustomValidity(identity.length >= 3 ? '' : 'Escribe tu nombre, cargo e institución o despacho.');
    phone.setCustomValidity(digits.length >= 10 && digits.length <= 15 ? '' : 'Escribe un número de WhatsApp de 10 a 15 dígitos.');
    if (!form.reportValidity()) return;

    const message = [
      'Hola, DU Pixel & Code. Quiero agendar un Diagnóstico Express de 20 minutos.',
      '',
      `Nombre, cargo e institución o despacho: ${identity}`,
      `Prioridad: ${priority.value}`,
      `Ventana de implementación: ${timeline.value}`,
      `WhatsApp de contacto: ${number}`
    ].join('\n');

    const link = new URL('https://wa.me/524423479755');
    link.searchParams.set('text', message);
    window.location.assign(link.href);
  });

  form.hidden = false;
})();
