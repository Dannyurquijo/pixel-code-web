/* ============================================================
   DU PIXEL CODE - DATABASE ENGINE (SQL.js WebAssembly)
   Executes real SQLite queries directly in the client browser
   ============================================================ */

let db = null;
let SQL = null;
let isDBReady = false;

window.dbEngine = {
  initDB: async function() {
    if (isDBReady) return db;

    try {
      // 1. Cargar SQL.js desde CDN WebAssembly
      SQL = await initSqlJs({
        locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`
      });

      db = new SQL.Database();
      console.log("⚡ Base de datos SQLite WebAssembly inicializada.");

      // 2. Crear Esquema Relacional en Memoria
      createSchema();

      // 3. Cargar datos por defecto desde evaluacion_360_escuela.csv
      const response = await fetch("evaluacion_360_escuela.csv");
      if (!response.ok) {
        throw new Error("No se pudo cargar evaluacion_360_escuela.csv");
      }
      const csvText = await response.text();
      this.populateFromCSV(csvText);

      isDBReady = true;
      window.dispatchEvent(new Event("db:ready"));
      return db;
    } catch (err) {
      console.error("Error al inicializar SQLite WASM:", err);
      alert("Error al cargar la base de datos SQL.js: " + err.message);
    }
  },

  execQuery: function(sqlQuery, params = []) {
    if (!db) {
      console.warn("Base de datos no inicializada.");
      return [];
    }
    try {
      const stmt = db.prepare(sqlQuery);
      if (params.length > 0) stmt.bind(params);
      
      const results = [];
      while (stmt.step()) {
        results.push(stmt.getAsObject());
      }
      stmt.free();
      return results;
    } catch (err) {
      console.error("Error en consulta SQL:", err, "SQL:", sqlQuery);
      throw err;
    }
  },

  populateFromCSV: function(csvContent) {
    if (!db) return;

    // Limpiar tablas previas
    db.run("DELETE FROM evaluaciones_360; DELETE FROM usuarios; DELETE FROM competencias;");

    const parsed = Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true
    });

    if (parsed.errors.length > 0) {
      console.warn("Advertencias al parsear CSV:", parsed.errors);
    }

    const rows = parsed.data;
    const usersMap = new Map();
    const compMap = new Map();

    // Iniciar transacción rápida
    db.run("BEGIN TRANSACTION;");

    rows.forEach(row => {
      // Registrar Evaluado
      if (row.evaluado_id && !usersMap.has(row.evaluado_id)) {
        usersMap.set(row.evaluado_id, {
          id: row.evaluado_id,
          nombre: row.evaluado_nombre,
          rol: row.evaluado_rol,
          departamento: row.evaluado_departamento,
          fecha_ingreso: row.evaluado_fecha_ingreso || "2022-01-15"
        });
      }

      // Registrar Evaluador si es distinto
      if (row.evaluador_id && !usersMap.has(row.evaluador_id)) {
        usersMap.set(row.evaluador_id, {
          id: row.evaluador_id,
          nombre: row.evaluador_nombre,
          rol: row.evaluador_rol,
          departamento: row.evaluado_departamento || "General",
          fecha_ingreso: "2021-06-01"
        });
      }

      // Registrar Competencia
      if (row.competencia_id && !compMap.has(row.competencia_id)) {
        compMap.set(row.competencia_id, {
          id: row.competencia_id,
          nombre: row.nombre_competencia,
          descripcion: row.descripcion_competencia || ""
        });
      }
    });

    // Insertar Usuarios
    const stmtUser = db.prepare("INSERT INTO usuarios (id, nombre, rol, departamento, fecha_ingreso) VALUES (?, ?, ?, ?, ?)");
    for (let u of usersMap.values()) {
      stmtUser.run([u.id, u.nombre, u.rol, u.departamento, u.fecha_ingreso]);
    }
    stmtUser.free();

    // Insertar Competencias
    const stmtComp = db.prepare("INSERT INTO competencias (id, nombre_competencia, descripcion) VALUES (?, ?, ?)");
    for (let c of compMap.values()) {
      stmtComp.run([c.id, c.nombre, c.descripcion]);
    }
    stmtComp.free();

    // Insertar Evaluaciones
    const stmtEval = db.prepare(`
      INSERT INTO evaluaciones_360 
      (id, evaluador_id, evaluado_id, tipo_relacion, competencia_id, calificacion, comentario, fecha_evaluacion)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    rows.forEach(row => {
      stmtEval.run([
        row.evaluacion_id,
        row.evaluador_id,
        row.evaluado_id,
        row.tipo_relacion,
        row.competencia_id,
        row.calificacion,
        row.comentario || "",
        row.fecha_evaluacion || "2026-09-01 10:00:00"
      ]);
    });
    stmtEval.free();

    db.run("COMMIT;");
    console.log(`✅ ${rows.length} registros cargados exitosamente en SQLite WASM.`);
  },

  loadCustomDB: function(arrayBuffer) {
    if (!SQL) return;
    const uInt8Array = new Uint8Array(arrayBuffer);
    db = new SQL.Database(uInt8Array);
    isDBReady = true;
    window.dispatchEvent(new Event("db:ready"));
    console.log("✅ Base de datos binaria SQLite cargada.");
  }
};

function createSchema() {
  db.run(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY,
      nombre TEXT NOT NULL,
      rol TEXT NOT NULL,
      departamento TEXT NOT NULL,
      fecha_ingreso TEXT
    );

    CREATE TABLE IF NOT EXISTS competencias (
      id INTEGER PRIMARY KEY,
      nombre_competencia TEXT NOT NULL UNIQUE,
      descripcion TEXT
    );

    CREATE TABLE IF NOT EXISTS evaluaciones_360 (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      evaluador_id INTEGER NOT NULL,
      evaluado_id INTEGER NOT NULL,
      tipo_relacion TEXT NOT NULL,
      competencia_id INTEGER NOT NULL,
      calificacion INTEGER NOT NULL,
      comentario TEXT,
      fecha_evaluacion TEXT,
      FOREIGN KEY (evaluador_id) REFERENCES usuarios(id),
      FOREIGN KEY (evaluado_id) REFERENCES usuarios(id),
      FOREIGN KEY (competencia_id) REFERENCES competencias(id)
    );
  `);
}
