/* ============================================================
   DU PIXEL CODE - MAIN APPLICATION CONTROLLER
   Handles UI state, DOM events, Tab switching, SQL queries & PDF export
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
  initTabs();
  initPresetButtons();
  initDropzone();
  initExportButtons();

  // Esperar activación de DB
  window.addEventListener("db:ready", () => {
    populateFilters();
    renderActiveTab();
  });

  window.addEventListener("auth:unlocked", async () => {
    await window.dbEngine.initDB();
  });

  // Si ya estaba iniciada la sesión
  if (sessionStorage.getItem("du_pixel_code_auth_session") === "true") {
    window.dbEngine.initDB();
  }
});

/* ------------------------------------------------------------
   1. TABS MANAGEMENT
   ------------------------------------------------------------ */
function initTabs() {
  const tabBtns = document.querySelectorAll(".tab-btn");
  tabBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      tabBtns.forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));

      btn.classList.add("active");
      const targetId = btn.getAttribute("data-tab");
      const targetContent = document.getElementById(targetId);
      if (targetContent) targetContent.classList.add("active");

      renderActiveTab();
    });
  });
}

function renderActiveTab() {
  const activeTab = document.querySelector(".tab-btn.active");
  if (!activeTab) return;
  const tabId = activeTab.getAttribute("data-tab");

  if (tabId === "tabIndividual") {
    renderIndividualReport();
  } else if (tabId === "tabInstitutional") {
    renderInstitutionalAnalytics();
  }
}

/* ------------------------------------------------------------
   2. FILTROS & SELECCIÓN DE USUARIO
   ------------------------------------------------------------ */
function populateFilters() {
  const roleSelect = document.getElementById("filterRole");
  const deptSelect = document.getElementById("filterDept");
  const userSelect = document.getElementById("selectUser");

  if (!userSelect) return;

  const users = window.dbEngine.execQuery("SELECT id, nombre, rol, departamento FROM usuarios ORDER BY nombre");
  
  // Llenar Departamentos
  const depts = Array.from(new Set(users.map(u => u.departamento))).sort();
  deptSelect.innerHTML = '<option value="ALL">Todos los Departamentos</option>';
  depts.forEach(d => {
    deptSelect.innerHTML += `<option value="${d}">${d}</option>`;
  });

  function updateUsersDropdown() {
    const rVal = roleSelect.value;
    const dVal = deptSelect.value;

    let filtered = users;
    if (rVal !== "ALL") filtered = filtered.filter(u => u.rol === rVal);
    if (dVal !== "ALL") filtered = filtered.filter(u => u.departamento === dVal);

    userSelect.innerHTML = "";
    if (filtered.length === 0) {
      userSelect.innerHTML = '<option value="">Sin coincidencias</option>';
      return;
    }

    filtered.forEach(u => {
      userSelect.innerHTML += `<option value="${u.id}">${u.nombre} (${u.rol} - ${u.departamento})</option>`;
    });

    renderIndividualReport();
  }

  roleSelect.addEventListener("change", updateUsersDropdown);
  deptSelect.addEventListener("change", updateUsersDropdown);
  userSelect.addEventListener("change", () => renderIndividualReport());

  updateUsersDropdown();
}

/* ------------------------------------------------------------
   3. RENDERING: REPORTE 360° INDIVIDUAL
   ------------------------------------------------------------ */
function renderIndividualReport() {
  const userSelect = document.getElementById("selectUser");
  if (!userSelect || !userSelect.value) return;

  const userId = parseInt(userSelect.value, 10);
  if (isNaN(userId)) return;

  // 1. Cargar Usuario
  const uRes = window.dbEngine.execQuery("SELECT * FROM usuarios WHERE id = ?", [userId]);
  if (uRes.length === 0) return;
  const user = uRes[0];

  document.getElementById("userInfoName").textContent = user.nombre;
  document.getElementById("userInfoRole").textContent = user.rol;
  document.getElementById("userInfoDept").textContent = user.departamento;
  document.getElementById("userInfoDate").textContent = user.fecha_ingreso || "N/A";

  // 2. Cargar Promedios 360° por Tipo de Relación
  const relQuery = `
    SELECT 
      ROUND(AVG(CASE WHEN tipo_relacion = 'Autoevaluación' THEN calificacion END), 2) AS auto,
      ROUND(AVG(CASE WHEN tipo_relacion = 'Jefe' THEN calificacion END), 2) AS jefe,
      ROUND(AVG(CASE WHEN tipo_relacion = 'Par' THEN calificacion END), 2) AS par,
      ROUND(AVG(CASE WHEN tipo_relacion = 'Subordinado' THEN calificacion END), 2) AS sub,
      ROUND(AVG(CASE WHEN tipo_relacion != 'Autoevaluación' THEN calificacion END), 2) AS ext
    FROM evaluaciones_360
    WHERE evaluado_id = ?
  `;
  const relRes = window.dbEngine.execQuery(relQuery, [userId])[0];

  document.getElementById("kpiExt").textContent = relRes.ext ? `⭐ ${relRes.ext.toFixed(2)}` : "N/A";
  document.getElementById("kpiAuto").textContent = relRes.auto ? `🎯 ${relRes.auto.toFixed(2)}` : "N/A";
  document.getElementById("kpiJefe").textContent = relRes.jefe ? `👔 ${relRes.jefe.toFixed(2)}` : "N/A";
  document.getElementById("kpiPar").textContent = relRes.par ? `👥 ${relRes.par.toFixed(2)}` : "N/A";
  document.getElementById("kpiSub").textContent = relRes.sub ? `🌱 ${relRes.sub.toFixed(2)}` : "N/A";

  // 3. Cargar Datos por Competencia para Gráficos
  const compQuery = `
    SELECT 
      c.nombre_competencia,
      e.tipo_relacion,
      ROUND(AVG(e.calificacion), 2) AS promedio
    FROM evaluaciones_360 e
    JOIN competencias c ON e.competencia_id = c.id
    WHERE e.evaluado_id = ?
    GROUP BY c.id, c.nombre_competencia, e.tipo_relacion
    ORDER BY c.nombre_competencia
  `;
  const compRows = window.dbEngine.execQuery(compQuery, [userId]);

  // Transformar datos para Radar & Bar
  const compNames = Array.from(new Set(compRows.map(r => r.nombre_competencia)));
  const dataAuto = [];
  const dataExt = [];
  const barMap = { 'Jefe': [], 'Par': [], 'Subordinado': [], 'Autoevaluación': [] };

  compNames.forEach(name => {
    const rowsForComp = compRows.filter(r => r.nombre_competencia === name);
    
    // Auto
    const autoRow = rowsForComp.find(r => r.tipo_relacion === "Autoevaluación");
    dataAuto.push(autoRow ? autoRow.promedio : 0);

    // Externo (Promedio de Jefe, Par, Subordinado)
    const extRows = rowsForComp.filter(r => r.tipo_relacion !== "Autoevaluación");
    const extAvg = extRows.length > 0 ? (extRows.reduce((acc, r) => acc + r.promedio, 0) / extRows.length) : 0;
    dataExt.push(parseFloat(extAvg.toFixed(2)));

    // Para barras
    ['Jefe', 'Par', 'Subordinado', 'Autoevaluación'].forEach(rel => {
      const match = rowsForComp.find(r => r.tipo_relacion === rel);
      barMap[rel].push(match ? match.promedio : 0);
    });
  });

  // Renderizar Gráficos
  window.chartEngine.renderRadarChart("radarCanvas", compNames, dataAuto, dataExt);
  window.chartEngine.renderBarChart("barCanvas", compNames, barMap);

  // 4. Renderizar Matriz de Brechas (Gap Analysis)
  renderGapTable(compNames, dataAuto, dataExt);

  // 5. Renderizar Comentarios Cualitativos
  renderComments(userId);
}

function renderGapTable(compNames, dataAuto, dataExt) {
  const tbody = document.getElementById("gapTableBody");
  if (!tbody) return;

  tbody.innerHTML = "";
  compNames.forEach((name, i) => {
    const autoVal = dataAuto[i] || 0;
    const extVal = dataExt[i] || 0;
    const gap = parseFloat((autoVal - extVal).toFixed(2));

    let diagBadge = '<span style="color:#10B981;">✅ Autopercepción Alineada</span>';
    if (gap > 0.4) {
      diagBadge = '<span style="color:#F59E0B;">⚠️ Sobrevaloración de Desempeño</span>';
    } else if (gap < -0.4) {
      diagBadge = '<span style="color:#00D2FF;">💡 Subestimación (Fortaleza Oculta)</span>';
    }

    tbody.innerHTML += `
      <tr>
        <td><strong>${name}</strong></td>
        <td>${autoVal.toFixed(2)}</td>
        <td>${extVal.toFixed(2)}</td>
        <td style="font-weight:bold; color:${gap > 0 ? '#F59E0B' : '#00D2FF'};">${gap > 0 ? '+' : ''}${gap}</td>
        <td>${diagBadge}</td>
      </tr>
    `;
  });
}

function renderComments(userId) {
  const container = document.getElementById("commentsContainer");
  if (!container) return;

  const query = `
    SELECT 
      e.tipo_relacion,
      c.nombre_competencia,
      e.calificacion,
      e.comentario
    FROM evaluaciones_360 e
    JOIN competencias c ON e.competencia_id = c.id
    WHERE e.evaluado_id = ?
    ORDER BY e.tipo_relacion, c.nombre_competencia
  `;
  const comments = window.dbEngine.execQuery(query, [userId]);

  container.innerHTML = "";
  if (comments.length === 0) {
    container.innerHTML = '<div style="color:#94A3B8;">No hay comentarios cualitativos para este colaborador.</div>';
    return;
  }

  comments.forEach(c => {
    let relClass = "auto";
    if (c.tipo_relacion === "Jefe") relClass = "jefe";
    if (c.tipo_relacion === "Par") relClass = "par";
    if (c.tipo_relacion === "Subordinado") relClass = "sub";

    container.innerHTML += `
      <div class="comment-card ${relClass}">
        <div class="comment-meta">${c.tipo_relacion} • ${c.nombre_competencia} (${c.calificacion}/5)</div>
        <div>"${c.comentario}"</div>
      </div>
    `;
  });
}

/* ------------------------------------------------------------
   4. RENDERING: ANALÍTICA INSTITUCIONAL Y RANKINGS
   ------------------------------------------------------------ */
function renderInstitutionalAnalytics() {
  // 1. KPIs Globales
  const totalUsers = window.dbEngine.execQuery("SELECT COUNT(*) AS total FROM usuarios")[0].total;
  const totalEvals = window.dbEngine.execQuery("SELECT COUNT(*) AS total FROM evaluaciones_360")[0].total;
  const avgGlobal = window.dbEngine.execQuery("SELECT ROUND(AVG(calificacion), 2) AS avg FROM evaluaciones_360")[0].avg;

  document.getElementById("instTotalUsers").textContent = totalUsers;
  document.getElementById("instTotalEvals").textContent = totalEvals;
  document.getElementById("instGlobalAvg").textContent = `⭐ ${avgGlobal} / 5.0`;

  // 2. Ranking Departamental (SQL Window Function RANK() OVER)
  const rankingQuery = `
    WITH Promedios AS (
      SELECT 
        u.id,
        u.nombre,
        u.rol,
        u.departamento,
        ROUND(AVG(CASE WHEN e.tipo_relacion != 'Autoevaluación' THEN e.calificacion END), 2) AS promedio_externo,
        ROUND(AVG(e.calificacion), 2) AS promedio_general
      FROM usuarios u
      JOIN evaluaciones_360 e ON u.id = e.evaluado_id
      GROUP BY u.id, u.nombre, u.rol, u.departamento
    )
    SELECT 
      departamento,
      RANK() OVER (PARTITION BY departamento ORDER BY promedio_externo DESC) AS rank_dept,
      nombre,
      rol,
      promedio_externo,
      promedio_general
    FROM Promedios
    ORDER BY departamento, rank_dept;
  `;
  const rankingRows = window.dbEngine.execQuery(rankingQuery);
  
  const rankBody = document.getElementById("rankingTableBody");
  if (rankBody) {
    rankBody.innerHTML = "";
    rankingRows.forEach(r => {
      rankBody.innerHTML += `
        <tr>
          <td><span class="badge-role">${r.departamento}</span></td>
          <td style="font-weight:bold; color:var(--gold-neon);">#${r.rank_dept}</td>
          <td><strong>${r.nombre}</strong></td>
          <td>${r.rol}</td>
          <td style="color:var(--cyan-neon); font-weight:bold;">${r.promedio_externo ? r.promedio_externo.toFixed(2) : 'N/A'}</td>
          <td>${r.promedio_general.toFixed(2)}</td>
        </tr>
      `;
    });
  }

  // 3. Gráfico Global de Competencias
  const compGlobalQuery = `
    SELECT 
      c.nombre_competencia,
      ROUND(AVG(e.calificacion), 2) AS promedio
    FROM competencias c
    JOIN evaluaciones_360 e ON c.id = e.competencia_id
    GROUP BY c.id, c.nombre_competencia
    ORDER BY promedio DESC
  `;
  const compGlobal = window.dbEngine.execQuery(compGlobalQuery);
  window.chartEngine.renderInstitutionalChart(
    "instChartCanvas",
    compGlobal.map(c => c.nombre_competencia),
    compGlobal.map(c => c.promedio)
  );
}

/* ------------------------------------------------------------
   5. EDITOR / CONSOLA SQL INTERACTIVO
   ------------------------------------------------------------ */
function initPresetButtons() {
  const presets = {
    btnSqlPreset1: "SELECT u.nombre, u.rol, u.departamento, ROUND(AVG(e.calificacion), 2) AS promedio_general FROM usuarios u JOIN evaluaciones_360 e ON u.id = e.evaluado_id GROUP BY u.id ORDER BY promedio_general DESC LIMIT 10;",
    btnSqlPreset2: "SELECT u.nombre, ROUND(AVG(CASE WHEN e.tipo_relacion = 'Jefe' THEN e.calificacion END), 2) AS Jefe, ROUND(AVG(CASE WHEN e.tipo_relacion = 'Par' THEN e.calificacion END), 2) AS Par, ROUND(AVG(CASE WHEN e.tipo_relacion = 'Subordinado' THEN e.calificacion END), 2) AS Subordinado, ROUND(AVG(CASE WHEN e.tipo_relacion = 'Autoevaluación' THEN e.calificacion END), 2) AS Auto FROM usuarios u JOIN evaluaciones_360 e ON u.id = e.evaluado_id GROUP BY u.id LIMIT 10;",
    btnSqlPreset3: "WITH Prom AS (SELECT u.nombre, u.departamento, ROUND(AVG(e.calificacion), 2) AS avg_score FROM usuarios u JOIN evaluaciones_360 e ON u.id = e.evaluado_id GROUP BY u.id) SELECT departamento, RANK() OVER (PARTITION BY departamento ORDER BY avg_score DESC) AS rk, nombre, avg_score FROM Prom ORDER BY departamento, rk;"
  };

  const textarea = document.getElementById("sqlTextarea");
  const btnRun = document.getElementById("btnRunSql");

  for (let btnId in presets) {
    const elem = document.getElementById(btnId);
    if (elem && textarea) {
      elem.addEventListener("click", () => {
        textarea.value = presets[btnId];
      });
    }
  }

  if (btnRun && textarea) {
    btnRun.addEventListener("click", () => {
      const sql = textarea.value.trim();
      if (!sql) return;

      try {
        const results = window.dbEngine.execQuery(sql);
        renderSqlResultTable(results);
      } catch (err) {
        alert("Error al ejecutar SQL: " + err.message);
      }
    });
  }
}

function renderSqlResultTable(rows) {
  const container = document.getElementById("sqlResultContainer");
  if (!container) return;

  if (rows.length === 0) {
    container.innerHTML = '<div style="color:#94A3B8;">La consulta no retornó resultados.</div>';
    return;
  }

  const columns = Object.keys(rows[0]);
  let html = '<div class="table-responsive"><table class="cyber-table"><thead><tr>';
  columns.forEach(col => { html += `<th>${col}</th>`; });
  html += '</tr></thead><tbody>';

  rows.forEach(r => {
    html += '<tr>';
    columns.forEach(col => { html += `<td>${r[col] !== null ? r[col] : ''}</td>`; });
    html += '</tr>';
  });

  html += '</tbody></table></div>';
  container.innerHTML = html;
}

/* ------------------------------------------------------------
   6. CARGA DE ARCHIVOS PERSONALIZADOS (.CSV / .DB)
   ------------------------------------------------------------ */
function initDropzone() {
  const dropzone = document.getElementById("dropzone");
  const fileInput = document.getElementById("fileInput");

  if (!dropzone || !fileInput) return;

  dropzone.addEventListener("click", () => fileInput.click());

  dropzone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropzone.style.borderColor = "var(--cyan-neon)";
  });

  dropzone.addEventListener("dragleave", () => {
    dropzone.style.borderColor = "rgba(0, 210, 255, 0.4)";
  });

  dropzone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropzone.style.borderColor = "rgba(0, 210, 255, 0.4)";
    if (e.dataTransfer.files.length > 0) {
      processUploadedFile(e.dataTransfer.files[0]);
    }
  });

  fileInput.addEventListener("change", () => {
    if (fileInput.files.length > 0) {
      processUploadedFile(fileInput.files[0]);
    }
  });
}

function processUploadedFile(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  
  if (ext === 'csv') {
    const reader = new FileReader();
    reader.onload = function(e) {
      window.dbEngine.populateFromCSV(e.target.result);
      alert(`✅ Archivo CSV "${file.name}" cargado e importado a SQLite con éxito.`);
      populateFilters();
      renderActiveTab();
    };
    reader.readAsText(file, "UTF-8");
  } else if (ext === 'db' || ext === 'sqlite') {
    const reader = new FileReader();
    reader.onload = function(e) {
      window.dbEngine.loadCustomDB(e.target.result);
      alert(`✅ Base de datos binaria "${file.name}" cargada con éxito.`);
      populateFilters();
      renderActiveTab();
    };
    reader.readAsArrayBuffer(file);
  } else {
    alert("Formato no soportado. Suba un archivo .csv o .db");
  }
}

/* ------------------------------------------------------------
   7. BOTONES DE EXPORTACIÓN PDF / CSV
   ------------------------------------------------------------ */
function initExportButtons() {
  const btnPdf = document.getElementById("btnExportPdf");
  const btnCsv = document.getElementById("btnExportCsv");

  if (btnPdf) {
    btnPdf.addEventListener("click", () => {
      const element = document.getElementById("tabIndividual");
      const opt = {
        margin:       0.3,
        filename:     'reporte_evaluacion_360.pdf',
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, backgroundColor: '#0A0A0A' },
        jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
      };
      html2pdf().set(opt).from(element).save();
    });
  }

  if (btnCsv) {
    btnCsv.addEventListener("click", () => {
      const rows = window.dbEngine.execQuery(`
        SELECT 
          e.id AS evaluacion_id,
          ev.nombre AS evaluador_nombre,
          ev.rol AS evaluador_rol,
          ed.nombre AS evaluado_nombre,
          ed.rol AS evaluado_rol,
          ed.departamento AS evaluado_departamento,
          e.tipo_relacion,
          c.nombre_competencia,
          e.calificacion,
          e.comentario,
          e.fecha_evaluacion
        FROM evaluaciones_360 e
        JOIN usuarios ev ON e.evaluador_id = ev.id
        JOIN usuarios ed ON e.evaluado_id = ed.id
        JOIN competencias c ON e.competencia_id = c.id
      `);

      if (rows.length === 0) return;

      const csv = Papa.unparse(rows);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "datos_evaluacion_360_export.csv";
      a.click();
    });
  }
}
