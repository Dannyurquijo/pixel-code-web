(function(){
  'use strict';
  const root=document.documentElement;
  const CONSENT_KEY='dupc_consent_v1';
  const LOADER_KEY='dupc_loader_seen_v1';
  let firstLoad=false;
  try{firstLoad=!sessionStorage.getItem(LOADER_KEY);if(firstLoad){sessionStorage.setItem(LOADER_KEY,'1');root.classList.add('dupc-first-load');root.setAttribute('aria-busy','true');}}catch(_){firstLoad=true;root.classList.add('dupc-first-load');}

  const finishLoader=()=>{if(!firstLoad)return;root.classList.add('dupc-load-exit');setTimeout(()=>{root.classList.remove('dupc-first-load','dupc-load-exit');root.removeAttribute('aria-busy');},320);};
  window.addEventListener('load',()=>setTimeout(finishLoader,180),{once:true});
  setTimeout(finishLoader,2200);

  function readConsent(){try{return JSON.parse(localStorage.getItem(CONSENT_KEY)||'null');}catch(_){return null;}}
  function writeConsent(level){const value={version:1,level,essential:true,analytics:level==='all',updatedAt:new Date().toISOString()};try{localStorage.setItem(CONSENT_KEY,JSON.stringify(value));}catch(_){}window.dispatchEvent(new CustomEvent('dupc:consent',{detail:value}));return value;}
  function inject(){
    if(document.getElementById('dupc-consent'))return;
    document.body.insertAdjacentHTML('beforeend',`<section class="dupc-consent" id="dupc-consent" role="dialog" aria-modal="false" aria-labelledby="dupc-consent-title" hidden><p class="dupc-consent__eyebrow">Privacidad bajo tu control</p><h2 id="dupc-consent-title">Tu visita, sin rastreo innecesario.</h2><p>Usamos almacenamiento esencial para seguridad, recordar tus preferencias y conservar localmente la conversación de Pixie. No activamos cookies publicitarias. Si en el futuro habilitamos medición opcional, sólo se ejecutará con tu autorización.</p><nav class="dupc-consent__links" aria-label="Información legal"><a href="/privacidad.html">Aviso de privacidad</a><a href="/cookies.html">Política de cookies</a><a href="/terminos.html">Términos de uso</a></nav><div class="dupc-consent__actions"><button type="button" data-consent="essential">Sólo esenciales</button><button type="button" data-consent="all">Aceptar opcionales</button></div></section><button class="dupc-privacy-trigger" type="button" aria-controls="dupc-consent">Privacidad y cookies</button>`);
    const panel=document.getElementById('dupc-consent');
    const trigger=document.querySelector('.dupc-privacy-trigger');
    const show=()=>{panel.hidden=false;document.body.classList.add('dupc-consent-open');setTimeout(()=>panel.querySelector('button').focus(),0);};
    const hide=()=>{panel.hidden=true;document.body.classList.remove('dupc-consent-open');trigger.focus();};
    panel.addEventListener('click',event=>{const button=event.target.closest('[data-consent]');if(!button)return;writeConsent(button.dataset.consent);hide();});
    trigger.addEventListener('click',show);
    window.addEventListener('keydown',event=>{if(event.key==='Escape'&&!panel.hidden&&readConsent())hide();});
    if(!readConsent())show();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',inject,{once:true});else inject();
})();
