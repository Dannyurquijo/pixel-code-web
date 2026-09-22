(() => {
  const features = {
    sources: {
      badge: 'Base del cuaderno', title: 'Fuentes seleccionadas, contexto controlado',
      description: 'Cada cuaderno reúne el material que quieres analizar: documentos, sitios, PDFs, presentaciones, audio y enlaces compatibles. La conversación utiliza las fuentes seleccionadas como contexto.',
      items: [['Formatos diversos','Organiza documentos, URLs, presentaciones, audio y material de referencia en un solo espacio.'],['Selección de contexto','Activa sólo las fuentes pertinentes para cada pregunta o entregable.'],['Escala documentada','La versión estándar admite hasta 50 fuentes por cuaderno; los planes superiores amplían la capacidad.'],['Control de origen','La calidad de la respuesta depende de la calidad, vigencia y cobertura de tus fuentes.']],
      tip: 'Agrupa por proceso o decisión: un cuaderno de ventas, otro de operación y otro de cumplimiento suele ser más útil que mezclar toda la empresa.'
    },
    chat: {
      badge: 'Análisis con evidencia', title: 'Preguntas, respuestas y citas verificables',
      description: 'El chat sintetiza el material cargado y, cuando corresponde, muestra citas que te permiten regresar al pasaje original antes de tomar una decisión.',
      items: [['Preguntas específicas','Obtén mejores resultados al indicar objetivo, audiencia y formato esperado.'],['Citas navegables','Revisa el fragmento de origen en lugar de aceptar una respuesta por confianza.'],['Historial contextual','Las preguntas anteriores ayudan a mantener el hilo de la investigación.'],['Límite responsable','Una cita reduce la incertidumbre, pero no convierte automáticamente una respuesta en verdad.']],
      tip: 'Pide primero una matriz de hallazgos y después solicita que cada conclusión incluya evidencia y fuente.'
    },
    studio: {
      badge: 'Studio', title: 'Convierte fuentes en artefactos útiles',
      description: 'NotebookLM puede transformar un conjunto de fuentes en distintos formatos para estudiar, comunicar o explorar: resúmenes, preguntas frecuentes, mapas mentales y otros artefactos disponibles.',
      items: [['Brief ejecutivo','Condensa hallazgos y decisiones para dirección.'],['Mapa mental','Explora relaciones entre temas y conceptos de las fuentes.'],['FAQ y guía','Convierte documentación compleja en material operativo.'],['Video y otros formatos','La disponibilidad de artefactos puede variar según cuenta, idioma y región.']],
      tip: 'Define la audiencia antes de generar: un briefing para dirección no debe tener la misma profundidad que una guía de capacitación.'
    },
    audio: {
      badge: 'Audio Overview', title: 'Escucha tus fuentes desde varios ángulos',
      description: 'Las vistas de audio pueden resumir y discutir el contenido con diferentes formatos, como conversación profunda, resumen breve, crítica o debate, según disponibilidad.',
      items: [['Deep Dive','Dos voces conectan ideas y explican los temas centrales.'],['The Brief','Una voz presenta puntos clave en formato corto.'],['Critique y Debate','Explora fortalezas, límites o perspectivas contrapuestas.'],['Personalización','Ajusta enfoque, idioma y extensión antes de generar.']],
      tip: 'El audio también es generado por IA y puede contener imprecisiones; úsalo para explorar y vuelve a las fuentes para validar.'
    },
    privacy: {
      badge: 'Gobernanza', title: 'La cuenta y la política importan',
      description: 'El tratamiento de datos cambia según uses una cuenta personal, Workspace, Education o una oferta empresarial. Antes de cargar información sensible, revisa contrato, permisos y configuración.',
      items: [['Workspace','Google indica que archivos, consultas y respuestas de cuentas elegibles no son revisados por humanos ni usados para entrenar modelos.'],['Cuenta personal','El envío de feedback puede permitir revisión humana del contenido asociado.'],['Accesos','Comparte el cuaderno con el nivel mínimo necesario y revisa quién puede ver fuentes.'],['Clasificación','No cargues secretos o datos regulados sin una política aprobada por tu organización.']],
      tip: 'La herramienta no sustituye tu modelo de gobierno: define propietarios, vigencia de fuentes, permisos y revisión humana.'
    }
  };

  const tabs = [...document.querySelectorAll('[data-nb-tab]')];
  const panel = document.querySelector('[data-nb-feature-panel]');
  const renderFeature = (key) => {
    const feature = features[key];
    if (!feature || !panel) return;
    tabs.forEach((tab) => tab.setAttribute('aria-selected', String(tab.dataset.nbTab === key)));
    panel.innerHTML = `<span class="nb-feature-panel__badge">${feature.badge}</span><h3>${feature.title}</h3><p>${feature.description}</p><div class="nb-feature-list">${feature.items.map(([title,copy]) => `<div><b>${title}</b><p>${copy}</p></div>`).join('')}</div><div class="nb-feature-tip"><strong>Aplicación práctica:</strong> ${feature.tip}</div>`;
  };
  tabs.forEach((tab) => tab.addEventListener('click', () => renderFeature(tab.dataset.nbTab)));
  renderFeature('sources');

  const sourceButtons = [...document.querySelectorAll('[data-lab-source]')];
  const questionButtons = [...document.querySelectorAll('[data-lab-question]')];
  const answer = document.querySelector('[data-lab-answer]');
  const citations = document.querySelector('[data-lab-citations]');
  const detail = document.querySelector('[data-citation-detail]');
  let selectedSources = new Set(['manual', 'policy']);

  const answers = {
    onboarding: 'El proceso de incorporación recomendado comienza con una bienvenida estructurada, acceso al manual operativo y validación de políticas clave. <sup>1</sup> La supervisión se revisa durante la primera semana mediante una lista de control. <sup>2</sup>',
    risk: 'La principal brecha detectada es que el manual describe responsables, pero la política más reciente exige también evidencia de aprobación. <sup>2</sup> Conviene actualizar la lista de control y registrar fecha, responsable y excepción. <sup>3</sup>',
    brief: 'Resumen ejecutivo: el proceso está documentado, pero requiere alinear responsables, evidencia y seguimiento. <sup>1</sup> <sup>3</sup> La prioridad es unificar la versión vigente y retirar instrucciones duplicadas.'
  };
  const citationData = [
    ['1 · Manual operativo, sección 2.1','“La incorporación inicia con acceso a procesos, responsables y herramientas autorizadas.”'],
    ['2 · Política interna, apartado 4','“Cada alta debe contar con validación del responsable durante la primera semana.”'],
    ['3 · Minuta de auditoría, hallazgo 07','“No se encontró evidencia uniforme de aprobación en tres expedientes revisados.”']
  ];
  const renderLab = (key = 'onboarding') => {
    if (answer) answer.innerHTML = answers[key];
    if (citations) citations.innerHTML = citationData.map(([label,copy], index) => `<button type="button" data-citation="${index}">${label}<span class="sr-only">: ${copy}</span></button>`).join('');
    if (detail instanceof HTMLElement) detail.hidden = true;
    questionButtons.forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.labQuestion === key)));
  };
  sourceButtons.forEach((button) => button.addEventListener('click', () => {
    const key = button.dataset.labSource;
    selectedSources.has(key) ? selectedSources.delete(key) : selectedSources.add(key);
    if (!selectedSources.size) selectedSources.add(key);
    sourceButtons.forEach((item) => item.setAttribute('aria-pressed', String(selectedSources.has(item.dataset.labSource))));
  }));
  questionButtons.forEach((button) => button.addEventListener('click', () => renderLab(button.dataset.labQuestion)));
  citations?.addEventListener('click', (event) => {
    const button = event.target instanceof Element ? event.target.closest('[data-citation]') : null;
    if (!button || !(detail instanceof HTMLElement)) return;
    const citation = citationData[Number(button.dataset.citation)];
    detail.innerHTML = `<strong>${citation[0]}</strong><br>${citation[1]}`;
    detail.hidden = false;
  });
  renderLab();
})();
