(() => {
  'use strict';

  if (!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(({ isIntersecting, target }) => {
      if (!isIntersecting) return;
      target.classList.add('motion-in');
      observer.unobserve(target);
    });
  }, { threshold: .12 });

  document.querySelectorAll(
    '.section h2, .comparison .card, .solution, .pillar, .contact-layout > *'
  ).forEach(element => observer.observe(element));
})();
