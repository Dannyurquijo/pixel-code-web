/**
 * DU PIXEL CODE - Demo Interactiva: Sistema de Evaluación 360° & Analítica SQL
 */
(() => {
  // Pre-configured Queries and Dataset
  const QUERIES = {
    dept: {
      sql: `WITH eval_cte AS (
  SELECT 
    departamento, 
    COUNT(id) AS total_evaluaciones,
    ROUND(AVG(score_general), 2) AS promedio_score,
    ROUND(AVG(competencias_radar), 2) AS radar_score
  FROM evaluacion_360_db
  GROUP BY departamento
)
SELECT * FROM eval_cte ORDER BY promedio_score DESC;`,
      time: '0.38 ms',
      rows: [
        { col1: 'Dirección & Estrategia', col2: '18', col3: '9.65 / 10', col4: '9.50', badge: 'score-badge--high' },
        { col1: 'Ingeniería de Software & IA', col2: '36', col3: '9.42 / 10', col4: '9.35', badge: 'score-badge--high' },
        { col1: 'Producto & UX Design', col2: '24', col3: '9.18 / 10', col4: '9.10', badge: 'score-badge--med' },
        { col1: 'Operaciones & Automatización', col2: '28', col3: '8.95 / 10', col4: '8.85', badge: 'score-badge--med' },
        { col1: 'Ventas & Crecimiento', col2: '22', col3: '8.65 / 10', col4: '8.55', badge: 'score-badge--rev' }
      ],
      headers: ['Departamento', 'Evaluaciones', 'Promedio Score', 'Radar Score']
    },
    radar: {
      sql: `SELECT 
  competencia,
  ROUND(AVG(autoeval), 2) AS auto_score,
  ROUND(AVG(eval_pares), 2) AS pares_score,
  ROUND(AVG(eval_lider), 2) AS lider_score,
  ROUND((AVG(autoeval) + AVG(eval_pares) + AVG(eval_lider)) / 3.0, 2) AS balance_360
FROM matriz_competencias_db
GROUP BY competencia
ORDER BY balance_360 DESC;`,
      time: '0.45 ms',
      rows: [
        { col1: 'Resolución de Problemas', col2: '9.60', col3: '9.45', col4: '9.70', badge: 'score-badge--high' },
        { col1: 'Liderazgo Estratégico', col2: '9.20', col3: '9.10', col4: '9.40', badge: 'score-badge--high' },
        { col1: 'Innovación & Adaptabilidad', col2: '9.50', col3: '9.00', col4: '9.15', badge: 'score-badge--high' },
        { col1: 'Trabajo Colaborativo', col2: '8.90', col3: '9.30', col4: '9.20', badge: 'score-badge--med' },
        { col1: 'Comunicación Asertiva', col2: '8.70', col3: '8.95', col4: '9.00', badge: 'score-badge--med' },
        { col1: 'Entrega & Cumplimiento', col2: '9.10', col3: '8.80', col4: '8.90', badge: 'score-badge--rev' }
      ],
      headers: ['Competencia 360°', 'Autoevaluación', 'Pares', 'Líder / Dirección']
    },
    ranking: {
      sql: `SELECT 
  colaborador,
  puesto,
  departamento,
  score_final,
  DENSE_RANK() OVER (ORDER BY score_final DESC) AS ranking_global
FROM colaboradores_360_db
LIMIT 5;`,
      time: '0.31 ms',
      rows: [
        { col1: 'Ing. Rodrigo Sánchez', col2: 'Tech Lead / AI Architect', col3: 'Ingeniería', col4: '9.85 · #1', badge: 'score-badge--high' },
        { col1: 'Lic. Mariana Valdez', col2: 'Head of Operations', col3: 'Operaciones', col4: '9.72 · #2', badge: 'score-badge--high' },
        { col1: 'Mtro. Carlos Durán', col2: 'Director de Estrategia', col3: 'Dirección', col4: '9.68 · #3', badge: 'score-badge--high' },
        { col1: 'Lic. Andrea Morales', col2: 'Senior UX / UI Lead', col3: 'Producto', col4: '9.54 · #4', badge: 'score-badge--med' },
        { col1: 'Ing. David Ortiz', col2: 'Data & Cloud Engineer', col3: 'Ingeniería', col4: '9.48 · #5', badge: 'score-badge--med' }
      ],
      headers: ['Colaborador', 'Cargo', 'Área', 'Score Final · Rank']
    }
  };

  let activePreset = 'dept';

  const initDemo = () => {
    const editor = document.getElementById('sql-code-editor');
    const metricTime = document.getElementById('sql-exec-time');
    const tableHead = document.getElementById('sql-table-head');
    const tableBody = document.getElementById('sql-table-body');
    const runBtn = document.getElementById('btn-run-query');
    const presetBtns = document.querySelectorAll('[data-sql-preset]');
    const copySqlBtn = document.getElementById('btn-copy-sql');
    const exportCsvBtn = document.getElementById('btn-export-csv');
    const copyKeyBtn = document.getElementById('btn-copy-access-key');

    const renderQuery = (key) => {
      activePreset = key;
      const data = QUERIES[key];
      if (!data) return;

      // Update Active Button
      presetBtns.forEach(btn => {
        btn.classList.toggle('is-active', btn.dataset.sqlPreset === key);
      });

      // Highlight keywords in SQL view
      if (editor) {
        editor.innerHTML = data.sql
          .replace(/\b(WITH|SELECT|AS|FROM|GROUP BY|ORDER BY|DESC|LIMIT|COUNT|ROUND|AVG|OVER|DENSE_RANK)\b/g, '<span class="kwd">$1</span>')
          .replace(/\b(eval_cte|id|score_general|competencias_radar|departamento|total_evaluaciones|promedio_score|radar_score|autoeval|eval_pares|eval_lider|balance_360|colaborador|puesto|score_final|ranking_global)\b/g, '<span class="str">$1</span>')
          .replace(/\b(evaluacion_360_db|matriz_competencias_db|colaboradores_360_db)\b/g, '<span class="fn">$1</span>')
          .replace(/\b(\d+(\.\d+)?)\b/g, '<span class="num">$1</span>');
      }

      // Update Execution Metric
      if (metricTime) {
        metricTime.textContent = `✔ Ejecutado en ${data.time} · SQLite Wasm v3.45 · ${data.rows.length} registros`;
      }

      // Render Table Headers
      if (tableHead) {
        tableHead.innerHTML = `<tr>${data.headers.map(h => `<th>${h}</th>`).join('')}</tr>`;
      }

      // Render Table Body
      if (tableBody) {
        tableBody.innerHTML = data.rows.map(r => `
          <tr>
            <td><strong>${r.col1}</strong></td>
            <td>${r.col2}</td>
            <td>${r.col3}</td>
            <td><span class="score-badge ${r.badge}">${r.col4}</span></td>
          </tr>
        `).join('');
      }
    };

    // Preset Clicks
    presetBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        renderQuery(btn.dataset.sqlPreset);
      });
    });

    // Run Button Action (Visual execution feedback)
    runBtn?.addEventListener('click', () => {
      const origText = runBtn.innerHTML;
      runBtn.innerHTML = '<span>⚡ Ejecutando Wasm…</span>';
      runBtn.style.opacity = '0.7';

      setTimeout(() => {
        runBtn.innerHTML = origText;
        runBtn.style.opacity = '1';
        renderQuery(activePreset);
      }, 200);
    });

    // Copy SQL Button
    copySqlBtn?.addEventListener('click', () => {
      const sqlText = QUERIES[activePreset]?.sql || '';
      navigator.clipboard.writeText(sqlText).then(() => {
        const orig = copySqlBtn.innerHTML;
        copySqlBtn.innerHTML = '✔ ¡SQL Copiado!';
        setTimeout(() => { copySqlBtn.innerHTML = orig; }, 2000);
      }).catch(() => {});
    });

    // Export CSV Button (Real in-browser download)
    exportCsvBtn?.addEventListener('click', () => {
      const data = QUERIES[activePreset];
      if (!data) return;

      let csv = data.headers.join(',') + '\n';
      data.rows.forEach(r => {
        csv += `"${r.col1}","${r.col2}","${r.col3}","${r.col4}"\n`;
      });

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `dupixel_evaluacion_360_${activePreset}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });

    // Copy Access Key Button
    copyKeyBtn?.addEventListener('click', () => {
      navigator.clipboard.writeText('123456789').then(() => {
        const orig = copyKeyBtn.textContent;
        copyKeyBtn.textContent = '¡Clave 123456789 Copiada!';
        setTimeout(() => { copyKeyBtn.textContent = orig; }, 2000);
      }).catch(() => {});
    });

    // Pixie Quote Integration
    document.addEventListener('click', (e) => {
      const trigger = e.target.closest('[data-open-sql-quote]');
      if (trigger) {
        e.preventDefault();
        const promptText = "Hola Pixie, me interesa cotizar una integración de bases de datos SQL & Analítica BI 360° para mi empresa. ¿Qué datos de contacto y detalles de mi proyecto necesitas?";
        if (typeof window.openPixieWithPrompt === 'function') {
          window.openPixieWithPrompt(promptText, true);
        } else if (window.PixieV2 && typeof window.PixieV2.openWithPrompt === 'function') {
          window.PixieV2.openWithPrompt(promptText, true);
        }
      }
    });

    // Initial render
    renderQuery('dept');
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDemo);
  } else {
    initDemo();
  }
})();
